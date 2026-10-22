import { useState } from 'react';
import { UserPlus, UserCheck, Users, MonitorSmartphone } from 'lucide-react';
import { desktopAlertsSupported, desktopAlertsEnabled, setDesktopAlerts } from '../../../utils/desktopAlerts.js';
import { toast } from '../../../stores/toastStore.js';
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
  const [desktopOn, setDesktopOn] = useState(desktopAlertsEnabled());

  async function toggleDesktop(next) {
    const result = await setDesktopAlerts(next);
    setDesktopOn(result);
    if (next && !result) toast.error('Notifications are blocked. Allow them in your browser site settings.');
  }

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
      {desktopAlertsSupported && (
        <div className="mt-3 pt-3 border-t border-border">
          <ToggleRow
            icon={MonitorSmartphone}
            label="Alerts when this tab is in the background"
            description="Shows a system notification for new messages while you're in another tab or window. Incognito messages never show their content."
            checked={desktopOn}
            onChange={toggleDesktop}
          />
        </div>
      )}
      <p className="text-xs text-text-muted px-2 mt-2">
        These control which items appear in your notification bell. To silence a single chat, use Mute in its menu.
      </p>
    </div>
  );
}
