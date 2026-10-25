import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { io as createClient, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRealtime, type RealtimeServer } from '../src/realtime';
import { sendMessage } from '../src/services/messages';
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

function connect(userId?: string): Socket {
  const client = createClient(url, {
    query: userId ? { userId } : {},
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
  it('accepts a socket without credentials', async () => {
    const client = connect();
    await waitFor(client, 'connect');
    expect(client.connected).toBe(true);
  });

  it('delivers a new message to the other channel member only', async () => {
    const devon = connect(String(fx.devon._id));
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
    const devon = connect(String(fx.devon._id));
    await waitFor(devon, 'connect');

    const badgePromise = waitFor<{
      channelId: string;
      unreadCount: number;
    }>(devon, 'channel:unread');

    const result = await sendMessage(
      { channelId: fx.channelId, body: 'hey @devon' },
      String(fx.jenny._id),
    );
    await realtime.emitter.messageCreated(result);

    const badge = await badgePromise;
    expect(badge).toEqual({ channelId: fx.channelId, unreadCount: 1 });
  });
});
