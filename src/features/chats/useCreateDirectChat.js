import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDirectChat } from '../../api/chats.js';

export function useCreateDirectChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDirectChat,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chats'] }),
  });
}
