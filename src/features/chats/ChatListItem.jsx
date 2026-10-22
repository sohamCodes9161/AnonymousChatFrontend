import { NavLink, useParams } from 'react-router-dom';
import { BellOff, Pin } from 'lucide-react';
import { usePresenceStore } from '../../stores/presenceStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useTypingStore } from '../../stores/typingStore.js';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChatListItem({ chat }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { chatId: activeChatId } = useParams();
  const isActive = activeChatId === chat._id;
  const isOnline = usePresenceStore((s) =>
    chat.otherParticipant ? s.onlineUserIds.has(chat.otherParticipant.id) : false
  );
  const someoneTyping = useTypingStore((s) => (s.typingByChatId.get(chat._id)?.size ?? 0) > 0);

  const title = chat.type === 'direct' ? chat.otherParticipant?.displayName || 'Unknown' : chat.name;
  const avatarUrl = chat.type === 'direct' ? chat.otherParticipant?.avatarUrl : chat.avatarUrl;
  const initial = (title || '?').charAt(0).toUpperCase();
  const isMuted = chat.membership?.mutedUntil && new Date(chat.membership.mutedUntil) > new Date();
  const unread = isActive ? 0 : chat.unreadCount || 0;
  const hasUnread = unread > 0;

  const previewText =
    chat.type === 'group' && chat.lastMessagePreview
      ? `${
          chat.lastMessageSenderId === currentUserId ? 'You' : chat.lastMessageSenderName || 'Someone'
        }: ${chat.lastMessagePreview}`
      : chat.lastMessagePreview || 'No messages yet';

  return (
    <NavLink
      to={`/chats/${chat._id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-fast ${
        isActive ? 'bg-accentSubtle' : 'hover:bg-surfaceHover'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center font-semibold text-base overflow-hidden">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
        </div>
        {chat.type === 'direct' && isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-pill bg-status-success border-2 border-surface-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[15px] truncate text-text-primary ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
            {title}
          </span>
          {chat.membership?.pinnedAt && <Pin size={11} className="text-text-muted flex-shrink-0" />}
          {isMuted && <BellOff size={12} className="text-text-muted flex-shrink-0" />}
        </div>
        <div
          className={`text-[13px] truncate ${
            someoneTyping ? 'text-accent-primary font-medium' : hasUnread ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {someoneTyping ? 'typing…' : previewText}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 self-start pt-0.5">
        <span className={`text-[11px] ${hasUnread && !isMuted ? 'text-accent-primary font-semibold' : 'text-text-muted'}`}>
          {formatRelativeTime(chat.lastActivity)}
        </span>
        {hasUnread && (
          <span
            className={`min-w-[20px] h-5 px-1.5 rounded-pill text-[11px] font-semibold flex items-center justify-center ${
              isMuted ? 'bg-surface-secondary text-text-secondary' : 'bg-accent-primary text-white'
            }`}
            aria-label={`${unread} unread`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    </NavLink>
  );
}
