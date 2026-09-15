import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { updateSettings } from '../api/settings.js';
import { useAuthStore } from '../stores/authStore.js';

const ThemeContext = createContext(null);

function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }) {
  // Doesn't decide the theme from scratch — reads what the blocking
  // script in index.html already set on <html data-theme="...">.
  const [preference, setPreference] = useState(
    () => localStorage.getItem('theme-preference') || 'system'
  );

  const applyTheme = useCallback((pref) => {
    const resolved = resolveTheme(pref);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const setThemePreference = useCallback(
    (pref) => {
      setPreference(pref);
      localStorage.setItem('theme-preference', pref);
      applyTheme(pref);

      // Push to the server so this preference follows the user to a
      // new device — only when actually logged in; a theme toggle on
      // the login page has no session to sync to yet, and forcing the
      // attempt would just trigger a pointless refresh cycle in
      // apiFetch's 401 handling.
      if (useAuthStore.getState().accessToken) {
        updateSettings({ themePreference: pref }).catch(() => {
          // Best-effort — a failed sync just means the next login
          // re-syncs it; never worth surfacing an error for this.
        });
      }
    },
    [applyTheme]
  );

  // If preference is 'system', stay reactive to OS-level changes while open.
  useEffect(() => {
    if (preference !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference, applyTheme]);

  return (
    <ThemeContext.Provider value={{ preference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
