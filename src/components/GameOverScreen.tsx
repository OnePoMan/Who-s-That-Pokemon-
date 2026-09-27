'use client';

import type { Player, RoundResult } from '@/lib/game-state';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';

interface GameOverScreenProps {
  winner: Player;
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

export default function GameOverScreen({ winner, players, roundResults, onRematch, onNewGame, onOpenGallery, onShare }: GameOverScreenProps) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in">
      <div className="text-5xl animate-bounce-in" aria-hidden>
        🏆
      </div>
      <h2 className="font-pixel text-base text-pokemon-dark text-center leading-relaxed">{winner.nickname} wins!</h2>

      <div className="flex gap-6 items-center">
        {players.map((player) => (
          <div key={player.id} className={`flex flex-col items-center gap-1.5 ${player.id === winner.id ? 'scale-110' : 'opacity-70'}`}>
            <AvatarIcon avatarId={player.avatarId} size="lg" />
            <span className="font-bold text-pokemon-dark font-body text-sm">{player.nickname}</span>
            <span className="text-2xl font-black text-pokemon-blue font-body">{player.score}</span>
            {player.id === winner.id && (
              <span className="text-[10px] font-bold text-yellow-900 bg-yellow-200 px-2 py-0.5 rounded-full font-body">Winner!</span>
            )}
          </div>
        ))}
      </div>

      <div className="pokeball-divider" />

      <section className="w-full space-y-2" aria-labelledby="history-title">
        <h3 id="history-title" className="text-xs font-bold text-pokemon-dark font-body uppercase tracking-wide">
          Round history
        </h3>
        <ol className="space-y-1 max-h-40 overflow-y-auto">
          {roundResults.map((result) => {
            const badge = OUTCOME_BADGE[result.outcome];
            return (
              <li key={result.round} className="flex items-center gap-2 bg-white rounded-lg p-1.5 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.pokemon.artworkUrl} crossOrigin="anonymous" alt="" className="w-8 h-8 object-contain" loading="lazy" />
                <span className="font-semibold text-pokemon-dark flex-1 font-body text-sm">{result.pokemon.name}</span>
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
