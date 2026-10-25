import { Types, type FilterQuery, type PopulateOptions } from 'mongoose';
import { Channel, type ChannelDocument } from '../models/Channel';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { toMessageDTO, type MessageDTO } from '../graphql/dto';
import type { MessageLike } from '../graphql/dto-types';
import type { MessageEvent } from '../realtime/emitter';
import { encodeCursor, decodeCursor, clampLimit } from '../utils/cursor';
import { badUserInput, notFound } from '../utils/errors';
import { extractMentionHandles } from './mentions';
import { bumpUnread, markAuthorRead } from './readState';

const POPULATE_MESSAGE: PopulateOptions[] = [
  { path: 'authorId', select: 'name username avatarColor title' },
  { path: 'replyToId', populate: { path: 'authorId', select: 'name username avatarColor title' } },
  { path: 'mentionIds', select: 'name username avatarColor title' },
];

export async function getChannel(channelId: string): Promise<ChannelDocument> {
  if (!Types.ObjectId.isValid(channelId)) throw notFound('Channel not found.');
  const channel = await Channel.findById(channelId);
  if (!channel) throw notFound('Channel not found.');
  return channel;
}

async function findPopulatedMessage(messageId: string): Promise<MessageDTO> {
  const doc = await Message.findById(messageId).populate(POPULATE_MESSAGE);
  if (!doc) throw notFound('Message not found.');
  return toMessageDTO(doc as unknown as MessageLike);
}

async function resolveMentionIds(body: string, authorId: string): Promise<Types.ObjectId[]> {
  const handles = extractMentionHandles(body);
  if (handles.length === 0) return [];
  const users = await User.find({ username: { $in: handles } }).select('_id');
  return users.map((user) => user._id).filter((id) => String(id) !== String(authorId));
}

export interface SendMessageInput {
  channelId: string;
  body: string;
  replyToId?: string | null;
}

export async function sendMessage(input: SendMessageInput, userId: string): Promise<MessageEvent> {
  const channel = await getChannel(input.channelId);
  if (!Types.ObjectId.isValid(userId) || !(await User.exists({ _id: userId }))) {
    throw notFound('User not found.');
  }

  const body = input.body.trim();
  if (body.length === 0) throw badUserInput('Message cannot be empty.');
  if (body.length > 4000) throw badUserInput('Message is too long (max 4000 characters).');

  let replyToId: Types.ObjectId | null = null;
  if (input.replyToId) {
    if (!Types.ObjectId.isValid(input.replyToId)) {
      throw notFound('The quoted message no longer exists.');
    }
    const quoted = await Message.findById(input.replyToId);
    if (!quoted) throw notFound('The quoted message no longer exists.');
    if (String(quoted.channelId) !== String(channel._id)) {
      throw badUserInput('You can only quote a message from the same channel.');
    }
    replyToId = quoted._id;
  }

  const mentionIds = await resolveMentionIds(body, userId);

  const created = await Message.create({
    channelId: channel._id,
    authorId: userId,
    body,
    replyToId,
    mentionIds,
  });

  await bumpUnread(channel._id, userId);
  await markAuthorRead(channel._id, userId, created._id);

  const message = await findPopulatedMessage(String(created._id));

  return {
    message,
    channelId: String(channel._id),
    memberIds: channel.memberIds.map(String),
  };
}

export interface MessagePage {
  messages: MessageDTO[];
  nextCursor: string | null;
}

export async function listMessages(params: {
  channelId: string;
  cursor?: string | null;
  limit?: number | null;
}): Promise<MessagePage> {
  await getChannel(params.channelId);

  const limit = clampLimit(params.limit);
  const filter: FilterQuery<unknown> = { channelId: params.channelId };
  if (params.cursor) {
    filter._id = { $lt: decodeCursor(params.cursor) };
  }

  const docs = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate(POPULATE_MESSAGE);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const oldest = page[page.length - 1];
  const nextCursor = hasMore && oldest ? encodeCursor(String(oldest._id)) : null;

  return {
    messages: page.reverse().map((doc) => toMessageDTO(doc as unknown as MessageLike)),
    nextCursor,
  };
}
