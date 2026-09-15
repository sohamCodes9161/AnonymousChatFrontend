import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../../api/messages.js';
import { useAuthStore } from '../../stores/authStore.js';

export function useSendMessage(chatId) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ text, clientMessageId, replyToMessageId }) =>
      sendMessage(chatId, { text, clientMessageId, replyToMessageId }),

    onMutate: async ({ text, clientMessageId, replyToMessageId }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

      const optimisticMessage = {
        id: clientMessageId, // temporary key — swapped for the real id in onSuccess
        chatId,
        senderId: user?.id,
        type: 'text',
        content: { text },
        status: 'sending',
        replyToMessageId: replyToMessageId || null,
        createdAt: new Date().toISOString(),
        editedAt: null,
      };

      queryClient.setQueryData(['messages', chatId], (old) =>
        old ? { ...old, messages: [...old.messages, optimisticMessage] } : old
      );
    },

    onSuccess: (res, variables) => {
      const realMessage = res.data.message;
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          // Replaces the temp-id entry with the real one. If the
          // message:new socket echo arrives after this (same real id),
          // the socket handler's own exists-check treats it as a
          // harmless no-op update, not a duplicate.
          messages: old.messages.map((m) =>
            m.id === variables.clientMessageId ? realMessage : m
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['chats'] }); // refresh preview/ordering
    },

    onError: (_err, variables) => {
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === variables.clientMessageId ? { ...m, status: 'failed' } : m
          ),
        };
      });
    },
  });
}
