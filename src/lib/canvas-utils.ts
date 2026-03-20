export interface Stroke {
  type: 'stroke-start' | 'stroke-move' | 'stroke-end';
  x: number;
  y: number;
  color: string;
  size: number;
}

export type DrawEvent =
  | { type: 'stroke-start'; x: number; y: number; color: string; size: number }
  | { type: 'stroke-move'; x: number; y: number }
  | { type: 'stroke-end' }
  | { type: 'fill'; x: number; y: number; color: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' };

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private isDrawing = false;
  private currentColor = '#000000';
  private currentSize = 4;
  private currentTool: 'pen' | 'eraser' = 'pen';
  private onDrawEvent?: (event: DrawEvent) => void;

  constructor(canvas: HTMLCanvasElement, onDrawEvent?: (event: DrawEvent) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.onDrawEvent = onDrawEvent;
    this.clear(false);
  }

  private getPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  setColor(color: string) {
    this.currentColor = color;
  }

  setSize(size: number) {
    this.currentSize = size;
  }

  setTool(tool: 'pen' | 'eraser') {
    this.currentTool = tool;
  }

  getColor() { return this.currentColor; }
  getSize() { return this.currentSize; }
  getTool() { return this.currentTool; }

  private saveState() {
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    this.redoStack = [];
    // Limit stack size
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  startStroke(e: MouseEvent | Touch) {
    this.saveState();
    this.isDrawing = true;
    const pos = this.getPos(e);
    const color = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;

    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.currentTool === 'eraser' ? this.currentSize * 3 : this.currentSize;

    this.onDrawEvent?.({
      type: 'stroke-start',
      x: pos.x,
      y: pos.y,
      color,
      size: this.currentTool === 'eraser' ? this.currentSize * 3 : this.currentSize,
    });
  }

  moveStroke(e: MouseEvent | Touch) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);

    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();

    this.onDrawEvent?.({ type: 'stroke-move', x: pos.x, y: pos.y });
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();
    this.onDrawEvent?.({ type: 'stroke-end' });
  }

  // Apply a remote draw event
  applyEvent(event: DrawEvent) {
    switch (event.type) {
      case 'stroke-start':
        this.ctx.beginPath();
        this.ctx.moveTo(event.x, event.y);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = event.color;
        this.ctx.lineWidth = event.size;
        break;
      case 'stroke-move':
        this.ctx.lineTo(event.x, event.y);
        this.ctx.stroke();
        break;
      case 'stroke-end':
        this.ctx.closePath();
        break;
      case 'fill':
        this.floodFill(Math.round(event.x), Math.round(event.y), event.color);
        break;
      case 'undo':
        this.undo(false);
        break;
      case 'redo':
        this.redo(false);
        break;
      case 'clear':
        this.clear(false);
        break;
    }
  }

  undo(emit = true) {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    const prev = this.undoStack.pop()!;
    this.ctx.putImageData(prev, 0, 0);
    if (emit) this.onDrawEvent?.({ type: 'undo' });
  }

  redo(emit = true) {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
    const next = this.redoStack.pop()!;
    this.ctx.putImageData(next, 0, 0);
    if (emit) this.onDrawEvent?.({ type: 'redo' });
  }

  clear(emit = true) {
    if (emit) this.saveState();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (emit) this.onDrawEvent?.({ type: 'clear' });
  }

  fill(e: MouseEvent | Touch) {
    this.saveState();
    const pos = this.getPos(e);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    this.floodFill(x, y, this.currentColor);
    this.onDrawEvent?.({ type: 'fill', x, y, color: this.currentColor });
  }

  private floodFill(startX: number, startY: number, fillColorStr: string) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const fillColor = this.hexToRgb(fillColorStr);
    if (!fillColor) return;

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    if (targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = (y * width + x) * 4;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(idx)) continue;

      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (Math.abs(r - targetR) > 30 || Math.abs(g - targetG) > 30 || Math.abs(b - targetB) > 30) continue;

      visited.add(idx);
      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  toDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
