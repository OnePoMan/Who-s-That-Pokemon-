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
import TVView from './TVView';
import RoomBadge from './RoomBadge';
import Reactions, { ReactionBar, type FloatingReaction } from './Reactions';
import SoloPlay from './SoloPlay';
import PokedexScreen from './PokedexScreen';
import HowToPlay, { hasSeenGuide } from './HowToPlay';
import { usePrefs } from '@/hooks/usePrefs';
import { useProgress } from '@/hooks/useProgress';
import { useSound } from '@/hooks/useSound';
import { useRoom, type HelloMessage } from '@/hooks/useRoom';
import { useNow, useWakeLock } from '@/hooks/useDeviceHelpers';
import { vibrate } from '@/lib/prefs';
import { isCorrectGuess, pickRandomPokemon } from '@/lib/pokedex';
import { buildHint, hintStage, type Hint } from '@/lib/hints';
import { composeComparison, safeFilename, shareOrDownload } from '@/lib/share';
import { addDrawing } from '@/lib/collection';
import { currentDailyStreak, recordGame, recordRound, type Achievement } from '@/lib/stats';
import { dailyNumber, dateKey } from '@/lib/daily';
import {
  MAX_SPECTATORS,
  SPECTATOR_ID,
  fromWire,
  normalizeRoomCode,
  randomString,
  toWire,
  type Intent,
  type Message,
  type Reaction,
  type RejectReason,
} from '@/lib/net/protocol';
import type { CanvasManager, DrawEvent } from '@/lib/canvas-engine';
import {
  MAX_PLAYERS,
  gameReducer,
  getDrawer,
  getGuessers,
  getWinners,
  guessStreak,
  initialGameState,
  isGameFinished,
  isParty,
  type GameSettings,
  type GameState,
  type Player,
  type RoundOutcome,
} from '@/lib/game-state';

const HOST_ID = 'p1';

// Faster than anyone types, slow enough that a modified client can't try every name.
const GUESS_COOLDOWN_MS = 1200;
const MAX_GUESSES_PER_ROUND = 30;
// Limits on what another phone can make this one redraw.
const MAX_HISTORY_EVENTS_PER_SECOND = 4; // undo / redo / clear; the drawer's buttons match this pace
const MAX_FILLS_PER_SECOND = 4; // each fill scans the whole canvas once
const MAX_CANVAS_SYNCS_PER_ROUND = 3;
const REACTION_COOLDOWN_MS = 700;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [prefs, updatePrefs] = usePrefs();
  const sound = useSound(prefs);
  const [screen, setScreen] = useState<'lobby' | 'remote' | 'solo' | 'daily' | 'dex'>('lobby');
  // Today's date for the daily challenge: read on the client only, and again on return to the app.
  const [today, setToday] = useState('');
  const [badgeQueue, setBadgeQueue] = useState<Achievement[]>([]);
  const progress = useProgress(useCallback((a: Achievement) => setBadgeQueue((q) => [...q, a]), []));
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [myId, setMyId] = useState(HOST_ID);
  const [drawings, setDrawings] = useState<Record<number, SavedDrawing>>({});
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Hints a guest receives from the host (the guest never has the answer to build them).
  const [remoteHint, setRemoteHint] = useState<Hint | null>(null);
  const [offline, setOffline] = useState<string[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [hostMismatch, setHostMismatch] = useState(false);

  const canvasRef = useRef<CanvasManager | null>(null);
  // Strokes received this round, replayed if the canvas mounts after they arrive.
  const remoteStrokesRef = useRef<DrawEvent[]>([]);
  const stateRef = useRef<GameState>(state);
  const sentCanvasRef = useRef(false);
  const lastGuessAtRef = useRef<Record<string, number>>({});
  const guessCountRef = useRef<Record<string, { round: number; count: number }>>({});
  const lastReactionAtRef = useRef<Record<string, number>>({});
  const historyWindowRef = useRef({ start: 0, count: 0 });
  const fillWindowRef = useRef({ start: 0, count: 0 });
  const canvasSyncsRef = useRef({ round: 0, count: 0 });
  const hostTokenRef = useRef<string | null>(null);
  // Host: which player each phone is (kept for the whole room so phones can rejoin), and
  // which phones are big-screen spectators.
  const clientPlayersRef = useRef(new Map<string, string>());
  const spectatorsRef = useRef(new Set<string>());
  // Read by the message handler, which is created before the room hook it is passed to.
  const roomRef = useRef<{
    isHost: boolean;
    send: (msg: Message) => void;
    sendTo: (id: string, msg: Message) => void;
    broadcast: (build: Message | ((id: string) => Message | null)) => void;
    connected: string[];
  } | null>(null);
  const myIdRef = useRef(HOST_ID);
  const lobbyRef = useRef<Player[]>([]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const ticking = state.phase === 'MEMORIZE' || state.phase === 'DRAWING';
  const now = useNow(ticking);
  useWakeLock((state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER') || screen === 'solo' || screen === 'daily');

  // An invite link (?room=CODE) opens the join screen with the code filled in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = normalizeRoomCode(params.get('room') ?? '');
    if (!code) {
      // First visit: show how to play (not for someone arriving from an invite mid-setup).
      if (!hasSeenGuide()) setGuideOpen(true);
      return;
    }
    setInviteCode(code);
    setScreen('remote');
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Settings can override the device's light/dark preference. The first run sees the default
  // prefs (stored ones load a moment later), so it leaves the theme the layout script applied.
  const themeReadyRef = useRef(false);
  useEffect(() => {
    if (!themeReadyRef.current) {
      themeReadyRef.current = true;
      return;
    }
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    const refresh = () => setToday(dateKey());
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [screen]);

  const showReaction = useCallback((from: string, emoji: Reaction) => {
    const name = stateRef.current.players.find((p) => p.id === from)?.nickname ?? lobbyRef.current.find((p) => p.id === from)?.nickname ?? '';
    const id = newId();
    setReactions((prev) => [...prev.slice(-12), { id, emoji, name }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
  }, []);

  // ---- Helpers shared by local play and the remote host ---------------------------------------

  const captureDrawing = useCallback((round: number) => {
    const manager = canvasRef.current;
    if (!manager) return;
    const s = stateRef.current;
    const leftFraction =
      s.phase === 'DRAWING' && s.phaseEndsAt !== null ? Math.max(0, s.phaseEndsAt - Date.now()) / (s.settings.timerDuration * 1000) : 0;
    const saved: SavedDrawing = { dataUrl: manager.toDataURL(), timeline: manager.getTimeline(), leftFraction };
    setDrawings((prev) => ({ ...prev, [round]: saved }));
  }, []);

  /** solvedBy: who guessed it; null = ask on the reveal screen; undefined = the only guesser. */
  const endRound = useCallback(
    (outcome: RoundOutcome, solvedBy?: string | null) => {
      const s = stateRef.current;
      if (s.phase !== 'DRAWING') return;
      captureDrawing(s.round);
      dispatch({ type: 'END_ROUND', outcome, solvedBy });
    },
    [captureDrawing],
  );

  /**
   * Every round starts on a blank canvas. Strokes received from other phones are buffered so a
   * canvas that mounts late can catch up, and a drawer that reconnects resends its canvas; neither
   * may carry the last round's drawing into the next one, so the old canvas is forgotten too.
   */
  const clearRoundStrokes = () => {
    remoteStrokesRef.current = [];
    sentCanvasRef.current = false;
    canvasRef.current = null;
  };

  const nextPokemon = (s: GameState, fresh = false) =>
    pickRandomPokemon(s.settings.difficulty, fresh ? [] : s.usedPokemonIds, s.settings);

  // Remote rounds skip the pass-the-phone handoff, so their memorize countdown starts at once.
  const beginRoundTimers = useCallback((mode: GameState['mode']) => {
    if (mode === 'remote') dispatch({ type: 'BEGIN_MEMORIZE', now: Date.now() });
  }, []);

  /** Applies an intent with the authority of the host (or the single shared phone). */
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
          // With several guessers, whoever confirms is asked who it was on the reveal screen.
          if (!drawerOnly) endRound('correct', isParty(s) ? null : undefined);
          break;
        case 'skip':
          if (!drawerOnly) endRound('skipped');
          break;
        case 'next-round':
          if (s.phase !== 'REVEAL') break;
          clearRoundStrokes();
          dispatch({ type: 'NEXT_ROUND', pokemon: nextPokemon(s) });
          beginRoundTimers(s.mode);
          break;
        case 'rematch':
          if (s.phase !== 'GAME_OVER') break;
          clearRoundStrokes();
          setDrawings({});
          dispatch({ type: 'REMATCH', pokemon: nextPokemon(s, true) });
          beginRoundTimers(s.mode);
          break;
      }
    },
    [beginRoundTimers, endRound],
  );

  /** "Who got it?" on the reveal screen; in a remote game only the drawer answers. */
  const performAssign = useCallback((playerId: string, byId: string) => {
    const s = stateRef.current;
    if (s.mode === 'remote' && getDrawer(s)?.id !== byId) return;
    dispatch({ type: 'ASSIGN_SOLVER', playerId });
  }, []);

  /** A guess typed on the shared phone: nobody is signed in, so ask who it was if needed. */
  const performLocalGuess = useCallback(
    (text: string) => {
      const s = stateRef.current;
      if (s.phase !== 'DRAWING' || !s.currentPokemon) return;
      const correct = isCorrectGuess(text, s.currentPokemon.name);
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: { id: newId(), senderId: 'shared', sender: 'Guess', text, isCorrect: correct } });
      if (correct) endRound('correct', isParty(s) ? null : undefined);
      else sound.play('wrong');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endRound],
  );

  const performGuess = useCallback(
    (text: string, byId: string) => {
      const s = stateRef.current;
      const guesser = getGuessers(s).find((p) => p.id === byId);
      if (s.phase !== 'DRAWING' || !guesser || !s.currentPokemon) return;
      const nowMs = Date.now();
      if (nowMs - (lastGuessAtRef.current[byId] ?? 0) < GUESS_COOLDOWN_MS) return;
      lastGuessAtRef.current[byId] = nowMs;
      const tally = guessCountRef.current[byId];
      guessCountRef.current[byId] = tally && tally.round === s.round ? { round: s.round, count: tally.count + 1 } : { round: s.round, count: 1 };
      if (guessCountRef.current[byId].count > MAX_GUESSES_PER_ROUND) return;
      const correct = isCorrectGuess(text, s.currentPokemon.name);
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        message: { id: newId(), senderId: byId, sender: guesser.nickname, text, isCorrect: correct },
      });
      if (correct) endRound('correct', byId);
    },
    [endRound],
  );

  /** Host: pass a reaction from a player to every screen (rate limited per player). */
  const performReact = useCallback(
    (emoji: Reaction, byId: string) => {
      const nowMs = Date.now();
      if (nowMs - (lastReactionAtRef.current[byId] ?? 0) < REACTION_COOLDOWN_MS) return;
      lastReactionAtRef.current[byId] = nowMs;
      roomRef.current?.broadcast({ t: 'reaction', from: byId, emoji });
      showReaction(byId, emoji);
    },
    [showReaction],
  );

  // ---- Remote play: host ---------------------------------------------------------------------

  /** Which player (or spectator) a phone is. */
  const viewerOf = (clientId: string) => clientPlayersRef.current.get(clientId) ?? SPECTATOR_ID;

  const lobbyMessage = (clientId: string, players: Player[]): Message => ({
    t: 'lobby',
    players,
    youId: viewerOf(clientId),
    hostToken: (hostTokenRef.current ??= randomString(24)),
    spectators: spectatorsRef.current.size,
  });

  /** Brings a phone that just (re)joined mid-game up to date, including the drawing so far. */
  const catchUp = (clientId: string) => {
    const s = stateRef.current;
    if (s.phase === 'LOBBY') return;
    const room = roomRef.current;
    const viewer = viewerOf(clientId);
    const hint = s.settings.hints && s.currentPokemon && s.phase === 'DRAWING' && s.phaseEndsAt
      ? buildHint(s.currentPokemon, hintStage(Math.max(0, s.phaseEndsAt - Date.now()), s.settings.timerDuration * 1000))
      : null;
    room?.sendTo(clientId, { t: 'state', state: toWire(s, viewer, Date.now(), hint) });
    const timeline = canvasRef.current?.getTimeline();
    if (s.phase === 'DRAWING' && timeline?.length) room?.sendTo(clientId, { t: 'canvas', round: s.round, events: timeline });
  };

  /**
   * Mid-game, a player whose phone lost its identity (tab closed, other browser) can take back
   * their seat by joining with the same name, as long as that seat has no phone connected.
   */
  const reclaimableSeat = useCallback((name: string): string | null => {
    const s = stateRef.current;
    if (s.phase === 'LOBBY') return null;
    const key = name.trim().toLowerCase();
    const seat = s.players.find((p) => p.id !== HOST_ID && p.nickname.trim().toLowerCase() === key);
    if (!seat) return null;
    const online = new Set(roomRef.current?.connected ?? []);
    const inUse = [...clientPlayersRef.current].some(([client, id]) => id === seat.id && online.has(client));
    return inUse ? null : seat.id;
  }, []);

  const admit = useCallback(
    (hello: HelloMessage): RejectReason | null => {
      if (hello.role === 'spectator') return spectatorsRef.current.size >= MAX_SPECTATORS && !spectatorsRef.current.has(hello.clientId) ? 'full' : null;
      if (clientPlayersRef.current.has(hello.clientId)) return null; // a player coming back
      if (stateRef.current.phase !== 'LOBBY') return reclaimableSeat(hello.name) ? null : 'started';
      return lobbyRef.current.length >= MAX_PLAYERS ? 'full' : null;
    },
    [reclaimableSeat],
  );

  const hostHello = (msg: HelloMessage, from: string) => {
    const room = roomRef.current;
    if (!room) return;
    if (msg.role === 'spectator') {
      spectatorsRef.current.add(from);
      setSpectatorCount(spectatorsRef.current.size);
      room.broadcast((id) => lobbyMessage(id, stateRef.current.phase === 'LOBBY' ? lobbyRef.current : stateRef.current.players));
      catchUp(from);
      return;
    }
    let players = lobbyRef.current;
    let playerId = clientPlayersRef.current.get(from);
    if (!playerId && stateRef.current.phase !== 'LOBBY') {
      // A dropped player back on a new phone identity: hand them their old seat.
      const seat = reclaimableSeat(msg.name);
      if (!seat) return;
      for (const [client, id] of [...clientPlayersRef.current]) if (id === seat) clientPlayersRef.current.delete(client);
      clientPlayersRef.current.set(from, seat);
      playerId = seat;
    }
    if (!playerId) {
      const taken = new Set(players.map((p) => p.id));
      let n = 2;
      while (taken.has(`p${n}`)) n++;
      playerId = `p${n}`;
      clientPlayersRef.current.set(from, playerId);
    }
    if (stateRef.current.phase === 'LOBBY') {
      const me: Player = { id: playerId, nickname: msg.name, avatarId: msg.avatarId, score: 0 };
      players = players.some((p) => p.id === playerId) ? players.map((p) => (p.id === playerId ? me : p)) : [...players, me];
      lobbyRef.current = players;
      setLobbyPlayers(players);
    }
    const joined = playerId;
    setOffline((prev) => prev.filter((id) => id !== joined));
    room.broadcast((id) => lobbyMessage(id, stateRef.current.phase === 'LOBBY' ? players : stateRef.current.players));
    catchUp(from);
  };

  // ---- Remote play: both sides ---------------------------------------------------------------

  /** Applies strokes from another phone to this canvas, within the rate limits. */
  const applyIncomingDraw = (msg: Extract<Message, { t: 'draw' | 'canvas' }>): boolean => {
    const s = stateRef.current;
    if (msg.t === 'canvas') {
      if (canvasSyncsRef.current.round !== s.round) canvasSyncsRef.current = { round: s.round, count: 0 };
      if (++canvasSyncsRef.current.count > MAX_CANVAS_SYNCS_PER_ROUND) return false;
      remoteStrokesRef.current = msg.events;
      canvasRef.current?.loadTimeline(msg.events);
      return true;
    }
    const type = msg.e.type;
    const limited = type === 'fill' ? fillWindowRef : type === 'undo' || type === 'redo' || type === 'clear' ? historyWindowRef : null;
    if (limited) {
      const nowMs = Date.now();
      if (nowMs - limited.current.start > 1000) limited.current = { start: nowMs, count: 0 };
      const cap = type === 'fill' ? MAX_FILLS_PER_SECOND : MAX_HISTORY_EVENTS_PER_SECOND;
      if (++limited.current.count > cap) return false;
    }
    remoteStrokesRef.current.push(msg.e);
    canvasRef.current?.applyEvent(msg.e);
    return true;
  };

  /** Host: strokes from a guest drawer are applied here and passed on to everyone else. */
  const relayDraw = (msg: Extract<Message, { t: 'draw' | 'canvas' }>, from: string) => {
    const s = stateRef.current;
    if (s.phase !== 'DRAWING' || getDrawer(s)?.id !== viewerOf(from)) return;
    if (msg.t === 'canvas' && msg.round !== s.round) return;
    if (!applyIncomingDraw(msg)) return;
    roomRef.current?.broadcast((id) => (id === from ? null : msg));
  };

  const handleMessage = (msg: Message, from: string | null) => {
    const s = stateRef.current;
    const hosting = roomRef.current?.isHost ?? false;

    if (hosting && from) {
      const byId = viewerOf(from);
      const isPlayer = byId !== SPECTATOR_ID;
      switch (msg.t) {
        case 'hello':
          hostHello(msg, from);
          return;
        case 'intent':
          if (isPlayer) performIntent(msg.intent, byId);
          return;
        case 'guess':
          if (isPlayer) performGuess(msg.text, byId);
          return;
        case 'assign':
          if (isPlayer) performAssign(msg.playerId, byId);
          return;
        case 'react':
          if (isPlayer) performReact(msg.emoji, byId);
          return;
        case 'draw':
        case 'canvas':
          relayDraw(msg, from);
          return;
        default:
          return; // lobby/state/reaction only travel host → guest
      }
    }

    // Guest side: everything comes from the host.
    const iAmDrawer = getDrawer(s)?.id === myIdRef.current;
    switch (msg.t) {
      case 'lobby':
        // After a reconnect, only the host we first met may carry on the game.
        if (hostTokenRef.current && hostTokenRef.current !== msg.hostToken) {
          setHostMismatch(true);
          return;
        }
        hostTokenRef.current = msg.hostToken;
        lobbyRef.current = msg.players;
        setLobbyPlayers(msg.players);
        setSpectatorCount(msg.spectators);
        setMyId(msg.youId);
        myIdRef.current = msg.youId;
        return;
      case 'state': {
        const { state: next, hint } = fromWire(msg.state, Date.now());
        setRemoteHint(hint);
        if (s.phase === 'DRAWING' && (next.phase !== 'DRAWING' || next.round !== s.round)) captureDrawing(s.round);
        if (next.round !== s.round) clearRoundStrokes();
        if (next.phase === 'MEMORIZE' && next.round === 1 && s.round !== 1) setDrawings({});
        dispatch({ type: 'REPLACE', state: next });
        // Messages that follow straight away (e.g. the canvas snapshot after a reconnect)
        // must see this state, not the one from the last render.
        stateRef.current = next;
        // Back from a dropped connection mid-drawing: resend my strokes to the host.
        const drawerNow = next.players[next.currentDrawerIndex]?.id === myIdRef.current;
        const mine = canvasRef.current?.getTimeline();
        if (next.phase === 'DRAWING' && drawerNow && !sentCanvasRef.current && mine?.length) {
          sentCanvasRef.current = true;
          roomRef.current?.send({ t: 'canvas', round: next.round, events: mine });
        }
        return;
      }
      case 'draw':
        if (s.phase === 'DRAWING' && !iAmDrawer) applyIncomingDraw(msg);
        return;
      case 'canvas':
        if (s.phase !== 'DRAWING' || msg.round !== s.round) return;
        // The drawer only takes the host's copy if it lost its own (e.g. after a reload).
        if (iAmDrawer && canvasRef.current?.getTimeline().length) return;
        applyIncomingDraw(msg);
        return;
      case 'reaction':
        showReaction(msg.from, msg.emoji);
        return;
      default:
        return;
    }
  };

  const room = useRoom(handleMessage, admit);
  useEffect(() => {
    roomRef.current = room;
    lobbyRef.current = lobbyPlayers;
  });

  const isRemote = state.mode === 'remote' && state.phase !== 'LOBBY';
  const authority = !isRemote || room.isHost;

  // Hints, built wherever the answer is known (this phone locally, or the host).
  const drawingRemaining = state.phase === 'DRAWING' && state.phaseEndsAt !== null ? Math.max(0, state.phaseEndsAt - now) : null;
  const stage = drawingRemaining === null ? null : hintStage(drawingRemaining, state.settings.timerDuration * 1000);
  const localHint = state.settings.hints && state.currentPokemon && stage !== null ? buildHint(state.currentPokemon, stage) : null;

  const { broadcast, connected } = room;

  // The host keeps every phone in sync after each change, and again as each hint unlocks.
  // Every phone gets its own copy: only the drawer's includes the answer.
  useEffect(() => {
    if (!isRemote || !room.isHost) return;
    const s = stateRef.current;
    const hint = s.settings.hints && s.currentPokemon && stage !== null ? buildHint(s.currentPokemon, stage) : null;
    const at = Date.now();
    broadcast((id) => ({ t: 'state', state: toWire(state, viewerOf(id), at, hint) }));
  }, [state, stage, isRemote, room.isHost, broadcast]);

  // In the lobby a phone that leaves gives up its seat; mid-game its seat is kept for it.
  useEffect(() => {
    if (!room.isHost) return;
    const online = new Set(connected);
    for (const id of [...spectatorsRef.current]) if (!online.has(id)) spectatorsRef.current.delete(id);
    setSpectatorCount(spectatorsRef.current.size);
    const offlineIds = [...clientPlayersRef.current.entries()].filter(([c]) => !online.has(c)).map(([, p]) => p);
    if (stateRef.current.phase === 'LOBBY') {
      for (const [c] of [...clientPlayersRef.current.entries()].filter(([c]) => !online.has(c))) clientPlayersRef.current.delete(c);
      const players = lobbyRef.current.filter((p) => !offlineIds.includes(p.id));
      if (players.length !== lobbyRef.current.length) {
        lobbyRef.current = players;
        setLobbyPlayers(players);
        broadcast((id) => lobbyMessage(id, players));
      }
      setOffline([]);
    } else {
      setOffline(offlineIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, room.isHost, broadcast]);

  /** Every button goes through here: applied directly, or sent to the host. */
  const act = useCallback(
    (intent: Intent) => {
      if (authority) performIntent(intent, myIdRef.current);
      else room.send({ t: 'intent', intent });
    },
    [authority, performIntent, room],
  );

  const guess = useCallback(
    (text: string) => {
      if (authority) performGuess(text, myIdRef.current);
      else room.send({ t: 'guess', text });
    },
    [authority, performGuess, room],
  );

  const assign = useCallback(
    (playerId: string) => {
      if (authority) performAssign(playerId, myIdRef.current);
      else room.send({ t: 'assign', playerId });
    },
    [authority, performAssign, room],
  );

  const react = useCallback(
    (emoji: Reaction) => {
      if (room.isHost) performReact(emoji, myIdRef.current);
      else room.send({ t: 'react', emoji });
    },
    [performReact, room],
  );

  const onDrawEvent = useCallback(
    (e: DrawEvent) => {
      if (!isRemote) return;
      if (room.isHost) broadcast({ t: 'draw', e });
      else room.send({ t: 'draw', e });
    },
    [isRemote, room, broadcast],
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
      const sting = setTimeout(() => sound.play('whosthat'), 500);
      // The cry plays as the silhouette turns into the Pokémon.
      const pokemonId = state.currentPokemon?.id;
      const cry = setTimeout(() => pokemonId && sound.playCry(pokemonId), 2000);
      return () => {
        clearTimeout(sting);
        clearTimeout(cry);
      };
    }
    if (state.phase === 'GAME_OVER') sound.play('gameOver');
    else if (state.phase === 'MEMORIZE' || state.phase === 'DRAWING') sound.play('whoosh');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on phase changes
  }, [state.phase, state.outcome, sound, prefs.haptics]);

  // ---- Pokédex and stats -------------------------------------------------------------------------

  // Every finished round's drawing goes into this device's Pokédex (once the guesser is known).
  const savedDrawingsRef = useRef(new WeakSet<SavedDrawing>());
  const { update: updateProgress } = progress;
  useEffect(() => {
    if (state.phase !== 'REVEAL' || state.awaitingSolver || !state.currentPokemon || !state.outcome) return;
    if (state.mode === 'remote' && myId === SPECTATOR_ID) return;
    const drawing = drawings[state.round];
    if (!drawing || savedDrawingsRef.current.has(drawing)) return;
    savedDrawingsRef.current.add(drawing);
    const pokemon = state.currentPokemon;
    const outcome = state.outcome;
    void addDrawing(
      {
        pokemonId: pokemon.id,
        pokemonName: pokemon.name,
        artist: getDrawer(state)?.nickname ?? 'Someone',
        source: state.mode === 'remote' ? 'multi-phone' : 'one-phone',
        outcome,
        drawnAt: Date.now(),
      },
      drawing.dataUrl,
    );
    const streak = Math.max(0, ...state.players.map((p) => guessStreak(state, p.id)));
    updateProgress((st) => recordRound(st, { pokemonId: pokemon.id, outcome, quick: (drawing.leftFraction ?? 0) >= 2 / 3, streak }));
  }, [state, drawings, myId, updateProgress]);

  const recordedGameRef = useRef(false);
  useEffect(() => {
    if (state.phase !== 'GAME_OVER') {
      recordedGameRef.current = false;
      return;
    }
    if (recordedGameRef.current || (state.mode === 'remote' && myId === SPECTATOR_ID)) return;
    recordedGameRef.current = true;
    const online = state.mode === 'remote';
    const won = online && getWinners(state).some((p) => p.id === myId);
    updateProgress((st) => recordGame(st, { players: state.players.length, online, won }));
  }, [state, myId, updateProgress]);

  const shownBadge = badgeQueue[0] ?? null;
  useEffect(() => {
    if (!shownBadge) return;
    sound.play('correct');
    const id = setTimeout(() => setBadgeQueue((q) => q.slice(1)), 3200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownBadge]);

  // ---- Starting and leaving ----------------------------------------------------------------------

  const startLocal = (players: Player[], settings: GameSettings) => {
    sound.startBgm();
    clearRoundStrokes();
    setDrawings({});
    dispatch({ type: 'START_GAME', mode: 'local', players, settings, pokemon: pickRandomPokemon(settings.difficulty, [], settings) });
  };

  const startRemote = (settings: GameSettings) => {
    if (!room.isHost || lobbyPlayers.length < 2) return;
    sound.startBgm();
    clearRoundStrokes();
    setDrawings({});
    dispatch({ type: 'START_GAME', mode: 'remote', players: lobbyPlayers, settings, pokemon: pickRandomPokemon(settings.difficulty, [], settings) });
    beginRoundTimers('remote');
  };

  const hostRoom = (name: string, avatarId: number) => {
    sound.startBgm();
    const me: Player = { id: HOST_ID, nickname: name, avatarId, score: 0 };
    lobbyRef.current = [me];
    setLobbyPlayers([me]);
    setMyId(HOST_ID);
    myIdRef.current = HOST_ID;
    clientPlayersRef.current.clear();
    spectatorsRef.current.clear();
    void room.host();
  };

  const joinRoom = (code: string, name: string, avatarId: number, asSpectator = false) => {
    if (!asSpectator) sound.startBgm();
    setLobbyPlayers([]);
    void room.join(code, { role: asSpectator ? 'spectator' : 'player', name, avatarId });
  };

  const goHome = useCallback(() => {
    room.leave();
    sound.stopBgm();
    dispatch({ type: 'RESET' });
    clearRoundStrokes();
    setScreen('lobby');
    setLobbyPlayers([]);
    setSpectatorCount(0);
    setDrawings({});
    setGalleryOpen(false);
    setConfirmHome(false);
    setOffline([]);
    setMyId(HOST_ID);
    myIdRef.current = HOST_ID;
    hostTokenRef.current = null;
    clientPlayersRef.current.clear();
    spectatorsRef.current.clear();
  }, [room, sound]);

  useEffect(() => {
    if (!hostMismatch) return;
    goHome();
    setHostMismatch(false);
    setNotice('Disconnected: the room was taken over by a different host.');
  }, [hostMismatch, goHome]);

  const openSolo = (which: 'solo' | 'daily') => {
    sound.startBgm();
    setScreen(which);
  };

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
  const guessers = getGuessers(state);
  const winners = getWinners(state);
  const spectating = isRemote && myId === SPECTATOR_ID;
  const view = !isRemote ? 'local' : drawer?.id === myId ? 'drawer' : 'guesser';
  const shownHint = view === 'guesser' ? (room.isHost ? localHint : remoteHint) : view === 'local' ? localHint : null;
  const streaks = Object.fromEntries(state.players.map((p) => [p.id, guessStreak(state, p.id)]));
  const solver = state.players.find((p) => p.id === state.roundResults.at(-1)?.solvedBy) ?? null;
  const connectionTrouble = isRemote && !room.isHost && (room.status === 'reconnecting' || room.status === 'error');
  // Shown to everyone in a room (host and guests) from the lobby to the end of the game.
  const roomCode = room.code && (screen === 'remote' || isRemote) && room.status !== 'idle' ? room.code : null;
  const offlineNames = state.players.filter((p) => offline.includes(p.id)).map((p) => p.nickname);

  if (spectating) {
    return (
      <>
        <TVView
          state={state}
          code={room.code}
          remainingMs={remainingMs}
          hint={remoteHint}
          drawings={drawings}
          streaks={streaks}
          canvasManagerRef={canvasRef}
          onCanvasReady={(m) => m.loadTimeline(remoteStrokesRef.current)}
          onLeave={goHome}
          connectionLost={room.status === 'reconnecting' || room.status === 'error'}
        />
        <Reactions items={reactions} />
      </>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="pokedex-topbar gap-2">
        {/* On narrow phones the room code takes the title's place. */}
        <span className={`logo-text ${roomCode ? 'hidden min-[400px]:inline' : ''}`}>WHO&apos;S THAT POKÉMON?</span>
        <div className="ml-auto flex items-center gap-2">
          {roomCode && <RoomBadge code={roomCode} />}
          <SettingsPanel
            prefs={prefs}
            onChangePrefs={updatePrefs}
            drawingCount={Object.keys(drawings).length}
            onOpenGallery={() => setGalleryOpen(true)}
            onGoHome={requestHome}
            showHome={state.phase !== 'LOBBY' || screen !== 'lobby'}
            onHowToPlay={() => setGuideOpen(true)}
          />
        </div>
      </header>

      {room.isHost && isRemote && offlineNames.length > 0 && (
        <p role="status" className="bg-amber-100 text-amber-900 text-xs font-body font-semibold text-center py-1 px-3">
          Reconnecting: {offlineNames.join(', ')}
          {room.code && <> · rejoin with code {room.code} and the same name</>}
        </p>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 w-full">
        {state.phase === 'LOBBY' && screen === 'lobby' && (
          <Lobby
            onStartLocal={startLocal}
            onRemote={() => setScreen('remote')}
            onDaily={() => openSolo('daily')}
            onSolo={() => openSolo('solo')}
            onPokedex={() => setScreen('dex')}
            daily={
              today && {
                number: dailyNumber(today),
                done: progress.stats.daily.result?.date === today,
                streak: currentDailyStreak(progress.stats, today),
              }
            }
            discovered={progress.stats.discovered.length}
          />
        )}

        {state.phase === 'LOBBY' && (screen === 'solo' || screen === 'daily') && (
          <SoloPlay
            key={screen}
            kind={screen}
            stats={progress.stats}
            updateStats={updateProgress}
            play={sound.play}
            playCry={sound.playCry}
            onNotice={setNotice}
            onExit={goHome}
          />
        )}

        {state.phase === 'LOBBY' && screen === 'dex' && (
          <PokedexScreen stats={progress.stats} onResetStats={progress.reset} onNotice={setNotice} onExit={goHome} />
        )}

        {state.phase === 'LOBBY' && screen === 'remote' && (
          <RemoteLobby
            status={room.status}
            error={room.error}
            code={room.code}
            isHost={room.isHost}
            players={lobbyPlayers}
            spectators={spectatorCount}
            myId={myId}
            initialCode={inviteCode}
            onHost={hostRoom}
            onJoin={joinRoom}
            onStart={startRemote}
            onBack={goHome}
          />
        )}

        {state.phase === 'MEMORIZE' && drawer && (
          <MemorizePhase
            pokemon={state.currentPokemon}
            drawer={drawer}
            guessers={guessers}
            view={view}
            remainingMs={remainingMs}
            totalSeconds={state.settings.memorizeSeconds}
            showArtwork={state.settings.showArtwork}
            onShowMe={() => dispatch({ type: 'BEGIN_MEMORIZE', now: Date.now() })}
            onReady={() => act('begin-drawing')}
          />
        )}

        {state.phase === 'DRAWING' && drawer && (
          <DrawingPhase
            key={state.round}
            view={view}
            drawer={drawer}
            guessers={guessers}
            hint={shownHint}
            remainingMs={remainingMs ?? 0}
            totalMs={state.settings.timerDuration * 1000}
            chatMessages={state.chatMessages}
            canvasManagerRef={canvasRef}
            onDrawEvent={onDrawEvent}
            onCorrect={() => act('correct')}
            onSkip={() => act('skip')}
            onGuess={view === 'local' ? performLocalGuess : guess}
            onCanvasReady={(m) => m.loadTimeline(remoteStrokesRef.current)}
            extra={view === 'guesser' ? <ReactionBar onReact={react} /> : null}
          />
        )}

        {state.phase === 'REVEAL' && state.currentPokemon && state.outcome && drawer && (
          <RevealPhase
            key={state.round}
            pokemon={state.currentPokemon}
            outcome={state.outcome}
            drawer={drawer}
            players={state.players}
            solver={solver}
            awaitingSolver={state.awaitingSolver}
            canAssign={view === 'local' || view === 'drawer'}
            onAssign={assign}
            streaks={streaks}
            drawing={drawings[state.round]}
            onNext={() => act('next-round')}
            nextLabel={isGameFinished(state) ? 'See results' : 'Next round'}
            onShare={() => void shareRound(state.round)}
          />
        )}

        {state.phase === 'GAME_OVER' && (
          <GameOverScreen
            winners={winners}
            players={state.players}
            roundResults={state.roundResults}
            onRematch={() => act('rematch')}
            onNewGame={goHome}
            onOpenGallery={() => setGalleryOpen(true)}
            onShare={() => void shareScore()}
          />
        )}
      </main>

      {/* Hidden mid-round so the canvas and buttons fit on small phones. */}
      {state.phase !== 'MEMORIZE' && state.phase !== 'DRAWING' && screen !== 'solo' && screen !== 'daily' && (
        <footer className="text-center py-1.5 text-[10px] font-body text-ink-muted border-t border-line/15">
          Unofficial fan project · Pokémon data from PokéAPI · Not affiliated with Nintendo or The Pokémon Company
        </footer>
      )}

      <Reactions items={reactions} />

      {galleryOpen && (
        <DrawingGallery
          roundResults={state.roundResults}
          players={state.players}
          drawings={drawings}
          onShare={(round) => void shareRound(round)}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {guideOpen && <HowToPlay onClose={() => setGuideOpen(false)} />}

      {confirmHome && (
        <ConfirmDialog
          title="Leave this game?"
          message={
            isRemote
              ? room.isHost
                ? 'You are hosting: everyone will be disconnected and the scores lost.'
                : 'You will leave the room; the others can keep playing.'
              : 'The scores for this game will be lost.'
          }
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
                  <p className="font-bold text-ink">Connection lost</p>
                  <p className="text-sm text-ink-muted">Trying to reconnect…</p>
                </>
              ) : (
                <p className="font-bold text-ink">{room.error ?? 'The connection was lost.'}</p>
              )}
              <PokeBallButton onClick={goHome} variant="gray" size="sm" className="w-full">
                Leave game
              </PokeBallButton>
            </div>
          </div>
        </div>
      )}

      {shownBadge && (
        <div role="status" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] pointer-events-none flex items-center gap-2 bg-screen border-4 border-pokemon-yellow-dark text-ink font-body px-4 py-2 rounded-2xl shadow-xl animate-bounce-in">
          <span className="text-2xl" aria-hidden>
            {shownBadge.icon}
          </span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-ink-muted">Badge earned</span>
            <span className="block text-sm font-bold">{shownBadge.title}</span>
          </span>
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
