import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';

/**
 * "Delete for everyone" is offered only when every selected message is
 * yours (the server only lets the sender delete for everyone); "Delete
 * for me" is always available and only hides them from your own view.
 */
export function DeleteMessagesDialog({ isOpen, count, canDeleteForEveryone, busy, onDeleteForMe, onDeleteForEveryone, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title={count === 1 ? 'Delete message?' : `Delete ${count} messages?`}>
      <div className="flex flex-col gap-2">
        {canDeleteForEveryone && (
          <Button variant="danger" onClick={onDeleteForEveryone} disabled={busy} className="w-full">
            Delete for everyone
          </Button>
        )}
        <Button variant="secondary" onClick={onDeleteForMe} disabled={busy} className="w-full">
          Delete for me
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy} className="w-full">
          Cancel
        </Button>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        {canDeleteForEveryone
          ? 'Everyone will see “Message deleted”. Deleting for yourself only hides it on your side.'
          : 'Deleting for yourself only hides it on your side. You can only delete for everyone messages you sent.'}
      </p>
    </Modal>
  );
}
