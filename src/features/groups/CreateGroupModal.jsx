import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/Input.jsx';
import { Button } from '../../components/Button.jsx';
import { useFriends } from '../friends/useFriends.js';
import { createGroupChat } from '../../api/chats.js';

export function CreateGroupModal({ isOpen, onClose }) {
  const { data: friends } = useFriends();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setName('');
    setSelectedIds(new Set());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createGroupChat(name.trim(), [...selectedIds]);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      reset();
      onClose();
      navigate(`/chats/${res.data.chat._id}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create group">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">Add friends</label>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {friends?.length ? (
              friends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-secondary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(friend.id)}
                    onChange={() => toggle(friend.id)}
                    className="accent-accent-primary"
                  />
                  <span className="text-sm text-text-primary">{friend.displayName}</span>
                </label>
              ))
            ) : (
              <div className="text-sm text-text-muted px-2">Add some friends first.</div>
            )}
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? 'Creating…' : 'Create group'}
        </Button>
      </form>
    </Modal>
  );
}
