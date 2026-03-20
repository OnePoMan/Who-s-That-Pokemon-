# Who's That Pokemon? - Draw & Guess Edition

A multiplayer Pokemon drawing and guessing game built with Next.js 16, TypeScript, and Tailwind CSS.

## How to Play

1. **Choose a mode**: Local (pass the device) or Remote (WebRTC peer-to-peer)
2. **Set up players**: Pick nicknames and avatars
3. **Configure game**: Choose difficulty and timer duration
4. **Draw phase**: The drawer sees a Pokemon for 5 seconds, then draws it from memory
5. **Guess phase**: The guesser types guesses to identify the Pokemon
6. **Score**: First to 3 correct guesses wins!

## Features

- Full drawing toolkit: pen, eraser, flood fill, undo/redo, color palette, brush sizes
- 3 difficulty tiers pulling from PokeAPI (1000+ Pokemon)
- Pokemon silhouette reveal animation
- Local multiplayer (pass-the-device) with privacy screens
- Remote multiplayer via WebRTC data channels (no server needed)
- Synthesized sound effects using Web Audio API
- PWA-ready with manifest
- Mobile-optimized with touch drawing support
- Responsive design with Pokemon-themed UI

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 to play.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS 4
- PokeAPI for Pokemon data
- WebRTC for peer-to-peer multiplayer
- Web Audio API for sound effects
