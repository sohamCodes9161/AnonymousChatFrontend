import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSettings } from '../../api/settings.js';
import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Runs once per session — pulls the server's stored theme preference
 * and applies it if it differs from what's currently active. This is
 * the "new device" half of theme sync; the "push local changes up"
 * half already happens inside ThemeProvider's setThemePreference.
 */
export function useThemeSync() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((res) => res.data.settings),
  });
  const { preference, setThemePreference } = useTheme();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!settings || hasSynced.current) return;
    hasSynced.current = true;

    if (settings.themePreference && settings.themePreference !== preference) {
      setThemePreference(settings.themePreference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);
}
