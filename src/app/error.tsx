'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import PokeBallButton from '@/components/PokeBallButton';

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center font-body">
      <p className="text-5xl" aria-hidden>
        💥
      </p>
      <h1 className="font-pixel text-xs text-accent-red leading-relaxed">Something went wrong</h1>
      <p role="alert" className="text-sm text-ink max-w-xs">
        The game hit an unexpected problem. You can try again, or go back to the start (a game in progress will be lost).
      </p>
      <div className="flex gap-3 w-full max-w-xs">
        <PokeBallButton onClick={() => retry()} variant="blue" size="md" className="flex-1">
          Try again
        </PokeBallButton>
        <PokeBallButton onClick={() => window.location.assign(window.location.origin)} variant="red" size="md" className="flex-1">
          Back to start
        </PokeBallButton>
      </div>
    </main>
  );
}
