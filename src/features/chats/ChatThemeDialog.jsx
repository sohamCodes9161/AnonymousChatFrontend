import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';
import { useChatThemeStore } from '../../stores/chatThemeStore.js';
import { WALLPAPERS, BUBBLE_COLORS, DEFAULT_THEME, resolveTheme } from '../../theme/chatThemes.js';

export function ChatThemeDialog({ chatId, isOpen, onClose }) {
  const themeGlobal = useChatThemeStore((s) => s.global);
  const override = useChatThemeStore((s) => s.byChat[chatId]);
  const hasOverride = Boolean(override && Object.keys(override).length);
  const theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeGlobal, ...override }), [themeGlobal, override]);
  const setTheme = useChatThemeStore((s) => s.setTheme);
  const resetChat = useChatThemeStore((s) => s.resetChat);
  const [scope, setScope] = useState('chat');
  const resolved = resolveTheme(theme);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat theme">
      <div
        className="chat-canvas rounded-xl p-3 mb-4 flex flex-col gap-1.5"
        style={{ ...resolved.wallpaperStyle, ...resolved.bubbleVars }}
        aria-hidden="true"
      >
        <div className="bubble-received self-start rounded-[18px] rounded-bl-[6px] px-3 py-1.5 text-sm">
          How does this look?
        </div>
        <div className="bubble-sent self-end rounded-[18px] rounded-br-[6px] px-3 py-1.5 text-sm">
          Pretty good
        </div>
      </div>

      <h3 className="text-xs font-semibold text-text-muted mb-2">Wallpaper</h3>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            onClick={() => setTheme(chatId, { wallpaper: w.id }, scope)}
            aria-pressed={theme.wallpaper === w.id}
            aria-label={w.label}
            className={`relative h-14 rounded-lg chat-canvas border-2 ${
              theme.wallpaper === w.id ? 'border-accent-primary' : 'border-border'
            }`}
            style={w.style()}
          >
            <span className="absolute bottom-0.5 left-0 right-0 text-[10px] text-text-secondary">{w.label}</span>
          </button>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-text-muted mb-2">Your bubbles</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {BUBBLE_COLORS.map((b) => (
          <button
            key={b.id}
            onClick={() => setTheme(chatId, { bubble: b.id }, scope)}
            aria-pressed={theme.bubble === b.id}
            aria-label={b.label}
            title={b.label}
            className="w-9 h-9 rounded-pill flex items-center justify-center text-white ring-offset-2 ring-offset-surface-elevated"
            style={{
              backgroundImage: `linear-gradient(140deg, ${b.a}, ${b.b})`,
              boxShadow: theme.bubble === b.id ? `0 0 0 2px ${b.a}` : undefined,
            }}
          >
            {theme.bubble === b.id && <Check size={16} />}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex p-0.5 rounded-pill bg-surface-secondary text-xs font-medium" role="radiogroup" aria-label="Apply to">
          {[
            ['chat', 'This chat'],
            ['all', 'All chats'],
          ].map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={scope === value}
              onClick={() => setScope(value)}
              className={`px-3 py-1 rounded-pill ${scope === value ? 'bg-surface-elevated text-text-primary shadow-elevation-1' : 'text-text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {hasOverride && (
          <Button variant="ghost" onClick={() => resetChat(chatId)}>
            Reset this chat
          </Button>
        )}
      </div>
    </Modal>
  );
}
