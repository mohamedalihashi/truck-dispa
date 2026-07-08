import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:4000";

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    const push = (type, payload) => {
      setEvents((items) => [{ id: `${Date.now()}-${type}`, type, payload, at: new Date() }, ...items].slice(0, 30));
    };

    ["order.created", "driver.assigned", "trip.status.updated", "notification.created", "location.updated", "trip.rejected"].forEach(
      (event) => socket.on(event, (payload) => push(event, payload))
    );

    if (user?.id) socket.emit("join", user.id);

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      events,
      clearEvents: () => setEvents([])
    }),
    [connected, events]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
