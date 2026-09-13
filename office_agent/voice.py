"""Signal-based segmentation only. No local AI; no recordings written to disk."""
import array
import collections
import io
import math
import queue
import threading
import time
import wave

from .config import AppError


def rms_pcm(data):
    samples = array.array("h", data)
    return math.sqrt(sum(int(x) ** 2 for x in samples) / max(1, len(samples))) / 32768


class Segmenter:
    def __init__(self, threshold=0.012, frame_seconds=0.05):
        self.threshold = threshold
        self.dt = frame_seconds
        self.pre = collections.deque(maxlen=4)
        self.frames = []
        self.silence = self.voiced = 0
        self.active = False

    def feed(self, data):
        """Return (started, finished_pcm, too_long); short spikes yield no audio."""
        level = rms_pcm(data)
        started = False
        if not self.active:
            self.pre.append(data)
            if level < self.threshold:
                return False, None, False
            self.active = True
            self.frames = list(self.pre)
            self.pre.clear()
            self.voiced = self.silence = 0
            started = True
        else:
            self.frames.append(data)
        if level >= self.threshold:
            self.voiced += 1
            self.silence = 0
        else:
            self.silence += 1
        too_long = len(self.frames) * self.dt >= 15
        if self.silence * self.dt >= 0.8 or too_long:
            pcm = b"".join(self.frames) if self.voiced * self.dt >= 0.2 and not too_long else b""
            self.frames = []
            self.active = False
            return started, pcm, too_long
        return started, None, False


def to_wav(pcm):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(pcm)
    return buffer.getvalue()


class Microphone:
    def __init__(self, provider, gate, emit, epoch, threshold=0.012, device=None):
        self.provider, self.gate, self.emit, self.epoch = provider, gate, emit, epoch
        self.threshold, self.device = threshold, device
        self.stop_event = threading.Event()
        self.frames = queue.Queue(maxsize=80)
        self.clips = queue.Queue(maxsize=2)
        self.threads = []
        self.stream = None

    def start(self):
        import sounddevice as sd
        def callback(data, frames, timing, status):
            if status:
                self.emit("voice_error", "Microphone mất frame. Phiên nghe đã dừng; hãy bật lại.")
                self.stop_event.set()
                self.gate.stop()
                return
            try:
                self.frames.put_nowait(bytes(data))
            except queue.Full:
                self.gate.stop()
                self.stop_event.set()
                self.emit("voice_error", "Bộ đệm mic đầy. Phiên nghe đã dừng; hãy bật lại.")
        try:
            self.stream = sd.RawInputStream(samplerate=16000, channels=1, dtype="int16", blocksize=800, device=self.device, callback=callback)
            self.stream.start()
        except Exception:
            if self.stream:
                self.stream.close()
            raise AppError("Không mở được mic 16 kHz. Kiểm tra thiết bị và quyền microphone.") from None
        for target in (self._segments, self._recognize):
            worker = threading.Thread(target=target, daemon=False)
            worker.start()
            self.threads.append(worker)

    def _segments(self):
        segmenter = Segmenter(self.threshold)
        started = time.monotonic()
        pending = False
        captured = 0
        epoch = 0
        try:
            while not self.stop_event.is_set():
                if time.monotonic() - started > 120:
                    self.emit("voice_error", "Phiên nghe đã đủ 2 phút. Bật lại để tiếp tục; không gửi âm thanh liên tục.")
                    self.gate.stop()
                    self.stop_event.set()
                    break
                try:
                    frame = self.frames.get(timeout=0.1)
                except queue.Empty:
                    continue
                begin, pcm, too_long = segmenter.feed(frame)
                if begin:
                    self.gate.audio_begin()
                    pending = True
                    captured, epoch = time.monotonic(), self.epoch()
                    self.emit("voice_activity", None)
                if pcm is not None:
                    if pcm:
                        try:
                            self.clips.put_nowait((pcm, captured, epoch))
                            pending = False  # recognition consumer now owns the hold
                        except queue.Full:
                            self.gate.stop()
                            self.emit("voice_error", "Bạn đang nói nhanh hơn API xử lý. Đã dừng; chờ rồi bật mic lại.")
                            self.stop_event.set()
                    if pending:
                        self.gate.audio_end()
                        pending = False
                    if too_long:
                        self.gate.stop()
                        self.emit("voice_error", "Câu quá 15 giây; chưa gửi đoạn này. Hãy nói ngắn hơn.")
        finally:
            if pending:
                self.gate.audio_end()
            if self.stream:
                self.stream.stop()
                self.stream.close()

    def _recognize(self):
        while not self.stop_event.is_set() or not self.clips.empty():
            try:
                pcm, captured, epoch = self.clips.get(timeout=0.1)
            except queue.Empty:
                continue
            if self.stop_event.is_set():
                self.gate.audio_end()
                continue
            try:
                self.emit("voice_wait", None)
                text = self.provider.transcribe(to_wav(pcm))
                # UI receives ownership of hold, releases it immediately before dispatch.
                self.emit("transcript", (text, captured, epoch, self))
            except AppError as exc:
                self.gate.audio_end()
                self.gate.stop()
                self.emit("voice_error", str(exc))
            except Exception:
                self.gate.audio_end()
                self.gate.stop()
                self.emit("voice_error", "Không xử lý được âm thanh. Tác vụ đã tạm dừng.")
            finally:
                pcm = None

    def stop(self):
        self.stop_event.set()

    def join(self, timeout=1):
        for worker in self.threads:
            worker.join(timeout)

    def alive(self):
        return any(t.is_alive() for t in self.threads)
