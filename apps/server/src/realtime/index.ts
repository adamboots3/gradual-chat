import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { config } from '../config';
import { logger } from '../logger';
import { verifyAuthToken } from '../auth/jwt';
import { Channel } from '../models/Channel';
import { User } from '../models/User';
import { ReadState } from '../models/ReadState';
import type { MessageEvent, RealtimeEmitter, TypingUser } from './emitter';

interface SocketUser {
  id: string;
  name: string;
  username: string;
}

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

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      next(new Error('UNAUTHENTICATED'));
      return;
    }
    const user = await User.findById(payload.sub).select('name username').lean();
    if (!user) {
      next(new Error('UNAUTHENTICATED'));
      return;
    }
    socket.data.user = { id: String(user._id), name: user.name, username: user.username };
    next();
  });

  io.on('connection', async (socket) => {
    const me = socket.data.user as SocketUser;
    socket.join(`user:${me.id}`);

    const channels = await Channel.find({ memberIds: me.id }).select('_id').lean();
    for (const channel of channels) socket.join(`channel:${channel._id}`);

    const isMemberOf = (channelId: string) => socket.rooms.has(`channel:${channelId}`);

    socket.on('typing:start', (payload: { channelId?: string } | undefined) => {
      if (!payload?.channelId || !isMemberOf(payload.channelId)) return;
      const typingUser: TypingUser = me;
      socket
        .to(`channel:${payload.channelId}`)
        .emit('typing:start', { channelId: payload.channelId, user: typingUser });
    });

    socket.on('typing:stop', (payload: { channelId?: string } | undefined) => {
      if (!payload?.channelId || !isMemberOf(payload.channelId)) return;
      socket
        .to(`channel:${payload.channelId}`)
        .emit('typing:stop', { channelId: payload.channelId, user: me });
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: me.id }, 'socket disconnected');
    });
  });

  async function broadcastBadges(channelId: string, memberIds: string[]): Promise<void> {
    const states = await ReadState.find({ channelId, userId: { $in: memberIds } }).lean();
    for (const state of states) {
      io.to(`user:${String(state.userId)}`).emit('channel:unread', {
        channelId,
        unreadCount: state.unreadCount ?? 0,
        unreadMentionCount: state.unreadMentionCount ?? 0,
      });
    }
  }

  const emitter: RealtimeEmitter = {
    async messageCreated(result: MessageEvent) {
      io.to(`channel:${result.channelId}`).emit('message:new', { message: result.message });
      await broadcastBadges(result.channelId, result.memberIds);
    },
    async messageUpdated(result: MessageEvent) {
      io.to(`channel:${result.channelId}`).emit('message:updated', { message: result.message });
    },
    async messageDeleted(result: MessageEvent) {
      io.to(`channel:${result.channelId}`).emit('message:deleted', {
        messageId: result.message.id,
        channelId: result.channelId,
      });
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
