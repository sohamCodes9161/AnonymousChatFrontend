import { useRef } from 'react';

const LOCK_PX = 8; // movement before we decide horizontal vs vertical
const TRIGGER_PX = 56; // distance that counts as "reply"
const MAX_PX = 72; // beyond this the bubble resists

function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* unsupported — skip */
  }
}

/**
 * Swipe a message to the right to reply (touch/pen only). Attach the
 * returned `handlers` to the row, `contentRef` to the part that slides and
 * `iconRef` to the reply icon (placed inside the sliding part). The
 * element needs `touch-action: pan-y` so vertical scrolling stays native
 * while horizontal drags reach us. Style changes are written straight to
 * the DOM, so dragging doesn't re-render React on every pointermove.
 */
export function useSwipeToReply({ enabled, onReply }) {
  const contentRef = useRef(null);
  const iconRef = useRef(null);
  const state = useRef({ active: false, locked: false, x: 0, y: 0, dx: 0 });
  const swipedRef = useRef(false);

  function apply(dx, animate) {
    const content = contentRef.current;
    const icon = iconRef.current;
    if (content) {
      content.style.transition = animate ? 'transform 180ms ease-out' : 'none';
      content.style.transform = dx ? `translateX(${dx}px)` : '';
    }
    if (icon) {
      const progress = Math.min(dx / TRIGGER_PX, 1);
      icon.style.opacity = String(Math.max(progress, 0));
      icon.style.transform = `translateY(-50%) scale(${0.6 + 0.4 * Math.max(progress, 0)})`;
    }
  }

  function finish(allowTrigger) {
    const s = state.current;
    if (!s.active) return;
    s.active = false;
    const trigger = allowTrigger && s.locked && s.dx >= TRIGGER_PX;
    if (s.locked) swipedRef.current = true; // swallow the click that may trail the drag
    s.locked = false;
    apply(0, true);
    if (trigger) {
      haptic();
      onReply();
    }
  }

  const handlers = {
    onPointerDown(e) {
      swipedRef.current = false;
      if (!enabled || e.pointerType === 'mouse') return;
      state.current = { active: true, locked: false, x: e.clientX, y: e.clientY, dx: 0 };
    },
    onPointerMove(e) {
      const s = state.current;
      if (!s.active) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;

      if (!s.locked) {
        // Mostly-vertical or leftward: not ours — let the list scroll.
        if ((Math.abs(dy) > LOCK_PX && Math.abs(dy) > Math.abs(dx)) || dx < -LOCK_PX) {
          s.active = false;
          return;
        }
        if (dx <= LOCK_PX) return; // not far enough to decide yet
        s.locked = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* not critical */
        }
      }

      s.dx = dx;
      apply(dx > MAX_PX ? MAX_PX + (dx - MAX_PX) * 0.2 : Math.max(dx, 0), false);
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
  };

  return { contentRef, iconRef, handlers, didSwipe: () => swipedRef.current };
}
