import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useMessages } from './useMessages.js';
import { useSendMessage } from './useSendMessage.js';
import { useTypingIndicator } from './useTypingIndicator.js';
import { useChats } from './useChats.js';
import { useGroupMembers } from '../groups/useGroup.js';
import { useRelationshipStatus } from '../friends/useFriends.js';
import { useAuthStore } from '../../stores/authStore.js';
import { MessageBubble } from './MessageBubble.jsx';
import { DateDivider, isSameCalendarDay } from './DateDivider.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { ChatHeader } from '../layout/ChatHeader.jsx';
import { IncognitoBanner } from '../incognito/IncognitoBanner.jsx';
import { Button } from '../../components/Button.jsx';
import { markRead } from '../../api/chats.js';

const MAX_TEXTAREA_HEIGHT = 128;

export function ConversationView() {
  const { chatId } = useParams();
  const { data, isLoading } = useMessages(chatId);
  const { data: chats } = useChats(); // already cached — cheap lookup for chat.type
  const chat = chats?.find((c) => c._id === chatId);
  const isGroup = chat?.type === 'group';
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Only fetched for group chats — direct chats don't need per-message
  // sender identification (2 participants, alignment alone tells you
  // who's who).
  const { data: members } = useGroupMembers(chatId, { enabled: isGroup });
  const memberProfileById = useMemo(() => {
    if (!members) return new Map();
    return new Map(
      members.map((m) => [
        m.userId._id,
        { displayName: m.userId.displayName, avatarUrl: m.userId.avatarUrl },
      ])
    );
  }, [members]);

  // Block status — only relevant for direct chats. Disables sending
  // and shows a banner, rather than letting the send silently fail
  // server-side with no explanation.
  const { data: relationship } = useRelationshipStatus(!isGroup ? chat?.otherParticipant?.id : null);
  const isBlocked = relationship?.status === 'blocked_by_me' || relationship?.status === 'blocked_by_them';

  const messagesById = useMemo(() => {
    if (!data?.messages) return new Map();
    return new Map(data.messages.map((m) => [m.id, m]));
  }, [data?.messages]);

  function resolveSenderName(senderId) {
    if (senderId === currentUserId) return 'You';
    if (isGroup) return memberProfileById.get(senderId)?.displayName || 'Unknown';
    return chat?.otherParticipant?.displayName || 'Unknown';
  }

  const sendMessageMutation = useSendMessage(chatId);
  const { notifyTyping, notifyStoppedTyping } = useTypingIndicator(chatId);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages?.length]);

  useEffect(() => {
    const messages = data?.messages;
    if (!messages?.length) return;
    const lastMessage = messages[messages.length - 1];
    markRead(chatId, lastMessage.id).catch(() => {
      /* non-critical — unread count staying stale isn't worth surfacing an error for */
    });
  }, [chatId, data?.messages]);

  // Auto-grow the textarea up to a fixed max height, then it scrolls
  // internally rather than pushing the rest of the layout around.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
  }, [draft]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isBlocked) return;

    sendMessageMutation.mutate({
      text,
      clientMessageId: crypto.randomUUID(),
      replyToMessageId: replyingTo?.id,
    });
    setDraft('');
    setReplyingTo(null);
    notifyStoppedTyping();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleChange(e) {
    setDraft(e.target.value);
    if (e.target.value) notifyTyping();
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-primary">
      <ChatHeader />
      <IncognitoBanner chatId={chatId} />
      {isBlocked && (
        <div className="bg-statusErrorSubtle border-b border-status-error px-4 py-2 text-xs text-status-error text-center">
          {relationship.status === 'blocked_by_me'
            ? 'You blocked this contact. Unblock them from Settings to send messages again.'
            : 'You can no longer send messages in this conversation.'}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {data?.messages?.map((message, idx) => {
          const prevMessage = data.messages[idx - 1];
          const showSenderHeader =
            isGroup &&
            message.type !== 'system' &&
            (!prevMessage ||
              prevMessage.type === 'system' ||
              prevMessage.senderId !== message.senderId);

          const showDateDivider =
            !prevMessage || !isSameCalendarDay(prevMessage.createdAt, message.createdAt);

          const repliedMessage = message.replyToMessageId
            ? messagesById.get(message.replyToMessageId)
            : null;
          const replyPreview = message.replyToMessageId
            ? repliedMessage
              ? {
                  senderName: resolveSenderName(repliedMessage.senderId),
                  text: repliedMessage.content?.text || '[deleted]',
                }
              : { senderName: null, text: 'Original message' } // outside the currently loaded page
            : null;

          // Read ticks: direct chats only, your own messages only.
          // "Read" = the other participant's lastReadMessageId is at
          // or past this message (ObjectIds sort correctly as strings —
          // same length, time-ordered by construction).
          const isMine = message.senderId === currentUserId;
          const otherLastRead = chat?.otherParticipant?.lastReadMessageId;
          const readStatus =
            !isGroup && isMine && message.status !== 'sending' && message.status !== 'failed'
              ? otherLastRead && message.id <= otherLastRead
                ? 'read'
                : 'sent'
              : null;

          return (
            <div key={message.id}>
              {showDateDivider && <DateDivider dateStr={message.createdAt} />}
              <MessageBubble
                message={message}
                showSenderHeader={showSenderHeader}
                senderProfile={isGroup ? memberProfileById.get(message.senderId) : null}
                replyPreview={replyPreview}
                onReply={setReplyingTo}
                readStatus={readStatus}
              />
            </div>
          );
        })}
      </div>

      <TypingIndicator chatId={chatId} />

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-secondary border-t border-border">
          <div className="text-xs min-w-0">
            <div className="font-semibold text-accent-primary">
              Replying to {resolveSenderName(replyingTo.senderId)}
            </div>
            <div className="text-text-muted truncate">{replyingTo.content?.text}</div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-text-muted hover:text-text-primary flex-shrink-0 ml-2"
            aria-label="Cancel reply"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 border-t border-border">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={notifyStoppedTyping}
          placeholder={isBlocked ? 'You cannot message this contact' : 'Type a message…'}
          disabled={isBlocked}
          rows={1}
          className="flex-1 px-3 py-2 rounded-md bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted resize-none overflow-y-auto disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
        <Button type="submit" disabled={!draft.trim() || isBlocked}>
          Send
        </Button>
      </form>
    </div>
  );
}
