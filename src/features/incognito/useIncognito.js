import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIncognitoStatus, startIncognito, endIncognito } from '../../api/incognito.js';

export function useIncognitoStatus(chatId) {
  return useQuery({
    queryKey: ['incognitoStatus', chatId],
    queryFn: () => getIncognitoStatus(chatId).then((res) => res.data.session),
    enabled: Boolean(chatId),
  });
}

export function useStartIncognito(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startIncognito(chatId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incognitoStatus', chatId] }),
  });
}

export function useEndIncognito(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => endIncognito(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incognitoStatus', chatId] });
      // Messages were hard-deleted server-side — the cached list must
      // be refetched, not just left stale, or deleted messages would
      // keep showing until an unrelated cache update happened to occur.
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });
}
