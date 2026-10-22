import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ApolloServer } from '@apollo/server';
import { createApolloServer } from '../src/graphql/server';
import type { GraphQLContext } from '../src/auth/context';
import { noopRealtime } from '../src/realtime/emitter';
import { resetDatabase, startTestDatabase, type TestDatabase } from './helpers/db';
import { createFixture, type Fixture } from './helpers/fixtures';

let db: TestDatabase;
let fx: Fixture;
let apollo: ApolloServer<GraphQLContext>;

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

function contextFor(user: Fixture['jenny'] | null): GraphQLContext {
  return { user, emitter: noopRealtime };
}

describe('GraphQL auth', () => {
  it('rejects a wrong password', async () => {
    const response = await apollo.executeOperation(
      {
        query: `mutation { login(email: "jenny@test.dev", password: "nope") { token } }`,
      },
      { contextValue: contextFor(null) },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns a token for valid credentials', async () => {
    const response = await apollo.executeOperation(
      {
        query: `mutation { login(email: "jenny@test.dev", password: "password123") { token user { username } } }`,
      },
      { contextValue: contextFor(null) },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      const payload = response.body.singleResult.data?.login as { token: string; user: { username: string } };
      expect(payload.token).toBeTruthy();
      expect(payload.user.username).toBe('jenny');
    }
  });

  it('guards the channels query', async () => {
    const response = await apollo.executeOperation(
      { query: `{ channels { id } }` },
      { contextValue: contextFor(null) },
    );

    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('GraphQL chat', () => {
  it('lists channels with unread counts', async () => {
    await apollo.executeOperation(
      {
        query: `mutation($input: SendMessageInput!) { sendMessage(input: $input) { id } }`,
        variables: { input: { channelId: fx.channelId, body: 'hi @devon' } },
      },
      { contextValue: contextFor(fx.jenny) },
    );

    const response = await apollo.executeOperation(
      {
        query: `{ channels { id unreadCount unreadMentionCount lastMessage { body } } }`,
      },
      { contextValue: contextFor(fx.devon) },
    );

    if (response.body.kind === 'single') {
      const channels = response.body.singleResult.data?.channels as Array<{
        id: string;
        unreadCount: number;
        unreadMentionCount: number;
        lastMessage: { body: string };
      }>;
      const share = channels.find((channel) => channel.id === fx.channelId);
      expect(share?.unreadCount).toBe(1);
      expect(share?.unreadMentionCount).toBe(1);
      expect(share?.lastMessage.body).toBe('hi @devon');
    }
  });

  it('marks a channel as read and returns the fresh badge', async () => {
    await apollo.executeOperation(
      {
        query: `mutation($input: SendMessageInput!) { sendMessage(input: $input) { id } }`,
        variables: { input: { channelId: fx.channelId, body: 'unread' } },
      },
      { contextValue: contextFor(fx.jenny) },
    );

    const response = await apollo.executeOperation(
      {
        query: `mutation($id: ID!) { markChannelRead(channelId: $id) { unreadCount } }`,
        variables: { id: fx.channelId },
      },
      { contextValue: contextFor(fx.devon) },
    );

    if (response.body.kind === 'single') {
      const payload = response.body.singleResult.data?.markChannelRead as { unreadCount: number };
      expect(payload.unreadCount).toBe(0);
    }
  });

  it('sends a message through the mutation', async () => {
    const response = await apollo.executeOperation(
      {
        query: `mutation($input: SendMessageInput!) {
          sendMessage(input: $input) { id body author { username } mentions { username } }
        }`,
        variables: { input: { channelId: fx.channelId, body: 'hello @grace' } },
      },
      { contextValue: contextFor(fx.jenny) },
    );

    if (response.body.kind === 'single') {
      const message = response.body.singleResult.data?.sendMessage as {
        body: string;
        mentions: Array<{ username: string }>;
      };
      expect(message.body).toBe('hello @grace');
      expect(message.mentions).toHaveLength(1);
    }
  });
});
