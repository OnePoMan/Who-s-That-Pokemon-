'use client';

import { useRef, useCallback, useEffect } from 'react';

type SoundName = 'correct' | 'wrong' | 'tick' | 'gameOver' | 'click' | 'whoosh' | 'reveal';

// Programmatic sound generation using Web Audio API
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const enabledRef = useRef(true);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
      if (ctxRef.current) {
        musicGainRef.current = ctxRef.current.createGain();
        musicGainRef.current.gain.value = 0.15;
        musicGainRef.current.connect(ctxRef.current.destination);
      }
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    if (!enabledRef.current) return;
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
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    switch (name) {
      case 'correct': {
        // Happy ascending arpeggio
        playTone(523, 0.15, 'square', 0.2);
        setTimeout(() => playTone(659, 0.15, 'square', 0.2), 100);
        setTimeout(() => playTone(784, 0.3, 'square', 0.2), 200);
        break;
      }
      case 'wrong': {
        // Descending sad tones
        playTone(300, 0.2, 'sawtooth', 0.15);
        setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.15), 200);
        break;
      }
      case 'tick': {
        playTone(800, 0.05, 'sine', 0.1);
        break;
      }
      case 'gameOver': {
        // Fanfare
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
        // Dramatic reveal
        playTone(440, 0.15, 'triangle', 0.2);
        setTimeout(() => playTone(554, 0.15, 'triangle', 0.2), 120);
        setTimeout(() => playTone(659, 0.15, 'triangle', 0.2), 240);
        setTimeout(() => playTone(880, 0.4, 'triangle', 0.25), 360);
        break;
      }
    }
  }, [getCtx, playTone]);

  const toggleSound = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { play, toggleSound, isEnabled: () => enabledRef.current };
}
