'use client';

import { useState } from 'react';
import { Player, RoundResult } from '@/lib/game-state';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';
import DrawingGallery from './DrawingGallery';

interface GameOverScreenProps {
  winner: Player;
  players: [Player, Player];
  roundResults: RoundResult[];
  onPlayAgain: () => void;
  onShare: () => void;
}

export default function GameOverScreen({ winner, players, roundResults, onPlayAgain, onShare }: GameOverScreenProps) {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-fade-in">
      {/* Trophy */}
      <div className="text-6xl animate-bounce-in">🏆</div>

      <h2 className="text-3xl font-black text-pokemon-gold text-center">
        {winner.nickname} Wins!
      </h2>

      {/* Final Scores */}
      <div className="flex gap-8 items-center">
        {players.map((player) => (
          <div key={player.id} className={`flex flex-col items-center gap-2 ${player.id === winner.id ? 'scale-110' : 'opacity-70'}`}>
            <AvatarIcon avatarId={player.avatarId} size="lg" />
            <span className="font-bold text-pokemon-dark">{player.nickname}</span>
            <span className="text-3xl font-black text-pokemon-blue">{player.score}</span>
            {player.id === winner.id && (
              <span className="text-xs font-bold text-pokemon-gold bg-yellow-100 px-2 py-0.5 rounded-full">Winner!</span>
            )}
          </div>
        ))}
      </div>

      <div className="pokeball-divider" />

      {/* Round History */}
      <div className="w-full space-y-2">
        <h3 className="text-sm font-bold text-pokemon-dark">Round History</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {roundResults.map((result, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
              <img src={result.pokemon.spriteUrl} alt={result.pokemon.name} className="w-8 h-8" />
              <span className="font-semibold text-pokemon-dark flex-1">{result.pokemon.name}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                result.guessedCorrectly ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {result.guessedCorrectly ? 'Guessed!' : 'Missed'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <PokeBallButton onClick={onShare} variant="blue" size="md" className="flex-1">
          Share
        </PokeBallButton>
        {roundResults.length > 0 && (
          <PokeBallButton onClick={() => setShowGallery(true)} variant="blue" size="md" className="flex-1">
            Gallery
          </PokeBallButton>
        )}
        <PokeBallButton onClick={onPlayAgain} variant="red" size="lg" className="flex-1">
          Play Again
        </PokeBallButton>
      </div>

      {showGallery && (
        <DrawingGallery roundResults={roundResults} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}
