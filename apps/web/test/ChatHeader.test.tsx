import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatHeader } from '../src/components/ChatHeader';
import type { Channel } from '../src/types';

const channel: Channel = {
  id: 'c1',
  name: 'Share your story',
  slug: 'share-your-story',
  type: 'channel',
  memberCount: 4,
  members: [],
  unreadCount: 0,
  lastMessage: null,
};

describe('ChatHeader', () => {
  it('shows the channel name and member count', () => {
    render(<ChatHeader channel={channel} />);

    expect(screen.getByRole('heading', { name: 'Share your story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 members' })).toBeInTheDocument();
  });

  it('labels direct messages', () => {
    render(<ChatHeader channel={{ ...channel, type: 'dm', name: 'Courtney Henry' }} />);
    expect(screen.getByRole('heading', { name: 'Courtney Henry' })).toBeInTheDocument();
  });
});
