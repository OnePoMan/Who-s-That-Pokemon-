'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Lobby from './Lobby';
import RemoteLobby from './RemoteLobby';
import MemorizePhase from './MemorizePhase';
import DrawingPhase from './DrawingPhase';
import RevealPhase, { type SavedDrawing } from './RevealPhase';
import GameOverScreen from './GameOverScreen';
import SettingsPanel from './SettingsPanel';
import DrawingGallery from './DrawingGallery';
import ConfirmDialog from './ConfirmDialog';
import PokeBallButton from './PokeBallButton';
import { usePrefs } from '@/hooks/usePrefs';
import { useSound } from '@/hooks/useSound';
import { useRoom } from '@/hooks/useRoom';
import { useNow, useWakeLock } from '@/hooks/useDeviceHelpers';
import { vibrate } from '@/lib/prefs';
import { isCorrectGuess, pickRandomPokemon } from '@/lib/pokedex';
import { composeComparison, safeFilename, shareOrDownload } from '@/lib/share';
import { fromWire, normalizeRoomCode, randomString, toWire, type Intent, type Message } from '@/lib/net/protocol';
import type { CanvasManager, DrawEvent } from '@/lib/canvas-engine';
import {
  gameReducer,
  getDrawer,
  getGuesser,
  getWinner,
  initialGameState,
  type GameSettings,
  type GameState,
  type Player,
  type RoundOutcome,
} from '@/lib/game-state';

const HOST_ID = 'p1';
const GUEST_ID = 'p2';

// Faster than anyone types, slow enough that a modified client can't try every name.
const GUESS_COOLDOWN_MS = 1200;
const MAX_GUESSES_PER_ROUND = 30;
// Limits on what the other phone can make this one redraw.
const MAX_HISTORY_EVENTS_PER_SECOND = 4; // undo / redo / clear; the drawer's buttons match this pace
const MAX_FILLS_PER_SECOND = 4; // each fill scans the whole canvas once
const MAX_CANVAS_SYNCS_PER_ROUND = 3;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [prefs, updatePrefs] = usePrefs();
  const sound = useSound(prefs);
  const [screen, setScreen] = useState<'lobby' | 'remote'>('lobby');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState(HOST_ID);
  const [drawings, setDrawings] = useState<Record<number, SavedDrawing>>({});
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canvasRef = useRef<CanvasManager | null>(null);
  // Strokes received from the other phone this round, replayed if the canvas mounts late.
  const remoteStrokesRef = useRef<DrawEvent[]>([]);
  const stateRef = useRef<GameState>(state);
  const sentCanvasRef = useRef(false);
  const lastGuessAtRef = useRef<Record<string, number>>({});
  const guessCountRef = useRef({ round: 0, count: 0 });
  const historyWindowRef = useRef({ start: 0, count: 0 });
  const fillWindowRef = useRef({ start: 0, count: 0 });
  const canvasSyncsRef = useRef({ round: 0, count: 0 });
  const hostTokenRef = useRef<string | null>(null);
  const [hostMismatch, setHostMismatch] = useState(false);
  // Read by the message handler, which is created before the room hook it is passed to.
  const roomRef = useRef<{ isHost: boolean; send: (msg: Message) => void } | null>(null);
  const myIdRef = useRef(HOST_ID);
  const lobbyRef = useRef<Player[]>([]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const ticking = state.phase === 'MEMORIZE' || state.phase === 'DRAWING';
  const now = useNow(ticking);
  useWakeLock(state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER');

  // An invite link (?room=CODE) opens the join screen with the code filled in.
  useEffect(() => {
    const code = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') ?? '');
    if (!code) return;
    setInviteCode(code);
    setScreen('remote');
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // ---- Helpers shared by local play and the remote host ---------------------------------------

  const captureDrawing = useCallback((round: number) => {
    const manager = canvasRef.current;
    if (!manager) return;
    const saved: SavedDrawing = { dataUrl: manager.toDataURL(), timeline: manager.getTimeline() };
    setDrawings((prev) => ({ ...prev, [round]: saved }));
  }, []);

  const endRound = useCallback(
    (outcome: RoundOutcome) => {
      const s = stateRef.current;
      if (s.phase !== 'DRAWING') return;
      captureDrawing(s.round);
      dispatch({ type: 'END_ROUND', outcome });
    },
    [captureDrawing],
  );

  // Remote rounds skip the pass-the-phone handoff, so their memorize countdown starts at once.
  const beginRoundTimers = useCallback((mode: GameState['mode']) => {
    if (mode === 'remote') dispatch({ type: 'BEGIN_MEMORIZE', now: Date.now() });
  }, []);

  /** Applies an intent with the authority of the host (or the single local device). */
  const performIntent = useCallback(
    (intent: Intent, byId: string) => {
      const s = stateRef.current;
      const drawer = getDrawer(s);
      const drawerOnly = s.mode === 'remote' && drawer?.id !== byId;
      switch (intent) {
        case 'begin-drawing':
          if (!drawerOnly) dispatch({ type: 'START_DRAWING', now: Date.now() });
          break;
        case 'correct':
          if (!drawerOnly) endRound('correct');
          break;
        case 'skip':
          if (!drawerOnly) endRound('skipped');
          break;
        case 'next-round':
          if (s.phase !== 'REVEAL') break;
          dispatch({ type: 'NEXT_ROUND', pokemon: pickRandomPokemon(s.settings.difficulty, s.usedPokemonIds) });
          beginRoundTimers(s.mode);
          break;
        case 'rematch':
          if (s.phase !== 'GAME_OVER') break;
          setDrawings({});
          dispatch({ type: 'REMATCH', pokemon: pickRandomPokemon(s.settings.difficulty) });
          beginRoundTimers(s.mode);
          break;
      }
    },
    [beginRoundTimers, endRound],
  );

  const performGuess = useCallback(
    (text: string, byId: string) => {
      const s = stateRef.current;
      const guesser = getGuesser(s);
      if (s.phase !== 'DRAWING' || !guesser || guesser.id !== byId || !s.currentPokemon) return;
      const nowMs = Date.now();
      if (nowMs - (lastGuessAtRef.current[byId] ?? 0) < GUESS_COOLDOWN_MS) return;
      lastGuessAtRef.current[byId] = nowMs;
      if (guessCountRef.current.round !== s.round) guessCountRef.current = { round: s.round, count: 0 };
      if (++guessCountRef.current.count > MAX_GUESSES_PER_ROUND) return;
      const correct = isCorrectGuess(text, s.currentPokemon.name);
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { id: newId(), senderId: byId, sender: guesser.nickname, text, isCorrect: correct },
      });
      if (correct) endRound('correct');
    },
    [endRound],
  );

  // ---- Remote play -------------------------------------------------------------------------------

  const handleMessage = useCallback(
    (msg: Message) => {
      const s = stateRef.current;
      const hosting = roomRef.current?.isHost ?? false;
      const iAmDrawer = getDrawer(s)?.id === myIdRef.current;

      switch (msg.t) {
        case 'hello': {
          if (!hosting) return;
          const host = lobbyRef.current[0];
          const guest: Player = { id: GUEST_ID, nickname: msg.name, avatarId: msg.avatarId, score: 0 };
          const players = [host, guest];
          setLobbyPlayers(players);
          hostTokenRef.current ??= randomString(24);
          roomRef.current?.send({ t: 'lobby', players, youId: GUEST_ID, hostToken: hostTokenRef.current });
          if (s.phase !== 'LOBBY') {
            // A returning guest: bring them back up to date, including the drawing so far.
            roomRef.current?.send({ t: 'state', state: toWire(s, GUEST_ID, Date.now()) });
            if (s.phase === 'DRAWING' && iAmDrawer && canvasRef.current) {
              roomRef.current?.send({ t: 'canvas', round: s.round, events: canvasRef.current.getTimeline() });
            }
          }
          return;
        }
        case 'lobby':
          if (hosting) return;
          // After a reconnect, only the host we first met may carry on the game.
          if (hostTokenRef.current && hostTokenRef.current !== msg.hostToken) {
            setHostMismatch(true);
            return;
          }
          hostTokenRef.current = msg.hostToken;
          setLobbyPlayers(msg.players);
          setMyId(msg.youId);
          myIdRef.current = msg.youId;
          return;
        case 'state': {
          if (hosting) return;
          const next = fromWire(msg.state, Date.now());
          if (s.phase === 'DRAWING' && (next.phase !== 'DRAWING' || next.round !== s.round)) captureDrawing(s.round);
          if (next.round !== s.round) {
            remoteStrokesRef.current = [];
            sentCanvasRef.current = false;
          }
          if (next.phase === 'MEMORIZE' && next.round === 1 && s.round !== 1) setDrawings({});
          dispatch({ type: 'REPLACE', state: next });
          // Messages that follow straight away (e.g. the canvas snapshot after a reconnect)
          // must see this state, not the one from the last render.
          stateRef.current = next;
          // Back from a dropped connection mid-drawing: resend my strokes to the host.
          const drawerNow = next.players[next.currentDrawerIndex]?.id === myIdRef.current;
          if (next.phase === 'DRAWING' && drawerNow && !sentCanvasRef.current && canvasRef.current) {
            sentCanvasRef.current = true;
            roomRef.current?.send({ t: 'canvas', round: next.round, events: canvasRef.current.getTimeline() });
          }
          return;
        }
        case 'intent':
          if (hosting) performIntent(msg.intent, GUEST_ID);
          return;
        case 'guess':
          if (hosting) performGuess(msg.text, GUEST_ID);
          return;
        case 'draw': {
          if (s.phase !== 'DRAWING' || iAmDrawer) return;
          const limited = msg.e.type === 'fill' ? fillWindowRef : ['undo', 'redo', 'clear'].includes(msg.e.type) ? historyWindowRef : null;
          if (limited) {
            const now = Date.now();
            if (now - limited.current.start > 1000) limited.current = { start: now, count: 0 };
            const cap = msg.e.type === 'fill' ? MAX_FILLS_PER_SECOND : MAX_HISTORY_EVENTS_PER_SECOND;
            if (++limited.current.count > cap) return;
          }
          remoteStrokesRef.current.push(msg.e);
          canvasRef.current?.applyEvent(msg.e);
          return;
        }
        case 'canvas':
          if (s.phase !== 'DRAWING' || iAmDrawer || msg.round !== s.round) return;
          if (canvasSyncsRef.current.round !== s.round) canvasSyncsRef.current = { round: s.round, count: 0 };
          if (++canvasSyncsRef.current.count > MAX_CANVAS_SYNCS_PER_ROUND) return;
          remoteStrokesRef.current = msg.events;
          canvasRef.current?.loadTimeline(msg.events);
          return;
        case 'reject':
          return; // handled inside useRoom
      }
    },
    [captureDrawing, performGuess, performIntent],
  );

  const room = useRoom(handleMessage);
  useEffect(() => {
    roomRef.current = room;
    lobbyRef.current = lobbyPlayers;
  });

  const roomSend = room.send;
  const isRemote = state.mode === 'remote' && state.phase !== 'LOBBY';
  const authority = !isRemote || room.isHost;

  // The host keeps the guest in sync after every change.
  useEffect(() => {
    if (!isRemote || !room.isHost || room.status !== 'connected') return;
    roomSend({ t: 'state', state: toWire(state, GUEST_ID, Date.now()) });
  }, [state, isRemote, room.isHost, room.status, roomSend]);

  // A new drawing round starts with a clean slate of received strokes.
  useEffect(() => {
    remoteStrokesRef.current = [];
  }, [state.round]);

  /** Every button goes through here: applied directly, or sent to the host. */
  const act = useCallback(
    (intent: Intent) => {
      if (authority) performIntent(intent, myIdRef.current);
      else roomSend({ t: 'intent', intent });
    },
    [authority, performIntent, roomSend],
  );

  const guess = useCallback(
    (text: string) => {
      if (authority) performGuess(text, myIdRef.current);
      else roomSend({ t: 'guess', text });
    },
    [authority, performGuess, roomSend],
  );

  const onDrawEvent = useCallback(
    (e: DrawEvent) => {
      if (isRemote) roomSend({ t: 'draw', e });
    },
    [isRemote, roomSend],
  );

  // ---- Timers (authority only) -------------------------------------------------------------------

  useEffect(() => {
    if (!authority || state.phaseEndsAt === null || now < state.phaseEndsAt) return;
    if (state.phase === 'MEMORIZE') dispatch({ type: 'START_DRAWING', now: Date.now() });
    else if (state.phase === 'DRAWING') endRound('timeout');
  }, [authority, now, state.phase, state.phaseEndsAt, endRound]);

  const remainingMs = state.phaseEndsAt === null ? null : Math.max(0, state.phaseEndsAt - now);
  const secondsLeft = remainingMs === null ? null : Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (state.phase === 'DRAWING' && secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 5) {
      sound.play('tick');
      vibrate(15, prefs.haptics);
    }
  }, [secondsLeft, state.phase, sound, prefs.haptics]);

  // ---- Sounds for phase changes (the same on every device) -------------------------------------

  const lastPhase = useRef(state.phase);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = state.phase;
    if (prev === state.phase) return;
    if (state.phase === 'REVEAL') {
      if (state.outcome === 'correct') {
        sound.play('correct');
        vibrate([40, 40, 80], prefs.haptics);
      } else if (state.outcome === 'timeout') sound.play('wrong');
      else sound.play('whoosh');
      const id = setTimeout(() => sound.play('whosthat'), 500);
      return () => clearTimeout(id);
    }
    if (state.phase === 'GAME_OVER') sound.play('gameOver');
    else if (state.phase === 'MEMORIZE' || state.phase === 'DRAWING') sound.play('whoosh');
  }, [state.phase, state.outcome, sound, prefs.haptics]);

  // ---- Starting and leaving ----------------------------------------------------------------------

  const startLocal = (players: Player[], settings: GameSettings) => {
    sound.startBgm();
    setDrawings({});
    dispatch({ type: 'START_GAME', mode: 'local', players, settings, pokemon: pickRandomPokemon(settings.difficulty) });
  };

  const startRemote = (settings: GameSettings) => {
    if (!room.isHost || lobbyPlayers.length !== 2) return;
    sound.startBgm();
    setDrawings({});
    dispatch({ type: 'START_GAME', mode: 'remote', players: lobbyPlayers, settings, pokemon: pickRandomPokemon(settings.difficulty) });
    beginRoundTimers('remote');
  };

  const hostRoom = (name: string, avatarId: number) => {
    sound.startBgm();
    const me: Player = { id: HOST_ID, nickname: name, avatarId, score: 0 };
    setLobbyPlayers([me]);
    setMyId(HOST_ID);
    myIdRef.current = HOST_ID;
    void room.host();
  };

  const joinRoom = (code: string, name: string, avatarId: number) => {
    sound.startBgm();
    setLobbyPlayers([]);
    void room.join(code, { name, avatarId });
  };

  const goHome = useCallback(() => {
    room.leave();
    sound.stopBgm();
    dispatch({ type: 'RESET' });
    setScreen('lobby');
    setLobbyPlayers([]);
    setDrawings({});
    setGalleryOpen(false);
    setConfirmHome(false);
    setMyId(HOST_ID);
    myIdRef.current = HOST_ID;
    hostTokenRef.current = null;
  }, [room, sound]);

  useEffect(() => {
    if (!hostMismatch) return;
    goHome();
    setHostMismatch(false);
    setNotice('Disconnected: the room was taken over by a different host.');
  }, [hostMismatch, goHome]);

  const requestHome = () => {
    if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') goHome();
    else setConfirmHome(true);
  };

  // ---- Sharing -----------------------------------------------------------------------------------

  const shareRound = async (round: number) => {
    const result = state.roundResults.find((r) => r.round === round);
    const drawing = drawings[round];
    if (!result || !drawing) return;
    const drawer = state.players.find((p) => p.id === result.drawerId)?.nickname ?? 'Someone';
    try {
      const blob = await composeComparison(drawing.dataUrl, result.pokemon.artworkUrl, `${drawer} drew ${result.pokemon.name}`);
      const outcome = await shareOrDownload(blob, `${safeFilename(result.pokemon.name, 'by', drawer)}.png`, `${drawer} drew ${result.pokemon.name} in Who's That Pokémon?`);
      if (outcome === 'downloaded') setNotice('Image saved to your downloads.');
    } catch {
      setNotice('Could not create the image. Try downloading from the gallery instead.');
    }
  };

  const shareScore = async () => {
    const text = `Who's That Pokémon? — ${state.players.map((p) => `${p.nickname}: ${p.score}`).join(' | ')}`;
    try {
      if (navigator.share) await navigator.share({ title: "Who's That Pokémon?", text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice('Score copied to the clipboard.');
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  // ---- Render ------------------------------------------------------------------------------------

  const drawer = getDrawer(state);
  const guesser = getGuesser(state);
  const winner = getWinner(state);
  const view = !isRemote ? 'local' : drawer?.id === myId ? 'drawer' : 'guesser';
  const connectionTrouble = isRemote && (room.status === 'reconnecting' || room.status === 'error');

  return (
    <div className="flex flex-col flex-1">
      <header className="pokedex-topbar">
        <span className="logo-text">WHO&apos;S THAT POKÉMON?</span>
        <SettingsPanel
          prefs={prefs}
          onChangePrefs={updatePrefs}
          drawingCount={Object.keys(drawings).length}
          onOpenGallery={() => setGalleryOpen(true)}
          onGoHome={requestHome}
          showHome={state.phase !== 'LOBBY' || screen === 'remote'}
        />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 w-full">
        {state.phase === 'LOBBY' && screen === 'lobby' && <Lobby onStartLocal={startLocal} onRemote={() => setScreen('remote')} />}

        {state.phase === 'LOBBY' && screen === 'remote' && (
          <RemoteLobby
            status={room.status}
            error={room.error}
            code={room.code}
            isHost={room.isHost}
            players={lobbyPlayers}
            initialCode={inviteCode}
            onHost={hostRoom}
            onJoin={joinRoom}
            onStart={startRemote}
            onBack={goHome}
          />
        )}

        {state.phase === 'MEMORIZE' && drawer && guesser && (
          <MemorizePhase
            pokemon={state.currentPokemon}
            drawer={drawer}
            guesser={guesser}
            view={view}
            remainingMs={remainingMs}
            totalSeconds={state.settings.memorizeSeconds}
            showArtwork={state.settings.showArtwork}
            onShowMe={() => dispatch({ type: 'BEGIN_MEMORIZE', now: Date.now() })}
            onReady={() => act('begin-drawing')}
          />
        )}

        {state.phase === 'DRAWING' && drawer && guesser && (
          <DrawingPhase
            key={state.round}
            view={view}
            drawer={drawer}
            guesser={guesser}
            remainingMs={remainingMs ?? 0}
            totalMs={state.settings.timerDuration * 1000}
            chatMessages={state.chatMessages}
            canvasManagerRef={canvasRef}
            onDrawEvent={onDrawEvent}
            onCorrect={() => act('correct')}
            onSkip={() => act('skip')}
            onGuess={guess}
            onCanvasReady={(m) => m.loadTimeline(remoteStrokesRef.current)}
          />
        )}

        {state.phase === 'REVEAL' && state.currentPokemon && state.outcome && drawer && guesser && (
          <RevealPhase
            key={state.round}
            pokemon={state.currentPokemon}
            outcome={state.outcome}
            drawer={drawer}
            guesser={guesser}
            drawing={drawings[state.round]}
            onNext={() => act('next-round')}
            nextLabel={winner ? 'See results' : 'Next round'}
            onShare={() => void shareRound(state.round)}
          />
        )}

        {state.phase === 'GAME_OVER' && winner && (
          <GameOverScreen
            winner={winner}
            players={state.players}
            roundResults={state.roundResults}
            onRematch={() => act('rematch')}
            onNewGame={goHome}
            onOpenGallery={() => setGalleryOpen(true)}
            onShare={() => void shareScore()}
          />
        )}
      </main>

      <footer className="text-center py-1.5 text-[10px] font-body text-gray-600 border-t border-gray-200">
        Unofficial fan project · Pokémon data from PokéAPI · Not affiliated with Nintendo or The Pokémon Company
      </footer>

      {galleryOpen && (
        <DrawingGallery
          roundResults={state.roundResults}
          players={state.players}
          drawings={drawings}
          onShare={(round) => void shareRound(round)}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {confirmHome && (
        <ConfirmDialog
          title="Leave this game?"
          message={isRemote ? 'Your friend will be disconnected and the scores will be lost.' : 'The scores for this game will be lost.'}
          confirmLabel="Leave game"
          onConfirm={goHome}
          onCancel={() => setConfirmHome(false)}
        />
      )}

      {connectionTrouble && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60" role="alertdialog" aria-live="assertive">
          <div className="pokemon-card max-w-xs w-full">
            <div className="pokemon-card-body text-center space-y-4 font-body">
              {room.status === 'reconnecting' ? (
                <>
                  <div className="w-8 h-8 mx-auto border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" aria-hidden />
                  <p className="font-bold text-pokemon-dark">{room.isHost ? 'Your friend lost connection' : 'Connection lost'}</p>
                  <p className="text-sm text-gray-600">{room.isHost ? 'Waiting for them to come back…' : 'Trying to reconnect…'}</p>
                </>
              ) : (
                <p className="font-bold text-pokemon-dark">{room.error ?? 'The connection was lost.'}</p>
              )}
              <PokeBallButton onClick={goHome} variant="gray" size="sm" className="w-full">
                Leave game
              </PokeBallButton>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-pokemon-dark text-white text-sm font-body px-4 py-2 rounded-full shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
