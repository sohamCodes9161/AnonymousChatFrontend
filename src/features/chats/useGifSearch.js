import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchGifs, isGiphyConfigured } from '../../api/giphy.js';

// Empty query = trending. Pages accumulate for infinite scroll; the
// previous results stay on screen while a new search loads so the grid
// doesn't flash empty on every keystroke-pause.
export function useGifSearch(query) {
  const q = query.trim();
  return useInfiniteQuery({
    queryKey: ['gifs', q],
    queryFn: ({ pageParam, signal }) => fetchGifs({ query: q, offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: isGiphyConfigured,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
