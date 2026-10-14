// Type shim: source lives at src/constants/WebSocketContext.js but the consumers
// import it from '@/contexts/WebSocketContext' (legacy path). We mirror its
// public surface so the import compiles. Real runtime path is resolved by
// Next.js/webpack alias config.

declare module '@/contexts/WebSocketContext' {
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

  export interface UseWebSocketReturn {
    lastMessage: WebSocketMessage | null;
    isConnected: boolean;
    sendMessage?: (payload: unknown) => void;
  }

  export function useWebSocket(): UseWebSocketReturn;
  export const WebSocketProvider: React.FC<{ children: React.ReactNode }>;
  const _default: UseWebSocketReturn;
  export default _default;
}
