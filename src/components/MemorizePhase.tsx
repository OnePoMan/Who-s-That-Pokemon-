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
    // In local mode: show "hand device to drawer" message first
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
      <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
        <div className="flex items-center gap-3">
          <AvatarIcon avatarId={drawer.avatarId} size="lg" />
          <div>
            <p className="text-lg font-bold text-pokemon-dark">{drawer.nickname}&apos;s turn to draw!</p>
            <p className="text-sm text-pokemon-gray">
              Hand the device to {drawer.nickname}
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border-2 border-pokemon-yellow rounded-lg p-4 max-w-xs">
          <p className="text-sm text-pokemon-dark">
            <span className="font-bold">{guesser.nickname}</span> should look away!
            <br />
            Only the drawer should see the Pokemon.
          </p>
        </div>
        <PokeBallButton onClick={() => setReadyClicked(true)} variant="red" size="lg">
          I&apos;m {drawer.nickname} - Show me!
        </PokeBallButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <h2 className="text-2xl font-black text-pokemon-dark">Memorize this Pok&eacute;mon!</h2>
      <p className="text-pokemon-gray text-sm">You have {countdown} seconds</p>

      <div className="animate-bounce-in">
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed size={250} />
      </div>

      <p className="text-xl font-bold text-pokemon-blue">{pokemon.name}</p>

      {/* Countdown ring */}
      <div className="relative w-16 h-16">
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
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-pokemon-dark">
          {countdown}
        </span>
      </div>
    </div>
  );
}
