'use client';

// Colours follow the games' familiar type palette; text colour is chosen for contrast.
const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  normal: { bg: '#A8A77A', fg: '#1a1a1a' },
  fire: { bg: '#EE8130', fg: '#1a1a1a' },
  water: { bg: '#6390F0', fg: '#1a1a1a' },
  grass: { bg: '#7AC74C', fg: '#1a1a1a' },
  electric: { bg: '#F7D02C', fg: '#1a1a1a' },
  ice: { bg: '#96D9D6', fg: '#1a1a1a' },
  fighting: { bg: '#C22E28', fg: '#ffffff' },
  poison: { bg: '#A33EA1', fg: '#ffffff' },
  ground: { bg: '#E2BF65', fg: '#1a1a1a' },
  flying: { bg: '#A98FF3', fg: '#1a1a1a' },
  psychic: { bg: '#F95587', fg: '#1a1a1a' },
  bug: { bg: '#A6B91A', fg: '#1a1a1a' },
  rock: { bg: '#B6A136', fg: '#1a1a1a' },
  ghost: { bg: '#735797', fg: '#ffffff' },
  dragon: { bg: '#6F35FC', fg: '#ffffff' },
  dark: { bg: '#705746', fg: '#ffffff' },
  steel: { bg: '#B7B7CE', fg: '#1a1a1a' },
  fairy: { bg: '#D685AD', fg: '#1a1a1a' },
};

interface TypeBadgeProps {
  type: string;
  as?: 'span' | 'button';
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

export default function TypeBadge({ type, as = 'span', selected = false, dimmed = false, onClick }: TypeBadgeProps) {
  const color = TYPE_COLORS[type] ?? TYPE_COLORS.normal;
  const label = type[0].toUpperCase() + type.slice(1);
  const className = `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold font-body border-2 transition-opacity ${
    selected ? 'border-ink ring-2 ring-pokemon-blue' : 'border-transparent'
  } ${dimmed ? 'opacity-40' : ''}`;
  const style = { backgroundColor: color.bg, color: color.fg };
  if (as === 'button') {
    return (
      <button type="button" aria-pressed={selected} onClick={onClick} className={className} style={style}>
        {label}
      </button>
    );
  }
  return (
    <span className={className} style={style}>
      {label}
    </span>
  );
}
