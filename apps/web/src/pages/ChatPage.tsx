import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  CHANNELS,
  DELETE_MESSAGE,
  MARK_CHANNEL_READ,
  ME,
  MESSAGES,
  SEND_MESSAGE,
} from '../graphql/operations';
import type { Channel, Message, User } from '../types';
import { TopBar } from '../components/TopBar';
import { SideRail } from '../components/SideRail';
import { ChannelList } from '../components/ChannelList';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { Composer } from '../components/Composer';
import { connectRealtime, type RealtimeClient } from '../lib/socket';
import { cacheMessage, messageToPreview, patchChannel, removeCachedMessage } from '../lib/cache';

interface MessagesData {
  messages: { messages: Message[]; nextCursor: string | null };
}

interface MessagesVars {
  channelId: string;
}

interface ChatPageProps {
  token: string;
  onSignOut: () => void;
}

export function ChatPage({ token, onSignOut }: ChatPageProps) {
  const client = useApolloClient();
  const { data: meData, loading: meLoading, error: meError } = useQuery<{ me: User | null }>(ME);
  const { data: channelData, loading: channelsLoading } = useQuery<{ channels: Channel[] }>(
    CHANNELS,
    { skip: !meData?.me },
  );

  const [markRead] = useMutation(MARK_CHANNEL_READ);
  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [deleteMessage] = useMutation(DELETE_MESSAGE);

  const me = meData?.me ?? null;
  const channels = useMemo(() => channelData?.channels ?? [], [channelData]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (channels.length === 0) return;
    if (activeId && channels.some((channel) => channel.id === activeId)) return;
    const preferred =
      channels.find((channel) => channel.slug === 'share-your-story') ?? channels[0];
    setActiveId(preferred.id);
  }, [channels, activeId]);

  useEffect(() => {
    setReplyTo(null);
  }, [activeId]);

  // Opening a channel (or receiving a message in it) clears its badge.
  useEffect(() => {
    if (!activeId) return;
    const channel = channels.find((item) => item.id === activeId);
    if (!channel) return;
    if (channel.unreadCount === 0) return;
    void markRead({
      variables: { channelId: activeId, lastMessageId: channel.lastMessage?.id ?? null },
    });
  }, [activeId, channels, markRead]);

  const appendMessage = useCallback(
    (incoming: Message) => {
      const message = cacheMessage(incoming);
      client.cache.updateQuery<MessagesData, MessagesVars>(
        { query: MESSAGES, variables: { channelId: message.channelId } },
        (data) => {
          if (!data) return data;
          if (data.messages.messages.some((item) => item.id === message.id)) return data;
          return {
            messages: { ...data.messages, messages: [...data.messages.messages, message] },
          };
        },
      );

      client.cache.updateQuery<{ channels: Channel[] }>({ query: CHANNELS }, (data) => {
        if (!data) return data;
        return {
          channels: data.channels.map((channel) =>
            channel.id === message.channelId
              ? patchChannel(channel, { lastMessage: messageToPreview(message) })
              : channel,
          ),
        };
      });
    },
    [client],
  );

  const removeMessage = useCallback(
    (messageId: string, channelId: string) => {
      removeCachedMessage(client.cache, messageId, channelId);
    },
    [client],
  );

  const updateChannelBadge = useCallback(
    (channelId: string, unreadCount: number) => {
      client.cache.updateQuery<{ channels: Channel[] }>({ query: CHANNELS }, (data) => {
        if (!data) return data;
        return {
          channels: data.channels.map((channel) =>
            channel.id === channelId ? patchChannel(channel, { unreadCount }) : channel,
          ),
        };
      });
    },
    [client],
  );

  useEffect(() => {
    if (!me) return;
    const realtime: RealtimeClient = connectRealtime(token, {
      // A socket can connect before the gateway has finished joining its channel
      // rooms, and messages sent while disconnected are never replayed — so we
      // reconcile from the source of truth on every (re)connect.
      onConnected() {
        void client.refetchQueries({ include: [CHANNELS, MESSAGES] });
      },
      onMessage(message) {
        appendMessage(message);
        if (message.channelId === activeIdRef.current && message.author.id !== me.id) {
          void markRead({
            variables: { channelId: message.channelId, lastMessageId: message.id },
          });
        }
      },
      onMessageUpdated(message) {
        const updated = cacheMessage(message);
        client.cache.updateQuery<MessagesData, MessagesVars>(
          { query: MESSAGES, variables: { channelId: updated.channelId } },
          (data) => {
            if (!data) return data;
            return {
              messages: {
                ...data.messages,
                messages: data.messages.messages.map((item) =>
                  item.id === updated.id ? updated : item,
                ),
              },
            };
          },
        );
      },
      onMessageDeleted(payload) {
        removeMessage(payload.messageId, payload.channelId);
        void client.refetchQueries({ include: [CHANNELS] });
      },
      onUnread(payload) {
        updateChannelBadge(payload.channelId, payload.unreadCount);
      },
    });

    return () => {
      realtime.disconnect();
    };
  }, [token, me, appendMessage, removeMessage, updateChannelBadge, markRead, client]);

  const activeChannel = channels.find((channel) => channel.id === activeId) ?? null;
  const unreadTotal = channels.reduce((total, channel) => total + channel.unreadCount, 0);

  const handleSend = async (body: string, replyToId: string | null) => {
    if (!activeId) return;
    const result = await sendMessage({
      variables: { input: { channelId: activeId, body, replyToId } },
    });
    const message = result.data?.sendMessage as Message | undefined;
    if (message) appendMessage(message);
    setReplyTo(null);
  };

  const handleDelete = async (message: Message) => {
    if (!window.confirm('Delete this message?')) return;
    await deleteMessage({ variables: { id: message.id } });
    removeMessage(message.id, message.channelId);
    void client.refetchQueries({ include: [CHANNELS] });
  };

  if (meLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted">
        Loading your workspace…
      </div>
    );
  }

  if (meError || !me) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-[14px] text-content">Your session expired.</p>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-ink"
        >
          Sign in again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar me={me} onSignOut={onSignOut} />

      <div className="flex min-h-0 flex-1">
        <SideRail unreadTotal={unreadTotal} />

        <ChannelList
          channels={channels}
          activeChannelId={activeId}
          onSelect={setActiveId}
          loading={channelsLoading}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-panel">
          {activeChannel ? (
            <>
              <ChatHeader channel={activeChannel} />
              <MessageList
                channelId={activeChannel.id}
                currentUserId={me.id}
                onQuote={setReplyTo}
                onDelete={(message) => void handleDelete(message)}
              />
              <Composer
                channelName={activeChannel.name}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSend={handleSend}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
              {channelsLoading ? 'Loading conversations…' : 'Select a conversation to get started.'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
