// Starred Pokémon, kept in localStorage on this device. Storage can be unavailable (private mode,
// blocked site data), so every read and write is guarded.
import { getPokemonInfo } from './pokedex';

export const FAVOURITES_KEY = 'wtp-favourites';

/** Reads a stored list, dropping anything that isn't a known Pokémon ID. */
export function parseFavourites(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((id): id is number => typeof id === 'number' && getPokemonInfo(id) !== null);
  return [...new Set(ids)].sort((a, b) => a - b);
}

/** `fallback` is used when storage can't be read. */
export function loadFavourites(fallback: readonly number[] = []): number[] {
  try {
    return parseFavourites(JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? '[]'));
  } catch {
    return [...fallback];
  }
}

export function saveFavourites(ids: readonly number[]) {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids));
  } catch {
    // Not persisted; the in-memory list still applies for this visit.
  }
}

/** The list with `id` added, or removed if it was already there (pure). */
export function toggleFavourite(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].sort((a, b) => a - b);
}
