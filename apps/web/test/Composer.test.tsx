import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from '../src/components/Composer';
import type { Message } from '../src/types';

const replyTarget: Message = {
  id: 'm1',
  channelId: 'c1',
  body: 'Check out Vanilla Forums for free',
  createdAt: new Date().toISOString(),
  mentions: [],
  replyTo: null,
  author: {
    id: 'u2',
    name: 'Devon Lane',
    username: 'devon',
    avatarColor: '#F2B8A2',
  },
};

function renderComposer(overrides: Partial<React.ComponentProps<typeof Composer>> = {}) {
  const props = {
    channelName: 'Share your story',
    replyTo: null,
    onCancelReply: vi.fn(),
    onSend: vi.fn().mockResolvedValue(undefined),
    onTyping: vi.fn(),
    onStopTyping: vi.fn(),
    ...overrides,
  };

  render(
    <MockedProvider mocks={[]}>
      <Composer {...props} />
    </MockedProvider>,
  );

  return props;
}

describe('Composer', () => {
  it('sends on Enter and clears the field', async () => {
    const props = renderComposer();
    const input = screen.getByLabelText('Message Share your story');

    await userEvent.type(input, 'Many thanks!');
    await userEvent.keyboard('{Enter}');

    expect(props.onSend).toHaveBeenCalledWith('Many thanks!', null);
    expect(input).toHaveValue('');
  });

  it('keeps a new line on Shift+Enter instead of sending', async () => {
    const props = renderComposer();
    const input = screen.getByLabelText('Message Share your story');

    await userEvent.type(input, 'line one{Shift>}{Enter}{/Shift}line two');

    expect(props.onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('line one\nline two');
  });

  it('shows the quote bar and sends the quoted id', async () => {
    const props = renderComposer({ replyTo: replyTarget });
    expect(screen.getByText(/Check out Vanilla Forums/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Message Share your story'), 'quote test');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(props.onSend).toHaveBeenCalledWith('quote test', 'm1');
  });

  it('cancels the quote reply', async () => {
    const props = renderComposer({ replyTo: replyTarget });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel quote reply' }));
    expect(props.onCancelReply).toHaveBeenCalled();
  });

  it('wraps the selection in bold markers', async () => {
    renderComposer();
    const input = screen.getByLabelText('Message Share your story') as HTMLTextAreaElement;

    await userEvent.type(input, 'make me bold');
    input.setSelectionRange(8, 12); // "bold"
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(input).toHaveValue('make me **bold**');
  });

  it('reports typing activity', async () => {
    const props = renderComposer();
    await userEvent.type(screen.getByLabelText('Message Share your story'), 'hey');
    expect(props.onTyping).toHaveBeenCalled();
  });
});
