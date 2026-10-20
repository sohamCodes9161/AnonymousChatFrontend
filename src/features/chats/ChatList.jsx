import { useState } from 'react';
import { ChevronDown, ChevronRight, MessagesSquare } from 'lucide-react';
import { useChats } from './useChats.js';
import { ChatListItem } from './ChatListItem.jsx';

export function ChatList() {
  const { data: chats, isLoading } = useChats();
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-2" aria-busy="true" aria-label="Loading chats">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="shimmer w-10 h-10 rounded-pill flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="shimmer h-3 rounded" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
              <div className="shimmer h-2.5 rounded" style={{ width: `${60 + ((i * 11) % 30)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!chats?.length) {
    return (
      <div className="flex flex-col items-center text-center gap-3 px-6 py-12 animate-fade-in">
        <div className="w-14 h-14 rounded-pill bg-accentSubtle flex items-center justify-center">
          <MessagesSquare size={22} className="text-accent-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">No conversations yet</div>
          <div className="text-xs text-text-muted mt-1">
            Find people in the Friends tab, or create a group with the + button above.
          </div>
        </div>
      </div>
    );
  }

  const activeChats = chats.filter((c) => !c.membership?.archivedAt);
  const archivedChats = chats.filter((c) => c.membership?.archivedAt);

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {activeChats.map((chat) => (
        <ChatListItem key={chat._id} chat={chat} />
      ))}

      {archivedChats.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary"
          >
            {archivedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Archived ({archivedChats.length})
          </button>
          {archivedOpen && archivedChats.map((chat) => <ChatListItem key={chat._id} chat={chat} />)}
        </div>
      )}
    </div>
  );
}
