import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useChat, useGroupMembers } from './useGroup.js';
import {
  useRemoveMember,
  usePromoteToAdmin,
  useDemoteAdmin,
  useUpdateGroupInfo,
  useUploadGroupAvatar,
  useDeleteGroup,
  useLeaveGroup,
} from './useGroupActions.js';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { toast } from '../../stores/toastStore.js';

export function GroupInfoPanel({ chatId, isOpen, onClose }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: chat } = useChat(chatId);
  const { data: members } = useGroupMembers(chatId);
  const removeMutation = useRemoveMember(chatId);
  const promoteMutation = usePromoteToAdmin(chatId);
  const demoteMutation = useDemoteAdmin(chatId);
  const updateInfoMutation = useUpdateGroupInfo(chatId);
  const uploadAvatarMutation = useUploadGroupAvatar(chatId);
  const deleteMutation = useDeleteGroup(chatId);
  const leaveMutation = useLeaveGroup(chatId);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } catch (err) {
      toast.error(err.message || 'Failed to upload group avatar');
    } finally {
      e.target.value = '';
    }
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

  const initial = (chat?.name || '?').charAt(0).toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group info">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => canManage && fileInputRef.current?.click()}
            disabled={!canManage}
            className="relative w-20 h-20 rounded-pill bg-accentSubtle text-accent-primary flex items-center justify-center text-2xl font-semibold overflow-hidden group disabled:cursor-default"
            aria-label="Change group avatar"
          >
            {chat?.avatarUrl ? (
              <img src={chat.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
            {canManage && (
              <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-fast flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            )}
          </button>
          {canManage && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          )}
          {uploadAvatarMutation.isPending && <span className="text-xs text-text-muted">Uploading…</span>}
        </div>

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
