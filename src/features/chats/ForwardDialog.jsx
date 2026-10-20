import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { useChats } from './useChats.js';
import { forwardMessages } from '../../api/messages.js';
import { toast } from '../../stores/toastStore.js';

const MAX_TARGETS = 5;

function chatTitle(c) {
  return c.type === 'direct' ? c.otherParticipant?.displayName || 'Unknown' : c.name || 'Group';
}

export function ForwardDialog({ isOpen, sourceChatId, messageIds, onClose, onDone }) {
  const { data: chats } = useChats();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (chats || [])
      .filter((c) => !(c.type === 'direct' && c.otherParticipant?.deleted))
      .filter((c) => !q || chatTitle(c).toLowerCase().includes(q));
  }, [chats, query]);

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TARGETS) {
        toast.info(`You can forward to ${MAX_TARGETS} chats at a time`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function reset() {
    setQuery('');
    setSelected([]);
  }

  async function handleSend() {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      const res = await forwardMessages(sourceChatId, messageIds, selected);
      const { forwardedTo = [], failures = [] } = res.data;
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      if (failures.length && !forwardedTo.length) toast.error(failures[0].message);
      else if (failures.length) toast.info(`Forwarded to ${forwardedTo.length}; ${failures.length} failed`);
      else toast.success(forwardedTo.length === 1 ? 'Forwarded' : `Forwarded to ${forwardedTo.length} chats`);
      reset();
      onDone?.();
    } catch (err) {
      toast.error(err?.message || 'Could not forward');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={`Forward ${messageIds.length === 1 ? 'message' : `${messageIds.length} messages`}`}>
      <Input placeholder="Search chats…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="mt-2 max-h-64 overflow-y-auto flex flex-col gap-0.5">
        {candidates.map((c) => {
          const on = selected.includes(c._id);
          const avatar = c.type === 'direct' ? c.otherParticipant?.avatarUrl : c.avatarUrl;
          return (
            <button
              key={c._id}
              type="button"
              onClick={() => toggle(c._id)}
              aria-pressed={on}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-secondary text-left"
            >
              <div className="w-9 h-9 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : chatTitle(c).charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 min-w-0 truncate text-sm text-text-primary">{chatTitle(c)}</span>
              <span
                className={`w-5 h-5 rounded-pill border flex items-center justify-center flex-shrink-0 ${
                  on ? 'bg-accent-primary border-accent-primary text-white' : 'border-border'
                }`}
              >
                {on && <Check size={12} />}
              </span>
            </button>
          );
        })}
        {!candidates.length && <div className="text-sm text-text-muted px-2 py-4 text-center">No chats found</div>}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={!selected.length || busy}>
          {busy ? 'Sending…' : selected.length ? `Send to ${selected.length}` : 'Send'}
        </Button>
      </div>
    </Modal>
  );
}
