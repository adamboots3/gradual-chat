import { initials } from '../lib/format';

interface AvatarProps {
  name: string;
  color?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Generated initials avatar. We deliberately avoid bundling third-party photos,
 * so the app has zero external asset dependencies.
 */
export function Avatar({ name, color, size = 40, className = '', title }: AvatarProps) {
  const background = color ?? '#7FD8BD';
  return (
    <span
      title={title ?? name}
      aria-label={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full border border-white/10 font-semibold text-ink/90 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        backgroundColor: background,
        backgroundImage: 'linear-gradient(140deg, rgba(255,255,255,0.28), rgba(0,0,0,0.22))',
      }}
    >
      {initials(name)}
    </span>
  );
}

interface AvatarGroupProps {
  people: Array<{ id: string; name: string; avatarColor: string }>;
  size?: number;
  max?: number;
}

export function AvatarGroup({ people, size = 26, max = 3 }: AvatarGroupProps) {
  return (
    <span className="flex shrink-0 items-center">
      {people.slice(0, max).map((person, index) => (
        <Avatar
          key={person.id}
          name={person.name}
          color={person.avatarColor}
          size={size}
          title={person.name}
          className={index === 0 ? 'ring-2 ring-panel' : '-ml-1.5 ring-2 ring-panel'}
        />
      ))}
    </span>
  );
}
