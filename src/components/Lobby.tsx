'use client';

import { useState } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker from './AvatarPicker';
import GameSettingsForm from './GameSettingsForm';
import { DEFAULT_SETTINGS, type GameSettings, type Player } from '@/lib/game-state';
import { MAX_NAME_LENGTH } from '@/lib/net/protocol';

interface LobbyProps {
  onStartLocal: (players: Player[], settings: GameSettings) => void;
  onRemote: () => void;
}

export default function Lobby({ onStartLocal, onRemote }: LobbyProps) {
  const [step, setStep] = useState<'mode' | 'players' | 'settings'>('mode');
  const [names, setNames] = useState(['', '']);
  const [avatars, setAvatars] = useState([1, 2]);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const namesReady = names.every((n) => n.trim().length > 0);

  const start = () => {
    const players: Player[] = names.map((n, i) => ({ id: `p${i + 1}`, nickname: n.trim(), avatarId: avatars[i], score: 0 }));
    onStartLocal(players, settings);
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in">
      <Logo />
      <div className="pokeball-divider" />

      {step === 'mode' && (
        <div className="space-y-4 w-full animate-slide-up">
          <h2 className="font-pixel text-xs text-center text-pokemon-dark">Choose mode</h2>
          <PokeBallButton onClick={() => setStep('players')} variant="red" size="lg" className="w-full">
            Play on one phone
          </PokeBallButton>
          <p className="text-center text-xs text-gray-600 font-body -mt-2">Draw while your friend watches over your shoulder</p>
          <PokeBallButton onClick={onRemote} variant="blue" size="lg" className="w-full">
            Play on two phones
          </PokeBallButton>
          <p className="text-center text-xs text-gray-600 font-body -mt-2">Share a room code and play anywhere</p>
        </div>
      )}

      {step === 'players' && (
        <div className="space-y-5 w-full animate-slide-up">
          <h2 className="font-pixel text-xs text-center text-pokemon-dark">Choose trainers</h2>
          {[0, 1].map((i) => (
            <div key={i} className="pokemon-card">
              <div className={`pokemon-card-header ${i === 0 ? 'red' : ''}`}>
                <span className="text-white text-xs font-bold font-body">Player {i + 1}</span>
              </div>
              <div className="pokemon-card-body space-y-3">
                <input
                  type="text"
                  value={names[i]}
                  onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                  placeholder="Trainer name…"
                  aria-label={`Player ${i + 1} name`}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  className="pokemon-input w-full"
                />
                <AvatarPicker
                  selectedId={avatars[i]}
                  onSelect={(id) => setAvatars((prev) => prev.map((a, j) => (j === i ? id : a)))}
                  disabledIds={[avatars[1 - i]]}
                  label={`Player ${i + 1} trainer`}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <PokeBallButton onClick={() => setStep('mode')} variant="gray" size="md" className="flex-1">
              Back
            </PokeBallButton>
            <PokeBallButton onClick={() => setStep('settings')} variant="red" size="md" className="flex-1" disabled={!namesReady}>
              Next
            </PokeBallButton>
          </div>
        </div>
      )}

      {step === 'settings' && (
        <div className="space-y-5 w-full animate-slide-up">
          <h2 className="font-pixel text-xs text-center text-pokemon-dark">Battle settings</h2>
          <GameSettingsForm settings={settings} onChange={setSettings} />
          <div className="flex gap-3">
            <PokeBallButton onClick={() => setStep('players')} variant="gray" size="md" className="flex-1">
              Back
            </PokeBallButton>
            <PokeBallButton onClick={start} variant="red" size="lg" className="flex-1">
              Start battle!
            </PokeBallButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function Logo() {
  return (
    <div className="text-center py-2">
      <h1 className="pokemon-title text-xl sm:text-2xl leading-relaxed">
        <span className="block text-pokemon-red">Who&apos;s That</span>
        <span className="block logo-yellow">Pokémon?</span>
      </h1>
      <p className="text-gray-600 mt-1 text-xs font-body font-semibold tracking-wide uppercase">Draw &amp; Guess Edition</p>
    </div>
  );
}
