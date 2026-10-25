import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { config } from '../config';
import { logger } from '../logger';
import { Channel } from '../models/Channel';
import { ReadState } from '../models/ReadState';
import type { MessageEvent, RealtimeEmitter } from './emitter';

export interface RealtimeServer {
  io: SocketServer;
  emitter: RealtimeEmitter;
  close: () => Promise<void>;
}

/**
 * socket.io gateway.
 *
 * Rooms:
 *  - `channel:<id>` — every member joins, used for message fan-out
 *  - `user:<id>`    — per-user room for badge updates (a user can be in many
 *                     channels, and we do not want to broadcast badge counts to
 *                     the whole channel)
 */
export async function createRealtime(httpServer: HttpServer): Promise<RealtimeServer> {
  const io = new SocketServer(httpServer, {
    cors: { origin: config.webOrigins, credentials: true },
    serveClient: false,
  });

  io.on('connection', async (socket) => {
    // The demo user ID routes events; it is not an authentication credential.
    const userId = socket.handshake.query.userId;
    if (typeof userId !== 'string' || !/^[a-f0-9]{24}$/i.test(userId)) return;
    socket.join(`user:${userId}`);

    const channels = await Channel.find({ memberIds: userId }).select('_id').lean();
    for (const channel of channels) socket.join(`channel:${channel._id}`);

    socket.on('disconnect', () => {
      logger.debug({ userId }, 'socket disconnected');
    });
  });

  async function broadcastBadges(channelId: string, memberIds: string[]): Promise<void> {
    const states = await ReadState.find({ channelId, userId: { $in: memberIds } }).lean();
    for (const state of states) {
      io.to(`user:${String(state.userId)}`).emit('channel:unread', {
        channelId,
        unreadCount: state.unreadCount ?? 0,
      });
    }
  }

  const emitter: RealtimeEmitter = {
    async messageCreated(result: MessageEvent) {
      io.to(`channel:${result.channelId}`).emit('message:new', { message: result.message });
      await broadcastBadges(result.channelId, result.memberIds);
    },
  };

  return {
    io,
    emitter,
    close: async () => {
      await io.close();
    },
  };
}
