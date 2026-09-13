from dataclasses import dataclass
from datetime import date
import re
import unicodedata

from .config import AppError


def normalize(text):
    text = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9_ ]", " ", text)).strip()


@dataclass(frozen=True)
class Intent:
    workflow: str
    period: str | None = None
    recipient: str | None = None
    question: str = ""


def valid_period(period):
    if not re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])", period or ""):
        raise AppError("Kỳ báo cáo cần dạng YYYY-MM, ví dụ 2026-08.")
    return period


CONTROLS = {
    "dung lai": "stop", "tam dung": "stop", "huy tac vu": "cancel",
    "tiep tuc": "resume", "chi luu nhap": "draft", "dung gui chi luu nhap": "draft",
    "chi luu nhap dung gui": "draft", "doc lai": "review", "nghe lai": "review",
    "doc lai nguoi nhan va tep dinh kem": "review", "ngung doc": "silence",
    "xac nhan gui": "challenge", "mo bao cao": "open_report", "xem lich su": "history",
}


def command(text):
    n = normalize(text)
    n = re.sub(r"^tro ly\s+", "", n)
    if n in CONTROLS:
        return CONTROLS[n]
    if re.fullmatch(r"gui ban \d{4}", n):
        return "confirm:" + n[-4:]
    if any(x in n for x in ("dung gui", "chua xac nhan", "khong gui")):
        return "no_send"
    return None


def local_intent(text, aliases, today=None):
    n = normalize(text)
    if any(x in n for x in ("xoa ", "tat ca moi nguoi", "moi nguoi", "chuyen tien", "ghi de", "chay code", "powershell", "macro")):
        return Intent("unsupported", question="Yêu cầu ngoài phạm vi tạo báo cáo tháng và thư theo mẫu.")
    if any(x in n for x in ("pending", "cancelled", "chua hoan thanh", "tat ca don", "khong loc")):
        return Intent("unsupported", question="Báo cáo này chỉ hỗ trợ đơn Completed theo nghiệp vụ đã chốt; chưa đổi bộ lọc.")
    period = None
    iso = re.search(r"\b(20\d{2}) (0?[1-9]|1[0-2])\b", n)
    explicit = re.search(r"thang\s+(\d{1,2})\s+(?:nam\s+)?(20\d{2})\b", n)
    if explicit:
        month, year = map(int, explicit.groups())
        period = valid_period(f"{year}-{month:02}")
    elif iso:
        period = valid_period(f"{iso[1]}-{int(iso[2]):02}")
    elif "thang truoc" in n:
        today = today or date.today()
        period = f"{today.year - (today.month == 1)}-{12 if today.month == 1 else today.month - 1:02}"
    elif "thang nay" in n:
        period = (today or date.today()).strftime("%Y-%m")
    candidates = []
    padded = " " + n.replace("_", " ") + " "
    words = padded.split()
    phrases = {"".join(words[i:j]) for i in range(len(words))
               for j in range(i + 1, min(len(words), i + 6) + 1)}
    for alias in aliases:
        spoken = normalize(alias).replace("_", " ")
        if spoken.replace(" ", "") in phrases:
            candidates.append(alias)
    # Never resolve a shared first name by guessing.
    mentioned = [a for a in aliases if " " + normalize(a).split("_")[0] + " " in padded]
    recipient = candidates[0] if len(candidates) == 1 else None
    email = bool(mentioned or recipient) or any(x in n for x in ("gui", "soan thu", "email", "nguoi nhan", "chon "))
    report = any(x in n for x in ("bao cao", "doanh thu", "tong hop", "doi thang"))
    if email or report or period:
        workflow = "report_email" if email and period else "email" if email else "excel_report"
        if "thang" in n and not period:
            return Intent(workflow, None, recipient, "Hãy nói rõ tháng và năm, ví dụ tháng 8 năm 2026.")
        if email and not recipient and len(mentioned) > 1:
            return Intent(workflow, period, None, "Có nhiều người cùng tên. Hãy nói alias đầy đủ: " + ", ".join(mentioned))
        return Intent(workflow, period, recipient)
    return None


INTENT_SCHEMA = {
    "type": "object", "properties": {
        "workflow": {"type": "string", "enum": ["excel_report", "email", "report_email", "unsupported"]},
        "period": {"type": ["string", "null"], "pattern": "^20[0-9]{2}-(0[1-9]|1[0-2])$"}, "recipient": {"type": ["string", "null"]},
    }, "required": ["workflow", "period", "recipient"], "additionalProperties": False,
}


def validate_candidate(data, aliases):
    if not isinstance(data, dict) or set(data) != {"workflow", "period", "recipient"}:
        raise AppError("AI trả cấu trúc không hợp lệ; chưa thực hiện tác vụ.")
    if data["workflow"] not in INTENT_SCHEMA["properties"]["workflow"]["enum"]:
        raise AppError("AI đề xuất tác vụ ngoài phạm vi.")
    period, recipient = data["period"], data["recipient"]
    if period is not None:
        if not isinstance(period, str):
            raise AppError("AI trả kỳ báo cáo sai kiểu.")
        valid_period(period)
    if recipient is not None and (not isinstance(recipient, str) or recipient not in aliases):
        raise AppError("AI đề xuất người nhận ngoài danh bạ.")
    return Intent(data["workflow"], period, recipient)
