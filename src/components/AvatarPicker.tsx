'use client';

// Trainer sprites come from the Pokémon Showdown sprite collection (credited in the README) and
// are served from /public so avatars do not depend on another site staying reachable.
export const TRAINERS = [
  { id: 1, name: 'Red', sprite: 'red' },
  { id: 2, name: 'Blue', sprite: 'blue' },
  { id: 3, name: 'Leaf', sprite: 'green' },
  { id: 4, name: 'Ethan', sprite: 'ethan' },
  { id: 5, name: 'Lyra', sprite: 'lyra' },
  { id: 6, name: 'Brendan', sprite: 'brendan' },
  { id: 7, name: 'May', sprite: 'may' },
  { id: 8, name: 'Lucas', sprite: 'lucas' },
  { id: 9, name: 'Dawn', sprite: 'dawn' },
  { id: 10, name: 'Hilbert', sprite: 'hilbert' },
  { id: 11, name: 'Hilda', sprite: 'hilda' },
  { id: 12, name: 'Nate', sprite: 'nate' },
  { id: 13, name: 'Rosa', sprite: 'rosa' },
  { id: 14, name: 'Calem', sprite: 'calem' },
  { id: 15, name: 'Serena', sprite: 'serena' },
  { id: 16, name: 'Cynthia', sprite: 'cynthia' },
  { id: 17, name: 'N', sprite: 'n' },
  { id: 18, name: 'Steven', sprite: 'steven' },
  { id: 19, name: 'Lance', sprite: 'lance' },
  { id: 20, name: 'Misty', sprite: 'misty' },
  { id: 21, name: 'Brock', sprite: 'brock' },
  { id: 22, name: 'Iris', sprite: 'iris' },
  { id: 23, name: 'Leon', sprite: 'leon' },
  { id: 24, name: 'Marnie', sprite: 'marnie' },
  { id: 25, name: 'Elesa', sprite: 'elesa' },
  { id: 26, name: 'Clair', sprite: 'clair' },
  { id: 27, name: 'Volkner', sprite: 'volkner' },
  { id: 28, name: 'Flannery', sprite: 'flannery' },
] as const;

const spriteUrl = (sprite: string) => `/trainers/${sprite}.png`;

function trainerFor(avatarId: number) {
  return TRAINERS.find((t) => t.id === avatarId) ?? TRAINERS[0];
}

export function AvatarIcon({ avatarId, size = 'md' }: { avatarId: number; size?: 'sm' | 'md' | 'lg' }) {
  const trainer = trainerFor(avatarId);
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  return (
    <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-surface-2 border-2 border-line shadow-md`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny pixel sprites; no optimisation wanted */}
      <img src={spriteUrl(trainer.sprite)} alt={trainer.name} className="w-full h-full object-cover object-top pixelated" draggable={false} />
    </div>
  );
}

interface AvatarPickerProps {
  selectedId: number;
  onSelect: (id: number) => void;
  disabledIds?: number[];
  label?: string;
}

export default function AvatarPicker({ selectedId, onSelect, disabledIds = [], label = 'Choose a trainer' }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-7 gap-2 justify-items-center max-w-sm mx-auto" role="radiogroup" aria-label={label}>
      {TRAINERS.map((trainer) => (
        <button
          key={trainer.id}
          type="button"
          role="radio"
          aria-checked={selectedId === trainer.id}
          aria-label={trainer.name}
          title={trainer.name}
          onClick={() => onSelect(trainer.id)}
          disabled={disabledIds.includes(trainer.id)}
          className={`w-11 h-11 rounded-full overflow-hidden transition-transform duration-200 border-2 bg-surface-2 ${
            selectedId === trainer.id
              ? 'border-pokemon-blue ring-2 ring-pokemon-blue scale-110 shadow-lg'
              : 'border-line/40 hover:scale-105 hover:border-line'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={spriteUrl(trainer.sprite)} alt="" className="w-full h-full object-cover object-top pixelated" draggable={false} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
