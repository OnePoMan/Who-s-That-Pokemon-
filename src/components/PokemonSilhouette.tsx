'use client';

import { useState, useEffect } from 'react';

interface PokemonSilhouetteProps {
  imageUrl: string;
  revealed: boolean;
  size?: number;
}

export default function PokemonSilhouette({ imageUrl, revealed, size = 200 }: PokemonSilhouetteProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-pokemon-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {loaded && (
        <img
          src={imageUrl}
          alt="Pokemon"
          className={`pokemon-silhouette ${revealed ? 'revealed' : ''} max-w-full max-h-full`}
          style={{ width: size, height: size, objectFit: 'contain' }}
          draggable={false}
        />
      )}
    </div>
  );
}
