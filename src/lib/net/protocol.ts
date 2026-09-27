// Messages exchanged between the two phones in a remote game. The host runs the game; the
// guest sends intents and renders the state the host sends back. Anything arriving from the
// other device is untrusted, so each message is validated before it is used.
import { CANVAS_SIZE, MAX_BRUSH, type DrawEvent } from '../canvas-engine';
import { getPokemon, TYPES } from '../pokedex';
import type { Hint } from '../hints';
import {
  DIFFICULTIES,
  MAX_PLAYERS,
  MEMORIZE_OPTIONS,
  TIMER_OPTIONS,
  TURNS_OPTIONS,
  WIN_SCORE_OPTIONS,
  type ChatMessage,
  type GameSettings,
  type GameState,
  type Player,
  type PokemonData,
  type RoundOutcome,
  type RoundResult,
} from '../game-state';

export const PROTOCOL_VERSION = 1;
export const ROOM_PREFIX = 'wtp-draw-';
// No 0/O, 1/I/L: codes are read aloud and typed on phones.
export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const MAX_NAME_LENGTH = 16;
export const MAX_GUESS_LENGTH = 40;
export const MAX_TIMELINE_EVENTS = 25000;

export type Intent = 'begin-drawing' | 'correct' | 'skip' | 'next-round' | 'rematch';
const INTENTS: readonly Intent[] = ['begin-drawing', 'correct', 'skip', 'next-round', 'rematch'];

/**
 * Game state on the wire: the deadline travels as time remaining, since clocks differ, and
 * guessers get the hints unlocked so far instead of the answer.
 */
export type WireState = Omit<GameState, 'phaseEndsAt'> & { remainingMs: number | null; hint: Hint | null };

export type Message =
  | { t: 'hello'; v: number; clientId: string; name: string; avatarId: number }
  // hostToken lets a reconnecting guest tell the real host from someone who took over the code.
  | { t: 'lobby'; players: Player[]; youId: string; hostToken: string }
  | { t: 'reject'; reason: 'full' | 'version' }
  | { t: 'state'; state: WireState }
  | { t: 'intent'; intent: Intent }
  | { t: 'assign'; playerId: string }
  | { t: 'guess'; text: string }
  | { t: 'draw'; e: DrawEvent }
  | { t: 'canvas'; round: number; events: DrawEvent[] };

/** Cryptographically random, so codes can't be predicted from earlier ones. */
export function generateRoomCode(): string {
  return randomString(ROOM_CODE_LENGTH);
}

export function randomString(length: number, alphabet = ROOM_ALPHABET): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % alphabet.length);
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && out.length < length) out += alphabet[byte % alphabet.length];
    }
  }
  return out;
}

export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((c) => ROOM_ALPHABET.includes(c)) ? code : null;
}

/** Trims, strips control characters and caps length. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, '').trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

// ---- Serialization ---------------------------------------------------------------------------

export function toWire(state: GameState, viewerId: string, now: number, hint: Hint | null = null): WireState {
  const { phaseEndsAt, ...rest } = state;
  const viewerIsDrawer = state.players[state.currentDrawerIndex]?.id === viewerId;
  // The guesser must not receive the answer before the reveal.
  const hideAnswer = !viewerIsDrawer && (state.phase === 'MEMORIZE' || state.phase === 'DRAWING');
  return {
    ...rest,
    currentPokemon: hideAnswer ? null : state.currentPokemon,
    usedPokemonIds: [],
    remainingMs: phaseEndsAt === null ? null : Math.max(0, phaseEndsAt - now),
    hint: hideAnswer && state.phase === 'DRAWING' ? hint : null,
  };
}

export function fromWire(wire: WireState, now: number): { state: GameState; hint: Hint | null } {
  const { remainingMs, hint, ...rest } = wire;
  return { state: { ...rest, phaseEndsAt: remainingMs === null ? null : now + remainingMs }, hint };
}

// ---- Validation ------------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isInt = (v: unknown, min: number, max: number): v is number => isNum(v, min, max) && Number.isInteger(v);
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const oneOf = <T>(v: unknown, options: readonly T[]): v is T => options.includes(v as T);
const coord = (v: unknown) => isNum(v, -50, CANVAS_SIZE + 50);
// PeerJS's binary encoding turns an absent value into null, so both mean "no pressure".
const pressure = (v: unknown) => v === undefined || v === null || isNum(v, 0, 1);
const pressureValue = (v: unknown) => (typeof v === 'number' ? v : undefined);

export function validateDrawEvent(e: unknown): DrawEvent | null {
  if (!isObj(e)) return null;
  switch (e.type) {
    case 'stroke-start':
      return coord(e.x) && coord(e.y) && isColor(e.color) && isNum(e.size, 1, MAX_BRUSH) && pressure(e.p)
        ? { type: 'stroke-start', x: e.x as number, y: e.y as number, color: e.color, size: e.size, p: pressureValue(e.p) }
        : null;
    case 'stroke-move':
      return coord(e.x) && coord(e.y) && pressure(e.p)
        ? { type: 'stroke-move', x: e.x as number, y: e.y as number, p: pressureValue(e.p) }
        : null;
    case 'fill':
      return isNum(e.x, 0, CANVAS_SIZE) && isNum(e.y, 0, CANVAS_SIZE) && isColor(e.color)
        ? { type: 'fill', x: e.x, y: e.y, color: e.color }
        : null;
    case 'stroke-end':
    case 'undo':
    case 'redo':
    case 'clear':
      return { type: e.type };
    default:
      return null;
  }
}

function validatePlayer(p: unknown): Player | null {
  if (!isObj(p)) return null;
  const nickname = cleanText(p.nickname, MAX_NAME_LENGTH);
  const id = cleanText(p.id, 64);
  if (!nickname || !id || !isInt(p.avatarId, 1, 999) || !isInt(p.score, 0, 99)) return null;
  return { id, nickname, avatarId: p.avatarId, score: p.score };
}

// Only the ID is trusted: the name and artwork URL come from this device's own Pokédex, so the
// other phone can't make it load an arbitrary image or show an arbitrary name.
function validatePokemon(p: unknown): PokemonData | null {
  if (!isObj(p) || !isInt(p.id, 1, 99999)) return null;
  return getPokemon(p.id);
}

function validateSettings(s: unknown): GameSettings | null {
  if (!isObj(s)) return null;
  if (
    !oneOf(s.difficulty, DIFFICULTIES) ||
    !oneOf(s.timerDuration, TIMER_OPTIONS) ||
    !oneOf(s.memorizeSeconds, MEMORIZE_OPTIONS) ||
    !oneOf(s.winScore, WIN_SCORE_OPTIONS) ||
    !oneOf(s.turnsEach, TURNS_OPTIONS) ||
    typeof s.showArtwork !== 'boolean' ||
    typeof s.hints !== 'boolean'
  )
    return null;
  const generations = validateArray(s.generations, 9, (g) => (isInt(g, 1, 9) ? g : null));
  const types = validateArray(s.types, TYPES.length, (t) => (oneOf(t, TYPES) ? t : null));
  if (!generations || !types) return null;
  return {
    difficulty: s.difficulty,
    timerDuration: s.timerDuration,
    memorizeSeconds: s.memorizeSeconds,
    winScore: s.winScore,
    turnsEach: s.turnsEach,
    showArtwork: s.showArtwork,
    hints: s.hints,
    generations,
    types,
  };
}

function validateHint(h: unknown): Hint | null {
  if (!isObj(h)) return null;
  const blanks = validateArray(h.blanks, 40, (c) => (typeof c === 'string' && [...c].length === 1 ? c : null));
  if (!blanks) return null;
  const hint: Hint = { blanks };
  if (h.types !== undefined && h.types !== null) {
    const types = validateArray(h.types, 2, (t) => (oneOf(t, TYPES) ? t : null));
    if (!types) return null;
    hint.types = types;
  }
  if (h.generation !== undefined && h.generation !== null) {
    if (!isInt(h.generation, 1, 9)) return null;
    hint.generation = h.generation;
    hint.region = cleanText(h.region, 12) ?? undefined;
  }
  return hint;
}

const OUTCOMES: readonly RoundOutcome[] = ['correct', 'skipped', 'timeout'];

function validateArray<T>(v: unknown, max: number, fn: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const out: T[] = [];
  for (const item of v) {
    const ok = fn(item);
    if (ok === null) return null;
    out.push(ok);
  }
  return out;
}

function validateWireState(s: unknown): WireState | null {
  if (!isObj(s)) return null;
  const players = validateArray(s.players, MAX_PLAYERS, validatePlayer);
  const settings = validateSettings(s.settings);
  if (!players || players.length < 2 || !settings) return null;
  if (!oneOf(s.phase, ['MEMORIZE', 'DRAWING', 'REVEAL', 'GAME_OVER'] as const)) return null;
  if (!isInt(s.currentDrawerIndex, 0, players.length - 1) || !isInt(s.round, 0, 999)) return null;
  if (typeof s.awaitingSolver !== 'boolean') return null;
  const hint = s.hint === null || s.hint === undefined ? null : validateHint(s.hint);
  if (s.hint && !hint) return null;
  const currentPokemon = s.currentPokemon === null ? null : validatePokemon(s.currentPokemon);
  if (s.currentPokemon !== null && !currentPokemon) return null;
  const remainingMs = s.remainingMs === null ? null : isNum(s.remainingMs, 0, 120_000) ? s.remainingMs : undefined;
  if (remainingMs === undefined) return null;
  const outcome = s.outcome === null ? null : oneOf(s.outcome, OUTCOMES) ? s.outcome : undefined;
  if (outcome === undefined) return null;
  const roundResults = validateArray<RoundResult>(s.roundResults, 200, (r) => {
    if (!isObj(r) || !isInt(r.round, 1, 999) || !oneOf(r.outcome, OUTCOMES)) return null;
    const pokemon = validatePokemon(r.pokemon);
    const drawerId = cleanText(r.drawerId, 64);
    const solvedBy = r.solvedBy === null ? null : cleanText(r.solvedBy, 64);
    if (r.solvedBy !== null && !solvedBy) return null;
    return pokemon && drawerId ? { round: r.round, pokemon, outcome: r.outcome, drawerId, solvedBy } : null;
  });
  const chatMessages = validateArray<ChatMessage>(s.chatMessages, 50, (m) => {
    if (!isObj(m)) return null;
    const id = cleanText(m.id, 64);
    const senderId = cleanText(m.senderId, 64);
    const sender = cleanText(m.sender, MAX_NAME_LENGTH);
    const text = cleanText(m.text, MAX_GUESS_LENGTH);
    if (!id || !senderId || !sender || !text) return null;
    return { id, senderId, sender, text, isCorrect: m.isCorrect === true };
  });
  if (!roundResults || !chatMessages) return null;
  return {
    mode: 'remote',
    phase: s.phase,
    players,
    currentDrawerIndex: s.currentDrawerIndex,
    round: s.round,
    currentPokemon,
    settings,
    outcome,
    awaitingSolver: s.awaitingSolver,
    roundResults,
    chatMessages,
    usedPokemonIds: [],
    remainingMs,
    hint,
  };
}

export function validateMessage(raw: unknown): Message | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'hello': {
      const clientId = cleanText(raw.clientId, 64);
      const name = cleanText(raw.name, MAX_NAME_LENGTH);
      if (!isInt(raw.v, 0, 999) || !clientId || !name || !isInt(raw.avatarId, 1, 999)) return null;
      return { t: 'hello', v: raw.v, clientId, name, avatarId: raw.avatarId };
    }
    case 'lobby': {
      const players = validateArray(raw.players, 2, validatePlayer);
      const youId = cleanText(raw.youId, 64);
      const hostToken = cleanText(raw.hostToken, 64);
      return players && youId && hostToken ? { t: 'lobby', players, youId, hostToken } : null;
    }
    case 'reject':
      return oneOf(raw.reason, ['full', 'version'] as const) ? { t: 'reject', reason: raw.reason } : null;
    case 'state': {
      const state = validateWireState(raw.state);
      return state ? { t: 'state', state } : null;
    }
    case 'intent':
      return oneOf(raw.intent, INTENTS) ? { t: 'intent', intent: raw.intent } : null;
    case 'assign': {
      const playerId = cleanText(raw.playerId, 64);
      return playerId ? { t: 'assign', playerId } : null;
    }
    case 'guess': {
      const text = cleanText(raw.text, MAX_GUESS_LENGTH);
      return text ? { t: 'guess', text } : null;
    }
    case 'draw': {
      const e = validateDrawEvent(raw.e);
      return e ? { t: 'draw', e } : null;
    }
    case 'canvas': {
      if (!isInt(raw.round, 0, 999)) return null;
      const events = validateArray(raw.events, MAX_TIMELINE_EVENTS, validateDrawEvent);
      return events ? { t: 'canvas', round: raw.round, events } : null;
    }
    default:
      return null;
  }
}
