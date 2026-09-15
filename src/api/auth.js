import { apiFetch } from './client.js';

export function registerRequest({ username, password, displayName }) {
  return apiFetch('/auth/register', { method: 'POST', body: { username, password, displayName } });
}

export function loginRequest({ username, password }) {
  return apiFetch('/auth/login', { method: 'POST', body: { username, password } });
}

export function logoutRequest() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export function refreshRequest() {
  return apiFetch('/auth/refresh', { method: 'POST' });
}
