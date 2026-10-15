/**
 * @file WebSocketContext.tsx
 * @description Single WebSocket connection shared by the app, exposing the latest
 * message and a `send` helper. Falls back to no-op during SSR.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

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
    const ws = new WebSocket('ws://localhost:5000');

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
