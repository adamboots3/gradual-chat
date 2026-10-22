import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { io as createClient, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signAuthToken } from '../src/auth/jwt';
import { createRealtime, type RealtimeServer } from '../src/realtime';
import { editMessage, sendMessage } from '../src/services/messages';
import { resetDatabase, startTestDatabase, type TestDatabase } from './helpers/db';
import { createFixture, type Fixture } from './helpers/fixtures';

let db: TestDatabase;
let fx: Fixture;
let httpServer: HttpServer;
let realtime: RealtimeServer;
let url: string;
const clients: Socket[] = [];

beforeAll(async () => {
  db = await startTestDatabase();

  const app = express();
  httpServer = createServer(app);
  realtime = await createRealtime(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address() as AddressInfo;
  url = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  for (const client of clients) client.close();
  await realtime.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await db.stop();
});

beforeEach(async () => {
  await resetDatabase();
  fx = await createFixture();
});

function connect(token?: string): Socket {
  const client = createClient(url, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
  });
  clients.push(client);
  return client;
}

function waitFor<T>(socket: Socket, event: string, timeout = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeout);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * The gateway joins channel rooms asynchronously right after `connection`, so
 * tests must wait for the room membership instead of assuming it is immediate.
 */
async function waitForRoom(room: string, socketId: string, timeout = 4000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const sockets = await realtime.io.in(room).fetchSockets();
    if (sockets.some((socket) => socket.id === socketId)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Socket ${socketId} never joined ${room}`);
}

describe('socket.io gateway', () => {
  it('pushes updated mention badges when a message is edited', async () => {
    const sent = await sendMessage(
      { channelId: fx.channelId, body: 'hello' },
      String(fx.jenny._id),
    );
    const devon = connect(signAuthToken(String(fx.devon._id), 'devon'));
    await waitFor(devon, 'connect');
    await waitForRoom(`channel:${fx.channelId}`, String(devon.id));
    const badgePromise = waitFor<{ unreadCount: number; unreadMentionCount: number }>(
      devon,
      'channel:unread',
    );
    const messagePromise = waitFor<{ message: { body: string } }>(devon, 'message:updated');
    const edited = await editMessage(sent.message.id, 'hello @devon', String(fx.jenny._id));
    await realtime.emitter.messageUpdated(edited);
    expect((await messagePromise).message.body).toBe('hello @devon');
    expect(await badgePromise).toMatchObject({ unreadCount: 1, unreadMentionCount: 1 });
  });

  it('rejects a socket without a valid token', async () => {
    const client = connect();
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('delivers a new message to the other channel member only', async () => {
    const devon = connect(signAuthToken(String(fx.devon._id), 'devon'));
    await waitFor(devon, 'connect');
    await waitForRoom(`channel:${fx.channelId}`, String(devon.id));

    const received = waitFor<{ message: { body: string; author: { username: string } } }>(
      devon,
      'message:new',
    );

    const result = await sendMessage(
      { channelId: fx.channelId, body: 'realtime hello' },
      String(fx.jenny._id),
    );
    await realtime.emitter.messageCreated(result);

    const payload = await received;
    expect(payload.message.body).toBe('realtime hello');
    expect(payload.message.author.username).toBe('jenny');
  });

  it('pushes the unread badge to the recipient', async () => {
    const devon = connect(signAuthToken(String(fx.devon._id), 'devon'));
    await waitFor(devon, 'connect');

    const badgePromise = waitFor<{
      channelId: string;
      unreadCount: number;
      unreadMentionCount: number;
    }>(devon, 'channel:unread');

    const result = await sendMessage(
      { channelId: fx.channelId, body: 'hey @devon' },
      String(fx.jenny._id),
    );
    await realtime.emitter.messageCreated(result);

    const badge = await badgePromise;
    expect(badge.channelId).toBe(fx.channelId);
    expect(badge.unreadCount).toBe(1);
    expect(badge.unreadMentionCount).toBe(1);
  });

  it('broadcasts typing indicators to the channel but not back to the sender', async () => {
    const jenny = connect(signAuthToken(String(fx.jenny._id), 'jenny'));
    const devon = connect(signAuthToken(String(fx.devon._id), 'devon'));
    await Promise.all([waitFor(jenny, 'connect'), waitFor(devon, 'connect')]);
    await Promise.all([
      waitForRoom(`channel:${fx.channelId}`, String(jenny.id)),
      waitForRoom(`channel:${fx.channelId}`, String(devon.id)),
    ]);

    const received = waitFor<{ channelId: string; user: { username: string } }>(
      devon,
      'typing:start',
    );
    jenny.emit('typing:start', { channelId: fx.channelId });

    const payload = await received;
    expect(payload.channelId).toBe(fx.channelId);
    expect(payload.user.username).toBe('jenny');
  });

  it('ignores typing events for a channel the socket is not a member of', async () => {
    const devon = connect(signAuthToken(String(fx.devon._id), 'devon'));
    await waitFor(devon, 'connect');

    let received = false;
    devon.on('typing:start', () => {
      received = true;
    });
    devon.emit('typing:start', { channelId: fx.otherChannelId });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });
});
