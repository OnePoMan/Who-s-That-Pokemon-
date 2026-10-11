import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  drawerOrder,
  gameReducer,
  getTeamScores,
  getWinners,
  getWinningTeams,
  guessStreak,
  initialGameState,
  isSteal,
  teamsProblem,
  type GameSettings,
  type GameState,
  type Player,
  type PokemonData,
} from './game-state';

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
    let s: GameState = gameReducer(drawing(), { type: 'END_ROUND', outcome: 'skipped' });
    expect(s.currentDrawerIndex).toBe(0);
    s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    expect(s.currentDrawerIndex).toBe(1);
    expect(s.round).toBe(2);
    expect(s.chatMessages).toEqual([]);
  });

  it('ends the game when someone reaches the winning score', () => {
    let s: GameState = started({ ...DEFAULT_SETTINGS, winScore: 3 });
    for (let round = 0; round < 6 && s.phase !== 'GAME_OVER'; round++) {
      s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'correct' });
      s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    }
    expect(s.phase).toBe('GAME_OVER');
    expect(getWinners(s).map((p) => p.score)).toEqual([3]);
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

const party: Player[] = [
  { id: 'p1', nickname: 'Ash', avatarId: 1, score: 0 },
  { id: 'p2', nickname: 'Misty', avatarId: 20, score: 0 },
  { id: 'p3', nickname: 'Brock', avatarId: 21, score: 0 },
];

function partyGame(turnsEach: 1 | 2 | 3 = 1): GameState {
  return gameReducer(initialGameState, {
    type: 'START_GAME',
    mode: 'local',
    players: party,
    settings: { ...DEFAULT_SETTINGS, turnsEach },
    pokemon: pikachu,
  });
}

const score = (s: GameState) => Object.fromEntries(s.players.map((p) => [p.id, p.score]));

describe('party games (3+ players)', () => {
  it('rotates the drawer through every player', () => {
    let s = partyGame(2);
    const drawers: number[] = [];
    for (let i = 0; i < 4; i++) {
      drawers.push(s.currentDrawerIndex);
      s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'skipped' });
      s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    }
    expect(drawers).toEqual([0, 1, 2, 0]);
  });

  it('scores the first correct guesser and the drawer', () => {
    const s = gameReducer(drawing(partyGame()), { type: 'END_ROUND', outcome: 'correct', solvedBy: 'p3' });
    expect(score(s)).toEqual({ p1: 1, p2: 0, p3: 1 });
    expect(s.roundResults[0].solvedBy).toBe('p3');
  });

  it('asks who got it on a shared phone, and only then scores and allows the next round', () => {
    let s = gameReducer(drawing(partyGame()), { type: 'END_ROUND', outcome: 'correct', solvedBy: null });
    expect(s.awaitingSolver).toBe(true);
    expect(score(s)).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee }).phase).toBe('REVEAL');
    expect(gameReducer(s, { type: 'ASSIGN_SOLVER', playerId: 'p1' }).awaitingSolver).toBe(true); // the drawer can't be chosen
    s = gameReducer(s, { type: 'ASSIGN_SOLVER', playerId: 'p2' });
    s = gameReducer(s, { type: 'ASSIGN_SOLVER', playerId: 'p3' }); // ignored: already assigned
    expect(score(s)).toEqual({ p1: 1, p2: 1, p3: 0 });
    expect(gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee }).phase).toBe('MEMORIZE');
  });

  it('never lets the drawer be credited with the guess', () => {
    const s = gameReducer(drawing(partyGame()), { type: 'END_ROUND', outcome: 'correct', solvedBy: 'p1' });
    expect(s.awaitingSolver).toBe(true);
    expect(score(s)).toEqual({ p1: 0, p2: 0, p3: 0 });
  });

  it('ends after everyone has drawn the chosen number of times, and ties share the win', () => {
    let s = partyGame(1);
    const solvers = ['p2', 'p3', 'p1']; // each round someone other than the drawer guesses
    for (const solver of solvers) {
      s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'correct', solvedBy: solver });
      s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    }
    expect(s.phase).toBe('GAME_OVER');
    expect(s.round).toBe(3);
    expect(score(s)).toEqual({ p1: 2, p2: 2, p3: 2 });
    expect(getWinners(s).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('counts guessing streaks across rounds the player guessed in', () => {
    let s = partyGame(3);
    for (const solver of ['p2', 'p1', 'p2', 'p2']) {
      s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'correct', solvedBy: solver });
      s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
    }
    // Round 2 p2 drew (skipped for their streak); rounds 1, 3 and 4 they guessed it.
    expect(guessStreak(s, 'p2')).toBe(3);
    expect(guessStreak(s, 'p3')).toBe(0);
  });
});

function teamGame(count: number, settings: Partial<GameSettings> = {}, roster?: Player[]): GameState {
  const players =
    roster ?? Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, nickname: `Player ${i + 1}`, avatarId: i + 1, score: 0 }));
  return gameReducer(initialGameState, {
    type: 'START_GAME',
    mode: 'local',
    players,
    settings: { ...DEFAULT_SETTINGS, teams: true, ...settings },
    pokemon: pikachu,
  });
}

const teamIds = (s: GameState, team: 'red' | 'blue') => s.players.filter((p) => p.team === team).map((p) => p.id);

/** Plays the whole game; solver(drawerId) picks who guesses each round, or null to time out. */
function playOut(s: GameState, solver: (drawerId: string, round: number) => string | null): GameState {
  while (s.phase !== 'GAME_OVER') {
    const drawerId = s.players[s.currentDrawerIndex].id;
    const solvedBy = solver(drawerId, s.round);
    s = gameReducer(drawing(s), solvedBy ? { type: 'END_ROUND', outcome: 'correct', solvedBy } : { type: 'END_ROUND', outcome: 'timeout' });
    s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
  }
  return s;
}

describe('team mode', () => {
  it.each([
    [4, 2, 2],
    [5, 3, 2],
    [8, 4, 4],
  ])('auto-balances %i players into %i red and %i blue, alternating', (count, red, blue) => {
    const s = teamGame(count);
    expect(teamIds(s, 'red')).toHaveLength(red);
    expect(teamIds(s, 'blue')).toHaveLength(blue);
    expect(s.players.map((p) => p.team)).toEqual(Array.from({ length: count }, (_, i) => (i % 2 === 0 ? 'red' : 'blue')));
    expect(teamsProblem(s.players)).toBeNull();
  });

  it('keeps a valid host-chosen split and falls back to auto-balance for an invalid one', () => {
    const roster = (teams: ('red' | 'blue')[]): Player[] => teams.map((team, i) => ({ id: `p${i + 1}`, nickname: `P${i + 1}`, avatarId: i + 1, score: 0, team }));
    expect(teamGame(0, {}, roster(['red', 'red', 'blue', 'blue', 'red'])).players.map((p) => p.team)).toEqual(['red', 'red', 'blue', 'blue', 'red']);
    expect(teamGame(0, {}, roster(['red', 'red', 'red', 'red', 'blue'])).players.map((p) => p.team)).toEqual(['red', 'blue', 'red', 'blue', 'red']);
    expect(teamsProblem(roster(['red', 'red', 'red', 'blue']))).toMatch(/Team Blue needs at least 2/);
  });

  it('is off by default, with fewer than 4 players, and strips stale teams', () => {
    expect(teamGame(4, { teams: false }).players.every((p) => p.team === undefined)).toBe(true);
    expect(teamGame(3).players.every((p) => p.team === undefined)).toBe(true);
    expect(DEFAULT_SETTINGS.teams).toBe(false);
  });

  it('alternates the drawer between teams, and everyone draws turnsEach times', () => {
    for (const [count, turnsEach] of [[4, 1], [4, 2], [6, 3], [8, 1]] as const) {
      let s = teamGame(count, { turnsEach });
      const drawers: string[] = [];
      while (s.phase !== 'GAME_OVER') {
        drawers.push(s.players[s.currentDrawerIndex].id);
        s = gameReducer(drawing(s), { type: 'END_ROUND', outcome: 'skipped' });
        s = gameReducer(s, { type: 'NEXT_ROUND', pokemon: eevee });
      }
      const teams = drawers.map((id) => s.players.find((p) => p.id === id)!.team);
      expect(teams).toEqual(drawers.map((_, i) => (i % 2 === 0 ? 'red' : 'blue')));
      for (const p of s.players) expect(drawers.filter((d) => d === p.id)).toHaveLength(turnsEach);
    }
  });

  it('with uneven teams still lets everyone draw equally, alternating while it can', () => {
    const players = teamGame(5, { turnsEach: 2 }).players;
    const order = drawerOrder(players, 2);
    expect(order).toHaveLength(10);
    for (let i = 0; i < players.length; i++) expect(order.filter((x) => x === i)).toHaveLength(2);
    expect(order.slice(0, 8).map((i) => players[i].team)).toEqual(['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue']);
  });

  it('gives the drawer\'s team a point when a teammate guesses', () => {
    const s = gameReducer(drawing(teamGame(4)), { type: 'END_ROUND', outcome: 'correct', solvedBy: 'p3' }); // p1 (red) draws, p3 (red) solves
    expect(getTeamScores(s)).toEqual({ red: 1, blue: 0 });
    expect(isSteal(s, s.roundResults[0])).toBe(false);
    expect(Object.fromEntries(s.players.map((p) => [p.id, p.score]))).toEqual({ p1: 1, p2: 0, p3: 1, p4: 0 }); // individual scores as before
  });

  it('gives the guessing team the point when the other team steals', () => {
    const s = gameReducer(drawing(teamGame(4)), { type: 'END_ROUND', outcome: 'correct', solvedBy: 'p2' }); // p1 (red) draws, p2 (blue) solves
    expect(getTeamScores(s)).toEqual({ red: 0, blue: 1 });
    expect(isSteal(s, s.roundResults[0])).toBe(true);
  });

  it('scores the shared-phone "who got it?" pick for the solver\'s team', () => {
    let s = gameReducer(drawing(teamGame(4)), { type: 'END_ROUND', outcome: 'correct', solvedBy: null });
    expect(getTeamScores(s)).toEqual({ red: 0, blue: 0 });
    s = gameReducer(s, { type: 'ASSIGN_SOLVER', playerId: 'p4' });
    expect(getTeamScores(s)).toEqual({ red: 0, blue: 1 });
  });

  it('gives nobody a point for skipped or timed-out rounds', () => {
    const s = gameReducer(drawing(teamGame(4)), { type: 'END_ROUND', outcome: 'timeout' });
    expect(getTeamScores(s)).toEqual({ red: 0, blue: 0 });
  });

  it('the highest team score wins and the winners are that team\'s players', () => {
    // Round 1: red draws, teammate solves. Round 2: blue draws, red steals. Round 3: red draws, blue steals.
    const s = playOut(teamGame(4), (_drawerId, round) => [null, 'p3', 'p1', 'p2', null][round]);
    expect(getTeamScores(s)).toEqual({ red: 2, blue: 1 });
    expect(getWinningTeams(s)).toEqual(['red']);
    expect(getWinners(s).map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(s.players.find((p) => p.id === 'p2')!.score).toBe(2); // drew once, solved once: individual scores still tracked
  });

  it('a tie is a shared win', () => {
    const s = playOut(teamGame(4), (drawerId) => ({ p1: 'p3', p2: 'p4', p3: null, p4: null })[drawerId] ?? null);
    expect(getTeamScores(s)).toEqual({ red: 1, blue: 1 });
    expect(getWinningTeams(s)).toEqual(['red', 'blue']);
    expect(getWinners(s)).toHaveLength(4);
  });

  it('rematch keeps the teams and clears the team score', () => {
    let s = playOut(teamGame(4), (drawerId) => (drawerId === 'p1' ? 'p3' : null));
    s = gameReducer(s, { type: 'REMATCH', pokemon: eevee });
    expect(s.players.map((p) => p.team)).toEqual(['red', 'blue', 'red', 'blue']);
    expect(getTeamScores(s)).toEqual({ red: 0, blue: 0 });
  });
});
