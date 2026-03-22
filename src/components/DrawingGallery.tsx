'use client';

import { useCallback } from 'react';
import { RoundResult } from '@/lib/game-state';

interface DrawingGalleryProps {
  roundResults: RoundResult[];
  onClose: () => void;
}

export default function DrawingGallery({ roundResults, onClose }: DrawingGalleryProps) {
  const handleDownload = useCallback((result: RoundResult) => {
    const link = document.createElement('a');
    link.href = result.drawingDataUrl;
    link.download = `${result.pokemon.name}-by-${result.drawer.nickname}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-pokemon-dark w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-black text-pokemon-dark">Drawing Gallery</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {roundResults.length === 0 ? (
            <p className="text-center text-pokemon-gray py-8">No drawings yet!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {roundResults.map((result, i) => (
                <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  {/* Drawing */}
                  <div className="aspect-square bg-white border-b border-gray-200">
                    {result.drawingDataUrl ? (
                      <img
                        src={result.drawingDataUrl}
                        alt={`Drawing of ${result.pokemon.name}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-pokemon-gray text-sm">
                        No drawing
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-pokemon-dark truncate">{result.pokemon.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        result.guessedCorrectly ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {result.guessedCorrectly ? 'Guessed!' : 'Missed'}
                      </span>
                    </div>
                    <p className="text-xs text-pokemon-gray">by {result.drawer.nickname}</p>

                    {/* Download button */}
                    {result.drawingDataUrl && (
                      <button
                        onClick={() => handleDownload(result)}
                        className="w-full mt-1 py-1 rounded-lg text-xs font-bold text-pokemon-blue bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
