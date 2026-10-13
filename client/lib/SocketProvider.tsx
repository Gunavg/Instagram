"use client";

import useAuthStore from "@/store/authStore";
import { useEffect } from "react";
import { socket, connectAuthenticatedSocket, disconnectAuthenticatedSocket } from "./socket";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!user || !token) {
      disconnectAuthenticatedSocket();
      return;
    }
    connectAuthenticatedSocket(token);
    const handleConnect = () => socket.emit("setup", user._id);
    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();
    return () => {
      socket.off("connect", handleConnect);
      disconnectAuthenticatedSocket();
    };
  }, [user?._id, token]);

  return <>{children}</>;
}
