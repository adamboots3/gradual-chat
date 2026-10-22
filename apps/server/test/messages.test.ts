import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Message } from '../src/models/Message';
import { ReadState } from '../src/models/ReadState';
import { listChannelsForUser } from '../src/services/channels';
import { deleteMessage, listMessages, sendMessage } from '../src/services/messages';
import { markChannelRead } from '../src/services/readState';
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

async function unreadFor(channelId: string, userId: string): Promise<number> {
  const state = await ReadState.findOne({ channelId, userId }).lean();
  return state?.unreadCount ?? 0;
}

async function mentionCountFor(channelId: string, userId: string): Promise<number> {
  const state = await ReadState.findOne({ channelId, userId }).lean();
  return state?.unreadMentionCount ?? 0;
}

describe('sendMessage', () => {
  it('creates the message and bumps unread for everyone else', async () => {
    const result = await sendMessage(
      { channelId: fx.channelId, body: 'Hello team' },
      String(fx.jenny._id),
    );

    expect(result.message.body).toBe('Hello team');
    expect(result.message.author.username).toBe('jenny');
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(1);
    expect(await unreadFor(fx.channelId, String(fx.grace._id))).toBe(1);
    expect(await unreadFor(fx.channelId, String(fx.jenny._id))).toBe(0);
  });

  it('resolves @mentions and counts them separately', async () => {
    const result = await sendMessage(
      { channelId: fx.channelId, body: 'ping @devon please review' },
      String(fx.jenny._id),
    );

    expect(result.message.mentions.map((user) => user.username)).toEqual(['devon']);
    expect(await mentionCountFor(fx.channelId, String(fx.devon._id))).toBe(1);
    expect(await mentionCountFor(fx.channelId, String(fx.grace._id))).toBe(0);
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(1);
  });

  it('does not create a mention for an unknown handle', async () => {
    const result = await sendMessage(
      { channelId: fx.channelId, body: 'hey @nobody' },
      String(fx.jenny._id),
    );
    expect(result.message.mentions).toEqual([]);
  });

  it('keeps a quote reply inside the same channel', async () => {
    const parent = await sendMessage(
      { channelId: fx.channelId, body: 'original' },
      String(fx.jenny._id),
    );

    const reply = await sendMessage(
      { channelId: fx.channelId, body: 'quoting', replyToId: parent.message.id },
      String(fx.devon._id),
    );

    expect(reply.message.replyTo?.id).toBe(parent.message.id);
    expect(reply.message.replyTo?.author.username).toBe('jenny');
  });

  it('rejects quoting a message from another channel', async () => {
    const parent = await sendMessage(
      { channelId: fx.otherChannelId, body: 'elsewhere' },
      String(fx.jenny._id),
    );

    await expect(
      sendMessage(
        { channelId: fx.channelId, body: 'cross quote', replyToId: parent.message.id },
        String(fx.jenny._id),
      ),
    ).rejects.toThrow(/same channel/i);
  });

  it('rejects empty bodies and non-members', async () => {
    await expect(
      sendMessage({ channelId: fx.channelId, body: '   ' }, String(fx.jenny._id)),
    ).rejects.toThrow(/empty/i);

    await expect(
      sendMessage({ channelId: fx.otherChannelId, body: 'hi' }, String(fx.devon._id)),
    ).rejects.toThrow(/access/i);
  });
});

describe('unread bookkeeping', () => {
  it('clears the counters when the channel is read', async () => {
    await sendMessage({ channelId: fx.channelId, body: 'hello @devon' }, String(fx.jenny._id));
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(1);

    await markChannelRead(fx.channelId, String(fx.devon._id));
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(0);
    expect(await mentionCountFor(fx.channelId, String(fx.devon._id))).toBe(0);
  });

  it('decrements unread when an unread message is deleted', async () => {
    const sent = await sendMessage(
      { channelId: fx.channelId, body: 'oops' },
      String(fx.jenny._id),
    );
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(1);

    await deleteMessage(sent.message.id, String(fx.jenny._id));
    expect(await unreadFor(fx.channelId, String(fx.devon._id))).toBe(0);

    const stored = await Message.findById(sent.message.id);
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it('surfaces unread counts in the channel list', async () => {
    await sendMessage({ channelId: fx.channelId, body: 'one' }, String(fx.jenny._id));
    await sendMessage({ channelId: fx.channelId, body: 'two @devon' }, String(fx.jenny._id));

    const channels = await listChannelsForUser(String(fx.devon._id));
    const share = channels.find((channel) => channel.id === fx.channelId);

    expect(share?.unreadCount).toBe(2);
    expect(share?.unreadMentionCount).toBe(1);
    expect(share?.lastMessage?.body).toBe('two @devon');
  });
});

describe('listMessages', () => {
  it('pages backwards with a cursor and returns ascending order', async () => {
    for (let index = 0; index < 5; index += 1) {
      await sendMessage(
        { channelId: fx.channelId, body: `message ${index}` },
        String(fx.jenny._id),
      );
    }

    const first = await listMessages({ channelId: fx.channelId, limit: 2 }, String(fx.jenny._id));
    expect(first.messages.map((message) => message.body)).toEqual([
      'message 3',
      'message 4',
    ]);
    expect(first.nextCursor).toBeTruthy();

    const second = await listMessages(
      { channelId: fx.channelId, limit: 2, cursor: first.nextCursor },
      String(fx.jenny._id),
    );
    expect(second.messages.map((message) => message.body)).toEqual([
      'message 1',
      'message 2',
    ]);

    const third = await listMessages(
      { channelId: fx.channelId, limit: 2, cursor: second.nextCursor },
      String(fx.jenny._id),
    );
    expect(third.messages.map((message) => message.body)).toEqual(['message 0']);
    expect(third.nextCursor).toBeNull();
  });

  it('hides deleted messages', async () => {
    const sent = await sendMessage(
      { channelId: fx.channelId, body: 'gone' },
      String(fx.jenny._id),
    );
    await deleteMessage(sent.message.id, String(fx.jenny._id));

    const page = await listMessages({ channelId: fx.channelId }, String(fx.jenny._id));
    expect(page.messages).toHaveLength(0);
  });
});
