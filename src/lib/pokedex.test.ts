import { describe, expect, it } from 'vitest';
import { getPokemon, getPokemonPool, isCorrectGuess, normalizeName, pickRandomPokemon, searchPokemonNames } from './pokedex';

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
