'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasManager, type DrawEvent, type Tool } from '@/lib/canvas-engine';

const COLORS: { hex: string; name: string }[] = [
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#DC0A2D', name: 'Red' },
  { hex: '#3B4CCA', name: 'Blue' },
  { hex: '#FFDE00', name: 'Yellow' },
  { hex: '#4CAF50', name: 'Green' },
  { hex: '#FF9800', name: 'Orange' },
  { hex: '#9C27B0', name: 'Purple' },
  { hex: '#795548', name: 'Brown' },
  { hex: '#607D8B', name: 'Gray' },
  { hex: '#E91E63', name: 'Pink' },
  { hex: '#00BCD4', name: 'Cyan' },
];

const SIZES = [2, 4, 8, 16];
// Matches the rate the other phone accepts (see Game.tsx), so both canvases stay identical.
const MIN_ACTION_GAP_MS = 250;

interface DrawingCanvasProps {
  onDrawEvent?: (event: DrawEvent) => void;
  readOnly?: boolean;
  canvasManagerRef?: React.MutableRefObject<CanvasManager | null>;
  label?: string;
  /** Called once the engine exists, e.g. to load strokes that arrived before it mounted. */
  onReady?: (manager: CanvasManager) => void;
}

export default function DrawingCanvas({
  onDrawEvent,
  readOnly = false,
  canvasManagerRef,
  label = 'Drawing canvas',
  onReady,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<CanvasManager | null>(null);
  const onDrawEventRef = useRef(onDrawEvent);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<Tool>('pen');
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const boxRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<number | null>(null);

  // Size the canvas to the space left on screen: everything else inside the nearest
  // [data-fit-root] keeps its size, and the canvas takes the rest (square, 150–600px).
  useEffect(() => {
    const box = boxRef.current;
    const root = box?.closest<HTMLElement>('[data-fit-root]');
    if (!box || !root) return;
    const fit = () => {
      const others = root.scrollHeight - box.offsetHeight;
      const top = root.getBoundingClientRect().top + window.scrollY;
      const available = window.innerHeight - top - others - 12;
      const width = box.parentElement?.clientWidth ?? 600;
      setSide(Math.floor(Math.max(150, Math.min(600, width, available))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);
  const lastActionAt = useRef(-Infinity);
  const paced = (e: { timeStamp: number }) => {
    if (e.timeStamp - lastActionAt.current < MIN_ACTION_GAP_MS) return false;
    lastActionAt.current = e.timeStamp;
    return true;
  };

  useEffect(() => {
    onDrawEventRef.current = onDrawEvent;
  }, [onDrawEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const manager = new CanvasManager(canvas, (event) => {
      onDrawEventRef.current?.(event);
      setHistory({ canUndo: manager.canUndo, canRedo: manager.canRedo });
    });
    managerRef.current = manager;
    if (canvasManagerRef) canvasManagerRef.current = manager;
    onReady?.(manager);
    if (readOnly) return;

    let activePointer: number | null = null;
    let lastFillAt = -Infinity;
    let penActive = false;

    const pressureOf = (e: PointerEvent) => (e.pointerType === 'pen' ? e.pressure : undefined);

    const onDown = (e: PointerEvent) => {
      // One finger or pen at a time; a resting palm is ignored while a pen is drawing.
      if (activePointer !== null || (e.pointerType === 'touch' && penActive)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const { x, y } = manager.toLogical(e.clientX, e.clientY);
      if (manager.currentTool === 'fill') {
        if (e.timeStamp - lastFillAt >= MIN_ACTION_GAP_MS) {
          lastFillAt = e.timeStamp;
          manager.fillAt(x, y);
        }
        return;
      }
      activePointer = e.pointerId;
      penActive = e.pointerType === 'pen';
      canvas.setPointerCapture(e.pointerId);
      manager.beginStroke(x, y, pressureOf(e));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      e.preventDefault();
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const { x, y } = manager.toLogical(ev.clientX, ev.clientY);
        manager.extendStroke(x, y, pressureOf(ev));
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      penActive = false;
      manager.finishStroke();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
    // The engine is created once per mount; tool, colour and size go through its setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectColor = useCallback((hex: string) => {
    setColor(hex);
    managerRef.current?.setColor(hex);
    if (managerRef.current?.currentTool === 'eraser') {
      setTool('pen');
      managerRef.current.setTool('pen');
    }
  }, []);

  const selectSize = useCallback((s: number) => {
    setSize(s);
    managerRef.current?.setSize(s);
  }, []);

  const selectTool = useCallback((t: Tool) => {
    setTool(t);
    managerRef.current?.setTool(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        ref={boxRef}
        className="relative aspect-square bg-white rounded-xl shadow-lg overflow-hidden border-3 border-pokemon-dark"
        style={{ width: side ?? 'min(100%, 600px, 45dvh)' }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className={`w-full h-full ${readOnly ? '' : tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
        />
      </div>

      {!readOnly && (
        <div className="w-full max-w-[600px] space-y-1.5" role="toolbar" aria-label="Drawing tools">
          <div className="flex gap-1 justify-center flex-wrap">
            {(['pen', 'eraser', 'fill'] as Tool[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTool(t)}
                aria-pressed={tool === t}
                className={`pokemon-toggle px-2.5 py-1 text-xs font-body capitalize ${tool === t ? 'active' : ''}`}
              >
                {t}
              </button>
            ))}
            <div className="w-px bg-gray-300 mx-0.5" aria-hidden />
            <button
              type="button"
              onClick={(e) => paced(e) && managerRef.current?.undo()}
              disabled={!history.canUndo}
              className="pokemon-toggle px-2.5 py-1 text-xs font-body disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={(e) => paced(e) && managerRef.current?.redo()}
              disabled={!history.canRedo}
              className="pokemon-toggle px-2.5 py-1 text-xs font-body disabled:opacity-40"
            >
              Redo
            </button>
            <button
              type="button"
              onClick={(e) => paced(e) && managerRef.current?.clear()}
              className="px-2.5 py-1 rounded-full text-xs font-bold font-body bg-pokemon-red text-white border-2 border-pokemon-red-dark hover:bg-pokemon-red-dark transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex gap-1 justify-center" role="radiogroup" aria-label="Colour">
            {COLORS.map(({ hex, name }) => (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={color === hex}
                aria-label={name}
                title={name}
                onClick={() => selectColor(hex)}
                className={`w-[min(7vw,28px)] aspect-square shrink-0 rounded-full border-2 transition-transform ${
                  color === hex ? 'border-pokemon-blue scale-125 shadow-lg' : 'border-gray-300 hover:scale-110'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>

          <div className="flex gap-2 justify-center items-center" role="radiogroup" aria-label="Brush size">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                aria-label={`Brush size ${s}`}
                onClick={() => selectSize(s)}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  size === s ? 'bg-pokemon-blue shadow-lg' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span className={`rounded-full ${size === s ? 'bg-white' : 'bg-gray-700'}`} style={{ width: s + 4, height: s + 4 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
