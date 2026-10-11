'use client';

import { useEffect, useState } from 'react';
import PokeBallButton from './PokeBallButton';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import GameSettingsForm from './GameSettingsForm';
import TeamPicker, { teamStartProblem, withTeams } from './TeamPicker';
import { Logo } from './Lobby';
import { DEFAULT_SETTINGS, MIN_TEAM_PLAYERS, type GameSettings, type Player, type Team } from '@/lib/game-state';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, SPECTATOR_ID, normalizeRoomCode } from '@/lib/net/protocol';
import { MAX_PLAYERS } from '@/lib/game-state';
import { shareInvite } from '@/lib/share';
import { useFavouritePoolEmpty } from '@/hooks/useFavourites';
import type { RoomStatus } from '@/hooks/useRoom';

interface RemoteLobbyProps {
  status: RoomStatus;
  error: string | null;
  code: string | null;
  isHost: boolean;
  /** Everyone in the room so far, host first. */
  players: Player[];
  /** Big-screen spectators watching the room. */
  spectators: number;
  myId: string;
  initialCode: string | null;
  onHost: (name: string, avatarId: number) => void;
  onJoin: (code: string, name: string, avatarId: number, asSpectator?: boolean) => void;
  /** Players come back with their teams set when team mode is on. */
  onStart: (settings: GameSettings, players: Player[]) => void;
  onBack: () => void;
  /** Host: the team setting and the host's swaps, so the room can see them as they change. */
  onTeamSetup?: (on: boolean, chosen: Record<string, Team>) => void;
}

export default function RemoteLobby({ status, error, code, isHost, players, spectators, myId, initialCode, onHost, onJoin, onStart, onBack, onTeamSetup }: RemoteLobbyProps) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [joinCode, setJoinCode] = useState(initialCode ?? '');
  const [mode, setMode] = useState<'choose' | 'join'>(initialCode ? 'join' : 'choose');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const poolEmpty = useFavouritePoolEmpty(settings);
  const [chosenTeams, setChosenTeams] = useState<Record<string, Team>>({});

  const inRoom = status !== 'idle' && status !== 'error';
  const nameOk = name.trim().length > 0;
  const teamsOn = settings.teams && players.length >= MIN_TEAM_PLAYERS;
  const teamProblem = teamsOn ? teamStartProblem(players, chosenTeams) : null;
  // Tell the room (guests and TV screens) whenever the host changes the team setting or a swap.
  const teamsSetting = settings.teams;
  useEffect(() => {
    if (isHost) onTeamSetup?.(teamsSetting, chosenTeams);
  }, [isHost, teamsSetting, chosenTeams, onTeamSetup]);
  const start = () => onStart({ ...settings, teams: teamsOn }, teamsOn ? withTeams(players, chosenTeams) : players);
  const validCode = normalizeRoomCode(joinCode);
  const roster = (
    <ul className="w-full space-y-1.5" aria-label="Players in the room">
      {players.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3 bg-surface rounded-xl px-3 py-1.5 border border-line/15 font-body">
          <AvatarIcon avatarId={p.avatarId} size="sm" />
          <span className="flex-1 font-bold text-ink">{p.nickname}</span>
          {i === 0 && <span className="text-[10px] font-bold uppercase text-ink-muted">Host</span>}
          {p.id === myId && i !== 0 && <span className="text-[10px] font-bold uppercase text-accent">You</span>}
        </li>
      ))}
      {spectators > 0 && (
        <li className="text-center text-xs font-body text-ink-muted">
          📺 {spectators} screen{spectators > 1 ? 's' : ''} watching
        </li>
      )}
    </ul>
  );

  const share = async () => {
    if (!code || (await shareInvite(code)) !== 'copied') return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- In a room -------------------------------------------------------------------------------

  if (inRoom && isHost) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto animate-fade-in">
        <h2 className="font-pixel text-xs text-ink">Your room</h2>
        {code ? (
          <div className="pokemon-card w-full">
            <div className="pokemon-card-body text-center space-y-3">
              <p className="text-xs font-body text-ink-muted">Share the code or invite link — up to {MAX_PLAYERS} players, plus a TV screen to watch</p>
              <p className="font-pixel text-2xl tracking-[0.3em] text-accent select-all" aria-label={`Room code ${code.split('').join(' ')}`}>
                {code}
              </p>
              <PokeBallButton onClick={share} variant="blue" size="sm" className="w-full">
                {copied ? 'Invite copied!' : 'Share invite'}
              </PokeBallButton>
            </div>
          </div>
        ) : (
          <Spinner label="Opening a room…" />
        )}

        <div className="w-full space-y-1" aria-live="polite">
          {roster}
          {players.length < 2 && <p className="text-sm text-center font-body text-ink-muted">Waiting for friends to join…</p>}
        </div>

        <GameSettingsForm settings={settings} onChange={setSettings} playerCount={Math.max(2, players.length)} />
        {teamsOn && <TeamPicker players={players} chosen={chosenTeams} onChange={setChosenTeams} />}

        <div className="flex gap-3 w-full">
          <PokeBallButton onClick={onBack} variant="gray" size="md" className="flex-1">
            Leave
          </PokeBallButton>
          <PokeBallButton onClick={start} variant="red" size="lg" className="flex-1" disabled={players.length < 2 || !!teamProblem || poolEmpty}>
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
        <h2 className="font-pixel text-xs text-ink">Room {code}</h2>
        {status === 'connecting' && <Spinner label="Connecting…" />}
        {status === 'reconnecting' && <Spinner label="Connection dropped. Reconnecting…" />}
        {status === 'connected' &&
          (host ? (
            <>
              <p className="font-bold text-ink">
                {myId === SPECTATOR_ID ? `📺 This screen is watching ${host.nickname}'s room` : `You're in ${host.nickname}'s room`}
              </p>
              {roster}
              {players.length >= MIN_TEAM_PLAYERS && players.every((p) => p.team) && <TeamPicker players={players} chosen={guestTeams(players)} readOnly />}
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
        <p role="alert" className="w-full text-sm font-body font-semibold text-accent-red bg-red-50 border border-pokemon-red/30 rounded-lg p-3">
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
          <PokeBallButton onClick={() => validCode && onJoin(validCode, 'TV', 1, true)} variant="blue" size="md" className="w-full" disabled={!validCode}>
            📺 Watch on this screen (TV)
          </PokeBallButton>
          <p className="text-[11px] text-center font-body text-ink-muted -mt-1">For a laptop or TV everyone can see — no name needed</p>
          <PokeBallButton onClick={() => setMode('choose')} variant="gray" size="md" className="w-full">
            Back
          </PokeBallButton>
        </form>
      )}
    </div>
  );
}

/** The teams the host sent with the lobby. */
function guestTeams(players: Player[]): Record<string, Team> {
  return Object.fromEntries(players.flatMap((p) => (p.team ? [[p.id, p.team]] : [])));
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status">
      <div className="w-8 h-8 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" aria-hidden />
      <span className="text-sm text-ink-muted font-body">{label}</span>
    </div>
  );
}
