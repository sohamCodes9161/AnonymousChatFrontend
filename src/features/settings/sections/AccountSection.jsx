import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth.js';
import { useAuthStore } from '../../../stores/authStore.js';
import { disconnectSocket } from '../../../sockets/socketClient.js';
import { deleteAccount } from '../../../api/users.js';
import { Modal } from '../../../components/Modal.jsx';
import { Input } from '../../../components/Input.jsx';
import { Button } from '../../../components/Button.jsx';

function DeleteAccountDialog({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function close() {
    if (busy) return;
    setPassword('');
    setError(null);
    onClose();
  }

  async function handleDelete(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      disconnectSocket();
      useAuthStore.getState().clearSession();
      queryClient.clear();
    } catch (err) {
      setError(err.message || 'Could not delete the account');
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Delete account">
      <form onSubmit={handleDelete} className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          This permanently deletes your account. Every message you sent and every photo you shared is erased, you
          leave all groups, and your friends and settings are removed. This can't be undone.
        </p>
        <Input
          label="Enter your password to confirm"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!password || busy}>
            {busy ? 'Deleting…' : 'Delete my account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AccountSection() {
  const { logout } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={logout} className="flex items-center justify-center gap-2">
        <LogOut size={14} /> Log out
      </Button>
      <div className="border-t border-border pt-3">
        <h3 className="text-xs font-semibold text-status-error uppercase mb-1">Danger zone</h3>
        <p className="text-xs text-text-muted mb-2">Deleting your account is permanent.</p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)} className="flex items-center justify-center gap-2 w-full">
          <Trash2 size={14} /> Delete account
        </Button>
      </div>
      <DeleteAccountDialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
