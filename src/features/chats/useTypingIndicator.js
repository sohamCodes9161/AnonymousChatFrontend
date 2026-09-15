import { useRef, useCallback } from 'react';
import { getSocket } from '../../sockets/socketClient.js';

// Debounced typing:start emission — renews on each keystroke rather
// than firing on every one. No client-side stop timer: the server owns
// the TTL (Real-Time System design), this only sends explicit
// typing:stop on blur/send for a snappier UI, not as the source of truth.
export function useTypingIndicator(chatId) {
  const lastSentAt = useRef(0);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentAt.current < 2000) return; // debounce window
    lastSentAt.current = now;
    getSocket()?.emit('typing:start', { chatId });
  }, [chatId]);

  const notifyStoppedTyping = useCallback(() => {
    getSocket()?.emit('typing:stop', { chatId });
  }, [chatId]);

  return { notifyTyping, notifyStoppedTyping };
}
