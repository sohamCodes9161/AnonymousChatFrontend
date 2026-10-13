import { MessageCircle } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-pill bg-accentSubtle flex items-center justify-center animate-float-slow">
        <div className="w-14 h-14 rounded-pill bg-gradient-brand flex items-center justify-center glow-accent">
          <MessageCircle size={24} className="text-white" />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-text-primary">No conversation selected</div>
        <div className="text-sm text-text-muted mt-1">
          Pick a chat from the list, or add a friend to start a new one.
        </div>
      </div>
    </div>
  );
}
