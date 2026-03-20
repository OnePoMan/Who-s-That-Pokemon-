'use client';

import { useState } from 'react';

interface SoundToggleProps {
  onToggle: () => boolean;
}

export default function SoundToggle({ onToggle }: SoundToggleProps) {
  const [enabled, setEnabled] = useState(true);

  const handleClick = () => {
    const newState = onToggle();
    setEnabled(newState);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg border-2 border-pokemon-dark flex items-center justify-center text-lg hover:scale-110 transition-transform"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
