import { io, type Socket } from 'socket.io-client';
import type { Message } from '../types';

export interface UnreadPayload {
  channelId: string;
  unreadCount: number;
}

export interface RealtimeHandlers {
  /** Fired on the first connection and on every reconnect. */
  onConnected?(): void;
  onMessage(message: Message): void;
  onMessageUpdated(message: Message): void;
  onMessageDeleted(payload: { messageId: string; channelId: string }): void;
  onUnread(payload: UnreadPayload): void;
}

export interface RealtimeClient {
  socket: Socket;
  disconnect(): void;
}

/**
 * A thin socket.io wrapper. It reuses the same origin as the web app so the dev
 * server (Vite) can proxy `/socket.io` and production needs no CORS at all.
 */
export function connectRealtime(userId: string, handlers: RealtimeHandlers): RealtimeClient {
  const socket = io({
    query: { userId },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 500,
  });

  socket.on('connect', () => handlers.onConnected?.());
  socket.on('message:new', ({ message }: { message: Message }) => handlers.onMessage(message));
  socket.on('message:updated', ({ message }: { message: Message }) =>
    handlers.onMessageUpdated(message),
  );
  socket.on('message:deleted', (payload: { messageId: string; channelId: string }) =>
    handlers.onMessageDeleted(payload),
  );
  socket.on('channel:unread', (payload: UnreadPayload) => handlers.onUnread(payload));

  return {
    socket,
    disconnect: () => socket.disconnect(),
  };
}
