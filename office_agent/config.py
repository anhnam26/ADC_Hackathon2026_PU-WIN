from dataclasses import dataclass, field
from pathlib import Path

from dotenv import dotenv_values


class AppError(Exception):
    """Only messages intentionally safe for the UI may use this exception."""


def confined(path: Path, parent: Path) -> Path:
    result = path.resolve()
    if not result.is_relative_to(parent.resolve()):
        raise AppError("Đường dẫn nằm ngoài thư mục được phép.")
    return result


@dataclass(frozen=True)
class Settings:
    root: Path
    inputs: Path
    outputs: Path
    runtime: Path
    api_key: str = field(default="", repr=False)
    text_model: str = "nvidia/nemotron-3-super-120b-a12b:free"
    audio_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    data_collection: str = "deny"
    sender: str = ""
    gmail_password: str = field(default="", repr=False)
    allow_send: bool = False
    rpm: int = 10
    daily: int = 40
    timeout: int = 30
    max_tokens: int = 2048
    smtp_timeout: int = 20

    @classmethod
    def load(cls, root: Path):
        root = root.resolve()
        e = dotenv_values(root / ".env")
        def val(k, default=""):
            return str(e.get(k) or default).strip()
        def number(k, default, low, high):
            try:
                n = int(val(k, str(default)))
                if not low <= n <= high:
                    raise ValueError
                return n
            except ValueError:
                raise AppError(f"Cấu hình {k} phải từ {low} đến {high}.") from None
        if val("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/") != "https://openrouter.ai/api/v1":
            raise AppError("Chỉ hỗ trợ endpoint OpenRouter chính thức.")
        if val("OPENROUTER_FREE_ONLY", "true").lower() != "true" or val("OPENROUTER_ALLOW_PAID_FALLBACK", "false").lower() != "false":
            raise AppError("Bản demo chỉ hỗ trợ free-only, không paid fallback.")
        if val("OPENROUTER_FALLBACK_MODEL"):
            raise AppError("Bản MVP chưa hỗ trợ model dự phòng; để trống FALLBACK_MODEL.")
        if val("MAIL_PROVIDER", "gmail_smtp") != "gmail_smtp" or val("SMTP_HOST", "smtp.gmail.com") != "smtp.gmail.com" or val("SMTP_PORT", "465") != "465" or val("SMTP_SECURITY", "ssl") != "ssl":
            raise AppError("SMTP yêu cầu Gmail, cổng 465 và SSL.")
        policy = val("OPENROUTER_DATA_COLLECTION", "deny")
        if policy not in ("allow", "deny"):
            raise AppError("DATA_COLLECTION phải là allow hoặc deny.")
        for key in ("OPENROUTER_TEXT_MODEL", "OPENROUTER_AUDIO_MODEL"):
            if val(key) and not val(key).endswith(":free"):
                raise AppError("Model phải có hậu tố :free.")
        if val("SAVE_RAW_AUDIO", "false").lower() != "false":
            raise AppError("MVP không lưu bản thu âm. Đặt SAVE_RAW_AUDIO=false.")
        return cls(root, confined(root / val("INPUTS_DIR", "inputs/private"), root),
                   confined(root / val("OUTPUTS_DIR", "outputs"), root), root / "runtime",
                   val("OPENROUTER_API_KEY"), val("OPENROUTER_TEXT_MODEL", cls.text_model),
                   val("OPENROUTER_AUDIO_MODEL", cls.audio_model), policy, val("DEMO_SENDER_EMAIL"),
                   "".join(val("GMAIL_APP_PASSWORD").split()), val("ALLOW_REAL_EMAIL_SEND", "false").lower() == "true",
                   number("OPENROUTER_REQUESTS_PER_MINUTE", 10, 1, 20),
                   number("OPENROUTER_REQUESTS_PER_DAY", 40, 1, 1000),
                   number("OPENROUTER_TIMEOUT_SECONDS", 30, 5, 60),
                   number("OPENROUTER_MAX_OUTPUT_TOKENS", 2048, 256, 4096),
                   number("SMTP_TIMEOUT_SECONDS", 20, 5, 60))
