import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useChat, useGroupMembers } from './useGroup.js';
import {
  useRemoveMember,
  usePromoteToAdmin,
  useDemoteAdmin,
  useUpdateGroupInfo,
  useDeleteGroup,
  useLeaveGroup,
} from './useGroupActions.js';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';

export function GroupInfoPanel({ chatId, isOpen, onClose }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: chat } = useChat(chatId);
  const { data: members } = useGroupMembers(chatId);
  const removeMutation = useRemoveMember(chatId);
  const promoteMutation = usePromoteToAdmin(chatId);
  const demoteMutation = useDemoteAdmin(chatId);
  const updateInfoMutation = useUpdateGroupInfo(chatId);
  const deleteMutation = useDeleteGroup(chatId);
  const leaveMutation = useLeaveGroup(chatId);
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // member.userId comes from a raw Mongoose populate (._id), not a
  // toPublicJSON()'d object (.id) — unlike most of the rest of this
  // app's API responses. Worth the comment since it's an easy mismatch
  // to introduce by copy-pasting patterns from elsewhere in this codebase.
  const myMembership = members?.find((m) => m.userId?._id === currentUserId);
  const myRole = myMembership?.role;
  const canManage = myRole === 'admin' || myRole === 'owner';
  const isOwner = myRole === 'owner';

  function startEditName() {
    setNameDraft(chat?.name || '');
    setEditingName(true);
  }

  async function saveNameChange() {
    if (nameDraft.trim()) await updateInfoMutation.mutateAsync({ name: nameDraft.trim() });
    setEditingName(false);
  }

  async function handleLeave() {
    await leaveMutation.mutateAsync();
    onClose();
    navigate('/chats');
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    onClose();
    navigate('/chats');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group info">
      <div className="flex flex-col gap-4">
        <div>
          {editingName ? (
            <div className="flex gap-2">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={100} />
              <Button className="!px-3" onClick={saveNameChange}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{chat?.name}</span>
              {canManage && (
                <button onClick={startEditName} className="text-xs text-accent-primary hover:underline">
                  Rename
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">
            Members ({members?.length ?? 0})
          </h3>
          <div className="flex flex-col gap-1">
            {members?.map((member) => {
              const user = member.userId;
              const isSelf = user?._id === currentUserId;
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary">
                      {user?.displayName}
                      {isSelf ? ' (you)' : ''}
                    </span>
                    <span className="text-xs text-text-muted uppercase">{member.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Owner-only: promote/demote — matches Group System's permission matrix */}
                    {!isSelf && isOwner && member.role === 'member' && (
                      <button
                        onClick={() => promoteMutation.mutate(user._id)}
                        className="text-xs text-accent-primary hover:underline"
                      >
                        Promote
                      </button>
                    )}
                    {!isSelf && isOwner && member.role === 'admin' && (
                      <button
                        onClick={() => demoteMutation.mutate(user._id)}
                        className="text-xs text-text-muted hover:underline"
                      >
                        Demote
                      </button>
                    )}
                    {/* Admin or owner: remove — but never the owner themselves */}
                    {!isSelf && canManage && member.role !== 'owner' && (
                      <button
                        onClick={() => removeMutation.mutate(user._id)}
                        className="text-xs text-status-error hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={handleLeave}>
            Leave group
          </Button>
          {isOwner && (
            <Button variant="danger" onClick={handleDelete}>
              Delete group
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
