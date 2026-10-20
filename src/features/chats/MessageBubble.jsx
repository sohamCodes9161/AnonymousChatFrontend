import { useState, useEffect } from 'react';
import { Check, X, CheckCheck, Clock, CornerUpLeft, Forward } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import { useSwipeToReply } from '../../hooks/useSwipeToReply.js';
import { ImageLightbox } from '../../components/ImageLightbox.jsx';
import { splitMentions } from '../../utils/mentions.js';
import { VoicePlayer } from './VoicePlayer.jsx';

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
// Renders @username tokens that belong to real group members as highlighted
// chips (stronger for a mention of the viewer).
function MentionText({ text, mentionUsernames, currentUserId }) {
  if (!mentionUsernames?.size) return text;
  return splitMentions(text, new Set(mentionUsernames.keys())).map((p, i) =>
    p.mention ? (
      <span
        key={i}
        className={`font-semibold ${
          mentionUsernames.get(p.mention) === currentUserId
            ? 'rounded px-0.5 bg-black/20'
            : 'underline decoration-dotted underline-offset-2'
        }`}
      >
        {p.text}
      </span>
    ) : (
      p.text
    )
  );
}

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
 * A message row. It has NO inline action buttons — everything (react,
 * reply, edit, copy, delete) lives in the selection bar, entered by
 * long-pressing (touch) or right-clicking (desktop) a message.
 *
 * senderProfile/showSenderHeader: group chats only.
 * replyPreview: { senderName, text } | null — resolved by the caller.
 * readStatus: 'sent' | 'read' | null — own messages in DIRECT chats only.
 * highlighted: briefly true after jumping here from search.
 * selectionMode / selected / onLongPress / onToggleSelect: selection state
 * is owned by the conversation (the header bar needs it too).
 * isEditing / onSaveEdit / onCancelEdit: inline edit, started from the bar.
 */
export function MessageBubble({
  message,
  senderProfile,
  showSenderHeader,
  replyPreview,
  readStatus,
  highlighted = false,
  onMediaLoad,
  groupedWithNext = false,
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,
  onReply,
  isEditing = false,
  onSaveEdit,
  onCancelEdit,
  mentionUsernames = null,
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [editDraft, setEditDraft] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const isSystem = message.type === 'system';
  const isDeleted = message.status === 'deleted';
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  // Optimistic (temp id) and deleted messages have nothing the bar could act on.
  const selectable = !isSystem && !isDeleted && !isSending && !isFailed;

  const press = useLongPress({
    enabled: selectable,
    interceptTaps: selectionMode,
    onLongPress: () => onLongPress?.(message.id),
    onTap: () => onToggleSelect?.(message.id),
  });

  // Swipe right to reply (touch). Off while selecting/editing and for
  // messages with nothing to reply to.
  const swipe = useSwipeToReply({
    enabled: selectable && !selectionMode && !isEditing,
    onReply: () => onReply?.(message),
  });

  // One set of row handlers driving both gestures. Long-press cancels
  // itself once the finger moves, so the two never fire together.
  const rowHandlers = {
    ...press,
    onPointerDown(e) {
      press.onPointerDown(e);
      swipe.handlers.onPointerDown(e);
    },
    onPointerMove(e) {
      press.onPointerMove(e);
      swipe.handlers.onPointerMove(e);
    },
    onPointerUp(e) {
      press.onPointerUp(e);
      swipe.handlers.onPointerUp(e);
    },
    onPointerCancel(e) {
      press.onPointerCancel(e);
      swipe.handlers.onPointerCancel(e);
    },
    onClickCapture(e) {
      if (swipe.didSwipe()) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      press.onClickCapture(e);
    },
  };

  // Seed the edit box each time editing starts.
  useEffect(() => {
    if (isEditing) setEditDraft(message.content?.text || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  if (isSystem) {
    return <SystemMessageLine message={message} />;
  }

  const isMine = message.senderId === currentUserId;
  const isIncognito = Boolean(message.incognitoSessionId);
  const isImage = message.type === 'image';
  const isGif = message.type === 'gif';
  const isVoice = message.type === 'voice';
  // Photos and GIFs fill the bubble edge-to-edge instead of sitting in text padding.
  const isMedia = isImage || isGif;

  const bubbleColor = isIncognito
    ? 'bg-message-incognito text-white'
    : isMine
      ? 'bg-gradient-to-br from-accent-primary to-accent-secondary text-white'
      : 'bg-message-received text-text-primary ring-1 ring-black/5';

  const senderColorClass = getParticipantColorClass(message.senderId);
  const initial = (senderProfile?.displayName || '?').charAt(0).toUpperCase();
  const reactions = message.reactions || [];

  async function saveEdit() {
    const text = editDraft.trim();
    if (!text) return;
    await onSaveEdit?.(message.id, text);
  }

  function handleEditKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') onCancelEdit?.();
  }

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
    <>
    <div
      {...rowHandlers}
      aria-selected={selectionMode ? selected : undefined}
      // Text selection is off on touch (it would fight the long-press) and
      // while selecting; desktop keeps normal text selection otherwise.
      className={`group flex touch-pan-y [overflow-x:clip] ${isMine ? 'justify-end' : 'justify-start'} px-3 md:px-4 ${
        groupedWithNext ? 'pb-1' : 'pb-3'
      } ${hasReactions ? 'mb-3' : ''} ${isSending ? '' : 'animate-message-in'} ${
        selectable ? 'select-none [-webkit-touch-callout:none]' : ''
      } ${selectable && !selectionMode ? 'md:select-text' : ''} ${
        selected ? 'bg-accentSubtle' : ''
      } ${selectionMode && selectable ? 'cursor-pointer' : ''} transition-colors duration-fast`}
    >
      <div
        ref={swipe.contentRef}
        className={`relative min-w-0 max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
      >
        {/* Revealed as the message is dragged right; travels with it. */}
        <div
          ref={swipe.iconRef}
          aria-hidden="true"
          className="absolute top-1/2 right-full mr-3 w-8 h-8 rounded-full bg-surface-secondary text-text-secondary flex items-center justify-center pointer-events-none"
          style={{ opacity: 0, transform: 'translateY(-50%) scale(0.6)' }}
        >
          <CornerUpLeft size={16} />
        </div>
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
              onKeyDown={handleEditKeyDown}
              autoFocus
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-surface-elevated border border-accent-primary text-sm text-text-primary focus-visible:outline-none"
            />
            <button onClick={saveEdit} className="p-1 text-status-success" aria-label="Save edit">
              <Check size={18} />
            </button>
            <button onClick={onCancelEdit} className="p-1 text-status-error" aria-label="Cancel edit">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div
              className={`relative ${isMedia && !isDeleted ? 'p-1' : ''} rounded-2xl text-sm shadow-elevation-1 transition-all duration-fast ${bubbleColor} ${
                groupedWithNext ? '' : isMine ? 'rounded-br-md' : 'rounded-bl-md'
              } ${isFailed ? 'opacity-50' : ''} ${isSending ? 'opacity-70 scale-[0.98]' : ''} ${
                highlighted ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-primary' : ''
              }`}
            >
              {message.forwarded && !isDeleted && (
                <div className="flex items-center gap-1 px-2.5 pt-1.5 text-[11px] italic opacity-75">
                  <Forward size={11} /> Forwarded
                </div>
              )}
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
                    draggable={false}
                    referrerPolicy="no-referrer"
                    onLoad={handleMediaLoad}
                    onClick={onMediaClick}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                  />
                  {overlayMeta && overlayPill}
                </div>
              ) : isVoice && !isDeleted ? (
                <div className="px-3 pt-2.5 pb-1.5">
                  <VoicePlayer
                    src={message.content?.audioUrl}
                    duration={message.content?.duration}
                    mimeType={message.content?.mimeType}
                    disabled={isSending}
                  />
                  <div className="flex justify-end mt-0.5">{meta}</div>
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
                      draggable={false}
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
                  <span className="whitespace-pre-wrap break-words">
                    <MentionText text={message.content?.text} mentionUsernames={mentionUsernames} currentUserId={currentUserId} />
                  </span>
                </TextWithMeta>
              )}

              {/* Pinned to the bubble's bottom edge so it overlaps the border
                  instead of adding a row to the message stream. Tapping a chip
                  is handled by the row while selecting. */}
              {hasReactions && (
                <div className="absolute -bottom-2.5 right-3 z-[1] flex gap-1">
                  {reactions.map((r) => (
                    <span
                      key={r.emoji}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shadow-sm bg-surface-elevated ${
                        r.reactedByMe
                          ? 'border-accent-primary text-accent-primary'
                          : 'border-border text-text-secondary'
                      }`}
                      aria-label={`${r.emoji} ${r.count}${r.reactedByMe ? ', you reacted' : ''}`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-medium">{r.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Outside the row: React events bubble through portals, so inside it
          a press on the preview would count as a press on this message. */}
      {lightboxOpen && (
        <ImageLightbox
          src={isGif ? message.content?.gifUrl : message.content?.imageUrl}
          alt={isGif ? message.content?.title || 'GIF' : caption || 'Shared photo'}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
