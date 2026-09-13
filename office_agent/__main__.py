import argparse
from pathlib import Path
import sys

from .config import AppError, Settings
from .engine import Engine
from .excel import build_report
from .journal import Journal
from .provider import OpenRouter


def main():
    parser = argparse.ArgumentParser(description="Hands-Free Office Agent")
    parser.add_argument("--doctor", action="store_true", help="Read-only configuration checks, no network")
    parser.add_argument("--check-api", action="store_true", help="One synthetic text intent API call")
    parser.add_argument("--check-audio-api", action="store_true", help="Send synthetic English SAPI speech to audio API; never opens microphone")
    parser.add_argument("--demo-draft", metavar="ALIAS", help="Create August report and local .eml draft only; never sends email")
    parser.add_argument("--smoke-report", metavar="YYYY-MM", help="Create/verify a report from configured synthetic source")
    parser.add_argument("--smoke-ui", action="store_true", help="Open desktop briefly then close cleanly")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    try:
        settings = Settings.load(root)
        journal = Journal(settings.runtime / "journal.sqlite3")
        provider = OpenRouter(settings, journal)
        if args.doctor:
            from .mail import contacts
            from .excel import inspect_source
            import sounddevice as sd
            book = inspect_source(settings.inputs / "source.xlsx")
            people = contacts(settings.inputs / "contacts.csv")
            print(f"Source: {len(book)} rows; contacts: {len(people)}, enabled: {sum(c.allowed for c in people.values())}")
            print(f"OpenRouter key configured: {bool(settings.api_key)}; Gmail credential configured: {bool(settings.gmail_password)}")
            print(f"Real sending enabled: {settings.allow_send}; audio: API only, explicit session consent required")
            print(f"Input devices: {sum(d['max_input_channels'] > 0 for d in sd.query_devices())}")
            return 0
        if args.check_api:
            result = provider.parse("Tạo báo cáo doanh thu tháng 8 năm 2026", ["demo"], "2026-09-13")
            if result.workflow != "excel_report" or result.period != "2026-08":
                raise AppError(f"Synthetic API test did not match expected intent: {result.workflow}, {result.period}.")
            print("PASS: synthetic OpenRouter intent validated. No email or audio sent.")
            return 0
        if args.check_audio_api:
            import win32com.client
            from .voice import to_wav
            voice = win32com.client.Dispatch("SAPI.SpVoice")
            stream = win32com.client.Dispatch("SAPI.SpMemoryStream")
            fmt = win32com.client.Dispatch("SAPI.SpAudioFormat")
            fmt.Type = 18  # SAPI SAFT16kHz16BitMono, signed PCM.
            stream.Format = fmt
            voice.AudioOutputStream = stream
            voice.Speak("Create the revenue report for August twenty twenty six.")
            pcm = bytes(stream.GetData())
            voice = stream = fmt = None
            transcript = provider.transcribe(to_wav(pcm))
            print("Synthetic English transcript:", transcript)
            normalized = transcript.lower()
            if "august" not in normalized or "report" not in normalized:
                raise AppError("Audio API returned text but synthetic English keywords did not match.")
            print("PASS: synthetic English audio transport/transcription. Vietnamese live speech is not validated.")
            return 0
        if args.demo_draft:
            from .mail import contacts, save_draft
            if args.demo_draft not in contacts(settings.inputs / "contacts.csv"):
                raise AppError("Alias không có trong danh bạ.")
            engine = Engine(settings, journal, provider)
            engine.handle("Tạo báo cáo tháng 8 năm 2026 rồi soạn thư cho " + args.demo_draft)
            if not engine.preview:
                raise AppError("Chưa đủ thông tin tạo preview.")
            path = save_draft(engine.preview)
            engine.gate.invalidate()
            journal.event(engine.run_id, "draft_saved")
            print(f"PASS: verified report and local draft only: {path}")
            return 0
        if args.smoke_report:
            artifact = build_report(settings.inputs / "source.xlsx", settings.outputs, args.smoke_report)
            print(f"PASS: {artifact.count} orders, {artifact.total} VND; {artifact.path}")
            return 0
        import tkinter as tk
        from .ui import Desktop
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        window = tk.Tk()
        Desktop(window, Engine(settings, journal, provider), smoke=args.smoke_ui)
        window.mainloop()
        return 0
    except AppError as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
