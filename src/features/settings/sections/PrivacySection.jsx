import { UserX, Eye, EyeOff, Users, CheckCheck } from 'lucide-react';
import { useBlockedUsers } from '../../friends/useBlockedUsers.js';
import { useUnblockUser } from '../../friends/useFriendActions.js';
import { useSettings, useUpdateSettings } from '../useSettings.js';
import { ToggleRow } from './Toggle.jsx';

const LAST_SEEN_OPTIONS = [
  { value: 'everyone', label: 'Everyone', icon: Eye },
  { value: 'friends', label: 'Friends', icon: Users },
  { value: 'nobody', label: 'Nobody', icon: EyeOff },
];

export function PrivacySection() {
  const { data: blockedUsers } = useBlockedUsers();
  const unblockMutation = useUnblockUser();
  const { data: settings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const lastSeenVisibility = settings?.privacy?.lastSeenVisibility ?? 'everyone';
  const readReceiptsEnabled = settings?.privacy?.readReceiptsEnabled ?? true;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-sm text-text-primary block mb-1.5">Who can see my last seen</label>
        <div className="flex gap-2">
          {LAST_SEEN_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => updateSettingsMutation.mutate({ privacy: { lastSeenVisibility: value } })}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md border text-xs font-medium transition-colors duration-fast ${
                lastSeenVisibility === value
                  ? 'border-accent-primary bg-accentSubtle text-accent-primary'
                  : 'border-border text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        icon={CheckCheck}
        label="Read receipts"
        description="Turning this off also hides other people's read receipts from you."
        checked={readReceiptsEnabled}
        onChange={(v) => updateSettingsMutation.mutate({ privacy: { readReceiptsEnabled: v } })}
      />

      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">
          Blocked users {blockedUsers?.length ? `(${blockedUsers.length})` : ''}
        </h3>
        {blockedUsers?.length ? (
          <div className="flex flex-col gap-1">
            {blockedUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary">
                <span className="text-sm text-text-primary truncate">{user.displayName}</span>
                <button
                  onClick={() => unblockMutation.mutate(user._id)}
                  className="flex items-center gap-1 text-xs text-accent-primary hover:underline flex-shrink-0"
                >
                  <UserX size={12} />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-muted px-2">No blocked users.</div>
        )}
      </div>
    </div>
  );
}
