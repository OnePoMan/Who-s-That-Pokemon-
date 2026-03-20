'use client';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export default function Timer({ timeRemaining, totalTime }: TimerProps) {
  const pct = (timeRemaining / totalTime) * 100;
  const isWarning = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isCritical
              ? 'bg-pokemon-red timer-warning'
              : isWarning
              ? 'bg-pokemon-yellow'
              : 'bg-pokemon-blue'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-2xl font-bold min-w-[3ch] text-right tabular-nums ${
          isCritical ? 'text-pokemon-red timer-warning' : isWarning ? 'text-pokemon-yellow-dark' : 'text-pokemon-dark'
        }`}
      >
        {timeRemaining}
      </span>
    </div>
  );
}
