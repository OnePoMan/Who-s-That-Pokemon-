import { getPokemonInfo, REGIONS } from './pokedex';
import type { PokemonData } from './game-state';

// Hints unlock as the drawing timer runs down:
//   stage 0 (from the start): letter blanks, e.g. "_ _ _ _ _ _ _"
//   stage 1 (half the time gone): type and generation
//   stage 2 (last 15 seconds): the first letter
export type HintStage = 0 | 1 | 2;

export interface Hint {
  /** One entry per character: '_' for a hidden letter, otherwise the character itself. */
  blanks: string[];
  types?: string[];
  generation?: number;
  region?: string;
}

const FIRST_LETTER_AT_MS = 15_000;

export function hintStage(remainingMs: number, totalMs: number): HintStage {
  if (remainingMs <= FIRST_LETTER_AT_MS) return 2;
  if (remainingMs <= totalMs / 2) return 1;
  return 0;
}

export function buildHint(pokemon: PokemonData, stage: HintStage): Hint {
  const chars = [...pokemon.name];
  let revealedFirst = false;
  const blanks = chars.map((c) => {
    if (!/\p{L}|\p{N}/u.test(c)) return c;
    if (stage >= 2 && !revealedFirst) {
      revealedFirst = true;
      return c.toUpperCase();
    }
    return '_';
  });
  if (stage === 0) return { blanks };
  const info = getPokemonInfo(pokemon.id);
  return {
    blanks,
    types: info?.types,
    generation: info?.generation,
    region: info ? REGIONS[info.generation] : undefined,
  };
}
