import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { searchUsers } from '../../api/friends.js';
import { useSendFriendRequest, useBlockUser } from './useFriendActions.js';
import { Input } from '../../components/Input.jsx';
import { Button } from '../../components/Button.jsx';

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

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

  function handleBlock(userId, displayName) {
    if (window.confirm(`Block ${displayName}?`)) {
      blockMutation.mutate(userId, {
        onSuccess: () => {
          // Search is block-aware server-side — refetch so this result
          // actually disappears, not just its button state changing.
          queryClient.invalidateQueries({ queryKey: ['userSearch'] });
        },
      });
    }
  }

  return (
    <div>
      <Input
        placeholder="Search by username…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isFetching && <div className="text-xs text-text-muted mt-2">Searching…</div>}
      <div className="flex flex-col gap-1 mt-2">
        {results?.map(({ user, relationshipStatus }) => (
          <div
            key={user.id}
            className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary"
          >
            <span className="text-sm text-text-primary truncate">
              {user.displayName} <span className="text-text-muted">@{user.username}</span>
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {relationshipStatus === 'none' ? (
                <Button
                  variant="secondary"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => sendRequestMutation.mutate(user.id)}
                >
                  Add
                </Button>
              ) : (
                <span className="text-xs text-text-muted">{labelFor[relationshipStatus]}</span>
              )}
              <button
                onClick={() => handleBlock(user.id, user.displayName)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-fast text-text-muted hover:text-status-error p-1"
                aria-label={`Block ${user.displayName}`}
                title="Block"
              >
                <Ban size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
