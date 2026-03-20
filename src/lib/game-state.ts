export type GamePhase =
  | 'LOBBY'
  | 'MEMORIZE'
  | 'DRAWING'
  | 'REVEAL'
  | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TimerOption = 30 | 60 | 90;
export type GameMode = 'local' | 'remote';

export interface Player {
  id: string;
  nickname: string;
  avatarId: number;
  score: number;
}

export interface PokemonData {
  id: number;
  name: string;
  spriteUrl: string;
  artworkUrl: string;
}

export interface RoundResult {
  pokemon: PokemonData;
  drawingDataUrl: string;
  guessedCorrectly: boolean;
  drawer: Player;
  guesser: Player;
  timeRemaining: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isCorrect?: boolean;
}

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  players: [Player, Player] | [];
  currentDrawerIndex: number;
  currentPokemon: PokemonData | null;
  difficulty: Difficulty;
  timerDuration: TimerOption;
  timeRemaining: number;
  roundResults: RoundResult[];
  chatMessages: ChatMessage[];
  winScore: number;
}

export const initialGameState: GameState = {
  mode: 'local',
  phase: 'LOBBY',
  players: [],
  currentDrawerIndex: 0,
  currentPokemon: null,
  difficulty: 'easy',
  timerDuration: 60,
  timeRemaining: 60,
  roundResults: [],
  chatMessages: [],
  winScore: 3,
};

export type GameAction =
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_PLAYERS'; players: [Player, Player] }
  | { type: 'SET_SETTINGS'; difficulty: Difficulty; timerDuration: TimerOption }
  | { type: 'START_MEMORIZE'; pokemon: PokemonData }
  | { type: 'START_DRAWING' }
  | { type: 'TICK' }
  | { type: 'CORRECT_GUESS' }
  | { type: 'TIME_UP' }
  | { type: 'ADD_ROUND_RESULT'; result: RoundResult }
  | { type: 'SHOW_REVEAL' }
  | { type: 'NEXT_ROUND'; pokemon: PokemonData }
  | { type: 'GAME_OVER' }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'RESET' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_PLAYERS':
      return { ...state, players: action.players };

    case 'SET_SETTINGS':
      return {
        ...state,
        difficulty: action.difficulty,
        timerDuration: action.timerDuration,
        timeRemaining: action.timerDuration,
      };

    case 'START_MEMORIZE':
      return {
        ...state,
        phase: 'MEMORIZE',
        currentPokemon: action.pokemon,
        timeRemaining: state.timerDuration,
        chatMessages: [],
      };

    case 'START_DRAWING':
      return { ...state, phase: 'DRAWING' };

    case 'TICK':
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1),
      };

    case 'CORRECT_GUESS': {
      if (state.players.length < 2) return state;
      const guesserIndex = state.currentDrawerIndex === 0 ? 1 : 0;
      const newPlayers = [...state.players] as [Player, Player];
      newPlayers[guesserIndex] = {
        ...newPlayers[guesserIndex],
        score: newPlayers[guesserIndex].score + 1,
      };
      return { ...state, players: newPlayers };
    }

    case 'SHOW_REVEAL':
      return { ...state, phase: 'REVEAL' };

    case 'ADD_ROUND_RESULT':
      return {
        ...state,
        roundResults: [...state.roundResults, action.result],
      };

    case 'NEXT_ROUND':
      return {
        ...state,
        phase: 'MEMORIZE',
        currentDrawerIndex: state.currentDrawerIndex === 0 ? 1 : 0,
        currentPokemon: action.pokemon,
        timeRemaining: state.timerDuration,
        chatMessages: [],
      };

    case 'GAME_OVER':
      return { ...state, phase: 'GAME_OVER' };

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message],
      };

    case 'RESET':
      return { ...initialGameState };

    default:
      return state;
  }
}

export function getDrawer(state: GameState): Player | null {
  if (state.players.length < 2) return null;
  return state.players[state.currentDrawerIndex] ?? null;
}

export function getGuesser(state: GameState): Player | null {
  if (state.players.length < 2) return null;
  return state.players[state.currentDrawerIndex === 0 ? 1 : 0] ?? null;
}

export function checkWinCondition(state: GameState): Player | null {
  if (state.players.length < 2) return null;
  for (const player of state.players) {
    if (player.score >= state.winScore) return player;
  }
  return null;
}
