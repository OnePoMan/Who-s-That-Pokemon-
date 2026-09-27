'use client';

import { useEffect, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import ChatPanel from './ChatPanel';
import GuessInput from './GuessInput';
import Timer from './Timer';
import { AvatarIcon } from './AvatarPicker';
import type { ChatMessage, Player } from '@/lib/game-state';
import type { CanvasManager, DrawEvent } from '@/lib/canvas-engine';

interface DrawingPhaseProps {
  /** 'local': one phone, guesser watches over the drawer's shoulder. */
  view: 'local' | 'drawer' | 'guesser';
  drawer: Player;
  guesser: Player;
  remainingMs: number;
  totalMs: number;
  chatMessages: ChatMessage[];
  canvasManagerRef: React.MutableRefObject<CanvasManager | null>;
  onDrawEvent?: (event: DrawEvent) => void;
  onCorrect: () => void;
  onSkip: () => void;
  onGuess: (text: string) => void;
  onCanvasReady?: (manager: CanvasManager) => void;
}

export default function DrawingPhase({
  view,
  drawer,
  guesser,
  remainingMs,
  totalMs,
  chatMessages,
  canvasManagerRef,
  onDrawEvent,
  onCorrect,
  onSkip,
  onGuess,
  onCanvasReady,
}: DrawingPhaseProps) {
  const [showLookBanner, setShowLookBanner] = useState(view === 'local');
  // Disables the buttons after the first tap; the game state also ignores repeats.
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!showLookBanner) return;
    const id = setTimeout(() => setShowLookBanner(false), 3500);
    return () => clearTimeout(id);
  }, [showLookBanner]);

  const end = (fn: () => void) => () => {
    if (ended) return;
    setEnded(true);
    fn();
  };

  const header = (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-2 shrink-0">
        <AvatarIcon avatarId={drawer.avatarId} size="sm" />
        <span className="text-xs font-bold text-pokemon-dark font-body">
          {view === 'drawer' ? 'You are drawing' : `${drawer.nickname} is drawing`}
        </span>
      </div>
      <Timer remainingMs={remainingMs} totalMs={totalMs} />
    </div>
  );

  const resultButtons = (correctLabel: string, skipLabel: string) => (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={end(onCorrect)}
        disabled={ended}
        className="flex-1 py-3 rounded-xl text-lg font-bold font-body text-white bg-gradient-to-b from-green-500 to-green-600 border-2 border-b-4 border-green-700 hover:from-green-400 hover:to-green-500 active:scale-95 active:border-b-2 active:translate-y-[2px] transition-all shadow-md disabled:opacity-50"
      >
        {correctLabel}
      </button>
      <button
        type="button"
        onClick={end(onSkip)}
        disabled={ended}
        className="flex-1 py-3 rounded-xl text-lg font-bold font-body text-white bg-gradient-to-b from-gray-400 to-gray-500 border-2 border-b-4 border-gray-600 hover:from-gray-300 hover:to-gray-400 active:scale-95 active:border-b-2 active:translate-y-[2px] transition-all shadow-md disabled:opacity-50"
      >
        {skipLabel}
      </button>
    </div>
  );

  if (view === 'local') {
    return (
      <div className="flex flex-col gap-2 w-full animate-fade-in">
        {header}
        {showLookBanner && (
          <div role="status" className="flash-green bg-green-600 rounded-xl px-3 py-2 text-center text-white font-body font-bold text-sm">
            {guesser.nickname}, you can look now! Shout out your guesses.
          </div>
        )}
        <DrawingCanvas canvasManagerRef={canvasManagerRef} onDrawEvent={onDrawEvent} reservedHeight={400} />
        {resultButtons(`${guesser.nickname} got it!`, 'Skip')}
      </div>
    );
  }

  if (view === 'drawer') {
    return (
      <div className="flex flex-col gap-2 w-full animate-fade-in">
        {header}
        <DrawingCanvas canvasManagerRef={canvasManagerRef} onDrawEvent={onDrawEvent} reservedHeight={500} />
        <ChatPanel messages={chatMessages} title={`${guesser.nickname}'s guesses`} />
        {resultButtons('They got it!', 'Give up')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full animate-fade-in">
      {header}
      <DrawingCanvas readOnly canvasManagerRef={canvasManagerRef} onReady={onCanvasReady} reservedHeight={330} label={`${drawer.nickname}'s drawing`} />
      <ChatPanel messages={chatMessages} title="Your guesses" />
      <GuessInput onGuess={onGuess} />
    </div>
  );
}
