// Drawing engine. The canvas is always addressed in a 600×600 logical space (the same on every
// device and over the network) and rendered at the screen's pixel density for sharp lines.
//
// Everything drawn is kept as a list of operations. Undo/redo drop or restore an operation and
// redraw from the list, which costs far less memory than keeping a full bitmap per step, and the
// same list replays a drawing for the reveal-screen timelapse or a reconnecting player.

export const CANVAS_SIZE = 600;
export const MAX_BRUSH = 48;
const MAX_POINTS_PER_STROKE = 5000;
const MAX_OPS = 3000;
const FILL_TOLERANCE = 48;
const BACKGROUND = '#FFFFFF';

export type DrawEvent =
  | { type: 'stroke-start'; x: number; y: number; color: string; size: number; p?: number }
  | { type: 'stroke-move'; x: number; y: number; p?: number }
  | { type: 'stroke-end' }
  | { type: 'fill'; x: number; y: number; color: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' };

type Point = [x: number, y: number, pressure: number];

type Op =
  | { kind: 'stroke'; color: string; size: number; points: Point[] }
  | { kind: 'fill'; x: number; y: number; color: string }
  | { kind: 'clear' };

export type Tool = 'pen' | 'eraser' | 'fill';

export class CanvasManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly dpr: number;
  private ops: Op[] = [];
  private redoStack: Op[] = [];
  private activeStroke: Extract<Op, { kind: 'stroke' }> | null = null;
  private timeline: DrawEvent[] = [];
  private color = '#000000';
  private size = 4;
  private tool: Tool = 'pen';
  private onDrawEvent?: (event: DrawEvent) => void;

  constructor(canvas: HTMLCanvasElement, onDrawEvent?: (event: DrawEvent) => void) {
    this.canvas = canvas;
    this.dpr = Math.min(2, Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1));
    canvas.width = Math.round(CANVAS_SIZE * this.dpr);
    canvas.height = Math.round(CANVAS_SIZE * this.dpr);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.onDrawEvent = onDrawEvent;
    this.redraw();
  }

  setOnDrawEvent(cb: ((event: DrawEvent) => void) | undefined) {
    this.onDrawEvent = cb;
  }
  setColor(color: string) {
    this.color = color;
  }
  setSize(size: number) {
    this.size = size;
  }
  setTool(tool: Tool) {
    this.tool = tool;
  }
  get currentTool(): Tool {
    return this.tool;
  }
  get canUndo() {
    return this.ops.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  /** Converts a pointer position to logical canvas coordinates. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }

  // ---- Local input: each call both draws and reports the event -----------------------------

  beginStroke(x: number, y: number, pressure?: number) {
    const color = this.tool === 'eraser' ? BACKGROUND : this.color;
    const size = this.tool === 'eraser' ? Math.min(MAX_BRUSH, this.size * 3) : this.size;
    this.emit({ type: 'stroke-start', x, y, color, size, ...(pressure !== undefined && { p: pressure }) });
  }
  extendStroke(x: number, y: number, pressure?: number) {
    if (this.activeStroke) this.emit({ type: 'stroke-move', x, y, ...(pressure !== undefined && { p: pressure }) });
  }
  finishStroke() {
    if (this.activeStroke) this.emit({ type: 'stroke-end' });
  }
  fillAt(x: number, y: number) {
    this.emit({ type: 'fill', x, y, color: this.color });
  }
  undo() {
    if (this.canUndo) this.emit({ type: 'undo' });
  }
  redo() {
    if (this.canRedo) this.emit({ type: 'redo' });
  }
  clear() {
    this.emit({ type: 'clear' });
  }

  private emit(event: DrawEvent) {
    this.applyEvent(event);
    this.onDrawEvent?.(event);
  }

  // ---- Applying events (local or remote) ------------------------------------------------------

  applyEvent(event: DrawEvent) {
    if (this.ops.length >= MAX_OPS && (event.type === 'stroke-start' || event.type === 'fill')) return;
    this.timeline.push(event);
    switch (event.type) {
      case 'stroke-start': {
        this.activeStroke = {
          kind: 'stroke',
          color: event.color,
          size: event.size,
          points: [[event.x, event.y, event.p ?? 0.5]],
        };
        this.ops.push(this.activeStroke);
        this.redoStack = [];
        this.drawStrokeTail(this.activeStroke);
        break;
      }
      case 'stroke-move': {
        const stroke = this.activeStroke;
        if (!stroke || stroke.points.length >= MAX_POINTS_PER_STROKE) return;
        stroke.points.push([event.x, event.y, event.p ?? 0.5]);
        this.drawStrokeTail(stroke);
        break;
      }
      case 'stroke-end': {
        const stroke = this.activeStroke;
        this.activeStroke = null;
        if (stroke) this.drawStrokeEnd(stroke);
        break;
      }
      case 'fill': {
        this.activeStroke = null;
        const op: Op = { kind: 'fill', x: event.x, y: event.y, color: event.color };
        this.ops.push(op);
        this.redoStack = [];
        this.renderFill(op);
        break;
      }
      case 'clear':
        this.activeStroke = null;
        this.ops.push({ kind: 'clear' });
        this.redoStack = [];
        this.paintBackground();
        break;
      case 'undo': {
        this.activeStroke = null;
        const op = this.ops.pop();
        if (op) {
          this.redoStack.push(op);
          this.redraw();
        }
        break;
      }
      case 'redo': {
        this.activeStroke = null;
        const op = this.redoStack.pop();
        if (op) {
          this.ops.push(op);
          this.renderOp(op);
        }
        break;
      }
    }
  }

  /** Every event applied so far, in order; enough to rebuild the drawing elsewhere. */
  getTimeline(): DrawEvent[] {
    return this.timeline.slice();
  }

  loadTimeline(events: readonly DrawEvent[]) {
    this.reset();
    for (const e of events) this.applyEvent(e);
    this.activeStroke = null;
  }

  reset() {
    this.ops = [];
    this.redoStack = [];
    this.timeline = [];
    this.activeStroke = null;
    this.redraw();
  }

  /** A PNG of the drawing at its logical size (not the device-pixel size). */
  toDataURL(): string {
    const out = document.createElement('canvas');
    out.width = CANVAS_SIZE;
    out.height = CANVAS_SIZE;
    const ctx = out.getContext('2d');
    if (!ctx) return this.canvas.toDataURL('image/png');
    ctx.drawImage(this.canvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return out.toDataURL('image/png');
  }

  // ---- Rendering ------------------------------------------------------------------------------

  private redraw() {
    this.paintBackground();
    for (const op of this.ops) this.renderOp(op);
  }

  private paintBackground() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private renderOp(op: Op) {
    if (op.kind === 'clear') this.paintBackground();
    else if (op.kind === 'fill') this.renderFill(op);
    else {
      // Replaying a whole stroke draws it the same way live input did, one segment at a time.
      const full = op.points;
      const partial = { ...op, points: [] as Point[] };
      for (const pt of full) {
        partial.points.push(pt);
        this.drawStrokeTail(partial);
      }
      this.drawStrokeEnd(op);
    }
  }

  private width(size: number, pressure: number) {
    return Math.max(1, size * (0.5 + pressure));
  }

  // Draws the newest segment, smoothed with a quadratic curve through segment midpoints.
  private drawStrokeTail(stroke: Extract<Op, { kind: 'stroke' }>) {
    const { ctx } = this;
    const pts = stroke.points;
    const n = pts.length;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (n === 1) {
      const [x, y, p] = pts[0];
      ctx.beginPath();
      ctx.arc(x, y, this.width(stroke.size, p) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const [x1, y1, p1] = pts[n - 2];
    const [x2, y2, p2] = pts[n - 1];
    const startX = n === 2 ? x1 : (pts[n - 3][0] + x1) / 2;
    const startY = n === 2 ? y1 : (pts[n - 3][1] + y1) / 2;
    ctx.lineWidth = this.width(stroke.size, (p1 + p2) / 2);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
    ctx.stroke();
  }

  private drawStrokeEnd(stroke: Extract<Op, { kind: 'stroke' }>) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    const { ctx } = this;
    const [x1, y1, p1] = pts[pts.length - 2];
    const [x2, y2, p2] = pts[pts.length - 1];
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = this.width(stroke.size, (p1 + p2) / 2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Scanline flood fill in device pixels.
  private renderFill(op: Extract<Op, { kind: 'fill' }>) {
    const fill = hexToRgb(op.color);
    if (!fill) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sx = Math.floor(op.x * this.dpr);
    const sy = Math.floor(op.y * this.dpr);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const image = this.ctx.getImageData(0, 0, w, h);
    const data = image.data;
    const start = (sy * w + sx) * 4;
    const tr = data[start], tg = data[start + 1], tb = data[start + 2];
    if (tr === fill.r && tg === fill.g && tb === fill.b) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      return;
    }

    const matches = (i: number) =>
      Math.abs(data[i] - tr) <= FILL_TOLERANCE &&
      Math.abs(data[i + 1] - tg) <= FILL_TOLERANCE &&
      Math.abs(data[i + 2] - tb) <= FILL_TOLERANCE;
    const done = new Uint8Array(w * h);
    const stack: number[] = [sx, sy];

    while (stack.length) {
      const y = stack.pop()!;
      let x = stack.pop()!;
      while (x > 0 && !done[y * w + x - 1] && matches((y * w + x - 1) * 4)) x--;
      let spanAbove = false;
      let spanBelow = false;
      for (; x < w; x++) {
        const idx = y * w + x;
        if (done[idx] || !matches(idx * 4)) break;
        done[idx] = 1;
        const i = idx * 4;
        data[i] = fill.r;
        data[i + 1] = fill.g;
        data[i + 2] = fill.b;
        data[i + 3] = 255;
        if (y > 0) {
          const up = idx - w;
          const ok = !done[up] && matches(up * 4);
          if (ok && !spanAbove) stack.push(x, y - 1);
          spanAbove = ok;
        }
        if (y < h - 1) {
          const down = idx + w;
          const ok = !done[down] && matches(down * 4);
          if (ok && !spanBelow) stack.push(x, y + 1);
          spanBelow = ok;
        }
      }
    }

    this.ctx.putImageData(image, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}
