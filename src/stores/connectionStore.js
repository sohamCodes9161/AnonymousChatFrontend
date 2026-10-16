import { create } from 'zustand';

// Whether OUR socket is currently connected. While it isn't, nothing we
// show about other people's presence can be trusted, so the UI says
// "Connecting…" instead of a possibly-stale Online/Offline.
export const useConnectionStore = create((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
