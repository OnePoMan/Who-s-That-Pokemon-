import { describe, expect, it } from 'vitest';
import { cleanText, fromWire, generateRoomCode, normalizeRoomCode, toWire, validateMessage, ROOM_ALPHABET } from './protocol';
import { DEFAULT_SETTINGS, initialGameState, type GameState } from '../game-state';
import { safeFilename } from '../share';

const state: GameState = {
  ...initialGameState,
  mode: 'remote',
  phase: 'DRAWING',
  round: 1,
  players: [
    { id: 'p1', nickname: 'Ash', avatarId: 1, score: 0 },
    { id: 'p2', nickname: 'Misty', avatarId: 20, score: 0 },
  ],
  currentDrawerIndex: 0,
  currentPokemon: { id: 25, name: 'Pikachu', artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/x/25.png' },
  settings: DEFAULT_SETTINGS,
  phaseEndsAt: 70_000,
};

describe('room codes', () => {
  it('generates codes from the unambiguous alphabet', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect([...code].every((c) => ROOM_ALPHABET.includes(c))).toBe(true);
  });

  it('normalizes typed codes and rejects invalid ones', () => {
    expect(normalizeRoomCode(' ab-cd ef ')).toBe('ABCDEF');
    expect(normalizeRoomCode('ABCDE0')).toBeNull(); // 0 is not in the alphabet
    expect(normalizeRoomCode('ABC')).toBeNull();
  });
});

describe('wire state', () => {
  it('never sends the answer to the guesser while it is secret', () => {
    expect(toWire(state, 'p2', 10_000).currentPokemon).toBeNull();
    expect(toWire(state, 'p1', 10_000).currentPokemon?.name).toBe('Pikachu');
    expect(toWire({ ...state, phase: 'REVEAL' }, 'p2', 10_000).currentPokemon?.name).toBe('Pikachu');
  });

  it('sends the deadline as time remaining and rebuilds it on the other clock', () => {
    const wire = toWire(state, 'p1', 10_000);
    expect(wire.remainingMs).toBe(60_000);
    expect(fromWire(wire, 500_000).phaseEndsAt).toBe(560_000);
  });

  it('round-trips through validation', () => {
    const msg = validateMessage({ t: 'state', state: toWire(state, 'p1', 10_000) });
    expect(msg?.t).toBe('state');
  });
});

describe('validateMessage', () => {
  it('rejects unknown or malformed messages', () => {
    expect(validateMessage(null)).toBeNull();
    expect(validateMessage({ t: 'nope' })).toBeNull();
    expect(validateMessage({ t: 'intent', intent: 'win-instantly' })).toBeNull();
    expect(validateMessage({ t: 'hello', v: 1, clientId: 'x', name: '', avatarId: 1 })).toBeNull();
  });

  it('rejects draw events outside the canvas or with odd colours', () => {
    expect(validateMessage({ t: 'draw', e: { type: 'stroke-start', x: 1e9, y: 0, color: '#000000', size: 4 } })).toBeNull();
    expect(validateMessage({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: 'url(evil)', size: 4 } })).toBeNull();
    expect(validateMessage({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: '#00ff00', size: 999 } })).toBeNull();
    expect(validateMessage({ t: 'draw', e: { type: 'stroke-move', x: 10, y: 10 } })).not.toBeNull();
  });

  it('accepts strokes whose missing pressure arrives as null', () => {
    // PeerJS's binary encoding sends undefined fields as null.
    const msg = validateMessage({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: '#000000', size: 4, p: null } });
    expect(msg).toEqual({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: '#000000', size: 4, p: undefined } });
  });

  it('rejects state that points artwork at another host', () => {
    const bad = toWire({ ...state, currentPokemon: { ...state.currentPokemon!, artworkUrl: 'https://evil.example/x.png' } }, 'p1', 0);
    expect(validateMessage({ t: 'state', state: bad })).toBeNull();
  });

  it('trims and caps guesses and names', () => {
    const msg = validateMessage({ t: 'guess', text: `  ${'a'.repeat(100)}  ` });
    expect(msg?.t === 'guess' && msg.text.length).toBe(40);
  });
});

describe('text cleaning', () => {
  it('strips control and direction-override characters', () => {
    expect(cleanText('Ash‮evil\u0000', 16)).toBe('Ashevil');
    expect(cleanText('   ', 16)).toBeNull();
    expect(cleanText(42, 16)).toBeNull();
  });

  it('makes safe file names', () => {
    expect(safeFilename('Mr. Mime', 'by', '../../etc')).toBe('Mr-Mime-by-etc');
    expect(safeFilename('Flabébé')).toBe('Flabebe');
    expect(safeFilename('???')).toBe('drawing');
  });
});
