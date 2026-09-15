import { useTypingStore } from '../../stores/typingStore.js';

export function TypingIndicator({ chatId }) {
  const typingUserIds = useTypingStore((s) => s.typingByChatId.get(chatId));

  if (!typingUserIds || typingUserIds.size === 0) return null;

  return (
    <div className="px-4 py-1 text-xs text-text-muted italic flex items-center gap-1.5">
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-pill bg-text-muted animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-pill bg-text-muted animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-pill bg-text-muted animate-bounce" />
      </span>
      typing…
    </div>
  );
}
