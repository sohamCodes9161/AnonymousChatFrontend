import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { X, Send, ImagePlus } from 'lucide-react';
import { useMessages } from './useMessages.js';
import { useSendMessage } from './useSendMessage.js';
import { useSendImage } from './useSendImage.js';
import { useEnsureMessageLoaded } from './useMessageSearch.js';
import { useTypingIndicator } from './useTypingIndicator.js';
import { useChats } from './useChats.js';
import { useGroupMembers } from '../groups/useGroup.js';
import { useRelationshipStatus } from '../friends/useFriends.js';
import { useAuthStore } from '../../stores/authStore.js';
import { toast } from '../../stores/toastStore.js';
import { messagePreviewText } from '../../utils/messagePreview.js';
import { MessageBubble } from './MessageBubble.jsx';
import { DateDivider, isSameCalendarDay } from './DateDivider.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { ChatSearchBar } from './ChatSearchBar.jsx';
import { ChatHeader } from '../layout/ChatHeader.jsx';
import { IncognitoBanner } from '../incognito/IncognitoBanner.jsx';
import { markRead } from '../../api/chats.js';

const MAX_TEXTAREA_HEIGHT = 128;
// Mirrors the backend (messageImageUpload: 10MB, magic-byte check on
// JPEG/PNG/WEBP) so bad picks fail instantly with a clear message
// instead of after a wasted upload.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Within this many px of the bottom counts as "reading the latest".
const STICK_TO_BOTTOM_THRESHOLD = 150;

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
  const sendImageMutation = useSendImage(chatId);
  const ensureMessageLoaded = useEnsureMessageLoaded(chatId);
  const { notifyTyping, notifyStoppedTyping } = useTypingIndicator(chatId);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl }
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const stickToBottomRef = useRef(true);

  // This component instance is reused when the :chatId param changes,
  // so anything per-conversation must be reset here — otherwise a draft
  // (or a staged photo!) typed in one chat would be sent to the next.
  useEffect(() => {
    setDraft('');
    setReplyingTo(null);
    setPendingImage(null);
    setSearchOpen(false);
    setJumpTarget(null);
    setHighlightedId(null);
    stickToBottomRef.current = true;
  }, [chatId]);

  // Staged-photo preview URL is owned here: revoked whenever it's
  // replaced, cleared, or the component unmounts.
  useEffect(() => {
    const url = pendingImage?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pendingImage?.previewUrl]);

  const messages = data?.messages;
  const lastMessage = messages?.[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastIsMine = lastMessage?.senderId === currentUserId;

  // Follow new messages only if the user is already near the bottom (or
  // sent it themselves) — and NOT when older pages are prepended by
  // search, which changes the list length but not the last message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current || lastIsMine) {
      el.scrollTo({ top: el.scrollHeight });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, lastMessageId]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_THRESHOLD;
  }

  // Images change height after they load; keep the latest message in
  // view if that's where the user was.
  function handleMediaLoad() {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTo({ top: el.scrollHeight });
  }

  useEffect(() => {
    if (!messages?.length) return;
    // Optimistic entries carry a client-side temp id, not a real
    // ObjectId — marking those as "read" would just be rejected.
    const lastReal = [...messages].reverse().find((m) => m.status !== 'sending' && m.status !== 'failed');
    if (!lastReal) return;
    markRead(chatId, lastReal.id).catch(() => {
      /* non-critical — unread count staying stale isn't worth surfacing an error for */
    });
  }, [chatId, messages]);

  // Auto-grow the textarea up to a fixed max height, then it scrolls
  // internally rather than pushing the rest of the layout around.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
  }, [draft]);

  // Jump-to-message (from search): scroll the target into view and
  // flash a ring around it.
  useEffect(() => {
    if (!jumpTarget) return;
    document
      .getElementById(`msg-${jumpTarget.id}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setHighlightedId(jumpTarget.id);
    const t = setTimeout(() => setHighlightedId(null), 2200);
    return () => clearTimeout(t);
  }, [jumpTarget]);

  async function handleSelectSearchResult(message) {
    const loaded = await ensureMessageLoaded(message.id);
    if (!loaded) {
      toast.info('That message is too far back to load');
      return;
    }
    // Set after the (possibly prepended) cache write, so both land in
    // one render and the element exists when the effect above runs.
    stickToBottomRef.current = false;
    setJumpTarget({ id: message.id, nonce: Date.now() });
  }

  function stageImage(file) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP images can be sent');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('That image is larger than 10MB');
      return;
    }
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again after removing it
    stageImage(file);
  }

  function handlePaste(e) {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      stageImage(file);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isBlocked) return;
    const text = draft.trim();

    if (pendingImage) {
      if (replyingTo) toast.info("Photos can't be sent as replies yet — sent without the reply");
      sendImageMutation.mutate({
        file: pendingImage.file,
        caption: text || undefined,
        tempId: crypto.randomUUID(),
        // Separate object URL for the optimistic bubble, owned (and
        // revoked) by the mutation — the preview URL above is ours.
        localUrl: URL.createObjectURL(pendingImage.file),
      });
      setPendingImage(null);
      setDraft('');
      setReplyingTo(null);
      notifyStoppedTyping();
      return;
    }

    if (!text) return;
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
    return (
      <div className="flex-1 flex flex-col h-full bg-surface-primary">
        <div className="h-14 border-b border-border flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-end gap-3 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div
                className="shimmer rounded-lg h-9"
                style={{ width: `${120 + ((i * 37) % 140)}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-surface-primary">
      <ChatHeader searchOpen={searchOpen} onToggleSearch={() => setSearchOpen((o) => !o)} />
      {searchOpen && (
        <ChatSearchBar
          chatId={chatId}
          resolveSenderName={resolveSenderName}
          onSelect={handleSelectSearchResult}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <IncognitoBanner chatId={chatId} />
      {isBlocked && (
        <div className="bg-statusErrorSubtle border-b border-status-error px-4 py-2 text-xs text-status-error text-center">
          {relationship.status === 'blocked_by_me'
            ? 'You blocked this contact. Unblock them from Settings to send messages again.'
            : 'You can no longer send messages in this conversation.'}
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
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
                  text: messagePreviewText(repliedMessage),
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
            <div key={message.id} id={`msg-${message.id}`}>
              {showDateDivider && <DateDivider dateStr={message.createdAt} />}
              <MessageBubble
                message={message}
                showSenderHeader={showSenderHeader}
                senderProfile={isGroup ? memberProfileById.get(message.senderId) : null}
                replyPreview={replyPreview}
                onReply={setReplyingTo}
                readStatus={readStatus}
                highlighted={highlightedId === message.id}
                onMediaLoad={handleMediaLoad}
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
            <div className="text-text-muted truncate">{messagePreviewText(replyingTo)}</div>
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

      {pendingImage && (
        <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-surface-secondary border-t border-border animate-slide-up-in">
          <img
            src={pendingImage.previewUrl}
            alt="Selected photo preview"
            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-semibold text-text-primary truncate">{pendingImage.file.name}</div>
            <div className="text-text-muted">Add a caption below, or just send</div>
          </div>
          <button
            onClick={() => setPendingImage(null)}
            className="text-text-muted hover:text-text-primary flex-shrink-0"
            aria-label="Remove photo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 p-3 border-t border-border bg-surface-primary"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handlePickFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBlocked}
          aria-label="Attach photo"
          title="Attach photo"
          className="flex-shrink-0 w-10 h-10 rounded-pill text-text-secondary hover:text-accent-primary hover:bg-surfaceHover flex items-center justify-center transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ImagePlus size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={notifyStoppedTyping}
          placeholder={
            isBlocked
              ? 'You cannot message this contact'
              : pendingImage
                ? 'Add a caption…'
                : 'Type a message…'
          }
          disabled={isBlocked}
          rows={1}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted resize-none overflow-y-auto disabled:opacity-50 transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
        <button
          type="submit"
          disabled={(!draft.trim() && !pendingImage) || isBlocked}
          aria-label="Send message"
          className="flex-shrink-0 w-10 h-10 rounded-pill bg-gradient-brand text-white flex items-center justify-center transition-all duration-fast hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
