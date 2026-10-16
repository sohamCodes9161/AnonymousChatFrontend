import { useState } from 'react';
import { Pencil, Trash2, Check, X, CornerUpLeft, CheckCheck, SmilePlus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useEditMessage, useDeleteMessage } from './useMessageActions.js';
import { useToggleReaction } from './useReactions.js';
import { ImageLightbox } from '../../components/ImageLightbox.jsx';

// Must mirror the backend's ALLOWED_EMOJIS (reactions.service.js) — the
// server rejects anything else.
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const PARTICIPANT_COLOR_CLASSES = [
  'text-participant-1',
  'text-participant-2',
  'text-participant-3',
  'text-participant-4',
  'text-participant-5',
  'text-participant-6',
];

function getParticipantColorClass(userId) {
  if (!userId) return PARTICIPANT_COLOR_CLASSES[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i)) % PARTICIPANT_COLOR_CLASSES.length;
  }
  return PARTICIPANT_COLOR_CLASSES[hash];
}

const SYSTEM_MESSAGE_TEXT = {
  member_added: 'A member was added',
  member_removed: 'A member was removed',
  member_left: 'A member left',
  role_changed: (c) => `A member's role changed to ${c.role}`,
  owner_changed: 'Ownership transferred',
  group_info_updated: 'Group info was updated',
  group_created: 'Group created',
};

function SystemMessageLine({ message }) {
  const entry = SYSTEM_MESSAGE_TEXT[message.content.event];
  const text = typeof entry === 'function' ? entry(message.content) : entry || message.content.event;
  return <div className="text-center text-xs text-text-muted py-1">{text}</div>;
}

/**
 * senderProfile/showSenderHeader: group chats only.
 * replyPreview: { senderName, text } | null — resolved by the caller
 * from the currently loaded message list (or a generic fallback if the
 * replied-to message is outside the loaded page).
 * readStatus: 'sent' | 'read' | null — only computed for your own
 * messages in DIRECT chats; groups skip per-message read state
 * entirely (a deliberate scope decision, not an oversight — accurately
 * showing "read by whom" across N members is materially more complex).
 * highlighted: briefly true after jumping here from search.
 */
export function MessageBubble({
  message,
  senderProfile,
  showSenderHeader,
  replyPreview,
  onReply,
  readStatus,
  highlighted = false,
  onMediaLoad,
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const editMutation = useEditMessage(message.chatId);
  const deleteMutation = useDeleteMessage(message.chatId);
  const reactionMutation = useToggleReaction(message.chatId);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Touch screens have no hover, so tapping a bubble reveals its actions.
  // On md+ the hover rule below takes over and this flag is ignored.
  const [actionsVisible, setActionsVisible] = useState(false);

  if (message.type === 'system') {
    return <SystemMessageLine message={message} />;
  }

  const isMine = message.senderId === currentUserId;
  const isDeleted = message.status === 'deleted';
  const isIncognito = Boolean(message.incognitoSessionId);
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  const isImage = message.type === 'image';
  const isGif = message.type === 'gif';
  // Photos and GIFs fill the bubble edge-to-edge instead of sitting in text padding.
  const isMedia = isImage || isGif;
  // Editing replaces content with { text } server-side, which would
  // destroy an image message's content — so only text is editable.
  const canEdit = isMine && !isDeleted && !isSending && !isFailed && !isImage && !isGif;
  const canDelete = isMine && !isDeleted && !isSending && !isFailed;
  const canReply = !isDeleted && !isSending && !isFailed;
  const canReact = !isDeleted && !isSending && !isFailed;

  const bubbleColor = isIncognito
    ? 'bg-message-incognito text-white'
    : isMine
      ? 'bg-gradient-to-br from-accent-primary to-accent-secondary text-white'
      : 'bg-message-received text-text-primary';

  const senderColorClass = getParticipantColorClass(message.senderId);
  const initial = (senderProfile?.displayName || '?').charAt(0).toUpperCase();
  const reactions = message.reactions || [];

  function startEdit() {
    setEditDraft(message.content?.text || '');
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function saveEdit() {
    const text = editDraft.trim();
    if (!text) return;
    await editMutation.mutateAsync({ messageId: message.id, text });
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  function handleDelete() {
    if (window.confirm('Delete this message?')) {
      deleteMutation.mutate(message.id);
    }
  }

  function react(emoji) {
    reactionMutation.mutate({ messageId: message.id, emoji });
    setPickerOpen(false);
  }

  const actionButtonClass =
    'p-1.5 rounded-pill text-text-muted hover:text-text-primary hover:bg-surfaceHover transition-colors duration-fast';

  return (
    <div
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'} px-3 md:px-4 ${
        showSenderHeader ? 'pt-3' : 'py-0.5'
      } ${isSending ? '' : 'animate-message-in'}`}
    >
      <div className="max-w-[85%] md:max-w-[70%] flex flex-col gap-1">
        {showSenderHeader && !isMine && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-5 h-5 rounded-pill bg-surface-secondary overflow-hidden flex items-center justify-center text-[10px] font-semibold text-text-secondary flex-shrink-0 ring-1 ring-border">
              {senderProfile?.avatarUrl ? (
                <img src={senderProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className={`text-xs font-semibold ${senderColorClass}`}>
              {senderProfile?.displayName || 'Unknown'}
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1.5 rounded-md bg-surface-elevated border border-accent-primary text-sm text-text-primary focus-visible:outline-none"
            />
            <button onClick={saveEdit} className="text-status-success" aria-label="Save edit">
              <Check size={16} />
            </button>
            <button onClick={cancelEdit} className="text-status-error" aria-label="Cancel edit">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className={`relative flex items-center gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <div
              className={`${
                actionsVisible ? 'opacity-100' : 'opacity-0'
              } md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity duration-fast flex items-center flex-shrink-0`}
            >
              {canReact && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPickerOpen((o) => !o);
                  }}
                  className={actionButtonClass}
                  aria-label="Add reaction"
                >
                  <SmilePlus size={14} />
                </button>
              )}
              {canReply && (
                <button onClick={() => onReply?.(message)} className={actionButtonClass} aria-label="Reply">
                  <CornerUpLeft size={14} />
                </button>
              )}
              {canEdit && (
                <button onClick={startEdit} className={actionButtonClass} aria-label="Edit message">
                  <Pencil size={14} />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className={`${actionButtonClass} hover:!text-status-error`}
                  aria-label="Delete message"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {pickerOpen && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close reaction picker"
                />
                <div
                  className={`absolute -top-11 ${
                    isMine ? 'right-0' : 'left-0'
                  } z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-pill bg-surface-elevated border border-border shadow-elevation-2 animate-slide-up-in`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => react(emoji)}
                      className="w-8 h-8 rounded-pill text-lg flex items-center justify-center hover:bg-surfaceHover hover:scale-125 active:scale-95 transition-transform duration-fast"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div
              onClick={() => setActionsVisible((v) => !v)}
              className={`${isMedia && !isDeleted ? 'p-1' : 'px-3 py-2'} rounded-lg text-sm shadow-elevation-1 transition-all duration-fast ${bubbleColor} ${
                isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
              } ${isFailed ? 'opacity-50' : ''} ${isSending ? 'opacity-70 scale-[0.98]' : ''} ${
                highlighted ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-primary' : ''
              }`}
            >
              {replyPreview && (
                <div
                  className={`mb-1.5 pl-2 border-l-2 text-xs opacity-80 ${
                    isMedia ? 'mx-2 mt-1' : ''
                  } ${isMine || isIncognito ? 'border-white/40' : 'border-text-muted'}`}
                >
                  <div className="font-semibold">{replyPreview.senderName || 'Original message'}</div>
                  <div className="truncate max-w-[200px]">{replyPreview.text}</div>
                </div>
              )}
              {isDeleted ? (
                <span className={`italic opacity-70 ${isMedia ? 'px-2 py-1 inline-block' : ''}`}>
                  Message deleted
                </span>
              ) : isGif ? (
                // Size is reserved from the API's width/height, so the chat
                // doesn't jump when the GIF finishes loading. The bubble
                // shows the light 200px rendition; the full-size original
                // is only fetched if someone opens it.
                <div
                  className="relative overflow-hidden rounded-md bg-surface-secondary shimmer"
                  style={{
                    width: Math.min(message.content?.width || 200, 260),
                    maxWidth: '100%',
                    aspectRatio: `${message.content?.width || 1} / ${message.content?.height || 1}`,
                  }}
                >
                  <img
                    src={message.content?.previewUrl}
                    alt={message.content?.title || 'GIF'}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={onMediaLoad}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                  />
                </div>
              ) : isImage ? (
                <>
                  <img
                    src={message.content?.imageUrl}
                    alt={message.content?.caption || 'Shared photo'}
                    onLoad={onMediaLoad}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    className="block rounded-md max-h-72 w-auto max-w-full object-cover cursor-zoom-in"
                  />
                  {message.content?.caption && (
                    <div className="px-2 pt-1.5 pb-1 whitespace-pre-wrap break-words">
                      {message.content.caption}
                    </div>
                  )}
                </>
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.content?.text}</span>
              )}
            </div>
          </div>
        )}

        {reactions.length > 0 && !isDeleted && (
          <div className={`flex flex-wrap gap-1 ${isMine ? 'justify-end' : ''}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => canReact && react(r.emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill text-xs border transition-all duration-fast active:scale-90 animate-message-in ${
                  r.reactedByMe
                    ? 'bg-accentSubtle border-accent-primary text-accent-primary'
                    : 'bg-surface-elevated border-border text-text-secondary hover:bg-surfaceHover'
                }`}
                aria-label={`${r.emoji} ${r.count}${r.reactedByMe ? ', you reacted' : ''}`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-xs text-text-muted ${isMine ? 'justify-end' : ''}`}>
          {message.status === 'edited' && !isDeleted && <span>edited</span>}
          {isFailed && <span className="text-status-error">failed to send</span>}
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {readStatus && (
            <CheckCheck
              size={14}
              className={readStatus === 'read' ? 'text-accent-primary' : 'text-text-muted'}
            />
          )}
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          src={isGif ? message.content?.gifUrl : message.content?.imageUrl}
          alt={isGif ? message.content?.title || 'GIF' : message.content?.caption || 'Shared photo'}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
