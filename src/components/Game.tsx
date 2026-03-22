'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useSound } from '@/hooks/useSound';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import Lobby from './Lobby';
import RemoteLobby from './RemoteLobby';
import MemorizePhase from './MemorizePhase';
import DrawingPhase from './DrawingPhase';
import RevealPhase from './RevealPhase';
import GameOverScreen from './GameOverScreen';
import SettingsPanel from './SettingsPanel';
import { CanvasManager, DrawEvent } from '@/lib/canvas-utils';
import { Difficulty, TimerOption, Player, GameMode, ChatMessage } from '@/lib/game-state';

type ScreenState = 'lobby' | 'remote-lobby' | 'game';

export default function Game() {
  const game = useGameState();
  const sound = useSound();
  const peer = usePeerConnection();
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const screenRef = useRef<ScreenState>('lobby');
  const isHostRef = useRef(false);
  const bgmStartedRef = useRef(false);

  // Track screen state
  const screen = (() => {
    if (game.state.phase === 'LOBBY') {
      return screenRef.current;
    }
    return 'game';
  })();

  // Set up peer message handlers for remote mode
  useEffect(() => {
    peer.onMessage('draw-event', (payload) => {
      canvasManagerRef.current?.applyEvent(payload as DrawEvent);
    });

    peer.onMessage('chat', (payload) => {
      const msg = payload as ChatMessage;
      game.addChatMessage(msg);
    });

    peer.onMessage('game-action', (payload) => {
      const action = payload as { action: string; data?: unknown };
      switch (action.action) {
        case 'correct-guess':
          game.handleCorrectGuess();
          sound.play('correct');
          break;
      }
    });
  }, []);

  const handleRemoteSetup = useCallback(() => {
    screenRef.current = 'remote-lobby';
    game.setMode('remote');
  }, [game]);

  const handleLocalStart = useCallback(async (config: {
    mode: GameMode;
    players: [Player, Player];
    difficulty: Difficulty;
    timerDuration: TimerOption;
  }) => {
    screenRef.current = 'game';
    game.setMode(config.mode);
    game.setPlayers(config.players);
    game.setSettings(config.difficulty, config.timerDuration);
    sound.play('whoosh');

    // Start BGM on first game start (requires user interaction)
    if (!bgmStartedRef.current) {
      bgmStartedRef.current = true;
      sound.startBgm();
    }

    setTimeout(async () => {
      await game.startRound();
    }, 100);
  }, [game, sound]);

  const handleRemoteStart = useCallback(async (config: {
    players: [Player, Player];
    difficulty: Difficulty;
    timerDuration: TimerOption;
    isHost: boolean;
  }) => {
    screenRef.current = 'game';
    isHostRef.current = config.isHost;
    game.setPlayers(config.players);
    game.setSettings(config.difficulty, config.timerDuration);
    sound.play('whoosh');

    if (!bgmStartedRef.current) {
      bgmStartedRef.current = true;
      sound.startBgm();
    }

    if (config.isHost) {
      setTimeout(async () => {
        await game.startRound();
      }, 100);
    }
  }, [game, sound]);

  const handleDrawEvent = useCallback((event: DrawEvent) => {
    if (game.state.mode === 'remote') {
      peer.sendDrawEvent(event);
    }
  }, [game.state.mode, peer]);

  const handleGuess = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: game.guesser?.nickname || 'Player',
      text,
      timestamp: Date.now(),
    };

    const isCorrect = text.toLowerCase().trim() === game.state.currentPokemon?.name.toLowerCase().trim();
    if (isCorrect) {
      msg.isCorrect = true;
    }

    game.addChatMessage(msg);

    if (game.state.mode === 'remote') {
      peer.send('chat', msg);
    }

    if (isCorrect) {
      sound.play('correct');
    }
  }, [game, peer, sound]);

  const saveRoundResult = useCallback((guessedCorrectly: boolean) => {
    if (!game.state.currentPokemon || !game.drawer || !game.guesser) return;
    const drawingDataUrl = canvasManagerRef.current?.toDataURL() || '';
    game.addRoundResult({
      pokemon: game.state.currentPokemon,
      drawingDataUrl,
      guessedCorrectly,
      drawer: game.drawer,
      guesser: game.guesser,
      timeRemaining: game.state.timeRemaining,
    });
  }, [game]);

  const handleCorrectGuess = useCallback(() => {
    game.handleCorrectGuess();
    sound.play('correct');

    if (game.state.mode === 'remote') {
      peer.send('game-action', { action: 'correct-guess' });
    }

    saveRoundResult(true);

    setTimeout(() => {
      sound.play('reveal');
      game.showReveal();
    }, 1500);
  }, [game, sound, peer, saveRoundResult]);

  const handleSkip = useCallback(() => {
    sound.play('whoosh');
    saveRoundResult(false);

    setTimeout(() => {
      sound.play('reveal');
      game.showReveal();
    }, 500);
  }, [game, sound, saveRoundResult]);

  const handleTimeUp = useCallback(() => {
    sound.play('wrong');
    saveRoundResult(false);
    setTimeout(() => {
      sound.play('reveal');
      game.showReveal();
    }, 1000);
  }, [game, sound, saveRoundResult]);

  const handleNextRound = useCallback(async () => {
    const winner = game.winner;
    if (winner) {
      sound.play('gameOver');
      game.gameOver();
      return;
    }
    sound.play('whoosh');
    await game.nextRound();
  }, [game, sound]);

  const handlePlayAgain = useCallback(() => {
    screenRef.current = 'lobby';
    game.reset();
    sound.play('click');
  }, [game, sound]);

  const handleShare = useCallback(async () => {
    const text = `I played Who's That Pokemon - Draw & Guess Edition! 🎨\n${game.state.players[0]?.nickname}: ${game.state.players[0]?.score} | ${game.state.players[1]?.nickname}: ${game.state.players[1]?.score}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Who's That Pokemon?", text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }, [game.state.players]);

  const handleBackFromRemote = useCallback(() => {
    screenRef.current = 'lobby';
    peer.cleanup();
    game.reset();
  }, [peer, game]);

  const handleGoHome = useCallback(() => {
    screenRef.current = 'lobby';
    sound.stopBgm();
    bgmStartedRef.current = false;
    game.reset();
  }, [game, sound]);

  // Handle timer tick sound
  useEffect(() => {
    if (game.state.phase === 'DRAWING' && game.state.timeRemaining <= 5 && game.state.timeRemaining > 0) {
      sound.play('tick');
    }
  }, [game.state.timeRemaining, game.state.phase, sound]);

  return (
    <div className="flex flex-col flex-1">
      {/* Pokedex top bar */}
      <div className="pokedex-topbar">
        <span className="logo-text">WHO&apos;S THAT POKEMON?</span>
        <SettingsPanel
          bgmEnabled={sound.bgmEnabled}
          sfxEnabled={sound.sfxEnabled}
          onToggleBgm={sound.toggleBgm}
          onToggleSfx={sound.toggleSfx}
          onGoHome={handleGoHome}
          roundResults={game.state.roundResults}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 w-full">
        {/* LOBBY */}
        {screen === 'lobby' && game.state.phase === 'LOBBY' && (
          <Lobby onStart={handleLocalStart} onRemoteSetup={handleRemoteSetup} />
        )}

        {/* REMOTE LOBBY */}
        {screen === 'remote-lobby' && game.state.phase === 'LOBBY' && (
          <RemoteLobby
            onCreateOffer={peer.createOffer}
            onAcceptOffer={peer.acceptOffer}
            onAcceptAnswer={peer.acceptAnswer}
            connected={peer.connected}
            onStart={handleRemoteStart}
            onBack={handleBackFromRemote}
          />
        )}

        {/* MEMORIZE PHASE */}
        {game.state.phase === 'MEMORIZE' && game.state.currentPokemon && game.drawer && game.guesser && (
          <MemorizePhase
            pokemon={game.state.currentPokemon}
            drawer={game.drawer}
            guesser={game.guesser}
            isLocalMode={game.state.mode === 'local'}
            onReady={() => {
              sound.play('whoosh');
              game.startDrawing();
            }}
          />
        )}

        {/* DRAWING PHASE */}
        {game.state.phase === 'DRAWING' && game.state.currentPokemon && game.drawer && game.guesser && (
          <DrawingPhase
            drawer={game.drawer}
            guesser={game.guesser}
            pokemon={game.state.currentPokemon}
            timeRemaining={game.state.timeRemaining}
            timerDuration={game.state.timerDuration}
            chatMessages={game.state.chatMessages}
            isLocalMode={game.state.mode === 'local'}
            isDrawer={game.state.mode === 'remote' ? isHostRef.current === (game.state.currentDrawerIndex === 0) : true}
            onGuess={handleGuess}
            onCorrectGuess={handleCorrectGuess}
            onSkip={handleSkip}
            onTimeUp={handleTimeUp}
            onDrawEvent={handleDrawEvent}
            canvasManagerRef={canvasManagerRef}
          />
        )}

        {/* REVEAL PHASE */}
        {game.state.phase === 'REVEAL' && game.state.currentPokemon && game.drawer && game.guesser && (
          <RevealPhase
            pokemon={game.state.currentPokemon}
            guessedCorrectly={game.state.chatMessages.some((m) => m.isCorrect)}
            drawer={game.drawer}
            guesser={game.guesser}
            onNext={handleNextRound}
            nextLabel={game.winner ? 'See Results' : 'Next Round'}
            drawingDataUrl={game.state.roundResults[game.state.roundResults.length - 1]?.drawingDataUrl || ''}
          />
        )}

        {/* GAME OVER */}
        {game.state.phase === 'GAME_OVER' && game.winner && game.state.players.length === 2 && (
          <GameOverScreen
            winner={game.winner}
            players={game.state.players}
            roundResults={game.state.roundResults}
            onPlayAgain={handlePlayAgain}
            onShare={handleShare}
          />
        )}
      </main>

      {/* Footer inside pokedex */}
      <footer className="text-center py-1.5 text-[10px] font-body text-pokemon-gray border-t border-gray-200">
        Powered by Pok&eacute;API
      </footer>
    </div>
  );
}
