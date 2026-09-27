'use client';

import { REACTIONS, type Reaction } from '@/lib/net/protocol';

export interface FloatingReaction {
  id: string;
  emoji: Reaction;
  name: string;
}

/** Emoji that float up the screen for a couple of seconds. */
export default function Reactions({ items }: { items: FloatingReaction[] }) {
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[65] flex justify-center" aria-live="polite">
      {items.map((r, i) => (
        <div
          key={r.id}
          className="reaction-float absolute flex flex-col items-center"
          style={{ left: `${20 + ((i * 37) % 60)}%` }}
        >
          <span className="text-4xl drop-shadow" aria-hidden>
            {r.emoji}
          </span>
          {r.name && <span className="text-[10px] font-body font-bold bg-black/60 text-white rounded-full px-1.5">{r.name}</span>}
          <span className="sr-only">
            {r.name} reacted {r.emoji}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Quick reactions a guesser can send to the drawer and everyone else. */
export function ReactionBar({ onReact }: { onReact: (emoji: Reaction) => void }) {
  return (
    <div className="flex justify-center gap-1.5" role="group" aria-label="Send a reaction">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          className="w-9 h-9 rounded-full bg-surface border-2 border-line/20 text-lg hover:scale-110 active:scale-95 transition-transform"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
