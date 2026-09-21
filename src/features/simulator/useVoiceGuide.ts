import { useCallback, useEffect, useRef, useState } from 'react';

export function useVoiceGuide() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [enabled, setEnabled] = useState(true);
  const [caption, setCaption] = useState('Chào mừng bạn đến Day Zero. Chọn điểm đến hoặc nhấn J để xem lịch trình.');
  const [voiceNote, setVoiceNote] = useState('');
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    if (!supported) { setVoiceNote('Trình duyệt không hỗ trợ giọng nói. Hướng dẫn chữ vẫn hoạt động.'); return; }
    const update = () => {
      voice.current = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('vi'));
      setVoiceNote(voice.current ? '' : 'Máy chưa có giọng tiếng Việt. Cài giọng tiếng Việt của hệ điều hành để nghe rõ hơn.');
    };
    update(); speechSynthesis.addEventListener('voiceschanged', update);
    const hidden = () => { if (document.hidden) speechSynthesis.cancel(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { speechSynthesis.cancel(); speechSynthesis.removeEventListener('voiceschanged', update); document.removeEventListener('visibilitychange', hidden); };
  }, [supported]);
  const speak = useCallback((text: string) => {
    setCaption(text);
    if (!supported || !enabled || document.hidden) return;
    speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(text);
    message.lang = 'vi-VN'; message.rate = .95;
    if (voice.current) message.voice = voice.current;
    message.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) setVoiceNote('Chưa phát được giọng nói. Bấm Nghe lại hoặc tiếp tục theo hướng dẫn chữ.'); };
    utterance.current = message;
    speechSynthesis.speak(message);
  }, [enabled, supported]);
  const toggle = () => { if (supported) speechSynthesis.cancel(); setEnabled(value => !value); };
  return { enabled, supported, speak, toggle, caption, voiceNote, replay: () => speak(caption) };
}
