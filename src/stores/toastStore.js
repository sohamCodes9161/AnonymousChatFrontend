import { create } from 'zustand';

// Ephemeral UI state — never server data, never TanStack Query.
let nextId = 0;
const MAX_TOASTS = 4;
const DEFAULT_MS = 3500;
const RICH_MS = 6000;

export const useToastStore = create((set, get) => ({
  toasts: [],
  add: (toast) => {
    const id = nextId++;
    const duration = toast.duration ?? (toast.rich ? RICH_MS : DEFAULT_MS);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id, duration }].slice(-MAX_TOASTS) }));
    setTimeout(() => get().removeToast(id), duration);
    return id;
  },
  addToast: (message, variant = 'info') => get().add({ message, variant }),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Plain function API — usable from anywhere (mutation onError handlers,
// event listeners) without needing to be inside a component that calls
// the hook itself.
export const toast = {
  success: (message) => useToastStore.getState().addToast(message, 'success'),
  error: (message) => useToastStore.getState().addToast(message, 'error'),
  info: (message) => useToastStore.getState().addToast(message, 'info'),
  // Rich banner (new message, friend request, …): avatar or icon, title,
  // body, and an optional chat to open on click.
  notify: ({ title, body, avatarUrl, initial, kind = 'message', chatId, messageId }) =>
    useToastStore.getState().add({ rich: true, title, body, avatarUrl, initial, kind, chatId, messageId }),
};
