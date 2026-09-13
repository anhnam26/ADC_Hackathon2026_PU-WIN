import os
import queue
import threading
import time
import tkinter as tk
from tkinter import ttk

from .config import AppError
from .intent import command
from .mail import contacts
from .voice import Microphone


class Desktop:
    def __init__(self, root, engine, *, smoke=False):
        self.root, self.engine = root, engine
        self.events = queue.Queue()
        self.worker = None
        self.microphone = None
        self.old_mics = []
        self.closing = False
        self.started = time.monotonic()
        # Fixed pixel layout: normalize Tk point scaling across Windows DPI settings.
        root.tk.call("tk", "scaling", 96 / 72)
        root.title("Hands-Free Office · ADC")
        root.geometry("1240x940")
        root.minsize(1240, 940)
        root.configure(bg="#eef3f5")
        self._styles()
        self._layout()
        self.refresh()
        root.protocol("WM_DELETE_WINDOW", self.close)
        root.bind("<Escape>", lambda event: self.stop())
        root.bind("<Control-Return>", lambda event: self.submit())
        root.after(80, self.poll)
        if smoke:
            root.after(1800, self.close)

    def _styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#eef3f5")
        style.configure("Card.TFrame", background="#ffffff")
        style.configure("TLabel", background="#eef3f5", foreground="#182d3c", font=("Segoe UI", 11))
        style.configure("Card.TLabel", background="#ffffff")
        style.configure("Muted.TLabel", foreground="#60717d", background="#ffffff", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#ffffff", font=("Segoe UI Semibold", 16))
        style.configure("TButton", font=("Segoe UI Semibold", 11), padding=(12, 10), background="#e4eef0", borderwidth=0)
        style.map("TButton", background=[("active", "#c8e5e7")])
        style.configure("Primary.TButton", background="#147b79", foreground="white")
        style.map("Primary.TButton", background=[("active", "#0b6262"), ("disabled", "#aec8c8")])
        style.configure("Stop.TButton", background="#ab3349", foreground="white")
        style.configure("TCheckbutton", background="#ffffff", font=("Segoe UI", 10))
        style.configure("TCombobox", padding=6, font=("Segoe UI", 11))

    def _layout(self):
        top = tk.Frame(self.root, bg="#132d3e", padx=26, pady=19)
        top.pack(fill="x")
        tk.Label(top, text="HANDS-FREE OFFICE", font=("Segoe UI Semibold", 22), fg="#ffffff", bg="#132d3e").pack(side="left")
        tk.Label(top, text="ADC 2026  /  MVP 0.1", font=("Segoe UI", 11), fg="#7dd9c3", bg="#132d3e").pack(side="right")
        self.status_var = tk.StringVar()
        tk.Label(self.root, textvariable=self.status_var, wraplength=1150, justify="left", anchor="w", padx=26, pady=14,
                 font=("Segoe UI", 12), bg="#dcefea", fg="#153e37").pack(fill="x")
        content = ttk.Frame(self.root, padding=(20, 12))
        content.pack(fill="both", expand=True)
        content.columnconfigure(0, weight=4)
        content.columnconfigure(1, weight=5)
        content.rowconfigure(0, weight=1)
        left = ttk.Frame(content, style="Card.TFrame", padding=20)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 12))
        right = ttk.Frame(content, style="Card.TFrame", padding=20)
        right.grid(row=0, column=1, sticky="nsew")
        ttk.Label(left, text="Bạn muốn làm gì?", style="Title.TLabel").pack(anchor="w")
        ttk.Label(left, text="Nói hoặc nhập một yêu cầu. Hệ thống hỏi lại khi thiếu thông tin.", style="Muted.TLabel", wraplength=420).pack(anchor="w", pady=(5, 16))
        self.input = tk.Text(left, height=3, wrap="word", font=("Segoe UI", 13), bg="#f3f7f8", relief="flat", padx=12, pady=12)
        self.input.pack(fill="x")
        self.input.insert("1.0", "Trợ lý, tạo báo cáo doanh thu tháng 8 năm 2026")
        row = ttk.Frame(left, style="Card.TFrame")
        row.pack(fill="x", pady=10)
        self.run_button = ttk.Button(row, text="Thực hiện yêu cầu", style="Primary.TButton", command=self.submit)
        self.run_button.pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="DỪNG  ·  Esc", style="Stop.TButton", command=self.stop).pack(side="left", padx=(8, 0))
        ttk.Separator(left).pack(fill="x", pady=12)
        self.consent = tk.BooleanVar(value=False)
        ttk.Checkbutton(left, text="Cho phép gửi âm thanh của phiên này qua OpenRouter", variable=self.consent, command=self.consent_changed).pack(anchor="w")
        ttk.Label(left, text="Âm thanh có thể được provider lưu/dùng huấn luyện theo Privacy của tài khoản. Không lưu bản thu trên máy.", style="Muted.TLabel", wraplength=420).pack(anchor="w", pady=5)
        microw = ttk.Frame(left, style="Card.TFrame")
        microw.pack(fill="x", pady=6)
        self.mic_button = ttk.Button(microw, text="Bật phiên nghe", command=self.toggle_mic)
        self.mic_button.pack(side="left")
        self.mic_var = tk.StringVar(value="Mic đang tắt")
        ttk.Label(microw, textvariable=self.mic_var, style="Muted.TLabel").pack(side="left", padx=10)
        sensitivity = ttk.Frame(left, style="Card.TFrame")
        sensitivity.pack(fill="x")
        ttk.Label(sensitivity, text="Ngưỡng âm lượng", style="Muted.TLabel").pack(side="left")
        self.threshold = tk.DoubleVar(value=0.012)
        ttk.Scale(sensitivity, from_=0.003, to=0.06, variable=self.threshold).pack(side="left", fill="x", expand=True, padx=10)
        ttk.Label(left, text="Mỗi câu dưới 15 giây · phiên tối đa 2 phút · chờ kết quả rồi nói tiếp.", style="Muted.TLabel", wraplength=420).pack(anchor="w", pady=5)
        self.transcript_var = tk.StringVar(value="Câu vừa nghe sẽ hiện ở đây.")
        ttk.Label(left, textvariable=self.transcript_var, wraplength=430, style="Card.TLabel").pack(anchor="w", pady=8)
        ttk.Separator(left).pack(fill="x", pady=12)
        ttk.Label(left, text="Email theo mẫu", style="Title.TLabel").pack(anchor="w")
        self.alias_var = tk.StringVar()
        try:
            aliases = list(contacts(self.engine.settings.inputs / "contacts.csv"))
        except AppError:
            aliases = []
        self.alias_box = ttk.Combobox(left, values=aliases, textvariable=self.alias_var, state="readonly")
        self.alias_box.pack(fill="x", pady=(10, 7))
        if aliases:
            self.alias_var.set(aliases[0])
        ttk.Button(left, text="Soạn thư với báo cáo vừa tạo", command=lambda: self.submit_text("Gửi báo cáo vừa tạo cho " + self.alias_var.get())).pack(fill="x")
        ttk.Label(left, text="Lệnh: ‘chỉ lưu nháp’ · ‘dừng lại’ · ‘tiếp tục’ · ‘đọc lại’", wraplength=420, style="Muted.TLabel").pack(anchor="w", pady=14)
        ttk.Label(right, text="Kết quả & bản xem trước", style="Title.TLabel").pack(anchor="w")
        self.report_var = tk.StringVar(value="Chưa có báo cáo")
        ttk.Label(right, textvariable=self.report_var, style="Card.TLabel", wraplength=500).pack(anchor="w", pady=(12, 8))
        self.preview_text = tk.Text(right, height=15, wrap="word", font=("Segoe UI", 12), bg="#f4f7f9", relief="flat", padx=14, pady=14, state="disabled")
        self.preview_text.pack(fill="both", expand=True)
        self.code_var = tk.StringVar()
        ttk.Label(right, textvariable=self.code_var, style="Card.TLabel", font=("Segoe UI Semibold", 14), wraplength=500).pack(anchor="w", pady=12)
        actionrow = ttk.Frame(right, style="Card.TFrame")
        actionrow.pack(fill="x")
        self.confirm_button = ttk.Button(actionrow, text="Xác nhận gửi bản đang xem", style="Primary.TButton", command=self.confirm)
        self.confirm_button.pack(side="left", fill="x", expand=True)
        ttk.Button(actionrow, text="Lưu nháp", command=lambda: self.submit_text("Chỉ lưu nháp")).pack(side="left", padx=(8, 0))
        toolbar = ttk.Frame(right, style="Card.TFrame")
        toolbar.pack(fill="x", pady=(10, 0))
        ttk.Button(toolbar, text="Mở báo cáo", command=self.open_report).pack(side="left")
        ttk.Button(toolbar, text="Lịch sử", command=self.history).pack(side="left", padx=8)
        self.footer_var = tk.StringVar()
        ttk.Label(self.root, textvariable=self.footer_var, padding=(25, 10)).pack(side="bottom", fill="x", before=content)

    def emit(self, kind, value):
        self.events.put((kind, value))

    def consent_changed(self):
        if not self.consent.get() and self.microphone:
            self.disable_mic()
            self.stop()

    def toggle_mic(self):
        if self.microphone:
            self.disable_mic()
            return
        if not self.consent.get():
            self.status_var.set("Đánh dấu đồng ý gửi âm thanh trước khi bật phiên nghe.")
            return
        self.microphone = Microphone(self.engine.provider, self.engine.gate, self.emit,
                                     lambda: self.engine.snapshot()["epoch"], self.threshold.get())
        try:
            self.microphone.start()
            self.mic_button.configure(text="Tắt microphone")
            self.mic_var.set("Đang nghe · hãy nói một câu")
        except AppError as exc:
            self.microphone = None
            self.status_var.set(str(exc))

    def disable_mic(self):
        if self.microphone:
            self.microphone.stop()
            self.old_mics.append(self.microphone)
            self.microphone = None
        self.mic_button.configure(text="Bật phiên nghe")
        self.mic_var.set("Mic đang tắt")

    def submit(self):
        self.submit_text(self.input.get("1.0", "end").strip())

    def submit_text(self, text, captured_at=None):
        control = command(text)
        if control in ("stop", "cancel", "no_send"):
            self.engine.interrupt(control == "cancel")
            self.refresh()
            return
        if control == "open_report":
            self.open_report()
            return
        if control == "history":
            self.history()
            return
        if self.worker and self.worker.is_alive():
            self.status_var.set("Đang xử lý yêu cầu trước. Bạn có thể nói ‘dừng lại’; chờ kết quả rồi yêu cầu tiếp.")
            return
        self.status_var.set("Đang xử lý… Bạn vẫn có thể dừng tác vụ.")
        self.run_button.configure(state="disabled")
        self.confirm_button.configure(state="disabled")
        def work():
            try:
                self.engine.handle(text, captured_at=captured_at)
                self.emit("done", None)
            except AppError as exc:
                self.emit("error", str(exc))
            except Exception:
                self.emit("error", "Không hoàn thành tác vụ. Không gửi lại tự động; kiểm tra đầu vào và lịch sử.")
        self.worker = threading.Thread(target=work, daemon=False)
        self.worker.start()

    def stop(self):
        self.engine.interrupt()
        self.refresh()

    def confirm(self):
        code = self.engine.snapshot()["code"]
        if code:
            self.submit_text("gửi bản " + code)

    def open_report(self):
        artifact = self.engine.snapshot()["artifact"]
        if artifact:
            try:
                os.startfile(artifact.path)
            except OSError:
                self.status_var.set("Không mở được Excel. File báo cáo vẫn nằm trong outputs.")
        else:
            self.status_var.set("Chưa có báo cáo để mở.")

    def history(self):
        events, sends = self.engine.journal.recent()
        win = tk.Toplevel(self.root)
        win.title("Lịch sử thao tác — không tự gửi lại sau khởi động")
        win.geometry("780x440")
        text = tk.Text(win, font=("Consolas", 11), wrap="word", padx=16, pady=16)
        text.pack(fill="both", expand=True)
        text.insert("end", "TRẠNG THÁI SMTP\n")
        for at, state, code in sends:
            text.insert("end", f"{time.strftime('%d/%m %H:%M', time.localtime(at))}  {state}  {code or ''}\n")
        text.insert("end", "\nNHẬT KÝ TÁC VỤ\n")
        for at, kind, detail in events:
            text.insert("end", f"{time.strftime('%H:%M:%S', time.localtime(at))}  {kind}  {detail}\n")
        text.configure(state="disabled")

    def refresh(self):
        s = self.engine.snapshot()
        self.status_var.set(s["status"])
        artifact, preview = s["artifact"], s["preview"]
        if artifact:
            self.report_var.set(f"✓ Đã kiểm chứng · {artifact.period} · {artifact.count} đơn\nTổng: {artifact.total:,} VND\n{artifact.warning}")
        self.preview_text.configure(state="normal")
        self.preview_text.delete("1.0", "end")
        self.preview_text.insert("1.0", preview.text() if preview else "Báo cáo và thư sẽ xuất hiện tại đây.\n\n1. Yêu cầu tạo báo cáo tháng.\n2. Chọn người nhận hoặc nói alias.\n3. Kiểm tra thư, rồi xác nhận hoặc lưu nháp.\n\nKhông gửi thư khi chưa có xác nhận.")
        self.preview_text.configure(state="disabled")
        locked = not self.engine.settings.allow_send
        self.code_var.set("Gửi thật đang khóa · có thể lưu nháp" if locked else f"Xác nhận: gửi bản {s['code']}" if s["code"] else "Chưa có xác nhận gửi hiện hành")
        busy = bool(self.worker and self.worker.is_alive())
        self.confirm_button.configure(state="normal" if s["code"] and not locked and not busy and not s["pending_audio"] else "disabled")
        self.run_button.configure(state="disabled" if busy else "normal")
        usage = self.engine.journal.usage()
        self.footer_var.set(f"OpenRouter :free  ·  {usage}/{self.engine.settings.daily} request trong 24 giờ  ·  Gmail SMTP  ·  {s['method'] or 'Dữ liệu ở máy, AI qua API'}")

    def poll(self):
        while True:
            try:
                kind, value = self.events.get_nowait()
            except queue.Empty:
                break
            if kind in ("done", "error"):
                self.refresh()
                if kind == "error":
                    self.status_var.set(value)
            elif kind == "voice_activity":
                self.mic_var.set("Đang thu · tạm chặn gửi")
                self.confirm_button.configure(state="disabled")
            elif kind == "voice_wait":
                self.mic_var.set("Đang chờ audio API…")
            elif kind == "voice_error":
                self.disable_mic()
                self.engine.interrupt()
                self.refresh()
                self.status_var.set(value)
            elif kind == "transcript":
                text, captured, epoch, microphone = value
                self.engine.gate.audio_end()
                self.transcript_var.set("Vừa nghe: " + text)
                if self.closing or microphone is not self.microphone:
                    continue
                control = command(text)
                if epoch != self.engine.snapshot()["epoch"] and control not in ("stop", "cancel", "no_send"):
                    self.status_var.set("Câu được thu cho tác vụ cũ đã bỏ. Hãy nói lại sau kết quả hiện tại.")
                    continue
                self.mic_var.set("Đang nghe · chờ tác vụ trước xong")
                self.submit_text(text, captured_at=captured)
        self.old_mics = [m for m in self.old_mics if m.alive()]
        if self.closing:
            if not (self.worker and self.worker.is_alive()) and not self.old_mics:
                self.root.destroy()
                return
        else:
            busy = bool(self.worker and self.worker.is_alive())
            self.run_button.configure(state="disabled" if busy else "normal")
            s = self.engine.snapshot()
            locked = not self.engine.settings.allow_send
            self.confirm_button.configure(state="normal" if s["code"] and not locked and not busy and not s["pending_audio"] else "disabled")
            self.code_var.set("Gửi thật đang khóa · có thể lưu nháp" if locked else f"Xác nhận: gửi bản {s['code']}" if s["code"] else "Chưa có xác nhận gửi hiện hành")
        self.root.after(80, self.poll)

    def close(self):
        self.closing = True
        self.disable_mic()
        self.engine.interrupt()
        self.status_var.set("Đang đóng kết nối/worker… Không tự gửi lại khi mở ứng dụng.")
