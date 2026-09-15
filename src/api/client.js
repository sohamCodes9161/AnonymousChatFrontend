import { useAuthStore } from '../stores/authStore.js';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

let refreshPromise = null; // dedupes concurrent 401s into one refresh call

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_ROOT}/auth/refresh`, {
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

  const res = await fetch(`${API_ROOT}${path}`, {
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

  const res = await fetch(`${API_ROOT}${path}`, {
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
