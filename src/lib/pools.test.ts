import { describe, expect, it } from 'vitest';
import { parseFavourites, toggleFavourite } from './favourites';
import { getPokemonPool } from './pokedex';
import { getCustomPool, pickForSettings, pickWeakest, rankWeakest } from './pools';

const NONE = { generations: [], types: [] };

describe('favourites', () => {
  it('toggles an ID in and out, keeping the list sorted', () => {
    expect(toggleFavourite([6, 25], 4)).toEqual([4, 6, 25]);
    expect(toggleFavourite([4, 6, 25], 6)).toEqual([4, 25]);
  });

  it('drops malformed or unknown stored values', () => {
    expect(parseFavourites('nope')).toEqual([]);
    expect(parseFavourites([25, 25, '6', -1, 99999999, null, 1])).toEqual([1, 25]);
  });
});

describe('getCustomPool', () => {
  it('is the ordinary pool unless favourites are requested', () => {
    expect(getCustomPool('easy', NONE, [25])).toEqual(getPokemonPool('easy', NONE));
  });

  it('intersects favourites with difficulty and filters', () => {
    const settings = { ...NONE, favouritesOnly: true };
    // 25 Pikachu and 6 Charizard are both easy; 906 (Sprigatito) is gen 9.
    expect(getCustomPool('easy', settings, [25, 6, 906])).toEqual(expect.arrayContaining([25, 6]));
    expect(getCustomPool('easy', { ...settings, types: ['fire'] }, [25, 6])).toEqual([6]);
    expect(getCustomPool('easy', { ...settings, generations: [9] }, [25, 6])).toEqual([]);
    expect(getCustomPool('easy', settings, [])).toEqual([]);
  });
});

describe('pickForSettings', () => {
  it('only picks favourites when asked, avoiding recent ones', () => {
    const settings = { ...NONE, favouritesOnly: true };
    for (let i = 0; i < 20; i++) {
      expect([25, 6]).toContain(pickForSettings('easy', [], settings, [25, 6]).id);
      expect(pickForSettings('easy', [25], settings, [25, 6]).id).toBe(6);
    }
  });

  it('repeats when every favourite was used already', () => {
    expect(pickForSettings('easy', [25], { ...NONE, favouritesOnly: true }, [25]).id).toBe(25);
  });

  it('falls back to the ordinary pool when no favourite matches', () => {
    const pick = pickForSettings('easy', [], { ...NONE, favouritesOnly: true }, []);
    expect(getPokemonPool('easy')).toContain(pick.id);
  });
});

describe('weakest', () => {
  it('ranks most-missed first, then by ID, ignoring junk', () => {
    expect(rankWeakest({ 25: 2, 6: 5, 4: 2, 7: 0, 99999999: 3 })).toEqual([
      { pokemonId: 6, misses: 5 },
      { pokemonId: 4, misses: 2 },
      { pokemonId: 25, misses: 2 },
    ]);
  });

  it('has nothing to pick when nothing was missed', () => {
    expect(pickWeakest({})).toBeNull();
  });

  it('weights the pick by misses', () => {
    const missed = { 6: 3, 25: 1 }; // total weight 4: Charizard owns [0, 3), Pikachu [3, 4)
    expect(pickWeakest(missed, [], () => 0)?.id).toBe(6);
    expect(pickWeakest(missed, [], () => 0.74)?.id).toBe(6);
    expect(pickWeakest(missed, [], () => 0.75)?.id).toBe(25);
    expect(pickWeakest(missed, [], () => 0.999)?.id).toBe(25);
  });

  it('skips recent ones unless they are all that is left', () => {
    expect(pickWeakest({ 6: 3, 25: 1 }, [6], () => 0)?.id).toBe(25);
    expect(pickWeakest({ 6: 3 }, [6], () => 0)?.id).toBe(6);
  });
});
