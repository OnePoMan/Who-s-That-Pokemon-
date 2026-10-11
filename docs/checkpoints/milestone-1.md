# Checkpoint: Milestone 1 — Shiny reveals, team mode, QA hardening

Date: 2026-10-11 · Branch: `ccr-a68e1130-5opb36`

Three worker agents built the tracks in parallel, each in its own isolated worktree. The lead agent reviewed each diff, merged them, and ran the full checks on the merged result.

## Completed

| Track | Summary | Commit |
|---|---|---|
| Shiny reveals | 1-in-64 shiny roll at pick time; the host's roll is what every phone and TV shows. Reveal, TV and share cards use PokeAPI's `official-artwork/shiny/<id>.png`, with a sparkle and a "Shiny!" label (sparkle is static under reduced motion). The protocol accepts only a boolean `shiny` flag. Pokédex marker and a "Shiny Hunter" badge. The drawer memorizes the normal artwork. | `ce33a4f` |
| QA hardening | Playwright smoke tests (phone + desktop: first-visit guide, then a one-phone game from setup through drawing to the reveal), all third-party requests stubbed. New CI `e2e` job. `app/error.tsx` + `app/global-error.tsx`. Settings popover dialog semantics, focus rings on the guess box and colour picker. Unit tests for `hints` and `daily`. | `75f7653` |
| Team mode | Optional Red vs Blue for 4+ players: auto-balanced, tap a player to swap teams, 2+ players per team to start. Drawer order alternates teams. A correct guess scores for the guesser's team (own team or "steal"). Team scoreboard on reveal, game over and TV. All logic is pure, in the reducer, with unit tests. | `1a03de2` |
| Dependencies | `next` and `eslint-config-next` 16.3.6 → 16.3.8 (fixes six high-severity Next.js advisories). | this commit |

## Verification (on the merged branch)

- `npm run lint`: 0 problems. `npm run typecheck`: clean.
- `npm test`: 97 unit tests pass. `npm run build`: OK.
- `npm run test:e2e`: 6 passed.
- Manual Playwright run (4 players, teams on, shiny forced): screenshots confirmed the Teams row, the team picker, the "who got it? — their team scores" picker, team score cards, the "Shiny!" label, and that the image loaded is `official-artwork/shiny/1.png`.

## Blockers and assumptions

- **`npm audit --audit-level=high` still fails (also fails on `main`).** The remaining 5 findings are all one chain: `braces` (GHSA-vfj7-8cjw-p6xm, affects every published version) pulled in by `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`. There is no patched version, and it is a dev-only lint dependency. `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities.
- Uneven teams (5 or 7 players): drawers alternate while both teams have turns left, then the bigger team draws back to back at the end.
- `PROTOCOL_VERSION` was not bumped. A guest running an older version can still join, but doesn't see team info or shiny reveals.
- Multi-phone: guests see team rosters once the game starts, not while the host is assigning teams in the lobby.
- Not tested: multi-phone or PeerJS flows end to end, rendering of the error boundary UI, and the CI `e2e` job (it can only run on GitHub).

## Decisions pending

1. Audit gate: change CI to `npm audit --omit=dev --audit-level=high`, or keep the full audit and wait for an upstream `braces` fix?
2. Broadcast team assignments to guests while still in the lobby?
3. Bump `PROTOCOL_VERSION` so older clients are rejected instead of quietly losing teams and shiny?
4. Next milestone candidates not chosen this round: multilingual guessing, custom Pokémon pools / "redraw your weakest" practice.
