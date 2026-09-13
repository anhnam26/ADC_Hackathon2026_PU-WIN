from dataclasses import replace
import smtplib
import time

import pytest

from office_agent.config import AppError
from office_agent.journal import Journal
from office_agent.mail import SendGate, send_preview


class FakeSMTP:
    """No sockets. Injected transport covers submission boundaries and failures."""
    def __init__(self, on_login=None, error=None, quit_error=False):
        self.on_login, self.error, self.quit_error = on_login, error, quit_error
        self.submissions = 0

    def __call__(self, *args, **kwargs):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self.quit_error:
            raise OSError("synthetic QUIT failure")

    def ehlo(self):
        pass

    def login(self, *args):
        if self.on_login:
            self.on_login()

    def sendmail(self, *args):
        self.submissions += 1
        if self.error:
            raise self.error
        return {}


@pytest.mark.parametrize("condition", ["locked", "expired", "wrongcode", "stopped", "pending_audio", "attachment", "contact", "source"])
def test_preconditions_prevent_submission(settings, journal, preview, condition):
    gate = SendGate()
    a = gate.issue(preview)
    code = a.code
    settings = replace(settings, allow_send=condition != "locked")
    if condition == "expired":
        a.expires = time.monotonic() - 1
    elif condition == "wrongcode":
        code = "invalid"
    elif condition == "stopped":
        gate.stop()
    elif condition == "pending_audio":
        gate.audio_begin()
    elif condition == "attachment":
        preview.attachment.write_bytes(b"changed")
    elif condition == "source":
        preview.source.write_bytes(b"changed")
    elif condition == "contact":
        p = settings.inputs / "contacts.csv"
        p.write_text(p.read_text(encoding="utf-8").replace("lan@demo.test", "changed@demo.test"), encoding="utf-8")
    transport = FakeSMTP()
    with pytest.raises(AppError):
        send_preview(settings, journal, gate, preview, code, smtp_factory=transport)
    assert transport.submissions == 0


def test_stop_during_login_blocks_send(settings, journal, preview):
    gate = SendGate()
    a = gate.issue(preview)
    transport = FakeSMTP(on_login=gate.stop)
    with pytest.raises(AppError):
        send_preview(replace(settings, allow_send=True), journal, gate, preview, a.code, smtp_factory=transport)
    assert transport.submissions == 0
    assert journal.recent()[1] == []


def test_contact_revoked_during_login_blocks_send(settings, journal, preview):
    gate = SendGate()
    a = gate.issue(preview)
    def revoke():
        p = settings.inputs / "contacts.csv"
        p.write_text(p.read_text(encoding="utf-8").replace("true", "false"), encoding="utf-8")
    transport = FakeSMTP(on_login=revoke)
    with pytest.raises(AppError, match="chưa được phép"):
        send_preview(replace(settings, allow_send=True), journal, gate, preview, a.code, smtp_factory=transport)
    assert transport.submissions == 0


@pytest.mark.parametrize("error,state", [(None, "SMTP_ACCEPTED"), (TimeoutError(), "UNKNOWN"), (smtplib.SMTPDataError(550, b"rejected"), "REJECTED")])
def test_durable_send_status_and_restart(settings, journal, preview, error, state):
    settings = replace(settings, allow_send=True)
    gate = SendGate()
    a = gate.issue(preview)
    transport = FakeSMTP(error=error)
    if error:
        with pytest.raises(AppError):
            send_preview(settings, journal, gate, preview, a.code, smtp_factory=transport)
    else:
        assert "chấp nhận" in send_preview(settings, journal, gate, preview, a.code, smtp_factory=transport)
    assert journal.recent()[1][0][1] == state
    assert transport.submissions == 1
    if state != "REJECTED":
        restarted = Journal(journal.path)
        a = gate.issue(preview)
        with pytest.raises(AppError, match="Không tự gửi lại"):
            send_preview(settings, restarted, gate, preview, a.code, smtp_factory=transport)
        assert transport.submissions == 1


def test_quit_failure_does_not_lose_acceptance(settings, journal, preview):
    gate = SendGate()
    a = gate.issue(preview)
    transport = FakeSMTP(quit_error=True)
    assert "chấp nhận" in send_preview(replace(settings, allow_send=True), journal, gate, preview, a.code, smtp_factory=transport)
    assert journal.recent()[1][0][1] == "SMTP_ACCEPTED"
