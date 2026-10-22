import { Lock } from 'lucide-react';
import { WALLPAPERS } from '../../theme/chatThemes.js';

// What shows beside the list when no chat is open: the same canvas the
// conversations use, with one quiet card.
export function EmptyChatState() {
  return (
    <div
      className="chat-canvas flex-1 flex items-center justify-center px-6 animate-fade-in"
      style={WALLPAPERS[0].style()}
    >
      <div className="glass-bar max-w-xs text-center rounded-2xl border border-border shadow-elevation-2 px-6 py-7">
        <div className="mx-auto w-12 h-12 rounded-pill bg-gradient-brand flex items-center justify-center mb-3">
          <Lock size={20} className="text-white" />
        </div>
        <div className="text-base font-semibold text-text-primary">Pick a conversation</div>
        <div className="text-sm text-text-secondary mt-1">
          Choose a chat from the list, or find a friend to start a new one. Turn on Incognito in any chat for
          messages that disappear.
        </div>
      </div>
    </div>
  );
}
