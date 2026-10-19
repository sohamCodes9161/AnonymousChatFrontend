import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../../api/messages.js';
import { useAuthStore } from '../../stores/authStore.js';

export function useSendMessage(chatId) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ text, type, content, clientMessageId, replyToMessageId }) =>
      sendMessage(chatId, { text, type, content, clientMessageId, replyToMessageId }),

    onMutate: async ({ text, type = 'text', content, clientMessageId, replyToMessageId }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

      const optimisticMessage = {
        id: clientMessageId, // temporary key — swapped for the real id in onSuccess
        // Lets the socket echo recognise this as OUR pending message.
        clientMessageId,
        chatId,
        senderId: user?.id,
        type,
        content: content ?? { text },
        status: 'sending',
        reactions: [],
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
        // The socket echo can beat this response. If it already put the
        // real message in the list, just drop our temp copy — mapping it
        // to the real message too is what produced the duplicate bubble.
        const alreadyThere = old.messages.some((m) => m.id === realMessage.id);
        return {
          ...old,
          messages: alreadyThere
            ? old.messages.filter((m) => m.id !== variables.clientMessageId)
            : old.messages.map((m) => (m.id === variables.clientMessageId ? realMessage : m)),
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
