'use client';

import { useState } from 'react';

const SHOWDOWN_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/trainers';

// 28 iconic trainers from across the Pokemon games
const TRAINERS = [
  { id: 1, name: 'Red', sprite: 'red.png' },
  { id: 2, name: 'Blue', sprite: 'blue.png' },
  { id: 3, name: 'Leaf', sprite: 'leaf.png' },
  { id: 4, name: 'Ethan', sprite: 'ethan.png' },
  { id: 5, name: 'Lyra', sprite: 'lyra.png' },
  { id: 6, name: 'Brendan', sprite: 'brendan.png' },
  { id: 7, name: 'May', sprite: 'may.png' },
  { id: 8, name: 'Lucas', sprite: 'lucas.png' },
  { id: 9, name: 'Dawn', sprite: 'dawn.png' },
  { id: 10, name: 'Hilbert', sprite: 'hilbert.png' },
  { id: 11, name: 'Hilda', sprite: 'hilda.png' },
  { id: 12, name: 'Nate', sprite: 'nate.png' },
  { id: 13, name: 'Rosa', sprite: 'rosa.png' },
  { id: 14, name: 'Calem', sprite: 'calem.png' },
  { id: 15, name: 'Serena', sprite: 'serena.png' },
  { id: 16, name: 'Cynthia', sprite: 'cynthia.png' },
  { id: 17, name: 'N', sprite: 'n.png' },
  { id: 18, name: 'Steven', sprite: 'steven.png' },
  { id: 19, name: 'Lance', sprite: 'lance.png' },
  { id: 20, name: 'Misty', sprite: 'misty.png' },
  { id: 21, name: 'Brock', sprite: 'brock.png' },
  { id: 22, name: 'Iris', sprite: 'iris.png' },
  { id: 23, name: 'Leon', sprite: 'leon.png' },
  { id: 24, name: 'Marnie', sprite: 'marnie.png' },
  { id: 25, name: 'Elesa', sprite: 'elesa.png' },
  { id: 26, name: 'Clair', sprite: 'clair.png' },
  { id: 27, name: 'Volkner', sprite: 'volkner.png' },
  { id: 28, name: 'Flannery', sprite: 'flannery.png' },
];

function getTrainerUrl(sprite: string): string {
  return `${SHOWDOWN_SPRITE_BASE}/${sprite}`;
}

interface AvatarPickerProps {
  selectedId: number;
  onSelect: (id: number) => void;
  disabledIds?: number[];
}

export function AvatarIcon({ avatarId, size = 'md' }: { avatarId: number; size?: 'sm' | 'md' | 'lg' }) {
  const trainer = TRAINERS.find((t) => t.id === avatarId) || TRAINERS[0];
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center overflow-hidden bg-pokemon-light-gray border-2 border-pokemon-dark shadow-md`}>
      {!imgError ? (
        <img
          src={getTrainerUrl(trainer.sprite)}
          alt={trainer.name}
          className="w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <span className="text-xs font-bold text-pokemon-dark">{trainer.name[0]}</span>
      )}
    </div>
  );
}

export default function AvatarPicker({ selectedId, onSelect, disabledIds = [] }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-7 gap-2 justify-items-center max-w-sm mx-auto">
      {TRAINERS.map((trainer) => (
        <button
          key={trainer.id}
          onClick={() => onSelect(trainer.id)}
          disabled={disabledIds.includes(trainer.id)}
          title={trainer.name}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center overflow-hidden
            transition-all duration-200 border-2 bg-pokemon-light-gray
            ${selectedId === trainer.id
              ? 'border-pokemon-blue ring-2 ring-pokemon-blue scale-110 shadow-lg'
              : 'border-pokemon-gray/40 hover:scale-105 hover:border-pokemon-dark'}
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          <img
            src={getTrainerUrl(trainer.sprite)}
            alt={trainer.name}
            className="w-full h-full object-cover object-top"
            draggable={false}
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}
