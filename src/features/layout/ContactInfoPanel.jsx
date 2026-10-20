import { Ban, Eraser } from 'lucide-react';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { useRelationshipStatus } from '../friends/useFriends.js';
import { useBlockUser, useUnblockUser } from '../friends/useFriendActions.js';
import { useClearChat } from '../chats/useChatActions.js';
import { confirm } from '../../stores/confirmStore.js';

// Profile card for the other person in a direct chat. This is the
// "block from the profile view" entry point.
export function ContactInfoPanel({ chat, isOpen, onClose }) {
  const other = chat?.otherParticipant;
  const { data: relationship } = useRelationshipStatus(isOpen ? other?.id : null);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const clearMutation = useClearChat();

  if (!other) return null;
  const blockedByMe = relationship?.status === 'blocked_by_me';
  const blockedByThem = relationship?.status === 'blocked_by_them';

  async function handleBlock() {
    const ok = await confirm({
      title: `Block ${other.displayName}?`,
      message: "They won't be able to message you or see when you're online.",
      confirmLabel: 'Block',
      danger: true,
    });
    if (ok) blockMutation.mutate(other.id);
  }

  async function handleClear() {
    const ok = await confirm({
      title: 'Clear this chat?',
      message: 'Only your view is cleared. Everyone else keeps the full history.',
      confirmLabel: 'Clear chat',
      danger: true,
    });
    if (ok) {
      clearMutation.mutate(chat._id);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact info">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-20 h-20 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">
          {other.avatarUrl ? (
            <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (other.displayName || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="text-base font-semibold text-text-primary">{other.displayName}</div>
        {!other.deleted && <div className="text-sm text-text-muted">@{other.username}</div>}
        {other.bio && <p className="text-sm text-text-secondary mt-1">{other.bio}</p>}
        {other.deleted && <p className="text-sm text-text-muted">This account was deleted.</p>}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button variant="secondary" onClick={handleClear} className="flex items-center justify-center gap-2">
          <Eraser size={14} /> Clear chat
        </Button>
        {!other.deleted && !blockedByThem && (
          <Button
            variant={blockedByMe ? 'secondary' : 'danger'}
            onClick={blockedByMe ? () => unblockMutation.mutate(other.id) : handleBlock}
            disabled={blockMutation.isPending || unblockMutation.isPending}
            className="flex items-center justify-center gap-2"
          >
            <Ban size={14} /> {blockedByMe ? `Unblock ${other.displayName}` : `Block ${other.displayName}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
