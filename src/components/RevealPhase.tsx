'use client';

import { useEffect, useState } from 'react';
import type { Player, PokemonData, RoundOutcome } from '@/lib/game-state';
import type { DrawEvent } from '@/lib/canvas-engine';
import RevealStage from './RevealStage';
import DrawingReplay from './DrawingReplay';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

export interface SavedDrawing {
  dataUrl: string;
  timeline: DrawEvent[];
  /** Share of the drawing time still left when the round ended (0..1). */
  leftFraction?: number;
}

interface RevealPhaseProps {
  pokemon: PokemonData;
  outcome: RoundOutcome;
  drawer: Player;
  players: Player[];
  solver: Player | null;
  /** Shared-phone party round: ask who guessed it before moving on. */
  awaitingSolver: boolean;
  /** Whether this device may answer "who got it?" (the drawer's phone, or the shared phone). */
  canAssign: boolean;
  onAssign: (playerId: string) => void;
  streaks: Record<string, number>;
  drawing: SavedDrawing | undefined;
  onNext: () => void;
  nextLabel: string;
  onShare: () => void;
}

function headline(outcome: RoundOutcome, solver: Player | null, awaiting: boolean): { text: string; color: string } {
  if (outcome === 'correct') return { text: awaiting ? 'Correct! Who got it?' : `${solver?.nickname ?? 'Someone'} got it!`, color: 'text-green-700' };
  if (outcome === 'skipped') return { text: 'Skipped', color: 'text-ink-muted' };
  return { text: "Time's up!", color: 'text-accent-red' };
}

export default function RevealPhase({
  pokemon,
  outcome,
  drawer,
  players,
  solver,
  awaitingSolver,
  canAssign,
  onAssign,
  streaks,
  drawing,
  onNext,
  nextLabel,
  onShare,
}: RevealPhaseProps) {
  const [revealed, setRevealed] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const head = headline(outcome, solver, awaitingSolver);
  const guessers = players.filter((p) => p.id !== drawer.id);
  const box = 'w-[min(55vw,280px,calc((100dvh-340px)/2))] min-w-[140px] aspect-square';

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in w-full">
      <h2 className={`font-pixel text-sm text-center leading-relaxed ${head.color}`}>{head.text}</h2>

      {awaitingSolver && (
        <div className="w-full pokemon-card" role="group" aria-label="Who got it?">
          <div className="pokemon-card-body space-y-2 text-center">
            {canAssign ? (
              <>
                <p className="text-xs font-body font-bold text-ink">Tap who guessed it — they and {drawer.nickname} score a point.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {guessers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onAssign(p.id)}
                      className="flex items-center gap-1.5 rounded-full border-2 border-line bg-surface px-2 py-1 font-body text-sm font-bold text-ink hover:bg-surface-2"
                    >
                      <AvatarIcon avatarId={p.avatarId} size="sm" />
                      {p.nickname}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs font-body text-ink-muted">Waiting for {drawer.nickname} to say who got it…</p>
            )}
          </div>
        </div>
      )}

      <div className="text-center h-8 flex items-center" aria-live="polite">
        {revealed ? (
          <p className="font-pixel text-sm text-ink animate-fade-in leading-relaxed">It&apos;s {pokemon.name}!</p>
        ) : (
          <p className="font-pixel text-[10px] text-ink-muted">Who&apos;s that Pokémon?</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">{drawer.nickname}&apos;s drawing</span>
        <div className={`${box} rounded-lg overflow-hidden border-4 border-line bg-white`}>
          {drawing && replaying ? (
            <DrawingReplay events={drawing.timeline} onDone={() => setReplaying(false)} />
          ) : drawing ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={drawing.dataUrl} alt={`${drawer.nickname}'s drawing`} className="w-full h-full object-contain" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-muted text-sm">No drawing</div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Official</span>
        <RevealStage imageUrl={pokemon.artworkUrl} revealed={revealed} name={pokemon.name} className={box} />
      </div>

      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-1 font-body" aria-label="Scores">
        {players.map((p) => (
          <li key={p.id}>
            <ScoreChip player={p} streak={streaks[p.id] ?? 0} />
          </li>
        ))}
      </ul>

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
      <PokeBallButton onClick={onNext} variant="red" size="md" className="w-full max-w-xs" disabled={!revealed || awaitingSolver}>
        {nextLabel}
      </PokeBallButton>
    </div>
  );
}

export function ScoreChip({ player, streak = 0 }: { player: Player; streak?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <AvatarIcon avatarId={player.avatarId} size="sm" />
      <span className="text-[11px] font-bold text-ink">{player.nickname}</span>
      <span className="text-base font-black text-accent">{player.score}</span>
      {streak >= 2 && (
        <span className="text-[11px] font-bold text-orange-700 bg-orange-100 rounded-full px-1.5" title={`${streak} correct in a row`}>
          🔥{streak}
        </span>
      )}
    </div>
  );
}
