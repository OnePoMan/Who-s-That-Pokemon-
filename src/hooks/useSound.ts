'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

type SoundName = 'correct' | 'wrong' | 'tick' | 'gameOver' | 'click' | 'whoosh' | 'reveal';

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

// Littleroot Town-inspired melody using note frequencies
// Approximation of the iconic theme from Pokemon Ruby/Sapphire
const NOTE_FREQS: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
  Bb4: 466.16, Eb5: 622.25, Ab4: 415.30, Db5: 554.37, Gb4: 369.99,
};

// Melody inspired by Littleroot Town's cheerful, bouncy feel
// Uses similar intervals and rhythm patterns
interface MelodyNote { note: string; duration: number; }

const LITTLEROOT_MELODY: MelodyNote[] = [
  // Phrase 1 - bright opening
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  // Phrase 2 - stepping down
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Phrase 3 - rising again
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.375 }, { note: 'E5', duration: 0.125 },
  { note: 'G5', duration: 0.5 },
  // Phrase 4 - resolution
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.5 },
];

// Bass line accompaniment
const LITTLEROOT_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'A4', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'A4', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'F4', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G4', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'F4', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G4', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

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

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(ctx.destination);

    let stopped = false;

    const scheduleLoop = () => {
      if (stopped || !bgmEnabledRef.current) return;

      const startTime = ctx.currentTime + 0.05;
      const oscillators: OscillatorNode[] = [];

      // Schedule melody (square wave — chiptune lead)
      let melodyTime = startTime;
      for (const { note, duration } of LITTLEROOT_MELODY) {
        const freq = NOTE_FREQS[note];
        if (!freq) continue;

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
      for (const { note, duration } of LITTLEROOT_BASS) {
        const freq = NOTE_FREQS[note];
        if (!freq) continue;

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

      const loopDuration = melodyTime - startTime;
      bgmSchedulerRef.current = setTimeout(() => {
        scheduleLoop();
      }, loopDuration * 1000 - 100); // Schedule next loop slightly early for seamless looping
    };

    scheduleLoop();

    bgmNodesRef.current = {
      stop: () => {
        stopped = true;
        masterGain.disconnect();
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
