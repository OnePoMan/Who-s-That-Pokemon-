'use client';

import { useState } from 'react';

interface PokemonSilhouetteProps {
  imageUrl: string;
  revealed: boolean;
  /** Accessible name once revealed; the silhouette itself is announced as a mystery. */
  name?: string;
  className?: string;
}

export default function PokemonSilhouette({ imageUrl, revealed, name, className = '' }: PokemonSilhouetteProps) {
  // Tracked per URL so a new Pokémon starts from the loading state again.
  const [state, setState] = useState<{ url: string; status: 'loading' | 'loaded' | 'error' }>({
    url: imageUrl,
    status: 'loading',
  });
  const status = state.url === imageUrl ? state.status : 'loading';

  return (
    <div className={`relative flex items-center justify-center aspect-square ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="w-12 h-12 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {status === 'error' ? (
        <div className="flex flex-col items-center justify-center text-center text-ink-muted text-xs font-body p-4">
          <span className="text-4xl" aria-hidden>?</span>
          Artwork unavailable offline
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote artwork, sized by CSS
        <img
          src={imageUrl}
          crossOrigin="anonymous"
          alt={revealed ? (name ?? 'Pokémon artwork') : 'Mystery Pokémon silhouette'}
          onLoad={() => setState({ url: imageUrl, status: 'loaded' })}
          onError={() => setState({ url: imageUrl, status: 'error' })}
          className={`pokemon-silhouette ${revealed ? 'revealed' : ''} w-full h-full object-contain ${status === 'loading' ? 'opacity-0' : ''}`}
          draggable={false}
        />
      )}
    </div>
  );
}
