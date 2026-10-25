import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import { MessageList } from '../src/components/MessageList';
import { MESSAGES } from '../src/graphql/operations';
import { createCache } from '../src/lib/apollo';

const author = {
  __typename: 'User',
  id: 'u1',
  name: 'Jenny White',
  username: 'jenny',
  avatarColor: '#7FD8BD',
  title: 'Community Manager',
};

function messageNode(id: string, body: string, createdAt: string) {
  return {
    __typename: 'Message',
    id,
    channelId: 'c1',
    body,
    createdAt,
    author,
    mentions: [],
    replyTo: null,
  };
}

const today = new Date().toISOString();

const firstPage = {
  request: { query: MESSAGES, variables: { channelId: 'c1' } },
  result: {
    data: {
      messages: {
        __typename: 'MessagePage',
        messages: [messageNode('m2', 'newest message', today), messageNode('m3', 'second', today)],
        nextCursor: 'cursor-1',
      },
    },
  },
};

const olderPage = {
  request: { query: MESSAGES, variables: { channelId: 'c1', cursor: 'cursor-1' } },
  result: {
    data: {
      messages: {
        __typename: 'MessagePage',
        messages: [messageNode('m1', 'oldest message', today)],
        nextCursor: null,
      },
    },
  },
};

describe('MessageList', () => {
  it('renders the timeline with a day divider', async () => {
    render(
      <MockedProvider mocks={[firstPage]} cache={createCache()}>
        <MessageList channelId="c1" currentUserId="u1" onQuote={vi.fn()} />
      </MockedProvider>,
    );

    expect(await screen.findByText('newest message')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('prepends older pages when loading earlier messages', async () => {
    render(
      <MockedProvider mocks={[firstPage, olderPage]} cache={createCache()}>
        <MessageList channelId="c1" currentUserId="u1" onQuote={vi.fn()} />
      </MockedProvider>,
    );

    await screen.findByText('newest message');
    await userEvent.click(screen.getByRole('button', { name: 'Load earlier messages' }));

    await waitFor(() => expect(screen.getByText('oldest message')).toBeInTheDocument());

    // The newest message must remain below the older one after the merge.
    const bodies = screen
      .getAllByText(/message$/)
      .map((node) => node.textContent)
      .filter((text): text is string => Boolean(text));
    expect(bodies.indexOf('oldest message')).toBeLessThan(bodies.indexOf('newest message'));
    expect(screen.queryByRole('button', { name: 'Load earlier messages' })).toBeNull();
  });

  it('shows an empty state for a channel without messages', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: MESSAGES, variables: { channelId: 'empty' } },
            result: {
              data: { messages: { __typename: 'MessagePage', messages: [], nextCursor: null } },
            },
          },
        ]}
        cache={createCache()}
      >
        <MessageList channelId="empty" currentUserId="u1" onQuote={vi.fn()} />
      </MockedProvider>,
    );

    expect(await screen.findByText(/No messages yet/)).toBeInTheDocument();
  });
});
