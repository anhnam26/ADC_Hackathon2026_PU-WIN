import array
import io
import time
import wave

import httpx
import pytest

from office_agent.config import AppError
from office_agent.provider import OpenRouter
from office_agent.voice import Segmenter, to_wav


def configured_provider(settings, journal):
    p = OpenRouter(settings, journal)
    p.catalog_at = time.monotonic()
    p.catalog = {settings.text_model: {"architecture": {"input_modalities": ["text"]}, "pricing": {"prompt": "0", "completion": "0"}, "supported_parameters": ["structured_outputs"]}}
    return p


def test_provider_payload_minimizes_data_and_schema(settings, journal, monkeypatch):
    p = configured_provider(settings, journal)
    def post(url, **kwargs):
        payload = kwargs["json"]
        assert payload["provider"]["max_price"] == {"prompt": 0, "completion": 0, "request": 0}
        assert payload["response_format"]["json_schema"]["strict"]
        assert "sender@" not in str(payload)
        return httpx.Response(200, json={"choices": [{"finish_reason": "stop", "message": {"content": '{"workflow":"excel_report","period":"2026-08","recipient":null}'}}]})
    monkeypatch.setattr(httpx, "post", post)
    assert p.parse("Tạo báo cáo tháng 8 năm 2026", ["demo"], "2026-09-13").period == "2026-08"
    assert journal.usage() == 1


@pytest.mark.parametrize("failure", ["paid", "price", "audio", "schema"])
def test_capability_failure_never_posts(settings, journal, monkeypatch, failure):
    p = configured_provider(settings, journal)
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("Must not call inference"))
    model = settings.text_model
    if failure == "paid":
        model = "paid-model"
    elif failure == "price":
        p.catalog[model]["pricing"]["request"] = "0.01"
    elif failure == "schema":
        p.catalog[model]["supported_parameters"] = []
    with pytest.raises(AppError):
        p.complete(model, [], schema={"type": "object"}, modality="audio" if failure == "audio" else "text")
    assert journal.usage() == 0


def test_quota_survives_restart(settings, journal):
    from office_agent.journal import Journal
    journal.reserve_api("free", 1, 1)
    with pytest.raises(AppError, match="ngân sách"):
        Journal(journal.path).reserve_api("free", 1, 1)


def test_cloud_error_never_retries_or_exposes_raw_body(settings, journal, monkeypatch):
    p = configured_provider(settings, journal)
    calls = []
    def post(*a, **k):
        calls.append(1)
        return httpx.Response(429, text="sensitive debug body")
    monkeypatch.setattr(httpx, "post", post)
    with pytest.raises(AppError) as caught:
        p.complete(settings.text_model, [])
    assert "sensitive" not in str(caught.value)
    assert len(calls) == 1


def test_voice_segmentation_silence_spike_speech_and_wav():
    quiet = array.array("h", [0] * 800).tobytes()
    loud = array.array("h", [6000] * 800).tobytes()
    s = Segmenter()
    assert all(s.feed(quiet) == (False, None, False) for _ in range(30))
    assert s.feed(loud)[0]
    result = None
    for _ in range(16):
        result = s.feed(quiet)
    assert result[1] == b""  # A transient spike must not reach the API.
    for _ in range(8):
        s.feed(loud)
    for _ in range(16):
        result = s.feed(quiet)
    assert result[1]
    with wave.open(io.BytesIO(to_wav(result[1])), "rb") as wav:
        assert wav.getframerate() == 16000 and wav.getnchannels() == 1


def test_overlong_voice_discarded():
    loud = array.array("h", [6000] * 800).tobytes()
    s = Segmenter()
    for _ in range(300):
        result = s.feed(loud)
    assert result == (False, b"", True)
