import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChannelList } from '../src/components/ChannelList';
import type { Channel } from '../src/types';

const members = [
  { id: 'u1', name: 'Jenny White', username: 'jenny', avatarColor: '#7FD8BD' },
  { id: 'u2', name: 'Devon Lane', username: 'devon', avatarColor: '#F2B8A2' },
];

const channels: Channel[] = [
  {
    id: 'c1',
    name: 'Announcements',
    slug: 'announcements',
    type: 'channel',
    memberCount: 2,
    members,
    unreadCount: 3,
    lastMessage: {
      id: 'm1',
      body: 'Weekly sync moved to Thursday',
      createdAt: new Date().toISOString(),
      author: members[1],
    },
  },
  {
    id: 'c2',
    name: 'Share your story',
    slug: 'share-your-story',
    type: 'channel',
    memberCount: 2,
    members,
    unreadCount: 0,
    lastMessage: null,
  },
];

describe('ChannelList', () => {
  it('shows the unread message badge', () => {
    render(<ChannelList channels={channels} activeChannelId="c2" onSelect={vi.fn()} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides the badge for a read channel', () => {
    render(<ChannelList channels={channels} activeChannelId="c2" onSelect={vi.fn()} />);
    const read = screen.getByRole('button', { name: 'Share your story' });
    expect(read.querySelector('.bg-badge')).toBeNull();
  });

  it('marks the active conversation', () => {
    render(<ChannelList channels={channels} activeChannelId="c2" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Share your story' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('filters conversations with the search box', async () => {
    render(<ChannelList channels={channels} activeChannelId="c1" onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search conversations'), 'announce');

    expect(screen.getByRole('button', { name: 'Announcements' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share your story' })).toBeNull();
  });

  it('calls onSelect when a conversation is clicked', async () => {
    const onSelect = vi.fn();
    render(<ChannelList channels={channels} activeChannelId="c1" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Share your story' }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });
});
