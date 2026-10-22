import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContext, requireUser } from '../src/auth/context';
import { signAuthToken } from '../src/auth/jwt';
import { noopRealtime } from '../src/realtime/emitter';
import { resetDatabase, startTestDatabase, type TestDatabase } from './helpers/db';
import { createFixture, type Fixture } from './helpers/fixtures';

let db: TestDatabase;
let fx: Fixture;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

beforeEach(async () => {
  await resetDatabase();
  fx = await createFixture();
});

describe('GraphQL context', () => {
  it('returns a null user when no header is present', async () => {
    const context = await buildContext({}, noopRealtime);
    expect(context.user).toBeNull();
    expect(() => requireUser(context)).toThrow(/signed in/i);
  });

  it('resolves the user from a valid bearer token', async () => {
    const token = signAuthToken(String(fx.devon._id), 'devon');
    const context = await buildContext({ authorization: `Bearer ${token}` }, noopRealtime);

    expect(context.user?.username).toBe('devon');
    expect(requireUser(context).id).toBe(String(fx.devon._id));
  });

  it('ignores an invalid token instead of throwing', async () => {
    const context = await buildContext({ authorization: 'Bearer nonsense' }, noopRealtime);
    expect(context.user).toBeNull();
  });

  it('handles an array-valued header', async () => {
    const token = signAuthToken(String(fx.jenny._id), 'jenny');
    const context = await buildContext(
      { authorization: [`Bearer ${token}`, 'Bearer other'] },
      noopRealtime,
    );
    expect(context.user?.username).toBe('jenny');
  });
});
