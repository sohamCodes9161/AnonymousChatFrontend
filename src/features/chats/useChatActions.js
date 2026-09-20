import { useMutation, useQueryClient } from '@tanstack/react-query';
import { muteChat, unmuteChat, archiveChat, unarchiveChat, pinChat, unpinChat, clearChat } from '../../api/chats.js';
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

export function usePinChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: (chatId) => pinChat(chatId),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation pinned');
    },
    onError: () => toast.error('Failed to pin conversation'),
  });
}

export function useUnpinChat() {
  const invalidate = useInvalidateChats();
  return useMutation({
    mutationFn: (chatId) => unpinChat(chatId),
    onSuccess: () => {
      invalidate();
      toast.success('Conversation unpinned');
    },
    onError: () => toast.error('Failed to unpin conversation'),
  });
}

export function useClearChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId) => clearChat(chatId),
    onSuccess: (_res, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      toast.success('Chat cleared');
    },
    onError: () => toast.error('Failed to clear chat'),
  });
}
