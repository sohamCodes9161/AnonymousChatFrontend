import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editMessage, deleteMessage } from '../../api/messages.js';

export function useEditMessage(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }) => editMessage(messageId, text),
    onSuccess: (res) => {
      const updated = res.data.message;
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          // Response omits reactions — keep the cached ones.
          messages: old.messages.map((m) =>
            m.id === updated.id ? { ...updated, reactions: m.reactions || [] } : m
          ),
        };
      });
    },
  });
}

export function useDeleteMessage(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => deleteMessage(messageId),
    onSuccess: (res) => {
      const updated = res.data.message;
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return { ...old, messages: old.messages.map((m) => (m.id === updated.id ? updated : m)) };
      });
    },
  });
}
