import { useEffect, useRef } from 'react';

export function MentionPicker({ candidates, activeIndex, onPick }) {
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Mention a member"
      className="absolute bottom-full left-2 right-2 md:left-3 md:right-auto md:w-72 mb-1 max-h-52 overflow-y-auto bg-surface-elevated border border-border rounded-lg shadow-elevation-2 py-1 z-20 animate-slide-up-in"
    >
      {candidates.map((c, i) => (
        <button
          key={c.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          // mousedown (not click) so the textarea keeps focus and caret
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(c);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left ${
            i === activeIndex ? 'bg-surface-secondary' : 'hover:bg-surfaceHover'
          }`}
        >
          <div className="w-7 h-7 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-[11px] font-semibold overflow-hidden flex-shrink-0">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (c.displayName || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm text-text-primary truncate">{c.displayName}</div>
            <div className="text-xs text-text-muted truncate">@{c.username}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
