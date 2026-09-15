// Client-side JWT payload extraction — NOT verification. We trust this
// token because we just received it from our own /auth/refresh call;
// this only exists to pull the userId (sub) out without a dedicated
// "who am I" endpoint. The server remains the sole source of truth for
// whether the token is actually valid.
export function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
