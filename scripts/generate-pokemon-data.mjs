#!/usr/bin/env node
// Builds src/data/pokemon-index.json from PokéAPI so IDs and names are never hand-typed.
// Run with: npm run generate:pokemon
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const GRAPHQL = 'https://beta.pokeapi.co/graphql/v1beta';
const ARTWORK = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

// Alternate forms we include in Hard mode, matched against PokéAPI's pokemon slugs.
// Cosmetic variants such as pikachu-alola-cap are excluded by anchoring each pattern.
const FORM_RULES = [
  { re: /^(.+)-mega-([xyz])$/, label: (base, m) => `Mega ${base} ${m[2].toUpperCase()}` },
  { re: /^(.+)-mega$/, label: (base) => `Mega ${base}` },
  { re: /^(.+)-primal$/, label: (base) => `Primal ${base}` },
  { re: /^(.+)-alola$/, label: (base) => `Alolan ${base}` },
  { re: /^(.+)-galar(-standard)?$/, label: (base) => `Galarian ${base}` },
  { re: /^(.+)-hisui$/, label: (base) => `Hisuian ${base}` },
  { re: /^(.+)-paldea$/, label: (base) => `Paldean ${base}` },
  {
    re: /^(.+)-paldea-(combat|blaze|aqua)-breed$/,
    label: (base, m) => `Paldean ${base} (${m[2][0].toUpperCase()}${m[2].slice(1)})`,
  },
];

async function getJson(url, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}

async function exists(url) {
  const res = await fetch(url, { method: 'HEAD' });
  return res.ok;
}

async function main() {
  // English species names in one query (language 9 = English).
  const gql = await getJson(GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query:
        '{ pokemon_v2_pokemonspeciesname(where:{language_id:{_eq:9}}, order_by:{pokemon_species_id:asc}){ name pokemon_species_id pokemon_v2_pokemonspecy { name } } }',
    }),
  });
  const speciesRows = gql.data.pokemon_v2_pokemonspeciesname;
  const species = speciesRows.map((r) => [r.pokemon_species_id, r.name]);
  const nameBySlug = new Map(speciesRows.map((r) => [r.pokemon_v2_pokemonspecy.name, r]));

  const list = await getJson(`${API}/pokemon?limit=5000`);
  const candidates = [];
  for (const { name, url } of list.results) {
    const id = Number(url.match(/\/(\d+)\/$/)[1]);
    if (id < 10000) continue;
    for (const rule of FORM_RULES) {
      const m = name.match(rule.re);
      if (!m) continue;
      const baseRow = nameBySlug.get(m[1]);
      if (!baseRow) break;
      candidates.push({ id, label: rule.label(baseRow.name, m), speciesId: baseRow.pokemon_species_id });
      break;
    }
  }

  const forms = [];
  for (const c of candidates) {
    if (await exists(ARTWORK(c.id))) forms.push([c.id, c.label, c.speciesId]);
    else console.warn(`skip ${c.label} (#${c.id}): no official artwork`);
  }

  // Types and the generation that introduced each Pokémon or form, for filters and hints.
  const ids = [...species.map(([id]) => id), ...forms.map(([id]) => id)];
  const details = await getJson(GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `{ pokemon_v2_pokemon(where:{id:{_in:[${ids.join(',')}]}}){ id pokemon_v2_pokemontypes(order_by:{slot:asc}){ pokemon_v2_type{ name } } pokemon_v2_pokemonforms(order_by:{id:asc}){ pokemon_v2_versiongroup{ generation_id } } pokemon_v2_pokemonspecy{ generation_id } } }`,
    }),
  });
  const info = new Map(
    details.data.pokemon_v2_pokemon.map((p) => [
      p.id,
      {
        types: p.pokemon_v2_pokemontypes.map((t) => t.pokemon_v2_type.name),
        gen:
          p.id > 10000
            ? p.pokemon_v2_pokemonforms[0]?.pokemon_v2_versiongroup.generation_id ?? p.pokemon_v2_pokemonspecy.generation_id
            : p.pokemon_v2_pokemonspecy.generation_id,
      },
    ]),
  );
  // PokéAPI's GraphQL database can lag the REST API (e.g. the newest Megas); fill gaps from REST.
  for (const id of ids.filter((id) => !info.has(id))) {
    const p = await getJson(`${API}/pokemon/${id}`);
    const form = await getJson(p.forms[0].url);
    const versionGroup = await getJson(form.version_group.url);
    info.set(id, {
      types: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      gen: Number(versionGroup.generation.url.match(/\/(\d+)\/$/)[1]),
    });
  }

  const withInfo = (row) => {
    const d = info.get(row[0]);
    if (!d) throw new Error(`No type/generation data for #${row[0]}`);
    return [...row, d.gen, d.types];
  };

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    // [id, name, generation, types]
    species: species.map(withInfo),
    // [id, name, speciesId, generation, types]
    forms: forms.map(withInfo),
  };
  await writeFile(new URL('../src/data/pokemon-index.json', import.meta.url), JSON.stringify(out) + '\n');
  console.log(`species: ${species.length}, forms: ${forms.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
