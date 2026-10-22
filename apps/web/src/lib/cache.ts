import type { Channel, Message, MessagePreview, User } from '../types';
import type { ApolloCache } from '@apollo/client';
import { MESSAGES } from '../graphql/operations';

export function removeCachedMessage(
  cache: ApolloCache<unknown>,
  messageId: string,
  channelId: string,
): void {
  cache.updateQuery<{ messages: { messages: Message[]; nextCursor: string | null } }>(
    { query: MESSAGES, variables: { channelId } },
    (data) =>
      data
        ? {
            messages: {
              ...data.messages,
              messages: data.messages.messages.filter((message) => message.id !== messageId),
            },
          }
        : data,
  );
}

/**
 * Objects that arrive over socket.io never went through a GraphQL document, so
 * they carry no `__typename`. Apollo's normalised cache needs it to store them
 * as entities — without it nested objects are written as empty stubs and the UI
 * crashes on the next read. These helpers add the discriminators back.
 */
export type CachedUser = User & { __typename: 'User' };
export type CachedPreview = Omit<MessagePreview, 'author'> & {
  __typename: 'MessagePreview';
  author: CachedUser;
};
export type CachedMessage = Omit<Message, 'author' | 'mentions' | 'replyTo'> & {
  __typename: 'Message';
  author: CachedUser;
  mentions: CachedUser[];
  replyTo: CachedPreview | null;
};
export type CachedChannel = Omit<Channel, 'members' | 'lastMessage'> & {
  __typename: 'Channel';
  members: CachedUser[];
  lastMessage: CachedPreview | null;
};

export function cacheUser(user: User): CachedUser {
  return { __typename: 'User', ...user };
}

export function cachePreview(preview: MessagePreview): CachedPreview {
  return {
    __typename: 'MessagePreview',
    ...preview,
    author: cacheUser(preview.author),
  };
}

export function cacheMessage(message: Message): CachedMessage {
  return {
    __typename: 'Message',
    ...message,
    author: cacheUser(message.author),
    mentions: (message.mentions ?? []).map(cacheUser),
    replyTo: message.replyTo ? cachePreview(message.replyTo) : null,
  };
}

export function messageToPreview(message: Message): CachedPreview {
  return cachePreview({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    author: message.author,
  });
}

export function patchChannel(channel: Channel, patch: Partial<Channel>): CachedChannel {
  // Merge first, then normalise: a patched `lastMessage` must win over the
  // channel's previous preview.
  const merged = { ...channel, ...patch };
  return {
    __typename: 'Channel',
    ...merged,
    members: merged.members.map(cacheUser),
    lastMessage: merged.lastMessage ? cachePreview(merged.lastMessage) : null,
  };
}
