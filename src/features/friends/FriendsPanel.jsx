import { UserSearch } from './UserSearch.jsx';
import { FriendRequestsList } from './FriendRequestsList.jsx';
import { FriendsList } from './FriendsList.jsx';

export function FriendsPanel() {
  return (
    <div className="p-3 flex flex-col gap-5 overflow-y-auto h-full slim-scroll">
      <UserSearch />
      <FriendRequestsList />
      <FriendsList />
    </div>
  );
}
