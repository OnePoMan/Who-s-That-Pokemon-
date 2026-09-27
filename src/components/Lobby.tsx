'use client';

import { useState } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker, { AvatarIcon, TRAINERS } from './AvatarPicker';
import GameSettingsForm from './GameSettingsForm';
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, type GameSettings, type Player } from '@/lib/game-state';
import { MAX_NAME_LENGTH } from '@/lib/net/protocol';

interface LobbyProps {
  onStartLocal: (players: Player[], settings: GameSettings) => void;
  onRemote: () => void;
}

interface Draft {
  key: number;
  name: string;
  avatarId: number;
}

let nextKey = 3;

export default function Lobby({ onStartLocal, onRemote }: LobbyProps) {
  const [step, setStep] = useState<'mode' | 'players' | 'settings'>('mode');
  const [drafts, setDrafts] = useState<Draft[]>([
    { key: 1, name: '', avatarId: 1 },
    { key: 2, name: '', avatarId: 2 },
  ]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const namesReady = drafts.every((d) => d.name.trim().length > 0);
  const update = (key: number, patch: Partial<Draft>) => setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const addPlayer = () => {
    const used = new Set(drafts.map((d) => d.avatarId));
    const avatarId = TRAINERS.find((t) => !used.has(t.id))?.id ?? 1;
    setDrafts((prev) => [...prev, { key: nextKey++, name: '', avatarId }]);
  };

  const start = () => {
    const players: Player[] = drafts.map((d, i) => ({ id: `p${i + 1}`, nickname: d.name.trim(), avatarId: d.avatarId, score: 0 }));
    onStartLocal(players, settings);
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in">
      <Logo />
      <div className="pokeball-divider" />

      {step === 'mode' && (
        <div className="space-y-4 w-full animate-slide-up">
          <h2 className="font-pixel text-xs text-center text-ink">Choose mode</h2>
          <PokeBallButton onClick={() => setStep('players')} variant="red" size="lg" className="w-full">
            Play on one phone
          </PokeBallButton>
          <p className="text-center text-xs text-ink-muted font-body -mt-2">2–8 players around one phone</p>
          <PokeBallButton onClick={onRemote} variant="blue" size="lg" className="w-full">
            Play on several phones
          </PokeBallButton>
          <p className="text-center text-xs text-ink-muted font-body -mt-2">Share a room code and play anywhere</p>
        </div>
      )}

      {step === 'players' && (
        <div className="space-y-4 w-full animate-slide-up">
          <h2 className="font-pixel text-xs text-center text-ink">Choose trainers</h2>
          <ol className="space-y-2">
            {drafts.map((d, i) => (
              <li key={d.key} className="pokemon-card">
                <div className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setPickerFor(pickerFor === d.key ? null : d.key)}
                    aria-expanded={pickerFor === d.key}
                    aria-label={`Change trainer for player ${i + 1}`}
                    className="rounded-full focus-visible:ring-2"
                  >
                    <AvatarIcon avatarId={d.avatarId} size="md" />
                  </button>
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => update(d.key, { name: e.target.value })}
                    placeholder={`Player ${i + 1} name…`}
                    aria-label={`Player ${i + 1} name`}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    className="pokemon-input flex-1 min-w-0"
                  />
                  {drafts.length > MIN_PLAYERS && (
                    <button
                      type="button"
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                      aria-label={`Remove player ${i + 1}`}
                      className="w-9 h-9 shrink-0 rounded-full bg-surface-2 text-ink font-bold hover:bg-red-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {pickerFor === d.key && (
                  <div className="px-2 pb-3">
                    <AvatarPicker
                      selectedId={d.avatarId}
                      onSelect={(id) => {
                        update(d.key, { avatarId: id });
                        setPickerFor(null);
                      }}
                      disabledIds={drafts.filter((x) => x.key !== d.key).map((x) => x.avatarId)}
                      label={`Player ${i + 1} trainer`}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
          {drafts.length < MAX_PLAYERS && (
            <button
              type="button"
              onClick={addPlayer}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-line text-ink font-body font-bold text-sm hover:bg-surface-2"
            >
              + Add player
            </button>
          )}
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
          <h2 className="font-pixel text-xs text-center text-ink">Battle settings</h2>
          <GameSettingsForm settings={settings} onChange={setSettings} playerCount={drafts.length} />
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
      <p className="text-ink-muted mt-1 text-xs font-body font-semibold tracking-wide uppercase">Draw &amp; Guess Edition</p>
    </div>
  );
}
