import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, cleanText, fromWire, generateRoomCode, normalizeRoomCode, toWire, validateMessage, ROOM_ALPHABET } from './protocol';
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
    expect(fromWire(wire, 500_000).state.phaseEndsAt).toBe(560_000);
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

  it('validates shapes like strokes', () => {
    const rect = { type: 'shape', shape: 'rect', x1: 10, y1: 10, x2: 200, y2: 150, color: '#3B4CCA', size: 8 };
    expect(validateMessage({ t: 'draw', e: rect })).toEqual({ t: 'draw', e: rect });
    expect(validateMessage({ t: 'draw', e: { ...rect, shape: 'star' } })).toBeNull();
    expect(validateMessage({ t: 'draw', e: { ...rect, x2: 1e6 } })).toBeNull();
    expect(validateMessage({ t: 'draw', e: { ...rect, size: 0 } })).toBeNull();
  });

  it('accepts strokes whose missing pressure arrives as null', () => {
    // PeerJS's binary encoding sends undefined fields as null.
    const msg = validateMessage({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: '#000000', size: 4, p: null } });
    expect(msg).toEqual({ t: 'draw', e: { type: 'stroke-start', x: 10, y: 10, color: '#000000', size: 4, p: undefined } });
  });

  it('ignores names and artwork URLs sent by the other phone', () => {
    const tampered = toWire(
      { ...state, currentPokemon: { id: 25, name: 'Totally Pikachu', artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/../../evil/x.png' } },
      'p1',
      0,
    );
    const msg = validateMessage({ t: 'state', state: tampered });
    expect(msg?.t === 'state' && msg.state.currentPokemon).toEqual({
      id: 25,
      name: 'Pikachu',
      artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    });
  });

  it('accepts a boolean shiny flag but still rebuilds the artwork URL locally', () => {
    const shiny = toWire({ ...state, currentPokemon: { ...state.currentPokemon!, shiny: true } }, 'p1', 0);
    const msg = validateMessage({ t: 'state', state: shiny });
    expect(msg?.t === 'state' && msg.state.currentPokemon).toEqual({
      id: 25,
      name: 'Pikachu',
      artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      shiny: true,
    });
    const plain = validateMessage({ t: 'state', state: toWire(state, 'p1', 0) });
    expect(plain?.t === 'state' && plain.state.currentPokemon?.shiny).toBeUndefined();
    const nulled = toWire({ ...state, currentPokemon: { ...state.currentPokemon!, shiny: null as unknown as boolean } }, 'p1', 0);
    expect(validateMessage({ t: 'state', state: nulled })).not.toBeNull();
  });

  it('rejects a non-boolean shiny flag', () => {
    for (const shiny of ['true', 1, {}, 'https://evil.example/x.png']) {
      const bad = toWire({ ...state, currentPokemon: { ...state.currentPokemon!, shiny: shiny as unknown as boolean } }, 'p1', 0);
      expect(validateMessage({ t: 'state', state: bad })).toBeNull();
    }
  });

  it('rejects unknown Pokémon IDs', () => {
    const bad = toWire({ ...state, currentPokemon: { ...state.currentPokemon!, id: 99999 } }, 'p1', 0);
    expect(validateMessage({ t: 'state', state: bad })).toBeNull();
  });

  it('trims and caps guesses and names', () => {
    const msg = validateMessage({ t: 'guess', text: `  ${'a'.repeat(100)}  ` });
    expect(msg?.t === 'guess' && msg.text.length).toBe(40);
  });
});

describe('rooms with several phones', () => {
  it('accepts spectator hellos without a name and player hellos with one', () => {
    expect(validateMessage({ t: 'hello', v: 2, clientId: 'tv', role: 'spectator' })).toMatchObject({ role: 'spectator', name: 'TV' });
    expect(validateMessage({ t: 'hello', v: 2, clientId: 'a', role: 'player', name: 'Ash', avatarId: 1 })).toMatchObject({ role: 'player', name: 'Ash' });
    expect(validateMessage({ t: 'hello', v: 2, clientId: 'a', role: 'player' })).toBeNull();
    expect(validateMessage({ t: 'hello', v: 2, clientId: 'a', role: 'admin', name: 'x', avatarId: 1 })).toBeNull();
  });

  it('only allows the fixed set of reactions', () => {
    expect(validateMessage({ t: 'react', emoji: '🔥' })).toEqual({ t: 'react', emoji: '🔥' });
    expect(validateMessage({ t: 'react', emoji: '<img src=x>' })).toBeNull();
    expect(validateMessage({ t: 'reaction', from: 'p2', emoji: '😂' })).toEqual({ t: 'reaction', from: 'p2', emoji: '😂' });
  });

  it('validates lobby messages for up to eight players', () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, nickname: `P${i + 1}`, avatarId: i + 1, score: 0 }));
    expect(validateMessage({ t: 'lobby', players, youId: 'p3', hostToken: 'tok', spectators: 1 })?.t).toBe('lobby');
    expect(validateMessage({ t: 'lobby', players: [...players, players[0]], youId: 'p3', hostToken: 'tok', spectators: 1 })).toBeNull();
    expect(validateMessage({ t: 'lobby', players, youId: 'p3', hostToken: 'tok', spectators: 99 })).toBeNull();
  });

  it('hides the answer from spectators too', () => {
    expect(toWire(state, 'spectator', 0).currentPokemon).toBeNull();
  });
});

describe('team mode on the wire', () => {
  const teamPlayers = (['red', 'blue', 'red', 'blue'] as const).map((team, i) => ({ id: `p${i + 1}`, nickname: `P${i + 1}`, avatarId: i + 1, score: 0, team }));
  const teamState: GameState = { ...state, players: teamPlayers, settings: { ...DEFAULT_SETTINGS, teams: true } };
  const settingsOf = (wireSettings: unknown) => {
    const msg = validateMessage({ t: 'state', state: { ...toWire(teamState, 'p1', 0), settings: wireSettings } });
    return msg?.t === 'state' ? msg.state.settings : null;
  };

  it('round-trips the teams setting and each player\'s team', () => {
    const msg = validateMessage({ t: 'state', state: toWire(teamState, 'p1', 0) });
    expect(msg?.t === 'state' && msg.state.settings.teams).toBe(true);
    expect(msg?.t === 'state' && msg.state.players.map((p) => p.team)).toEqual(['red', 'blue', 'red', 'blue']);
  });

  it('treats settings without the field (older hosts) as teams off', () => {
    const old: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    delete old.teams;
    expect(settingsOf(old)?.teams).toBe(false);
    expect(settingsOf({ ...old, teams: null })?.teams).toBe(false);
  });

  it('rejects a non-boolean teams setting or an unknown team', () => {
    expect(settingsOf({ ...DEFAULT_SETTINGS, teams: 'yes' })).toBeNull();
    const bad = toWire({ ...teamState, players: teamPlayers.map((p, i) => (i === 0 ? { ...p, team: 'green' as never } : p)) }, 'p1', 0);
    expect(validateMessage({ t: 'state', state: bad })).toBeNull();
  });

  describe('lobby team assignments', () => {
    const lobby = (players: unknown[]) => validateMessage({ t: 'lobby', players, youId: 'p1', hostToken: 't', spectators: 0 });

    it('keeps the host\'s teams', () => {
      const msg = lobby(teamPlayers);
      expect(msg?.t === 'lobby' && msg.players.map((p) => p.team)).toEqual(['red', 'blue', 'red', 'blue']);
    });

    it('accepts a roster with no teams, including nulls from the binary encoding', () => {
      const msg = lobby(teamPlayers.map((p) => ({ ...p, team: null })));
      expect(msg?.t === 'lobby' && msg.players.every((p) => p.team === undefined)).toBe(true);
    });

    it('rejects partial assignments, unknown teams, duplicate ids and too-small rooms', () => {
      expect(lobby([...teamPlayers.slice(0, 3), { ...teamPlayers[3], team: null }])).toBeNull();
      expect(lobby(teamPlayers.map((p, i) => (i === 0 ? { ...p, team: 'green' } : p)))).toBeNull();
      expect(lobby(teamPlayers.map((p, i) => (i === 3 ? { ...p, id: 'p1' } : p)))).toBeNull();
      expect(lobby(teamPlayers.slice(0, 3))).toBeNull();
      expect(lobby([...teamPlayers, ...teamPlayers.map((p) => ({ ...p, id: p.id + 'x' })), { ...teamPlayers[0], id: 'p9' }])).toBeNull();
    });
  });
});

describe('protocol version', () => {
  it('is 4 or later, so phones from before team lobbies and shiny reveals are turned away', () => {
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(4);
  });

  it('carries the version in hello and, optionally, in reject', () => {
    const hello = { t: 'hello', v: 3, clientId: 'c', role: 'player', name: 'Ash', avatarId: 1 };
    expect(validateMessage(hello)).toMatchObject({ t: 'hello', v: 3 });
    expect(validateMessage({ t: 'reject', reason: 'version' })).toEqual({ t: 'reject', reason: 'version' });
    expect(validateMessage({ t: 'reject', reason: 'version', hostVersion: PROTOCOL_VERSION })).toEqual({
      t: 'reject',
      reason: 'version',
      hostVersion: PROTOCOL_VERSION,
    });
    expect(validateMessage({ t: 'reject', reason: 'version', hostVersion: 'new' })).toBeNull();
    expect(validateMessage({ t: 'reject', reason: 'nope' })).toBeNull();
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

describe('heartbeat', () => {
  it('accepts a bare ping and strips anything extra', () => {
    expect(validateMessage({ t: 'ping' })).toEqual({ t: 'ping' });
    expect(validateMessage({ t: 'ping', payload: 'x'.repeat(10_000) })).toEqual({ t: 'ping' });
  });
});
