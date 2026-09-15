import { create } from 'zustand';

// Access token lives ONLY here — in-memory JS state, never localStorage
// or sessionStorage. A hard refresh loses it by design; App.jsx redeems
// the httpOnly refresh cookie on load to silently re-establish it.
export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true, // true until the initial silent-refresh attempt resolves

  setSession: (accessToken, user) => set({ accessToken, user, isInitializing: false }),
  clearSession: () => set({ accessToken: null, user: null, isInitializing: false }),
  finishInitializing: () => set({ isInitializing: false }),
}));
