import { X, CornerUpLeft, Pencil, Copy, Trash2 } from 'lucide-react';

// Must mirror the backend's ALLOWED_EMOJIS (reactions.service.js) — the
// server rejects anything else.
const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

function BarButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-pill flex items-center justify-center text-white hover:bg-white/15 active:bg-white/25 transition-colors duration-fast disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/**
 * Replaces the chat header while messages are selected (WhatsApp style).
 * `selectedMessages` are in chat order. Reply and Edit only make sense
 * for exactly one message (Edit: yours, and text); the reaction dock
 * likewise only appears for a single selection.
 */
export function SelectionBar({ selectedMessages, currentUserId, onClose, onReply, onEdit, onCopy, onDelete, onReact }) {
  const count = selectedMessages.length;
  const single = count === 1 ? selectedMessages[0] : null;
  const canEdit = Boolean(single && single.senderId === currentUserId && single.type === 'text');
  const canCopy = selectedMessages.some((m) => (m.type === 'text' ? m.content?.text : m.content?.caption));
  const reactedByMe = new Set((single?.reactions || []).filter((r) => r.reactedByMe).map((r) => r.emoji));

  return (
    <div className="relative flex-shrink-0 z-20">
      <div className="min-h-[52px] py-1.5 px-2 md:px-4 flex items-center gap-1 bg-accent-primary text-white animate-fade-in">
        <BarButton label="Clear selection" onClick={onClose}>
          <X size={20} />
        </BarButton>
        <span className="flex-1 min-w-0 ml-1 text-base font-semibold truncate" aria-live="polite">
          {count} Selected
        </span>
        <BarButton label="Reply" onClick={onReply} disabled={count !== 1}>
          <CornerUpLeft size={19} />
        </BarButton>
        <BarButton label="Edit" onClick={onEdit} disabled={!canEdit}>
          <Pencil size={18} />
        </BarButton>
        <BarButton label="Copy" onClick={onCopy} disabled={!canCopy}>
          <Copy size={18} />
        </BarButton>
        <BarButton label="Delete" onClick={onDelete}>
          <Trash2 size={19} />
        </BarButton>
      </div>

      {single && (
        <div
          role="group"
          aria-label="React to message"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-surface-elevated border border-border shadow-elevation-2 animate-slide-up-in"
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              aria-label={`React with ${emoji}`}
              aria-pressed={reactedByMe.has(emoji)}
              className={`w-9 h-9 rounded-pill text-xl flex items-center justify-center hover:scale-125 active:scale-95 transition-transform duration-fast ${
                reactedByMe.has(emoji) ? 'bg-accentSubtle' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
