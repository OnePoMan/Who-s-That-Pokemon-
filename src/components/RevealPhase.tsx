'use client';

import { PokemonData, Player } from '@/lib/game-state';
import PokemonSilhouette from './PokemonSilhouette';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

interface RevealPhaseProps {
  pokemon: PokemonData;
  guessedCorrectly: boolean;
  drawer: Player;
  guesser: Player;
  onNext: () => void;
  nextLabel: string;
}

export default function RevealPhase({ pokemon, guessedCorrectly, drawer, guesser, onNext, nextLabel }: RevealPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <h2 className={`text-3xl font-black ${guessedCorrectly ? 'text-green-600' : 'text-pokemon-red'}`}>
        {guessedCorrectly ? 'Correct!' : 'Time\'s Up!'}
      </h2>

      <div className="text-center">
        <p className="text-lg text-pokemon-gray">It was...</p>
        <p className="text-2xl font-black text-pokemon-dark mt-1">{pokemon.name}!</p>
      </div>

      <div className="animate-bounce-in">
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed size={200} />
      </div>

      {/* Scoreboard */}
      <div className="flex gap-8 items-center">
        <div className="flex flex-col items-center gap-1">
          <AvatarIcon avatarId={drawer.avatarId} size="md" />
          <span className="text-sm font-bold text-pokemon-dark">{drawer.nickname}</span>
          <span className="text-2xl font-black text-pokemon-blue">{drawer.score}</span>
        </div>
        <span className="text-2xl font-bold text-pokemon-gray">vs</span>
        <div className="flex flex-col items-center gap-1">
          <AvatarIcon avatarId={guesser.avatarId} size="md" />
          <span className="text-sm font-bold text-pokemon-dark">{guesser.nickname}</span>
          <span className="text-2xl font-black text-pokemon-blue">{guesser.score}</span>
        </div>
      </div>

      <PokeBallButton onClick={onNext} variant="red" size="lg" className="w-full max-w-xs">
        {nextLabel}
      </PokeBallButton>
    </div>
  );
}
