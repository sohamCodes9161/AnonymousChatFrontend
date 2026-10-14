import { apiFetch, apiUpload } from './client.js';

export function toggleReaction(messageId, emoji) {
  return apiFetch(`/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } });
}

export function searchMessages(chatId, q) {
  return apiFetch(`/chats/${chatId}/messages/search?q=${encodeURIComponent(q)}`);
}

// Field name 'image' must match the backend's multer .single('image').
export function sendImageMessage(chatId, file, caption) {
  const formData = new FormData();
  formData.append('image', file);
  if (caption) formData.append('caption', caption);
  return apiUpload(`/chats/${chatId}/messages/image`, formData);
}

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
