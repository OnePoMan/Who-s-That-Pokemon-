import { PokemonData, Difficulty } from './game-state';
import { getPokemonPool } from '@/data/pokemon-difficulty';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025; // Through Gen 9

const pokemonCache = new Map<number, PokemonData>();

export async function fetchPokemon(id: number): Promise<PokemonData> {
  const cached = pokemonCache.get(id);
  if (cached) return cached;

  const res = await fetch(`${POKEAPI_BASE}/pokemon/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch Pokemon #${id}`);

  const data = await res.json();
  const pokemon: PokemonData = {
    id: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1).replace(/-/g, ' '),
    spriteUrl: data.sprites.front_default || '',
    artworkUrl:
      data.sprites.other?.['official-artwork']?.front_default ||
      data.sprites.front_default ||
      '',
  };

  pokemonCache.set(id, pokemon);
  return pokemon;
}

export async function getRandomPokemon(
  difficulty: Difficulty,
  excludeIds: number[] = []
): Promise<PokemonData> {
  const pool = getPokemonPool(difficulty);

  let id: number;
  if (pool) {
    const available = pool.filter((pid) => !excludeIds.includes(pid));
    const pickFrom = available.length > 0 ? available : pool;
    id = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  } else {
    // Hard mode: any Pokemon
    do {
      id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
    } while (excludeIds.includes(id));
  }

  return fetchPokemon(id);
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}
