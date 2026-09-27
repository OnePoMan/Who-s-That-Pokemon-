'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Prefs } from '@/lib/prefs';

interface SettingsPanelProps {
  prefs: Prefs;
  onChangePrefs: (patch: Partial<Prefs>) => void;
  drawingCount: number;
  onOpenGallery: () => void;
  onGoHome: () => void;
  showHome: boolean;
}

export default function SettingsPanel({ prefs, onChangePrefs, drawingCount, onOpenGallery, onGoHome, showHome }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Settings"
        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-11 right-0 bg-white rounded-xl shadow-xl border-3 border-pokemon-dark p-4 w-64 animate-fade-in z-50 font-body"
        >
          <h3 className="text-sm font-bold text-pokemon-dark mb-3">Settings</h3>
          <div className="space-y-3">
            <AudioRow
              label="Music"
              enabled={prefs.bgmEnabled}
              volume={prefs.bgmVolume}
              onToggle={() => onChangePrefs({ bgmEnabled: !prefs.bgmEnabled })}
              onVolume={(v) => onChangePrefs({ bgmVolume: v })}
            />
            <AudioRow
              label="Sound effects"
              enabled={prefs.sfxEnabled}
              volume={prefs.sfxVolume}
              onToggle={() => onChangePrefs({ sfxEnabled: !prefs.sfxEnabled })}
              onVolume={(v) => onChangePrefs({ sfxVolume: v })}
            />
            <Toggle label="Vibration" checked={prefs.haptics} onChange={() => onChangePrefs({ haptics: !prefs.haptics })} />

            {drawingCount > 0 && (
              <>
                <hr className="border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenGallery();
                  }}
                  className="w-full text-left text-sm font-semibold text-pokemon-blue hover:opacity-80"
                >
                  Drawing gallery ({drawingCount})
                </button>
              </>
            )}

            {showHome && (
              <>
                <hr className="border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onGoHome();
                  }}
                  className="w-full text-left text-sm font-semibold text-pokemon-red hover:opacity-80"
                >
                  Back to home
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-pokemon-blue' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function AudioRow({
  label,
  enabled,
  volume,
  onToggle,
  onVolume,
}: {
  label: string;
  enabled: boolean;
  volume: number;
  onToggle: () => void;
  onVolume: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Toggle label={label} checked={enabled} onChange={onToggle} />
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => onVolume(Number(e.target.value) / 100)}
        disabled={!enabled}
        aria-label={`${label} volume`}
        className="w-full accent-pokemon-blue disabled:opacity-40"
      />
    </div>
  );
}
