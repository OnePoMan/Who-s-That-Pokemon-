'use client';

import { useEffect, useState } from 'react';

/** The current time, refreshed while `active`; used for countdowns driven by a deadline. */
export function useNow(active: boolean, intervalMs = 200): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

/** Keeps the screen on while `active` (supported browsers only). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.hidden) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        // Denied (battery saver, unsupported context); the game still works.
      }
    };
    // The lock drops whenever the page is hidden, so ask again on return.
    const onVisibility = () => {
      if (!document.hidden) void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
