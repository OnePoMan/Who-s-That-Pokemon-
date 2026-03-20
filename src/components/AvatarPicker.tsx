'use client';

// Pokemon-themed avatars using Unicode / simple SVG shapes
const AVATARS = [
  { id: 1, emoji: '⚡', bg: 'bg-yellow-400' },
  { id: 2, emoji: '🔥', bg: 'bg-red-400' },
  { id: 3, emoji: '💧', bg: 'bg-blue-400' },
  { id: 4, emoji: '🌿', bg: 'bg-green-400' },
  { id: 5, emoji: '⭐', bg: 'bg-purple-400' },
  { id: 6, emoji: '🌙', bg: 'bg-indigo-400' },
  { id: 7, emoji: '💎', bg: 'bg-cyan-400' },
  { id: 8, emoji: '🐉', bg: 'bg-orange-400' },
];

interface AvatarPickerProps {
  selectedId: number;
  onSelect: (id: number) => void;
  disabledIds?: number[];
}

export function AvatarIcon({ avatarId, size = 'md' }: { avatarId: number; size?: 'sm' | 'md' | 'lg' }) {
  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-lg' : size === 'lg' ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-2xl';

  return (
    <div className={`${avatar.bg} ${sizeClass} rounded-full flex items-center justify-center shadow-md`}>
      {avatar.emoji}
    </div>
  );
}

export default function AvatarPicker({ selectedId, onSelect, disabledIds = [] }: AvatarPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          onClick={() => onSelect(avatar.id)}
          disabled={disabledIds.includes(avatar.id)}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center text-2xl
            transition-all duration-200
            ${avatar.bg}
            ${selectedId === avatar.id ? 'ring-4 ring-pokemon-blue scale-110 shadow-lg' : 'hover:scale-105'}
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          {avatar.emoji}
        </button>
      ))}
    </div>
  );
}
