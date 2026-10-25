import { Channel } from '../models/Channel';
import { Message } from '../models/Message';
import { toPreviewDTO, toUserDTO, type ChannelDTO } from '../graphql/dto';
import type { MessageLike, UserLike } from '../graphql/dto-types';
import { emptyReadState, getReadStateMap } from './readState';
import { notFound } from '../utils/errors';
import { Types } from 'mongoose';

const POPULATE_MEMBERS = 'name username avatarColor title';

async function lastMessagePerChannel(
  channelIds: Types.ObjectId[],
): Promise<Map<string, MessageLike>> {
  if (channelIds.length === 0) return new Map();

  // One round trip for the newest message of every channel.
  const grouped = await Message.aggregate([
    { $match: { channelId: { $in: channelIds } } },
    { $sort: { _id: -1 } },
    { $group: { _id: '$channelId', doc: { $first: '$$ROOT' } } },
  ]);

  const ids = grouped.map((entry) => entry.doc._id);
  if (ids.length === 0) return new Map();

  const docs = await Message.find({ _id: { $in: ids } }).populate('authorId', POPULATE_MEMBERS);
  return new Map(docs.map((doc) => [String(doc.channelId), doc as unknown as MessageLike]));
}

function buildChannelDTO(
  channel: {
    _id: unknown;
    name: string;
    slug: string;
    type: string;
    memberIds: unknown;
  },
  readState: ReturnType<typeof emptyReadState>,
  lastMessage: MessageLike | undefined,
): ChannelDTO {
  const members = (channel.memberIds as unknown as UserLike[]) ?? [];
  return {
    id: String(channel._id),
    name: channel.name,
    slug: channel.slug,
    type: channel.type,
    memberCount: members.length,
    members: members.map(toUserDTO),
    unreadCount: readState.unreadCount,
    lastMessage: lastMessage ? toPreviewDTO(lastMessage) : null,
  };
}

export async function listChannelsForUser(userId: string): Promise<ChannelDTO[]> {
  if (!Types.ObjectId.isValid(userId)) throw notFound('User not found.');
  const channels = await Channel.find({ memberIds: userId })
    .sort({ order: 1, _id: 1 })
    .populate('memberIds', POPULATE_MEMBERS);

  const ids = channels.map((channel) => channel._id);
  const [states, lastMessages] = await Promise.all([
    getReadStateMap(userId, ids),
    lastMessagePerChannel(ids),
  ]);

  return channels.map((channel) => {
    const state = states.get(String(channel._id)) ?? emptyReadState();
    return buildChannelDTO(
      channel as unknown as {
        _id: unknown;
        name: string;
        slug: string;
        type: string;
        memberIds: unknown;
      },
      state,
      lastMessages.get(String(channel._id)),
    );
  });
}

export async function getChannelForUser(channelId: string, userId: string): Promise<ChannelDTO> {
  if (!Types.ObjectId.isValid(channelId)) throw notFound('Channel not found.');
  const channel = await Channel.findById(channelId).populate('memberIds', POPULATE_MEMBERS);
  if (!channel) throw notFound('Channel not found.');

  const states = await getReadStateMap(userId, [channel._id]);
  const lastMessages = await lastMessagePerChannel([channel._id]);

  return buildChannelDTO(
    channel as unknown as {
      _id: unknown;
      name: string;
      slug: string;
      type: string;
      memberIds: unknown;
    },
    states.get(String(channel._id)) ?? emptyReadState(),
    lastMessages.get(String(channel._id)),
  );
}
