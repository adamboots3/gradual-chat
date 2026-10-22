import { io, type Socket } from 'socket.io-client';
import type { Message } from '../types';

export interface TypingPayload {
  channelId: string;
  user: { id: string; name: string; username: string };
}

export interface UnreadPayload {
  channelId: string;
  unreadCount: number;
  unreadMentionCount: number;
}

export interface RealtimeHandlers {
  onMessage(message: Message): void;
  onMessageUpdated(message: Message): void;
  onMessageDeleted(payload: { messageId: string; channelId: string }): void;
  onUnread(payload: UnreadPayload): void;
  onTyping(payload: TypingPayload): void;
  onTypingStop(payload: TypingPayload): void;
}

export interface RealtimeClient {
  socket: Socket;
  disconnect(): void;
}

/**
 * A thin socket.io wrapper. It reuses the same origin as the web app so the dev
 * server (Vite) can proxy `/socket.io` and production needs no CORS at all.
 */
export function connectRealtime(token: string, handlers: RealtimeHandlers): RealtimeClient {
  const socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 500,
  });

  socket.on('message:new', ({ message }: { message: Message }) => handlers.onMessage(message));
  socket.on('message:updated', ({ message }: { message: Message }) =>
    handlers.onMessageUpdated(message),
  );
  socket.on('message:deleted', (payload: { messageId: string; channelId: string }) =>
    handlers.onMessageDeleted(payload),
  );
  socket.on('channel:unread', (payload: UnreadPayload) => handlers.onUnread(payload));
  socket.on('typing:start', (payload: TypingPayload) => handlers.onTyping(payload));
  socket.on('typing:stop', (payload: TypingPayload) => handlers.onTypingStop(payload));

  return {
    socket,
    disconnect: () => socket.disconnect(),
  };
}
