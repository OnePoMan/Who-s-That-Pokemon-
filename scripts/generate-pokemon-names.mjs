#!/usr/bin/env node
// Builds src/data/pokemon-names-i18n.json (localized species names) from PokéAPI's bulk CSV, so
// one download replaces 1,000+ API calls. Run with: npm run generate:names
// Forms are not stored: the app derives a form's name from its species' localized name.
import { readFile, writeFile } from 'node:fs/promises';

const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';

// PokéAPI language ids (languages.csv) -> output column. Order here is the order of each row.
// 1 ja-Hrkt is katakana; the plain "ja" (11) is kanji and unused for Pokémon names.
const LANGUAGES = [
  ['ja', 1],
  ['ja-roomaji', 2],
  ['fr', 5],
  ['de', 6],
  ['es', 7],
  ['it', 8],
  ['ko', 3],
  ['zh-Hans', 12],
  ['zh-Hant', 4],
];
const ENGLISH = 9;

/** Minimal RFC 4180 parser (quoted fields, doubled quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const res = await fetch(CSV);
  if (!res.ok) throw new Error(`${res.status} ${CSV}`);
  const [header, ...rows] = parseCsv(await res.text());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const byId = new Map(); // species id -> Map(language id -> name)
  for (const r of rows) {
    const id = Number(r[col.pokemon_species_id]);
    if (!byId.has(id)) byId.set(id, new Map());
    byId.get(id).set(Number(r[col.local_language_id]), r[col.name]);
  }

  const index = JSON.parse(await readFile(new URL('../src/data/pokemon-index.json', import.meta.url), 'utf8'));
  const speciesIds = index.species.map((s) => s[0]);
  const maxId = Math.max(...speciesIds);

  // names[id - 1] = [ja, ja-roomaji, fr, de, es, it, ko, zh-Hans, zh-Hant]. A name identical to
  // the English one is stored as "" to keep the file small (the app falls back to English).
  const names = [];
  const missing = Object.fromEntries(LANGUAGES.map(([l]) => [l, 0]));
  for (let id = 1; id <= maxId; id++) {
    const m = byId.get(id);
    if (!m || !speciesIds.includes(id)) throw new Error(`No names for species #${id}`);
    const en = m.get(ENGLISH);
    names.push(
      LANGUAGES.map(([lang, langId]) => {
        const n = m.get(langId) ?? '';
        if (!n) missing[lang]++;
        return n === en ? '' : n;
      }),
    );
  }
  const out = { generatedAt: new Date().toISOString().slice(0, 10), languages: LANGUAGES.map(([l]) => l), names };
  await writeFile(new URL('../src/data/pokemon-names-i18n.json', import.meta.url), JSON.stringify(out) + '\n');
  console.log(`species: ${names.length}; missing per language:`, missing);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
