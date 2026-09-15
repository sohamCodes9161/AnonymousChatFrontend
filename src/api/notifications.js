import { apiFetch } from './client.js';

export function listNotifications() {
  return apiFetch('/notifications');
}

export function getUnreadCount() {
  return apiFetch('/notifications/unread-count');
}

export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'POST' });
}
