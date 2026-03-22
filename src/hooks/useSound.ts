'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

type SoundName = 'correct' | 'wrong' | 'tick' | 'gameOver' | 'click' | 'whoosh' | 'reveal' | 'whosthat';

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

// Note frequency lookup
const NOTE_FREQS: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  Bb3: 233.08, Eb4: 311.13, Ab3: 207.65,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
  Bb4: 466.16, Eb5: 622.25, Ab4: 415.30, Db5: 554.37, Gb4: 369.99,
  R: 0, // rest
};

interface MelodyNote { note: string; duration: number; }

// ============================================================
// 3-MINUTE BGM — Structured as Intro → A → B → A' → C → A'' → Outro
// Inspired by Pokemon town themes (Littleroot, Pallet, Twinleaf)
// Total duration: ~180 seconds
// ============================================================

// INTRO — gentle opening, 8 bars (~8s)
const INTRO_MELODY: MelodyNote[] = [
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  { note: 'G5', duration: 0.5 }, { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
];

const INTRO_BASS: MelodyNote[] = [
  { note: 'C3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
  { note: 'G3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'F3', duration: 1.0 },
  { note: 'G3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
];

// SECTION A — bouncy main theme (~24s, 3 repetitions of 8-bar phrase)
const A_PHRASE: MelodyNote[] = [
  // Bar 1-2: bright opening motif
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  // Bar 3-4: stepping down
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: rising again
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.375 }, { note: 'E5', duration: 0.125 },
  { note: 'G5', duration: 0.5 },
  // Bar 7-8: resolution
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.5 },
];

const A_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// A' variation — same melody, different ending
const A_PRIME_PHRASE: MelodyNote[] = [
  // Bar 1-4: same as A
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: build up
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'A5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  // Bar 7-8: triumphant resolution
  { note: 'G5', duration: 0.375 }, { note: 'A5', duration: 0.125 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.5 },
];

// SECTION B — contrasting section, more melodic/flowing (~24s)
const B_PHRASE: MelodyNote[] = [
  // Bar 1-2: legato flowing melody in F major feel
  { note: 'F5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.5 }, { note: 'A4', duration: 0.5 },
  // Bar 3-4
  { note: 'Bb4', duration: 0.5 }, { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'F5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  // Bar 5-6: reaching higher
  { note: 'G5', duration: 0.5 }, { note: 'F5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 }, { note: 'F5', duration: 0.5 },
  // Bar 7-8: gentle descent back to C
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const B_BASS: MelodyNote[] = [
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'Bb3', duration: 0.5 }, { note: 'F3', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'Ab3', duration: 0.5 }, { note: 'Eb4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// SECTION C — bridge / development, more adventurous (~24s)
const C_PHRASE: MelodyNote[] = [
  // Syncopated, more playful rhythm
  // Bar 1-2
  { note: 'G4', duration: 0.125 }, { note: 'A4', duration: 0.125 }, { note: 'C5', duration: 0.25 },
  { note: 'E5', duration: 0.5 },
  { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.5 },
  // Bar 3-4
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  // Bar 5-6: call and response
  { note: 'A5', duration: 0.375 }, { note: 'R', duration: 0.125 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'F5', duration: 0.375 }, { note: 'R', duration: 0.125 },
  { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  // Bar 7-8: building back to A
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.5 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.5 },
];

const C_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'D4', duration: 0.5 }, { note: 'A3', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// A'' final variation — same as A but with slight embellishments
const A_DOUBLE_PRIME: MelodyNote[] = [
  // Bar 1-2: opening with grace notes
  { note: 'G5', duration: 0.125 }, { note: 'E5', duration: 0.125 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  // Bar 3-4
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: soaring variation
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.125 }, { note: 'A5', duration: 0.125 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.375 }, { note: 'D5', duration: 0.125 },
  { note: 'C5', duration: 0.5 },
  // Bar 7-8: final resolution with flourish
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'A5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.125 }, { note: 'D5', duration: 0.125 },
  { note: 'C5', duration: 0.5 },
];

// OUTRO — winds down back to intro feel for crossfade (~8s)
const OUTRO_MELODY: MelodyNote[] = [
  { note: 'E5', duration: 0.5 }, { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'R', duration: 0.5 },
  { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const OUTRO_BASS: MelodyNote[] = [
  { note: 'C3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'F3', duration: 1.0 },
  { note: 'C3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
];

// TRANSITION phrases — short linking passages between sections (~4s each)
const TRANSITION_1: MelodyNote[] = [
  // Ascending run into next section
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'A5', duration: 0.5 }, { note: 'G5', duration: 0.5 },
  { note: 'E5', duration: 0.5 }, { note: 'R', duration: 0.5 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const TRANSITION_1_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
];

const TRANSITION_2: MelodyNote[] = [
  // Descending, calming
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.5 }, { note: 'R', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
  { note: 'R', duration: 1.0 },
];

const TRANSITION_2_BASS: MelodyNote[] = [
  { note: 'G3', duration: 0.5 }, { note: 'F3', duration: 0.5 },
  { note: 'E3', duration: 0.5 }, { note: 'D3', duration: 0.5 },
  { note: 'C3', duration: 1.0 },
  { note: 'G3', duration: 0.5 }, { note: 'C3', duration: 0.5 },
];

// D SECTION — dreamy/contemplative, provides contrast before final return (~8s)
const D_PHRASE: MelodyNote[] = [
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
  { note: 'A4', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'E5', duration: 0.5 }, { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
];

const D_BASS: MelodyNote[] = [
  { note: 'A3', duration: 1.0 }, { note: 'E3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
];

// Full arrangement: ~180s (3 minutes)
// Intro(8) → A(6.5) → A(6.5) → T1(4) → B(6) → B(6) → A'(6.5) → T2(4) →
// C(6) → C(6) → T1(4) → A''(6.5) → D(8) → D(8) → T2(4) →
// B(6) → A(6.5) → A'(6.5) → T1(4) → C(6) → A''(6.5) →
// D(8) → B(6) → A(6.5) → Outro(8)
// Total: ~168s ≈ 2:48, close to 3 min with crossfade overlap
const FULL_MELODY: MelodyNote[] = [
  ...INTRO_MELODY,          // 8s
  ...A_PHRASE,               // 6.5s
  ...A_PHRASE,               // 6.5s (repeat for familiarity)
  ...TRANSITION_1,           // 4s
  ...B_PHRASE,               // 6s
  ...B_PHRASE,               // 6s (repeat)
  ...A_PRIME_PHRASE,          // 6.5s
  ...TRANSITION_2,           // 4s
  ...C_PHRASE,               // 6s
  ...C_PHRASE,               // 6s (repeat)
  ...TRANSITION_1,           // 4s
  ...A_DOUBLE_PRIME,          // 6.5s
  ...D_PHRASE,               // 8s
  ...D_PHRASE,               // 8s (repeat - dreamy section lingers)
  ...TRANSITION_2,           // 4s
  ...B_PHRASE,               // 6s
  ...A_PHRASE,               // 6.5s
  ...A_PRIME_PHRASE,          // 6.5s
  ...TRANSITION_1,           // 4s
  ...C_PHRASE,               // 6s
  ...A_DOUBLE_PRIME,          // 6.5s
  ...D_PHRASE,               // 8s
  ...B_PHRASE,               // 6s (final B before home stretch)
  ...A_PHRASE,               // 6.5s (return home)
  ...OUTRO_MELODY,           // 8s
];

const FULL_BASS: MelodyNote[] = [
  ...INTRO_BASS,
  ...A_BASS,
  ...A_BASS,
  ...TRANSITION_1_BASS,
  ...B_BASS,
  ...B_BASS,
  ...A_BASS,
  ...TRANSITION_2_BASS,
  ...C_BASS,
  ...C_BASS,
  ...TRANSITION_1_BASS,
  ...A_BASS,
  ...D_BASS,
  ...D_BASS,
  ...TRANSITION_2_BASS,
  ...B_BASS,
  ...A_BASS,
  ...A_BASS,
  ...TRANSITION_1_BASS,
  ...C_BASS,
  ...A_BASS,
  ...D_BASS,
  ...B_BASS,
  ...A_BASS,
  ...OUTRO_BASS,
];

// Crossfade duration in seconds
const CROSSFADE_DURATION = 2.5;

function calcDuration(notes: MelodyNote[]): number {
  return notes.reduce((sum, n) => sum + n.duration, 0);
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgmEnabledRef = useRef(true);
  const sfxEnabledRef = useRef(true);
  const bgmNodesRef = useRef<{ stop: () => void } | null>(null);
  const bgmSchedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    if (!sfxEnabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [getCtx]);

  const play = useCallback((name: SoundName) => {
    if (!sfxEnabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    switch (name) {
      case 'correct': {
        playTone(523, 0.15, 'square', 0.2);
        setTimeout(() => playTone(659, 0.15, 'square', 0.2), 100);
        setTimeout(() => playTone(784, 0.3, 'square', 0.2), 200);
        break;
      }
      case 'wrong': {
        playTone(300, 0.2, 'sawtooth', 0.15);
        setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.15), 200);
        break;
      }
      case 'tick': {
        playTone(800, 0.05, 'sine', 0.1);
        break;
      }
      case 'gameOver': {
        playTone(523, 0.2, 'square', 0.2);
        setTimeout(() => playTone(659, 0.2, 'square', 0.2), 150);
        setTimeout(() => playTone(784, 0.2, 'square', 0.2), 300);
        setTimeout(() => playTone(1047, 0.5, 'square', 0.25), 450);
        break;
      }
      case 'click': {
        playTone(600, 0.05, 'sine', 0.15);
        break;
      }
      case 'whoosh': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      }
      case 'reveal': {
        playTone(440, 0.15, 'triangle', 0.2);
        setTimeout(() => playTone(554, 0.15, 'triangle', 0.2), 120);
        setTimeout(() => playTone(659, 0.15, 'triangle', 0.2), 240);
        setTimeout(() => playTone(880, 0.4, 'triangle', 0.25), 360);
        break;
      }
      case 'whosthat': {
        // Approximation of the "Who's That Pokemon?" anime sting
        // Quick rising brass-like fanfare: dun dun-dun DUN DUN!
        // Uses sawtooth for brass-like timbre with square for punch
        const t = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.25;
        masterGain.connect(ctx.destination);

        const scheduleNote = (freq: number, start: number, dur: number, type: OscillatorType = 'sawtooth', vol = 0.4) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          // Brass-like attack: sharp onset, slight sustain, quick release
          g.gain.setValueAtTime(0, t + start);
          g.gain.linearRampToValueAtTime(vol, t + start + 0.02);
          g.gain.setValueAtTime(vol, t + start + dur * 0.7);
          g.gain.linearRampToValueAtTime(0, t + start + dur);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t + start);
          osc.stop(t + start + dur);
        };

        // "Who's" — short staccato note
        scheduleNote(349.23, 0, 0.12);        // F4
        // "That" — quick follow-up
        scheduleNote(392.00, 0.14, 0.12);     // G4
        // "Po-" — rising
        scheduleNote(440.00, 0.30, 0.15);     // A4
        // "-ké-" — higher
        scheduleNote(523.25, 0.48, 0.15);     // C5
        // "-mon?" — big sustained finish with harmonics
        scheduleNote(659.25, 0.66, 0.5);      // E5 (main)
        scheduleNote(523.25, 0.66, 0.5, 'square', 0.2); // C5 harmony
        scheduleNote(783.99, 0.66, 0.5, 'square', 0.15); // G5 upper harmony

        // Final punctuation hit
        scheduleNote(523.25, 1.2, 0.3);       // C5
        scheduleNote(659.25, 1.2, 0.3, 'square', 0.2); // E5
        scheduleNote(783.99, 1.2, 0.3, 'square', 0.15); // G5
        break;
      }
    }
  }, [getCtx, playTone]);

  const stopBgm = useCallback(() => {
    if (bgmNodesRef.current) {
      bgmNodesRef.current.stop();
      bgmNodesRef.current = null;
    }
    if (bgmSchedulerRef.current) {
      clearTimeout(bgmSchedulerRef.current);
      bgmSchedulerRef.current = null;
    }
  }, []);

  const startBgm = useCallback(() => {
    stopBgm();
    if (!bgmEnabledRef.current) return;

    const ctx = getCtx();
    if (!ctx) return;

    let stopped = false;
    const loopDuration = calcDuration(FULL_MELODY);
    // The next loop's fade-in begins this many seconds before the current loop ends
    const overlapStart = loopDuration - CROSSFADE_DURATION;

    const scheduleSingleLoop = (masterGain: GainNode, startTime: number, fadeIn: boolean, fadeOut: boolean) => {
      const oscillators: OscillatorNode[] = [];

      // Fade envelope on the master gain for this loop instance
      if (fadeIn) {
        masterGain.gain.setValueAtTime(0, startTime);
        masterGain.gain.linearRampToValueAtTime(0.12, startTime + CROSSFADE_DURATION);
      } else {
        masterGain.gain.setValueAtTime(0.12, startTime);
      }

      if (fadeOut) {
        const fadeOutStart = startTime + loopDuration - CROSSFADE_DURATION;
        masterGain.gain.setValueAtTime(0.12, fadeOutStart);
        masterGain.gain.linearRampToValueAtTime(0, startTime + loopDuration);
      }

      // Schedule melody (square wave — chiptune lead)
      let melodyTime = startTime;
      for (const { note, duration } of FULL_MELODY) {
        const freq = NOTE_FREQS[note];
        if (!freq || note === 'R') {
          melodyTime += duration;
          continue;
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, melodyTime);
        gain.gain.setValueAtTime(0.18, melodyTime + duration * 0.8);
        gain.gain.linearRampToValueAtTime(0.0, melodyTime + duration * 0.95);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(melodyTime);
        osc.stop(melodyTime + duration);
        oscillators.push(osc);
        melodyTime += duration;
      }

      // Schedule bass (triangle wave — soft bass)
      let bassTime = startTime;
      for (const { note, duration } of FULL_BASS) {
        const freq = NOTE_FREQS[note];
        if (!freq || note === 'R') {
          bassTime += duration;
          continue;
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * 0.5; // One octave lower
        gain.gain.setValueAtTime(0.15, bassTime);
        gain.gain.setValueAtTime(0.15, bassTime + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0.0, bassTime + duration * 0.9);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(bassTime);
        osc.stop(bassTime + duration);
        oscillators.push(osc);
        bassTime += duration;
      }

      return { oscillators, masterGain };
    };

    // Each loop iteration creates its own master gain for independent fade control
    const allGains: GainNode[] = [];

    const scheduleLoop = (isFirst: boolean) => {
      if (stopped || !bgmEnabledRef.current) return;

      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      allGains.push(masterGain);

      const startTime = ctx.currentTime + 0.05;
      scheduleSingleLoop(masterGain, startTime, !isFirst, true);

      // Schedule the NEXT loop to start during this loop's fade-out
      // so the new loop's fade-in overlaps with the current fade-out
      const nextLoopDelay = overlapStart * 1000;
      bgmSchedulerRef.current = setTimeout(() => {
        scheduleLoop(false);
      }, nextLoopDelay);
    };

    scheduleLoop(true);

    bgmNodesRef.current = {
      stop: () => {
        stopped = true;
        allGains.forEach((g) => {
          try { g.disconnect(); } catch { /* already disconnected */ }
        });
      },
    };
  }, [getCtx, stopBgm]);

  const toggleBgm = useCallback(() => {
    bgmEnabledRef.current = !bgmEnabledRef.current;
    setBgmEnabled(bgmEnabledRef.current);
    if (bgmEnabledRef.current) {
      startBgm();
    } else {
      stopBgm();
    }
  }, [startBgm, stopBgm]);

  const toggleSfx = useCallback(() => {
    sfxEnabledRef.current = !sfxEnabledRef.current;
    setSfxEnabled(sfxEnabledRef.current);
  }, []);

  useEffect(() => {
    return () => {
      stopBgm();
      ctxRef.current?.close();
    };
  }, [stopBgm]);

  return { play, startBgm, stopBgm, toggleBgm, toggleSfx, bgmEnabled, sfxEnabled };
}
