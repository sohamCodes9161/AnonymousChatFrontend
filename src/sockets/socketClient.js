import { io } from 'socket.io-client';
import { useConnectionStore } from '../stores/connectionStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export function connectSocket(accessToken) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'], // Force websocket to prevent connection hangs
  });

  // Tell React the socket is ready so it can attach listeners
  useConnectionStore.getState().setSocketInstance(socket);

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  useConnectionStore.getState().setSocketInstance(null);
  useConnectionStore.getState().setConnected(false);
}

export function getSocket() {
  return socket;
}