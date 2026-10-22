import { MessageCircle } from 'lucide-react';
import { WALLPAPERS } from '../../theme/chatThemes.js';

// Shared frame for login/register: the same dotted canvas as the chat
// view, a floating glass card and a small brand mark.
export function AuthShell({ title, subtitle, children, footer }) {
  const wallpaper = WALLPAPERS[0].style();
  return (
    <div
      className="chat-canvas min-h-screen flex items-center justify-center px-4 py-8"
      style={wallpaper}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bubble-sent w-14 h-14 rounded-2xl flex items-center justify-center mb-3">
            <MessageCircle size={26} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary mt-1 text-center">{subtitle}</p>
        </div>
        <div className="bg-surface-elevated border border-border rounded-2xl shadow-elevation-2 p-6">
          {children}
        </div>
        <p className="text-sm text-text-secondary mt-5 text-center">{footer}</p>
      </div>
    </div>
  );
}
