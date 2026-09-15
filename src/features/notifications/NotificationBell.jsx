import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadCount, useNotifications } from './useNotifications.js';
import { markAllNotificationsRead } from '../../api/notifications.js';

function describeNotification(n) {
  switch (n.type) {
    case 'friend_request_received':
      return 'You have a new friend request';
    case 'friend_request_accepted':
      return 'Your friend request was accepted';
    case 'group_member_added':
      return 'You were added to a group';
    case 'group_role_changed':
      return `Your role changed to ${n.payload.role}`;
    default:
      return n.type;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: count } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const queryClient = useQueryClient();

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-text-secondary hover:text-text-primary transition-colors duration-fast"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-status-error text-white text-[10px] rounded-pill w-4 h-4 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-72 bg-surface-elevated border border-border rounded-lg shadow-elevation-2 z-10 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase">Notifications</span>
            <button onClick={handleMarkAllRead} className="text-xs text-accent-primary hover:underline">
              Mark all read
            </button>
          </div>
          {notifications?.length ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2 text-sm border-b border-border last:border-0 ${
                  n.readAt ? 'text-text-muted' : 'text-text-primary'
                }`}
              >
                {describeNotification(n)}
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-text-muted text-center">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
}
