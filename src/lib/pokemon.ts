import { PokemonData, Difficulty } from './game-state';
import { getPokemonPool } from '@/data/pokemon-difficulty';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

const pokemonCache = new Map<number, PokemonData>();

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPokemonName(rawName: string): string {
  // Mega forms with suffix: "charizard-mega-x" -> "Mega Charizard X"
  if (rawName.includes('-mega-')) {
    const parts = rawName.split('-mega-');
    return `Mega ${capitalize(parts[0])} ${parts[1].toUpperCase()}`;
  }
  // Mega forms without suffix: "gengar-mega" -> "Mega Gengar"
  if (rawName.endsWith('-mega')) {
    return `Mega ${capitalize(rawName.replace('-mega', ''))}`;
  }

  // Primal forms: "groudon-primal" -> "Primal Groudon"
  if (rawName.endsWith('-primal')) {
    return `Primal ${capitalize(rawName.replace('-primal', ''))}`;
  }

  // Regional forms
  const regionalSuffixes: Record<string, string> = {
    '-alola': 'Alolan',
    '-galar': 'Galarian',
    '-hisui': 'Hisuian',
    '-paldea': 'Paldean',
  };
  for (const [suffix, prefix] of Object.entries(regionalSuffixes)) {
    if (rawName.endsWith(suffix)) {
      const baseName = rawName.slice(0, -suffix.length);
      return `${prefix} ${capitalize(baseName)}`;
    }
  }

  // Paldean combat/blaze/aqua breed tauros: "tauros-paldea-combat-breed" -> "Paldean Tauros (Combat)"
  if (rawName.includes('-paldea-')) {
    const parts = rawName.split('-paldea-');
    const breedType = capitalize(parts[1].replace('-breed', ''));
    return `Paldean ${capitalize(parts[0])} (${breedType})`;
  }

  // Default: capitalize and replace hyphens with spaces
  return rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/-/g, ' ');
}

export async function fetchPokemon(id: number): Promise<PokemonData> {
  const cached = pokemonCache.get(id);
  if (cached) return cached;

  const res = await fetch(`${POKEAPI_BASE}/pokemon/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch Pokemon #${id}`);

  const data = await res.json();
  const pokemon: PokemonData = {
    id: data.id,
    name: formatPokemonName(data.name),
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
  const available = pool.filter((pid) => !excludeIds.includes(pid));
  const pickFrom = available.length > 0 ? available : pool;
  const id = pickFrom[Math.floor(Math.random() * pickFrom.length)];

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
