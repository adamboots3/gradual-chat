import type { Channel } from '../types';
import { Avatar } from './Avatar';
import { UsersIcon } from './icons';

interface ChatHeaderProps {
  channel: Channel;
  typingLabel: string | null;
}

export function ChatHeader({ channel, typingLabel }: ChatHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/30 px-6">
      <div className="min-w-0">
        <h1 className="truncate text-[16px] font-semibold tracking-tight">{channel.name}</h1>
        {typingLabel ? (
          <p className="truncate text-[12px] text-accent/80">{typingLabel}</p>
        ) : (
          <p className="truncate text-[12px] text-muted">
            {channel.type === 'dm' ? 'Direct message' : `${channel.memberCount} members`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="mr-1 hidden items-center sm:flex">
          {channel.members.slice(0, 4).map((member, index) => (
            <Avatar
              key={member.id}
              name={member.name}
              color={member.avatarColor}
              size={24}
              className={index === 0 ? '' : '-ml-1.5 ring-2 ring-panel'}
              title={member.name}
            />
          ))}
        </div>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-medium text-content/85 transition hover:border-white/30 hover:text-content"
          aria-label={`${channel.memberCount} members`}
          title="Members"
        >
          <UsersIcon className="h-4 w-4" />
          {channel.memberCount}
        </button>
      </div>
    </header>
  );
}
