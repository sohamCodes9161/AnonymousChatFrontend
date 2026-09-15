import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { connectSocket } from '../../sockets/socketClient.js';
import { refreshRequest } from '../../api/auth.js';
import { getProfile } from '../../api/users.js';
import { decodeJwtPayload } from '../../utils/decodeJwt.js';

/**
 * Runs once on app load. A hard refresh always loses the in-memory
 * access token (deliberate — see Authentication module design), so on
 * every load we attempt to silently redeem the httpOnly refresh cookie.
 * If it succeeds, we don't get a user object back from /auth/refresh
 * (only a token), so we decode the token's `sub` claim and fetch the
 * profile ourselves — a small workaround for not having a dedicated
 * "who am I" endpoint.
 */
export function AuthBootstrap({ children }) {
  const { setSession, finishInitializing, isInitializing } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const refreshRes = await refreshRequest();
        const accessToken = refreshRes.data.accessToken;
        const payload = decodeJwtPayload(accessToken);
        if (!payload?.sub) throw new Error('Malformed token');

        // Token must be in the store BEFORE getProfile fires, or that
        // request goes out with no Authorization header and triggers
        // a redundant second refresh via apiFetch's own retry logic.
        setSession(accessToken, null);

        const profileRes = await getProfile(payload.sub);
        if (cancelled) return;

        setSession(accessToken, profileRes.data.user);
        connectSocket(accessToken);
      } catch {
        // No valid session — that's a normal, expected outcome for a
        // logged-out visitor, not an error to surface.
        if (!cancelled) finishInitializing();
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-primary">
        <div className="text-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  return children;
}
