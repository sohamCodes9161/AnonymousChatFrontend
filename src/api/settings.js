import { apiFetch } from './client.js';

export function getSettings() {
  return apiFetch('/settings');
}

export function updateSettings(payload) {
  return apiFetch('/settings', { method: 'PATCH', body: payload });
}
