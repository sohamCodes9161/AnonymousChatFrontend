import { create } from 'zustand';

// `connected`: whether OUR socket is currently connected. While it isn't,
// nothing we show about other people's presence can be trusted, so the UI
// says "Connecting…" instead of a possibly-stale Online/Offline.
// `socketInstance`: kept in the store so React re-runs the listener
// effect when the socket is (re)created after login.
export const useConnectionStore = create((set) => ({
  connected: false,
  socketInstance: null,
  setConnected: (connected) => set({ connected }),
  setSocketInstance: (socketInstance) => set({ socketInstance }),
}));
