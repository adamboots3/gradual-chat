import { GraphQLScalarType, Kind } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from './context';
import { verifyPassword } from '../services/passwords';
import { User } from '../models/User';
import { getChannelForUser, listChannelsForUser } from '../services/channels';
import {
  deleteMessage,
  editMessage,
  listMessages,
  sendMessage,
  type SendMessageInput,
} from '../services/messages';
import { markChannelRead } from '../services/readState';
import { toUserDTO } from './dto';
import { escapeRegExp } from '../utils/regex';
import { badUserInput, notFound } from '../utils/errors';

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 timestamp',
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    return value;
  },
  parseValue(value) {
    return new Date(String(value));
  },
  parseLiteral(ast) {
    return ast.kind === Kind.STRING ? new Date(ast.value) : null;
  },
});

export const resolvers = {
  DateTime,
  Query: {
    user: async (_parent: unknown, args: { id: string }) => {
      if (!Types.ObjectId.isValid(args.id)) return null;
      const user = await User.findById(args.id);
      return user ? toUserDTO(user) : null;
    },

    users: async (_parent: unknown, args: { query: string }) => {
      const term = args.query.trim();
      const filter = term
        ? {
            $or: [
              { name: { $regex: escapeRegExp(term), $options: 'i' } },
              { username: { $regex: escapeRegExp(term), $options: 'i' } },
            ],
          }
        : {};
      const users = await User.find(filter).sort({ name: 1 }).limit(8);
      return users.map(toUserDTO);
    },

    channels: async (_parent: unknown, args: { userId: string }) => {
      return listChannelsForUser(args.userId);
    },

    messages: async (
      _parent: unknown,
      args: { channelId: string; cursor?: string | null; limit?: number | null },
    ) => {
      return listMessages(args);
    },
  },

  Mutation: {
    login: async (_parent: unknown, args: { email: string; password: string }) => {
      const email = args.email.trim().toLowerCase();
      const user = await User.findOne({ email });
      if (!user) throw badUserInput('Invalid email or password.');
      const ok = await verifyPassword(args.password, user.passwordHash);
      if (!ok) throw badUserInput('Invalid email or password.');
      return toUserDTO(user);
    },

    sendMessage: async (
      _parent: unknown,
      args: { input: SendMessageInput; userId: string },
      context: GraphQLContext,
    ) => {
      const result = await sendMessage(args.input, args.userId);
      await context.emitter.messageCreated(result);
      return result.message;
    },

    markChannelRead: async (
      _parent: unknown,
      args: { channelId: string; userId: string; lastMessageId?: string | null },
    ) => {
      await getChannelForUser(args.channelId, args.userId);
      if (!Types.ObjectId.isValid(args.userId) || !(await User.exists({ _id: args.userId }))) {
        throw notFound('User not found.');
      }
      await markChannelRead(args.channelId, args.userId, args.lastMessageId ?? null);
      return getChannelForUser(args.channelId, args.userId);
    },

    editMessage: async (
      _parent: unknown,
      args: { id: string; body: string },
      context: GraphQLContext,
    ) => {
      const result = await editMessage(args.id, args.body);
      await context.emitter.messageUpdated(result);
      return result.message;
    },

    deleteMessage: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      const result = await deleteMessage(args.id);
      await context.emitter.messageDeleted(result);
      return result.message;
    },
  },
};
