export interface User {
  id: string;
  name: string;
  username: string;
  avatarColor: string;
  title?: string | null;
}

export interface MessagePreview {
  id: string;
  body: string;
  author: User;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  body: string;
  author: User;
  createdAt: string;
  editedAt?: string | null;
  replyTo?: MessagePreview | null;
  mentions: User[];
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  type: 'channel' | 'dm';
  memberCount: number;
  members: User[];
  unreadCount: number;
  lastMessage?: MessagePreview | null;
}
