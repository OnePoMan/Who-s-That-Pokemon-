'use client';

import type { Hint } from '@/lib/hints';
import TypeBadge from './TypeBadge';

/** Letter blanks plus whatever clues have unlocked so far. */
export default function HintBar({ hint }: { hint: Hint }) {
  const letters = hint.blanks.filter((c) => c !== ' ').length;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-surface border-2 border-line px-3 py-1.5" aria-live="polite">
      <span className="font-pixel text-[11px] tracking-[0.25em] text-ink" aria-label={`Hint: ${letters} letters`}>
        {hint.blanks.map((c) => (c === ' ' ? ' ' : c)).join('')}
      </span>
      {hint.types && (
        <span className="flex gap-1">
          {hint.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </span>
      )}
      {hint.generation && (
        <span className="text-[11px] font-body font-bold text-ink-muted">
          Gen {hint.generation}
          {hint.region ? ` · ${hint.region}` : ''}
        </span>
      )}
    </div>
  );
}
