// Saving and sharing drawings.

/** Keeps only characters that are safe in a file name on every platform. */
export function safeFilename(...parts: string[]): string {
  const base = parts
    .join('-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return base || 'drawing';
}

export function downloadUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Official artwork is served with permissive CORS; requesting it anonymously keeps the
    // canvas exportable.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Builds a "drawing vs. official artwork" card as a PNG blob. */
export async function composeComparison(drawingUrl: string, artworkUrl: string, title: string): Promise<Blob> {
  const W = 1200;
  const H = 720;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#DC0A2D';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF8E7';
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 28);
  ctx.fill();

  ctx.fillStyle = '#2B2B2B';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 96);
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = '#6b6b6b';
  ctx.fillText('My drawing', W / 4 + 12, 660);
  ctx.fillText('The real one', (W * 3) / 4 - 12, 660);

  const box = 500;
  const top = 130;
  const drawing = await loadImage(drawingUrl);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(62, top, box, box);
  ctx.drawImage(drawing, 62, top, box, box);
  ctx.strokeStyle = '#2B2B2B';
  ctx.lineWidth = 6;
  ctx.strokeRect(62, top, box, box);

  try {
    const art = await loadImage(artworkUrl);
    ctx.drawImage(art, W - 62 - box, top, box, box);
  } catch {
    // Artwork unavailable (offline): the card still shows the drawing.
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

/** Shares through the phone's share sheet when files are supported, otherwise downloads. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** A spoiler-free square card with just the drawing, for the daily challenge. */
export async function composeDailyCard(drawingUrl: string, title: string, footer: string): Promise<Blob> {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#DC0A2D';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#FFF8E7';
  ctx.beginPath();
  ctx.roundRect(24, 24, S - 48, S - 48, 28);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2B2B2B';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(title, S / 2, 104);
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillStyle = '#6b6b6b';
  ctx.fillText('Can you guess who I drew?', S / 2, 150);

  const box = 740;
  const x = (S - box) / 2;
  const top = 190;
  const drawing = await loadImage(drawingUrl);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, top, box, box);
  ctx.drawImage(drawing, x, top, box, box);
  ctx.strokeStyle = '#2B2B2B';
  ctx.lineWidth = 6;
  ctx.strokeRect(x, top, box, box);

  ctx.fillStyle = '#2B2B2B';
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillText(footer, S / 2, top + box + 70);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

export function inviteUrl(code: string): string {
  return `${window.location.origin}/?room=${code}`;
}

/** Shares a room invite through the share sheet, or copies it; 'failed' leaves the code to read out. */
export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const text = `Play Who's That Pokémon with me! Room code: ${code}`;
  const url = inviteUrl(code);
  if (navigator.share) {
    try {
      await navigator.share({ title: "Who's That Pokémon?", text, url });
      return 'shared';
    } catch {
      // Cancelled or unsupported; fall back to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
