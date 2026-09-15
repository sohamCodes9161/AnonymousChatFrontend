import { create } from 'zustand';

// Ephemeral, not server state — never goes in TanStack Query. A Set of
// currently-online friend user ids, updated live by socket events.
export const usePresenceStore = create((set) => ({
  onlineUserIds: new Set(),

  setOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),
}));
