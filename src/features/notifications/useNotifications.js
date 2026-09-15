import { useQuery } from '@tanstack/react-query';
import { listNotifications, getUnreadCount } from '../../api/notifications.js';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications().then((res) => res.data.notifications),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getUnreadCount().then((res) => res.data.count),
    refetchInterval: 30_000, // light polling fallback; sockets keep it fresh live
  });
}
