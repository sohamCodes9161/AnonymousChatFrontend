// One place that knows how to describe a message as a short line of
// text — used by reply quotes, the reply composer bar, and search
// results, so an image message never shows up as "[deleted]" or blank
// just because it has no content.text.
export function messagePreviewText(message) {
  if (!message) return 'Original message';
  if (message.status === 'deleted') return '[deleted]';
  if (message.type === 'image') return message.content?.caption ? `📷 ${message.content.caption}` : '📷 Photo';
  return message.content?.text || '';
}
