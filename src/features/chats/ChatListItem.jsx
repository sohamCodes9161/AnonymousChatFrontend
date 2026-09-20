import { NavLink } from 'react-router-dom';
import { BellOff, Pin } from 'lucide-react';
import { usePresenceStore } from '../../stores/presenceStore.js';
import { useAuthStore } from '../../stores/authStore.js';

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
  const isOnline = usePresenceStore((s) =>
    chat.otherParticipant ? s.onlineUserIds.has(chat.otherParticipant.id) : false
  );

  const title = chat.type === 'direct' ? chat.otherParticipant?.displayName || 'Unknown' : chat.name;
  const avatarUrl = chat.type === 'direct' ? chat.otherParticipant?.avatarUrl : chat.avatarUrl;
  const initial = (title || '?').charAt(0).toUpperCase();
  const isMuted = chat.membership?.mutedUntil && new Date(chat.membership.mutedUntil) > new Date();

  const previewText =
    chat.type === 'group' && chat.lastMessagePreview
      ? `${
          chat.lastMessageSenderId === currentUserId ? 'You' : chat.lastMessageSenderName || 'Someone'
        }: ${chat.lastMessagePreview}`
      : chat.lastMessagePreview || 'No messages yet';

  return (
    <NavLink
      to={`/chats/${chat._id}`}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-fast ${
          isActive ? 'bg-surface-secondary' : 'hover:bg-surfaceHover'
        }`
      }
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-pill bg-accentSubtle text-accent-primary flex items-center justify-center font-semibold text-sm overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {chat.type === 'direct' && isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-pill bg-status-success border-2 border-surface-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary truncate">{title}</span>
          {chat.membership?.pinnedAt && <Pin size={11} className="text-accent-primary flex-shrink-0" />}
          {isMuted && <BellOff size={12} className="text-text-muted flex-shrink-0" />}
        </div>
        <div className="text-xs text-text-muted truncate">{previewText}</div>
      </div>
      <span className="text-xs text-text-muted flex-shrink-0">
        {formatRelativeTime(chat.lastActivity)}
      </span>
    </NavLink>
  );
}
