import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendVoiceMessage } from '../../api/messages.js';
import { useAuthStore } from '../../stores/authStore.js';
import { toast } from '../../stores/toastStore.js';

export function useSendVoice(chatId) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ blob, duration, filename }) => sendVoiceMessage(chatId, blob, duration, filename),

    // Optimistic bubble shows the local file immediately via an object
    // URL, so the sender never stares at an empty gap while the upload
    // runs. The URL is revoked once the real Cloudinary URL replaces it.
    onMutate: async ({ duration, tempId, localUrl, mimeType }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      const optimistic = {
        id: tempId,
        chatId,
        senderId: user?.id,
        type: 'voice',
        content: { audioUrl: localUrl, duration: Math.round(duration), mimeType },
        status: 'sending',
        replyToMessageId: null,
        reactions: [],
        createdAt: new Date().toISOString(),
        editedAt: null,
      };
      queryClient.setQueryData(['messages', chatId], (old) =>
        old ? { ...old, messages: [...old.messages, optimistic] } : old
      );
    },

    onSuccess: (res, { tempId, localUrl }) => {
      const real = res.data.message;
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        // The message:new socket echo can land before this response —
        // if the real id is already present, just drop the temp entry
        // rather than ending up with a duplicate.
        const alreadyThere = old.messages.some((m) => m.id === real.id);
        return {
          ...old,
          messages: alreadyThere
            ? old.messages.filter((m) => m.id !== tempId)
            : old.messages.map((m) => (m.id === tempId ? real : m)),
        };
      });
      URL.revokeObjectURL(localUrl);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },

    onError: (err, { tempId, localUrl }) => {
      // Failed bubbles are dropped —
      // a recording can't be retried from the bubble since the
      // blob isn't kept on the message.
      queryClient.setQueryData(['messages', chatId], (old) =>
        old ? { ...old, messages: old.messages.filter((m) => m.id !== tempId) } : old
      );
      URL.revokeObjectURL(localUrl);
      toast.error(err?.message || 'Could not send voice note');
    },
  });
}
