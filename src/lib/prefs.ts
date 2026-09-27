// Per-device preferences, kept in localStorage. Storage can be unavailable (private mode,
// blocked site data), so every read and write is guarded and falls back to defaults.

export interface Prefs {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  haptics: boolean;
  /** Play the Pokémon's cry when it is revealed. */
  cries: boolean;
  theme: Theme;
}

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

export const DEFAULT_PREFS: Prefs = {
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.6,
  sfxVolume: 0.8,
  haptics: true,
  cries: true,
  theme: 'system',
};

const KEY = 'wtp-prefs';

const unit = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      bgmEnabled: bool(raw.bgmEnabled, DEFAULT_PREFS.bgmEnabled),
      sfxEnabled: bool(raw.sfxEnabled, DEFAULT_PREFS.sfxEnabled),
      bgmVolume: unit(raw.bgmVolume, DEFAULT_PREFS.bgmVolume),
      sfxVolume: unit(raw.sfxVolume, DEFAULT_PREFS.sfxVolume),
      haptics: bool(raw.haptics, DEFAULT_PREFS.haptics),
      cries: bool(raw.cries, DEFAULT_PREFS.cries),
      theme: THEMES.includes(raw.theme) ? raw.theme : DEFAULT_PREFS.theme,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Not persisted; the in-memory value still applies for this visit.
  }
}

export function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration is not allowed; it is only a nicety.
  }
}
