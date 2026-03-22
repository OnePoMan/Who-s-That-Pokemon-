'use client';

import { useState, useRef, useEffect } from 'react';

interface SettingsPanelProps {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onGoHome: () => void;
}

export default function SettingsPanel({ bgmEnabled, sfxEnabled, onToggleBgm, onToggleSfx, onGoHome }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
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
    <div ref={panelRef} className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-white shadow-lg border-2 border-pokemon-dark flex items-center justify-center hover:scale-110 transition-transform"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-12 left-0 bg-white rounded-lg shadow-xl border-2 border-pokemon-dark p-4 min-w-[200px] animate-fade-in">
          <h3 className="text-sm font-black text-pokemon-dark mb-3">Settings</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-gray-700">Music</span>
              <button
                onClick={onToggleBgm}
                className={`w-12 h-6 rounded-full transition-colors relative ${bgmEnabled ? 'bg-pokemon-blue' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${bgmEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-gray-700">Sound FX</span>
              <button
                onClick={onToggleSfx}
                className={`w-12 h-6 rounded-full transition-colors relative ${sfxEnabled ? 'bg-pokemon-blue' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sfxEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </label>

            <hr className="border-gray-200" />

            <button
              onClick={() => { setOpen(false); onGoHome(); }}
              className="w-full text-left text-sm font-bold text-pokemon-red hover:text-pokemon-red-dark transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
