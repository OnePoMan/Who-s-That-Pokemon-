'use client';

import { useState, useEffect } from 'react';
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
  drawingDataUrl: string;
}

export default function RevealPhase({ pokemon, guessedCorrectly, drawer, guesser, onNext, nextLabel, drawingDataUrl }: RevealPhaseProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <h2 className={`text-3xl font-black ${guessedCorrectly ? 'text-green-600' : 'text-pokemon-red'}`}>
        {guessedCorrectly ? 'Correct!' : 'Time\'s Up!'}
      </h2>

      {/* Pokemon name — appears after reveal */}
      <div className="text-center" style={{ minHeight: '3rem' }}>
        {revealed ? (
          <div className="animate-fade-in">
            <p className="text-lg text-pokemon-gray">It was...</p>
            <p className="text-2xl font-black text-pokemon-dark mt-1">{pokemon.name}!</p>
          </div>
        ) : (
          <p className="text-lg text-pokemon-gray">Who&apos;s That Pok&eacute;mon?</p>
        )}
      </div>

      {/* Side-by-side: Drawing vs Official Artwork */}
      <div className="flex gap-4 items-start justify-center">
        {/* Player's drawing */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-pokemon-gray uppercase tracking-wide">Your Drawing</span>
          <div className="w-[200px] h-[200px] rounded-lg overflow-hidden border-4 border-pokemon-dark bg-white">
            {drawingDataUrl ? (
              <img
                src={drawingDataUrl}
                alt="Player drawing"
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-pokemon-gray text-sm">
                No drawing
              </div>
            )}
          </div>
        </div>

        {/* Official artwork silhouette → reveal */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-pokemon-gray uppercase tracking-wide">Official</span>
          <div className="animate-bounce-in">
            <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed={revealed} size={200} />
          </div>
        </div>
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
