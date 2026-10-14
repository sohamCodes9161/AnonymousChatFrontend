import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchMessages, listMessages } from '../../api/messages.js';

export const MIN_SEARCH_LENGTH = 2; // mirrors the backend, which returns [] below this

export function useMessageSearch(chatId, query) {
  return useQuery({
    queryKey: ['messageSearch', chatId, query],
    queryFn: () => searchMessages(chatId, query).then((res) => res.data.messages),
    enabled: Boolean(chatId) && query.length >= MIN_SEARCH_LENGTH,
    staleTime: 30_000,
  });
}

const MAX_PAGES_TO_LOAD = 20; // 20 x 50 = up to 1000 messages back

/**
 * Search can return a message far older than the page currently in the
 * cache. This pages backwards (using the same cursor the list endpoint
 * already exposes) and prepends each page, until the target message is
 * present or history runs out. Resolves true if the message is now in
 * the cache.
 */
export function useEnsureMessageLoaded(chatId) {
  const queryClient = useQueryClient();

  return async function ensureLoaded(messageId) {
    for (let i = 0; i < MAX_PAGES_TO_LOAD; i++) {
      const cache = queryClient.getQueryData(['messages', chatId]);
      if (!cache) return false;
      if (cache.messages.some((m) => m.id === messageId)) return true;
      if (!cache.hasMore || !cache.nextCursor) return false;

      const res = await listMessages(chatId, cache.nextCursor);
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        const known = new Set(old.messages.map((m) => m.id));
        const older = res.data.messages.filter((m) => !known.has(m.id));
        return {
          ...old,
          messages: [...older, ...old.messages],
          nextCursor: res.pagination?.nextCursor ?? null,
          hasMore: res.pagination?.hasMore ?? false,
        };
      });
    }
    return false;
  };
}
