import { apiFetch, apiUpload } from './client.js';

export function getChat(chatId) {
  return apiFetch(`/chats/${chatId}`);
}

export function listMembers(chatId) {
  return apiFetch(`/chats/${chatId}/members`);
}

export function addGroupMember(chatId, userId) {
  return apiFetch(`/chats/${chatId}/members`, { method: 'POST', body: { userId } });
}

export function removeMember(chatId, userId) {
  return apiFetch(`/chats/${chatId}/members/${userId}`, { method: 'DELETE' });
}

export function promoteToAdmin(chatId, userId) {
  return apiFetch(`/chats/${chatId}/members/${userId}/promote`, { method: 'POST' });
}

export function demoteAdmin(chatId, userId) {
  return apiFetch(`/chats/${chatId}/members/${userId}/demote`, { method: 'POST' });
}

export function updateGroupInfo(chatId, payload) {
  return apiFetch(`/chats/${chatId}`, { method: 'PATCH', body: payload });
}

export function deleteGroupChat(chatId) {
  return apiFetch(`/chats/${chatId}`, { method: 'DELETE' });
}

export function leaveGroupChat(chatId) {
  return apiFetch(`/chats/${chatId}/leave`, { method: 'POST' });
}

export function uploadGroupAvatar(chatId, file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiUpload(`/chats/${chatId}/avatar`, formData);
}
