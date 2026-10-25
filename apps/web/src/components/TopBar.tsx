import { useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import { Avatar } from './Avatar';
import { BellIcon, ChevronDownIcon, HelpIcon, LogoutIcon } from './icons';

interface TopBarProps {
  me: User;
  onSignOut: () => void;
}

export function TopBar({ me, onSignOut }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <LogoMark />
        <span className="text-[15px] font-semibold tracking-tight">Gradual Community</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-content"
          aria-label="Notifications"
        >
          <BellIcon />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-content"
          aria-label="Help"
        >
          <HelpIcon />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-1 rounded-full p-0.5 transition hover:bg-white/5"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={me.name} color={me.avatarColor} size={32} />
            <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-line bg-[#201F27] p-1.5 shadow-popover">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{me.name}</p>
                <p className="truncate text-xs text-muted">
                  @{me.username}
                  {me.title ? ` · ${me.title}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-content"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function LogoMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F3D2E] ring-1 ring-accent/30">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M7 16.5c0-5 3.5-9 10-9-.5 6.5-4 10-10 9Z" fill="#7FD8BD" fillOpacity="0.92" />
        <path d="M6.5 17.5 13 11" stroke="#0C0E12" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
