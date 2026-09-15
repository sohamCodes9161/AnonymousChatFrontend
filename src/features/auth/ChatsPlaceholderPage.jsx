import { useAuth } from './useAuth.js';
import { Button } from '../../components/Button.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';

export function ChatsPlaceholderPage() {
  const { user, logout } = useAuth();
  const { preference, setThemePreference } = useTheme();

  return (
    <div className="h-screen bg-surface-primary p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-text-primary mb-4">
          You're logged in, {user?.displayName}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          This is a placeholder — the real chat list, conversation view, friends
          panel, and notifications come next. This screen exists to confirm the
          full auth chain (silent refresh, protected routing, socket connection)
          works end to end first.
        </p>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-text-secondary">Theme:</span>
          {['light', 'dark', 'system'].map((opt) => (
            <button
              key={opt}
              onClick={() => setThemePreference(opt)}
              className={`px-3 py-1 rounded-pill text-xs border transition-colors duration-fast ${
                preference === opt
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
