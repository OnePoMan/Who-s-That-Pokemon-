import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Artwork comes from the PokeAPI sprite repository; rooms are brokered by the public PeerJS
// server. The game itself travels over WebRTC, which CSP does not govern.
const ARTWORK = 'https://raw.githubusercontent.com';
const PEER_BROKER = (() => {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  if (!host) return 'https://0.peerjs.com wss://0.peerjs.com';
  const secure = process.env.NEXT_PUBLIC_PEER_SECURE !== 'false';
  const port = process.env.NEXT_PUBLIC_PEER_PORT ? `:${process.env.NEXT_PUBLIC_PEER_PORT}` : '';
  return `${secure ? 'https' : 'http'}://${host}${port} ${secure ? 'wss' : 'ws'}://${host}${port}`;
})();

// Without nonces Next.js needs 'unsafe-inline' for its bootstrap scripts (see the Next.js
// content-security-policy guide). Everything else is locked to the sources above.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${ARTWORK}`,
  "font-src 'self'",
  `connect-src 'self' ${PEER_BROKER} ${ARTWORK}${isDev ? ' ws: http://localhost:*' : ''}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), screen-wake-lock=(self)',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; connect-src 'self' ${ARTWORK}` },
        ],
      },
    ];
  },
};

export default nextConfig;
