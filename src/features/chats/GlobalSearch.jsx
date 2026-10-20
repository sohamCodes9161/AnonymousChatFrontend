import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { useChats } from './useChats.js';
import { searchAllMessages } from '../../api/messages.js';
import { useAuthStore } from '../../stores/authStore.js';
import { messagePreviewText } from '../../utils/messagePreview.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const MIN = 2;

function chatTitle(c) {
  return c.type === 'direct' ? c.otherParticipant?.displayName || 'Unknown' : c.name || 'Group';
}

function Avatar({ chat }) {
  const url = chat.type === 'direct' ? chat.otherParticipant?.avatarUrl : chat.avatarUrl;
  return (
    <div className="w-9 h-9 rounded-pill bg-gradient-to-br from-accent-primary to-accent-secondary text-white flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : chatTitle(chat).charAt(0).toUpperCase()}
    </div>
  );
}

// Bold the matched part of a snippet (no HTML injection: split + render).
function Highlighted({ text, query }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  const start = Math.max(0, i - 24);
  const prefix = (start > 0 ? '…' : '') + text.slice(start, i);
  return (
    <>
      {prefix}
      <mark className="bg-transparent text-accent-primary font-semibold">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function GlobalSearch({ query, onNavigate }) {
  const navigate = useNavigate();
  const { data: chats } = useChats();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const q = query.trim();
  const debounced = useDebouncedValue(q, 300);
  const ready = debounced.length >= MIN;

  const { data: messages, isFetching } = useQuery({
    queryKey: ['globalSearch', debounced],
    queryFn: () => searchAllMessages(debounced).then((res) => res.data.messages),
    enabled: ready,
    staleTime: 30_000,
  });

  const chatMatches = useMemo(() => {
    const lower = q.toLowerCase();
    return (chats || []).filter((c) => chatTitle(c).toLowerCase().includes(lower));
  }, [chats, q]);

  const chatById = useMemo(() => new Map((chats || []).map((c) => [c._id, c])), [chats]);

  function open(chatId, messageId) {
    navigate(`/chats/${chatId}`, { state: messageId ? { focusMessageId: messageId, at: Date.now() } : undefined });
    onNavigate?.();
  }

  if (q.length < MIN) {
    return <div className="p-4 text-sm text-text-muted">Type at least {MIN} characters to search chats and messages.</div>;
  }

  const rows = (messages || []).filter((m) => chatById.has(m.chatId));

  return (
    <div className="p-2 flex flex-col gap-3">
      {chatMatches.length > 0 && (
        <section>
          <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase text-text-muted">Chats</h3>
          {chatMatches.map((c) => (
            <button
              key={c._id}
              onClick={() => open(c._id)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surfaceHover text-left"
            >
              <Avatar chat={c} />
              <span className="text-sm text-text-primary truncate">{chatTitle(c)}</span>
            </button>
          ))}
        </section>
      )}

      <section>
        <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase text-text-muted">Messages</h3>
        {(isFetching || debounced !== q) && !rows.length && (
          <div className="px-2 py-2 text-xs text-text-muted">Searching…</div>
        )}
        {ready && !isFetching && debounced === q && !rows.length && (
          <div className="px-2 py-2 text-xs text-text-muted">No messages match “{q}”.</div>
        )}
        {rows.map((m) => {
          const chat = chatById.get(m.chatId);
          const who = m.senderId === currentUserId ? 'You' : chat.type === 'direct' ? chatTitle(chat) : null;
          return (
            <button
              key={m.id}
              onClick={() => open(m.chatId, m.id)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surfaceHover text-left"
            >
              <Avatar chat={chat} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{chatTitle(chat)}</span>
                  <span className="text-[11px] text-text-muted flex-shrink-0">
                    {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-xs text-text-secondary truncate">
                  {who && <span className="text-text-muted">{who}: </span>}
                  <Highlighted text={messagePreviewText(m)} query={q} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {!chatMatches.length && !rows.length && !isFetching && debounced !== q && (
        <div className="flex items-center gap-2 px-2 text-xs text-text-muted">
          <MessageSquare size={12} /> Searching…
        </div>
      )}
    </div>
  );
}
