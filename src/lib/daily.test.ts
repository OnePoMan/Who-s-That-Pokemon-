import { describe, expect, it } from 'vitest';
import { dailyNumber, dailyPokemon, dateKey, formatDuration, msUntilTomorrow, previousDay } from './daily';
import { MEDIUM_POKEMON_IDS } from '@/data/pokemon-difficulty';

describe('dateKey', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('dailyNumber', () => {
  it('counts challenges from #1 on 2026-09-01', () => {
    expect(dailyNumber('2026-09-01')).toBe(1);
    expect(dailyNumber('2026-09-02')).toBe(2);
    expect(dailyNumber('2026-10-01')).toBe(31);
  });
});

describe('dailyPokemon', () => {
  it('is deterministic for a given date', () => {
    expect(dailyPokemon('2026-10-11')).toEqual(dailyPokemon('2026-10-11'));
  });

  it('always comes from the medium pool', () => {
    for (let day = 1; day <= 60; day++) {
      const key = dateKey(new Date(2026, 8, day));
      expect(MEDIUM_POKEMON_IDS).toContain(dailyPokemon(key).id);
    }
  });

  it('never repeats on consecutive days and cycles through the whole pool before repeating', () => {
    const n = MEDIUM_POKEMON_IDS.length;
    const seen = new Set<number>();
    let previous = -1;
    for (let day = 0; day < n; day++) {
      const id = dailyPokemon(dateKey(new Date(2026, 8, 1 + day))).id;
      expect(id).not.toBe(previous);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      previous = id;
    }
    expect(seen.size).toBe(n);
  });

  it('also works for dates before the first challenge', () => {
    expect(MEDIUM_POKEMON_IDS).toContain(dailyPokemon('2026-08-01').id);
  });
});

describe('previousDay', () => {
  it('crosses month and year boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });
});

describe('msUntilTomorrow', () => {
  it('counts down to local midnight', () => {
    expect(msUntilTomorrow(new Date(2026, 9, 11, 23, 0, 0))).toBe(3_600_000);
    expect(msUntilTomorrow(new Date(2026, 9, 11, 23, 59, 59))).toBe(1_000);
  });
});

describe('formatDuration', () => {
  it('formats m:ss and clamps negatives', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(-5_000)).toBe('0:00');
  });
});
