import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from '../src/components/Composer';
import type { Message } from '../src/types';
import { SEARCH_USERS } from '../src/graphql/operations';

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
  it('does not send Enter while confirming IME input', async () => {
    const props = renderComposer();
    const input = screen.getByLabelText('Message Share your story');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(props.onSend).toHaveBeenCalledWith('你好', null));
  });

  it('keeps a failed draft and quote, displays the error, and supports retry', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(undefined);
    renderComposer({ onSend, replyTo: replyTarget });
    const input = screen.getByLabelText('Message Share your story');
    await userEvent.type(input, 'retry me');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(input).toHaveValue('retry me');
    expect(screen.getByText(/Check out Vanilla Forums/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSend).toHaveBeenLastCalledWith('retry me', 'm1');
  });

  it('wraps keyboard navigation within the visible mention results', async () => {
    const onSend = vi.fn();
    const users = Array.from({ length: 8 }, (_, index) => ({
      __typename: 'User',
      id: `u${index}`,
      name: `Person ${index}`,
      username: `person${index}`,
      avatarColor: '#7FD8BD',
      title: '',
    }));
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: SEARCH_USERS, variables: { query: '' } },
            result: { data: { users } },
          },
        ]}
      >
        <Composer
          channelName="Share your story"
          replyTo={null}
          onCancelReply={vi.fn()}
          onSend={onSend}
        />
      </MockedProvider>,
    );
    const input = screen.getByLabelText('Message Share your story');
    await userEvent.type(input, '@');
    await screen.findByRole('listbox');
    expect(screen.getAllByRole('option')).toHaveLength(6);
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(input).toHaveValue('@person5 ');
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, '@');
    await screen.findByRole('listbox');
    await userEvent.keyboard(
      '{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}',
    );
    expect(input).toHaveValue('@person0 ');
  });

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

  it('inserts a mention at the caret rather than at the end of the draft', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: SEARCH_USERS, variables: { query: '' } },
            result: {
              data: {
                users: [
                  {
                    __typename: 'User',
                    id: 'u2',
                    name: 'Devon Lane',
                    username: 'devon',
                    avatarColor: '#F2B8A2',
                    title: '',
                  },
                ],
              },
            },
          },
        ]}
      >
        <Composer
          channelName="Share your story"
          replyTo={null}
          onCancelReply={vi.fn()}
          onSend={vi.fn()}
        />
      </MockedProvider>,
    );
    const input = screen.getByLabelText('Message Share your story') as HTMLTextAreaElement;
    await userEvent.type(input, 'hello team');
    input.setSelectionRange(6, 6);
    await userEvent.click(screen.getByRole('button', { name: 'Mention someone' }));
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    expect(input).toHaveValue('hello @devon team');
  });

  it('prevents changes to the draft while sending', async () => {
    let finishSend!: () => void;
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSend = resolve;
        }),
    );
    renderComposer({ onSend });
    const input = screen.getByLabelText('Message Share your story');
    await userEvent.type(input, 'pending message');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    finishSend();
    await waitFor(() => expect(input).toBeEnabled());
    expect(input).toHaveValue('');
  });
});
