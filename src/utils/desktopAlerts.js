// Browser (OS-level) notifications for when the tab isn't in front.
// Opt-in: the user turns them on in Settings > Notifications, which is also
// the only place the permission prompt is triggered.
const KEY = 'desktopAlerts';

export const desktopAlertsSupported = typeof window !== 'undefined' && 'Notification' in window;

export function desktopAlertsEnabled() {
  if (!desktopAlertsSupported || Notification.permission !== 'granted') return false;
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

// Returns the resulting state: true (on) / false (off or permission denied).
export async function setDesktopAlerts(on) {
  if (!desktopAlertsSupported) return false;
  if (on && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  const enabled = on && Notification.permission === 'granted';
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* non-fatal */
  }
  return enabled;
}

export function showDesktopAlert({ title, body, icon, tag, path }) {
  if (!desktopAlertsEnabled()) return;
  try {
    const n = new Notification(title, { body, icon: icon || undefined, tag });
    n.onclick = () => {
      window.focus();
      if (path) window.dispatchEvent(new CustomEvent('app:navigate', { detail: { path } }));
      n.close();
    };
  } catch {
    /* some browsers throw outside a user gesture — ignore */
  }
}
