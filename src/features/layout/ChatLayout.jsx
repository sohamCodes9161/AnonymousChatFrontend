import { Outlet, useParams } from 'react-router-dom';
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
