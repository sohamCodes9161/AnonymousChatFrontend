import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useMessageSearch, MIN_SEARCH_LENGTH } from './useMessageSearch.js';
import { messagePreviewText } from '../../utils/messagePreview.js';

function HighlightedText({ text, query }) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts = [];
  let cursor = 0;
  let idx = lower.indexOf(needle, cursor);
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark key={idx} className="bg-accentSubtle text-accent-primary rounded-sm px-0.5">
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    cursor = idx + needle.length;
    idx = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

// Long messages are trimmed to a window around the first match so the
// highlighted part is actually visible in a one-line snippet.
function snippetAround(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx <= 40) return text;
  return `…${text.slice(idx - 30)}`;
}

function formatResultTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChatSearchBar({ chatId, resolveSenderName, onSelect, onClose }) {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showResults, setShowResults] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: results, isFetching } = useMessageSearch(chatId, debounced);
  const tooShort = debounced.length < MIN_SEARCH_LENGTH;

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
  }

  function handleSelect(message) {
    setShowResults(false); // frees the screen on mobile; reopens on next keystroke
    onSelect(message);
  }

  return (
    <div className="border-b border-border bg-surface-elevated animate-slide-up-in flex-shrink-0">
      <div className="flex items-center gap-2 px-3 md:px-4 py-2">
        <Search size={16} className="text-text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search in this conversation"
          className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none"
        />
        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary transition-colors duration-fast"
          aria-label="Close search"
        >
          <X size={16} />
        </button>
      </div>

      {showResults && !tooShort && (
        <div className="max-h-56 overflow-y-auto border-t border-border">
          {isFetching && !results ? (
            <div className="px-4 py-3 text-xs text-text-muted">Searching…</div>
          ) : results?.length ? (
            results.map((m) => {
              const text = snippetAround(messagePreviewText(m), debounced);
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="w-full text-left px-4 py-2 hover:bg-surfaceHover transition-colors duration-fast border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary truncate">
                      {resolveSenderName(m.senderId)}
                    </span>
                    <span className="flex-shrink-0">{formatResultTime(m.createdAt)}</span>
                  </div>
                  <div className="text-sm text-text-primary truncate">
                    <HighlightedText text={text} query={debounced} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-xs text-text-muted">No messages match “{debounced}”.</div>
          )}
        </div>
      )}
    </div>
  );
}
