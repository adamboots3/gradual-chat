import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageItem } from '../src/components/MessageItem';
import type { Message } from '../src/types';

const author = {
  id: 'u1',
  name: 'Jenny White',
  username: 'jenny',
  avatarColor: '#7FD8BD',
  title: 'Community Manager',
};

const baseMessage: Message = {
  id: 'm1',
  channelId: 'c1',
  body: 'I will take a look in case it’s useful for us.',
  author,
  createdAt: new Date().toISOString(),
  mentions: [],
  replyTo: null,
};

describe('MessageItem', () => {
  it('renders the author, time and body', () => {
    render(
      <MessageItem message={baseMessage} isMine={false} onQuote={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Jenny White')).toBeInTheDocument();
    expect(screen.getByText(/I will take a look/)).toBeInTheDocument();
  });

  it('renders a quote preview when the message replies to another one', () => {
    render(
      <MessageItem
        message={{
          ...baseMessage,
          replyTo: {
            id: 'm0',
            body: 'Check out Vanilla Forums',
            createdAt: new Date().toISOString(),
            author: { ...author, id: 'u2', name: 'Devon Lane', username: 'devon' },
          },
        }}
        isMine={false}
        onQuote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Devon Lane')).toBeInTheDocument();
    expect(screen.getByText(/Check out Vanilla Forums/)).toBeInTheDocument();
  });

  it('offers quote on every message but delete only on my own', async () => {
    const onQuote = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <MessageItem message={baseMessage} isMine={false} onQuote={onQuote} onDelete={onDelete} />,
    );

    expect(screen.getByRole('button', { name: 'Quote reply' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete message' })).toBeNull();

    rerender(<MessageItem message={baseMessage} isMine onQuote={onQuote} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete message' }));
    expect(onDelete).toHaveBeenCalledWith(baseMessage);
  });

  it('marks the message as edited', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, editedAt: new Date().toISOString() }}
        isMine
        onQuote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });
});
