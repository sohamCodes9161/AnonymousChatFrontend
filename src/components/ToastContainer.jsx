import { CheckCircle2, XCircle, Info, X, UserPlus, UserCheck, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores/toastStore.js';

const VARIANTS = {
  success: { icon: CheckCircle2, chip: 'bg-status-success text-white' },
  error: { icon: XCircle, chip: 'bg-status-error text-white' },
  info: { icon: Info, chip: 'bg-accent-primary text-white' },
};

const KIND_ICONS = { message: MessageCircle, friend: UserPlus, accepted: UserCheck, group: Users };

function Timer({ ms }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-3 right-3 bottom-0 h-0.5 rounded-pill bg-accent-primary/0 overflow-hidden"
    >
      <span
        className="block h-full w-full bg-accent-primary origin-left opacity-60"
        style={{ animation: `toast-timer ${ms}ms linear forwards` }}
      />
    </span>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const navigate = useNavigate();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-3 left-3 right-3 md:left-auto md:right-4 md:w-[22rem] z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {toasts.map((t) => {
        if (t.rich) {
          const KindIcon = KIND_ICONS[t.kind] || MessageCircle;
          const open = () => {
            if (t.chatId) navigate(`/chats/${t.chatId}`, t.messageId ? { state: { focusMessageId: t.messageId, at: Date.now() } } : undefined);
            removeToast(t.id);
          };
          return (
            <div
              key={t.id}
              role="status"
              className="glass-bar pointer-events-auto relative flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl border border-border shadow-elevation-3 animate-toast-in cursor-pointer overflow-hidden"
              onClick={open}
            >
              <div className="w-10 h-10 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : t.initial ? (
                  t.initial
                ) : (
                  <KindIcon size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-semibold text-text-primary truncate">{t.title}</div>
                {t.body && <div className="text-[13px] text-text-secondary truncate mt-0.5">{t.body}</div>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                className="flex-shrink-0 w-7 h-7 rounded-pill text-text-muted hover:text-text-primary hover:bg-surfaceHover flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
              <Timer ms={t.duration} />
            </div>
          );
        }
        const { icon: Icon, chip } = VARIANTS[t.variant] || VARIANTS.info;
        return (
          <div
            key={t.id}
            role="status"
            className="glass-bar pointer-events-auto relative flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl border border-border shadow-elevation-3 animate-toast-in overflow-hidden"
          >
            <span className={`w-7 h-7 rounded-pill flex items-center justify-center flex-shrink-0 ${chip}`}>
              <Icon size={15} />
            </span>
            <span className="flex-1 text-sm text-text-primary">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 w-7 h-7 rounded-pill text-text-muted hover:text-text-primary hover:bg-surfaceHover flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
            <Timer ms={t.duration} />
          </div>
        );
      })}
    </div>
  );
}
