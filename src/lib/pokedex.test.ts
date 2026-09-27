import { describe, expect, it } from 'vitest';
import { DEX_ORDER, cryUrl, getPokemon, getPokemonInfo, getPokemonPool, isCorrectGuess, normalizeName, pickRandomPokemon, searchPokemonNames, speciesOf } from './pokedex';
import { buildHint, hintStage } from './hints';

describe('names', () => {
  it('uses official display names', () => {
    expect(getPokemon(122)?.name).toBe('Mr. Mime');
    expect(getPokemon(386)?.name).toBe('Deoxys');
    expect(getPokemon(772)?.name).toBe('Type: Null');
    expect(getPokemon(10034)?.name).toBe('Mega Charizard X');
    expect(getPokemon(10100)?.name).toBe('Alolan Raichu');
  });

  it('normalizes punctuation, accents and gender symbols', () => {
    expect(normalizeName('Mr. Mime')).toBe('mrmime');
    expect(normalizeName('Flabébé')).toBe('flabebe');
    expect(normalizeName('Nidoran♀')).toBe('nidoranf');
  });

  it('accepts a guess that matches apart from formatting only', () => {
    expect(isCorrectGuess('mr mime', 'Mr. Mime')).toBe(true);
    expect(isCorrectGuess('  PIKACHU ', 'Pikachu')).toBe(true);
    expect(isCorrectGuess('farfetchd', 'Farfetch’d')).toBe(true);
    expect(isCorrectGuess('Raichu', 'Alolan Raichu')).toBe(false);
    expect(isCorrectGuess('', 'Pikachu')).toBe(false);
  });
});

describe('autocomplete', () => {
  it('lists names starting with the typed letters alphabetically', () => {
    const results = searchPokemonNames('char');
    expect(results.slice(0, 4)).toEqual(['Charcadet', 'Charizard', 'Charjabug', 'Charmander']);
  });

  it('also offers forms whose later word matches', () => {
    expect(searchPokemonNames('char', 20)).toContain('Mega Charizard X');
  });

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchPokemonNames('   ')).toEqual([]);
    expect(searchPokemonNames('s', 5)).toHaveLength(5);
  });
});

describe('pools', () => {
  it('contain no duplicates and only known Pokémon', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const pool = getPokemonPool(difficulty);
      expect(new Set(pool).size).toBe(pool.length);
      expect(pool.every((id) => getPokemon(id) !== null)).toBe(true);
    }
  });

  it('keeps alternate forms out of Easy and Medium', () => {
    expect(getPokemonPool('easy').every((id) => id < 10000)).toBe(true);
    expect(getPokemonPool('medium').every((id) => id < 10000)).toBe(true);
    expect(getPokemonPool('hard').some((id) => id > 10000)).toBe(true);
  });

  it('avoids repeats until the pool runs out', () => {
    const easy = getPokemonPool('easy');
    const all = easy.slice(0, -1);
    expect(pickRandomPokemon('easy', all).id).toBe(easy[easy.length - 1]);
  });
});

describe('filters', () => {
  it('narrows by generation and type', () => {
    const kanto = getPokemonPool('hard', { generations: [1], types: [] });
    expect(kanto).toHaveLength(151);
    const fireOrWater = getPokemonPool('easy', { generations: [], types: ['fire', 'water'] });
    expect(fireOrWater.length).toBeGreaterThan(0);
    expect(fireOrWater.every((id) => getPokemonInfo(id)!.types.some((t) => t === 'fire' || t === 'water'))).toBe(true);
  });

  it('uses the generation that introduced a form', () => {
    expect(getPokemonInfo(10100)).toEqual({ generation: 7, types: ['electric', 'psychic'] });
  });

  it('falls back to the whole difficulty when a filter matches nothing', () => {
    const none = { generations: [9], types: ['fire'] };
    expect(getPokemonPool('easy', { generations: [1], types: ['dragon', 'ice'] }).length).toBeGreaterThan(0);
    const pick = pickRandomPokemon('easy', [], { generations: [], types: [] });
    expect(pick).toBeTruthy();
    expect(getPokemonPool('easy', none).every((id) => getPokemonInfo(id)!.generation === 9)).toBe(true);
  });
});

describe('hints', () => {
  const mrMime = getPokemon(122)!;
  it('unlocks in stages as time runs down', () => {
    expect(hintStage(60_000, 60_000)).toBe(0);
    expect(hintStage(30_000, 60_000)).toBe(1);
    expect(hintStage(15_000, 60_000)).toBe(2);
  });

  it('shows blanks, then type and generation, then the first letter', () => {
    expect(buildHint(mrMime, 0)).toEqual({ blanks: ['_', '_', '.', ' ', '_', '_', '_', '_'] });
    expect(buildHint(mrMime, 1)).toMatchObject({ types: ['psychic', 'fairy'], generation: 1, region: 'Kanto' });
    expect(buildHint(mrMime, 2).blanks.join('')).toBe('M_. ____');
  });
});

describe('cries', () => {
  it('uses the PokeAPI cry for a Pokémon and knows each form’s species', () => {
    expect(cryUrl(25)).toBe('https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg');
    const megaVenusaur = DEX_ORDER.find((e) => e.name === 'Mega Venusaur')!;
    expect(speciesOf(megaVenusaur.id)).toBe(3);
    expect(speciesOf(25)).toBe(25);
  });
});
