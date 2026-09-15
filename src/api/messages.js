import { apiFetch } from './client.js';

export function listMessages(chatId, before) {
  const query = before ? `?before=${before}` : '';
  return apiFetch(`/chats/${chatId}/messages${query}`);
}

export function sendMessage(chatId, { text, clientMessageId, replyToMessageId }) {
  return apiFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { content: { text }, clientMessageId, replyToMessageId },
  });
}

export function editMessage(messageId, text) {
  return apiFetch(`/messages/${messageId}`, { method: 'PATCH', body: { content: { text } } });
}

export function deleteMessage(messageId) {
  return apiFetch(`/messages/${messageId}`, { method: 'DELETE' });
}
