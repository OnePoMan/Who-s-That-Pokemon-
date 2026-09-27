'use client';

import { useEffect, useState } from 'react';
import type { Player, PokemonData, RoundOutcome } from '@/lib/game-state';
import type { DrawEvent } from '@/lib/canvas-engine';
import PokemonSilhouette from './PokemonSilhouette';
import DrawingReplay from './DrawingReplay';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

export interface SavedDrawing {
  dataUrl: string;
  timeline: DrawEvent[];
}

interface RevealPhaseProps {
  pokemon: PokemonData;
  outcome: RoundOutcome;
  drawer: Player;
  guesser: Player;
  drawing: SavedDrawing | undefined;
  onNext: () => void;
  nextLabel: string;
  onShare: () => void;
}

const HEADLINES: Record<RoundOutcome, { text: (guesser: string) => string; color: string }> = {
  correct: { text: (g) => `${g} got it!`, color: 'text-green-700' },
  skipped: { text: () => 'Skipped', color: 'text-pokemon-gray' },
  timeout: { text: () => "Time's up!", color: 'text-pokemon-red' },
};

export default function RevealPhase({ pokemon, outcome, drawer, guesser, drawing, onNext, nextLabel, onShare }: RevealPhaseProps) {
  const [revealed, setRevealed] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const headline = HEADLINES[outcome];
  const box = 'w-[min(55vw,280px,calc((100dvh-340px)/2))] min-w-[140px] aspect-square';

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in w-full">
      <h2 className={`font-pixel text-sm text-center leading-relaxed ${headline.color}`}>{headline.text(guesser.nickname)}</h2>

      <div className="text-center h-8 flex items-center" aria-live="polite">
        {revealed ? (
          <p className="font-pixel text-sm text-pokemon-dark animate-fade-in leading-relaxed">It&apos;s {pokemon.name}!</p>
        ) : (
          <p className="font-pixel text-[10px] text-pokemon-gray">Who&apos;s that Pokémon?</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold text-pokemon-gray uppercase tracking-widest">{drawer.nickname}&apos;s drawing</span>
        <div className={`${box} rounded-lg overflow-hidden border-4 border-pokemon-dark bg-white`}>
          {drawing && replaying ? (
            <DrawingReplay events={drawing.timeline} onDone={() => setReplaying(false)} />
          ) : drawing ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={drawing.dataUrl} alt={`${drawer.nickname}'s drawing`} className="w-full h-full object-contain" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-pokemon-gray text-sm">No drawing</div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold text-pokemon-gray uppercase tracking-widest">Official</span>
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed={revealed} name={pokemon.name} className={`${box} animate-bounce-in`} />
      </div>

      <div className="flex items-center gap-4 py-1 font-body">
        <ScoreChip player={drawer} />
        <span className="text-xs font-bold text-pokemon-gray">vs</span>
        <ScoreChip player={guesser} reverse />
      </div>

      <div className="flex gap-2 w-full max-w-xs">
        {drawing && (
          <>
            <PokeBallButton onClick={() => setReplaying(true)} variant="gray" size="sm" disabled={replaying} className="flex-1">
              Replay
            </PokeBallButton>
            <PokeBallButton onClick={onShare} variant="blue" size="sm" className="flex-1">
              Share
            </PokeBallButton>
          </>
        )}
      </div>
      {/* Held until the reveal so a double tap on "got it" can't skip past the answer. */}
      <PokeBallButton onClick={onNext} variant="red" size="md" className="w-full max-w-xs" disabled={!revealed}>
        {nextLabel}
      </PokeBallButton>
    </div>
  );
}

function ScoreChip({ player, reverse = false }: { player: Player; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${reverse ? 'flex-row-reverse' : ''}`}>
      <AvatarIcon avatarId={player.avatarId} size="sm" />
      <span className="text-[11px] font-bold text-pokemon-dark">{player.nickname}</span>
      <span className="text-base font-black text-pokemon-blue">{player.score}</span>
    </div>
  );
}
