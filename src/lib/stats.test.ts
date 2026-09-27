import { describe, expect, it } from 'vitest';
import { MEDIUM_POKEMON_IDS } from '@/data/pokemon-difficulty';
import { dailyNumber, dailyPokemon, dateKey, formatDuration, previousDay } from './daily';
import {
  ACHIEVEMENTS,
  EMPTY_STATS,
  awardAchievements,
  currentDailyStreak,
  mostDrawn,
  parseStats,
  recordDaily,
  recordGame,
  recordRound,
  recordSolo,
} from './stats';
import { DEX_ORDER } from './pokedex';

describe('daily challenge', () => {
  it('numbers days from the first challenge', () => {
    expect(dailyNumber('2026-09-01')).toBe(1);
    expect(dailyNumber('2026-09-27')).toBe(27);
    expect(dailyNumber('2027-09-01')).toBe(366);
  });

  it('is the same Pokémon all day and never repeats within a full cycle', () => {
    expect(dailyPokemon('2026-10-05')).toEqual(dailyPokemon('2026-10-05'));
    const seen = new Set<number>();
    const start = new Date(2026, 8, 1);
    for (let i = 0; i < MEDIUM_POKEMON_IDS.length; i++) {
      seen.add(dailyPokemon(dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))).id);
    }
    expect(seen.size).toBe(MEDIUM_POKEMON_IDS.length);
  });

  it('handles month and year boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(formatDuration(62_400)).toBe('1:02');
  });
});

describe('stats', () => {
  it('counts rounds, discoveries and streaks', () => {
    let s = recordRound(EMPTY_STATS, { pokemonId: 25, outcome: 'correct', quick: true, streak: 2 });
    s = recordRound(s, { pokemonId: 25, outcome: 'timeout', quick: true, streak: 1 });
    s = recordSolo(s, 1);
    expect(s).toMatchObject({ roundsPlayed: 2, roundsGuessed: 1, quickDraws: 1, bestStreak: 2, soloDrawings: 1, discovered: [25, 1] });
    expect(mostDrawn(s)).toEqual([
      { pokemonId: 25, count: 2 },
      { pokemonId: 1, count: 1 },
    ]);
  });

  it('only counts online wins for multi-phone games', () => {
    let s = recordGame(EMPTY_STATS, { players: 6, online: false, won: true });
    s = recordGame(s, { players: 2, online: true, won: true });
    expect(s).toMatchObject({ gamesPlayed: 2, onlineGames: 1, onlineWins: 1, biggestParty: 6 });
  });

  it('keeps the daily streak going on consecutive days and resets after a gap', () => {
    const day = (date: string) => ({ date, pokemonId: 25, timeMs: 40_000, drawingId: null });
    let s = recordDaily(EMPTY_STATS, day('2026-09-01'));
    s = recordDaily(s, day('2026-09-02'));
    s = recordDaily(s, day('2026-09-02')); // a second go the same day changes nothing
    expect(s.daily).toMatchObject({ streak: 2, best: 2, played: 2, last: '2026-09-02' });
    expect(currentDailyStreak(s, '2026-09-03')).toBe(2);
    expect(currentDailyStreak(s, '2026-09-04')).toBe(0);
    s = recordDaily(s, day('2026-09-05'));
    expect(s.daily).toMatchObject({ streak: 1, best: 2 });
  });

  it('awards each badge once', () => {
    const s = recordRound(EMPTY_STATS, { pokemonId: 25, outcome: 'correct', quick: true, streak: 3 });
    const first = awardAchievements(s, 1000);
    expect(first.unlocked.map((a) => a.id)).toEqual(['first-sketch', 'quick-draw', 'streak-3']);
    expect(awardAchievements(first.stats, 2000).unlocked).toEqual([]);
  });

  it('can unlock every badge', () => {
    const s = {
      ...EMPTY_STATS,
      gamesPlayed: 10,
      onlineGames: 1,
      onlineWins: 1,
      biggestParty: 5,
      quickDraws: 1,
      bestStreak: 5,
      soloDrawings: 10,
      discovered: DEX_ORDER.map((e) => e.id),
      daily: { ...EMPTY_STATS.daily, played: 7, best: 7 },
    };
    expect(awardAchievements(s, 1).unlocked).toHaveLength(ACHIEVEMENTS.length);
  });

  it('drops malformed stored data', () => {
    const s = parseStats({
      gamesPlayed: -3,
      roundsPlayed: 'lots',
      discovered: [25, 25, 999999, 'x'],
      drawnCount: { 25: 2, 999999: 5 },
      achievements: { 'first-sketch': 5, bogus: 1 },
      daily: { last: 'yesterday', streak: 4, result: { date: '2026-09-01', pokemonId: 25, timeMs: 1000, drawingId: 'x' } },
    });
    expect(s).toMatchObject({ gamesPlayed: 0, roundsPlayed: 0, discovered: [25], drawnCount: { 25: 2 }, achievements: { 'first-sketch': 5 } });
    expect(s.daily).toMatchObject({ last: null, streak: 4, result: { date: '2026-09-01', pokemonId: 25, drawingId: null } });
    expect(parseStats('nonsense')).toEqual(EMPTY_STATS);
  });

  it('lists all 1175 Pokémon and forms in the Pokédex', () => {
    expect(DEX_ORDER).toHaveLength(1175);
    expect(DEX_ORDER[0]).toMatchObject({ id: 1, number: 1, name: 'Bulbasaur' });
    const megaVenusaur = DEX_ORDER.findIndex((e) => e.name === 'Mega Venusaur');
    expect(DEX_ORDER[megaVenusaur - 1].name).toBe('Venusaur');
  });
});
