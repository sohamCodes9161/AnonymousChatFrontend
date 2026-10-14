import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleReaction } from '../../api/messages.js';
import { toast } from '../../stores/toastStore.js';

function patchMessage(queryClient, chatId, messageId, patchFn) {
  queryClient.setQueryData(['messages', chatId], (old) => {
    if (!old) return old;
    return {
      ...old,
      messages: old.messages.map((m) => (m.id === messageId ? patchFn(m) : m)),
    };
  });
}

// Pure helper — also used by the socket handler. Flips one emoji for
// the current user in an existing reactions array.
export function applyLocalToggle(reactions = [], emoji) {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, reactedByMe: true }];
  if (existing.reactedByMe) {
    const nextCount = existing.count - 1;
    return nextCount <= 0
      ? reactions.filter((r) => r.emoji !== emoji)
      : reactions.map((r) => (r.emoji === emoji ? { ...r, count: nextCount, reactedByMe: false } : r));
  }
  return reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r));
}

export function useToggleReaction(chatId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }) => toggleReaction(messageId, emoji),

    // Optimistic: the chip appears/disappears instantly; the server's
    // authoritative summary replaces it on success.
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      patchMessage(queryClient, chatId, messageId, (m) => ({
        ...m,
        reactions: applyLocalToggle(m.reactions, emoji),
      }));
    },

    onSuccess: (res, { messageId }) => {
      patchMessage(queryClient, chatId, messageId, (m) => ({ ...m, reactions: res.data.reactions }));
    },

    onError: () => {
      toast.error('Could not update reaction');
      // Roll back by refetching the true state rather than hand-reversing.
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });
}
