import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApolloServer } from '../src/graphql/server';
import { noopRealtime } from '../src/realtime/emitter';
import { resetDatabase, startTestDatabase, type TestDatabase } from './helpers/db';
import { createFixture, type Fixture } from './helpers/fixtures';

let db: TestDatabase;
let fx: Fixture;
let apollo: ReturnType<typeof createApolloServer>;

beforeAll(async () => {
  db = await startTestDatabase();
  apollo = createApolloServer();
});

afterAll(async () => {
  await apollo.stop();
  await db.stop();
});

beforeEach(async () => {
  await resetDatabase();
  fx = await createFixture();
});

async function execute(query: string, variables: Record<string, unknown> = {}) {
  const response = await apollo.executeOperation(
    { query, variables },
    { contextValue: { emitter: noopRealtime } },
  );
  if (response.body.kind !== 'single') throw new Error('Unexpected incremental result');
  return response.body.singleResult;
}

async function send(body: string) {
  const result = await execute(
    'mutation($input: SendMessageInput!, $userId: ID!) { sendMessage(input: $input, userId: $userId) { id body author { username } mentions { username } } }',
    { input: { channelId: fx.channelId, body }, userId: String(fx.jenny._id) },
  );
  expect(result.errors).toBeUndefined();
  return result.data?.sendMessage as {
    id: string;
    body: string;
    author: { username: string };
    mentions: Array<{ username: string }>;
  };
}

describe('password login', () => {
  it('rejects a wrong password', async () => {
    const result = await execute(
      'mutation { login(email: "jenny@test.dev", password: "wrong") { id } }',
    );
    expect(result.errors?.[0]?.message).toBe('Invalid email or password.');
  });

  it('rejects an unknown email', async () => {
    const result = await execute(
      'mutation { login(email: "nobody@test.dev", password: "password123") { id } }',
    );
    expect(result.errors?.[0]?.message).toBe('Invalid email or password.');
  });

  it('returns user information for valid credentials', async () => {
    const result = await execute(
      'mutation { login(email: " JENNY@test.dev ", password: "password123") { id username } }',
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.login).toEqual({ id: String(fx.jenny._id), username: 'jenny' });
  });
});

describe('GraphQL chat without request authentication', () => {
  it('looks up the selected user and returns null for a missing user', async () => {
    const result = await execute('query($id: ID!) { user(id: $id) { id username } }', {
      id: String(fx.devon._id),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.user).toEqual({ id: String(fx.devon._id), username: 'devon' });
    const missing = await execute('query { user(id: "missing") { id } }');
    expect(missing.data?.user).toBeNull();
  });

  it('lists channels and unread counts using the supplied user ID', async () => {
    await send('hi @devon');
    const result = await execute(
      'query($userId: ID!) { channels(userId: $userId) { id unreadCount lastMessage { body } } }',
      { userId: String(fx.devon._id) },
    );
    expect(result.errors).toBeUndefined();
    const channels = result.data?.channels as Array<{
      id: string;
      unreadCount: number;
      lastMessage: { body: string };
    }>;
    expect(channels.find((channel) => channel.id === fx.channelId)).toMatchObject({
      unreadCount: 1,
      lastMessage: { body: 'hi @devon' },
    });
  });

  it('marks the specified user channel as read', async () => {
    await send('unread');
    const result = await execute(
      'mutation($channelId: ID!, $userId: ID!) { markChannelRead(channelId: $channelId, userId: $userId) { unreadCount } }',
      { channelId: fx.channelId, userId: String(fx.devon._id) },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.markChannelRead).toEqual({ unreadCount: 0 });
  });

  it('sends a message and resolves its author and mentions', async () => {
    const sent = await send('hello @grace');
    expect(sent.body).toBe('hello @grace');
    expect(sent.author.username).toBe('jenny');
    expect(sent.mentions).toEqual([{ username: 'grace' }]);
  });

  it('suggests users for the mention picker', async () => {
    const result = await execute('query { users(query: "dev") { username } }');
    expect(result.errors).toBeUndefined();
    expect(result.data?.users).toEqual([{ username: 'devon' }]);
  });

  it('edits a message without a caller identity', async () => {
    const sent = await send('typo');
    const result = await execute(
      'mutation($id: ID!) { editMessage(id: $id, body: "fixed") { body editedAt } }',
      { id: sent.id },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.editMessage).toMatchObject({ body: 'fixed', editedAt: expect.any(String) });
  });

  it('deletes a message without a caller identity and removes it from the timeline', async () => {
    const sent = await send('oops');
    const deleted = await execute('mutation($id: ID!) { deleteMessage(id: $id) { id } }', {
      id: sent.id,
    });
    expect(deleted.errors).toBeUndefined();
    expect(deleted.data?.deleteMessage).toEqual({ id: sent.id });
    const timeline = await execute(
      'query($id: ID!) { messages(channelId: $id) { messages { id } } }',
      { id: fx.channelId },
    );
    expect(timeline.errors).toBeUndefined();
    expect(timeline.data?.messages).toEqual({ messages: [] });
  });

  it('allows reading and sending to a channel without a membership check', async () => {
    const result = await execute(
      'mutation($input: SendMessageInput!, $userId: ID!) { sendMessage(input: $input, userId: $userId) { author { username } } }',
      { input: { channelId: fx.otherChannelId, body: 'demo' }, userId: String(fx.devon._id) },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.sendMessage).toEqual({ author: { username: 'devon' } });
    const timeline = await execute(
      'query($id: ID!) { messages(channelId: $id) { messages { body } } }',
      { id: fx.otherChannelId },
    );
    expect(timeline.errors).toBeUndefined();
    expect(timeline.data?.messages).toEqual({ messages: [{ body: 'demo' }] });
  });
});
