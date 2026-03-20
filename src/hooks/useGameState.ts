'use client';

import { useReducer, useCallback, useRef, useEffect } from 'react';
import {
  GameState,
  GameAction,
  gameReducer,
  initialGameState,
  Difficulty,
  TimerOption,
  GameMode,
  Player,
  PokemonData,
  RoundResult,
  ChatMessage,
  getDrawer,
  getGuesser,
  checkWinCondition,
} from '@/lib/game-state';
import { getRandomPokemon } from '@/lib/pokemon';

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedPokemonIds = useRef<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const setMode = useCallback((mode: GameMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const setPlayers = useCallback((players: [Player, Player]) => {
    dispatch({ type: 'SET_PLAYERS', players });
  }, []);

  const setSettings = useCallback((difficulty: Difficulty, timerDuration: TimerOption) => {
    dispatch({ type: 'SET_SETTINGS', difficulty, timerDuration });
  }, []);

  const startRound = useCallback(async () => {
    const pokemon = await getRandomPokemon(state.difficulty, usedPokemonIds.current);
    usedPokemonIds.current.push(pokemon.id);
    dispatch({ type: 'START_MEMORIZE', pokemon });
  }, [state.difficulty]);

  const startDrawing = useCallback(() => {
    dispatch({ type: 'START_DRAWING' });
    clearTimer();
    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);
  }, [clearTimer]);

  const handleCorrectGuess = useCallback(() => {
    clearTimer();
    dispatch({ type: 'CORRECT_GUESS' });
  }, [clearTimer]);

  const showReveal = useCallback(() => {
    clearTimer();
    dispatch({ type: 'SHOW_REVEAL' });
  }, [clearTimer]);

  const addRoundResult = useCallback((result: RoundResult) => {
    dispatch({ type: 'ADD_ROUND_RESULT', result });
  }, []);

  const nextRound = useCallback(async () => {
    const pokemon = await getRandomPokemon(state.difficulty, usedPokemonIds.current);
    usedPokemonIds.current.push(pokemon.id);
    dispatch({ type: 'NEXT_ROUND', pokemon });
  }, [state.difficulty]);

  const gameOver = useCallback(() => {
    clearTimer();
    dispatch({ type: 'GAME_OVER' });
  }, [clearTimer]);

  const addChatMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_CHAT_MESSAGE', message });
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    usedPokemonIds.current = [];
    dispatch({ type: 'RESET' });
  }, [clearTimer]);

  return {
    state,
    dispatch,
    setMode,
    setPlayers,
    setSettings,
    startRound,
    startDrawing,
    handleCorrectGuess,
    showReveal,
    addRoundResult,
    nextRound,
    gameOver,
    addChatMessage,
    reset,
    drawer: getDrawer(state),
    guesser: getGuesser(state),
    winner: checkWinCondition(state),
  };
}
