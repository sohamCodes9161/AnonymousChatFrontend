import { apiFetch, apiUpload } from './client.js';

export function getProfile(userId) {
  return apiFetch(`/users/${userId}`);
}

export function updateProfile(payload) {
  return apiFetch('/users/me', { method: 'PATCH', body: payload });
}

export function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiUpload('/users/me/avatar', formData);
}

// Permanently deletes the account. Password-confirmed server-side.
export function deleteAccount(password) {
  return apiFetch('/users/me', { method: 'DELETE', body: { password } });
}
