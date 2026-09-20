import { useState } from 'react';
import { Info, Ghost, MoreVertical, Ban, BellOff, Bell, Archive, ArchiveRestore, Pin, PinOff, Eraser } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useChats } from '../chats/useChats.js';
import { usePresenceStore } from '../../stores/presenceStore.js';
import { GroupInfoPanel } from '../groups/GroupInfoPanel.jsx';
import { useIncognitoStatus, useStartIncognito, useEndIncognito } from '../incognito/useIncognito.js';
import { useRelationshipStatus } from '../friends/useFriends.js';
import { useBlockUser, useUnblockUser } from '../friends/useFriendActions.js';
import {
  useMuteChat,
  useUnmuteChat,
  useArchiveChat,
  useUnarchiveChat,
  usePinChat,
  useUnpinChat,
  useClearChat,
} from '../chats/useChatActions.js';

const MUTE_PRESETS = [
  { label: 'Mute for 8 hours', ms: 8 * 60 * 60 * 1000 },
  { label: 'Mute for 1 week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Mute always', ms: null },
];

function formatLastSeen(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'last seen just now';
  if (diffMin < 60) return `last seen ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `last seen ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `last seen ${diffDay}d ago`;
  return `last seen ${new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export function ChatHeader() {
  const { chatId } = useParams();
  const { data: chats } = useChats(); // already cached from the sidebar — no extra fetch
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chat = chats?.find((c) => c._id === chatId);

  const isOnline = usePresenceStore((s) =>
    chat?.otherParticipant ? s.onlineUserIds.has(chat.otherParticipant.id) : false
  );

  const { data: incognitoSession } = useIncognitoStatus(chatId);
  const startIncognitoMutation = useStartIncognito(chatId);
  const endIncognitoMutation = useEndIncognito(chatId);
  const isIncognitoActive = Boolean(incognitoSession);

  const { data: relationship } = useRelationshipStatus(
    chat?.type === 'direct' ? chat?.otherParticipant?.id : null
  );
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const muteMutation = useMuteChat();
  const unmuteMutation = useUnmuteChat();
  const archiveMutation = useArchiveChat();
  const unarchiveMutation = useUnarchiveChat();
  const pinMutation = usePinChat();
  const unpinMutation = useUnpinChat();
  const clearMutation = useClearChat();

  if (!chat) return <div className="h-14 border-b border-border flex-shrink-0" />;

  const title = chat.type === 'direct' ? chat.otherParticipant?.displayName : chat.name;
  // Graduated presence: online beats everything, otherwise fall back to
  // "last seen X ago" if the other person's privacy setting allows it
  // (lastSeenAt arrives as null from the backend when it doesn't —
  // this component never has to know WHY, just whether it has a value).
  const subtitle =
    chat.type === 'direct'
      ? isOnline
        ? 'Online'
        : chat.otherParticipant?.lastSeenAt
          ? formatLastSeen(chat.otherParticipant.lastSeenAt)
          : 'Offline'
      : 'Group';
  const isBlocked = relationship?.status === 'blocked_by_me';
  const isMuted = chat.membership?.mutedUntil && new Date(chat.membership.mutedUntil) > new Date();
  const isArchived = Boolean(chat.membership?.archivedAt);
  const isPinned = Boolean(chat.membership?.pinnedAt);

  function handleBlock() {
    if (window.confirm(`Block ${chat.otherParticipant?.displayName}?`)) {
      blockMutation.mutate(chat.otherParticipant.id);
    }
    setMenuOpen(false);
  }

  function handleUnblock() {
    unblockMutation.mutate(chat.otherParticipant.id);
    setMenuOpen(false);
  }

  function handleMute(ms) {
    const until = ms ? new Date(Date.now() + ms).toISOString() : null;
    muteMutation.mutate({ chatId, until });
    setMenuOpen(false);
  }

  function handleUnmute() {
    unmuteMutation.mutate(chatId);
    setMenuOpen(false);
  }

  function handleArchive() {
    archiveMutation.mutate(chatId);
    setMenuOpen(false);
  }

  function handleUnarchive() {
    unarchiveMutation.mutate(chatId);
    setMenuOpen(false);
  }

  function handlePin() {
    pinMutation.mutate(chatId);
    setMenuOpen(false);
  }

  function handleUnpin() {
    unpinMutation.mutate(chatId);
    setMenuOpen(false);
  }

  function handleClear() {
    if (window.confirm('Clear this chat for you? The other participant will still see the full history.')) {
      clearMutation.mutate(chatId);
    }
    setMenuOpen(false);
  }

  return (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0 relative">
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-xs text-text-muted">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Symmetric permissions — any member can start or end, no
              consent gate, per the Incognito System design. Works
              identically for direct and group chats. */}
          <button
            onClick={() =>
              isIncognitoActive ? endIncognitoMutation.mutate() : startIncognitoMutation.mutate()
            }
            className={`transition-colors duration-fast ${
              isIncognitoActive
                ? 'text-message-incognito'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            aria-label={isIncognitoActive ? 'End incognito' : 'Start incognito'}
            title={isIncognitoActive ? 'End incognito' : 'Start incognito'}
          >
            <Ghost size={18} />
          </button>
          {chat.type === 'group' && (
            <button
              onClick={() => setInfoOpen(true)}
              className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
              aria-label="Group info"
            >
              <Info size={18} />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-4 top-14 w-56 bg-surface-elevated border border-border rounded-lg shadow-elevation-2 z-10 py-1">
            {isPinned ? (
              <button onClick={handleUnpin} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
                <PinOff size={14} /> Unpin
              </button>
            ) : (
              <button onClick={handlePin} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
                <Pin size={14} /> Pin
              </button>
            )}
            {isMuted ? (
              <button onClick={handleUnmute} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
                <Bell size={14} /> Unmute
              </button>
            ) : (
              MUTE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleMute(preset.ms)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                >
                  <BellOff size={14} /> {preset.label}
                </button>
              ))
            )}
            {isArchived ? (
              <button onClick={handleUnarchive} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
                <ArchiveRestore size={14} /> Unarchive
              </button>
            ) : (
              <button onClick={handleArchive} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
                <Archive size={14} /> Archive
              </button>
            )}
            <button onClick={handleClear} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary">
              <Eraser size={14} /> Clear chat
            </button>
            {chat.type === 'direct' && (
              <>
                <div className="my-1 border-t border-border" />
                {isBlocked ? (
                  <button onClick={handleUnblock} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-status-error hover:bg-surface-secondary">
                    <Ban size={14} /> Unblock
                  </button>
                ) : (
                  <button onClick={handleBlock} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-status-error hover:bg-surface-secondary">
                    <Ban size={14} /> Block
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {chat.type === 'group' && (
        <GroupInfoPanel chatId={chatId} isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
      )}
    </>
  );
}
