import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../../theme/ThemeProvider.jsx';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function AppearanceSection() {
  const { preference, setThemePreference } = useTheme();
  return (
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
  );
}
