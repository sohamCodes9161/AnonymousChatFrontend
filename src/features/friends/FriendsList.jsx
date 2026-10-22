import { confirm } from '../../stores/confirmStore.js';
import { useNavigate } from 'react-router-dom';
import { Ban, MessageCircle, Users } from 'lucide-react';
import { useFriends } from './useFriends.js';
import { useCreateDirectChat } from '../chats/useCreateDirectChat.js';
import { useBlockUser } from './useFriendActions.js';
import { Avatar } from '../../components/Avatar.jsx';
import { SectionHeader } from './SectionHeader.jsx';

export function FriendsList() {
  const { data: friends } = useFriends();
  const navigate = useNavigate();
  const createDirectChatMutation = useCreateDirectChat();
  const blockMutation = useBlockUser();

  async function handleMessage(friendId) {
    const res = await createDirectChatMutation.mutateAsync(friendId);
    navigate(`/chats/${res.data.chat._id}`);
  }

  async function handleBlock(friendId, displayName) {
    // Blocking atomically removes the friendship too — this person
    // disappears from this list as soon as it succeeds.
    if (
      await confirm({
        title: `Block ${displayName}?`,
        message: 'This also removes them as a friend.',
        confirmLabel: 'Block',
        danger: true,
      })
    ) {
      blockMutation.mutate(friendId);
    }
  }

  if (!friends?.length) {
    return (
      <section>
        <SectionHeader title="Friends" />
        <div className="flex flex-col items-center text-center px-6 py-8">
          <div className="w-12 h-12 rounded-full bg-accentSubtle text-accent-primary flex items-center justify-center mb-3">
            <Users size={22} />
          </div>
          <div className="text-sm font-medium text-text-primary">No friends yet</div>
          <div className="text-xs text-text-muted mt-1">Search by username above to send your first request.</div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Friends" count={friends.length} />
      <div className="flex flex-col gap-0.5">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-secondary transition-colors"
          >
            <Avatar name={friend.displayName} src={friend.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary truncate">{friend.displayName}</div>
              {friend.username && <div className="text-xs text-text-muted truncate">@{friend.username}</div>}
            </div>
            <button
              onClick={() => handleBlock(friend.id, friend.displayName)}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast text-text-muted hover:text-status-error p-1.5"
              aria-label={`Block ${friend.displayName}`}
              title="Block"
            >
              <Ban size={14} />
            </button>
            <button
              onClick={() => handleMessage(friend.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-accentSubtle text-accent-primary hover:bg-accent-primary hover:text-white transition-colors"
              aria-label={`Message ${friend.displayName}`}
              title="Message"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
