'use client';

import { useEffect, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import ChatPanel from './ChatPanel';
import GuessInput from './GuessInput';
import HintBar from './HintBar';
import Timer from './Timer';
import { AvatarIcon } from './AvatarPicker';
import type { ChatMessage, Player } from '@/lib/game-state';
import type { CanvasManager, DrawEvent } from '@/lib/canvas-engine';
import type { Hint } from '@/lib/hints';

interface DrawingPhaseProps {
  /** 'local': one phone, guessers watch over the drawer's shoulder. */
  view: 'local' | 'drawer' | 'guesser';
  drawer: Player;
  guessers: Player[];
  /** The drawer's own phone only: the Pokémon, as a reminder while drawing. */
  pokemonName?: string | null;
  remainingMs: number;
  totalMs: number;
  chatMessages: ChatMessage[];
  hint: Hint | null;
  canvasManagerRef: React.MutableRefObject<CanvasManager | null>;
  onDrawEvent?: (event: DrawEvent) => void;
  onCorrect: () => void;
  onSkip: () => void;
  onGuess: (text: string) => void;
  onCanvasReady?: (manager: CanvasManager) => void;
  /** Extra controls under the guess box (e.g. reactions). */
  extra?: React.ReactNode;
}

export default function DrawingPhase({
  view,
  drawer,
  guessers,
  pokemonName = null,
  remainingMs,
  totalMs,
  chatMessages,
  hint,
  canvasManagerRef,
  onDrawEvent,
  onCorrect,
  onSkip,
  onGuess,
  onCanvasReady,
  extra,
}: DrawingPhaseProps) {
  const [showLookBanner, setShowLookBanner] = useState(view === 'local');
  // Disables the buttons after the first tap; the game state also ignores repeats.
  const [ended, setEnded] = useState(false);
  const soloGuesser = guessers.length === 1 ? guessers[0] : null;

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

  const header =
    view === 'drawer' && pokemonName ? (
      // A reminder on the drawer's own phone only; on a shared phone the guessers would see it.
      <div className="flex items-center gap-3 w-full">
        <p className="flex-1 min-w-0 font-body leading-tight">
          <span className="block whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-ink-muted">You&apos;re drawing</span>
          <span className="block text-sm font-bold text-accent break-words">{pokemonName}</span>
        </p>
        <div className="w-[42%] shrink-0">
          <Timer remainingMs={remainingMs} totalMs={totalMs} />
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center gap-2 shrink-0">
          <AvatarIcon avatarId={drawer.avatarId} size="sm" />
          <span className="text-xs font-bold text-ink font-body">{view === 'drawer' ? 'You are drawing' : `${drawer.nickname} is drawing`}</span>
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
        className="flex-1 py-2.5 rounded-xl text-base font-bold font-body text-white bg-gradient-to-b from-green-500 to-green-600 border-2 border-b-4 border-green-700 hover:from-green-400 hover:to-green-500 active:scale-95 active:border-b-2 active:translate-y-[2px] transition-all shadow-md disabled:opacity-50"
      >
        {correctLabel}
      </button>
      <button
        type="button"
        onClick={end(onSkip)}
        disabled={ended}
        className="flex-1 py-2.5 rounded-xl text-base font-bold font-body text-white bg-gradient-to-b from-gray-400 to-gray-500 border-2 border-b-4 border-gray-600 hover:from-gray-300 hover:to-gray-400 active:scale-95 active:border-b-2 active:translate-y-[2px] transition-all shadow-md disabled:opacity-50"
      >
        {skipLabel}
      </button>
    </div>
  );

  if (view === 'local') {
    const misses = chatMessages.filter((m) => !m.isCorrect).map((m) => m.text);
    return (
      <div data-fit-root className="flex flex-col gap-2 w-full animate-fade-in">
        {header}
        {hint && <HintBar hint={hint} />}
        <div className="relative">
          {showLookBanner && (
            // Floats over the canvas so the layout doesn't jump when it disappears.
            <div
              role="status"
              className="flash-green bg-green-600 absolute top-2 inset-x-2 z-10 rounded-xl px-3 py-2 text-center text-white font-body font-bold text-sm shadow-lg pointer-events-none"
            >
              {soloGuesser ? `${soloGuesser.nickname}, you can look now!` : 'Everyone can look now!'} Guess out loud or type below.
            </div>
          )}
          <DrawingCanvas canvasManagerRef={canvasManagerRef} onDrawEvent={onDrawEvent} />
        </div>
        {misses.length > 0 && (
          <p className="text-xs font-body text-ink-muted text-center truncate" aria-live="polite">
            Not it: {misses.slice(-4).join(', ')}
          </p>
        )}
        <GuessInput onGuess={onGuess} disabled={ended} placeholder="Guesser: type a Pokémon…" />
        {resultButtons(soloGuesser ? `${soloGuesser.nickname} got it!` : 'Someone got it!', 'Skip')}
      </div>
    );
  }

  if (view === 'drawer') {
    return (
      <div data-fit-root className="flex flex-col gap-2 w-full animate-fade-in">
        {header}
        <DrawingCanvas canvasManagerRef={canvasManagerRef} onDrawEvent={onDrawEvent} onReady={onCanvasReady} />
        <ChatPanel messages={chatMessages} title="Guesses" />
        {resultButtons(soloGuesser ? 'They got it!' : 'Someone got it!', 'Give up')}
      </div>
    );
  }

  return (
    <div data-fit-root className="flex flex-col gap-2 w-full animate-fade-in">
      {header}
      {hint && <HintBar hint={hint} />}
      <DrawingCanvas
        readOnly
        canvasManagerRef={canvasManagerRef}
        onReady={onCanvasReady}
       
        label={`${drawer.nickname}'s drawing`}
      />
      <ChatPanel messages={chatMessages} title="Guesses" />
      <GuessInput onGuess={onGuess} />
      {extra}
    </div>
  );
}
