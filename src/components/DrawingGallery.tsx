'use client';

import { useEffect, useRef } from 'react';
import type { Player, RoundResult } from '@/lib/game-state';
import { downloadUrl, safeFilename } from '@/lib/share';
import type { SavedDrawing } from './RevealPhase';

interface DrawingGalleryProps {
  roundResults: RoundResult[];
  players: Player[];
  drawings: Record<number, SavedDrawing>;
  onShare: (round: number) => void;
  onClose: () => void;
}

const OUTCOME_BADGE = {
  correct: { label: 'Guessed!', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-gray-200 text-gray-700' },
  timeout: { label: 'Missed', className: 'bg-red-100 text-red-800' },
} as const;

export default function DrawingGallery({ roundResults, players, drawings, onShare, onClose }: DrawingGalleryProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.nickname ?? 'Someone';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-title"
        className="bg-pokemon-cream rounded-2xl shadow-2xl border-4 border-pokemon-dark w-full max-w-2xl max-h-[85dvh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-pokemon-dark bg-gradient-to-r from-pokemon-red to-pokemon-red-dark rounded-t-xl">
          <h2 id="gallery-title" className="font-pixel text-xs text-white">
            Drawing Gallery
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {roundResults.length === 0 ? (
            <p className="text-center text-pokemon-gray py-8 font-body">No drawings yet!</p>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {roundResults.map((result) => {
                const drawing = drawings[result.round];
                const drawer = nameOf(result.drawerId);
                const badge = OUTCOME_BADGE[result.outcome];
                return (
                  <li key={result.round} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="aspect-square bg-white border-b border-gray-200">
                      {drawing ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local data URL
                        <img src={drawing.dataUrl} alt={`${drawer}'s drawing of ${result.pokemon.name}`} className="w-full h-full object-contain" draggable={false} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pokemon-gray text-xs font-body">No drawing</div>
                      )}
                    </div>
                    <div className="p-2 space-y-1 font-body">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-pokemon-dark truncate">{result.pokemon.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-600">by {drawer}</p>
                      {drawing && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => downloadUrl(drawing.dataUrl, `${safeFilename(result.pokemon.name, 'by', drawer)}.png`)}
                            className="flex-1 py-1 rounded-lg text-[10px] font-bold text-pokemon-blue bg-blue-50 hover:bg-blue-100 border border-pokemon-blue/20"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => onShare(result.round)}
                            className="flex-1 py-1 rounded-lg text-[10px] font-bold text-pokemon-red bg-red-50 hover:bg-red-100 border border-pokemon-red/20"
                          >
                            Share
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
