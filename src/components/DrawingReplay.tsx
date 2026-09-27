'use client';

import { useEffect, useRef } from 'react';
import { CanvasManager, type DrawEvent } from '@/lib/canvas-engine';

interface DrawingReplayProps {
  events: readonly DrawEvent[];
  /** Total playback time; long drawings speed up to fit. */
  durationMs?: number;
  onDone?: () => void;
  label?: string;
}

/** Plays a drawing back stroke by stroke as a timelapse. */
export default function DrawingReplay({ events, durationMs = 5000, onDone, label = 'Drawing timelapse' }: DrawingReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const manager = new CanvasManager(canvas);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || events.length === 0) {
      manager.loadTimeline(events);
      onDoneRef.current?.();
      return;
    }
    let index = 0;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const target = Math.min(events.length, Math.ceil(((now - start) / durationMs) * events.length));
      while (index < target) manager.applyEvent(events[index++]);
      if (index < events.length) frame = requestAnimationFrame(step);
      else onDoneRef.current?.();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [events, durationMs]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className="w-full h-full" />;
}
