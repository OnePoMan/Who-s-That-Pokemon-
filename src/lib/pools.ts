// Which Pokémon a round can pick from beyond difficulty/generation/type: the player's favourites,
// and the ones they've drawn but failed to get guessed ("redraw your weakest").
import type { Difficulty, PokemonData } from './game-state';
import { getPokemon, getPokemonPool, pickRandomPokemon, type PoolFilters } from './pokedex';

export interface PoolSettings extends PoolFilters {
  /** Only pick from the host's starred Pokémon. */
  favouritesOnly?: boolean;
}

/** The difficulty/generation/type pool, narrowed to `favourites` when the settings ask for it. */
export function getCustomPool(difficulty: Difficulty, settings: PoolSettings, favourites: readonly number[]): readonly number[] {
  const pool = getPokemonPool(difficulty, settings);
  if (!settings.favouritesOnly) return pool;
  const starred = new Set(favourites);
  return pool.filter((id) => starred.has(id));
}

/**
 * A random Pokémon for a round. With "favourites only" it comes from the starred ones that match
 * the other settings; if there are none (the settings screens prevent starting) it falls back to
 * the ordinary pool rather than failing.
 */
export function pickForSettings(
  difficulty: Difficulty,
  exclude: readonly number[],
  settings: PoolSettings,
  favourites: readonly number[],
  rng: () => number = Math.random,
): PokemonData {
  if (settings.favouritesOnly) {
    const pool = getCustomPool(difficulty, settings, favourites);
    if (pool.length > 0) {
      const excluded = new Set(exclude);
      const fresh = pool.filter((id) => !excluded.has(id));
      const from = fresh.length > 0 ? fresh : pool;
      return getPokemon(from[Math.floor(rng() * from.length)])!;
    }
  }
  return pickRandomPokemon(difficulty, exclude, settings);
}

/** Pokémon this device drew without getting them guessed, most-missed first (ties by ID). */
export function rankWeakest(missed: Readonly<Record<number, number>>): { pokemonId: number; misses: number }[] {
  return Object.entries(missed)
    .map(([id, misses]) => ({ pokemonId: Number(id), misses }))
    .filter((e) => e.misses > 0 && getPokemon(e.pokemonId) !== null)
    .sort((a, b) => b.misses - a.misses || a.pokemonId - b.pokemonId);
}

/**
 * Picks one of the weakest Pokémon at random, weighted by how often it was missed, so the worst
 * come up most but not every time. Recently shown ones are skipped unless nothing else is left.
 * Null when nothing has been missed.
 */
export function pickWeakest(
  missed: Readonly<Record<number, number>>,
  exclude: readonly number[] = [],
  rng: () => number = Math.random,
): PokemonData | null {
  const ranked = rankWeakest(missed);
  if (ranked.length === 0) return null;
  const excluded = new Set(exclude);
  const fresh = ranked.filter((e) => !excluded.has(e.pokemonId));
  const from = fresh.length > 0 ? fresh : ranked;
  let roll = rng() * from.reduce((sum, e) => sum + e.misses, 0);
  for (const e of from) {
    roll -= e.misses;
    if (roll < 0) return getPokemon(e.pokemonId);
  }
  return getPokemon(from[from.length - 1].pokemonId);
}
