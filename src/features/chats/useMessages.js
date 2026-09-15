import { useQuery } from '@tanstack/react-query';
import { listMessages } from '../../api/messages.js';

export function useMessages(chatId) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () =>
      listMessages(chatId).then((res) => ({
        messages: res.data.messages,
        nextCursor: res.pagination?.nextCursor ?? null,
        hasMore: res.pagination?.hasMore ?? false,
      })),
    enabled: Boolean(chatId),
  });
}
