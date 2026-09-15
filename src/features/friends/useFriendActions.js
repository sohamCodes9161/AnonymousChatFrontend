import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  blockUser,
  unblockUser,
} from '../../api/friends.js';

function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
  };
}

function useInvalidateFriendsAndBlocked() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    // A block/unblock changes relationship status — chat list previews
    // and any open conversation's send-permission depend on it too.
    queryClient.invalidateQueries({ queryKey: ['chats'] });
  };
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({ mutationFn: sendFriendRequest, onSuccess: invalidate });
}

export function useAcceptFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({ mutationFn: acceptFriendRequest, onSuccess: invalidate });
}

export function useRejectFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({ mutationFn: rejectFriendRequest, onSuccess: invalidate });
}

export function useCancelFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({ mutationFn: cancelFriendRequest, onSuccess: invalidate });
}

export function useBlockUser() {
  const invalidate = useInvalidateFriendsAndBlocked();
  return useMutation({ mutationFn: blockUser, onSuccess: invalidate });
}

export function useUnblockUser() {
  const invalidate = useInvalidateFriendsAndBlocked();
  return useMutation({ mutationFn: unblockUser, onSuccess: invalidate });
}
