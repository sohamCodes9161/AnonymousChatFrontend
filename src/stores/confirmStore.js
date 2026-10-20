import { create } from 'zustand';

// Promise-based replacement for window.confirm:
//   if (await confirm({ title, message, confirmLabel, danger })) { ... }
// One dialog at a time; opening a second resolves the first as "cancelled".
export const useConfirmStore = create((set, get) => ({
  request: null,
  open: (options) =>
    new Promise((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...options, resolve } });
    }),
  settle: (result) => {
    const req = get().request;
    if (!req) return;
    set({ request: null });
    req.resolve(result);
  },
}));

export function confirm(options) {
  return useConfirmStore.getState().open(options);
}
