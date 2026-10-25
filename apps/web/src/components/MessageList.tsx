import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { MESSAGES } from '../graphql/operations';
import type { Message } from '../types';
import { MessageItem } from './MessageItem';
import { formatDay } from '../lib/format';

interface MessagesData {
  messages: {
    messages: Message[];
    nextCursor: string | null;
  };
}

interface MessagesVars {
  channelId: string;
  cursor?: string | null;
}

interface MessageListProps {
  channelId: string;
  currentUserId: string;
  onQuote: (message: Message) => void;
}

export function MessageList({ channelId, currentUserId, onQuote }: MessageListProps) {
  const { data, loading, error, fetchMore } = useQuery<MessagesData, MessagesVars>(MESSAGES, {
    variables: { channelId },
    fetchPolicy: 'cache-and-network',
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const messages = data?.messages.messages ?? [];

  // Jump to the newest message when switching channels.
  useEffect(() => {
    stickToBottom.current = true;
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [channelId]);

  // Follow new messages only when the reader is already at the bottom.
  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages.length]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  };

  const loadOlder = () => {
    const cursor = data?.messages.nextCursor;
    if (!cursor) return;
    void fetchMore({ variables: { channelId, cursor } });
  };

  let lastDay = '';

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-5"
    >
      {data?.messages.nextCursor ? (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={loadOlder}
            className="rounded-full border border-line px-3 py-1 text-[12px] text-muted transition hover:border-white/25 hover:text-content"
          >
            Load earlier messages
          </button>
        </div>
      ) : null}

      {loading && messages.length === 0 ? (
        <p className="text-[13px] text-muted">Loading messages…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-badge/40 bg-badge/10 px-3 py-2 text-[13px] text-badge">
          Could not load messages: {error.message}
        </p>
      ) : null}

      {!loading && !error && messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-[13px] text-muted">No messages yet — say hello 👋</p>
        </div>
      ) : null}

      <div className="space-y-5">
        {messages.map((message) => {
          const day = formatDay(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={message.id} className="space-y-5">
              {showDay ? (
                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-line/60" />
                  <span className="text-[11px] uppercase tracking-wider text-muted/80">{day}</span>
                  <span className="h-px flex-1 bg-line/60" />
                </div>
              ) : null}
              <MessageItem
                message={message}
                isMine={message.author.id === currentUserId}
                onQuote={onQuote}
              />
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
