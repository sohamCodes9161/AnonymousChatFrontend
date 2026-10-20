import { useEffect } from 'react';
import { useConfirmStore } from '../stores/confirmStore.js';
import { Button } from './Button.jsx';

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  useEffect(() => {
    if (!request) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') settle(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, settle]);

  if (!request) return null;
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = request;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-surface-overlay px-4"
      onClick={() => settle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface-elevated rounded-lg shadow-elevation-3 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => settle(false)}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
