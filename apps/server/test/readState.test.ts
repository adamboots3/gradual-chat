import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureReadStates, markAuthorRead } from '../src/services/readState';
import { ReadState } from '../src/models/ReadState';
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

describe('read state helpers', () => {
  it('ensures one row per member and is idempotent', async () => {
    const channelId = fx.otherChannelId;
    await ReadState.deleteMany({ channelId });

    await ensureReadStates(channelId, [fx.jenny._id, fx.devon._id]);
    await ensureReadStates(channelId, [fx.jenny._id, fx.devon._id]);

    const rows = await ReadState.find({ channelId }).lean();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.unreadCount === 0)).toBe(true);
  });

  it('moves the author cursor to their own message and clears the badge', async () => {
    await ReadState.updateOne(
      { channelId: fx.channelId, userId: fx.jenny._id },
      { $set: { unreadCount: 4, unreadMentionCount: 2 } },
    );

    const messageId = fx.jenny._id; // any ObjectId is fine for the cursor field
    await markAuthorRead(fx.channelId, fx.jenny._id, messageId);

    const state = await ReadState.findOne({ channelId: fx.channelId, userId: fx.jenny._id }).lean();
    expect(state?.unreadCount).toBe(0);
    expect(state?.unreadMentionCount).toBe(0);
    expect(String(state?.lastReadMessageId)).toBe(String(messageId));
  });
});
