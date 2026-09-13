import json
from contextlib import contextmanager
import sqlite3
import time
from pathlib import Path

from .config import AppError


class Journal:
    """Short transactions and metadata only; never transcripts or credentials."""
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY, at REAL NOT NULL, run TEXT, kind TEXT, detail TEXT);
              CREATE TABLE IF NOT EXISTS api_calls (at REAL NOT NULL, model TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS sends (
                id TEXT PRIMARY KEY, at REAL NOT NULL, fingerprint TEXT NOT NULL,
                state TEXT NOT NULL, code INTEGER);
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=5)
        try:
            with db:
                yield db
        finally:
            db.close()

    def event(self, run, kind, **metadata):
        allowed = {"period", "rows", "total", "status", "stage", "code", "model", "seconds"}
        if not set(metadata).issubset(allowed):
            raise ValueError("Unexpected journal metadata")
        with self.connect() as db:
            db.execute("INSERT INTO events(at,run,kind,detail) VALUES(?,?,?,?)",
                       (time.time(), run, kind, json.dumps(metadata, ensure_ascii=False)))

    def reserve_api(self, model, rpm, daily):
        now = time.time()
        # Rolling 24h is conservative and avoids assuming provider reset timezone.
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            minute = db.execute("SELECT COUNT(*) FROM api_calls WHERE at>?", (now - 60,)).fetchone()[0]
            day = db.execute("SELECT COUNT(*) FROM api_calls WHERE at>?", (now - 86400,)).fetchone()[0]
            if minute >= rpm or day >= daily:
                raise AppError("Đã hết ngân sách API của ứng dụng. Tạm dừng và thử lại sau.")
            db.execute("INSERT INTO api_calls VALUES(?,?)", (now, model))

    def usage(self):
        with self.connect() as db:
            return db.execute("SELECT COUNT(*) FROM api_calls WHERE at>?", (time.time() - 86400,)).fetchone()[0]

    def begin_send(self, approval_id, fingerprint):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            # A previous ambiguous or accepted payload must never auto-submit again.
            duplicate = db.execute("SELECT 1 FROM sends WHERE fingerprint=? AND state IN ('SUBMIT_STARTED','UNKNOWN','SMTP_ACCEPTED')", (fingerprint,)).fetchone()
            if duplicate:
                raise AppError("Nội dung này đã gửi hoặc chưa rõ trạng thái. Không tự gửi lại; kiểm tra Gmail.")
            try:
                db.execute("INSERT INTO sends VALUES(?,?,?,?,NULL)", (approval_id, time.time(), fingerprint, "SUBMIT_STARTED"))
            except sqlite3.IntegrityError:
                raise AppError("Xác nhận này đã được sử dụng.") from None

    def finish_send(self, approval_id, state, code=None):
        with self.connect() as db:
            db.execute("UPDATE sends SET state=?,code=? WHERE id=?", (state, code, approval_id))

    def recent(self, limit=20):
        with self.connect() as db:
            events = db.execute("SELECT at,kind,detail FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            sends = db.execute("SELECT at,state,code FROM sends ORDER BY at DESC LIMIT ?", (limit,)).fetchall()
        return events, sends
