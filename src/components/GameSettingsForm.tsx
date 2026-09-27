'use client';

import {
  DIFFICULTIES,
  MEMORIZE_OPTIONS,
  TIMER_OPTIONS,
  WIN_SCORE_OPTIONS,
  type GameSettings,
} from '@/lib/game-state';

interface GameSettingsFormProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}

const DIFFICULTY_HINT = {
  easy: 'Popular, well-known Pokémon',
  medium: 'A wider mix across the generations',
  hard: 'Every Pokémon, plus Megas and regional forms',
} as const;

export default function GameSettingsForm({ settings, onChange }: GameSettingsFormProps) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });

  return (
    <div className="pokemon-card">
      <div className="pokemon-card-body space-y-4">
        <OptionRow
          label="Difficulty"
          options={DIFFICULTIES}
          value={settings.difficulty}
          format={(d) => d[0].toUpperCase() + d.slice(1)}
          onChange={(v) => set('difficulty', v)}
          hint={DIFFICULTY_HINT[settings.difficulty]}
        />
        <OptionRow label="Drawing time" options={TIMER_OPTIONS} value={settings.timerDuration} format={(t) => `${t}s`} onChange={(v) => set('timerDuration', v)} />
        <OptionRow label="Memorize time" options={MEMORIZE_OPTIONS} value={settings.memorizeSeconds} format={(t) => `${t}s`} onChange={(v) => set('memorizeSeconds', v)} />
        <OptionRow label="First to" options={WIN_SCORE_OPTIONS} value={settings.winScore} format={(n) => `${n} pts`} onChange={(v) => set('winScore', v)} />
        <OptionRow
          label="While memorizing, show"
          options={[true, false] as const}
          value={settings.showArtwork}
          format={(b) => (b ? 'Name + picture' : 'Name only')}
          onChange={(v) => set('showArtwork', v)}
        />
      </div>
    </div>
  );
}

function OptionRow<T extends string | number | boolean>({
  label,
  options,
  value,
  format,
  onChange,
  hint,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="block text-xs font-bold text-pokemon-dark font-body uppercase tracking-wide mb-1.5">{label}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`pokemon-toggle flex-1 py-2 text-sm ${value === option ? 'active' : ''}`}
          >
            {format(option)}
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-gray-600 text-center font-body">{hint}</p>}
    </fieldset>
  );
}
