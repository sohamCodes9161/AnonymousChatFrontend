import { useState } from 'react';
import { Pencil, Trash2, Check, X, CornerUpLeft, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useEditMessage, useDeleteMessage } from './useMessageActions.js';

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
 */
export function MessageBubble({ message, senderProfile, showSenderHeader, replyPreview, onReply, readStatus }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const editMutation = useEditMessage(message.chatId);
  const deleteMutation = useDeleteMessage(message.chatId);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');

  if (message.type === 'system') {
    return <SystemMessageLine message={message} />;
  }

  const isMine = message.senderId === currentUserId;
  const isDeleted = message.status === 'deleted';
  const isIncognito = Boolean(message.incognitoSessionId);
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  const canModify = isMine && !isDeleted && !isSending && !isFailed;
  const canReply = !isDeleted && !isSending && !isFailed;

  const bubbleColor = isIncognito
    ? 'bg-message-incognito text-white'
    : isMine
      ? 'bg-message-sent text-white'
      : 'bg-message-received text-text-primary';

  const senderColorClass = getParticipantColorClass(message.senderId);
  const initial = (senderProfile?.displayName || '?').charAt(0).toUpperCase();

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

  return (
    <div
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'} px-4 ${
        showSenderHeader ? 'pt-3' : 'py-0.5'
      }`}
    >
      <div className="max-w-[70%] flex flex-col gap-1">
        {showSenderHeader && !isMine && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-5 h-5 rounded-pill bg-surface-secondary overflow-hidden flex items-center justify-center text-[10px] font-semibold text-text-secondary flex-shrink-0">
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
          <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-fast flex items-center gap-1 flex-shrink-0">
              {canReply && (
                <button onClick={() => onReply?.(message)} className="text-text-muted hover:text-text-primary" aria-label="Reply">
                  <CornerUpLeft size={12} />
                </button>
              )}
              {canModify && (
                <>
                  <button onClick={startEdit} className="text-text-muted hover:text-text-primary" aria-label="Edit message">
                    <Pencil size={12} />
                  </button>
                  <button onClick={handleDelete} className="text-text-muted hover:text-status-error" aria-label="Delete message">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
            <div
              className={`px-3 py-2 rounded-lg text-sm ${bubbleColor} ${isFailed ? 'opacity-50' : ''} ${
                isSending ? 'opacity-70' : ''
              }`}
            >
              {replyPreview && (
                <div
                  className={`mb-1.5 pl-2 border-l-2 text-xs opacity-80 ${
                    isMine || isIncognito ? 'border-white/40' : 'border-text-muted'
                  }`}
                >
                  <div className="font-semibold">{replyPreview.senderName || 'Original message'}</div>
                  <div className="truncate max-w-[200px]">{replyPreview.text}</div>
                </div>
              )}
              {isDeleted ? (
                <span className="italic opacity-70">Message deleted</span>
              ) : (
                message.content?.text
              )}
            </div>
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
    </div>
  );
}
