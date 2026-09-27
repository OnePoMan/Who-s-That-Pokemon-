'use client';

import type { Player, PokemonData } from '@/lib/game-state';
import PokemonSilhouette from './PokemonSilhouette';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

interface MemorizePhaseProps {
  /** Null when this device belongs to the guesser in a remote game. */
  pokemon: PokemonData | null;
  drawer: Player;
  guessers: Player[];
  /** 'local' shows the pass-the-phone handoff first. */
  view: 'local' | 'drawer' | 'guesser';
  /** Null until the drawer has the phone and taps "Show me". */
  remainingMs: number | null;
  totalSeconds: number;
  showArtwork: boolean;
  onShowMe: () => void;
  onReady: () => void;
}

export default function MemorizePhase({
  pokemon,
  drawer,
  guessers,
  view,
  remainingMs,
  totalSeconds,
  showArtwork,
  onShowMe,
  onReady,
}: MemorizePhaseProps) {
  if (view === 'guesser') {
    return (
      <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
        <AvatarIcon avatarId={drawer.avatarId} size="lg" />
        <p className="font-body text-base font-bold text-pokemon-dark">{drawer.nickname} is memorizing a Pokémon…</p>
        <p className="font-body text-sm text-pokemon-gray">Get ready to guess!</p>
        {remainingMs !== null && <Countdown remainingMs={remainingMs} totalSeconds={totalSeconds} />}
      </div>
    );
  }

  if (view === 'local' && remainingMs === null) {
    return (
      <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
        <div className="flex items-center gap-3">
          <AvatarIcon avatarId={drawer.avatarId} size="lg" />
          <div className="text-left">
            <p className="text-base font-bold text-pokemon-dark font-body">{drawer.nickname}&apos;s turn to draw!</p>
            <p className="text-xs text-pokemon-gray font-body">Hand the phone to {drawer.nickname}.</p>
          </div>
        </div>
        <div className="pokemon-card w-full max-w-xs">
          <div className="pokemon-card-body text-center font-body">
            <p className="text-sm text-ink">
              <span className="font-bold">{listNames(guessers)}</span>, look away!
            </p>
            <p className="text-xs text-pokemon-gray mt-1">
              You&apos;ll get the signal to watch once the Pokémon is hidden.
            </p>
          </div>
        </div>
        <PokeBallButton onClick={onShowMe} variant="red" size="lg">
          I&apos;m {drawer.nickname} — show me!
        </PokeBallButton>
      </div>
    );
  }

  if (!pokemon || remainingMs === null) return null;

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in w-full">
      {view === 'local' && (
        <p className="font-body text-xs font-bold text-pokemon-red bg-red-50 border border-pokemon-red/30 rounded-full px-3 py-1">
          {guessers.length === 1 ? `${guessers[0].nickname}, no peeking!` : 'Everyone else, no peeking!'}
        </p>
      )}
      <h2 className="font-pixel text-xs text-pokemon-dark text-center leading-relaxed">Memorize this Pokémon!</h2>
      {showArtwork ? (
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed name={pokemon.name} className="w-[min(60vw,240px)]" />
      ) : (
        <p className="font-body text-xs text-pokemon-gray">Name only — draw it from memory!</p>
      )}
      <p className="font-pixel text-base text-pokemon-blue text-center leading-relaxed">{pokemon.name}</p>
      <Countdown remainingMs={remainingMs} totalSeconds={totalSeconds} />
      <PokeBallButton onClick={onReady} variant="blue" size="md">
        I&apos;m ready — start drawing
      </PokeBallButton>
    </div>
  );
}

function Countdown({ remainingMs, totalSeconds }: { remainingMs: number; totalSeconds: number }) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const fraction = Math.max(0, Math.min(1, remainingMs / (totalSeconds * 1000)));
  return (
    <div className="relative w-14 h-14" role="timer" aria-label={`${seconds} seconds to memorize`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="var(--pokemon-red)"
          strokeWidth="3"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - fraction * 100}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-pokemon-dark font-body">{seconds}</span>
    </div>
  );
}

export function listNames(players: Player[]): string {
  const names = players.map((p) => p.nickname);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
