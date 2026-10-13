import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

let configuredToken = "";
export const connectAuthenticatedSocket = (token?: string) => {
  if (!token) {
    configuredToken = "";
    socket.disconnect();
    return;
  }
  if (configuredToken !== token) {
    configuredToken = token;
    socket.auth = { token };
    if (socket.active) socket.disconnect();
  }
  if (!socket.connected) socket.connect();
};
export const disconnectAuthenticatedSocket = () => {
  configuredToken = "";
  socket.disconnect();
};
