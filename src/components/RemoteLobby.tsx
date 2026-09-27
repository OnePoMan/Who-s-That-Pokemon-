'use client';

import { useState } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import GameSettingsForm from './GameSettingsForm';
import { Logo } from './Lobby';
import { DEFAULT_SETTINGS, type GameSettings, type Player } from '@/lib/game-state';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, normalizeRoomCode } from '@/lib/net/protocol';
import type { RoomStatus } from '@/hooks/useRoom';

interface RemoteLobbyProps {
  status: RoomStatus;
  error: string | null;
  code: string | null;
  isHost: boolean;
  /** Everyone in the room so far, host first. */
  players: Player[];
  initialCode: string | null;
  onHost: (name: string, avatarId: number) => void;
  onJoin: (code: string, name: string, avatarId: number) => void;
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function RemoteLobby({ status, error, code, isHost, players, initialCode, onHost, onJoin, onStart, onBack }: RemoteLobbyProps) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [joinCode, setJoinCode] = useState(initialCode ?? '');
  const [mode, setMode] = useState<'choose' | 'join'>(initialCode ? 'join' : 'choose');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);

  const inRoom = status !== 'idle' && status !== 'error';
  const nameOk = name.trim().length > 0;
  const validCode = normalizeRoomCode(joinCode);
  const guest = players[1];

  const inviteUrl = code && typeof window !== 'undefined' ? `${window.location.origin}/?room=${code}` : '';

  const shareInvite = async () => {
    const text = `Play Who's That Pokémon with me! Room code: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Who's That Pokémon?", text, url: inviteUrl });
        return;
      } catch {
        // Cancelled or unsupported; fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out.
    }
  };

  // ---- In a room -------------------------------------------------------------------------------

  if (inRoom && isHost) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto animate-fade-in">
        <h2 className="font-pixel text-xs text-pokemon-dark">Your room</h2>
        {code ? (
          <div className="pokemon-card w-full">
            <div className="pokemon-card-body text-center space-y-3">
              <p className="text-xs font-body text-gray-600">Tell your friend this code, or send the invite link</p>
              <p className="font-pixel text-2xl tracking-[0.3em] text-pokemon-blue select-all" aria-label={`Room code ${code.split('').join(' ')}`}>
                {code}
              </p>
              <PokeBallButton onClick={shareInvite} variant="blue" size="sm" className="w-full">
                {copied ? 'Invite copied!' : 'Share invite'}
              </PokeBallButton>
            </div>
          </div>
        ) : (
          <Spinner label="Opening a room…" />
        )}

        <div className="w-full flex items-center gap-3 justify-center font-body" aria-live="polite">
          {guest ? (
            <>
              <AvatarIcon avatarId={guest.avatarId} size="md" />
              <span className="font-bold text-pokemon-dark">{guest.nickname} joined!</span>
            </>
          ) : status === 'reconnecting' ? (
            <span className="text-sm text-gray-600">Your friend dropped out. Waiting for them to come back…</span>
          ) : (
            <span className="text-sm text-gray-600">Waiting for a friend to join…</span>
          )}
        </div>

        <GameSettingsForm settings={settings} onChange={setSettings} />

        <div className="flex gap-3 w-full">
          <PokeBallButton onClick={onBack} variant="gray" size="md" className="flex-1">
            Leave
          </PokeBallButton>
          <PokeBallButton onClick={() => onStart(settings)} variant="red" size="lg" className="flex-1" disabled={!guest || status !== 'connected'}>
            Start battle!
          </PokeBallButton>
        </div>
      </div>
    );
  }

  if (inRoom) {
    const host = players[0];
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in text-center font-body">
        <h2 className="font-pixel text-xs text-pokemon-dark">Room {code}</h2>
        {status === 'connecting' && <Spinner label="Connecting…" />}
        {status === 'reconnecting' && <Spinner label="Connection dropped. Reconnecting…" />}
        {status === 'connected' &&
          (host ? (
            <>
              <div className="flex items-center gap-3">
                <AvatarIcon avatarId={host.avatarId} size="lg" />
                <p className="font-bold text-pokemon-dark">You&apos;re in {host.nickname}&apos;s room</p>
              </div>
              <Spinner label={`Waiting for ${host.nickname} to start…`} />
            </>
          ) : (
            <Spinner label="Joining…" />
          ))}
        <PokeBallButton onClick={onBack} variant="gray" size="md">
          Leave
        </PokeBallButton>
      </div>
    );
  }

  // ---- Setup -------------------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto animate-fade-in">
      <Logo />
      <div className="pokeball-divider" />

      <div className="pokemon-card w-full">
        <div className="pokemon-card-header red">
          <span className="text-white text-xs font-bold font-body">Your trainer</span>
        </div>
        <div className="pokemon-card-body space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trainer name…"
            aria-label="Your name"
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            className="pokemon-input w-full"
          />
          <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
        </div>
      </div>

      {error && (
        <p role="alert" className="w-full text-sm font-body font-semibold text-pokemon-red-dark bg-red-50 border border-pokemon-red/30 rounded-lg p-3">
          {error}
        </p>
      )}

      {mode === 'choose' ? (
        <div className="space-y-3 w-full">
          <PokeBallButton onClick={() => onHost(name.trim(), avatarId)} variant="red" size="lg" className="w-full" disabled={!nameOk}>
            Create a room
          </PokeBallButton>
          <PokeBallButton onClick={() => setMode('join')} variant="blue" size="lg" className="w-full">
            Join with a code
          </PokeBallButton>
          <PokeBallButton onClick={onBack} variant="gray" size="md" className="w-full">
            Back
          </PokeBallButton>
        </div>
      ) : (
        <form
          className="space-y-3 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            if (validCode && nameOk) onJoin(validCode, name.trim(), avatarId);
          }}
        >
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            aria-label="Room code"
            maxLength={ROOM_CODE_LENGTH + 2}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="pokemon-input w-full text-center font-pixel tracking-[0.3em] uppercase"
          />
          <PokeBallButton type="submit" variant="red" size="lg" className="w-full" disabled={!validCode || !nameOk}>
            Join room
          </PokeBallButton>
          <PokeBallButton onClick={() => setMode('choose')} variant="gray" size="md" className="w-full">
            Back
          </PokeBallButton>
        </form>
      )}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status">
      <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" aria-hidden />
      <span className="text-sm text-gray-600 font-body">{label}</span>
    </div>
  );
}
