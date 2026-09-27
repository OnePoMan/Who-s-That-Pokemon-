import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, gameReducer, getWinner, initialGameState, type GameState, type PokemonData } from './game-state';

const pikachu: PokemonData = { id: 25, name: 'Pikachu', artworkUrl: 'https://example/25.png' };
const eevee: PokemonData = { id: 133, name: 'Eevee', artworkUrl: 'https://example/133.png' };
const players = [
  { id: 'p1', nickname: 'Ash', avatarId: 1, score: 0 },
  { id: 'p2', nickname: 'Misty', avatarId: 20, score: 0 },
];

function started(settings = DEFAULT_SETTINGS): GameState {
  return gameReducer(initialGameState, { type: 'START_GAME', mode: 'local', players, settings, pokemon: pikachu });
}

function drawing(state = started()): GameState {
  let s = gameReducer(state, { type: 'BEGIN_MEMORIZE', now: 0 });
  s = gameReducer(s, { type: 'START_DRAWING', now: 1000 });
  return s;
}

describe('gameReducer', () => {
  it('starts round 1 in the handoff state with no timer running', () => {
    const s = started();
    expect(s.phase).toBe('MEMORIZE');
    expect(s.round).toBe(1);
    expect(s.phaseEndsAt).toBeNull();
    expect(s.usedPokemonIds).toEqual([25]);
  });

  it('runs the memorize countdown for the configured time, then the drawing timer', () => {
    let s = gameReducer(started(), { type: 'BEGIN_MEMORIZE', now: 5000 });
    expect(s.phaseEndsAt).toBe(5000 + DEFAULT_SETTINGS.memorizeSeconds * 1000);
    s = gameReducer(s, { type: 'START_DRAWING', now: 9000 });
    expect(s.phase).toBe('DRAWING');
    expect(s.phaseEndsAt).toBe(9000 + DEFAULT_SETTINGS.timerDuration * 1000);
  });

  it('awards exactly one point for a correct round, however many times it is reported', () => {
    let s = drawing();
    s = gameReducer(s, { type: 'END_ROUND', outcome: 'correct' });
    s = gameReducer(s, { type: 'END_ROUND', outcome: 'correct' });
    s = gameReducer(s, { type: 'END_ROUND', outcome: 'timeout' });
    expect(s.phase).toBe('REVEAL');
    expect(s.outcome).toBe('correct');
    expect(s.players.find((p) => p.id === 'p2')!.score).toBe(1);
    expect(s.players.find((p) => p.id === 'p1')!.score).toBe(0);
    expect(s.roundResults).toHaveLength(1);
  });

  it('records skipped and timed-out rounds without scoring', () => {
    for (const outcome of ['skipped', 'timeout'] as const) {
      const s = gameReducer(drawing(), { type: 'END_ROUND', outcome });
      expect(s.outcome).toBe(outcome);
      expect(s.roundResults[0].outcome).toBe(outcome);
      expect(s.players.every((p) => p.score === 0)).toBe(true);
    }
  });

  it('swaps drawer and guesser each round', () => {
    let s = gameReducer(drawing(), { type: 'END_ROUND', outcome: 'skipped' });
    expect(s.currentDrawerIndex).toBe(0);
    s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    expect(s.currentDrawerIndex).toBe(1);
    expect(s.round).toBe(2);
    expect(s.chatMessages).toEqual([]);
  });

  it('ends the game when someone reaches the winning score', () => {
    let s = started({ ...DEFAULT_SETTINGS, winScore: 3 });
    for (let round = 0; round < 6 && s.phase !== 'GAME_OVER'; round++) {
      s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'correct' });
      s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    }
    expect(s.phase).toBe('GAME_OVER');
    expect(getWinner(s)?.score).toBe(3);
  });

  it('rematch keeps players and settings but resets scores and history', () => {
    let s: GameState = { ...drawing(), phase: 'GAME_OVER', players: players.map((p) => ({ ...p, score: 3 })) };
    s = gameReducer(s, { type: 'REMATCH', pokemon: eevee });
    expect(s.phase).toBe('MEMORIZE');
    expect(s.round).toBe(1);
    expect(s.players.map((p) => p.score)).toEqual([0, 0]);
    expect(s.players.map((p) => p.nickname)).toEqual(['Ash', 'Misty']);
    expect(s.roundResults).toEqual([]);
  });

  it('ignores chat outside the drawing phase', () => {
    const s = gameReducer(started(), {
      type: 'ADD_CHAT_MESSAGE',
      message: { id: '1', senderId: 'p2', sender: 'Misty', text: 'Pikachu' },
    });
    expect(s.chatMessages).toEqual([]);
  });
});
