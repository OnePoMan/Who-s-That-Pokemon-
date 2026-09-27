export type GamePhase = 'LOBBY' | 'MEMORIZE' | 'DRAWING' | 'REVEAL' | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TimerOption = 30 | 60 | 90;
export type MemorizeOption = 5 | 10 | 15;
export type WinScoreOption = 3 | 5 | 7;
export type GameMode = 'local' | 'remote';
export type RoundOutcome = 'correct' | 'skipped' | 'timeout';

export const TIMER_OPTIONS: readonly TimerOption[] = [30, 60, 90];
export const MEMORIZE_OPTIONS: readonly MemorizeOption[] = [5, 10, 15];
export const WIN_SCORE_OPTIONS: readonly WinScoreOption[] = [3, 5, 7];
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export interface Player {
  id: string;
  nickname: string;
  avatarId: number;
  score: number;
}

export interface PokemonData {
  id: number;
  name: string;
  artworkUrl: string;
}

export interface GameSettings {
  difficulty: Difficulty;
  timerDuration: TimerOption;
  memorizeSeconds: MemorizeOption;
  winScore: WinScoreOption;
  /** When false the drawer only sees the name while memorizing. */
  showArtwork: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'easy',
  timerDuration: 60,
  memorizeSeconds: 10,
  winScore: 3,
  showArtwork: true,
};

export interface RoundResult {
  round: number;
  pokemon: PokemonData;
  outcome: RoundOutcome;
  drawerId: string;
  guesserId: string;
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
  roundResults: [],
  chatMessages: [],
  usedPokemonIds: [],
};

export type GameAction =
  | { type: 'START_GAME'; mode: GameMode; players: Player[]; settings: GameSettings; pokemon: PokemonData }
  | { type: 'BEGIN_MEMORIZE'; now: number }
  | { type: 'START_DRAWING'; now: number }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'END_ROUND'; outcome: RoundOutcome }
  | { type: 'NEXT_ROUND'; pokemon: PokemonData }
  | { type: 'REMATCH'; pokemon: PokemonData }
  | { type: 'REPLACE'; state: GameState }
  | { type: 'RESET' };

function startRound(state: GameState, pokemon: PokemonData, drawerIndex: number): GameState {
  return {
    ...state,
    phase: 'MEMORIZE',
    round: state.round + 1,
    currentDrawerIndex: drawerIndex,
    currentPokemon: pokemon,
    phaseEndsAt: null,
    outcome: null,
    chatMessages: [],
    usedPokemonIds: [...state.usedPokemonIds, pokemon.id],
  };
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
          players: action.players.map((p) => ({ ...p, score: 0 })),
          settings: action.settings,
        },
        action.pokemon,
        0,
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
      const guesser = state.players[guesserIndex(state)];
      const players =
        action.outcome === 'correct'
          ? state.players.map((p) => (p.id === guesser.id ? { ...p, score: p.score + 1 } : p))
          : state.players;
      return {
        ...state,
        phase: 'REVEAL',
        phaseEndsAt: null,
        outcome: action.outcome,
        players,
        roundResults: [
          ...state.roundResults,
          {
            round: state.round,
            pokemon: state.currentPokemon,
            outcome: action.outcome,
            drawerId: drawer.id,
            guesserId: guesser.id,
          },
        ],
      };
    }

    case 'NEXT_ROUND':
      if (state.phase !== 'REVEAL') return state;
      if (getWinner(state)) return { ...state, phase: 'GAME_OVER' };
      // Roles alternate every round, whatever the outcome.
      return startRound(state, action.pokemon, guesserIndex(state));

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
        0,
      );

    case 'REPLACE':
      return action.state;

    case 'RESET':
      return initialGameState;

    default:
      return state;
  }
}

export function guesserIndex(state: GameState): number {
  return state.currentDrawerIndex === 0 ? 1 : 0;
}

export function getDrawer(state: GameState): Player | null {
  return state.players[state.currentDrawerIndex] ?? null;
}

export function getGuesser(state: GameState): Player | null {
  return state.players[guesserIndex(state)] ?? null;
}

export function getWinner(state: GameState): Player | null {
  return state.players.find((p) => p.score >= state.settings.winScore) ?? null;
}
