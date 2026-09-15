import { apiFetch } from './client.js';

export function listFriends() {
  return apiFetch('/friends');
}

export function listIncomingRequests() {
  return apiFetch('/friends/requests/incoming');
}

export function listOutgoingRequests() {
  return apiFetch('/friends/requests/outgoing');
}

export function getRelationshipStatus(userId) {
  return apiFetch(`/friends/status/${userId}`);
}

export function sendFriendRequest(toUserId) {
  return apiFetch('/friends/requests', { method: 'POST', body: { toUserId } });
}

export function acceptFriendRequest(requestId) {
  return apiFetch(`/friends/requests/${requestId}/accept`, { method: 'POST' });
}

export function rejectFriendRequest(requestId) {
  return apiFetch(`/friends/requests/${requestId}/reject`, { method: 'POST' });
}

export function cancelFriendRequest(requestId) {
  return apiFetch(`/friends/requests/${requestId}`, { method: 'DELETE' });
}

export function searchUsers(query) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
}

export function blockUser(userId) {
  return apiFetch(`/friends/${userId}/block`, { method: 'POST' });
}

export function unblockUser(userId) {
  return apiFetch(`/friends/${userId}/block`, { method: 'DELETE' });
}

export function listBlockedUsers() {
  return apiFetch('/friends/blocked');
}
