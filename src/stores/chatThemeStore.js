import { create } from 'zustand';

const KEY = 'chatThemes.v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { global: raw.global || {}, byChat: raw.byChat || {} };
  } catch {
    /* private mode / blocked storage — fall back to defaults */
  }
  return { global: {}, byChat: {} };
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ global: state.global, byChat: state.byChat }));
  } catch {
    /* non-fatal */
  }
}

export const useChatThemeStore = create((set, get) => ({
  ...load(),
  // scope: 'chat' sets just this chat; 'all' sets the default and clears
  // per-chat overrides for the changed field so the change is visible everywhere.
  setTheme: (chatId, patch, scope) => {
    const { global, byChat } = get();
    let next;
    if (scope === 'all') {
      const cleaned = Object.fromEntries(
        Object.entries(byChat).map(([id, t]) => {
          const copy = { ...t };
          Object.keys(patch).forEach((k) => delete copy[k]);
          return [id, copy];
        })
      );
      next = { global: { ...global, ...patch }, byChat: cleaned };
    } else {
      next = { global, byChat: { ...byChat, [chatId]: { ...(byChat[chatId] || {}), ...patch } } };
    }
    save(next);
    set(next);
  },
  resetChat: (chatId) => {
    const { global, byChat } = get();
    const { [chatId]: _drop, ...rest } = byChat;
    const next = { global, byChat: rest };
    save(next);
    set(next);
  },
}));
