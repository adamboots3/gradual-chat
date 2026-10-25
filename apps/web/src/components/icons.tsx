import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </Icon>
);

export const HelpIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.6 2.2-2.6 4" />
    <path d="M12 17.2h.01" />
  </Icon>
);

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
  </Icon>
);

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" />
    <circle cx="9.5" cy="7.5" r="3.2" />
    <path d="M16.5 11.2a3.2 3.2 0 0 0 0-6.3" />
    <path d="M21 19v-1.5a4 4 0 0 0-3-3.8" />
  </Icon>
);

export const QuoteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 7H5a2 2 0 0 0-2 2v3h5V7Z" />
    <path d="M19 7h-3a2 2 0 0 0-2 2v3h5V7Z" />
    <path d="M3 12c0 3 1.5 5 4 6" />
    <path d="M14 12c0 3 1.5 5 4 6" />
  </Icon>
);

export const BoldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 5h5.5a3.5 3.5 0 0 1 0 7H7z" />
    <path d="M7 12h6.5a3.5 3.5 0 0 1 0 7H7z" />
  </Icon>
);

export const ItalicIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 5h-5" />
    <path d="M13 19H8" />
    <path d="M15 5 9 19" />
  </Icon>
);

export const StrikeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h16" />
    <path d="M16 7.5C16 5.9 14.2 5 12 5 9.5 5 8 6.2 8 8s1.6 2.8 4 3.4" />
    <path d="M8 16.5c0 1.6 1.8 2.5 4 2.5 2.5 0 4-1.2 4-3s-1.6-2.8-4-3.4" />
  </Icon>
);

export const CodeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 8-4 4 4 4" />
    <path d="m15 8 4 4-4 4" />
  </Icon>
);

export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);

export const ListOrderedIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M4 6h1v4M4 10h2" />
    <path d="M4 15h2l-2 3h2" />
  </Icon>
);

export const SmileIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <path d="M9 9.5h.01M15 9.5h.01" />
  </Icon>
);

export const AtIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M15.5 12v1.2a2.4 2.4 0 0 0 4.5 1.1A8.6 8.6 0 1 0 17 19" />
  </Icon>
);

export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 12 16-7-7 16-2.2-6.8L4 12Z" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 12H4" />
    <path d="m8 8-4 4 4 4" />
    <path d="M10 4h7a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-7" />
  </Icon>
);

export const ChatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12c0 3.9-3.6 7-8 7-1 0-2-.2-2.9-.5L4 20l1.3-3.4A6.4 6.4 0 0 1 4 12c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
  </Icon>
);

export const ForumIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </Icon>
);

export const MatchesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
  </Icon>
);

export const ContributorsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M4 20v-1.2A4.8 4.8 0 0 1 8.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="m18 7 .8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7L15.5 8.8l1.7-.2z" />
  </Icon>
);

export const SparkleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v6M12 14v6M4 12h6M14 12h6" />
  </Icon>
);
