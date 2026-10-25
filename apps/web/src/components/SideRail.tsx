import type { ReactNode } from 'react';
import { ChatIcon, ContributorsIcon, ForumIcon, MatchesIcon, UsersIcon } from './icons';

interface NavItemProps {
  label: string;
  icon: ReactNode;
  badge?: number;
  active?: boolean;
  tone?: string;
}

function NavItem({
  label,
  icon,
  badge,
  active,
  tone = 'bg-[#191820] text-content/80',
}: NavItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition ${
        active ? 'text-accent' : 'text-content/85 hover:text-content'
      }`}
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-[12px] ring-1 ring-white/5 transition ${
          active ? 'bg-white text-ink' : tone
        } group-hover:brightness-110`}
      >
        {icon}
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[10px] font-semibold leading-none text-white shadow">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  );
}

interface SideRailProps {
  unreadTotal: number;
}

export function SideRail({ unreadTotal }: SideRailProps) {
  return (
    <nav
      className="flex w-[196px] shrink-0 flex-col justify-between px-4 py-5"
      aria-label="Primary"
    >
      <div className="space-y-7">
        <div className="space-y-1">
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/80">
            Engage
          </p>
          <NavItem label="Forum" icon={<ForumIcon />} tone="bg-[#F2B84B] text-[#3A2A05]" />
          <NavItem label="Chat" icon={<ChatIcon />} badge={unreadTotal || undefined} active />
          <NavItem label="Matches" icon={<MatchesIcon />} tone="bg-[#8B7CF6] text-white" />
        </div>

        <div className="space-y-1">
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/80">
            People
          </p>
          <NavItem label="Members" icon={<UsersIcon />} tone="bg-[#6366F1] text-white" />
          <NavItem
            label="Contributors"
            icon={<ContributorsIcon />}
            tone="bg-[#A855F7] text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-content/70">
          G
        </span>
        <span className="text-[11px] leading-tight text-muted">
          Powered by
          <br />
          <span className="text-[12px] font-medium text-content/80">Gradual</span>
        </span>
      </div>
    </nav>
  );
}
