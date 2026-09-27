// Offline support for the installed app.
// - Pages: network first, falling back to the cached copy when offline.
// - Build assets, icons and trainer sprites: cache first (their URLs are versioned or fixed).
// - Official artwork: cache first, capped so the cache cannot grow without bound.
// Everything else (including the matchmaking server) always goes to the network.
const VERSION = 'v1';
const APP_CACHE = `app-${VERSION}`;
const ART_CACHE = `art-${VERSION}`;
const MAX_ART_ENTRIES = 400;
const ARTWORK_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/sprites/';

const TRAINERS = [
  'red', 'blue', 'green', 'ethan', 'lyra', 'brendan', 'may', 'lucas', 'dawn', 'hilbert', 'hilda', 'nate', 'rosa',
  'calem', 'serena', 'cynthia', 'n', 'steven', 'lance', 'misty', 'brock', 'iris', 'leon', 'marnie', 'elesa',
  'clair', 'volkner', 'flannery',
];
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', ...TRAINERS.map((t) => `/trainers/${t}.png`)];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE && k !== ART_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Only store complete, readable responses; opaque ones would bloat the storage quota.
  if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (cacheName === ART_CACHE) void trim(ART_CACHE, MAX_ART_ENTRIES);
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put('/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/trainers/') || url.pathname.startsWith('/icons/')) {
      event.respondWith(cacheFirst(request, APP_CACHE));
    }
    return;
  }
  if (request.url.startsWith(ARTWORK_PREFIX)) {
    event.respondWith(cacheFirst(request, ART_CACHE));
  }
});
