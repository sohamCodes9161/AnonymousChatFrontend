import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useChats } from './useChats.js';
import { ChatListItem } from './ChatListItem.jsx';

export function ChatList() {
  const { data: chats, isLoading } = useChats();
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (isLoading) {
    return <div className="p-4 text-sm text-text-muted">Loading chats…</div>;
  }

  if (!chats?.length) {
    return (
      <div className="p-4 text-sm text-text-muted">
        No conversations yet. Add a friend to start one.
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
