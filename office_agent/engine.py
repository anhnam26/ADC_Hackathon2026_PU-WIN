from datetime import datetime
from pathlib import Path
import threading
import time
import uuid

from .config import AppError
from .excel import build_report, sha
from .intent import command, local_intent, normalize
from .mail import SendGate, compose, contacts, save_draft, send_preview


class Engine:
    def __init__(self, settings, journal, provider, *, excel_recalc=True):
        self.settings, self.journal, self.provider = settings, journal, provider
        self.excel_recalc = excel_recalc
        self.gate = SendGate()
        self.lock = threading.RLock()
        self.epoch = 0
        self.artifact = self.preview = None
        self.period = self.recipient = None
        self.want_mail = False
        self.status = "Sẵn sàng. Hãy yêu cầu tạo báo cáo tháng hoặc soạn email."
        self.method = ""
        self.run_id = ""

    def interrupt(self, cancel=False):
        with self.lock:
            self.epoch += 1
            self.gate.stop()
            self.status = "Đã hủy phần chưa thực hiện." if cancel else "Đã tạm dừng. Nói ‘tiếp tục’ để xem lại."
            if self.gate.submitting:
                self.status += " SMTP đã bắt đầu gửi; không thể cam kết thu hồi."
            if cancel:
                self.preview = None
                self.period = self.recipient = None
                self.want_mail = False
            self.journal.event(self.run_id, "cancel" if cancel else "stop")
        return self.status

    def snapshot(self):
        with self.lock, self.gate.lock:
            approval = self.gate.approval
            return {"status": self.status, "artifact": self.artifact, "preview": self.preview,
                    "code": approval.code if approval and not approval.used and time.monotonic() <= approval.expires and not self.gate.blocked else None,
                    "pending_audio": self.gate.pending_audio, "blocked": self.gate.blocked,
                    "method": self.method, "epoch": self.epoch}

    def handle(self, text, *, captured_at=None):
        if not text.strip() or len(text) > 2000:
            raise AppError("Hãy nhập một câu lệnh ngắn.")
        control = command(text)
        if control in ("stop", "cancel", "no_send"):
            return self.interrupt(control == "cancel")
        if control and control.startswith("confirm:"):
            with self.lock:
                preview = self.preview
                with self.gate.lock:
                    approval = self.gate.approval
                    if captured_at is not None and (not approval or captured_at < approval.created):
                        raise AppError("Lời xác nhận được thu trước preview hiện tại; hãy xác nhận lại.")
                if not preview:
                    raise AppError("Chưa có thư để xác nhận.")
            result = send_preview(self.settings, self.journal, self.gate, preview, control.split(":", 1)[1])
            with self.lock:
                self.status = result
                self.journal.event(self.run_id, "mail_result", status="SMTP_ACCEPTED")
            return result
        with self.lock:
            if control in ("review", "resume", "challenge"):
                if control == "resume":
                    self.gate.resume()
                if self.preview and not self.gate.blocked:
                    approval = self.gate.issue(self.preview)
                    self.status = (f"Hãy kiểm tra thư. Để gửi, nói ‘gửi bản {approval.code}’. Mã hết hạn sau 2 phút."
                                   if self.settings.allow_send else "Đã hiển thị lại bản thư. Gửi thật đang khóa; có thể nói ‘chỉ lưu nháp’.")
                else:
                    self.status = "Chưa có preview thư. Hãy tạo báo cáo và chọn người nhận." if not self.preview else "Đang tạm dừng; nói ‘tiếp tục’."
                return self.status
            if control == "draft":
                self.gate.invalidate()
                if not self.preview:
                    raise AppError("Chưa có thư để lưu nháp.")
                path = save_draft(self.preview)
                self.status = f"Đã lưu nháp trên máy: {path.name}. Chưa gửi hoặc lưu vào Gmail Drafts."
                self.journal.event(self.run_id, "draft_saved")
                return self.status
            if control in ("open_report", "history", "silence"):
                return control
            if self.gate.blocked:
                raise AppError("Đang tạm dừng; nói ‘tiếp tục’ trước khi yêu cầu mới.")
            self.epoch += 1
            epoch = self.epoch
            self.gate.invalidate()
            self.preview = None
        address_book = contacts(self.settings.inputs / "contacts.csv")
        intent = local_intent(text, address_book)
        method = "Quy tắc xác định"
        if intent is None:
            intent = self.provider.parse(text, address_book, datetime.now().astimezone().date().isoformat())
            method = "OpenRouter + kiểm tra cấu trúc"
        with self.lock:
            if epoch != self.epoch:
                raise AppError("Kết quả của yêu cầu cũ đã bỏ vì tác vụ bị dừng/thay đổi.")
            self.method = method
            if intent.workflow == "unsupported":
                raise AppError(intent.question or "Yêu cầu ngoài phạm vi MVP; chưa thao tác.")
            if intent.workflow in ("email", "report_email"):
                self.want_mail = True
            elif any(x in normalize(text) for x in ("tao bao cao", "lap bao cao", "tong hop doanh thu")):
                self.want_mail = False
            if intent.period:
                self.period = intent.period
            if intent.recipient:
                self.recipient = intent.recipient
            elif intent.workflow in ("email", "report_email"):
                # Never reuse a previous recipient for a new ambiguous request.
                self.recipient = None
            if intent.question:
                self.status = intent.question
                return self.status
            if not self.period and self.artifact and self.want_mail:
                self.period = self.artifact.period
            if not self.period:
                self.status = "Bạn muốn báo cáo tháng nào? Ví dụ: tháng 8 năm 2026."
                return self.status
            period = self.period
            current = self.artifact
            self.run_id = uuid.uuid4().hex
            run_id = self.run_id
        if (not current or current.period != period
                or not current.path.exists()
                or sha(current.path) != current.digest
                or sha(self.settings.inputs / "source.xlsx") != current.source_digest):
            self.journal.event(run_id, "report_started", period=period)
            current = build_report(self.settings.inputs / "source.xlsx", self.settings.outputs, period, run_id, excel_recalc=self.excel_recalc)
        with self.lock:
            if epoch != self.epoch:
                self.journal.event(run_id, "report_completed_after_cancel", period=period)
                raise AppError("Đã dừng tác vụ. Bản báo cáo đã tạo được giữ trong outputs, chưa chuyển sang email.")
            self.artifact = current
            self.journal.event(run_id, "report_verified", period=period, rows=current.count, total=current.total)
            if not self.want_mail:
                self.status = f"Đã tạo và kiểm chứng báo cáo {period}: {current.count} đơn, {current.total:,} VND. {current.warning}"
                return self.status
            if not self.recipient:
                self.status = "Báo cáo đã kiểm chứng. Bạn muốn gửi cho alias nào: " + ", ".join(address_book) + "?"
                return self.status
            contact = address_book.get(self.recipient)
            if not contact:
                raise AppError("Người nhận không còn trong danh bạ.")
            self.preview = compose(self.settings, current, contact)
            approval = self.gate.issue(self.preview)
            self.status = (f"Thư đã sẵn sàng xem trước. Nói ‘gửi bản {approval.code}’ để xác nhận, hoặc ‘chỉ lưu nháp’."
                           if self.settings.allow_send else "Thư đã sẵn sàng xem trước. Gửi thật đang khóa; nói ‘chỉ lưu nháp’ để lưu trên máy.")
            self.journal.event(run_id, "preview_created")
            return self.status
