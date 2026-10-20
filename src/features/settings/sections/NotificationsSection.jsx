import { UserPlus, UserCheck, Users } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../useSettings.js';
import { ToggleRow } from './Toggle.jsx';

const ITEMS = [
  { key: 'friendRequests', label: 'Friend requests', icon: UserPlus },
  { key: 'friendAccepted', label: 'Accepted requests', icon: UserCheck },
  { key: 'groupEvents', label: 'Group activity (added to a group, role changes)', icon: Users },
];

export function NotificationsSection() {
  const { data: settings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const prefs = settings?.notificationPreferences || {};

  return (
    <div className="flex flex-col gap-1">
      {ITEMS.map(({ key, label, icon }) => (
        <ToggleRow
          key={key}
          icon={icon}
          label={label}
          checked={prefs[key] !== false}
          onChange={(v) => updateSettingsMutation.mutate({ notificationPreferences: { [key]: v } })}
        />
      ))}
      <p className="text-xs text-text-muted px-2 mt-2">
        These control which items appear in your notification bell. To silence a single chat, use Mute in its menu.
      </p>
    </div>
  );
}
