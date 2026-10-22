import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountHttpRoutes } from '../src/app';
import { createApolloServer } from '../src/graphql/server';
import { noopRealtime } from '../src/realtime/emitter';
import { resetDatabase, startTestDatabase, type TestDatabase } from './helpers/db';
import { createFixture, type Fixture } from './helpers/fixtures';

let db: TestDatabase;
let fx: Fixture;
let server: Server;
let baseUrl: string;
let apollo: ReturnType<typeof createApolloServer>;

beforeAll(async () => {
  db = await startTestDatabase();

  apollo = createApolloServer();
  await apollo.start();

  const app = express();
  mountHttpRoutes(app, apollo, noopRealtime);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await apollo.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.stop();
});

beforeEach(async () => {
  await resetDatabase();
  fx = await createFixture();
});

async function graphql(query: string, token?: string): Promise<Response> {
  return fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  });
}

describe('HTTP surface', () => {
  it('exposes a health endpoint', async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('serves GraphQL over POST', async () => {
    const response = await graphql(`{ __typename }`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data?: { __typename?: string } };
    expect(body.data?.__typename).toBe('Query');
  });

  it('rejects a query without a bearer token', async () => {
    const response = await graphql(`{ channels { id } }`);
    const body = (await response.json()) as {
      errors?: Array<{ extensions?: { code?: string } }>;
    };
    expect(body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('accepts a query with a valid token', async () => {
    const { signAuthToken } = await import('../src/auth/jwt');
    const token = signAuthToken(String(fx.jenny._id), 'jenny');

    const response = await graphql(`{ channels { id name } }`, token);
    const body = (await response.json()) as {
      data?: { channels: Array<{ id: string }> };
      errors?: unknown;
    };

    expect(body.errors).toBeUndefined();
    expect(body.data?.channels.length).toBeGreaterThan(0);
  });

  it('rejects a malformed JSON body without crashing', async () => {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
