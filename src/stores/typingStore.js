import { create } from 'zustand';

// Ephemeral — Map<chatId, Set<userId>>. The server already handles the
// TTL auto-expiry (Real-Time System design); this store just reflects
// whatever start/stop events arrive, no client-side timer needed.
export const useTypingStore = create((set) => ({
  typingByChatId: new Map(),

  setTyping: (chatId, userId) =>
    set((state) => {
      const next = new Map(state.typingByChatId);
      const current = new Set(next.get(chatId) || []);
      current.add(userId);
      next.set(chatId, current);
      return { typingByChatId: next };
    }),

  clearTyping: (chatId, userId) =>
    set((state) => {
      const next = new Map(state.typingByChatId);
      const current = new Set(next.get(chatId) || []);
      current.delete(userId);
      next.set(chatId, current);
      return { typingByChatId: next };
    }),
}));
