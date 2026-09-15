import { Sun, Moon, Monitor, UserX } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useBlockedUsers } from '../friends/useBlockedUsers.js';
import { useUnblockUser } from '../friends/useFriendActions.js';
import { Modal } from '../../components/Modal.jsx';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsModal({ isOpen, onClose }) {
  const { preference, setThemePreference } = useTheme();
  const { data: blockedUsers } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Theme</h3>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setThemePreference(value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-md border text-xs font-medium transition-colors duration-fast ${
                  preference === value
                    ? 'border-accent-primary bg-accentSubtle text-accent-primary'
                    : 'border-border text-text-secondary hover:bg-surface-secondary'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">
            Blocked users {blockedUsers?.length ? `(${blockedUsers.length})` : ''}
          </h3>
          {blockedUsers?.length ? (
            <div className="flex flex-col gap-1">
              {blockedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary"
                >
                  <span className="text-sm text-text-primary truncate">{user.displayName}</span>
                  <button
                    onClick={() => unblockMutation.mutate(user._id)}
                    className="flex items-center gap-1 text-xs text-accent-primary hover:underline flex-shrink-0"
                  >
                    <UserX size={12} />
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted px-2">No blocked users.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
