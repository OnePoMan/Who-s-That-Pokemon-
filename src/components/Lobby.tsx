'use client';

import { useState } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker from './AvatarPicker';
import { Difficulty, TimerOption, GameMode, Player } from '@/lib/game-state';

interface LobbyProps {
  onStart: (config: {
    mode: GameMode;
    players: [Player, Player];
    difficulty: Difficulty;
    timerDuration: TimerOption;
  }) => void;
  onRemoteSetup: () => void;
}

export default function Lobby({ onStart, onRemoteSetup }: LobbyProps) {
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p1Avatar, setP1Avatar] = useState(1);
  const [p2Avatar, setP2Avatar] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timer, setTimer] = useState<TimerOption>(60);
  const [step, setStep] = useState<'mode' | 'players' | 'settings'>('mode');
  const [mode, setMode] = useState<GameMode>('local');

  const handleModeSelect = (m: GameMode) => {
    setMode(m);
    if (m === 'remote') {
      onRemoteSetup();
      return;
    }
    setStep('players');
  };

  const handlePlayersNext = () => {
    if (!p1Name.trim() || !p2Name.trim()) return;
    setStep('settings');
  };

  const handleStart = () => {
    const players: [Player, Player] = [
      { id: 'p1', nickname: p1Name.trim(), avatarId: p1Avatar, score: 0 },
      { id: 'p2', nickname: p2Name.trim(), avatarId: p2Avatar, score: 0 },
    ];
    onStart({ mode, players, difficulty, timerDuration: timer });
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-fade-in">
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-pokemon-red drop-shadow-lg" style={{ textShadow: '2px 2px 0 var(--pokemon-blue)' }}>
          Who&apos;s That
        </h1>
        <h1 className="text-4xl font-black text-pokemon-yellow" style={{ textShadow: '2px 2px 0 var(--pokemon-dark)' }}>
          Pok&eacute;mon?
        </h1>
        <p className="text-pokemon-gray mt-2 text-sm">Draw & Guess Edition</p>
      </div>

      <div className="pokeball-divider" />

      {step === 'mode' && (
        <div className="space-y-4 w-full animate-slide-up">
          <h2 className="text-xl font-bold text-center text-pokemon-dark">Choose Mode</h2>
          <PokeBallButton onClick={() => handleModeSelect('local')} variant="red" size="lg" className="w-full">
            Local Play
          </PokeBallButton>
          <p className="text-center text-xs text-pokemon-gray -mt-2">Pass the device between players</p>
          <PokeBallButton onClick={() => handleModeSelect('remote')} variant="blue" size="lg" className="w-full">
            Remote Play
          </PokeBallButton>
          <p className="text-center text-xs text-pokemon-gray -mt-2">Play with a friend via WebRTC</p>
        </div>
      )}

      {step === 'players' && (
        <div className="space-y-6 w-full animate-slide-up">
          <h2 className="text-xl font-bold text-center text-pokemon-dark">Players</h2>

          {/* Player 1 */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Player 1</label>
            <input
              type="text"
              value={p1Name}
              onChange={(e) => setP1Name(e.target.value)}
              placeholder="Enter name..."
              maxLength={16}
              className="w-full px-4 py-2 rounded-lg border-2 border-pokemon-dark text-pokemon-dark bg-white outline-none focus:border-pokemon-blue transition-colors"
            />
            <AvatarPicker selectedId={p1Avatar} onSelect={setP1Avatar} disabledIds={[p2Avatar]} />
          </div>

          {/* Player 2 */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Player 2</label>
            <input
              type="text"
              value={p2Name}
              onChange={(e) => setP2Name(e.target.value)}
              placeholder="Enter name..."
              maxLength={16}
              className="w-full px-4 py-2 rounded-lg border-2 border-pokemon-dark text-pokemon-dark bg-white outline-none focus:border-pokemon-blue transition-colors"
            />
            <AvatarPicker selectedId={p2Avatar} onSelect={setP2Avatar} disabledIds={[p1Avatar]} />
          </div>

          <div className="flex gap-3">
            <PokeBallButton onClick={() => setStep('mode')} variant="gray" size="md" className="flex-1">
              Back
            </PokeBallButton>
            <PokeBallButton
              onClick={handlePlayersNext}
              variant="red"
              size="md"
              className="flex-1"
              disabled={!p1Name.trim() || !p2Name.trim()}
            >
              Next
            </PokeBallButton>
          </div>
        </div>
      )}

      {step === 'settings' && (
        <div className="space-y-6 w-full animate-slide-up">
          <h2 className="text-xl font-bold text-center text-pokemon-dark">Settings</h2>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-full font-bold text-sm capitalize transition-all ${
                    difficulty === d
                      ? 'bg-pokemon-blue text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-pokemon-gray text-center">
              {difficulty === 'easy' && 'Popular, well-known Pokemon'}
              {difficulty === 'medium' && 'A wider mix across all generations'}
              {difficulty === 'hard' && 'Any Pokemon from all generations!'}
            </p>
          </div>

          {/* Timer */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-pokemon-dark">Draw Timer</label>
            <div className="flex gap-2">
              {([30, 60, 90] as TimerOption[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimer(t)}
                  className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${
                    timer === t
                      ? 'bg-pokemon-blue text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <PokeBallButton onClick={() => setStep('players')} variant="gray" size="md" className="flex-1">
              Back
            </PokeBallButton>
            <PokeBallButton onClick={handleStart} variant="red" size="lg" className="flex-1">
              Start!
            </PokeBallButton>
          </div>
        </div>
      )}
    </div>
  );
}
