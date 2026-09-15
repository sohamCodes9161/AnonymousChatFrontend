import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useFriends } from './useFriends.js';
import { useCreateDirectChat } from '../chats/useCreateDirectChat.js';
import { useBlockUser } from './useFriendActions.js';
import { Button } from '../../components/Button.jsx';

export function FriendsList() {
  const { data: friends } = useFriends();
  const navigate = useNavigate();
  const createDirectChatMutation = useCreateDirectChat();
  const blockMutation = useBlockUser();

  async function handleMessage(friendId) {
    const res = await createDirectChatMutation.mutateAsync(friendId);
    navigate(`/chats/${res.data.chat._id}`);
  }

  function handleBlock(friendId, displayName) {
    // Blocking atomically removes the friendship too — this person
    // disappears from this list as soon as it succeeds.
    if (window.confirm(`Block ${displayName}? This will also remove them as a friend.`)) {
      blockMutation.mutate(friendId);
    }
  }

  if (!friends?.length) {
    return <div className="text-sm text-text-muted px-2">No friends yet — search above to add some.</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary"
        >
          <span className="text-sm text-text-primary truncate">{friend.displayName}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => handleMessage(friend.id)}>
              Message
            </Button>
            <button
              onClick={() => handleBlock(friend.id, friend.displayName)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-fast text-text-muted hover:text-status-error p-1"
              aria-label={`Block ${friend.displayName}`}
              title="Block"
            >
              <Ban size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
