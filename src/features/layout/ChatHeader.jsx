import { useState } from 'react';
import { Info, Ghost, MoreVertical, Ban, BellOff, Bell, Archive, ArchiveRestore, Pin, PinOff, Eraser, ArrowLeft, Search, Palette } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChats } from '../chats/useChats.js';
import { confirm } from '../../stores/confirmStore.js';
import { ContactInfoPanel } from './ContactInfoPanel.jsx';
import { ChatThemeDialog } from '../chats/ChatThemeDialog.jsx';
import { usePresenceStore } from '../../stores/presenceStore.js';
import { useConnectionStore } from '../../stores/connectionStore.js';
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

// Uniform 36px round hit area for every action icon on the right.
const HEADER_BTN =
  'w-9 h-9 rounded-pill flex items-center justify-center hover:bg-surfaceHover transition-colors duration-fast';

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

// searchOpen/onToggleSearch are owned by ConversationView (it needs the
// same state to render the search bar and scroll to results) — the
// header just renders the button.
export function ChatHeader({ searchOpen = false, onToggleSearch }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { data: chats } = useChats(); // already cached from the sidebar — no extra fetch
  const [infoOpen, setInfoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chat = chats?.find((c) => c._id === chatId);

  const isOnline = usePresenceStore((s) =>
    chat?.otherParticipant ? s.onlineUserIds.has(chat.otherParticipant.id) : false
  );

  const socketConnected = useConnectionStore((s) => s.connected);

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

  if (!chat) return <div className="h-[52px] border-b border-border flex-shrink-0" />;

  const title = chat.type === 'direct' ? chat.otherParticipant?.displayName : chat.name;
  // Graduated presence: online beats everything, otherwise fall back to
  // "last seen X ago" if the other person's privacy setting allows it
  // (lastSeenAt arrives as null from the backend when it doesn't —
  // this component never has to know WHY, just whether it has a value).
  // While OUR socket is down, presence is unknowable — say so instead of
  // showing a stale "Online"/"Offline".
  const subtitle =
    chat.type === 'direct'
      ? !socketConnected
        ? 'Connecting…'
        : isOnline
        ? 'Online'
        : chat.otherParticipant?.lastSeenAt
          ? formatLastSeen(chat.otherParticipant.lastSeenAt)
          : 'Offline'
      : 'Group';
  const isBlocked = relationship?.status === 'blocked_by_me';
  const isMuted = chat.membership?.mutedUntil && new Date(chat.membership.mutedUntil) > new Date();
  const isArchived = Boolean(chat.membership?.archivedAt);
  const isPinned = Boolean(chat.membership?.pinnedAt);
  const avatarUrl = chat.type === 'direct' ? chat.otherParticipant?.avatarUrl : chat.avatarUrl;
  const avatarInitial = (title || '?').charAt(0).toUpperCase();

  async function handleBlock() {
    setMenuOpen(false);
    if (
      await confirm({
        title: `Block ${chat.otherParticipant?.displayName}?`,
        message: "They won't be able to message you or see when you're online.",
        confirmLabel: 'Block',
        danger: true,
      })
    ) {
      blockMutation.mutate(chat.otherParticipant.id);
    }
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

  async function handleClear() {
    setMenuOpen(false);
    if (
      await confirm({
        title: 'Clear this chat?',
        message: 'Only your view is cleared. Everyone else keeps the full history.',
        confirmLabel: 'Clear chat',
        danger: true,
      })
    ) {
      clearMutation.mutate(chatId);
    }
  }

  return (
    <>
      <div className="glass-bar min-h-[60px] py-2 flex items-center justify-between gap-2 px-2 md:px-4 border-b border-border flex-shrink-0 relative z-10 shadow-elevation-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/chats')}
            className="md:hidden p-1.5 -ml-1 rounded-pill text-text-secondary hover:text-text-primary transition-colors duration-fast flex-shrink-0"
            aria-label="Back to chats"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => (chat.type === 'direct' ? setContactOpen(true) : setInfoOpen(true))}
            className="flex items-center gap-2.5 min-w-0 text-left rounded-md"
            aria-label={chat.type === 'direct' ? 'Contact info' : 'Group info'}
          >
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                avatarInitial
              )}
            </div>
            {chat.type === 'direct' && socketConnected && isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-pill bg-status-success border-2 border-surface-elevated" />
            )}
          </div>
          {/* Vertical stack: name on top, presence directly beneath. */}
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[15px] font-semibold text-text-primary truncate">{title}</span>
            <span
              className={`text-xs truncate ${
                chat.type === 'direct' && socketConnected && isOnline ? 'text-status-success' : 'text-text-muted'
              }`}
            >
              {subtitle}
            </span>
          </div>
          </button>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onToggleSearch && (
            <button
              onClick={onToggleSearch}
              className={`${HEADER_BTN} ${searchOpen ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
              aria-label="Search in conversation"
              title="Search in conversation"
            >
              <Search size={18} />
            </button>
          )}
          {/* Symmetric permissions — any member can start or end, no
              consent gate, per the Incognito System design. Works
              identically for direct and group chats. */}
          <button
            onClick={() =>
              isIncognitoActive ? endIncognitoMutation.mutate() : startIncognitoMutation.mutate()
            }
            className={`${HEADER_BTN} ${isIncognitoActive ? 'text-message-incognito' : 'text-text-secondary hover:text-text-primary'}`}
            aria-label={isIncognitoActive ? 'End incognito' : 'Start incognito'}
            title={isIncognitoActive ? 'End incognito' : 'Start incognito'}
          >
            <Ghost size={18} />
          </button>
          {chat.type === 'group' && (
            <button
              onClick={() => setInfoOpen(true)}
              className={`${HEADER_BTN} text-text-secondary hover:text-text-primary`}
              aria-label="Group info"
            >
              <Info size={18} />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`${HEADER_BTN} text-text-secondary hover:text-text-primary`}
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-2 md:right-4 top-full mt-1 w-56 bg-surface-elevated border border-border rounded-xl shadow-elevation-3 z-20 py-1 animate-slide-up-in">
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
            <button
              onClick={() => {
                setMenuOpen(false);
                setThemeOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
            >
              <Palette size={14} /> Chat theme
            </button>
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
      <ChatThemeDialog chatId={chatId} isOpen={themeOpen} onClose={() => setThemeOpen(false)} />
      {chat.type === 'direct' && (
        <ContactInfoPanel chat={chat} isOpen={contactOpen} onClose={() => setContactOpen(false)} />
      )}
      {chat.type === 'group' && (
        <GroupInfoPanel chatId={chatId} isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
      )}
    </>
  );
}
