'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, CanvasManager, renderShape, type DrawEvent, type ShapeKind, type Tool } from '@/lib/canvas-engine';
import Icon from './Icon';

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
const PRESET_HEX = new Set(COLORS.map((c) => c.hex));

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pen', label: 'Pen' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
  { id: 'line', label: 'Line' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Circle' },
  { id: 'picker', label: 'Pick a colour from the drawing' },
];

const SIZES = [2, 4, 8, 16];
// Matches the rate the other phone accepts (see Game.tsx), so both canvases stay identical.
const MIN_ACTION_GAP_MS = 250;
const MAX_ZOOM = 4;
// A finger stroke starts once the finger moves this far or stays down this long; until then
// a second finger turns the gesture into a pinch instead of leaving a dot.
const TOUCH_START_DISTANCE = 4;
const TOUCH_START_DELAY_MS = 80;
const RECENT_KEY = 'wtp-recent-colors';

const isShape = (t: Tool): t is ShapeKind => t === 'line' || t === 'rect' || t === 'ellipse';

function loadRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && /^#[0-9A-F]{6}$/.test(c)).slice(0, 4) : [];
  } catch {
    return [];
  }
}

interface DrawingCanvasProps {
  onDrawEvent?: (event: DrawEvent) => void;
  readOnly?: boolean;
  canvasManagerRef?: React.MutableRefObject<CanvasManager | null>;
  label?: string;
  /** Called once the engine exists, e.g. to load strokes that arrived before it mounted. */
  onReady?: (manager: CanvasManager) => void;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

export default function DrawingCanvas({ onDrawEvent, readOnly = false, canvasManagerRef, label = 'Drawing canvas', onReady }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<CanvasManager | null>(null);
  const onDrawEventRef = useRef(onDrawEvent);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<Tool>('pen');
  const [recent, setRecent] = useState<string[]>([]);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const toolRef = useRef<Tool>('pen');
  const colorRef = useRef('#000000');
  const sizeRef = useRef(4);
  const lastActionAt = useRef(-Infinity);
  const boxRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<number | null>(null);

  useEffect(() => {
    onDrawEventRef.current = onDrawEvent;
  }, [onDrawEvent]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const applyView = useCallback((next: View) => {
    const box = viewportRef.current;
    const w = box?.clientWidth ?? 1;
    const h = box?.clientHeight ?? 1;
    const scale = Math.min(MAX_ZOOM, Math.max(1, next.scale));
    // Keep the drawing covering the whole viewport.
    const clamped = { scale, x: Math.min(0, Math.max(w - w * scale, next.x)), y: Math.min(0, Math.max(h - h * scale, next.y)) };
    viewRef.current = clamped;
    setView(clamped);
  }, []);

  const rememberColor = useCallback((hex: string) => {
    if (PRESET_HEX.has(hex)) return;
    setRecent((prev) => {
      const next = [hex, ...prev.filter((c) => c !== hex)].slice(0, 4);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Not saved; the list still works for this visit.
      }
      return next;
    });
  }, []);

  const selectColor = useCallback((hex: string) => {
    const upper = hex.toUpperCase();
    setColor(upper);
    colorRef.current = upper;
    managerRef.current?.setColor(upper);
    // Picking a colour after the eraser or eyedropper means you want to draw with it.
    if (toolRef.current === 'eraser' || toolRef.current === 'picker') {
      setTool('pen');
      toolRef.current = 'pen';
      managerRef.current?.setTool('pen');
    }
  }, []);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !overlay || !viewport) return;
    const manager = new CanvasManager(canvas, (event) => {
      onDrawEventRef.current?.(event);
      setHistory({ canUndo: manager.canUndo, canRedo: manager.canRedo });
    });
    managerRef.current = manager;
    if (canvasManagerRef) canvasManagerRef.current = manager;
    onReady?.(manager);

    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    overlay.width = Math.round(CANVAS_SIZE * dpr);
    overlay.height = Math.round(CANVAS_SIZE * dpr);
    const octx = overlay.getContext('2d')!;
    const clearOverlay = () => {
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, overlay.width, overlay.height);
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d0: number; mid0: { x: number; y: number }; view0: View } | null = null;
    let drawPointer: number | null = null;
    let pending: { x: number; y: number; p?: number; at: number; cx: number; cy: number } | null = null;
    let shapeStart: { x: number; y: number } | null = null;
    let penActive = false;

    const local = (e: PointerEvent) => {
      const r = viewport.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pressureOf = (e: PointerEvent) => (e.pointerType === 'pen' ? e.pressure : undefined);

    const startPinch = () => {
      const [a, b] = [...pointers.values()];
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view0: viewRef.current };
      // A second finger means zoom, not draw.
      pending = null;
      shapeStart = null;
      clearOverlay();
      if (drawPointer !== null) manager.finishStroke();
      drawPointer = null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.pointerType === 'touch' && penActive) return; // palm resting while a pen draws
      e.preventDefault();
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (e.g. lifted mid-event); tracking still works without it.
      }
      pointers.set(e.pointerId, local(e));
      if (e.pointerType === 'touch' && pointers.size === 2) {
        startPinch();
        return;
      }
      if (readOnly || pointers.size > 1 || drawPointer !== null) return;

      const { x, y } = manager.toLogical(e.clientX, e.clientY);
      const current = toolRef.current;
      if (current === 'picker') {
        const picked = manager.pickColor(x, y);
        selectColor(picked);
        rememberColor(picked);
        return;
      }
      if (current === 'fill') {
        if (e.timeStamp - lastActionAt.current >= MIN_ACTION_GAP_MS) {
          lastActionAt.current = e.timeStamp;
          manager.fillAt(x, y);
        }
        return;
      }
      drawPointer = e.pointerId;
      penActive = e.pointerType === 'pen';
      if (isShape(current)) {
        shapeStart = { x, y };
        return;
      }
      if (e.pointerType === 'touch') pending = { x, y, p: pressureOf(e), at: e.timeStamp, cx: e.clientX, cy: e.clientY };
      else manager.beginStroke(x, y, pressureOf(e));
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, local(e));
      if (pinch && pointers.size >= 2) {
        e.preventDefault();
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const scale = Math.min(MAX_ZOOM, Math.max(1, (pinch.view0.scale * d) / pinch.d0));
        // Keep the point that was under the fingers under them as they move.
        const cx = (pinch.mid0.x - pinch.view0.x) / pinch.view0.scale;
        const cy = (pinch.mid0.y - pinch.view0.y) / pinch.view0.scale;
        applyView({ scale, x: mid.x - cx * scale, y: mid.y - cy * scale });
        return;
      }
      if (e.pointerId !== drawPointer) return;
      e.preventDefault();
      const { x, y } = manager.toLogical(e.clientX, e.clientY);
      if (shapeStart) {
        clearOverlay();
        renderShape(octx, { shape: toolRef.current as ShapeKind, x1: shapeStart.x, y1: shapeStart.y, x2: x, y2: y, color: colorRef.current, size: sizeRef.current });
        return;
      }
      if (pending) {
        const moved = Math.hypot(e.clientX - pending.cx, e.clientY - pending.cy);
        if (moved < TOUCH_START_DISTANCE && e.timeStamp - pending.at < TOUCH_START_DELAY_MS) return;
        manager.beginStroke(pending.x, pending.y, pending.p);
        pending = null;
      }
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const pt = manager.toLogical(ev.clientX, ev.clientY);
        manager.extendStroke(pt.x, pt.y, pressureOf(ev));
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pinch) {
        if (pointers.size < 2) pinch = null;
        return;
      }
      if (e.pointerId !== drawPointer) return;
      drawPointer = null;
      penActive = false;
      if (shapeStart) {
        const { x, y } = manager.toLogical(e.clientX, e.clientY);
        clearOverlay();
        if (Math.hypot(x - shapeStart.x, y - shapeStart.y) > 2) manager.drawShape(toolRef.current as ShapeKind, shapeStart.x, shapeStart.y, x, y);
        shapeStart = null;
        return;
      }
      if (pending) {
        // A tap: a dot where the finger touched.
        manager.beginStroke(pending.x, pending.y, pending.p);
        pending = null;
      }
      manager.finishStroke();
    };

    // Ctrl/⌘ + scroll zooms on computers.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = viewport.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const v = viewRef.current;
      const scale = Math.min(MAX_ZOOM, Math.max(1, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const cx = (px - v.x) / v.scale;
      const cy = (py - v.y) / v.scale;
      applyView({ scale, x: px - cx * scale, y: py - cy * scale });
    };

    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', onUp);
    viewport.addEventListener('pointercancel', onUp);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', onUp);
      viewport.removeEventListener('pointercancel', onUp);
      viewport.removeEventListener('wheel', onWheel);
    };
    // The engine is created once per mount; tool, colour and size go through refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSize = (s: number) => {
    setSize(s);
    sizeRef.current = s;
    managerRef.current?.setSize(s);
  };

  const selectTool = (t: Tool) => {
    setTool(t);
    toolRef.current = t;
    managerRef.current?.setTool(t);
  };

  const paced = (e: { timeStamp: number }) => {
    if (e.timeStamp - lastActionAt.current < MIN_ACTION_GAP_MS) return false;
    lastActionAt.current = e.timeStamp;
    return true;
  };

  const zoomed = view.scale > 1.01;
  const cursor = readOnly ? (zoomed ? 'cursor-move' : '') : tool === 'fill' || tool === 'picker' ? 'cursor-cell' : 'cursor-crosshair';

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        ref={boxRef}
        className="relative aspect-square bg-white rounded-xl shadow-lg overflow-hidden border-3 border-pokemon-dark"
        style={{ width: side ?? 'min(100%, 600px, 45dvh)' }}
      >
        <div ref={viewportRef} className={`absolute inset-0 ${cursor}`} style={{ touchAction: 'none' }}>
          <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            <canvas ref={canvasRef} role="img" aria-label={label} className="absolute inset-0 w-full h-full" />
            <canvas ref={overlayRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />
          </div>
        </div>
        {zoomed && (
          <button
            type="button"
            onClick={() => applyView({ scale: 1, x: 0, y: 0 })}
            className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-body font-bold text-white"
          >
            <Icon name="zoomReset" size={14} /> {Math.round(view.scale * 100)}%
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="w-full max-w-[600px] space-y-1.5" role="toolbar" aria-label="Drawing tools">
          <div className="flex gap-1 justify-center" role="radiogroup" aria-label="Tool">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tool === t.id}
                aria-label={t.label}
                title={t.label}
                onClick={() => selectTool(t.id)}
                className={`tool-button ${tool === t.id ? 'active' : ''}`}
              >
                <Icon name={t.id} />
              </button>
            ))}
          </div>

          <div className="flex gap-1 items-center overflow-x-auto px-1 py-0.5 no-scrollbar" role="radiogroup" aria-label="Colour">
            <label className="relative shrink-0 w-7 h-7 rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer color-wheel" title="Any colour">
              <span className="sr-only">Choose any colour</span>
              <input
                type="color"
                value={color.toLowerCase()}
                onChange={(e) => selectColor(e.target.value)}
                onBlur={(e) => rememberColor(e.target.value.toUpperCase())}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            {recent.map((hex) => (
              <Swatch key={`r-${hex}`} hex={hex} name={`Recent ${hex}`} selected={color === hex} onSelect={selectColor} />
            ))}
            {recent.length > 0 && <span className="w-px h-5 bg-gray-300 shrink-0" aria-hidden />}
            {COLORS.map(({ hex, name }) => (
              <Swatch key={hex} hex={hex} name={name} selected={color === hex} onSelect={selectColor} />
            ))}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <div className="flex gap-1" role="radiogroup" aria-label="Brush size">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  aria-label={`Brush size ${s}`}
                  onClick={() => selectSize(s)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${size === s ? 'bg-pokemon-blue shadow' : 'bg-surface-2 hover:bg-gray-300'}`}
                >
                  <span className={`rounded-full ${size === s ? 'bg-white' : 'bg-gray-700'}`} style={{ width: s + 3, height: s + 3 }} />
                </button>
              ))}
            </div>
            <span className="w-px h-6 bg-gray-300 mx-1" aria-hidden />
            <button type="button" aria-label="Undo" title="Undo" onClick={(e) => paced(e) && managerRef.current?.undo()} disabled={!history.canUndo} className="tool-button">
              <Icon name="undo" />
            </button>
            <button type="button" aria-label="Redo" title="Redo" onClick={(e) => paced(e) && managerRef.current?.redo()} disabled={!history.canRedo} className="tool-button">
              <Icon name="redo" />
            </button>
            <button type="button" aria-label="Clear" title="Clear the drawing" onClick={(e) => paced(e) && managerRef.current?.clear()} className="tool-button danger">
              <Icon name="trash" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Swatch({ hex, name, selected, onSelect }: { hex: string; name: string; selected: boolean; onSelect: (hex: string) => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      onClick={() => onSelect(hex)}
      className={`shrink-0 w-7 h-7 rounded-full border-2 transition-transform ${selected ? 'border-pokemon-blue scale-110 shadow-md' : 'border-gray-300 hover:scale-110'}`}
      style={{ backgroundColor: hex }}
    />
  );
}
