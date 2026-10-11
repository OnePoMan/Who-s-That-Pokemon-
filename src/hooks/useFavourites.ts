'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { GameSettings } from '@/lib/game-state';
import { getCustomPool } from '@/lib/pools';
import { FAVOURITES_KEY, loadFavourites, saveFavourites, toggleFavourite } from '@/lib/favourites';

// One shared copy, so the Pokédex, the settings forms and solo practice always agree.
const NONE: readonly number[] = [];
const listeners = new Set<() => void>();
let current: readonly number[] | null = null;

const read = () => (current ??= loadFavourites());
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the list.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== FAVOURITES_KEY) return;
    current = null;
    notify();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Starred Pokémon IDs (empty on the server and first render), and a toggle for one ID. */
export function useFavourites() {
  const favourites = useSyncExternalStore(subscribe, read, () => NONE);

  const toggle = useCallback((id: number) => {
    // Re-read storage first: another tab may have changed the list since this one loaded.
    current = toggleFavourite(loadFavourites(current ?? NONE), id);
    saveFavourites(current);
    notify();
  }, []);

  return { favourites, toggle };
}

/** True when the settings limit rounds to favourites and none of them match, so a game can't start. */
export function useFavouritePoolEmpty(settings: GameSettings): boolean {
  const { favourites } = useFavourites();
  return settings.favouritesOnly && getCustomPool(settings.difficulty, settings, favourites).length === 0;
}
