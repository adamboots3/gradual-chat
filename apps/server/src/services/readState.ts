import { Types } from 'mongoose';
import { ReadState } from '../models/ReadState';

export interface ReadStateSummary {
  unreadCount: number;
  unreadMentionCount: number;
  lastReadAt: Date;
  lastReadMessageId: Types.ObjectId | null;
}

const EMPTY: ReadStateSummary = {
  unreadCount: 0,
  unreadMentionCount: 0,
  lastReadAt: new Date(0),
  lastReadMessageId: null,
};

function toObjectId(value: Types.ObjectId | string): Types.ObjectId {
  return typeof value === 'string' ? new Types.ObjectId(value) : value;
}

/**
 * Make sure every member of a channel has a read-state document. Called when a
 * channel is created/seeded so the hot path (`sendMessage`) is a pure `$inc`.
 */
export async function ensureReadStates(
  channelId: Types.ObjectId | string,
  memberIds: Array<Types.ObjectId | string>,
): Promise<void> {
  if (memberIds.length === 0) return;
  const channel = toObjectId(channelId);
  await ReadState.bulkWrite(
    memberIds.map((userId) => {
      const user = toObjectId(userId);
      return {
        updateOne: {
          filter: { channelId: channel, userId: user },
          update: {
            $setOnInsert: {
              channelId: channel,
              userId: user,
              lastReadAt: new Date(0),
              lastReadMessageId: null,
              unreadCount: 0,
              unreadMentionCount: 0,
            },
          },
          upsert: true,
        },
      };
    }),
  );
}

/**
 * Increment the badge counters for everybody but the author, and separately
 * count mentions so we can render the "@" marker without extra queries.
 */
export async function bumpUnread(
  channelId: Types.ObjectId | string,
  authorId: Types.ObjectId | string,
  mentionUserIds: Array<Types.ObjectId | string> = [],
): Promise<void> {
  const others = { channelId, userId: { $ne: authorId } };
  await ReadState.updateMany(others, { $inc: { unreadCount: 1 } });

  const mentioned = mentionUserIds.filter((id) => String(id) !== String(authorId));
  if (mentioned.length > 0) {
    await ReadState.updateMany(
      { channelId, userId: { $in: mentioned } },
      { $inc: { unreadMentionCount: 1 } },
    );
  }
}

/** Author just posted: their own cursor moves to the message they sent. */
export async function markAuthorRead(
  channelId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  messageId: Types.ObjectId | string,
): Promise<void> {
  await ReadState.updateOne(
    { channelId, userId },
    {
      $set: {
        lastReadAt: new Date(),
        lastReadMessageId: messageId,
        unreadCount: 0,
        unreadMentionCount: 0,
      },
    },
    { upsert: true },
  );
}

export async function markChannelRead(
  channelId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  lastMessageId?: Types.ObjectId | string | null,
): Promise<ReadStateSummary> {
  const update: Record<string, unknown> = {
    lastReadAt: new Date(),
    unreadCount: 0,
    unreadMentionCount: 0,
  };
  if (lastMessageId) update.lastReadMessageId = lastMessageId;

  const state = await ReadState.findOneAndUpdate({ channelId, userId }, { $set: update }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();

  return {
    unreadCount: state?.unreadCount ?? 0,
    unreadMentionCount: state?.unreadMentionCount ?? 0,
    lastReadAt: state?.lastReadAt ?? new Date(),
    lastReadMessageId: state?.lastReadMessageId ?? null,
  };
}

export async function getReadStateMap(
  userId: Types.ObjectId | string,
  channelIds: Array<Types.ObjectId | string>,
): Promise<Map<string, ReadStateSummary>> {
  const states = await ReadState.find({ userId, channelId: { $in: channelIds } }).lean();
  const map = new Map<string, ReadStateSummary>();
  for (const state of states) {
    map.set(String(state.channelId), {
      unreadCount: state.unreadCount ?? 0,
      unreadMentionCount: state.unreadMentionCount ?? 0,
      lastReadAt: state.lastReadAt ?? new Date(0),
      lastReadMessageId: state.lastReadMessageId ?? null,
    });
  }
  return map;
}

export function emptyReadState(): ReadStateSummary {
  return { ...EMPTY };
}
