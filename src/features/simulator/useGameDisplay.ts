import { useCallback, useEffect, useState, type RefObject } from 'react';

export function useGameDisplay(stage: RefObject<HTMLDivElement | null>, immersive: boolean, notify: (message: string) => void) {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [locked, setLocked] = useState(false);
  const canLock = matchMedia('(pointer: fine)').matches && 'requestPointerLock' in document.documentElement;
  const lock = useCallback(() => {
    if (!immersive || !stage.current || !matchMedia('(pointer: fine)').matches) return;
    stage.current.focus({ preventScroll: true });
    try {
      const result = stage.current.requestPointerLock?.();
      result?.catch(() => notify('Trình duyệt chưa cho khóa chuột. Nhấn Enter để tiếp tục chơi và ẩn chuột.'));
    } catch { notify('Trình duyệt chưa hỗ trợ khóa chuột. Bạn có thể kéo để nhìn quanh.'); }
  }, [immersive, stage, notify]);
  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      document.exitPointerLock?.();
      await document.exitFullscreen().catch(() => notify('Chưa thoát được toàn màn hình. Nhấn Esc để thoát.'));
      return;
    }
    // Pointer lock must precede fullscreen, which consumes transient activation.
    lock();
    try { await document.documentElement.requestFullscreen(); }
    catch {
      document.exitPointerLock?.();
      notify('Trình duyệt không cho bật toàn màn hình. Map vẫn phủ toàn bộ vùng hiển thị của trang.');
    }
  }, [lock, notify]);
  useEffect(() => {
    const full = () => {
      setFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) document.exitPointerLock?.();
    };
    const pointer = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('fullscreenchange', full);
    document.addEventListener('pointerlockchange', pointer);
    return () => {
      document.removeEventListener('fullscreenchange', full);
      document.removeEventListener('pointerlockchange', pointer);
      document.exitPointerLock?.();
    };
  }, [stage]);
  useEffect(() => { if (!immersive) document.exitPointerLock?.(); }, [immersive]);
  useEffect(() => {
    if (immersive && document.pointerLockElement) { setLocked(true); stage.current?.focus({ preventScroll: true }); }
    const resume = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && !document.querySelector('dialog[open]') && stage.current?.contains(document.activeElement) && e.target === stage.current && !document.pointerLockElement) { e.preventDefault(); lock(); }
    };
    window.addEventListener('keydown', resume);
    let timer = 0;
    const dialogAction = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('dialog') || !immersive) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (!document.querySelector('dialog[open]')) lock(); }, 0);
    };
    document.addEventListener('click', dialogAction);
    return () => { window.removeEventListener('keydown', resume); document.removeEventListener('click', dialogAction); window.clearTimeout(timer); };
  }, [immersive, lock, stage]);
  return { fullscreen, locked, lock, toggleFullscreen, canLock };
}
