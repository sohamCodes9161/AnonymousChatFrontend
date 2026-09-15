import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore.js';
import { connectSocket, disconnectSocket } from '../../sockets/socketClient.js';
import { registerRequest, loginRequest, logoutRequest } from '../../api/auth.js';

export function useAuth() {
  const { accessToken, user, isInitializing, setSession, clearSession } = useAuthStore();
  const queryClient = useQueryClient();

  const applySession = useCallback(
    (data) => {
      setSession(data.accessToken, data.user);
      connectSocket(data.accessToken);
    },
    [setSession]
  );

  const register = useCallback(
    async (payload) => {
      const res = await registerRequest(payload);
      applySession(res.data);
      return res.data.user;
    },
    [applySession]
  );

  const login = useCallback(
    async (payload) => {
      const res = await loginRequest(payload);
      applySession(res.data);
      return res.data.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      disconnectSocket();
      clearSession();
      queryClient.clear(); // no stale server-state survives a logout
    }
  }, [clearSession, queryClient]);

  return {
    accessToken,
    user,
    isInitializing,
    isAuthenticated: Boolean(accessToken),
    register,
    login,
    logout,
  };
}
