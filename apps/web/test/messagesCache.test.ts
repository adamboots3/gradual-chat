import { describe, expect, it } from 'vitest';
import { createCache } from '../src/lib/apollo';
import { MESSAGES } from '../src/graphql/operations';
import { removeCachedMessage, updateCachedPreview } from '../src/lib/cache';

const author = {
  __typename: 'User',
  id: 'u1',
  name: 'Jenny White',
  username: 'jenny',
  avatarColor: '#7FD8BD',
  title: 'Community Manager',
};

function node(id: string) {
  return {
    __typename: 'Message',
    id,
    channelId: 'c1',
    body: id,
    createdAt: '2026-10-22T06:00:00.000Z',
    editedAt: null,
    author,
    mentions: [],
    replyTo: null,
  };
}

/**
 * The message field policy is the piece that makes "load earlier messages"
 * actually prepend older pages instead of replacing the view.
 */
describe('messages field policy', () => {
  it('refreshes an existing quote preview when its source message is edited', () => {
    const cache = createCache();
    cache.writeQuery({
      query: MESSAGES,
      variables: { channelId: 'c1' },
      data: {
        messages: {
          __typename: 'MessagePage',
          messages: [
            {
              ...node('reply'),
              replyTo: {
                __typename: 'MessagePreview',
                id: 'original',
                body: 'before',
                createdAt: node('original').createdAt,
                author,
              },
            },
          ],
          nextCursor: null,
        },
      },
    });
    updateCachedPreview(cache, { ...node('original'), body: 'after' });
    const read = cache.readQuery<{ messages: { messages: Array<{ replyTo: { body: string } }> } }>({
      query: MESSAGES,
      variables: { channelId: 'c1' },
    });
    expect(read?.messages.messages[0].replyTo.body).toBe('after');
  });

  it('removes a deleted message from its channel while preserving another cached timeline', () => {
    const cache = createCache();
    for (const channelId of ['c1', 'c2']) {
      cache.writeQuery({
        query: MESSAGES,
        variables: { channelId },
        data: {
          messages: {
            __typename: 'MessagePage',
            messages: [{ ...node(`${channelId}-message`), channelId }],
            nextCursor: 'older',
          },
        },
      });
    }
    removeCachedMessage(cache, 'c1-message', 'c1');
    const read = (channelId: string) =>
      cache.readQuery<{
        messages: { messages: Array<{ id: string }>; nextCursor: string | null };
      }>({ query: MESSAGES, variables: { channelId } });
    expect(read('c1')?.messages.messages).toEqual([]);
    expect(read('c1')?.messages.nextCursor).toBe('older');
    expect(read('c2')?.messages.messages.map((message) => message.id)).toEqual(['c2-message']);
    removeCachedMessage(cache, 'missing', 'uncached-channel');
    expect(read('uncached-channel')).toBeNull();
  });

  it('prepends a page fetched with a cursor', () => {
    const cache = createCache();

    cache.writeQuery({
      query: MESSAGES,
      variables: { channelId: 'c1' },
      data: {
        messages: {
          __typename: 'MessagePage',
          messages: [node('m2'), node('m3')],
          nextCursor: 'cursor-1',
        },
      },
    });

    cache.writeQuery({
      query: MESSAGES,
      variables: { channelId: 'c1', cursor: 'cursor-1' },
      data: {
        messages: { __typename: 'MessagePage', messages: [node('m1')], nextCursor: null },
      },
    });

    const read = cache.readQuery<{
      messages: { messages: Array<{ id: string }>; nextCursor: string | null };
    }>({ query: MESSAGES, variables: { channelId: 'c1' } });

    expect(read?.messages.messages.map((message) => message.id)).toEqual(['m1', 'm2', 'm3']);
    expect(read?.messages.nextCursor).toBeNull();
  });

  it('replaces the timeline when the first page is fetched again', () => {
    const cache = createCache();

    cache.writeQuery({
      query: MESSAGES,
      variables: { channelId: 'c1' },
      data: {
        messages: {
          __typename: 'MessagePage',
          messages: [node('old')],
          nextCursor: null,
        },
      },
    });

    cache.writeQuery({
      query: MESSAGES,
      variables: { channelId: 'c1' },
      data: {
        messages: {
          __typename: 'MessagePage',
          messages: [node('fresh')],
          nextCursor: null,
        },
      },
    });

    const read = cache.readQuery<{ messages: { messages: Array<{ id: string }> } }>({
      query: MESSAGES,
      variables: { channelId: 'c1' },
    });

    expect(read?.messages.messages.map((message) => message.id)).toEqual(['fresh']);
  });
});
