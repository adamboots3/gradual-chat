import type { MessageLike, UserLike } from './dto-types';

export interface UserDTO {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  title: string;
}

export interface MessagePreviewDTO {
  id: string;
  body: string;
  author: UserDTO;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  channelId: string;
  body: string;
  author: UserDTO;
  createdAt: string;
  editedAt: string | null;
  replyTo: MessagePreviewDTO | null;
  mentions: UserDTO[];
}

export interface ChannelDTO {
  id: string;
  name: string;
  slug: string;
  type: string;
  memberCount: number;
  members: UserDTO[];
  unreadCount: number;
  lastMessage: MessagePreviewDTO | null;
}

export function toUserDTO(user: UserLike): UserDTO {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    avatarColor: user.avatarColor ?? '#7FD8BD',
    title: user.title ?? '',
  };
}

export function toPreviewDTO(message: MessageLike): MessagePreviewDTO {
  return {
    id: String(message._id),
    body: message.body,
    author: toUserDTO(message.authorId),
    createdAt: message.createdAt.toISOString(),
  };
}

export function toMessageDTO(message: MessageLike): MessageDTO {
  return {
    id: String(message._id),
    channelId: String(message.channelId),
    body: message.body,
    author: toUserDTO(message.authorId),
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    replyTo: message.replyToId ? toPreviewDTO(message.replyToId) : null,
    mentions: (message.mentionIds ?? []).filter(Boolean).map(toUserDTO),
  };
}
