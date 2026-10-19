import { useEffect, useState } from 'react';

const isActive = () => document.visibilityState === 'visible' && document.hasFocus();

// True only while this tab is on screen AND focused — the condition for
// "the user is actually looking at the chat" (so messages aren't marked
// read while the tab is in the background).
export function usePageActive() {
  const [active, setActive] = useState(isActive);
  useEffect(() => {
    const update = () => setActive(isActive());
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
    };
  }, []);
  return active;
}
