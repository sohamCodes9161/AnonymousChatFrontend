import { useRef } from 'react';

const MOVE_TOLERANCE_PX = 10;

function haptic() {
  try {
    navigator.vibrate?.(15);
  } catch {
    /* unsupported (iOS Safari) — silently skip */
  }
}

/**
 * Long-press (touch/pen, default 400ms) and right-click (desktop) to
 * trigger `onLongPress`; while `interceptTaps` is on (selection mode), a
 * plain tap anywhere in the element triggers `onTap` instead of reaching
 * its children. Spread the result onto the element.
 *
 * onLongPress must be idempotent (select, not toggle): Android fires a
 * `contextmenu` shortly after our own timer, so it can run twice.
 */
export function useLongPress({ onLongPress, onTap, enabled = true, interceptTaps = false, delay = 400 }) {
  const timerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  function cancel() {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  return {
    onPointerDown(e) {
      firedRef.current = false; // a fresh gesture — drop any stale flag
      if (!enabled || e.pointerType === 'mouse' || e.button > 0) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        haptic();
        onLongPress();
      }, delay);
    },
    onPointerMove(e) {
      if (!timerRef.current) return;
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu(e) {
      if (!enabled) return;
      e.preventDefault();
      if (!firedRef.current) haptic();
      firedRef.current = true;
      onLongPress();
    },
    // Capture phase, so it runs before any child (e.g. the photo's own
    // "open preview" click) and can swallow the click that trails a
    // long-press.
    onClickCapture(e) {
      if (firedRef.current) {
        firedRef.current = false;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (enabled && interceptTaps) {
        e.stopPropagation();
        e.preventDefault();
        onTap();
      }
    },
  };
}
