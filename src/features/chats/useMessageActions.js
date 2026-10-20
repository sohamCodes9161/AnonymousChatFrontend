import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editMessage, deleteMessage, deleteMessagesForMe } from '../../api/messages.js';

export function useEditMessage(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text, mentions }) => editMessage(messageId, text, mentions),
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

export function useDeleteForMe(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageIds) => deleteMessagesForMe(chatId, messageIds),
    onSuccess: (_res, messageIds) => {
      const hidden = new Set(messageIds);
      queryClient.setQueryData(['messages', chatId], (old) =>
        old ? { ...old, messages: old.messages.filter((m) => !hidden.has(m.id)) } : old
      );
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
