import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export function connectSocket(accessToken) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
