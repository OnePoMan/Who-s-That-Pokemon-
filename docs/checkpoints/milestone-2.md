# Checkpoint: Milestone 2 — Multilingual guessing, favourites pools, live lobby teams

Date: 2026-10-11 · Branch: `ccr-a68e1130-5opb36` · PR #9

## Milestone 1 decisions applied

- CI audit is limited to production dependencies (`npm audit --omit=dev --audit-level=high`).
- Protocol version 3 → 4. A host and guest on mismatched versions get a "reload" message on both sides.
- Team assignments are broadcast live in the multi-phone lobby. Guests and TV screens see them read-only.
- PR #9 is watched for CI results and review comments.

## Completed

| Track | Summary |
|---|---|
| Multilingual guessing | Guesses are accepted in ja (katakana, hiragana, half-width), rōmaji, fr, de, es, it, ko, zh-Hans, zh-Hant. Names come from PokéAPI's `pokemon_species_names.csv` via `npm run generate:names`. The data file is 42 KB gzip and lazy-loaded. A "Name language" device setting controls dropdown suggestions and adds a localized name line on the reveal. The host judges in every language, whatever its own setting. Hints stay English. |
| Favourites pools | Star toggle in the Pokédex detail view and a Favourites chip. A "Pool: All matching / Favourites only" setting in battle settings and solo. It intersects with the other filters, and Start is disabled when the pool is empty. Only the host's favourites matter. |
| Redraw your weakest | Solo "My weakest" pool, built from a new per-Pokémon `missedCount` (rounds this device drew that went unguessed). Picks are weighted by misses. |
| Lobby sync + protocol | `lobby` message carries teams (strict validation: all-or-none, red/blue only, unique ids, 4–8 players). `reject: 'version'` now includes `hostVersion`. |

## Verification (merged branch)

- Lint clean. Typecheck clean.
- `npm test`: 134 passed.
- `npm run test:e2e`: 6 passed.
- Manual Playwright run, one-phone game, language ja, shiny forced: typing ふし suggests フシギダネ / Bulbasaur, a katakana guess is judged correct, and the reveal shows "It's Bulbasaur!" / フシギダネ with the Shiny label. A second run with the language left on English also accepted a hiragana guess (lazy load on the host).
- Lint now ignores `.claude/**`, where the agent worktrees live.

## Assumptions

- Localized form names replace only the species part of the English label ("Mega リザードン X"). An all-Japanese "メガリザードンX" is not accepted.
- The first non-English wrong guess in a session waits on a one-time ~42 KB chunk fetch on the host. If the fetch fails, that guess is judged wrong.
- Favourites live in their own localStorage key and are not cleared by "Delete all progress". Only Pokémon already drawn can be starred, because the star is in the detail view.
- Misses never decay.

## Not verified

- Multi-phone flows over PeerJS: live team sync, version-mismatch messages, cross-language judging between two phones.
- Favourites empty-state UI in the browser.

## Decisions pending

1. Should favourites be clearable with "Delete all progress", and should it be possible to star Pokémon that haven't been drawn yet (from the grid)?
2. Should misses decay once the Pokémon is later guessed?
3. Should all-Japanese form names (メガ…) be accepted?
4. Next milestone candidates: a multi-phone e2e test with two browser contexts and a local PeerJS server; custom word lists shared by invite link; a timelapse GIF/video export of drawings.
