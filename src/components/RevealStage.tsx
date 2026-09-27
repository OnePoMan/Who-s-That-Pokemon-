'use client';

import PokemonSilhouette from './PokemonSilhouette';

interface RevealStageProps {
  imageUrl: string;
  revealed: boolean;
  name: string;
  className?: string;
}

/** The TV-show reveal: the silhouette zooms in over a spinning blue burst, then flashes into colour. */
export default function RevealStage({ imageUrl, revealed, name, className = '' }: RevealStageProps) {
  return (
    <div className={`reveal-stage ${revealed ? 'revealed' : ''} ${className}`}>
      <div className="reveal-rays" aria-hidden />
      <PokemonSilhouette imageUrl={imageUrl} revealed={revealed} name={name} className="reveal-pokemon w-full h-full p-[6%]" />
      <div className="reveal-flash" aria-hidden />
    </div>
  );
}
