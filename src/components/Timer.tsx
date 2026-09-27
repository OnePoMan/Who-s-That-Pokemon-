'use client';

interface TimerProps {
  remainingMs: number;
  totalMs: number;
}

export default function Timer({ remainingMs, totalMs }: TimerProps) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const isWarning = seconds <= 10;
  const isCritical = seconds <= 5;

  return (
    <div className="flex items-center gap-2 w-full" role="timer" aria-label={`${seconds} seconds left`}>
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-pokemon-dark/20">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            isCritical ? 'bg-pokemon-red timer-warning' : isWarning ? 'bg-pokemon-yellow' : 'bg-pokemon-blue'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-lg font-bold min-w-[3ch] text-right tabular-nums font-body ${
          isCritical ? 'text-pokemon-red timer-warning' : isWarning ? 'text-pokemon-yellow-dark' : 'text-pokemon-dark'
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}
