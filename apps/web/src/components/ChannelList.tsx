import { useMemo, useState } from 'react';
import type { Channel } from '../types';
import { Avatar, AvatarGroup } from './Avatar';
import { SearchIcon } from './icons';
import { formatTime, previewText } from '../lib/format';

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channelId: string) => void;
  loading?: boolean;
}

export function ChannelList({ channels, activeChannelId, onSelect, loading }: ChannelListProps) {
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return channels;
    return channels.filter((channel) => {
      const haystack = `${channel.name} ${channel.lastMessage?.body ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [channels, term]);

  return (
    <section
      className="flex w-[300px] shrink-0 flex-col border-r border-black/40 bg-panel"
      aria-label="Conversations"
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-black/30 px-4">
        <SearchIcon className="h-4 w-4 text-muted" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search"
          aria-label="Search conversations"
          className="w-full bg-transparent text-[14px] text-content placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto py-1">
        {loading && channels.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted">Loading conversations…</p>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted">No conversations match “{term}”.</p>
        ) : null}

        {filtered.map((channel) => {
          const active = channel.id === activeChannelId;
          const unread = channel.unreadCount > 0;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(channel.id)}
              aria-label={channel.name}
              aria-current={active ? 'true' : undefined}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                active ? 'bg-[#33313B]' : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className="relative">
                {channel.type === 'dm' ? (
                  <Avatar
                    name={channel.members[0]?.name ?? channel.name}
                    color={channel.members[0]?.avatarColor}
                    size={40}
                  />
                ) : (
                  <AvatarGroup people={channel.members} max={3} />
                )}
                {unread ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[10px] font-semibold leading-none text-white">
                    {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-[14.5px] ${
                      unread ? 'font-semibold text-content' : 'font-medium text-content/80'
                    }`}
                  >
                    {channel.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {channel.lastMessage ? formatTime(channel.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`truncate text-[12.5px] ${unread ? 'text-content/70' : 'text-muted'}`}
                  >
                    {channel.lastMessage
                      ? `${channel.lastMessage.author?.name?.split(' ')[0] ?? 'Someone'}: ${previewText(
                          channel.lastMessage.body,
                        )}`
                      : 'No messages yet'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
