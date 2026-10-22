import type { Channel } from '../types';
import { UsersIcon } from './icons';

interface ChatHeaderProps {
  channel: Channel;
  typingLabel: string | null;
}

export function ChatHeader({ channel, typingLabel }: ChatHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/30 px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[16px] font-semibold tracking-tight">{channel.name}</h1>
        {typingLabel ? (
          <span className="truncate text-[12px] text-accent/80" aria-live="polite">
            {typingLabel}
          </span>
        ) : null}
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
    </header>
  );
}
