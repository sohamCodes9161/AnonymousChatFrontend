import { create } from 'zustand';

// Ephemeral UI state — never server data, never TanStack Query.
let nextId = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, variant = 'info') => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Plain function API — usable from anywhere (mutation onError handlers,
// event listeners) without needing to be inside a component that calls
// the hook itself.
export const toast = {
  success: (message) => useToastStore.getState().addToast(message, 'success'),
  error: (message) => useToastStore.getState().addToast(message, 'error'),
  info: (message) => useToastStore.getState().addToast(message, 'info'),
};
