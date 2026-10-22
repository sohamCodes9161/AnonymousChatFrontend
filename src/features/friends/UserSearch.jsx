import { confirm } from '../../stores/confirmStore.js';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Search, UserPlus } from 'lucide-react';
import { searchUsers } from '../../api/friends.js';
import { useSendFriendRequest, useBlockUser } from './useFriendActions.js';
import { Avatar } from '../../components/Avatar.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const sendRequestMutation = useSendFriendRequest();
  const blockMutation = useBlockUser();
  const queryClient = useQueryClient();

  const { data: results, isFetching } = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery).then((res) => res.data.results),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const labelFor = {
    outgoing_request: 'Pending',
    incoming_request: 'Respond below',
    friends: 'Friends',
  };

  async function handleBlock(userId, displayName) {
    if (
      await confirm({
        title: `Block ${displayName}?`,
        message: "They won't be able to message you or see when you're online.",
        confirmLabel: 'Block',
        danger: true,
      })
    ) {
      blockMutation.mutate(userId, {
        onSuccess: () => {
          // Search is block-aware server-side — refetch so this result
          // actually disappears, not just its button state changing.
          queryClient.invalidateQueries({ queryKey: ['userSearch'] });
        },
      });
    }
  }

  const searching = debouncedQuery.trim().length >= 2;

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          placeholder="Find people by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-full text-sm bg-surface-secondary text-text-primary placeholder:text-text-muted border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
      </div>
      {isFetching && <div className="text-xs text-text-muted mt-2 px-2">Searching…</div>}
      {searching && !isFetching && results?.length === 0 && (
        <div className="text-sm text-text-muted mt-3 px-2">No one found for “{debouncedQuery.trim()}”.</div>
      )}
      <div className="flex flex-col gap-0.5 mt-2">
        {results?.map(({ user, relationshipStatus }) => (
          <div
            key={user.id}
            className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-secondary transition-colors"
          >
            <Avatar name={user.displayName} src={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary truncate">{user.displayName}</div>
              <div className="text-xs text-text-muted truncate">@{user.username}</div>
            </div>
            <button
              onClick={() => handleBlock(user.id, user.displayName)}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast text-text-muted hover:text-status-error p-1.5"
              aria-label={`Block ${user.displayName}`}
              title="Block"
            >
              <Ban size={14} />
            </button>
            {relationshipStatus === 'none' ? (
              <button
                onClick={() => sendRequestMutation.mutate(user.id)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-accent-primary text-white hover:opacity-90 transition-opacity"
              >
                <UserPlus size={14} /> Add
              </button>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-secondary text-text-muted">
                {labelFor[relationshipStatus]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
