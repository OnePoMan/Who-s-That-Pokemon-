'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import DrawingCanvas from './DrawingCanvas';
import ChatPanel from './ChatPanel';
import Timer from './Timer';
import { AvatarIcon } from './AvatarPicker';
import PokeBallButton from './PokeBallButton';
import { Player, PokemonData, ChatMessage } from '@/lib/game-state';
import { CanvasManager, DrawEvent } from '@/lib/canvas-utils';

interface DrawingPhaseProps {
  drawer: Player;
  guesser: Player;
  pokemon: PokemonData;
  timeRemaining: number;
  timerDuration: number;
  chatMessages: ChatMessage[];
  isLocalMode: boolean;
  isDrawer: boolean;
  onGuess: (text: string) => void;
  onCorrectGuess: () => void;
  onTimeUp: () => void;
  onDrawEvent?: (event: DrawEvent) => void;
  canvasManagerRef?: React.MutableRefObject<CanvasManager | null>;
}

export default function DrawingPhase({
  drawer,
  guesser,
  pokemon,
  timeRemaining,
  timerDuration,
  chatMessages,
  isLocalMode,
  isDrawer,
  onGuess,
  onCorrectGuess,
  onTimeUp,
  onDrawEvent,
  canvasManagerRef,
}: DrawingPhaseProps) {
  const [localStep, setLocalStep] = useState<'drawing' | 'guessing'>('drawing');
  const [passedDevice, setPassedDevice] = useState(false);
  const internalCanvasRef = useRef<CanvasManager | null>(null);
  const effectiveCanvasRef = canvasManagerRef || internalCanvasRef;
  const hasTimedUp = useRef(false);

  useEffect(() => {
    if (timeRemaining === 0 && !hasTimedUp.current) {
      hasTimedUp.current = true;
      onTimeUp();
    }
  }, [timeRemaining, onTimeUp]);

  const handleLocalGuess = useCallback((text: string) => {
    onGuess(text);
    // Check if guess matches pokemon name (case-insensitive)
    if (text.toLowerCase().trim() === pokemon.name.toLowerCase().trim()) {
      onCorrectGuess();
    }
  }, [onGuess, onCorrectGuess, pokemon.name]);

  const handlePassToGuesser = useCallback(() => {
    setLocalStep('guessing');
    setPassedDevice(false);
  }, []);

  // LOCAL MODE: Drawer draws, then passes device to guesser
  if (isLocalMode) {
    if (localStep === 'drawing') {
      return (
        <div className="flex flex-col gap-3 w-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AvatarIcon avatarId={drawer.avatarId} size="sm" />
              <span className="text-sm font-bold text-pokemon-dark">{drawer.nickname} is drawing</span>
            </div>
            <div className="text-right">
              <Timer timeRemaining={timeRemaining} totalTime={timerDuration} />
            </div>
          </div>

          <DrawingCanvas onDrawEvent={onDrawEvent} canvasManagerRef={effectiveCanvasRef} />

          <PokeBallButton onClick={handlePassToGuesser} variant="blue" size="md" className="w-full">
            Done! Pass to {guesser.nickname}
          </PokeBallButton>
        </div>
      );
    }

    // Guessing step
    if (!passedDevice) {
      return (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <AvatarIcon avatarId={guesser.avatarId} size="lg" />
            <div>
              <p className="text-lg font-bold text-pokemon-dark">{guesser.nickname}&apos;s turn to guess!</p>
              <p className="text-sm text-pokemon-gray">Pass the device to {guesser.nickname}</p>
            </div>
          </div>
          <PokeBallButton onClick={() => setPassedDevice(true)} variant="red" size="lg">
            I&apos;m {guesser.nickname} - Let me guess!
          </PokeBallButton>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 w-full animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarIcon avatarId={guesser.avatarId} size="sm" />
            <span className="text-sm font-bold text-pokemon-dark">{guesser.nickname} is guessing</span>
          </div>
          <Timer timeRemaining={timeRemaining} totalTime={timerDuration} />
        </div>

        <DrawingCanvas readOnly canvasManagerRef={effectiveCanvasRef} />
        <ChatPanel messages={chatMessages} onSend={handleLocalGuess} placeholder="Type the Pokemon name..." />
      </div>
    );
  }

  // REMOTE MODE
  if (isDrawer) {
    return (
      <div className="flex flex-col gap-3 w-full animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarIcon avatarId={drawer.avatarId} size="sm" />
            <span className="text-sm font-bold text-pokemon-dark">You are drawing!</span>
          </div>
          <Timer timeRemaining={timeRemaining} totalTime={timerDuration} />
        </div>

        <DrawingCanvas onDrawEvent={onDrawEvent} canvasManagerRef={effectiveCanvasRef} />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-sm text-blue-800">
            <span className="font-bold">{guesser.nickname}</span> is watching and guessing...
          </p>
        </div>

        <ChatPanel messages={chatMessages} onSend={() => {}} disabled placeholder="You're drawing! Can't guess." />
      </div>
    );
  }

  // Remote guesser view
  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AvatarIcon avatarId={drawer.avatarId} size="sm" />
          <span className="text-sm font-bold text-pokemon-dark">{drawer.nickname} is drawing</span>
        </div>
        <Timer timeRemaining={timeRemaining} totalTime={timerDuration} />
      </div>

      <DrawingCanvas readOnly canvasManagerRef={effectiveCanvasRef} />
      <ChatPanel messages={chatMessages} onSend={handleLocalGuess} placeholder="Type the Pokemon name..." />
    </div>
  );
}
