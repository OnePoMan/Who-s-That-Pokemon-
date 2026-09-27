'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FULL_BASS, FULL_MELODY, NOTE_FREQS, totalDuration, type MelodyNote } from '@/lib/audio/song';
import type { Prefs } from '@/lib/prefs';

export type SoundName = 'correct' | 'wrong' | 'tick' | 'gameOver' | 'click' | 'whoosh' | 'reveal' | 'whosthat';

const BGM_LEVEL = 0.2; // headroom so full music volume still sits under the sound effects
const LOOKAHEAD_S = 2; // how far ahead notes are scheduled
const SCHEDULER_TICK_MS = 250;
const CROSSFADE_S = 2.5; // each loop overlaps the next by this much, fading out as it fades in

interface ScheduledNote {
  time: number; // seconds from the start of the loop
  duration: number;
  freq: number;
  voice: 'melody' | 'bass';
}

function flatten(notes: readonly MelodyNote[], voice: ScheduledNote['voice']): ScheduledNote[] {
  const out: ScheduledNote[] = [];
  let t = 0;
  for (const n of notes) {
    const freq = NOTE_FREQS[n.note];
    if (freq) out.push({ time: t, duration: n.duration, freq: voice === 'bass' ? freq / 2 : freq, voice });
    t += n.duration;
  }
  return out;
}

const SONG: ScheduledNote[] = [...flatten(FULL_MELODY, 'melody'), ...flatten(FULL_BASS, 'bass')].sort(
  (a, b) => a.time - b.time,
);
const SONG_LENGTH = totalDuration(FULL_MELODY);
const LOOP_STRIDE = SONG_LENGTH - CROSSFADE_S;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new Ctor();
  } catch {
    return null;
  }
}

export function useSound(prefs: Prefs) {
  const ctxRef = useRef<AudioContext | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmBusRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wantBgmRef = useRef(false);
  const prefsRef = useRef(prefs);

  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const ctx = createAudioContext();
      if (!ctx) return null;
      const sfx = ctx.createGain();
      const bgm = ctx.createGain();
      sfx.connect(ctx.destination);
      bgm.connect(ctx.destination);
      ctxRef.current = ctx;
      sfxGainRef.current = sfx;
      bgmGainRef.current = bgm;
    }
    const ctx = ctxRef.current;
    if (ctx.state !== 'running' && !document.hidden) void ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const applyVolumes = useCallback(() => {
    const ctx = ctxRef.current;
    const p = prefsRef.current;
    if (!ctx) return;
    sfxGainRef.current?.gain.setTargetAtTime(p.sfxEnabled ? p.sfxVolume : 0, ctx.currentTime, 0.05);
    bgmGainRef.current?.gain.setTargetAtTime(p.bgmEnabled ? p.bgmVolume * BGM_LEVEL : 0, ctx.currentTime, 0.1);
  }, []);

  // ---- Sound effects ---------------------------------------------------------------------------

  const tone = useCallback(
    (freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) => {
      const ctx = ctxRef.current;
      const out = sfxGainRef.current;
      if (!ctx || !out) return;
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    },
    [],
  );

  const play = useCallback(
    (name: SoundName) => {
      if (!prefsRef.current.sfxEnabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      applyVolumes();
      switch (name) {
        case 'correct':
          tone(523, 0.15, 'square', 0.2);
          tone(659, 0.15, 'square', 0.2, 0.1);
          tone(784, 0.3, 'square', 0.2, 0.2);
          break;
        case 'wrong':
          tone(300, 0.2, 'sawtooth', 0.15);
          tone(200, 0.4, 'sawtooth', 0.15, 0.2);
          break;
        case 'tick':
          tone(800, 0.05, 'sine', 0.1);
          break;
        case 'gameOver':
          [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'square', 0.2, i * 0.15));
          tone(1047, 0.5, 'square', 0.25, 0.45);
          break;
        case 'click':
          tone(600, 0.05, 'sine', 0.15);
          break;
        case 'whoosh': {
          const out = sfxGainRef.current!;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.32);
          break;
        }
        case 'reveal':
          [440, 554, 659].forEach((f, i) => tone(f, 0.15, 'triangle', 0.2, i * 0.12));
          tone(880, 0.4, 'triangle', 0.25, 0.36);
          break;
        case 'whosthat':
          // A rising brass-like sting in the spirit of the anime's "Who's that Pokémon?" moment.
          tone(349.23, 0.12, 'sawtooth', 0.1);
          tone(392.0, 0.12, 'sawtooth', 0.1, 0.14);
          tone(440.0, 0.15, 'sawtooth', 0.1, 0.3);
          tone(523.25, 0.15, 'sawtooth', 0.1, 0.48);
          tone(659.25, 0.5, 'sawtooth', 0.12, 0.66);
          tone(523.25, 0.5, 'square', 0.05, 0.66);
          tone(783.99, 0.5, 'square', 0.04, 0.66);
          tone(523.25, 0.3, 'sawtooth', 0.1, 1.2);
          tone(659.25, 0.3, 'square', 0.05, 1.2);
          tone(783.99, 0.3, 'square', 0.04, 1.2);
          break;
      }
    },
    [applyVolumes, getCtx, tone],
  );

  // ---- Background music ------------------------------------------------------------------------

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    schedulerRef.current = null;
    const bus = bgmBusRef.current;
    const ctx = ctxRef.current;
    if (bus && ctx) {
      // Fade out quickly, then drop the bus (and every note scheduled on it).
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      setTimeout(() => bus.disconnect(), 600);
    }
    bgmBusRef.current = null;
  }, []);

  const startScheduler = useCallback(() => {
    const ctx = getCtx();
    const bgmOut = bgmGainRef.current;
    if (!ctx || !bgmOut || schedulerRef.current) return;
    applyVolumes();

    const bus = ctx.createGain();
    bus.connect(bgmOut);
    bgmBusRef.current = bus;

    const origin = ctx.currentTime + 0.1;
    // Each active loop iteration keeps its own read position in the note list, so the next
    // iteration can begin while the previous one is still fading out.
    const loops: { start: number; index: number; iteration: number }[] = [{ start: origin, index: 0, iteration: 0 }];

    const noteLevel = (note: ScheduledNote, iteration: number) => {
      let level = note.voice === 'melody' ? 0.18 : 0.15;
      if (iteration > 0 && note.time < CROSSFADE_S) level *= note.time / CROSSFADE_S;
      if (note.time > SONG_LENGTH - CROSSFADE_S) level *= (SONG_LENGTH - note.time) / CROSSFADE_S;
      return level;
    };

    const tick = () => {
      const horizon = ctx.currentTime + LOOKAHEAD_S;
      const newest = loops[loops.length - 1];
      if (newest.start + LOOP_STRIDE < horizon) {
        loops.push({ start: newest.start + LOOP_STRIDE, index: 0, iteration: newest.iteration + 1 });
      }
      for (const loop of loops) {
        while (loop.index < SONG.length && loop.start + SONG[loop.index].time < horizon) {
          const note = SONG[loop.index++];
          const at = loop.start + note.time;
          if (at < ctx.currentTime) continue; // skipped while the tab was asleep
          const level = noteLevel(note, loop.iteration);
          if (level <= 0) continue;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = note.voice === 'melody' ? 'square' : 'triangle';
          osc.frequency.value = note.freq;
          const release = note.voice === 'melody' ? 0.8 : 0.7;
          gain.gain.setValueAtTime(level, at);
          gain.gain.setValueAtTime(level, at + note.duration * release);
          gain.gain.linearRampToValueAtTime(0, at + note.duration * 0.95);
          osc.connect(gain);
          gain.connect(bus);
          osc.start(at);
          osc.stop(at + note.duration);
        }
      }
      while (loops.length > 1 && loops[0].index >= SONG.length) loops.shift();
    };

    tick();
    schedulerRef.current = setInterval(tick, SCHEDULER_TICK_MS);
  }, [applyVolumes, getCtx]);

  const startBgm = useCallback(() => {
    wantBgmRef.current = true;
    if (prefsRef.current.bgmEnabled) startScheduler();
  }, [startScheduler]);

  const stopBgm = useCallback(() => {
    wantBgmRef.current = false;
    stopScheduler();
  }, [stopScheduler]);

  // React to preference changes (toggles and volume sliders).
  useEffect(() => {
    prefsRef.current = prefs;
    applyVolumes();
    if (!prefs.bgmEnabled) stopScheduler();
    else if (wantBgmRef.current) startScheduler();
  }, [prefs, applyVolumes, startScheduler, stopScheduler]);

  // Pause audio in the background and pick it back up on return.
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => {});
      else void ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(
    () => () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  return useMemo(() => ({ play, startBgm, stopBgm }), [play, startBgm, stopBgm]);
}
