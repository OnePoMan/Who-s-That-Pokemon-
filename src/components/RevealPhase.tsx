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
    <div className="flex flex-col items-center gap-2 animate-fade-in w-full">
      {/* Result header */}
      <h2 className={`font-pixel text-sm ${guessedCorrectly ? 'text-green-600' : 'text-pokemon-red'}`}>
        {guessedCorrectly ? 'Correct!' : 'Time\'s Up!'}
      </h2>

      {/* Pokemon name — appears after reveal */}
      <div className="text-center h-8">
        {revealed ? (
          <p className="font-pixel text-sm text-pokemon-dark animate-fade-in">{pokemon.name}!</p>
        ) : (
          <p className="font-pixel text-[10px] text-pokemon-gray">Who&apos;s That Pok&eacute;mon?</p>
        )}
      </div>

      {/* Stacked: Drawing on top, Official below */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Player's drawing */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-pokemon-gray uppercase tracking-widest">Your Drawing</span>
          <div className="w-[min(55vw,280px)] aspect-square rounded-lg overflow-hidden border-4 border-pokemon-dark bg-white">
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
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-pokemon-gray uppercase tracking-widest">Official</span>
          <div className="animate-bounce-in w-[min(55vw,280px)] aspect-square flex items-center justify-center">
            <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed={revealed} size={280} />
          </div>
        </div>
      </div>

      {/* Compact score row */}
      <div className="flex items-center gap-4 py-1">
        <div className="flex items-center gap-1.5">
          <AvatarIcon avatarId={drawer.avatarId} size="sm" />
          <span className="text-[10px] font-bold text-pokemon-dark font-body">{drawer.nickname}</span>
          <span className="text-base font-black text-pokemon-blue font-body">{drawer.score}</span>
        </div>
        <span className="text-xs font-bold text-pokemon-gray font-body">vs</span>
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black text-pokemon-blue font-body">{guesser.score}</span>
          <span className="text-[10px] font-bold text-pokemon-dark font-body">{guesser.nickname}</span>
          <AvatarIcon avatarId={guesser.avatarId} size="sm" />
        </div>
      </div>

      <PokeBallButton onClick={onNext} variant="red" size="md" className="w-full max-w-xs">
        {nextLabel}
      </PokeBallButton>
    </div>
  );
}
