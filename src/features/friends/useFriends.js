import { useQuery } from '@tanstack/react-query';
import { listFriends, listIncomingRequests, listOutgoingRequests, getRelationshipStatus } from '../../api/friends.js';

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => listFriends().then((res) => res.data.friends),
  });
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: ['friendRequests', 'incoming'],
    queryFn: () => listIncomingRequests().then((res) => res.data.requests),
  });
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: ['friendRequests', 'outgoing'],
    queryFn: () => listOutgoingRequests().then((res) => res.data.requests),
  });
}

export function useRelationshipStatus(otherUserId) {
  return useQuery({
    queryKey: ['relationshipStatus', otherUserId],
    queryFn: () => getRelationshipStatus(otherUserId).then((res) => res.data),
    enabled: Boolean(otherUserId),
  });
}
