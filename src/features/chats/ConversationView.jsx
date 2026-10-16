import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { X, Send, Plus, Smile, ImagePlus } from 'lucide-react';
import { useMessages } from './useMessages.js';
import { useSendMessage } from './useSendMessage.js';
import { useSendImage } from './useSendImage.js';
import { useEditMessage, useDeleteMessage, useDeleteForMe } from './useMessageActions.js';
import { useToggleReaction } from './useReactions.js';
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
import { GifPicker } from './GifPicker.jsx';
import { EmojiPicker } from './EmojiPicker.jsx';
import { SelectionBar } from './SelectionBar.jsx';
import { DeleteMessagesDialog } from './DeleteMessagesDialog.jsx';
import { useDismiss } from '../../hooks/useDismiss.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { isGiphyConfigured } from '../../api/giphy.js';
import { useIncognitoStatus } from '../incognito/useIncognito.js';
import { ChatHeader } from '../layout/ChatHeader.jsx';
import { IncognitoBanner } from '../incognito/IncognitoBanner.jsx';
import { markRead } from '../../api/chats.js';
import { compressImage, formatBytes } from '../../utils/compressImage.js';

const MAX_TEXTAREA_HEIGHT = 128;
// Mirrors the backend (messageImageUpload: 10MB, magic-byte check on
// JPEG/PNG/WEBP) so bad picks fail instantly with a clear message
// instead of after a wasted upload.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Generous pre-compression cap: the photo is shrunk client-side before
// upload (the server's own 10MB limit applies to the compressed result).
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
// Within this many px of the bottom counts as "reading the latest".
const STICK_TO_BOTTOM_THRESHOLD = 150;

// Small menu above the + button.
function PlusMenu({ onClose, onPhoto, onGif }) {
  useDismiss(onClose);
  const itemClass =
    'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors duration-fast';
  return (
    <div
      data-tray
      role="menu"
      className="absolute z-30 bottom-full left-2 md:left-3 mb-2 w-44 py-1 bg-surface-elevated border border-border rounded-lg shadow-elevation-2 animate-slide-up-in"
    >
      <button type="button" role="menuitem" onClick={onPhoto} className={itemClass}>
        <ImagePlus size={18} className="text-accent-primary" /> Photo
      </button>
      {onGif && (
        <button type="button" role="menuitem" onClick={onGif} className={itemClass}>
          <span className="w-[18px] text-center text-[10px] font-extrabold leading-none text-accent-primary border-2 border-current rounded px-0.5 py-0.5">
            GIF
          </span>
          GIF
        </button>
      )}
    </div>
  );
}

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
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl, originalSize }
  const [compressing, setCompressing] = useState(false);
  // Which popover above the composer is open: the + menu, emoji or GIF picker.
  const [tray, setTray] = useState(null); // null | 'plus' | 'emoji' | 'gif'
  const closeTray = useCallback(() => setTray(null), []);
  // Selection mode: entered by long-press / right-click, exited when the
  // last message is deselected, a bar action completes, or Escape.
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const editMutation = useEditMessage(chatId);
  const deleteEveryoneMutation = useDeleteMessage(chatId);
  const deleteForMeMutation = useDeleteForMe(chatId);
  const reactionMutation = useToggleReaction(chatId);
  const { data: incognitoSession } = useIncognitoStatus(chatId);
  const isIncognito = incognitoSession?.status === 'active';
  // Bumped on chat switch / removal so a slow compression can't land late.
  const stageTokenRef = useRef(0);
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
    setTray(null);
    setSelectedMessageIds([]);
    setEditingId(null);
    setDeleteDialogOpen(false);
    setSearchOpen(false);
    setJumpTarget(null);
    setHighlightedId(null);
    stickToBottomRef.current = true;
    stageTokenRef.current += 1;
    setCompressing(false);
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

  const selectionMode = selectedMessageIds.length > 0;
  const selectedMessages = useMemo(() => {
    const ids = new Set(selectedMessageIds);
    return (messages || []).filter((m) => ids.has(m.id)); // chat order, not tap order
  }, [messages, selectedMessageIds]);

  // Live updates can remove or delete what's selected/being edited (the
  // sender deletes it, an Incognito session ends, "delete for me" from
  // another tab) — drop those from the selection instead of acting on ghosts.
  useEffect(() => {
    if (!messages) return;
    const live = new Set(
      messages.filter((m) => m.status !== 'deleted' && m.status !== 'sending' && m.status !== 'failed').map((m) => m.id)
    );
    setSelectedMessageIds((prev) => {
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
    setEditingId((id) => (id && !live.has(id) ? null : id));
  }, [messages]);

  useEffect(() => {
    if (!selectionMode) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') setSelectedMessageIds([]);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectionMode]);

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

  async function stageImage(file) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP images can be sent');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('That image is larger than 25MB');
      return;
    }
    const token = ++stageTokenRef.current;
    setCompressing(true);
    const compressed = await compressImage(file);
    if (token !== stageTokenRef.current) return; // switched chat / removed meanwhile
    setCompressing(false);
    if (compressed.size > 10 * 1024 * 1024) {
      toast.error('That image is still too large after compression');
      return;
    }
    setPendingImage({
      file: compressed,
      previewUrl: URL.createObjectURL(compressed),
      originalSize: file.size,
    });
  }

  function removePendingImage() {
    stageTokenRef.current += 1;
    setCompressing(false);
    setPendingImage(null);
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
    if (isBlocked || compressing) return;
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

  // ---- Selection actions ---------------------------------------------
  // Idempotent on purpose: the long-press timer and the browser's own
  // contextmenu event can both fire for one gesture.
  function startSelection(id) {
    setTray(null);
    setSelectedMessageIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function toggleSelection(id) {
    setSelectedMessageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function clearSelection() {
    setSelectedMessageIds([]);
  }

  function handleReplySelected() {
    const message = selectedMessages[0];
    if (!message) return;
    setReplyingTo(message);
    clearSelection();
    textareaRef.current?.focus();
  }

  function handleEditSelected() {
    const message = selectedMessages[0];
    if (!message) return;
    setEditingId(message.id);
    clearSelection();
  }

  async function handleSaveEdit(messageId, text) {
    try {
      await editMutation.mutateAsync({ messageId, text });
      setEditingId(null);
    } catch (err) {
      toast.error(err?.message || 'Could not edit message');
    }
  }

  async function handleCopySelected() {
    const text = selectedMessages
      .map((m) => (m.type === 'text' ? m.content?.text : m.content?.caption))
      .filter(Boolean)
      .join('\n');
    if (!text) {
      toast.info('Nothing to copy');
      return;
    }
    const ok = await copyToClipboard(text);
    if (ok) toast.success('Copied');
    else toast.error('Could not copy to clipboard');
    clearSelection();
  }

  function handleReactSelected(emoji) {
    const message = selectedMessages[0];
    if (!message) return;
    reactionMutation.mutate({ messageId: message.id, emoji });
    clearSelection();
  }

  async function handleDeleteForMe() {
    setDeleteBusy(true);
    try {
      await deleteForMeMutation.mutateAsync(selectedMessageIds);
      setDeleteDialogOpen(false);
      clearSelection();
    } catch (err) {
      toast.error(err?.message || 'Could not delete messages');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleDeleteForEveryone() {
    setDeleteBusy(true);
    const results = await Promise.allSettled(
      selectedMessageIds.map((id) => deleteEveryoneMutation.mutateAsync(id))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) toast.error(`${failed} message${failed > 1 ? 's' : ''} couldn't be deleted`);
    setDeleteBusy(false);
    setDeleteDialogOpen(false);
    clearSelection();
  }

  // Only the sender can delete for everyone, so it's offered only when
  // every selected message is yours.
  const canDeleteForEveryone =
    selectionMode && selectedMessages.every((m) => m.senderId === currentUserId);

  // ---- Composer helpers ----------------------------------------------
  function toggleTray(name) {
    setTray((current) => (current === name ? null : name));
  }

  function openPhotoPicker() {
    setTray(null);
    fileInputRef.current?.click();
  }

  // Inserts at the caret (the browser keeps a textarea's selection while
  // it's blurred). Focus is only restored where there's a hardware
  // keyboard — on phones that would pop the keyboard over the emoji grid.
  function insertEmoji(emoji) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    notifyTyping();
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + emoji.length;
      if (window.matchMedia?.('(hover: hover)').matches) el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleSendGif(gif) {
    if (isBlocked) return;
    sendMessageMutation.mutate({
      type: 'gif',
      content: {
        gifUrl: gif.gifUrl,
        previewUrl: gif.previewUrl,
        width: gif.width,
        height: gif.height,
        title: gif.title || undefined,
      },
      clientMessageId: crypto.randomUUID(),
      replyToMessageId: replyingTo?.id,
    });
    setReplyingTo(null);
    setTray(null);
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
    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-surface-primary">
      {selectionMode ? (
        <SelectionBar
          selectedMessages={selectedMessages}
          currentUserId={currentUserId}
          onClose={clearSelection}
          onReply={handleReplySelected}
          onEdit={handleEditSelected}
          onCopy={handleCopySelected}
          onDelete={() => setDeleteDialogOpen(true)}
          onReact={handleReactSelected}
        />
      ) : (
        <ChatHeader searchOpen={searchOpen} onToggleSearch={() => setSearchOpen((o) => !o)} />
      )}
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

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3">
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

          // Consecutive messages from one sender (same day) sit tight
          // together; spacing only opens up when the sender changes.
          const nextMessage = data.messages[idx + 1];
          const groupedWithNext =
            Boolean(nextMessage) &&
            nextMessage.type !== 'system' &&
            message.type !== 'system' &&
            nextMessage.senderId === message.senderId &&
            isSameCalendarDay(message.createdAt, nextMessage.createdAt);

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
                readStatus={readStatus}
                highlighted={highlightedId === message.id}
                groupedWithNext={groupedWithNext}
                selectionMode={selectionMode}
                selected={selectedMessageIds.includes(message.id)}
                onLongPress={startSelection}
                onToggleSelect={toggleSelection}
                isEditing={editingId === message.id}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
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

      {compressing && (
        <div className="px-3 md:px-4 py-2 bg-surface-secondary border-t border-border text-xs text-text-muted">
          Optimizing photo…
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
            <div className="text-text-muted">
              {pendingImage.file.size < pendingImage.originalSize
                ? `${formatBytes(pendingImage.originalSize)} → ${formatBytes(pendingImage.file.size)} · `
                : `${formatBytes(pendingImage.file.size)} · `}
              Add a caption, or just send
            </div>
          </div>
          <button
            onClick={removePendingImage}
            className="text-text-muted hover:text-text-primary flex-shrink-0"
            aria-label="Remove photo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-1 px-2 md:px-3 pt-2 border-t border-border bg-surface-primary"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {tray === 'plus' && (
          <PlusMenu
            onClose={closeTray}
            onPhoto={openPhotoPicker}
            onGif={isGiphyConfigured ? () => setTray('gif') : null}
          />
        )}
        {tray === 'emoji' && <EmojiPicker onPick={insertEmoji} onClose={closeTray} />}
        {tray === 'gif' && (
          <GifPicker onSelect={handleSendGif} onClose={closeTray} isIncognito={isIncognito} />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handlePickFile}
          className="hidden"
        />
        <button
          type="button"
          data-tray-toggle
          onClick={() => toggleTray('plus')}
          disabled={isBlocked}
          aria-label="Attach"
          aria-expanded={tray === 'plus'}
          className="flex-shrink-0 w-10 h-10 rounded-pill text-text-secondary hover:text-accent-primary hover:bg-surfaceHover flex items-center justify-center transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={22} className={`transition-transform duration-fast ${tray === 'plus' ? 'rotate-45' : ''}`} />
        </button>
        <button
          type="button"
          data-tray-toggle
          onClick={() => toggleTray('emoji')}
          disabled={isBlocked}
          aria-label="Emoji"
          aria-expanded={tray === 'emoji'}
          className={`flex-shrink-0 w-10 h-10 rounded-pill hover:bg-surfaceHover flex items-center justify-center transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed ${
            tray === 'emoji' ? 'text-accent-primary' : 'text-text-secondary hover:text-accent-primary'
          }`}
        >
          <Smile size={21} />
        </button>
        {/* The rounded field is the wrapper; the textarea inside has no
            border or padding of its own and its scrollbar is hidden, so
            nothing can ever cut across the field's rounded edge. Height
            follows the text (see the auto-grow effect) up to a cap. */}
        <div className="flex-1 min-w-0 flex items-end bg-surface-secondary rounded-[1.5rem] px-4 py-2 border border-transparent focus-within:border-accent-primary transition-colors duration-fast">
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
                  : 'Type a message'
            }
            disabled={isBlocked}
            rows={1}
            className="block w-full m-0 p-0 border-0 bg-transparent text-sm leading-6 text-text-primary placeholder:text-text-muted resize-none overflow-y-auto outline-none focus:outline-none focus:ring-0 disabled:opacity-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
        </div>
        <button
          type="submit"
          disabled={(!draft.trim() && !pendingImage) || compressing || isBlocked}
          aria-label="Send message"
          className="flex-shrink-0 w-10 h-10 rounded-pill bg-gradient-brand text-white flex items-center justify-center transition-all duration-fast hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed"
        >
          <Send size={17} />
        </button>
      </form>

      <DeleteMessagesDialog
        isOpen={deleteDialogOpen}
        count={selectedMessageIds.length}
        canDeleteForEveryone={canDeleteForEveryone}
        busy={deleteBusy}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
