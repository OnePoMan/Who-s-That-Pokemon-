'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

// Replaces the root layout when it fails, so it brings its own <html>, <body> and (inline) styles; globals.css
// isn't loaded here. Inline style attributes are allowed by the CSP (style-src 'unsafe-inline').
const button = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 12,
  border: '2px solid #A00020',
  borderBottomWidth: 4,
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
} as const;

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#FFF8E7',
          color: '#2B2B2B',
        }}
      >
        <title>Something went wrong</title>
        <h1 style={{ fontSize: 22, margin: 0, color: '#C8092A' }}>Something went wrong</h1>
        <p role="alert" style={{ maxWidth: 320, margin: 0 }}>
          The game hit an unexpected problem. You can try again, or go back to the start.
        </p>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
          <button type="button" onClick={() => retry()} style={{ ...button, background: '#3B4CCA', borderColor: '#2a3aa0' }}>
            Try again
          </button>
          <button type="button" onClick={() => window.location.assign(window.location.origin)} style={{ ...button, background: '#DC0A2D' }}>
            Back to start
          </button>
        </div>
      </body>
    </html>
  );
}
