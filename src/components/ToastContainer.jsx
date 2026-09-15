import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../stores/toastStore.js';

const VARIANT_STYLES = {
  success: { icon: CheckCircle2, className: 'bg-status-success text-white' },
  error: { icon: XCircle, className: 'bg-status-error text-white' },
  info: { icon: Info, className: 'bg-surface-elevated text-text-primary border border-border' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const { icon: Icon, className } = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-2 px-4 py-3 rounded-md shadow-elevation-2 text-sm ${className}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
