#!/usr/bin/env node
// Renders the app icons from one SVG. Run with: npm run generate:icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// A capture ball with a pencil across it. `inset` shrinks the artwork for maskable icons,
// whose outer 20% may be cropped by the launcher.
function svg({ inset = 0, rounded = true } = {}) {
  const s = 512;
  const r = (s / 2) * (0.78 - inset);
  const c = s / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="#E8E0D0"/>
  <clipPath id="top"><rect x="0" y="0" width="${s}" height="${c}"/></clipPath>
  <circle cx="${c}" cy="${c}" r="${r}" fill="#FFF8E7" stroke="#2B2B2B" stroke-width="${r * 0.09}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="#DC0A2D" clip-path="url(#top)" stroke="#2B2B2B" stroke-width="${r * 0.09}"/>
  <rect x="${c - r}" y="${c - r * 0.07}" width="${r * 2}" height="${r * 0.14}" fill="#2B2B2B"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.28}" fill="#FFF8E7" stroke="#2B2B2B" stroke-width="${r * 0.09}"/>
  <g transform="translate(${c + r * 0.35} ${c + r * 0.35}) rotate(45)">
    <rect x="${-r * 0.1}" y="${-r * 0.75}" width="${r * 0.2}" height="${r * 0.9}" rx="${r * 0.03}" fill="#FFDE00" stroke="#2B2B2B" stroke-width="${r * 0.05}"/>
    <path d="M ${-r * 0.1} ${r * 0.15} L 0 ${r * 0.38} L ${r * 0.1} ${r * 0.15} Z" fill="#F5D6A8" stroke="#2B2B2B" stroke-width="${r * 0.05}" stroke-linejoin="round"/>
    <path d="M ${-r * 0.035} ${r * 0.3} L 0 ${r * 0.38} L ${r * 0.035} ${r * 0.3} Z" fill="#2B2B2B"/>
  </g>
</svg>`;
}

async function render(file, size, opts) {
  await sharp(Buffer.from(svg(opts))).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`wrote ${file}`);
}

await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });
const out = (p) => new URL(`../${p}`, import.meta.url).pathname;
await render(out('public/icons/icon-192.png'), 192);
await render(out('public/icons/icon-512.png'), 512);
await render(out('public/icons/maskable-512.png'), 512, { inset: 0.14, rounded: false });
await render(out('src/app/icon.png'), 192);
await render(out('src/app/apple-icon.png'), 180, { rounded: false });
