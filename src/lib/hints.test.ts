import { describe, expect, it } from 'vitest';
import { buildHint, hintStage } from './hints';
import { getPokemon } from './pokedex';

const pokemon = (id: number) => getPokemon(id)!;

describe('hintStage', () => {
  const total = 60_000;

  it('starts at stage 0', () => {
    expect(hintStage(total, total)).toBe(0);
    expect(hintStage(total / 2 + 1, total)).toBe(0);
  });

  it('moves to stage 1 once half the time is gone', () => {
    expect(hintStage(total / 2, total)).toBe(1);
    expect(hintStage(16_000, total)).toBe(1);
  });

  it('moves to stage 2 for the last 15 seconds', () => {
    expect(hintStage(15_001, total)).toBe(1);
    expect(hintStage(15_000, total)).toBe(2);
    expect(hintStage(0, total)).toBe(2);
  });

  it('never reaches the type stage when the round is shorter than 30 seconds', () => {
    expect(hintStage(20_000, 25_000)).toBe(0);
    expect(hintStage(15_000, 25_000)).toBe(2);
  });
});

describe('buildHint', () => {
  it('shows only blanks at stage 0', () => {
    const hint = buildHint(pokemon(25), 0);
    expect(hint.blanks).toEqual(['_', '_', '_', '_', '_', '_', '_']);
    expect(hint.types).toBeUndefined();
    expect(hint.generation).toBeUndefined();
    expect(hint.region).toBeUndefined();
  });

  it('adds type, generation and region at stage 1 without revealing a letter', () => {
    const hint = buildHint(pokemon(25), 1);
    expect(hint.blanks.every((c) => c === '_')).toBe(true);
    expect(hint.types).toEqual(['electric']);
    expect(hint.generation).toBe(1);
    expect(hint.region).toBe('Kanto');
  });

  it('reveals the first letter, capitalised, at stage 2', () => {
    const hint = buildHint(pokemon(25), 2);
    expect(hint.blanks).toEqual(['P', '_', '_', '_', '_', '_', '_']);
    expect(hint.types).toEqual(['electric']);
  });

  it('keeps punctuation and spaces visible and only reveals one letter', () => {
    const name = pokemon(122).name; // Mr. Mime
    const hint = buildHint(pokemon(122), 2);
    expect(hint.blanks).toHaveLength([...name].length);
    expect(hint.blanks.join('')).toBe('M_. ____');
    expect(buildHint(pokemon(122), 0).blanks.join('')).toBe('__. ____');
  });
});
