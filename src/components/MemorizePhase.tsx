'use client';

import { useState, useEffect } from 'react';
import { PokemonData, Player } from '@/lib/game-state';
import PokemonSilhouette from './PokemonSilhouette';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

interface MemorizePhaseProps {
  pokemon: PokemonData;
  drawer: Player;
  guesser: Player;
  isLocalMode: boolean;
  onReady: () => void;
}

export default function MemorizePhase({ pokemon, drawer, guesser, isLocalMode, onReady }: MemorizePhaseProps) {
  const [countdown, setCountdown] = useState(5);
  const [showPokemon, setShowPokemon] = useState(false);
  const [readyClicked, setReadyClicked] = useState(false);

  useEffect(() => {
    if (isLocalMode && !readyClicked) return;

    setShowPokemon(true);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocalMode, readyClicked]);

  useEffect(() => {
    if (countdown === 0 && showPokemon) {
      const timeout = setTimeout(onReady, 500);
      return () => clearTimeout(timeout);
    }
  }, [countdown, showPokemon, onReady]);

  if (isLocalMode && !readyClicked) {
    return (
      <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
        <div className="flex items-center gap-3">
          <AvatarIcon avatarId={drawer.avatarId} size="lg" />
          <div className="text-left">
            <p className="text-base font-bold text-pokemon-dark font-body">{drawer.nickname}&apos;s turn to draw!</p>
            <p className="text-xs text-pokemon-gray font-body">
              Hand the device to {drawer.nickname}
            </p>
          </div>
        </div>
        <div className="pokemon-card w-full max-w-xs">
          <div className="pokemon-card-body text-center">
            <p className="text-sm text-pokemon-dark font-body">
              <span className="font-bold">{guesser.nickname}</span> should look away!
              <br />
              <span className="text-xs text-pokemon-gray">Only the drawer should see the Pokemon.</span>
            </p>
          </div>
        </div>
        <PokeBallButton onClick={() => setReadyClicked(true)} variant="red" size="lg">
          I&apos;m {drawer.nickname} - Show me!
        </PokeBallButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <h2 className="font-pixel text-sm text-pokemon-dark text-center">Memorize this Pok&eacute;mon!</h2>
      <p className="text-pokemon-gray text-xs font-body">You have {countdown} seconds</p>

      <div className="animate-bounce-in">
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed size={220} />
      </div>

      <p className="font-pixel text-sm text-pokemon-blue">{pokemon.name}</p>

      {/* Countdown ring */}
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            stroke="var(--pokemon-red)"
            strokeWidth="3"
            strokeDasharray="100"
            strokeDashoffset={100 - (countdown / 5) * 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-pokemon-dark font-body">
          {countdown}
        </span>
      </div>
    </div>
  );
}
