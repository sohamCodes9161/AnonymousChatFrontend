import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addGroupMember,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  updateGroupInfo,
  deleteGroupChat,
  leaveGroupChat,
} from '../../api/groups.js';

// Every action here touches both the member list and the chat list
// (name/preview can change, or the chat can disappear entirely on
// delete/leave) — invalidating both keeps everything consistent
// without hand-patching the cache for each individual action.
function useInvalidateGroup(chatId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['groupMembers', chatId] });
    queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] }); // system messages
  };
}

export function useAddGroupMember(chatId) {
  const invalidate = useInvalidateGroup(chatId);
  return useMutation({ mutationFn: (userId) => addGroupMember(chatId, userId), onSuccess: invalidate });
}

export function useRemoveMember(chatId) {
  const invalidate = useInvalidateGroup(chatId);
  return useMutation({ mutationFn: (userId) => removeMember(chatId, userId), onSuccess: invalidate });
}

export function usePromoteToAdmin(chatId) {
  const invalidate = useInvalidateGroup(chatId);
  return useMutation({ mutationFn: (userId) => promoteToAdmin(chatId, userId), onSuccess: invalidate });
}

export function useDemoteAdmin(chatId) {
  const invalidate = useInvalidateGroup(chatId);
  return useMutation({ mutationFn: (userId) => demoteAdmin(chatId, userId), onSuccess: invalidate });
}

export function useUpdateGroupInfo(chatId) {
  const invalidate = useInvalidateGroup(chatId);
  return useMutation({ mutationFn: (payload) => updateGroupInfo(chatId, payload), onSuccess: invalidate });
}

export function useDeleteGroup(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteGroupChat(chatId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chats'] }),
  });
}

export function useLeaveGroup(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroupChat(chatId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chats'] }),
  });
}
