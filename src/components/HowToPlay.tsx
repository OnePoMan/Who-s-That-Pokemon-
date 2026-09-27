'use client';

import { useEffect, useRef, useState } from 'react';
import PokeBallButton from './PokeBallButton';

const SEEN_KEY = 'wtp-guide-seen';

const PAGES: { icon: string; title: string; body: React.ReactNode }[] = [
  {
    icon: '🎨',
    title: 'Draw it from memory',
    body: (
      <>
        The drawer gets a few seconds to memorize a Pokémon, then draws it <b>without looking</b>. Shapes, fill, colours and zoom are in the toolbar.
      </>
    ),
  },
  {
    icon: '🤔',
    title: 'Guess who it is',
    body: (
      <>
        Everyone else guesses — out loud, or by typing. Pick the name from the list that appears so spelling never costs you. Letter blanks, then type and
        generation, then the first letter show up as the clock runs down.
      </>
    ),
  },
  {
    icon: '🏆',
    title: 'Score points',
    body: (
      <>
        <b>2 players:</b> a correct guess scores a point; first to the target wins.
        <br />
        <b>3 or more:</b> the first to guess <i>and</i> the drawer both score. Everyone draws the same number of times and the highest score wins.
      </>
    ),
  },
  {
    icon: '📱',
    title: 'Ways to play',
    body: (
      <>
        <b>One phone:</b> pass it around — the others look away while the drawer memorizes.
        <br />
        <b>Several phones:</b> share a room code; the drawing appears live on every phone.
        <br />
        <b>TV:</b> open the site on a big screen and choose <i>Watch on this screen</i>.
      </>
    ),
  },
  {
    icon: '📅',
    title: 'Playing on your own',
    body: (
      <>
        Try the <b>daily challenge</b> (the same Pokémon for everyone, once a day), draw at your own pace in <b>solo practice</b>, and fill your{' '}
        <b>Pokédex</b> and badge collection with every drawing.
      </>
    ),
  },
];

export function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // no storage: don't show it on every visit
  }
}

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const last = page === PAGES.length - 1;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Not remembered; it just shows again next time.
    }
    onClose();
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'ArrowRight') setPage((p) => Math.min(PAGES.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { icon, title, body } = PAGES[page];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="relative w-full max-w-sm bg-screen rounded-2xl border-4 border-line shadow-2xl p-5 space-y-4 outline-none"
      >
        <button type="button" onClick={close} className="absolute top-3 right-3 text-xs font-body font-bold text-ink-muted underline">
          Skip
        </button>
        <p className="text-center text-[10px] font-body font-bold uppercase tracking-widest text-ink-muted">How to play</p>
        <div key={page} className="text-center space-y-3 animate-fade-in min-h-[13rem]">
          <p className="text-5xl" aria-hidden>
            {icon}
          </p>
          <h2 id="guide-title" className="font-pixel text-xs text-ink leading-relaxed">
            {title}
          </h2>
          <p className="font-body text-sm text-ink leading-relaxed">{body}</p>
        </div>
        <div className="flex justify-center gap-1.5" aria-label={`Page ${page + 1} of ${PAGES.length}`} role="group">
          {PAGES.map((p, i) => (
            <button
              key={p.title}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}: ${p.title}`}
              aria-current={i === page ? 'step' : undefined}
              className={`h-2 rounded-full transition-all ${i === page ? 'w-6 bg-pokemon-red' : 'w-2 bg-line/40'}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <PokeBallButton onClick={() => setPage(page - 1)} variant="gray" size="sm" className="flex-1" disabled={page === 0}>
            Back
          </PokeBallButton>
          <PokeBallButton onClick={last ? close : () => setPage(page + 1)} variant="red" size="sm" className="flex-1">
            {last ? "Let's go!" : 'Next'}
          </PokeBallButton>
        </div>
      </div>
    </div>
  );
}
