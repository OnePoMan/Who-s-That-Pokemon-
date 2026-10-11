export type GamePhase = 'LOBBY' | 'MEMORIZE' | 'DRAWING' | 'REVEAL' | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TimerOption = 30 | 60 | 90;
export type MemorizeOption = 5 | 10 | 15;
export type WinScoreOption = 3 | 5 | 7;
export type TurnsOption = 1 | 2 | 3;
export type GameMode = 'local' | 'remote';
export type RoundOutcome = 'correct' | 'skipped' | 'timeout';

export const TIMER_OPTIONS: readonly TimerOption[] = [30, 60, 90];
export const MEMORIZE_OPTIONS: readonly MemorizeOption[] = [5, 10, 15];
export const WIN_SCORE_OPTIONS: readonly WinScoreOption[] = [3, 5, 7];
export const TURNS_OPTIONS: readonly TurnsOption[] = [1, 2, 3];
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export type Team = 'red' | 'blue';
export const TEAMS: readonly Team[] = ['red', 'blue'];
export const TEAM_NAMES: Record<Team, string> = { red: 'Team Red', blue: 'Team Blue' };
/** Team mode is only offered from this many players, and each team needs at least MIN_TEAM_SIZE. */
export const MIN_TEAM_PLAYERS = 4;
export const MIN_TEAM_SIZE = 2;

export interface Player {
  id: string;
  nickname: string;
  avatarId: number;
  score: number;
  /** Only set in team mode. */
  team?: Team;
}

export interface PokemonData {
  id: number;
  name: string;
  /** The normal artwork, which the drawer memorizes (see `revealArtworkUrl` for the reveal). */
  artworkUrl: string;
  /** A rare shiny, decided where the Pokémon is picked; shown only at the reveal. */
  shiny?: boolean;
}

export interface GameSettings {
  difficulty: Difficulty;
  timerDuration: TimerOption;
  memorizeSeconds: MemorizeOption;
  /** Two-player games: first to this many points wins. */
  winScore: WinScoreOption;
  /** Party games (3+ players): how many times each player draws. */
  turnsEach: TurnsOption;
  /** When false the drawer only sees the name while memorizing. */
  showArtwork: boolean;
  hints: boolean;
  /** Empty = all generations. */
  generations: number[];
  /** Empty = all types. */
  types: string[];
  /** Pick only from the host's starred Pokémon (picking happens on the host). */
  favouritesOnly: boolean;
  /** Party games with 4+ players: two teams (Red and Blue) compete instead of individuals. */
  teams: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'easy',
  timerDuration: 60,
  memorizeSeconds: 10,
  winScore: 3,
  turnsEach: 1,
  showArtwork: true,
  hints: true,
  generations: [],
  types: [],
  favouritesOnly: false,
  teams: false,
};

export interface RoundResult {
  round: number;
  pokemon: PokemonData;
  outcome: RoundOutcome;
  drawerId: string;
  /** Who guessed it; null if nobody did (or not yet chosen on a shared phone). */
  solvedBy: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  text: string;
  isCorrect?: boolean;
}

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  currentDrawerIndex: number;
  round: number;
  currentPokemon: PokemonData | null;
  settings: GameSettings;
  /**
   * Local clock time (ms) when the memorize countdown or drawing timer ends. Null while the
   * device is being handed over, so the handoff screen never eats into anyone's time.
   */
  phaseEndsAt: number | null;
  outcome: RoundOutcome | null;
  /** A correct round on a shared phone in a party game, waiting for "who got it?". */
  awaitingSolver: boolean;
  roundResults: RoundResult[];
  chatMessages: ChatMessage[];
  usedPokemonIds: number[];
}

export const initialGameState: GameState = {
  mode: 'local',
  phase: 'LOBBY',
  players: [],
  currentDrawerIndex: 0,
  round: 0,
  currentPokemon: null,
  settings: DEFAULT_SETTINGS,
  phaseEndsAt: null,
  outcome: null,
  awaitingSolver: false,
  roundResults: [],
  chatMessages: [],
  usedPokemonIds: [],
};

export type GameAction =
  | { type: 'START_GAME'; mode: GameMode; players: Player[]; settings: GameSettings; pokemon: PokemonData }
  | { type: 'BEGIN_MEMORIZE'; now: number }
  | { type: 'START_DRAWING'; now: number }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  /** solvedBy null on a correct round = ask "who got it?" on the reveal screen. */
  | { type: 'END_ROUND'; outcome: RoundOutcome; solvedBy?: string | null }
  | { type: 'ASSIGN_SOLVER'; playerId: string }
  | { type: 'NEXT_ROUND'; pokemon: PokemonData }
  | { type: 'REMATCH'; pokemon: PokemonData }
  | { type: 'REPLACE'; state: GameState }
  | { type: 'RESET' };

export function isParty(state: Pick<GameState, 'players'>): boolean {
  return state.players.length > 2;
}

// ---- Teams ---------------------------------------------------------------------------------

/** Default, auto-balanced assignment: players alternate Red, Blue, Red, Blue, … */
export function autoTeam(index: number): Team {
  return TEAMS[index % 2];
}

export function teamCounts(players: Pick<Player, 'team'>[]): Record<Team, number> {
  return { red: players.filter((p) => p.team === 'red').length, blue: players.filter((p) => p.team === 'blue').length };
}

/** Why these players can't start a team game, or null if the split is fine. */
export function teamsProblem(players: Pick<Player, 'team'>[]): string | null {
  const counts = teamCounts(players);
  const small = TEAMS.find((t) => counts[t] < MIN_TEAM_SIZE);
  return small ? `${TEAM_NAMES[small]} needs at least ${MIN_TEAM_SIZE} players (it has ${counts[small]}).` : null;
}

/** Whether team mode applies: the setting is on, there are enough players and all have a team. */
export function teamsActive(state: Pick<GameState, 'players' | 'settings'>): boolean {
  return state.settings.teams && state.players.length >= MIN_TEAM_PLAYERS && state.players.every((p) => p.team !== undefined);
}

function withoutTeam(player: Player): Player {
  const copy = { ...player };
  delete copy.team;
  return copy;
}

/**
 * Gives every player a team (keeping a valid split the host chose, otherwise alternating), or
 * removes teams when team mode is off or there are too few players.
 */
export function resolveTeams(players: Player[], settings: GameSettings): Player[] {
  if (!settings.teams || players.length < MIN_TEAM_PLAYERS) return players.map((p) => withoutTeam(p));
  const chosen = players.every((p) => p.team !== undefined) && !teamsProblem(players);
  return players.map((p, i) => ({ ...p, team: chosen ? p.team : autoTeam(i) }));
}

/**
 * Indexes (into players) of who draws each round. Teams alternate Red, Blue, …, and every
 * player draws turnsEach times; with uneven teams the bigger one draws back to back at the end.
 */
export function drawerOrder(players: Player[], turnsEach: number): number[] {
  const roster = TEAMS.map((t) => players.flatMap((p, i) => (p.team === t ? [i] : [])));
  const left = roster.map((r) => r.length * turnsEach);
  const drawn = [0, 0];
  const order: number[] = [];
  for (let turn = 0; left[0] + left[1] > 0; turn++) {
    const team = left[turn % 2] > 0 ? turn % 2 : 1 - (turn % 2);
    order.push(roster[team][drawn[team]++ % roster[team].length]);
    left[team]--;
  }
  return order;
}

/** A team's points: each correct round scores 1 for the solver's team (own team or a steal). */
export function getTeamScores(state: Pick<GameState, 'players' | 'roundResults'>): Record<Team, number> {
  const scores: Record<Team, number> = { red: 0, blue: 0 };
  for (const r of state.roundResults) {
    const team = r.outcome === 'correct' ? state.players.find((p) => p.id === r.solvedBy)?.team : undefined;
    if (team) scores[team]++;
  }
  return scores;
}

/** True when this round was won by the team that was not drawing. */
export function isSteal(state: Pick<GameState, 'players'>, result: RoundResult): boolean {
  const drawerTeam = state.players.find((p) => p.id === result.drawerId)?.team;
  const solverTeam = state.players.find((p) => p.id === result.solvedBy)?.team;
  return result.outcome === 'correct' && !!drawerTeam && !!solverTeam && drawerTeam !== solverTeam;
}

function startRound(state: GameState, pokemon: PokemonData): GameState {
  const round = state.round + 1;
  return {
    ...state,
    phase: 'MEMORIZE',
    round,
    // Everyone draws in turn: player 1, player 2, … then around again. Team games alternate teams.
    currentDrawerIndex: teamsActive(state)
      ? (drawerOrder(state.players, state.settings.turnsEach)[round - 1] ?? 0)
      : (round - 1) % state.players.length,
    currentPokemon: pokemon,
    phaseEndsAt: null,
    outcome: null,
    awaitingSolver: false,
    chatMessages: [],
    usedPokemonIds: [...state.usedPokemonIds, pokemon.id],
  };
}

/**
 * Two players: only the guesser scores. Three or more: the guesser who got it and the
 * drawer both score.
 */
function award(state: GameState, solverId: string): Player[] {
  const drawerId = state.players[state.currentDrawerIndex]?.id;
  const party = isParty(state);
  return state.players.map((p) =>
    p.id === solverId || (party && p.id === drawerId) ? { ...p, score: p.score + 1 } : p,
  );
}

// Every transition checks the phase it starts from. That makes repeated taps, late timer ticks
// and duplicated network messages harmless: only the first one changes anything.
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startRound(
        {
          ...initialGameState,
          mode: action.mode,
          players: resolveTeams(action.players, action.settings).map((p) => ({ ...p, score: 0 })),
          settings: action.settings,
        },
        action.pokemon,
      );

    case 'BEGIN_MEMORIZE':
      if (state.phase !== 'MEMORIZE' || state.phaseEndsAt !== null) return state;
      return { ...state, phaseEndsAt: action.now + state.settings.memorizeSeconds * 1000 };

    case 'START_DRAWING':
      if (state.phase !== 'MEMORIZE') return state;
      return { ...state, phase: 'DRAWING', phaseEndsAt: action.now + state.settings.timerDuration * 1000 };

    case 'ADD_CHAT_MESSAGE':
      if (state.phase !== 'DRAWING') return state;
      return { ...state, chatMessages: [...state.chatMessages, action.message].slice(-50) };

    case 'END_ROUND': {
      if (state.phase !== 'DRAWING' || !state.currentPokemon) return state;
      const drawer = state.players[state.currentDrawerIndex];
      const correct = action.outcome === 'correct';
      // With a single guesser there's no one to choose between.
      const onlyGuesser = state.players.length === 2 ? state.players[guesserIndex(state)].id : null;
      const requested = action.solvedBy === undefined ? onlyGuesser : action.solvedBy;
      const validSolver = requested && requested !== drawer.id && state.players.some((p) => p.id === requested) ? requested : null;
      const solvedBy = correct ? (validSolver ?? onlyGuesser) : null;
      return {
        ...state,
        phase: 'REVEAL',
        phaseEndsAt: null,
        outcome: action.outcome,
        awaitingSolver: correct && solvedBy === null,
        players: correct && solvedBy ? award(state, solvedBy) : state.players,
        roundResults: [
          ...state.roundResults,
          { round: state.round, pokemon: state.currentPokemon, outcome: action.outcome, drawerId: drawer.id, solvedBy },
        ],
      };
    }

    case 'ASSIGN_SOLVER': {
      if (state.phase !== 'REVEAL' || !state.awaitingSolver) return state;
      const drawer = state.players[state.currentDrawerIndex];
      if (action.playerId === drawer.id || !state.players.some((p) => p.id === action.playerId)) return state;
      const results = state.roundResults.slice();
      results[results.length - 1] = { ...results[results.length - 1], solvedBy: action.playerId };
      return { ...state, awaitingSolver: false, players: award(state, action.playerId), roundResults: results };
    }

    case 'NEXT_ROUND':
      if (state.phase !== 'REVEAL' || state.awaitingSolver) return state;
      if (isGameFinished(state)) return { ...state, phase: 'GAME_OVER' };
      return startRound(state, action.pokemon);

    case 'REMATCH':
      if (state.phase !== 'GAME_OVER') return state;
      return startRound(
        {
          ...state,
          round: 0,
          players: state.players.map((p) => ({ ...p, score: 0 })),
          roundResults: [],
          usedPokemonIds: [],
        },
        action.pokemon,
      );

    case 'REPLACE':
      return action.state;

    case 'RESET':
      return initialGameState;

    default:
      return state;
  }
}

/** Two players race to the winning score; parties play until everyone has drawn equally. */
export function isGameFinished(state: GameState): boolean {
  if (isParty(state)) return state.round >= state.players.length * state.settings.turnsEach;
  return state.players.some((p) => p.score >= state.settings.winScore);
}

/** Everyone tied for the top score once the game is over (usually one player). */
export function getWinners(state: GameState): Player[] {
  if (!isGameFinished(state)) return [];
  if (teamsActive(state)) {
    // The highest team score wins; a tie is a shared win. Winners are the members of those teams.
    const scores = getTeamScores(state);
    const top = Math.max(scores.red, scores.blue);
    return state.players.filter((p) => p.team && scores[p.team] === top);
  }
  const top = Math.max(...state.players.map((p) => p.score));
  if (!isParty(state)) return state.players.filter((p) => p.score >= state.settings.winScore);
  return state.players.filter((p) => p.score === top);
}

export function guesserIndex(state: GameState): number {
  return state.currentDrawerIndex === 0 ? 1 : 0;
}

export function getDrawer(state: GameState): Player | null {
  return state.players[state.currentDrawerIndex] ?? null;
}

/** Everyone except the drawer. */
export function getGuessers(state: GameState): Player[] {
  const drawer = getDrawer(state);
  return state.players.filter((p) => p.id !== drawer?.id);
}

/** Correct guesses in a row by this player, counting only rounds they were guessing. */
export function guessStreak(state: GameState, playerId: string): number {
  let streak = 0;
  for (let i = state.roundResults.length - 1; i >= 0; i--) {
    const r = state.roundResults[i];
    if (r.drawerId === playerId) continue;
    if (r.solvedBy === playerId) streak++;
    else break;
  }
  return streak;
}

/** The winning team(s): both on a tie, none before the game is over. */
export function getWinningTeams(state: GameState): Team[] {
  if (!teamsActive(state) || !isGameFinished(state)) return [];
  const scores = getTeamScores(state);
  return TEAMS.filter((t) => scores[t] === Math.max(scores.red, scores.blue));
}

export function roundsInGame(state: GameState): number | null {
  return isParty(state) ? state.players.length * state.settings.turnsEach : null;
}
