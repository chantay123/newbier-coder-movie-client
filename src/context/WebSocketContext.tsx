/**
 * A single WebSocket connection shared by the whole application.
 *
 * The provider exposes the latest message and a `send` helper. On the
 * server side rendering, the socket is simply not created.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { resolveWebSocketUrl } from '@/config/apiBase';

interface WebSocketContextValue {
  socket: WebSocket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  send: (message: unknown) => void;
}

export interface WebSocketMessage {
  type?: string;
  action?: string;
  data?: Record<string, unknown> & {
    name?: string;
    username?: string;
    title?: string;
    message?: string;
    status?: string;
  };
  message?: string;
  [key: string]: unknown;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/**
 * Reads the WebSocket context.
 *
 * @returns The socket, the connection state, the last message and the
 *          `send` helper.
 * @throws An error when the hook is used outside of `WebSocketProvider`.
 */
export const useWebSocket = (): WebSocketContextValue => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used inside <WebSocketProvider>');
  }
  return ctx;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // The URL comes from the configuration (`NEXT_PUBLIC_WS_URL`, or it is
    // deduced from the API base).
    // The address `ws://localhost:5000` used to be hardcoded, so the
    // production build always opened a socket to the development machine
    // and flooded the console with connection errors.
    const wsUrl = resolveWebSocketUrl();
    if (!wsUrl) return undefined;

    const ws = new WebSocket(wsUrl);

    ws.onopen = (): void => {
      setIsConnected(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (token) {
        ws.send(JSON.stringify({ type: 'authenticate', token }));
      }
    };

    ws.onmessage = (event: MessageEvent<string>): void => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(data);
      } catch (err) {

      }
    };

    ws.onclose = (): void => setIsConnected(false);
    ws.onerror = (): void => undefined;
    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const value = useMemo<WebSocketContextValue>(() => ({
    socket,
    isConnected,
    lastMessage,
    send: (message: unknown): void => {
      if (socket && isConnected) {
        socket.send(typeof message === 'object' ? JSON.stringify(message) : String(message));
      }
    }
  }), [socket, isConnected, lastMessage]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export default WebSocketContext;
