import { useTypingStore } from '../../stores/typingStore.js';

// Shown in the message list as a small incoming bubble with three bouncing
// dots (iMessage-style). In groups it names who is typing and shows their
// avatar so it's clear whose bubble it is.
export function TypingIndicator({ chatId, isGroup = false, resolveName, resolveAvatar }) {
  const typingUserIds = useTypingStore((s) => s.typingByChatId.get(chatId));

  if (!typingUserIds || typingUserIds.size === 0) return null;

  const ids = [...typingUserIds];
  const names = ids.map((id) => resolveName?.(id)).filter(Boolean);
  const label =
    names.length === 0
      ? 'Someone is typing'
      : names.length === 1
        ? `${names[0]} is typing`
        : names.length === 2
          ? `${names[0]} and ${names[1]} are typing`
          : `${names[0]} and ${names.length - 1} others are typing`;

  const avatar = resolveAvatar?.(ids[0]);
  const initial = (names[0] || '?').charAt(0).toUpperCase();

  return (
    <div className="flex items-end gap-2 px-3 md:px-4 pb-2 animate-message-in" role="status" aria-live="polite">
      {isGroup && (
        <div className="w-6 h-6 rounded-pill bg-surface-secondary overflow-hidden flex items-center justify-center text-[10px] font-semibold text-text-secondary flex-shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initial}
        </div>
      )}
      <div className="bubble-received rounded-[20px] rounded-bl-[6px] px-4 py-3 flex items-center gap-1" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      {isGroup ? <span className="text-xs text-text-muted pb-1">{label}</span> : <span className="sr-only">{label}</span>}
    </div>
  );
}
