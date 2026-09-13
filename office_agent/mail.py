from dataclasses import dataclass, field
from email.headerregistry import Address
from email.message import EmailMessage
from email import policy
from email.utils import formatdate
from pathlib import Path
import csv
import hashlib
import json
import re
import secrets
import smtplib
import ssl
import threading
import time
import uuid

from .config import AppError
from .excel import sha


@dataclass(frozen=True)
class Contact:
    alias: str
    display_name: str
    email: str
    allowed: bool


def valid_address(value):
    try:
        if any(c in value for c in "\r\n"):
            raise ValueError
        addr = Address(addr_spec=value)
        if not addr.username or not addr.domain or "." not in addr.domain:
            raise ValueError
    except (ValueError, TypeError):
        raise AppError("Địa chỉ email không hợp lệ.") from None
    return value


def contacts(path):
    try:
        with path.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if set(reader.fieldnames or []) != {"alias", "display_name", "email", "allowed_for_demo"}:
                raise AppError("contacts.csv cần alias, display_name, email, allowed_for_demo.")
            result = {}
            for row in reader:
                alias = row["alias"].strip()
                if not re.fullmatch(r"[a-z][a-z0-9_]{0,49}", alias) or alias in result:
                    raise AppError("Alias danh bạ không hợp lệ hoặc trùng.")
                flag = row["allowed_for_demo"].strip().lower()
                if flag not in ("true", "false"):
                    raise AppError("allowed_for_demo phải là true/false.")
                result[alias] = Contact(alias, row["display_name"].strip(), valid_address(row["email"].strip()), flag == "true")
            return result
    except (OSError, KeyError, AttributeError):
        raise AppError("Không đọc được contacts.csv; kiểm tra cấu trúc file.") from None


@dataclass(frozen=True)
class Preview:
    sender: str
    contact: Contact
    subject: str
    body: str
    attachment: Path
    attachment_hash: str
    source: Path
    source_hash: str
    fingerprint: str
    version: str = field(default_factory=lambda: uuid.uuid4().hex)

    def text(self):
        return (f"Từ: {self.sender}\nĐến: {self.contact.display_name} <{self.contact.email}>\n"
                f"Chủ đề: {self.subject}\nĐính kèm: {self.attachment.name}\n\n{self.body}")


def compose(settings, artifact, contact):
    valid_address(settings.sender)
    template_path = settings.inputs / "email_template.txt"
    try:
        template = template_path.read_text(encoding="utf-8-sig")
    except OSError:
        raise AppError("Thiếu email_template.txt.") from None
    match = re.search(r"^Subject: (.+)\n\s*\n([\s\S]+)", template, re.M)
    if not match:
        raise AppError("Mẫu thư cần dòng Subject: rồi dòng trống và nội dung.")
    values = {"report_period": artifact.period, "report_name": "doanh thu",
              "recipient_display_name": contact.display_name, "sender_display_name": "Nhóm demo ADC",
              "summary": f"Có {artifact.count} đơn hoàn thành. Tổng doanh thu: {artifact.total:,} VND.".replace(",", ".")}
    def fill(text):
        def slot(m):
            if m[1] not in values:
                raise AppError("Mẫu thư có trường chưa được hỗ trợ.")
            return values[m[1]]
        return re.sub(r"\{\{([a-z_]+)\}\}", slot, text).strip()
    subject, body = fill(match[1]), fill(match[2])
    if "\r" in subject or "\n" in subject or "{{" in subject + body:
        raise AppError("Mẫu thư có tiêu đề hoặc placeholder không hợp lệ.")
    payload = [settings.sender, contact.email, subject, body, artifact.digest]
    fingerprint = hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode()).hexdigest()
    return Preview(settings.sender, contact, subject, body, artifact.path, artifact.digest,
                   settings.inputs / "source.xlsx", artifact.source_digest, fingerprint)


@dataclass
class Approval:
    preview: Preview
    code: str = field(default_factory=lambda: f"{secrets.randbelow(10000):04}")
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    expires: float = field(default_factory=lambda: time.monotonic() + 120)
    used: bool = False
    created: float = field(default_factory=time.monotonic)


class SendGate:
    """Serialize stop/approval with the irreversible SMTP DATA start."""
    def __init__(self):
        self.lock = threading.RLock()
        self.approval = None
        self.blocked = False
        self.submitting = False
        self.pending_audio = 0

    def issue(self, preview):
        with self.lock:
            self.approval = Approval(preview)
            return self.approval

    def stop(self):
        with self.lock:
            self.blocked = True
            self.approval = None

    def invalidate(self):
        with self.lock:
            self.approval = None

    def resume(self):
        with self.lock:
            self.blocked = False

    def check(self, code, preview):
        a = self.approval
        if self.blocked or self.pending_audio or not a or a.used or time.monotonic() > a.expires or a.code != code or a.preview.version != preview.version:
            raise AppError("Xác nhận hết hạn/không đúng hoặc đã dừng. Xem lại bản thư để nhận mã mới.")
        return a

    def audio_begin(self):
        with self.lock:
            self.pending_audio += 1

    def audio_end(self):
        with self.lock:
            self.pending_audio = max(0, self.pending_audio - 1)


def attachment_bytes(preview):
    try:
        data = preview.attachment.read_bytes()
        if len(data) > 10 * 1024 * 1024:
            raise AppError("Bản demo giới hạn tệp đính kèm 10 MB.")
        if hashlib.sha256(data).hexdigest() != preview.attachment_hash or sha(preview.source) != preview.source_hash:
            raise AppError("Nguồn hoặc attachment đã đổi. Tạo lại báo cáo và preview.")
        return data
    except OSError:
        raise AppError("Không đọc được nguồn hoặc attachment; chưa gửi.") from None


def mime_message(preview, data, message_id):
    msg = EmailMessage(policy=policy.SMTP)
    msg["From"] = preview.sender
    msg["To"] = preview.contact.email
    msg["Subject"] = preview.subject
    msg["Message-ID"] = f"<{message_id}@adc-office-agent.invalid>"
    msg["Date"] = formatdate(localtime=True)
    msg.set_content(preview.body)
    msg.add_attachment(data, maintype="application", subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=preview.attachment.name)
    return msg


def save_draft(preview):
    data = attachment_bytes(preview)
    path = preview.attachment.parent / f"draft_{uuid.uuid4().hex[:10]}.eml"
    path.write_bytes(mime_message(preview, data, uuid.uuid4().hex).as_bytes())
    return path


def check_recipient(settings, preview):
    live_contact = contacts(settings.inputs / "contacts.csv").get(preview.contact.alias)
    if not live_contact or not live_contact.allowed or live_contact.email != preview.contact.email or live_contact.email.rsplit("@", 1)[-1].lower() in ("example.com", "example.org", "example.net"):
        raise AppError("Người nhận chưa được phép hoặc danh bạ đã đổi. Xem lại preview.")
    if preview.sender != settings.sender:
        raise AppError("Tài khoản gửi không khớp preview.")


def send_preview(settings, journal, gate, preview, code, *, smtp_factory=smtplib.SMTP_SSL):
    if not settings.allow_send:
        raise AppError("Gửi thật đang khóa: ALLOW_REAL_EMAIL_SEND=false. Có thể lưu nháp để kiểm tra.")
    if not settings.gmail_password:
        raise AppError("Thiếu mật khẩu ứng dụng Gmail trong .env.")
    # Reload allowlist before connecting and again at the submission boundary.
    check_recipient(settings, preview)
    with gate.lock:
        approval = gate.check(code, preview)
    data = attachment_bytes(preview)
    message = mime_message(preview, data, approval.id).as_bytes()
    began = False
    try:
        with smtp_factory("smtp.gmail.com", 465, context=ssl.create_default_context(), timeout=settings.smtp_timeout) as smtp:
            smtp.ehlo()
            smtp.login(settings.sender, settings.gmail_password)
            with gate.lock:
                gate.check(code, preview)
                check_recipient(settings, preview)
                attachment_bytes(preview)
                journal.begin_send(approval.id, preview.fingerprint)
                approval.used = True
                gate.submitting = True
                began = True
            # Once SUBMIT_STARTED is durable, STOP cannot promise to recall this call.
            try:
                refused = smtp.sendmail(preview.sender, [preview.contact.email], message)
            except (smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused, smtplib.SMTPDataError) as exc:
                journal.finish_send(approval.id, "REJECTED", getattr(exc, "smtp_code", None))
                raise AppError("Gmail từ chối thư. Chưa báo gửi thành công; xem lịch sử.") from None
            except Exception:
                journal.finish_send(approval.id, "UNKNOWN")
                raise AppError("Chưa rõ Gmail đã nhận thư hay chưa. Không gửi lại; kiểm tra Gmail.") from None
            if refused:
                journal.finish_send(approval.id, "REJECTED")
                raise AppError("Người nhận bị từ chối; chưa gửi thành công.")
            journal.finish_send(approval.id, "SMTP_ACCEPTED", 250)
            # QUIT can fail after accepted; do not turn a durable accepted state into retry.
            return "Gmail đã chấp nhận thư để gửi. Chưa xác minh người nhận đã nhận."
    except AppError:
        raise
    except Exception:
        if began:
            # Read durable state in case __exit__/QUIT failed after acceptance.
            with journal.connect() as db:
                state = db.execute("SELECT state FROM sends WHERE id=?", (approval.id,)).fetchone()
            if state and state[0] == "SMTP_ACCEPTED":
                return "Gmail đã chấp nhận thư; kết nối đóng không hoàn chỉnh. Không gửi lại."
            journal.finish_send(approval.id, "UNKNOWN")
            raise AppError("Trạng thái gửi chưa rõ. Không tự gửi lại.") from None
        raise AppError("Không kết nối/đăng nhập được Gmail. Chưa gửi thư; kiểm tra cấu hình.") from None
    finally:
        with gate.lock:
            gate.submitting = False
