import { apiFetch } from './client.js';

export function listChats() {
  return apiFetch('/chats');
}

export function createDirectChat(userId) {
  return apiFetch('/chats/direct', { method: 'POST', body: { userId } });
}

export function createGroupChat(name, memberIds) {
  return apiFetch('/chats/group', { method: 'POST', body: { name, memberIds } });
}

export function markRead(chatId, lastReadMessageId) {
  return apiFetch(`/chats/${chatId}/read`, { method: 'POST', body: { lastReadMessageId } });
}

export function muteChat(chatId, until) {
  return apiFetch(`/chats/${chatId}/mute`, { method: 'POST', body: { until } });
}

export function unmuteChat(chatId) {
  return apiFetch(`/chats/${chatId}/unmute`, { method: 'POST' });
}

export function archiveChat(chatId) {
  return apiFetch(`/chats/${chatId}/archive`, { method: 'POST' });
}

export function unarchiveChat(chatId) {
  return apiFetch(`/chats/${chatId}/unarchive`, { method: 'POST' });
}

export function pinChat(chatId) {
  return apiFetch(`/chats/${chatId}/pin`, { method: 'POST' });
}

export function unpinChat(chatId) {
  return apiFetch(`/chats/${chatId}/unpin`, { method: 'POST' });
}

export function clearChat(chatId) {
  return apiFetch(`/chats/${chatId}/clear`, { method: 'POST' });
}
