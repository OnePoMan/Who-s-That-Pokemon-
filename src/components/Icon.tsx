// Small stroke icons for the drawing toolbar (24×24 viewBox, currentColor).
const PATHS: Record<string, React.ReactNode> = {
  pen: <path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" />,
  eraser: (
    <>
      <path d="M8 20h12" />
      <path d="M4.5 15.5l9-9a2 2 0 012.8 0l2.2 2.2a2 2 0 010 2.8L11 19H7.5l-3-3a1 1 0 010-.5z" />
      <path d="M9 11l5 5" />
    </>
  ),
  fill: (
    <>
      <path d="M5 11l7-7 7 7-7 7z" />
      <path d="M5 11h14" />
      <path d="M20 15s1.5 2 1.5 3a1.5 1.5 0 01-3 0c0-1 1.5-3 1.5-3z" />
    </>
  ),
  line: <path d="M5 19L19 5" />,
  rect: <rect x="4" y="6" width="16" height="12" rx="1" />,
  ellipse: <ellipse cx="12" cy="12" rx="8" ry="6" />,
  picker: (
    <>
      <path d="M14 4l6 6" />
      <path d="M17 7l-9.5 9.5L5 19l2.5-2.5" />
      <path d="M12 9l3 3" />
    </>
  ),
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />,
  redo: <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  zoomReset: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
};

export default function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
