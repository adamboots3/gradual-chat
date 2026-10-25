import { describe, expect, it } from 'vitest';
import { cacheMessage, messageToPreview, patchChannel } from '../src/lib/cache';
import type { Channel, Message } from '../src/types';

const author = {
  id: 'u1',
  name: 'Jenny White',
  username: 'jenny',
  avatarColor: '#7FD8BD',
};

const message: Message = {
  id: 'm1',
  channelId: 'c1',
  body: 'hello',
  createdAt: '2026-10-22T06:00:00.000Z',
  mentions: [{ ...author, id: 'u2', name: 'Devon Lane', username: 'devon' }],
  replyTo: {
    id: 'm0',
    body: 'original',
    createdAt: '2026-10-22T05:59:00.000Z',
    author,
  },
  author,
};

const channel: Channel = {
  id: 'c1',
  name: 'Share your story',
  slug: 'share-your-story',
  type: 'channel',
  memberCount: 2,
  members: [author],
  unreadCount: 0,
  lastMessage: null,
};

/**
 * Regression guard for the bug fixed during development: socket payloads carry
 * no `__typename`, and writing them into the Apollo cache without it produced
 * empty stubs (a crash on the next render).
 */
describe('cache helpers', () => {
  it('tags a socket message so Apollo can normalise it', () => {
    const cached = cacheMessage(message);

    expect(cached.__typename).toBe('Message');
    expect(cached.author.__typename).toBe('User');
    expect(cached.mentions[0].__typename).toBe('User');
    expect(cached.replyTo?.__typename).toBe('MessagePreview');
    expect(cached.replyTo?.author.__typename).toBe('User');
  });

  it('builds a channel preview from a message', () => {
    const preview = messageToPreview(message);

    expect(preview.__typename).toBe('MessagePreview');
    expect(preview.id).toBe('m1');
    expect(preview.body).toBe('hello');
    expect(preview.author.username).toBe('jenny');
  });

  it('patches a channel while keeping its nested entities typed', () => {
    const patched = patchChannel(channel, {
      unreadCount: 3,
      lastMessage: messageToPreview(message),
    });

    expect(patched.__typename).toBe('Channel');
    expect(patched.unreadCount).toBe(3);
    expect(patched.members[0].__typename).toBe('User');
    expect(patched.lastMessage?.__typename).toBe('MessagePreview');
  });

  it('keeps a missing last message as null', () => {
    const patched = patchChannel(channel, { unreadCount: 1 });
    expect(patched.lastMessage).toBeNull();
  });
});
