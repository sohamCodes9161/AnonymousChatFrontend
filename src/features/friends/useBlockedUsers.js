import { useQuery } from '@tanstack/react-query';
import { listBlockedUsers } from '../../api/friends.js';

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => listBlockedUsers().then((res) => res.data.users),
  });
}
