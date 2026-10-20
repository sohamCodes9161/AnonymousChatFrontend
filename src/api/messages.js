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

// Text messages pass `text`; other kinds (currently 'gif') pass
// `type` + `content` explicitly.
export function sendMessage(chatId, { text, type = 'text', content, clientMessageId, replyToMessageId }) {
  return apiFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { type, content: content ?? { text }, clientMessageId, replyToMessageId },
  });
}

// "Delete for me" — hides the messages from this user only.
export function deleteMessagesForMe(chatId, messageIds) {
  return apiFetch(`/chats/${chatId}/messages/delete-for-me`, { method: 'POST', body: { messageIds } });
}

export function editMessage(messageId, text) {
  return apiFetch(`/messages/${messageId}`, { method: 'PATCH', body: { content: { text } } });
}

export function deleteMessage(messageId) {
  return apiFetch(`/messages/${messageId}`, { method: 'DELETE' });
}

// Forward up to 20 messages from one chat into up to 5 others.
export function forwardMessages(chatId, messageIds, targetChatIds) {
  return apiFetch(`/chats/${chatId}/messages/forward`, {
    method: 'POST',
    body: { messageIds, targetChatIds },
  });
}
