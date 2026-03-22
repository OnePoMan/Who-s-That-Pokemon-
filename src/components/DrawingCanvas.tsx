'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasManager, DrawEvent } from '@/lib/canvas-utils';

const COLORS = [
  '#000000', '#FFFFFF', '#DC0A2D', '#3B4CCA', '#FFDE00',
  '#4CAF50', '#FF9800', '#9C27B0', '#795548', '#607D8B',
  '#E91E63', '#00BCD4',
];

const SIZES = [2, 4, 8, 16];

interface DrawingCanvasProps {
  onDrawEvent?: (event: DrawEvent) => void;
  readOnly?: boolean;
  canvasManagerRef?: React.MutableRefObject<CanvasManager | null>;
  initialImageData?: ImageData | null;
}

export default function DrawingCanvas({ onDrawEvent, readOnly = false, canvasManagerRef, initialImageData }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<CanvasManager | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(4);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
  const currentToolRef = useRef<'pen' | 'eraser' | 'fill'>('pen');

  // Initialize canvas manager once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 600;
    canvas.height = 600;

    const manager = new CanvasManager(canvas, onDrawEvent);
    managerRef.current = manager;
    if (canvasManagerRef) canvasManagerRef.current = manager;

    // Restore previous drawing if provided
    if (initialImageData) {
      manager.putImageData(initialImageData);
    }

    if (readOnly) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (currentToolRef.current === 'fill') {
        manager.fill(e);
      } else {
        manager.startStroke(e);
      }
    };
    const handleMouseMove = (e: MouseEvent) => manager.moveStroke(e);
    const handleMouseUp = () => manager.endStroke();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (currentToolRef.current === 'fill') {
        manager.fill(e.touches[0]);
      } else {
        manager.startStroke(e.touches[0]);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      manager.moveStroke(e.touches[0]);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      manager.endStroke();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
    // Only run on mount — tool/color/size changes go through refs and manager methods
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep onDrawEvent callback in sync
  useEffect(() => {
    managerRef.current?.setOnDrawEvent(onDrawEvent);
  }, [onDrawEvent]);

  const selectColor = useCallback((color: string) => {
    setCurrentColor(color);
    setCurrentTool('pen');
    currentToolRef.current = 'pen';
    managerRef.current?.setColor(color);
    managerRef.current?.setTool('pen');
  }, []);

  const selectSize = useCallback((size: number) => {
    setCurrentSize(size);
    managerRef.current?.setSize(size);
  }, []);

  const selectTool = useCallback((tool: 'pen' | 'eraser' | 'fill') => {
    setCurrentTool(tool);
    currentToolRef.current = tool;
    if (tool === 'eraser') {
      managerRef.current?.setTool('eraser');
    } else if (tool === 'pen') {
      managerRef.current?.setTool('pen');
    }
  }, []);

  const handleUndo = useCallback(() => managerRef.current?.undo(), []);
  const handleRedo = useCallback(() => managerRef.current?.redo(), []);
  const handleClear = useCallback(() => managerRef.current?.clear(), []);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-full max-w-[600px] aspect-square bg-white rounded-lg shadow-lg overflow-hidden border-4 border-pokemon-dark">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {!readOnly && (
        <div className="w-full max-w-[600px] space-y-2">
          {/* Tools */}
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => selectTool('pen')}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                currentTool === 'pen'
                  ? 'bg-pokemon-blue text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pen
            </button>
            <button
              onClick={() => selectTool('eraser')}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                currentTool === 'eraser'
                  ? 'bg-pokemon-blue text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Eraser
            </button>
            <button
              onClick={() => selectTool('fill')}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                currentTool === 'fill'
                  ? 'bg-pokemon-blue text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Fill
            </button>
            <div className="w-px bg-gray-300 mx-1" />
            <button onClick={handleUndo} className="px-3 py-1.5 rounded-full text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all">
              Undo
            </button>
            <button onClick={handleRedo} className="px-3 py-1.5 rounded-full text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all">
              Redo
            </button>
            <button onClick={handleClear} className="px-3 py-1.5 rounded-full text-sm font-bold bg-pokemon-red text-white hover:bg-pokemon-red-dark transition-all">
              Clear
            </button>
          </div>

          {/* Colors */}
          <div className="flex gap-1.5 justify-center flex-wrap">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => selectColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  currentColor === color && currentTool === 'pen'
                    ? 'border-pokemon-blue scale-125 shadow-lg'
                    : 'border-gray-300 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Sizes */}
          <div className="flex gap-2 justify-center items-center">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => selectSize(size)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                  currentSize === size
                    ? 'bg-pokemon-blue shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span
                  className={`rounded-full ${currentSize === size ? 'bg-white' : 'bg-gray-700'}`}
                  style={{ width: size + 4, height: size + 4 }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
