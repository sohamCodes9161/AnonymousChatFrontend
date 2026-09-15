import { apiFetch } from './client.js';

export function getIncognitoStatus(chatId) {
  return apiFetch(`/chats/${chatId}/incognito`);
}

export function startIncognito(chatId) {
  return apiFetch(`/chats/${chatId}/incognito/start`, { method: 'POST' });
}

export function endIncognito(chatId) {
  return apiFetch(`/chats/${chatId}/incognito/end`, { method: 'POST' });
}
