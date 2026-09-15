import { useMutation, useQueryClient } from '@tanstack/react-query';
import { muteChat, unmuteChat, archiveChat, unarchiveChat } from '../../api/chats.js';
import { toast } from '../../stores/toastStore.js';

function useInvalidateChats() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['chats'] });
}

export function useMuteChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: ({ chatId, until }) => muteChat(chatId, until),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation muted');
    },
    onError: () => toast.error('Failed to mute conversation'),
  });
}

export function useUnmuteChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: (chatId) => unmuteChat(chatId),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation unmuted');
    },
    onError: () => toast.error('Failed to unmute conversation'),
  });
}

export function useArchiveChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: (chatId) => archiveChat(chatId),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation archived');
    },
    onError: () => toast.error('Failed to archive conversation'),
  });
}

export function useUnarchiveChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: (chatId) => unarchiveChat(chatId),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation unarchived');
    },
    onError: () => toast.error('Failed to unarchive conversation'),
  });
}
