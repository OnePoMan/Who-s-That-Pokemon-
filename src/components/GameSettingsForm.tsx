'use client';

import {
  DIFFICULTIES,
  MEMORIZE_OPTIONS,
  TIMER_OPTIONS,
  TURNS_OPTIONS,
  WIN_SCORE_OPTIONS,
  type GameSettings,
} from '@/lib/game-state';
import { GENERATIONS, REGIONS, TYPES, getPokemonPool } from '@/lib/pokedex';
import TypeBadge from './TypeBadge';

interface GameSettingsFormProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  playerCount: number;
}

const DIFFICULTY_HINT = {
  easy: 'Popular, well-known Pokémon',
  medium: 'A wider mix across the generations',
  hard: 'Every Pokémon, plus Megas and regional forms',
} as const;

export default function GameSettingsForm({ settings, onChange, playerCount }: GameSettingsFormProps) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const matching = getPokemonPool(settings.difficulty, settings).length;
  const party = playerCount > 2;

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

        <fieldset className="space-y-1.5">
          <legend className="settings-legend">Generations</legend>
          <div className="flex flex-wrap gap-1.5">
            {GENERATIONS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={settings.generations.includes(g)}
                onClick={() => set('generations', toggle(settings.generations, g).sort((a, b) => a - b))}
                title={REGIONS[g]}
                className={`pokemon-toggle px-2.5 py-1 text-xs ${settings.generations.includes(g) ? 'active' : ''}`}
              >
                {g} · {REGIONS[g]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="settings-legend">Types</legend>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <TypeBadge
                key={t}
                type={t}
                as="button"
                selected={settings.types.includes(t)}
                dimmed={settings.types.length > 0 && !settings.types.includes(t)}
                onClick={() => set('types', toggle(settings.types, t))}
              />
            ))}
          </div>
        </fieldset>

        <p className={`text-xs text-center font-body font-semibold ${matching === 0 ? 'text-pokemon-red-dark' : 'text-ink-muted'}`} aria-live="polite">
          {matching === 0
            ? 'No Pokémon match these filters — any Pokémon from this difficulty will be used.'
            : `${matching} Pokémon match${settings.generations.length || settings.types.length ? '' : ' (no filters)'}`}
          {(settings.generations.length > 0 || settings.types.length > 0) && (
            <button type="button" onClick={() => onChange({ ...settings, generations: [], types: [] })} className="ml-2 underline">
              Clear filters
            </button>
          )}
        </p>

        <OptionRow label="Drawing time" options={TIMER_OPTIONS} value={settings.timerDuration} format={(t) => `${t}s`} onChange={(v) => set('timerDuration', v)} />
        <OptionRow label="Memorize time" options={MEMORIZE_OPTIONS} value={settings.memorizeSeconds} format={(t) => `${t}s`} onChange={(v) => set('memorizeSeconds', v)} />
        {party ? (
          <OptionRow
            label="Turns to draw each"
            options={TURNS_OPTIONS}
            value={settings.turnsEach}
            format={(n) => `${n}×`}
            onChange={(v) => set('turnsEach', v)}
            hint={`${playerCount * settings.turnsEach} rounds · highest score wins`}
          />
        ) : (
          <OptionRow label="First to" options={WIN_SCORE_OPTIONS} value={settings.winScore} format={(n) => `${n} pts`} onChange={(v) => set('winScore', v)} />
        )}
        <OptionRow
          label="While memorizing, show"
          options={[true, false] as const}
          value={settings.showArtwork}
          format={(b) => (b ? 'Name + picture' : 'Name only')}
          onChange={(v) => set('showArtwork', v)}
        />
        <OptionRow
          label="Hints for guessers"
          options={[true, false] as const}
          value={settings.hints}
          format={(b) => (b ? 'On' : 'Off')}
          onChange={(v) => set('hints', v)}
          hint={settings.hints ? 'Letter blanks, then type and generation, then the first letter' : undefined}
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
      <legend className="settings-legend">{label}</legend>
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
      {hint && <p className="text-[11px] text-ink-muted text-center font-body">{hint}</p>}
    </fieldset>
  );
}
