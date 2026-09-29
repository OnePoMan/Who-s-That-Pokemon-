'use client';

import { useEffect, useRef, useState } from 'react';
import PokeBallButton from './PokeBallButton';
import { shareInvite } from '@/lib/share';

/**
 * The room code, always in the top bar during a room game, so a player who drops out can be
 * given it again. Tapping it shows the code large with an invite to share.
 */
export default function RoomBadge({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const share = async () => {
    if ((await shareInvite(code)) !== 'copied') return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Room code ${code.split('').join(' ')}. Show invite`}
        className="flex items-center gap-1.5 rounded-full bg-black/25 hover:bg-black/35 px-2.5 py-1 text-white"
      >
        <span className="text-[9px] font-body font-bold uppercase tracking-wider opacity-80">Room</span>
        <span className="font-pixel text-[11px] tracking-[0.15em]">{code}</span>
      </button>
      {open && (
        <div className="absolute top-10 right-0 z-50 w-64 rounded-xl border-3 border-line bg-surface p-4 shadow-xl animate-fade-in font-body text-center space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Room code</p>
          <p className="font-pixel text-xl tracking-[0.25em] text-accent select-all">{code}</p>
          <p className="text-xs text-ink">
            Dropped out? Join again with this code and the <b>same name</b> — your seat and score are kept.
          </p>
          <PokeBallButton onClick={() => void share()} variant="blue" size="sm" className="w-full">
            {copied ? 'Invite copied!' : 'Share invite'}
          </PokeBallButton>
        </div>
      )}
    </div>
  );
}
