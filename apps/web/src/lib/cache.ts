import type { Channel, Message, MessagePreview, User } from '../types';

/**
 * Objects that arrive over socket.io never went through a GraphQL document, so
 * they carry no `__typename`. Apollo's normalised cache needs it to store them
 * as entities — without it nested objects are written as empty stubs and the UI
 * crashes on the next read. These helpers add the discriminators back.
 */
type Typed<T, Name extends string> = T & { __typename: Name };

export function cacheUser(user: User): Typed<User, 'User'> {
  return { __typename: 'User', ...user };
}

export function cachePreview(preview: MessagePreview): Typed<MessagePreview, 'MessagePreview'> {
  return {
    __typename: 'MessagePreview',
    ...preview,
    author: cacheUser(preview.author),
  };
}

export function cacheMessage(message: Message): Typed<Message, 'Message'> {
  return {
    __typename: 'Message',
    ...message,
    author: cacheUser(message.author),
    mentions: (message.mentions ?? []).map(cacheUser),
    replyTo: message.replyTo ? cachePreview(message.replyTo) : null,
  };
}

export function messageToPreview(message: Message): Typed<MessagePreview, 'MessagePreview'> {
  return cachePreview({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    author: message.author,
  });
}

export function patchChannel(
  channel: Channel,
  patch: Partial<Channel>,
): Typed<Channel, 'Channel'> {
  return {
    __typename: 'Channel',
    ...channel,
    ...patch,
    members: channel.members.map(cacheUser),
    lastMessage: channel.lastMessage ? cachePreview(channel.lastMessage) : null,
  };
}
