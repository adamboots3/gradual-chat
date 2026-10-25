import type mongoose from 'mongoose';

export interface UserLike {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  username: string;
  avatarColor?: string | null;
  title?: string | null;
}

export interface MessageLike {
  _id: mongoose.Types.ObjectId | string;
  channelId: mongoose.Types.ObjectId | string;
  body: string;
  createdAt: Date;
  authorId: UserLike;
  replyToId?: (MessageLike & { authorId: UserLike }) | null;
  mentionIds?: UserLike[] | null;
}
