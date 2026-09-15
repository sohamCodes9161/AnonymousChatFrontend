import { useQuery } from '@tanstack/react-query';
import { getChat, listMembers } from '../../api/groups.js';

export function useChat(chatId) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChat(chatId).then((res) => res.data.chat),
    enabled: Boolean(chatId),
  });
}

export function useGroupMembers(chatId, options = {}) {
  return useQuery({
    queryKey: ['groupMembers', chatId],
    queryFn: () => listMembers(chatId).then((res) => res.data.members),
    enabled: Boolean(chatId) && (options.enabled ?? true),
  });
}
