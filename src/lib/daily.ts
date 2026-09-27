// The daily challenge: one Pokémon per calendar day, the same for everyone on that date.
import { MEDIUM_POKEMON_IDS } from '@/data/pokemon-difficulty';
import { getPokemon } from './pokedex';
import type { PokemonData } from './game-state';

/** Challenge #1 was on this date. */
const FIRST_DAY = Date.UTC(2026, 8, 1);
const DAY_MS = 86_400_000;
// Stepping through the pool by a stride that shares no factor with its length visits every
// Pokémon once before any repeats, so consecutive days never land on the same one.
const STRIDE = 7919;
const OFFSET = 24;

export const DAILY_MEMORIZE_SECONDS = 10;
export const DAILY_DRAW_SECONDS = 90;

/** The local calendar date as YYYY-MM-DD. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / DAY_MS);
}

/** The challenge number shown on the share card. */
export function dailyNumber(key: string): number {
  return dayIndex(key) + 1;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function dailyPokemon(key: string): PokemonData {
  const pool = MEDIUM_POKEMON_IDS;
  const n = pool.length;
  const stride = gcd(STRIDE, n) === 1 ? STRIDE : 1;
  const i = (((dayIndex(key) * stride + OFFSET) % n) + n) % n;
  return getPokemon(pool[i])!;
}

/** The day before a YYYY-MM-DD key. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/** Milliseconds until local midnight, when the next challenge unlocks. */
export function msUntilTomorrow(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
