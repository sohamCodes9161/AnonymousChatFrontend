import { useState } from 'react';
import { UserPlus, Settings, Search, X } from 'lucide-react';
import { GlobalSearch } from '../chats/GlobalSearch.jsx';
import { ChatList } from '../chats/ChatList.jsx';
import { FriendsPanel } from '../friends/FriendsPanel.jsx';
import { NotificationBell } from '../notifications/NotificationBell.jsx';
import { CreateGroupModal } from '../groups/CreateGroupModal.jsx';
import { SettingsPanel } from '../settings/SettingsPanel.jsx';
import { useAuth } from '../auth/useAuth.js';

export function Sidebar() {
  const [tab, setTab] = useState('chats');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [settingsSection, setSettingsSection] = useState(null); // null = closed
  const { user, logout } = useAuth();
  const initial = (user?.displayName || '?').charAt(0).toUpperCase();

  return (
    <div className="w-full flex-shrink-0 border-r border-border flex flex-col h-full bg-surface-primary">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => setSettingsSection('profile')}
          className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity duration-fast"
          aria-label="Edit profile"
        >
          <div className="w-8 h-8 rounded-pill bg-accentSubtle text-accent-primary flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <span className="font-semibold text-text-primary text-sm truncate">{user?.displayName}</span>
        </button>
        <div className="flex items-center gap-3 flex-shrink-0">
          <NotificationBell />
          <button
            onClick={() => setSettingsSection('privacy')}
            className="text-text-secondary hover:text-text-primary transition-colors duration-fast"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={logout}
            className="text-xs text-text-muted hover:text-text-primary transition-colors duration-fast"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="flex items-center border-b border-border">
        {['chats', 'friends'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors duration-fast ${
              tab === t
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
        {tab === 'chats' && (
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="px-3 text-text-secondary hover:text-accent-primary transition-colors duration-fast"
            aria-label="Create group"
          >
            <UserPlus size={16} />
          </button>
        )}
      </div>

      {tab === 'chats' && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              placeholder="Search chats and messages"
              aria-label="Search chats and messages"
              className="w-full pl-8 pr-8 py-1.5 rounded-pill text-sm bg-surface-secondary text-text-primary placeholder:text-text-muted border border-transparent focus-visible:outline-none focus-visible:border-accent-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab !== 'chats' ? (
          <FriendsPanel />
        ) : search.trim() ? (
          <GlobalSearch query={search} onNavigate={() => setSearch('')} />
        ) : (
          <ChatList />
        )}
      </div>

      <CreateGroupModal isOpen={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
      <SettingsPanel
        isOpen={settingsSection !== null}
        initialSection={settingsSection || 'profile'}
        onClose={() => setSettingsSection(null)}
      />
    </div>
  );
}
