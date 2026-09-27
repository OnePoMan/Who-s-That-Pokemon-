// Per-device progress: play stats, the daily streak, discovered Pokémon and achievement badges.
// Kept in localStorage (small); the drawings themselves live in IndexedDB (see collection.ts).
import { GENERATIONS, TYPES, getPokemonInfo } from './pokedex';
import { previousDay } from './daily';
import type { RoundOutcome } from './game-state';

export interface DailyResult {
  date: string;
  pokemonId: number;
  timeMs: number;
  /** The drawing in the collection, for showing and sharing again later that day. */
  drawingId: number | null;
}

export interface Stats {
  gamesPlayed: number;
  /** Multi-phone games this phone's player finished / won (a shared phone has no "me"). */
  onlineGames: number;
  onlineWins: number;
  biggestParty: number;
  roundsPlayed: number;
  roundsGuessed: number;
  /** Guessed with at least two thirds of the time left. */
  quickDraws: number;
  bestStreak: number;
  soloDrawings: number;
  /** Pokémon IDs drawn at least once on this device. */
  discovered: number[];
  /** Pokémon ID → times drawn. */
  drawnCount: Record<number, number>;
  daily: { last: string | null; streak: number; best: number; played: number; result: DailyResult | null };
  /** Achievement ID → when it was unlocked. */
  achievements: Record<string, number>;
}

export const EMPTY_STATS: Stats = {
  gamesPlayed: 0,
  onlineGames: 0,
  onlineWins: 0,
  biggestParty: 0,
  roundsPlayed: 0,
  roundsGuessed: 0,
  quickDraws: 0,
  bestStreak: 0,
  soloDrawings: 0,
  discovered: [],
  drawnCount: {},
  daily: { last: null, streak: 0, best: 0, played: 0, result: null },
  achievements: {},
};

const KEY = 'wtp-stats';

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Reads stored stats, dropping anything malformed rather than trusting it. */
export function parseStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return EMPTY_STATS;
  const r = raw as Record<string, unknown>;
  const daily = (r.daily && typeof r.daily === 'object' ? r.daily : {}) as Record<string, unknown>;
  const result = daily.result as Record<string, unknown> | null | undefined;
  const drawn: Record<number, number> = {};
  if (r.drawnCount && typeof r.drawnCount === 'object') {
    for (const [k, v] of Object.entries(r.drawnCount)) if (getPokemonInfo(Number(k)) && count(v)) drawn[Number(k)] = count(v);
  }
  const achievements: Record<string, number> = {};
  if (r.achievements && typeof r.achievements === 'object') {
    for (const [k, v] of Object.entries(r.achievements)) if (ACHIEVEMENTS.some((a) => a.id === k)) achievements[k] = count(v);
  }
  return {
    gamesPlayed: count(r.gamesPlayed),
    onlineGames: count(r.onlineGames),
    onlineWins: count(r.onlineWins),
    biggestParty: count(r.biggestParty),
    roundsPlayed: count(r.roundsPlayed),
    roundsGuessed: count(r.roundsGuessed),
    quickDraws: count(r.quickDraws),
    bestStreak: count(r.bestStreak),
    soloDrawings: count(r.soloDrawings),
    discovered: Array.isArray(r.discovered) ? [...new Set(r.discovered.filter((id) => typeof id === 'number' && getPokemonInfo(id)))] : [],
    drawnCount: drawn,
    daily: {
      last: isDate(daily.last) ? daily.last : null,
      streak: count(daily.streak),
      best: count(daily.best),
      played: count(daily.played),
      result:
        result && isDate(result.date) && getPokemonInfo(Number(result.pokemonId))
          ? {
              date: result.date,
              pokemonId: Number(result.pokemonId),
              timeMs: count(result.timeMs),
              drawingId: typeof result.drawingId === 'number' ? result.drawingId : null,
            }
          : null,
    },
    achievements,
  };
}

/** `fallback` is used when storage can't be read (e.g. blocked site data). */
export function loadStats(fallback: Stats = EMPTY_STATS): Stats {
  try {
    return parseStats(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return fallback;
  }
}

export function saveStats(stats: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage full or blocked: progress for this visit still shows.
  }
}

// ---- Updates (pure) ------------------------------------------------------------------------------

function discover(stats: Stats, pokemonId: number): Stats {
  return {
    ...stats,
    discovered: stats.discovered.includes(pokemonId) ? stats.discovered : [...stats.discovered, pokemonId],
    drawnCount: { ...stats.drawnCount, [pokemonId]: (stats.drawnCount[pokemonId] ?? 0) + 1 },
  };
}

export function recordRound(stats: Stats, round: { pokemonId: number; outcome: RoundOutcome; quick: boolean; streak: number }): Stats {
  const next = discover(stats, round.pokemonId);
  return {
    ...next,
    roundsPlayed: next.roundsPlayed + 1,
    roundsGuessed: next.roundsGuessed + (round.outcome === 'correct' ? 1 : 0),
    quickDraws: next.quickDraws + (round.outcome === 'correct' && round.quick ? 1 : 0),
    bestStreak: Math.max(next.bestStreak, round.streak),
  };
}

export function recordGame(stats: Stats, game: { players: number; online: boolean; won: boolean }): Stats {
  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    onlineGames: stats.onlineGames + (game.online ? 1 : 0),
    onlineWins: stats.onlineWins + (game.online && game.won ? 1 : 0),
    biggestParty: Math.max(stats.biggestParty, game.players),
  };
}

export function recordSolo(stats: Stats, pokemonId: number): Stats {
  const next = discover(stats, pokemonId);
  return { ...next, soloDrawings: next.soloDrawings + 1 };
}

/** A finished daily challenge; a second finish on the same date changes nothing. */
export function recordDaily(stats: Stats, result: DailyResult): Stats {
  if (stats.daily.last === result.date) return stats;
  const streak = stats.daily.last === previousDay(result.date) ? stats.daily.streak + 1 : 1;
  const next = discover(stats, result.pokemonId);
  return {
    ...next,
    daily: { last: result.date, streak, best: Math.max(stats.daily.best, streak), played: stats.daily.played + 1, result },
  };
}

/** The streak as it stands today: it lapses once a whole day is missed. */
export function currentDailyStreak(stats: Stats, today: string): number {
  const { last, streak } = stats.daily;
  return last === today || last === previousDay(today) ? streak : 0;
}

export function mostDrawn(stats: Stats, limit = 3): { pokemonId: number; count: number }[] {
  return Object.entries(stats.drawnCount)
    .map(([id, c]) => ({ pokemonId: Number(id), count: c }))
    .sort((a, b) => b.count - a.count || a.pokemonId - b.pokemonId)
    .slice(0, limit);
}

// ---- Achievements --------------------------------------------------------------------------------

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** [current, goal] */
  progress: (s: Stats) => [number, number];
}

const generationsSeen = (s: Stats) => new Set(s.discovered.map((id) => getPokemonInfo(id)?.generation)).size;
const typesSeen = (s: Stats) => new Set(s.discovered.flatMap((id) => getPokemonInfo(id)?.types ?? [])).size;

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-sketch', icon: '✏️', title: 'First Sketch', description: 'Save your first drawing', progress: (s) => [s.discovered.length, 1] },
  { id: 'dex-10', icon: '📘', title: 'Rookie Researcher', description: 'Draw 10 different Pokémon', progress: (s) => [s.discovered.length, 10] },
  { id: 'dex-50', icon: '📗', title: 'Field Researcher', description: 'Draw 50 different Pokémon', progress: (s) => [s.discovered.length, 50] },
  { id: 'dex-151', icon: '📕', title: 'Original 151', description: 'Draw 151 different Pokémon', progress: (s) => [s.discovered.length, 151] },
  { id: 'dex-500', icon: '🎓', title: 'Professor', description: 'Draw 500 different Pokémon', progress: (s) => [s.discovered.length, 500] },
  { id: 'all-gens', icon: '🗺️', title: 'Globetrotter', description: 'Draw a Pokémon from every generation', progress: (s) => [generationsSeen(s), GENERATIONS.length] },
  { id: 'all-types', icon: '🌈', title: 'Type Master', description: 'Draw a Pokémon of every type', progress: (s) => [typesSeen(s), TYPES.length] },
  { id: 'quick-draw', icon: '⚡', title: 'Quick Draw', description: 'Get a drawing guessed with two thirds of the time left', progress: (s) => [s.quickDraws, 1] },
  { id: 'streak-3', icon: '🔥', title: 'On Fire', description: 'Guess 3 rounds in a row in one game', progress: (s) => [s.bestStreak, 3] },
  { id: 'streak-5', icon: '☄️', title: 'Unstoppable', description: 'Guess 5 rounds in a row in one game', progress: (s) => [s.bestStreak, 5] },
  { id: 'games-10', icon: '🎮', title: 'Regular', description: 'Finish 10 games', progress: (s) => [s.gamesPlayed, 10] },
  { id: 'party', icon: '🎉', title: 'Party Animal', description: 'Finish a game with 5 or more players', progress: (s) => [s.biggestParty, 5] },
  { id: 'online', icon: '📡', title: 'Long Distance', description: 'Finish a game on several phones', progress: (s) => [s.onlineGames, 1] },
  { id: 'champion', icon: '🏆', title: 'Champion', description: 'Win a game on several phones', progress: (s) => [s.onlineWins, 1] },
  { id: 'daily-1', icon: '📅', title: 'Daily Trainer', description: 'Finish a daily challenge', progress: (s) => [s.daily.played, 1] },
  { id: 'daily-7', icon: '🗓️', title: 'Week Streak', description: 'Finish the daily challenge 7 days in a row', progress: (s) => [s.daily.best, 7] },
  { id: 'solo-10', icon: '🖌️', title: 'Practice Makes Perfect', description: 'Finish 10 solo drawings', progress: (s) => [s.soloDrawings, 10] },
];

export function isUnlocked(a: Achievement, s: Stats): boolean {
  const [cur, goal] = a.progress(s);
  return cur >= goal;
}

/** Marks newly earned achievements and returns them (for the "unlocked" toast). */
export function awardAchievements(stats: Stats, now: number): { stats: Stats; unlocked: Achievement[] } {
  const unlocked = ACHIEVEMENTS.filter((a) => !(a.id in stats.achievements) && isUnlocked(a, stats));
  if (unlocked.length === 0) return { stats, unlocked };
  const achievements = { ...stats.achievements };
  for (const a of unlocked) achievements[a.id] = now;
  return { stats: { ...stats, achievements }, unlocked };
}
