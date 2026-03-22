'use client';

import { useState, useRef, useEffect } from 'react';
import { RoundResult } from '@/lib/game-state';
import DrawingGallery from './DrawingGallery';

interface SettingsPanelProps {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onGoHome: () => void;
  roundResults: RoundResult[];
}

export default function SettingsPanel({ bgmEnabled, sfxEnabled, onToggleBgm, onToggleSfx, onGoHome, roundResults }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <>
      <div ref={panelRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        {open && (
          <div className="absolute top-10 right-0 bg-white rounded-xl shadow-xl border-3 border-pokemon-dark p-4 min-w-[200px] animate-fade-in z-50">
            <h3 className="text-sm font-bold text-pokemon-dark font-body mb-3">Settings</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-gray-700 font-body">Music</span>
                <button
                  onClick={onToggleBgm}
                  className={`w-12 h-6 rounded-full transition-colors relative ${bgmEnabled ? 'bg-pokemon-blue' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${bgmEnabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-gray-700 font-body">Sound FX</span>
                <button
                  onClick={onToggleSfx}
                  className={`w-12 h-6 rounded-full transition-colors relative ${sfxEnabled ? 'bg-pokemon-blue' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sfxEnabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </label>

              {roundResults.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <button
                    onClick={() => { setOpen(false); setShowGallery(true); }}
                    className="w-full text-left text-sm font-semibold text-pokemon-blue hover:opacity-80 transition-opacity font-body"
                  >
                    Drawing Gallery ({roundResults.length})
                  </button>
                </>
              )}

              <hr className="border-gray-200" />

              <button
                onClick={() => { setOpen(false); onGoHome(); }}
                className="w-full text-left text-sm font-semibold text-pokemon-red hover:opacity-80 transition-opacity font-body"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {showGallery && (
        <DrawingGallery roundResults={roundResults} onClose={() => setShowGallery(false)} />
      )}
    </>
  );
}
