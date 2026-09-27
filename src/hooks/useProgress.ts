'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_STATS, awardAchievements, loadStats, saveStats, type Achievement, type Stats } from '@/lib/stats';

/** Device progress (stats, daily streak, badges); `onUnlock` hears about each new badge. */
export function useProgress(onUnlock: (a: Achievement) => void) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const unlockRef = useRef(onUnlock);
  // The in-memory copy, used if storage is unavailable.
  const memoryRef = useRef<Stats>(EMPTY_STATS);

  useEffect(() => {
    unlockRef.current = onUnlock;
  });

  useEffect(() => {
    // Loaded after mount so server and client markup match.
    memoryRef.current = loadStats();
    setStats(memoryRef.current);
  }, []);

  const update = useCallback((fn: (s: Stats) => Stats) => {
    // Re-read storage first: another tab may have saved progress since this one loaded.
    const { stats: next, unlocked } = awardAchievements(fn(loadStats(memoryRef.current)), Date.now());
    memoryRef.current = next;
    saveStats(next);
    setStats(next);
    for (const a of unlocked) unlockRef.current(a);
  }, []);

  const reset = useCallback(() => {
    memoryRef.current = EMPTY_STATS;
    saveStats(EMPTY_STATS);
    setStats(EMPTY_STATS);
  }, []);

  return { stats, update, reset };
}
