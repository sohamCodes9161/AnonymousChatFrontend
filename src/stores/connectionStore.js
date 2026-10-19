import { create } from 'zustand';

export const useConnectionStore = create((set) => ({
  connected: false,
  socketInstance: null, // React will track this
  setConnected: (connected) => set({ connected }),
  setSocketInstance: (socketInstance) => set({ socketInstance }),
}));