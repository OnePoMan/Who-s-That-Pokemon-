'use client';

import { useEffect, useRef, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import PokemonSilhouette from './PokemonSilhouette';
import PokeBallButton from './PokeBallButton';
import Timer from './Timer';
import { DIFFICULTY_HINT, OptionRow, PoolFilterFields } from './GameSettingsForm';
import { useNow } from '@/hooks/useDeviceHelpers';
import type { SoundName } from '@/hooks/useSound';
import { DIFFICULTIES, type Difficulty, type PokemonData } from '@/lib/game-state';
import { getPokemonPool, pickRandomPokemon } from '@/lib/pokedex';
import { addDrawing, getDrawingImage } from '@/lib/collection';
import {
  DAILY_DRAW_SECONDS,
  DAILY_MEMORIZE_SECONDS,
  dailyNumber,
  dailyPokemon,
  dateKey,
  formatDuration,
  msUntilTomorrow,
} from '@/lib/daily';
import { composeComparison, composeDailyCard, safeFilename, shareOrDownload } from '@/lib/share';
import { currentDailyStreak, recordDaily, recordSolo, type Stats } from '@/lib/stats';
import type { CanvasManager } from '@/lib/canvas-engine';

interface SoloPlayProps {
  kind: 'solo' | 'daily';
  stats: Stats;
  updateStats: (fn: (s: Stats) => Stats) => void;
  play: (sound: SoundName) => void;
  onNotice: (text: string) => void;
  onExit: () => void;
}

type Stage = 'setup' | 'memorize' | 'drawing' | 'reveal';

interface Finished {
  pokemon: PokemonData;
  imageUrl: string;
  timeMs: number;
}

const RECENT_LIMIT = 30;

/**
 * Drawing on your own: untimed solo practice, or the daily challenge (a short memorize, then a
 * timed drawing from memory, once per day). Every finished drawing goes into the Pokédex.
 */
export default function SoloPlay({ kind, stats, updateStats, play, onNotice, onExit }: SoloPlayProps) {
  const daily = kind === 'daily';
  const today = useState(() => dateKey())[0];
  const doneToday = daily && stats.daily.result?.date === today;

  const [stage, setStage] = useState<Stage>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [filters, setFilters] = useState<{ generations: number[]; types: string[] }>({ generations: [], types: [] });
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [recent, setRecent] = useState<number[]>([]);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [finished, setFinished] = useState<Finished | null>(null);
  const canvasRef = useRef<CanvasManager | null>(null);
  const finishingRef = useRef(false);

  const timed = daily && (stage === 'memorize' || stage === 'drawing');
  const now = useNow(timed);
  const remainingMs = endsAt === null ? null : Math.max(0, endsAt - now);

  const begin = (next: PokemonData) => {
    setPokemon(next);
    setRecent((prev) => [...prev, next.id].slice(-RECENT_LIMIT));
    setStage('memorize');
    setEndsAt(daily ? Date.now() + DAILY_MEMORIZE_SECONDS * 1000 : null);
    play('whoosh');
  };

  const nextSolo = () => begin(pickRandomPokemon(difficulty, recent, filters));

  const startDrawing = () => {
    finishingRef.current = false;
    setStage('drawing');
    setStartedAt(Date.now());
    setEndsAt(daily ? Date.now() + DAILY_DRAW_SECONDS * 1000 : null);
    play('whoosh');
  };

  const finish = async () => {
    const manager = canvasRef.current;
    if (!pokemon || !manager || finishingRef.current) return;
    finishingRef.current = true;
    const imageUrl = manager.toDataURL();
    const timeMs = Math.min(Date.now() - startedAt, DAILY_DRAW_SECONDS * 1000);
    setFinished({ pokemon, imageUrl, timeMs });
    setStage('reveal');
    setEndsAt(null);
    play('whosthat');
    const drawingId = await addDrawing(
      { pokemonId: pokemon.id, pokemonName: pokemon.name, artist: 'You', source: kind, outcome: 'done', drawnAt: Date.now() },
      imageUrl,
    );
    updateStats((s) =>
      daily ? recordDaily(s, { date: today, pokemonId: pokemon.id, timeMs, drawingId }) : recordSolo(s, pokemon.id),
    );
  };

  // Daily timers: memorizing ends by itself, and so does drawing.
  useEffect(() => {
    if (!daily || remainingMs === null || remainingMs > 0) return;
    if (stage === 'memorize') startDrawing();
    else if (stage === 'drawing') void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, stage, daily]);

  const secondsLeft = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  useEffect(() => {
    if (stage === 'drawing' && secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 5) play('tick');
  }, [secondsLeft, stage, play]);

  // ---- Screens -------------------------------------------------------------------------------

  if (daily && doneToday && stage !== 'reveal') {
    return <DailyDone stats={stats} today={today} onNotice={onNotice} onExit={onExit} />;
  }

  if (stage === 'setup') {
    if (daily) {
      const streak = currentDailyStreak(stats, today);
      return (
        <Screen title={`Daily challenge #${dailyNumber(today)}`}>
          <div className="pokemon-card w-full">
            <div className="pokemon-card-body space-y-2 text-center font-body text-sm text-ink">
              <p>Everyone gets the same Pokémon today.</p>
              <p>
                You have <b>{DAILY_MEMORIZE_SECONDS} seconds</b> to memorize it, then <b>{DAILY_DRAW_SECONDS} seconds</b> to draw it from memory.
              </p>
              <p className="text-ink-muted text-xs">One try per day. Share your drawing and see if your friends can guess it!</p>
              {streak > 0 && <p className="font-bold text-orange-700">🔥 {streak}-day streak — keep it going!</p>}
            </div>
          </div>
          <PokeBallButton onClick={() => begin(dailyPokemon(today))} variant="red" size="lg" className="w-full">
            I&apos;m ready!
          </PokeBallButton>
          <PokeBallButton onClick={onExit} variant="gray" size="sm" className="w-full">
            Back
          </PokeBallButton>
        </Screen>
      );
    }
    return (
      <Screen title="Solo practice">
        <p className="text-center text-xs font-body text-ink-muted">Draw at your own pace — no timer, no guessers. Every drawing goes in your Pokédex.</p>
        <div className="pokemon-card w-full">
          <div className="pokemon-card-body space-y-4">
            <OptionRow
              label="Difficulty"
              options={DIFFICULTIES}
              value={difficulty}
              format={(d) => d[0].toUpperCase() + d.slice(1)}
              onChange={setDifficulty}
              hint={DIFFICULTY_HINT[difficulty]}
            />
            <PoolFilterFields
              generations={filters.generations}
              types={filters.types}
              matching={getPokemonPool(difficulty, filters).length}
              onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            />
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <PokeBallButton onClick={onExit} variant="gray" size="md" className="flex-1">
            Back
          </PokeBallButton>
          <PokeBallButton onClick={nextSolo} variant="red" size="md" className="flex-1">
            Start
          </PokeBallButton>
        </div>
      </Screen>
    );
  }

  if (stage === 'memorize' && pokemon) {
    return (
      <Screen title="Memorize this Pokémon!">
        <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed name={pokemon.name} className="w-[min(60vw,240px)]" />
        <p className="font-pixel text-base text-pokemon-blue text-center leading-relaxed">{pokemon.name}</p>
        {daily && remainingMs !== null && (
          <p className="font-pixel text-2xl text-pokemon-red" role="timer" aria-label={`${secondsLeft} seconds to memorize`}>
            {secondsLeft}
          </p>
        )}
        <PokeBallButton onClick={startDrawing} variant="blue" size="md">
          I&apos;m ready — start drawing
        </PokeBallButton>
        {!daily && (
          <button type="button" onClick={nextSolo} className="text-sm font-body font-bold text-ink-muted underline">
            Give me a different one
          </button>
        )}
      </Screen>
    );
  }

  if (stage === 'drawing' && pokemon) {
    return (
      <div data-fit-root className="flex flex-col gap-2 w-full animate-fade-in">
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-bold text-ink font-body shrink-0">{daily ? 'From memory!' : `Drawing ${pokemon.name}`}</span>
          {daily && remainingMs !== null ? <Timer remainingMs={remainingMs} totalMs={DAILY_DRAW_SECONDS * 1000} /> : <span className="flex-1" />}
        </div>
        <DrawingCanvas canvasManagerRef={canvasRef} />
        <div className="flex gap-3 w-full">
          {!daily && (
            <PokeBallButton onClick={() => setStage('setup')} variant="gray" size="md" className="flex-1">
              Quit
            </PokeBallButton>
          )}
          <PokeBallButton onClick={() => void finish()} variant="red" size="md" className="flex-1">
            I&apos;m done!
          </PokeBallButton>
        </div>
      </div>
    );
  }

  if (stage === 'reveal' && finished) {
    const streak = currentDailyStreak(stats, today);
    return (
      <Screen title={daily ? `Daily #${dailyNumber(today)}` : 'How did you do?'}>
        <Comparison drawingUrl={finished.imageUrl} pokemon={finished.pokemon} animate />
        {daily && (
          <p className="font-body text-sm font-bold text-ink text-center">
            Drawn in {formatDuration(finished.timeMs)}
            {streak > 0 && <span className="text-orange-700"> · 🔥 {streak}-day streak</span>}
          </p>
        )}
        <div className="flex gap-2 w-full">
          <PokeBallButton
            onClick={() => void (daily ? shareDaily(finished.imageUrl, today, finished.timeMs, streak, onNotice) : shareSolo(finished, onNotice))}
            variant="blue"
            size="sm"
            className="flex-1"
          >
            Share
          </PokeBallButton>
          {daily && (
            <PokeBallButton onClick={() => void shareSolo(finished, onNotice)} variant="gray" size="sm" className="flex-1">
              Save comparison
            </PokeBallButton>
          )}
        </div>
        {!daily && (
          <PokeBallButton onClick={nextSolo} variant="red" size="md" className="w-full">
            Next Pokémon
          </PokeBallButton>
        )}
        <PokeBallButton onClick={onExit} variant="gray" size="sm" className="w-full">
          Home
        </PokeBallButton>
      </Screen>
    );
  }

  return null;
}

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto animate-fade-in">
      <h2 className="font-pixel text-xs text-center text-ink leading-relaxed">{title}</h2>
      {children}
    </div>
  );
}

/** The drawing next to the official artwork (revealed after a beat when `animate`). */
export function Comparison({ drawingUrl, pokemon, animate = false }: { drawingUrl: string | null; pokemon: PokemonData; animate?: boolean }) {
  const [revealed, setRevealed] = useState(!animate);
  useEffect(() => {
    if (revealed) return;
    const id = setTimeout(() => setRevealed(true), 1500);
    return () => clearTimeout(id);
  }, [revealed]);
  const box = 'w-full aspect-square';
  return (
    <div className="w-full space-y-2">
      <p className="font-pixel text-sm text-center text-pokemon-dark leading-relaxed h-6" aria-live="polite">
        {revealed ? `It's ${pokemon.name}!` : "Who's that Pokémon?"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <figure className="space-y-1">
          <div className={`${box} rounded-lg overflow-hidden border-4 border-pokemon-dark bg-white`}>
            {drawingUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- local image
              <img src={drawingUrl} alt="Your drawing" className="w-full h-full object-contain" draggable={false} />
            )}
          </div>
          <figcaption className="text-[10px] font-bold text-ink-muted uppercase tracking-widest text-center">Yours</figcaption>
        </figure>
        <figure className="space-y-1">
          <PokemonSilhouette imageUrl={pokemon.artworkUrl} revealed={revealed} name={pokemon.name} className={box} />
          <figcaption className="text-[10px] font-bold text-ink-muted uppercase tracking-widest text-center">Official</figcaption>
        </figure>
      </div>
    </div>
  );
}

/** Today's challenge is already finished: show it again, and when the next one opens. */
function DailyDone({ stats, today, onNotice, onExit }: { stats: Stats; today: string; onNotice: (t: string) => void; onExit: () => void }) {
  const result = stats.daily.result!;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const now = useNow(true, 1000);
  const pokemon = dailyPokemon(today);
  const streak = currentDailyStreak(stats, today);

  useEffect(() => {
    if (result.drawingId === null) return;
    let url: string | null = null;
    let cancelled = false;
    void getDrawingImage(result.drawingId).then((blob) => {
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setImageUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [result.drawingId]);

  const left = msUntilTomorrow(new Date(now));
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);

  return (
    <Screen title={`Daily #${dailyNumber(today)} — done!`}>
      <Comparison drawingUrl={imageUrl} pokemon={pokemon} />
      <p className="font-body text-sm font-bold text-ink text-center">
        Drawn in {formatDuration(result.timeMs)}
        {streak > 0 && <span className="text-orange-700"> · 🔥 {streak}-day streak</span>}
      </p>
      <p className="font-body text-xs text-ink-muted text-center">
        Next challenge in {h}h {m}m
      </p>
      {imageUrl && (
        <div className="flex gap-2 w-full">
          <PokeBallButton onClick={() => void shareDaily(imageUrl, today, result.timeMs, streak, onNotice)} variant="blue" size="sm" className="flex-1">
            Share
          </PokeBallButton>
          <PokeBallButton onClick={() => void shareSolo({ pokemon, imageUrl, timeMs: result.timeMs }, onNotice)} variant="gray" size="sm" className="flex-1">
            Save comparison
          </PokeBallButton>
        </div>
      )}
      <PokeBallButton onClick={onExit} variant="gray" size="sm" className="w-full">
        Home
      </PokeBallButton>
    </Screen>
  );
}

async function shareDaily(imageUrl: string, today: string, timeMs: number, streak: number, onNotice: (t: string) => void) {
  const n = dailyNumber(today);
  const footer = `Drawn from memory in ${formatDuration(timeMs)}${streak > 1 ? ` · 🔥 ${streak}-day streak` : ''}`;
  try {
    const blob = await composeDailyCard(imageUrl, `Who's That Pokémon? Daily #${n}`, footer);
    const text = `Who's That Pokémon? Daily #${n} 🎨 ${footer}. Can you guess who I drew?`;
    const outcome = await shareOrDownload(blob, `daily-${n}.png`, text);
    if (outcome === 'downloaded') onNotice('Image saved to your downloads.');
  } catch {
    onNotice('Could not create the image.');
  }
}

async function shareSolo(finished: Finished, onNotice: (t: string) => void) {
  const { pokemon, imageUrl } = finished;
  try {
    const blob = await composeComparison(imageUrl, pokemon.artworkUrl, `I drew ${pokemon.name}`);
    const outcome = await shareOrDownload(blob, `${safeFilename(pokemon.name)}.png`, `I drew ${pokemon.name} in Who's That Pokémon?`);
    if (outcome === 'downloaded') onNotice('Image saved to your downloads.');
  } catch {
    onNotice('Could not create the image.');
  }
}
