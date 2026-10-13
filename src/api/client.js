import { useAuthStore } from '../stores/authStore.js';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Auth endpoints are the ONE place that relies on the httpOnly refresh
// cookie rather than just the Bearer access token. A cookie set by a
// genuinely different site (Render) for a page served from a
// different site (Vercel) is a third-party cookie from the browser's
// point of view, and modern browsers increasingly block or evict
// those by default (Safari ITP, Firefox strict ETP, Chrome's phased
// rollout) — no Set-Cookie attribute can override that from the
// server side. The fix is to make auth calls same-origin: vercel.json
// rewrites "/api/v1/auth/*" on our own domain through to the Render
// backend, so the browser only ever talks to its own origin and the
// cookie it receives is ordinary first-party storage. Everything
// else (messages, uploads, etc.) only needs the Bearer token, not the
// cookie, so it keeps calling Render directly — no reason to route
// large payloads like image uploads through an extra proxy hop.
// In dev there's no rewrite, so this just falls back to the same
// origin as every other call.
const AUTH_API_ROOT =
  import.meta.env.VITE_AUTH_API_URL || (import.meta.env.PROD ? '/api/v1' : API_ROOT);

function rootFor(path) {
  return path.startsWith('/auth') ? AUTH_API_ROOT : API_ROOT;
}

let refreshPromise = null; // dedupes concurrent 401s into one refresh call

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${rootFor('/auth/refresh')}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends the httpOnly refresh cookie
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Refresh failed');
        const body = await res.json();
        return body.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Every request goes through here. On a 401 (access token expired),
 * transparently attempts one silent refresh and retries — components
 * calling this never see the expiry, only a genuine auth failure.
 */
export async function apiFetch(path, { method = 'GET', body, isRetry = false } = {}) {
  const { accessToken, setSession, clearSession, user } = useAuthStore.getState();

  const res = await fetch(`${rootFor(path)}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    try {
      const newAccessToken = await refreshAccessToken();
      setSession(newAccessToken, user);
      return apiFetch(path, { method, body, isRetry: true });
    } catch {
      clearSession();
      throw new ApiError('AUTH_SESSION_EXPIRED', 'Your session expired — please log in again', 401);
    }
  }

  const responseBody = await res.json().catch(() => null);

  if (!res.ok || !responseBody?.success) {
    const err = responseBody?.error;
    throw new ApiError(err?.code || 'UNKNOWN', err?.message || 'Something went wrong', res.status);
  }

  return responseBody; // { success, data, pagination? }
}

/**
 * Multipart upload (avatar) — same auth/retry handling, but skips the
 * JSON Content-Type header entirely so the browser sets the correct
 * multipart boundary itself.
 */
export async function apiUpload(path, formData, { isRetry = false } = {}) {
  const { accessToken, setSession, clearSession, user } = useAuthStore.getState();

  const res = await fetch(`${rootFor(path)}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });

  if (res.status === 401 && !isRetry) {
    try {
      const newAccessToken = await refreshAccessToken();
      setSession(newAccessToken, user);
      return apiUpload(path, formData, { isRetry: true });
    } catch {
      clearSession();
      throw new ApiError('AUTH_SESSION_EXPIRED', 'Your session expired — please log in again', 401);
    }
  }

  const responseBody = await res.json().catch(() => null);
  if (!res.ok || !responseBody?.success) {
    const err = responseBody?.error;
    throw new ApiError(err?.code || 'UNKNOWN', err?.message || 'Something went wrong', res.status);
  }
  return responseBody;
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export { refreshAccessToken, API_ROOT };
