import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useChats } from '../chats/useChats.js';
import { Sidebar } from './Sidebar.jsx';
import { useSocketEvents } from '../../sockets/useSocketEvents.js';
import { useThemeSync } from '../settings/useThemeSync.js';

export function ChatLayout() {
  // Mounted exactly once, here, at the root of the authenticated app —
  // the single place server-pushed events reach the query cache and
  // the presence/typing stores. Every screen underneath just reads
  // from those, never registers its own listeners.
  useSocketEvents();
  useThemeSync();

  const navigate = useNavigate();
  const { data: chats } = useChats();

  // Tab title carries the unread total, e.g. "(3) Incognito". Muted chats
  // don't count — same rule as banners.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    const now = Date.now();
    const total = (chats || []).reduce((sum, c) => {
      const muted = c.membership?.mutedUntil && new Date(c.membership.mutedUntil).getTime() > now;
      return muted ? sum : sum + (c.unreadCount || 0);
    }, 0);
    document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [chats]);

  // OS notification clicks ask the router (not a page reload) to open a chat.
  useEffect(() => {
    const onNavigate = (e) => e.detail?.path && navigate(e.detail.path);
    window.addEventListener('app:navigate', onNavigate);
    return () => window.removeEventListener('app:navigate', onNavigate);
  }, [navigate]);

  // Mobile has no room for sidebar + conversation side by side, so this
  // becomes a single-view stack: no chatId selected -> show the list
  // (full width); chatId selected -> show the conversation (full width,
  // with a back button in ChatHeader). From md: up, both panes are
  // always visible side by side, same as before — the chatId check only
  // drives visibility below that breakpoint.
  const { chatId } = useParams();

  return (
    <div className="flex h-[100dvh] bg-surface-primary overflow-hidden">
      <div className={`${chatId ? 'hidden' : 'flex'} md:flex w-full md:w-80 flex-shrink-0`}>
        <Sidebar />
      </div>
      <div className={`${chatId ? 'flex' : 'hidden'} md:flex flex-1 min-w-0`}>
        <Outlet />
      </div>
    </div>
  );
}
