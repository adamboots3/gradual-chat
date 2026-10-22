import { GraphQLScalarType, Kind } from 'graphql';
import { requireUser, type GraphQLContext } from '../auth/context';
import { signAuthToken, verifyPassword } from '../auth/jwt';
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
import { unauthenticated } from '../utils/errors';

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
    me: (_parent: unknown, _args: unknown, context: GraphQLContext) =>
      context.user ? toUserDTO(context.user) : null,

    users: async (_parent: unknown, args: { query: string }, context: GraphQLContext) => {
      requireUser(context);
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

    channels: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const user = requireUser(context);
      return listChannelsForUser(String(user._id));
    },

    messages: async (
      _parent: unknown,
      args: { channelId: string; cursor?: string | null; limit?: number | null },
      context: GraphQLContext,
    ) => {
      const user = requireUser(context);
      return listMessages(args, String(user._id));
    },
  },

  Mutation: {
    login: async (_parent: unknown, args: { email: string; password: string }) => {
      const email = args.email.trim().toLowerCase();
      const user = await User.findOne({ email });
      if (!user) throw unauthenticated('Invalid email or password.');
      const ok = await verifyPassword(args.password, user.passwordHash);
      if (!ok) throw unauthenticated('Invalid email or password.');
      return {
        token: signAuthToken(String(user._id), user.username),
        user: toUserDTO(user),
      };
    },

    sendMessage: async (
      _parent: unknown,
      args: { input: SendMessageInput },
      context: GraphQLContext,
    ) => {
      const user = requireUser(context);
      const result = await sendMessage(args.input, String(user._id));
      await context.emitter.messageCreated(result);
      return result.message;
    },

    markChannelRead: async (
      _parent: unknown,
      args: { channelId: string; lastMessageId?: string | null },
      context: GraphQLContext,
    ) => {
      const user = requireUser(context);
      // Throws when the caller is not a member of the channel.
      await getChannelForUser(args.channelId, String(user._id));
      await markChannelRead(args.channelId, String(user._id), args.lastMessageId ?? null);
      return getChannelForUser(args.channelId, String(user._id));
    },

    editMessage: async (
      _parent: unknown,
      args: { id: string; body: string },
      context: GraphQLContext,
    ) => {
      const user = requireUser(context);
      const result = await editMessage(args.id, args.body, String(user._id));
      await context.emitter.messageUpdated(result);
      return result.message;
    },

    deleteMessage: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      const user = requireUser(context);
      const result = await deleteMessage(args.id, String(user._id));
      await context.emitter.messageDeleted(result);
      return result.message;
    },
  },
};
