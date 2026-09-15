import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore.js';
import { usePresenceStore } from '../stores/presenceStore.js';
import { useTypingStore } from '../stores/typingStore.js';
import { getSocket } from './socketClient.js';

export function useSocketEvents() {
  const queryClient = useQueryClient();
  // Depend on the boolean, not the raw token — the token itself
  // changes on every silent refresh (~every 14 min), which would
  // otherwise tear down and rebind every listener needlessly.
  const isAuthenticated = useAuthStore((s) => Boolean(s.accessToken));

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleMessageNew(message) {
      queryClient.setQueryData(['messages', message.chatId], (old) => {
        if (!old) return old; // conversation not currently open — chat list invalidation below covers the preview
        const exists = old.messages.some((m) => m.id === message.id);
        return {
          ...old,
          messages: exists
            ? old.messages.map((m) => (m.id === message.id ? message : m))
            : [...old.messages, message],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }

    function handleMessageEdited(message) {
      queryClient.setQueryData(['messages', message.chatId], (old) => {
        if (!old) return old;
        return { ...old, messages: old.messages.map((m) => (m.id === message.id ? message : m)) };
      });
    }

    function handleMessageDeleted({ id, chatId, deletedAt }) {
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === id ? { ...m, status: 'deleted', content: { text: null }, deletedAt } : m
          ),
        };
      });
    }

    const handlePresenceOnline = ({ userId }) => usePresenceStore.getState().setOnline(userId);
    const handlePresenceOffline = ({ userId }) => usePresenceStore.getState().setOffline(userId);
    const handleTypingStart = ({ chatId, userId }) =>
      useTypingStore.getState().setTyping(chatId, userId);
    const handleTypingStop = ({ chatId, userId }) =>
      useTypingStore.getState().clearTyping(chatId, userId);

    function invalidateFriendsAndNotifications() {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    function invalidateChatsAndNotifications() {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    // Incognito — direct cache writes, not invalidation, so the banner
    // and grace-period countdown update instantly rather than waiting
    // on a refetch round-trip.
    function handleIncognitoStarted(payload) {
      queryClient.setQueryData(['incognitoStatus', payload.chatId], {
        status: 'active',
        _id: payload.sessionId,
        startedBy: payload.startedBy,
        startedAt: payload.startedAt,
        gracePeriodExpiresAt: null,
      });
    }

    function handleIncognitoGracePeriodStarted(payload) {
      queryClient.setQueryData(['incognitoStatus', payload.chatId], (old) =>
        old ? { ...old, gracePeriodExpiresAt: payload.expiresAt } : old
      );
    }

    function handleIncognitoGracePeriodCancelled(payload) {
      queryClient.setQueryData(['incognitoStatus', payload.chatId], (old) =>
        old ? { ...old, gracePeriodExpiresAt: null } : old
      );
    }

    function handleIncognitoEnded(payload) {
      queryClient.setQueryData(['incognitoStatus', payload.chatId], null);
      // Messages were hard-deleted server-side — refetch, don't just
      // leave the (now-wrong) cached list showing them.
      queryClient.invalidateQueries({ queryKey: ['messages', payload.chatId] });
    }

    // Read receipts — patches the chat list cache directly (not the
    // messages cache) since that's where otherParticipant.lastReadMessageId
    // lives, which is what MessageBubble compares each message id
    // against to decide its tick color. Ignores our OWN read receipt
    // echoing back — only the other participant's matters here.
    function handleMessageRead({ chatId, userId, lastReadMessageId }) {
      const myId = useAuthStore.getState().user?.id;
      if (userId === myId) return;

      queryClient.setQueryData(['chats'], (old) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === chatId && c.otherParticipant
            ? { ...c, otherParticipant: { ...c.otherParticipant, lastReadMessageId } }
            : c
        );
      });
    }

    socket.on('message:new', handleMessageNew);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:read', handleMessageRead);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('friend:request_received', invalidateFriendsAndNotifications);
    socket.on('friend:request_accepted', invalidateFriendsAndNotifications);
    socket.on('group:member_added', invalidateChatsAndNotifications);
    socket.on('group:role_changed', invalidateChatsAndNotifications);
    socket.on('incognito:started', handleIncognitoStarted);
    socket.on('incognito:grace_period_started', handleIncognitoGracePeriodStarted);
    socket.on('incognito:grace_period_cancelled', handleIncognitoGracePeriodCancelled);
    socket.on('incognito:ended', handleIncognitoEnded);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:read', handleMessageRead);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('friend:request_received', invalidateFriendsAndNotifications);
      socket.off('friend:request_accepted', invalidateFriendsAndNotifications);
      socket.off('group:member_added', invalidateChatsAndNotifications);
      socket.off('group:role_changed', invalidateChatsAndNotifications);
      socket.off('incognito:started', handleIncognitoStarted);
      socket.off('incognito:grace_period_started', handleIncognitoGracePeriodStarted);
      socket.off('incognito:grace_period_cancelled', handleIncognitoGracePeriodCancelled);
      socket.off('incognito:ended', handleIncognitoEnded);
    };
  }, [queryClient, isAuthenticated]);
}
