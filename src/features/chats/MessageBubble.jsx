import { useState } from 'react';
import { Pencil, Trash2, Check, X, CornerUpLeft, CheckCheck, SmilePlus, Clock } from 'lucide-react';
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

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Time + edited flag + delivery state, rendered INSIDE the bubble. Colors
// are inherited from the bubble (or the dark overlay pill on media), so
// it reads as low-contrast text rather than a separate line.
function MessageMeta({ message, isMine, readStatus, isDeleted }) {
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  return (
    <span className="inline-flex items-center gap-1 text-xs leading-none whitespace-nowrap select-none">
      {message.status === 'edited' && !isDeleted && <span className="opacity-70">edited</span>}
      {isFailed && <span className="font-semibold">Failed</span>}
      <span className="opacity-70">{formatTime(message.createdAt)}</span>
      {isMine && !isDeleted && !isFailed && isSending && <Clock size={12} className="opacity-70" />}
      {isMine && !isDeleted && !isFailed && !isSending && readStatus === 'read' && (
        <CheckCheck size={14} className="text-sky-300" aria-label="Read" />
      )}
      {isMine && !isDeleted && !isFailed && !isSending && readStatus === 'sent' && (
        <Check size={14} className="opacity-70" aria-label="Sent" />
      )}
    </span>
  );
}

// Text with the meta tucked into its bottom-right corner. An invisible
// copy of the meta sits at the end of the text flow to reserve room for
// it (so the last line never runs underneath), and the visible copy is
// pinned to the corner — the same trick WhatsApp Web uses.
function TextWithMeta({ children, meta, className = '' }) {
  return (
    <div className={`relative px-3 pt-1.5 pb-1.5 leading-snug ${className}`}>
      {children}
      <span aria-hidden="true" className="invisible inline-block ml-3 align-bottom">
        {meta}
      </span>
      <span className="absolute bottom-1.5 right-3">{meta}</span>
    </div>
  );
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
  groupedWithNext = false,
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const editMutation = useEditMessage(message.chatId);
  const deleteMutation = useDeleteMessage(message.chatId);
  const reactionMutation = useToggleReaction(message.chatId);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
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
      : 'bg-message-received text-text-primary ring-1 ring-black/5';

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
    'p-1 rounded-pill text-text-muted hover:text-text-primary hover:bg-surfaceHover transition-colors duration-fast';

  const caption = isImage ? message.content?.caption : null;
  // Photos/GIFs without a caption carry their timestamp on a dark pill over
  // the media itself; with a caption it moves below, inside the text area.
  const overlayMeta = isMedia && !isDeleted && !caption;
  const meta = (
    <MessageMeta message={message} isMine={isMine} readStatus={readStatus} isDeleted={isDeleted} />
  );
  const hasReactions = reactions.length > 0 && !isDeleted;

  function onMediaClick(e) {
    e.stopPropagation();
    setLightboxOpen(true);
  }

  function handleMediaLoad(e) {
    setMediaLoaded(true);
    onMediaLoad?.(e);
  }

  const overlayPill = (
    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
      {meta}
    </div>
  );

  return (
    <div
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'} px-3 md:px-4 ${
        groupedWithNext ? 'pb-1' : 'pb-3'
      } ${hasReactions ? 'mb-3' : ''} ${isSending ? '' : 'animate-message-in'}`}
    >
      <div className={`min-w-0 max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {showSenderHeader && !isMine && (
          <div className="flex items-center gap-1.5 mb-1 pt-1">
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
          <div className="flex items-center gap-1 w-full">
            <input
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-surface-elevated border border-accent-primary text-sm text-text-primary focus-visible:outline-none"
            />
            <button onClick={saveEdit} className="text-status-success" aria-label="Save edit">
              <Check size={16} />
            </button>
            <button onClick={cancelEdit} className="text-status-error" aria-label="Cancel edit">
              <X size={16} />
            </button>
          </div>
        ) : (
          // Wrapper is exactly bubble-sized, so the action toolbar and the
          // reaction picker can be positioned against it without taking up
          // any layout width of their own.
          <div className="relative">
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${
                isMine ? 'right-full mr-1' : 'left-full ml-1'
              } ${
                actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } md:opacity-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:focus-within:opacity-100 md:focus-within:pointer-events-auto transition-opacity duration-fast flex items-center`}
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
              className={`relative ${isMedia && !isDeleted ? 'p-1' : ''} rounded-2xl text-sm shadow-elevation-1 transition-all duration-fast ${bubbleColor} ${
                groupedWithNext ? '' : isMine ? 'rounded-br-md' : 'rounded-bl-md'
              } ${isFailed ? 'opacity-50' : ''} ${isSending ? 'opacity-70 scale-[0.98]' : ''} ${
                highlighted ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-primary' : ''
              }`}
            >
              {replyPreview && (
                <div
                  className={`mx-1.5 mt-1.5 mb-0.5 px-2 py-1 rounded-md border-l-4 text-xs bg-black/10 ${
                    isMine || isIncognito ? 'border-white/60' : 'border-accent-primary'
                  }`}
                >
                  <div className="font-semibold opacity-90">{replyPreview.senderName || 'Original message'}</div>
                  <div className="truncate max-w-[220px] opacity-80">{replyPreview.text}</div>
                </div>
              )}

              {isDeleted ? (
                <TextWithMeta meta={meta}>
                  <span className="italic opacity-70">Message deleted</span>
                </TextWithMeta>
              ) : isGif ? (
                // Space is reserved from the API's width/height so the chat
                // doesn't jump when the GIF loads. The bubble shows the light
                // 200px rendition; the full original opens on click.
                <div
                  className="relative overflow-hidden rounded-xl bg-surface-secondary shimmer max-h-80"
                  style={{
                    width: Math.min(message.content?.width || 200, 288),
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
                    onLoad={handleMediaLoad}
                    onClick={onMediaClick}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                  />
                  {overlayMeta && overlayPill}
                </div>
              ) : isImage ? (
                <>
                  <div
                    className="relative overflow-hidden rounded-xl w-72 md:w-80 max-w-full bg-surface-secondary"
                    // Natural height isn't stored on the message, so hold a
                    // placeholder height until the photo has loaded.
                    style={mediaLoaded ? undefined : { minHeight: 160 }}
                  >
                    <img
                      src={message.content?.imageUrl}
                      alt={caption || 'Shared photo'}
                      onLoad={handleMediaLoad}
                      onClick={onMediaClick}
                      className="block w-full h-auto max-h-80 object-cover cursor-zoom-in"
                    />
                    {overlayMeta && overlayPill}
                  </div>
                  {caption && (
                    <TextWithMeta meta={meta}>
                      <span className="whitespace-pre-wrap break-words">{caption}</span>
                    </TextWithMeta>
                  )}
                </>
              ) : (
                <TextWithMeta meta={meta}>
                  <span className="whitespace-pre-wrap break-words">{message.content?.text}</span>
                </TextWithMeta>
              )}

              {/* Pinned to the bubble's bottom edge so it overlaps the border
                  instead of adding a row to the message stream. */}
              {hasReactions && (
                <div className="absolute -bottom-2.5 right-3 z-[1] flex gap-1">
                  {reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canReact) react(r.emoji);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shadow-sm bg-surface-elevated transition-transform duration-fast active:scale-90 ${
                        r.reactedByMe
                          ? 'border-accent-primary text-accent-primary'
                          : 'border-border text-text-secondary'
                      }`}
                      aria-label={`${r.emoji} ${r.count}${r.reactedByMe ? ', you reacted' : ''}`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-medium">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          src={isGif ? message.content?.gifUrl : message.content?.imageUrl}
          alt={isGif ? message.content?.title || 'GIF' : caption || 'Shared photo'}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
