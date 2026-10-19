import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore.js';
import { usePresenceStore } from '../stores/presenceStore.js';
import { useTypingStore } from '../stores/typingStore.js';
import { useConnectionStore } from '../stores/connectionStore.js';

export function useSocketEvents() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => Boolean(s.accessToken));
  
  // Reactively track the socket instance from the store
  const socket = useConnectionStore((state) => state.socketInstance);

  useEffect(() => {
    // If socket hasn't been initialized yet, do nothing and wait.
    if (!socket) return;

    function handleMessageNew(message) {
      queryClient.setQueryData(['messages', message.chatId], (old) => {
        if (!old) return old;
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
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === message.id ? { ...message, reactions: m.reactions || [] } : m
          ),
        };
      });
    }

    function handleMessageReaction({ chatId, messageId, userId, reactions }) {
      const myId = useAuthStore.getState().user?.id;
      queryClient.setQueryData(['messages', chatId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) => {
            if (m.id !== messageId) return m;
            if (userId === myId) return { ...m, reactions };
            const mine = new Map((m.reactions || []).map((r) => [r.emoji, r.reactedByMe]));
            return {
              ...m,
              reactions: reactions.map((r) => ({ ...r, reactedByMe: mine.get(r.emoji) ?? false })),
            };
          }),
        };
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

    function handleMessageHidden({ chatId, messageIds }) {
      const hidden = new Set(messageIds);
      queryClient.setQueryData(['messages', chatId], (old) =>
        old ? { ...old, messages: old.messages.filter((m) => !hidden.has(m.id)) } : old
      );
    }

    // ---- Connection lifecycle -------------------------------------
    let hasConnectedBefore = false;
    
    function handleConnect() {
      console.log('✅ Socket connected successfully!');
      useConnectionStore.getState().setConnected(true);
      socket.emit('presence:request');
      if (hasConnectedBefore) {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.invalidateQueries({ queryKey: ['incognitoStatus'] });
      }
      hasConnectedBefore = true;
    }

    function handleDisconnect(reason) {
      console.log('❌ Socket disconnected:', reason);
      useConnectionStore.getState().setConnected(false);
      usePresenceStore.getState().clear();
    }

    function handleConnectError(err) {
      console.error('⚠️ Socket connect_error:', err.message);
      useConnectionStore.getState().setConnected(false);
    }

    const handlePresenceSnapshot = ({ onlineUserIds }) =>
      usePresenceStore.getState().setSnapshot(onlineUserIds);

    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      if (!socket.connected) socket.connect();
      else socket.emit('presence:request');
    }

    const handlePresenceOnline = ({ userId }) => usePresenceStore.getState().setOnline(userId);
    
    function handlePresenceOffline({ userId }) {
      usePresenceStore.getState().setOffline(userId);
      queryClient.setQueryData(['chats'], (old) =>
        old
          ? old.map((c) =>
              c.otherParticipant?.id === userId && c.otherParticipant.lastSeenAt
                ? { ...c, otherParticipant: { ...c.otherParticipant, lastSeenAt: new Date().toISOString() } }
                : c
            )
          : old
      );
    }
    
    const handleTypingStart = ({ chatId, userId }) => useTypingStore.getState().setTyping(chatId, userId);
    const handleTypingStop = ({ chatId, userId }) => useTypingStore.getState().clearTyping(chatId, userId);

    function invalidateFriendsAndNotifications() {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    
    function invalidateChatsAndNotifications() {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

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
      queryClient.invalidateQueries({ queryKey: ['messages', payload.chatId] });
    }

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

    // Attach Listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('message:new', handleMessageNew);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reaction', handleMessageReaction);
    socket.on('message:read', handleMessageRead);
    socket.on('message:hidden', handleMessageHidden);
    socket.on('presence:snapshot', handlePresenceSnapshot);
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

    document.addEventListener('visibilitychange', handleVisibility);

    // If socket is already connected when effect runs, trigger handleConnect
    if (socket.connected) {
      handleConnect();
    } else {
      useConnectionStore.getState().setConnected(false);
    }

    // Cleanup Listeners on unmount or socket change
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('message:new', handleMessageNew);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('message:read', handleMessageRead);
      socket.off('message:hidden', handleMessageHidden);
      socket.off('presence:snapshot', handlePresenceSnapshot);
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
      
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [queryClient, isAuthenticated, socket]); // NOTE: `socket` is now in the dependency array!
}