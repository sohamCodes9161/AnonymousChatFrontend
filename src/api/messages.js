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
export function sendMessage(chatId, { text, type = 'text', content, clientMessageId, replyToMessageId, mentions }) {
  return apiFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { type, content: content ?? { text }, clientMessageId, replyToMessageId, mentions },
  });
}

// "Delete for me" — hides the messages from this user only.
export function deleteMessagesForMe(chatId, messageIds) {
  return apiFetch(`/chats/${chatId}/messages/delete-for-me`, { method: 'POST', body: { messageIds } });
}

export function editMessage(messageId, text, mentions) {
  return apiFetch(`/messages/${messageId}`, { method: 'PATCH', body: { content: { text }, mentions } });
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

// Search every chat the user is in (distinct from per-chat searchMessages).
export function searchAllMessages(q) {
  return apiFetch(`/chats/search/messages?q=${encodeURIComponent(q)}`);
}

// Field name 'audio' must match the backend's multer .single('audio').
export function sendVoiceMessage(chatId, blob, duration, filename) {
  const formData = new FormData();
  formData.append('audio', blob, filename);
  formData.append('duration', String(Math.round(duration)));
  return apiUpload(`/chats/${chatId}/messages/voice`, formData);
}
