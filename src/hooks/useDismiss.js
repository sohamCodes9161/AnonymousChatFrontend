import { useEffect } from 'react';

// Closes a popover on Escape or a press outside it. Presses inside any
// [data-tray] popover, or on a [data-tray-toggle] button (which handles
// its own toggling), don't count as "outside".
export function useDismiss(onClose) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function onPointerDown(e) {
      if (e.target.closest?.('[data-tray], [data-tray-toggle]')) return;
      onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [onClose]);
}
