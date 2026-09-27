'use client';

import type { Player, RoundResult } from '@/lib/game-state';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';
import { listNames } from './MemorizePhase';

interface GameOverScreenProps {
  winners: Player[];
  players: Player[];
  roundResults: RoundResult[];
  onRematch: () => void;
  onNewGame: () => void;
  onOpenGallery: () => void;
  onShare: () => void;
}

const OUTCOME_BADGE = {
  correct: { label: 'Guessed!', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-gray-200 text-gray-700' },
  timeout: { label: 'Missed', className: 'bg-red-100 text-red-800' },
} as const;

const MEDALS = ['🥇', '🥈', '🥉'];

export default function GameOverScreen({ winners, players, roundResults, onRematch, onNewGame, onOpenGallery, onShare }: GameOverScreenProps) {
  const standings = [...players].sort((a, b) => b.score - a.score);
  const winnerIds = new Set(winners.map((w) => w.id));
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.nickname;
  // Players with the same score share a place.
  const placeOf = (score: number) => standings.findIndex((p) => p.score === score);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in">
      <div className="text-5xl animate-bounce-in" aria-hidden>
        🏆
      </div>
      <h2 className="font-pixel text-base text-ink text-center leading-relaxed">
        {winners.length > 1 ? `It's a tie! ${listNames(winners)} win!` : `${winners[0]?.nickname} wins!`}
      </h2>

      <ol className="w-full space-y-1.5" aria-label="Final standings">
        {standings.map((player) => {
          const place = placeOf(player.score);
          return (
            <li
              key={player.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 font-body ${winnerIds.has(player.id) ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-surface border border-line/20'}`}
            >
              <span className="w-6 text-center text-lg" aria-label={`Place ${place + 1}`}>
                {MEDALS[place] ?? place + 1}
              </span>
              <AvatarIcon avatarId={player.avatarId} size="md" />
              <span className={`flex-1 font-bold ${winnerIds.has(player.id) ? 'text-yellow-900' : 'text-ink'}`}>{player.nickname}</span>
              <span className={`text-2xl font-black ${winnerIds.has(player.id) ? 'text-yellow-900' : 'text-accent'}`}>{player.score}</span>
            </li>
          );
        })}
      </ol>

      <div className="pokeball-divider" />

      <section className="w-full space-y-2" aria-labelledby="history-title">
        <h3 id="history-title" className="settings-legend">
          Round history
        </h3>
        <ol className="space-y-1 max-h-40 overflow-y-auto">
          {roundResults.map((result) => {
            const badge = OUTCOME_BADGE[result.outcome];
            const solver = nameOf(result.solvedBy);
            return (
              <li key={result.round} className="flex items-center gap-2 bg-surface rounded-lg p-1.5 text-sm font-body">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.pokemon.artworkUrl} crossOrigin="anonymous" alt="" className="w-8 h-8 object-contain" loading="lazy" />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-ink block truncate">{result.pokemon.name}</span>
                  <span className="text-[11px] text-ink-muted block truncate">
                    drawn by {nameOf(result.drawerId)}
                    {solver ? ` · guessed by ${solver}` : ''}
                  </span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-2 gap-3 w-full">
        <PokeBallButton onClick={onOpenGallery} variant="blue" size="md">
          Gallery
        </PokeBallButton>
        <PokeBallButton onClick={onShare} variant="blue" size="md">
          Share
        </PokeBallButton>
        <PokeBallButton onClick={onRematch} variant="red" size="md">
          Rematch
        </PokeBallButton>
        <PokeBallButton onClick={onNewGame} variant="gray" size="md">
          New game
        </PokeBallButton>
      </div>
    </div>
  );
}
