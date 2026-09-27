'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '@/lib/prefs';

export function usePrefs() {
  // Defaults on the first render keep server and client markup identical; stored values load
  // right after mount.
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
  }, []);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  return [prefs, updatePrefs] as const;
}
