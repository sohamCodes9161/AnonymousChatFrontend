import { UserSearch } from './UserSearch.jsx';
import { FriendRequestsList } from './FriendRequestsList.jsx';
import { FriendsList } from './FriendsList.jsx';

export function FriendsPanel() {
  return (
    <div className="p-4 flex flex-col gap-6 overflow-y-auto h-full">
      <UserSearch />
      <FriendRequestsList />
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Friends</h3>
        <FriendsList />
      </div>
    </div>
  );
}
