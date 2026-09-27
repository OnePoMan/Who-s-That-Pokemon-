'use client';

import { useEffect, useRef } from 'react';
import PokeBallButton from './PokeBallButton';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-6 bg-black/50" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="pokemon-card max-w-xs w-full">
        <div className="pokemon-card-body space-y-4 font-body text-center">
          <h2 id="confirm-title" className="font-bold text-ink">
            {title}
          </h2>
          <p id="confirm-message" className="text-sm text-ink-muted">
            {message}
          </p>
          <div className="flex gap-2">
            <div ref={cancelRef} className="flex-1 flex">
              <PokeBallButton onClick={onCancel} variant="gray" size="sm" className="flex-1">
                Keep playing
              </PokeBallButton>
            </div>
            <PokeBallButton onClick={onConfirm} variant="red" size="sm" className="flex-1">
              {confirmLabel}
            </PokeBallButton>
          </div>
        </div>
      </div>
    </div>
  );
}
