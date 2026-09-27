'use client';

import { useEffect, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import HintBar from './HintBar';
import Timer from './Timer';
import RevealStage from './RevealStage';
import PokeBallButton from './PokeBallButton';
import { AvatarIcon } from './AvatarPicker';
import { ScoreChip, type SavedDrawing } from './RevealPhase';
import { getDrawer, getWinners, roundsInGame, type GameState } from '@/lib/game-state';
import type { CanvasManager } from '@/lib/canvas-engine';
import type { Hint } from '@/lib/hints';

interface TVViewProps {
  state: GameState;
  code: string | null;
  remainingMs: number | null;
  hint: Hint | null;
  drawings: Record<number, SavedDrawing>;
  streaks: Record<string, number>;
  canvasManagerRef: React.MutableRefObject<CanvasManager | null>;
  onCanvasReady: (manager: CanvasManager) => void;
  onLeave: () => void;
  connectionLost: boolean;
}

/**
 * Big-screen spectator view (a laptop or TV browser): the live drawing, timer, hints and
 * scores, for everyone in the room to watch. It never receives the answer before the reveal.
 */
export default function TVView({ state, code, remainingMs, hint, drawings, streaks, canvasManagerRef, onCanvasReady, onLeave, connectionLost }: TVViewProps) {
  const drawer = getDrawer(state);
  const totalRounds = roundsInGame(state);
  const joinUrl = code && typeof window !== 'undefined' ? `${window.location.host}/?room=${code}` : '';

  return (
    // Takes over the whole screen: a TV or laptop has room the phone-sized frame would waste.
    <div className="fixed inset-0 z-[55] overflow-auto bg-screen flex flex-col lg:flex-row gap-6 p-6">
      <section className={`flex-1 flex flex-col items-center gap-3 min-w-0 ${state.phase === 'DRAWING' ? 'justify-start' : 'justify-center'}`} aria-live="polite">
        {state.phase === 'MEMORIZE' && drawer && (
          <div className="text-center space-y-4">
            <AvatarIcon avatarId={drawer.avatarId} size="lg" />
            <p className="font-pixel text-lg text-ink leading-relaxed">{drawer.nickname} is memorizing…</p>
            {remainingMs !== null && <p className="font-pixel text-5xl text-accent-red">{Math.ceil(remainingMs / 1000)}</p>}
          </div>
        )}

        {state.phase === 'DRAWING' && drawer && (
          <div data-fit-root className="w-full flex flex-col items-center gap-3">
            <div className="w-full max-w-3xl flex items-center gap-3">
              <span className="font-body font-bold text-ink text-lg shrink-0">{drawer.nickname} is drawing</span>
              <Timer remainingMs={remainingMs ?? 0} totalMs={state.settings.timerDuration * 1000} />
            </div>
            {hint && <HintBar hint={hint} />}
            <DrawingCanvas key={state.round} readOnly canvasManagerRef={canvasManagerRef} onReady={onCanvasReady} label={`${drawer.nickname}'s drawing`} />
            <ul className="flex flex-wrap justify-center gap-2 max-w-3xl" aria-label="Latest guesses">
              {state.chatMessages.slice(-6).map((m) => (
                <li key={m.id} className={`font-body text-sm rounded-full px-3 py-1 ${m.isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-surface text-ink'}`}>
                  {m.sender}: {m.isCorrect ? 'got it!' : m.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.phase === 'REVEAL' && state.currentPokemon && (
          <TVReveal key={state.round} state={state} drawing={drawings[state.round]} />
        )}

        {state.phase === 'GAME_OVER' && (
          <div className="text-center space-y-3">
            <p className="text-6xl" aria-hidden>
              🏆
            </p>
            <p className="font-pixel text-xl text-ink leading-relaxed">
              {getWinners(state)
                .map((w) => w.nickname)
                .join(' & ')}{' '}
              {getWinners(state).length > 1 ? 'win!' : 'wins!'}
            </p>
          </div>
        )}
      </section>

      <aside className="lg:w-80 shrink-0 space-y-4 lg:self-center">
        <div className="pokemon-card">
          <div className="pokemon-card-body text-center space-y-1">
            <p className="text-xs font-body text-ink-muted">Join on your phone</p>
            <p className="font-pixel text-2xl tracking-[0.25em] text-accent">{code}</p>
            <p className="text-xs font-body text-ink-muted break-all">{joinUrl}</p>
          </div>
        </div>
        {state.round > 0 && (
          <p className="text-center font-body text-sm font-bold text-ink">
            Round {state.round}
            {totalRounds ? ` of ${totalRounds}` : ` · first to ${state.settings.winScore}`}
          </p>
        )}
        <ul className="space-y-2" aria-label="Scores">
          {[...state.players]
            .sort((a, b) => b.score - a.score)
            .map((p) => (
              <li key={p.id} className="bg-surface rounded-xl px-3 py-2 border border-line/15">
                <ScoreChip player={p} streak={streaks[p.id] ?? 0} />
              </li>
            ))}
        </ul>
        <PokeBallButton onClick={onLeave} variant="gray" size="sm" className="w-full">
          Stop watching
        </PokeBallButton>
        {connectionLost && (
          <p role="alert" className="text-sm font-body font-semibold text-amber-900 bg-amber-100 rounded-lg p-2 text-center">
            Lost the connection to the host. Reconnecting…
          </p>
        )}
      </aside>
    </div>
  );
}

function TVReveal({ state, drawing }: { state: GameState; drawing: SavedDrawing | undefined }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(id);
  }, []);
  const pokemon = state.currentPokemon!;
  const solver = state.players.find((p) => p.id === state.roundResults.at(-1)?.solvedBy);
  const headline =
    state.outcome === 'correct' ? (solver ? `${solver.nickname} got it!` : 'Correct!') : state.outcome === 'skipped' ? 'Skipped' : "Time's up!";
  const box = 'w-[min(30vw,60vh,520px)] aspect-square';
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-pixel text-xl text-ink leading-relaxed">{headline}</p>
      <p className="font-pixel text-lg text-accent h-8">{revealed ? `It's ${pokemon.name}!` : "Who's that Pokémon?"}</p>
      <div className="flex justify-center gap-6">
        <div className={`${box} rounded-xl overflow-hidden border-4 border-line bg-white`}>
          {drawing && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={drawing.dataUrl} alt="The drawing" className="w-full h-full object-contain" />
          )}
        </div>
        <RevealStage imageUrl={pokemon.artworkUrl} revealed={revealed} name={pokemon.name} className={box} />
      </div>
    </div>
  );
}
