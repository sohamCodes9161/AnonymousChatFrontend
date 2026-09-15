import { Outlet } from 'react-router-dom';
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

  return (
    <div className="flex h-screen bg-surface-primary">
      <Sidebar />
      <Outlet />
    </div>
  );
}
