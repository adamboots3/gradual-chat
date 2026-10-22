import { Types } from 'mongoose';
import { User } from '../models/User';
import { Channel } from '../models/Channel';
import { Message } from '../models/Message';
import { ReadState } from '../models/ReadState';
import { hashPassword } from '../auth/jwt';
import { extractMentionHandles } from '../services/mentions';
import { logger } from '../logger';
import { DEMO_PASSWORD, seedChannels, seedMessages, seedUsers } from './data';

export interface SeedResult {
  skipped: boolean;
  users: number;
  channels: number;
  messages: number;
}

interface RawMessage {
  _id: Types.ObjectId;
  channelId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  replyToId: Types.ObjectId | null;
  mentionIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  editedAt: null;
  deletedAt: null;
}

/**
 * Idempotent demo data. Mirrors the design file: the same channels, people and
 * messages, plus a quote reply and an @mention so every feature is visible on
 * first load.
 */
export async function seedDatabase(options: { force?: boolean } = {}): Promise<SeedResult> {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !options.force) {
    return { skipped: true, users: existingUsers, channels: 0, messages: 0 };
  }

  if (options.force) {
    await Promise.all([
      Message.deleteMany({}),
      ReadState.deleteMany({}),
      Channel.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = await User.insertMany(seedUsers.map((user) => ({ ...user, passwordHash })));
  const usersByName = new Map(users.map((user) => [user.username, user]));

  const channels: Array<{ channel: InstanceType<typeof Channel>; spec: (typeof seedChannels)[number] }> = [];
  for (const spec of seedChannels) {
    const channel = await Channel.create({
      name: spec.name,
      slug: spec.slug,
      type: spec.type,
      order: spec.order,
      memberIds: spec.members.map((username) => usersByName.get(username)!._id),
    });
    channels.push({ channel, spec });
  }
  const now = Date.now();
  const messagesByChannel = new Map<
    string,
    Array<{ _id: Types.ObjectId; createdAt: Date; authorId: Types.ObjectId; mentionIds: Types.ObjectId[] }>
  >();

  for (const { channel, spec } of channels) {
    const specs = seedMessages.filter((message) => message.channelSlug === spec.slug);
    const raw: RawMessage[] = [];

    specs.forEach((message, index) => {
      const author = usersByName.get(message.author);
      if (!author) throw new Error(`Unknown seed author: ${message.author}`);
      const createdAt = new Date(now - message.minutesAgo * 60_000);
      const mentionIds = extractMentionHandles(message.body)
        .map((handle) => usersByName.get(handle)?._id)
        .filter((id): id is Types.ObjectId => Boolean(id) && String(id) !== String(author._id));

      raw.push({
        _id: new Types.ObjectId(),
        channelId: channel._id,
        authorId: author._id,
        body: message.body,
        replyToId:
          message.replyToIndex !== undefined ? (raw[message.replyToIndex]?._id ?? null) : null,
        mentionIds,
        createdAt,
        updatedAt: createdAt,
        editedAt: null,
        deletedAt: null,
      });
      void index;
    });

    if (raw.length > 0) {
      // Bypass Mongoose timestamps so seeded history keeps its original dates.
      await Message.collection.insertMany(raw);
    }
    messagesByChannel.set(
      spec.slug,
      raw.map((message) => ({
        _id: message._id,
        createdAt: message.createdAt,
        authorId: message.authorId,
        mentionIds: message.mentionIds,
      })),
    );
  }

  let totalMessages = 0;
  for (const { channel, spec } of channels) {
    const lastReadAt = new Date(now - spec.readBeforeMinutesAgo * 60_000);
    const messages = messagesByChannel.get(spec.slug) ?? [];
    totalMessages += messages.length;

    for (const memberId of channel.memberIds) {
      let unreadCount = 0;
      let unreadMentionCount = 0;
      let lastReadMessageId: Types.ObjectId | null = null;

      for (const message of messages) {
        if (String(message.authorId) === String(memberId)) continue;
        if (message.createdAt > lastReadAt) {
          unreadCount += 1;
          if (message.mentionIds.some((id) => String(id) === String(memberId))) {
            unreadMentionCount += 1;
          }
        } else {
          lastReadMessageId = message._id;
        }
      }

      await ReadState.create({
        channelId: channel._id,
        userId: memberId,
        lastReadAt,
        lastReadMessageId,
        unreadCount,
        unreadMentionCount,
      });
    }
  }

  logger.info(
    `seeded ${users.length} users, ${channels.length} channels and ${totalMessages} messages. ` +
      `Sign in with any demo account (password: ${DEMO_PASSWORD}).`,
  );

  return { skipped: false, users: users.length, channels: channels.length, messages: totalMessages };
}

export async function resetDatabase(): Promise<void> {
  await Promise.all([
    Message.deleteMany({}),
    ReadState.deleteMany({}),
    Channel.deleteMany({}),
    User.deleteMany({}),
  ]);
}
