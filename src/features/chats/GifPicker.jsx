import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useGifSearch } from './useGifSearch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_RATIOS = [1.1, 0.8, 0.95, 1.3, 0.75, 1];

// Two-column masonry: each GIF goes into whichever column is currently
// shorter, so mixed aspect ratios pack without big gaps.
function splitColumns(items) {
  const cols = [[], []];
  const heights = [0, 0];
  for (const gif of items) {
    const i = heights[0] <= heights[1] ? 0 : 1;
    cols[i].push(gif);
    heights[i] += gif.gridHeight / gif.gridWidth;
  }
  return cols;
}

function GifTile({ gif, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(gif)}
      className="relative block w-full overflow-hidden rounded-md bg-surface-secondary shimmer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary hover:brightness-110 active:scale-95 transition-all duration-fast"
      style={{ aspectRatio: `${gif.gridWidth} / ${gif.gridHeight}` }}
      aria-label={gif.title ? `Send GIF: ${gif.title}` : 'Send GIF'}
    >
      <img
        src={gif.gridUrl}
        alt={gif.title || 'GIF'}
        loading="lazy"
        decoding="async"
        // Don't tell GIPHY which page/app this was loaded from.
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </button>
  );
}

export function GifPicker({ onSelect, onClose, isIncognito = false }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage, isPlaceholderData } =
    useGifSearch(debouncedQuery);

  const items = useMemo(() => {
    const seen = new Set();
    return (data?.pages || [])
      .flatMap((p) => p.items)
      .filter((g) => (seen.has(g.id) ? false : seen.add(g.id)));
  }, [data]);
  const columns = useMemo(() => splitColumns(items), [items]);

  // Close on Escape / outside click. The toggle button is excluded so a
  // click on it toggles (closes) instead of close-then-reopen.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function onPointerDown(e) {
      if (e.target.closest?.('[data-gif-picker], [data-gif-toggle]')) return;
      onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [onClose]);

  // New search → back to the top of the results.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedQuery]);

  // Infinite scroll: load the next page when the sentinel nears view.
  // Re-created after each page so a still-visible sentinel fires again.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage || isPlaceholderData) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { root: scrollRef.current, rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage, items.length]);

  const trimmed = debouncedQuery.trim();
  const showSkeleton = isLoading;
  const showEmpty = !isLoading && !isError && items.length === 0;

  return (
    <div
      ref={rootRef}
      data-gif-picker
      role="dialog"
      aria-label="Choose a GIF"
      className="absolute z-30 bottom-full inset-x-0 md:inset-x-auto md:left-3 md:mb-2 md:w-[380px] h-[60vh] max-h-[460px] flex flex-col bg-surface-elevated border border-border rounded-t-xl md:rounded-lg shadow-elevation-2 animate-slide-up-in"
    >
      <div className="flex items-center gap-2 p-2.5 border-b border-border">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Auto-focus only where there's a physical keyboard — on phones
            // it would pop the keyboard over the grid before they've looked.
            autoFocus={typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches}
            enterKeyHint="search"
            placeholder="Search GIFs"
            aria-label="Search GIFs"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close GIF picker"
          className="flex-shrink-0 w-8 h-8 rounded-pill text-text-muted hover:text-text-primary hover:bg-surfaceHover flex items-center justify-center transition-colors duration-fast"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 overscroll-contain">
        <div className="px-1 pb-1.5 text-xs font-semibold text-text-muted">
          {trimmed ? `Results for “${trimmed}”` : 'Trending'}
        </div>

        {showSkeleton && (
          <div className="grid grid-cols-2 gap-1.5">
            {SKELETON_RATIOS.map((r, i) => (
              <div key={i} className="shimmer rounded-md" style={{ aspectRatio: `1 / ${r}` }} />
            ))}
          </div>
        )}

        {isError && !items.length && (
          <div className="py-10 text-center text-sm text-text-secondary">
            <p className="mb-3">{error?.message || 'Something went wrong.'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-surfaceHover transition-colors duration-fast"
            >
              Try again
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="py-10 text-center text-sm text-text-muted">
            No GIFs found{trimmed ? ` for “${trimmed}”` : ''}.
          </div>
        )}

        {items.length > 0 && (
          <div className={`flex gap-1.5 transition-opacity duration-fast ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {columns.map((col, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col gap-1.5">
                {col.map((gif) => (
                  <GifTile key={gif.id} gif={gif} onSelect={onSelect} />
                ))}
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
        {isFetchingNextPage && <div className="py-3 text-center text-xs text-text-muted">Loading more…</div>}
        {isError && items.length > 0 && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            className="block mx-auto my-3 text-xs text-accent-primary hover:underline"
          >
            Couldn’t load more — retry
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border flex flex-col gap-1">
        {isIncognito && (
          <p className="text-[11px] leading-snug text-message-incognito">
            GIFs load from GIPHY, which can see your IP address — even in Incognito.
          </p>
        )}
        <a
          href="https://giphy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="self-end inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-text-muted hover:text-text-primary transition-colors duration-fast"
        >
          Powered by <span className="px-1.5 py-0.5 rounded bg-black text-white">GIPHY</span>
        </a>
      </div>
    </div>
  );
}
