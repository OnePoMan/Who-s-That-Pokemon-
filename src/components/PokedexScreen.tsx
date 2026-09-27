'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PokeBallButton from './PokeBallButton';
import PokemonSilhouette from './PokemonSilhouette';
import ConfirmDialog from './ConfirmDialog';
import TypeBadge from './TypeBadge';
import { DEX_ORDER, GENERATIONS, REGIONS, TYPES, artworkUrl, type DexEntryInfo } from '@/lib/pokedex';
import { clearDrawings, deleteDrawing, getDrawingImage, listDrawings, type CollectedDrawing } from '@/lib/collection';
import { ACHIEVEMENTS, currentDailyStreak, isUnlocked, mostDrawn, type Stats } from '@/lib/stats';
import { dateKey } from '@/lib/daily';
import { composeComparison, downloadUrl, safeFilename, shareOrDownload } from '@/lib/share';

interface PokedexScreenProps {
  stats: Stats;
  onResetStats: () => void;
  onNotice: (text: string) => void;
  onExit: () => void;
}

type Tab = 'dex' | 'stats' | 'badges';

const SOURCE_LABEL: Record<CollectedDrawing['source'], string> = {
  'one-phone': 'One phone',
  'multi-phone': 'Several phones',
  solo: 'Solo',
  daily: 'Daily',
};
const OUTCOME_LABEL: Record<CollectedDrawing['outcome'], string> = {
  correct: 'Guessed',
  skipped: 'Skipped',
  timeout: 'Missed',
  done: '',
};

const nameOf = new Map(DEX_ORDER.map((e) => [e.id, e.name]));

/** Your collection: every Pokémon you've drawn, your stats and your badges. */
export default function PokedexScreen({ stats, onResetStats, onNotice, onExit }: PokedexScreenProps) {
  const [tab, setTab] = useState<Tab>('dex');
  const [drawings, setDrawings] = useState<CollectedDrawing[] | null>(null);

  const reload = useCallback(() => {
    void listDrawings().then(setDrawings);
  }, []);
  useEffect(reload, [reload]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dex', label: 'Pokédex' },
    { id: 'stats', label: 'Stats' },
    { id: 'badges', label: 'Badges' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <PokeBallButton onClick={onExit} variant="gray" size="sm">
          Home
        </PokeBallButton>
        <div role="tablist" aria-label="Pokédex sections" className="flex-1 flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`pokemon-toggle flex-1 py-2 text-sm ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dex' && <DexGrid stats={stats} drawings={drawings} onChanged={reload} onNotice={onNotice} />}
      {tab === 'stats' && (
        <StatsView
          stats={stats}
          drawingCount={drawings?.length ?? 0}
          onReset={async () => {
            try {
              await clearDrawings();
            } catch {
              // Nothing stored, or storage unavailable.
            }
            onResetStats();
            reload();
            onNotice('Pokédex and stats cleared.');
          }}
        />
      )}
      {tab === 'badges' && <BadgesView stats={stats} />}
    </div>
  );
}

// ---- Pokédex grid -------------------------------------------------------------------------------

function DexGrid({
  stats,
  drawings,
  onChanged,
  onNotice,
}: {
  stats: Stats;
  drawings: CollectedDrawing[] | null;
  onChanged: () => void;
  onNotice: (t: string) => void;
}) {
  const [generation, setGeneration] = useState(0);
  const [type, setType] = useState('');
  const [drawnOnly, setDrawnOnly] = useState(false);
  const [open, setOpen] = useState<DexEntryInfo | null>(null);

  // Newest drawing of each Pokémon, for its thumbnail.
  const latest = useMemo(() => {
    const map = new Map<number, CollectedDrawing[]>();
    for (const d of drawings ?? []) map.set(d.pokemonId, [...(map.get(d.pokemonId) ?? []), d]);
    return map;
  }, [drawings]);
  const discovered = useMemo(() => new Set([...stats.discovered, ...latest.keys()]), [stats.discovered, latest]);

  const entries = DEX_ORDER.filter(
    (e) => (!generation || e.generation === generation) && (!type || e.types.includes(type)) && (!drawnOnly || discovered.has(e.id)),
  );
  const shownDiscovered = entries.filter((e) => discovered.has(e.id)).length;

  return (
    <>
      <div className="pokemon-card">
        <div className="pokemon-card-body space-y-2">
          <p className="text-center font-pixel text-[11px] text-ink leading-relaxed">
            Drawn {discovered.size} / {DEX_ORDER.length}
          </p>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
            <div className="h-full bg-pokemon-red" style={{ width: `${(discovered.size / DEX_ORDER.length) * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-center font-body text-sm">
            <select aria-label="Generation" value={generation} onChange={(e) => setGeneration(Number(e.target.value))} className="pokemon-input py-1.5 w-auto">
              <option value={0}>All generations</option>
              {GENERATIONS.map((g) => (
                <option key={g} value={g}>
                  Gen {g} · {REGIONS[g]}
                </option>
              ))}
            </select>
            <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="pokemon-input py-1.5 w-auto">
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 font-bold text-ink">
              <input type="checkbox" checked={drawnOnly} onChange={(e) => setDrawnOnly(e.target.checked)} className="w-4 h-4 accent-pokemon-red" />
              Drawn only
            </label>
          </div>
          {(generation > 0 || type) && (
            <p className="text-center text-xs font-body text-ink-muted">
              {shownDiscovered} of {entries.length} here drawn
            </p>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-sm font-body text-ink-muted py-6">
          {drawnOnly ? 'Nothing drawn here yet — play a round or try solo practice!' : 'No Pokémon match.'}
        </p>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2" aria-label="Pokédex">
          {entries.map((e) => {
            const mine = latest.get(e.id);
            const seen = discovered.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={!seen}
                  onClick={() => setOpen(e)}
                  aria-label={seen ? `${e.name}, drawn ${mine?.length ?? 0} times` : `Number ${e.number}, not drawn yet`}
                  className={`w-full rounded-xl border-2 overflow-hidden text-left ${seen ? 'border-line bg-surface hover:border-pokemon-red' : 'border-dashed border-line/40 bg-surface-2/60'}`}
                >
                  <div className="aspect-square bg-white flex items-center justify-center">
                    {mine ? <Thumb id={mine[0].id} alt={`Drawing of ${e.name}`} /> : <span className="font-pixel text-lg text-ink-muted/50" aria-hidden>?</span>}
                  </div>
                  <div className="px-1.5 py-1 font-body leading-tight">
                    <span className="block text-[10px] text-ink-muted">#{String(e.number).padStart(4, '0')}</span>
                    <span className="block text-[11px] font-bold text-ink truncate">{seen ? e.name : '???'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <DexDetail
          entry={open}
          drawings={latest.get(open.id) ?? []}
          onClose={() => setOpen(null)}
          onDeleted={onChanged}
          onNotice={onNotice}
        />
      )}
    </>
  );
}

/** A stored drawing, loaded from IndexedDB once it scrolls into view. */
function Thumb({ id, alt }: { id: number; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const load = () => {
      void getDrawingImage(id).then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      });
    };
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'undefined') load();
    else {
      observer = new IntersectionObserver(
        (items) => {
          if (items.some((i) => i.isIntersecting)) {
            observer?.disconnect();
            load();
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(el);
    }
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return (
    <div ref={ref} className="w-full h-full">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- local image
        <img src={url} alt={alt} className="w-full h-full object-contain" draggable={false} />
      )}
    </div>
  );
}

function DexDetail({
  entry,
  drawings,
  onClose,
  onDeleted,
  onNotice,
}: {
  entry: DexEntryInfo;
  drawings: CollectedDrawing[];
  onClose: () => void;
  onDeleted: () => void;
  onNotice: (t: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<CollectedDrawing | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const withImage = async (d: CollectedDrawing, fn: (url: string) => Promise<void> | void) => {
    const blob = await getDrawingImage(d.id);
    if (!blob) return onNotice('That drawing could not be loaded.');
    const url = URL.createObjectURL(blob);
    try {
      await fn(url);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  };

  const filename = (d: CollectedDrawing) => `${safeFilename(entry.name, 'by', d.artist)}.png`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="dex-detail-title" className="bg-pokemon-cream rounded-2xl shadow-2xl border-4 border-pokemon-dark w-full max-w-lg max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b-2 border-pokemon-dark bg-gradient-to-r from-pokemon-red to-pokemon-red-dark rounded-t-xl">
          <h2 id="dex-detail-title" className="font-pixel text-[11px] text-white leading-relaxed">
            #{String(entry.number).padStart(4, '0')} {entry.name}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center gap-3">
            <PokemonSilhouette imageUrl={artworkUrl(entry.id)} revealed name={entry.name} className="w-24 shrink-0" />
            <div className="space-y-1 font-body text-sm text-ink">
              <div className="flex gap-1">
                {entry.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
              <p>
                Gen {entry.generation} · {REGIONS[entry.generation]}
              </p>
              <p className="text-ink-muted">Drawn {drawings.length} {drawings.length === 1 ? 'time' : 'times'} on this device</p>
            </div>
          </div>
          {drawings.length === 0 && <p className="text-sm font-body text-ink-muted text-center">The drawings of this Pokémon were deleted.</p>}
          <ul className="grid grid-cols-2 gap-3">
            {drawings.map((d) => (
              <li key={d.id} className="bg-surface rounded-xl border border-line/20 overflow-hidden">
                <div className="aspect-square bg-white border-b border-line/20">
                  <Thumb id={d.id} alt={`${d.artist}'s drawing of ${entry.name}`} />
                </div>
                <div className="p-2 space-y-1 font-body">
                  <p className="text-xs font-bold text-ink truncate">by {d.artist}</p>
                  <p className="text-[10px] text-ink-muted">
                    {new Date(d.drawnAt).toLocaleDateString()} · {SOURCE_LABEL[d.source]}
                    {OUTCOME_LABEL[d.outcome] && ` · ${OUTCOME_LABEL[d.outcome]}`}
                  </p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => void withImage(d, (url) => downloadUrl(url, filename(d)))} className="flex-1 py-1 rounded-lg text-[10px] font-bold text-pokemon-blue bg-blue-50 hover:bg-blue-100 border border-pokemon-blue/20">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void withImage(d, async (url) => {
                          try {
                            const blob = await composeComparison(url, artworkUrl(entry.id), `${d.artist} drew ${entry.name}`);
                            if ((await shareOrDownload(blob, filename(d), `${d.artist} drew ${entry.name} in Who's That Pokémon?`)) === 'downloaded') onNotice('Image saved to your downloads.');
                          } catch {
                            onNotice('Could not create the image.');
                          }
                        })
                      }
                      className="flex-1 py-1 rounded-lg text-[10px] font-bold text-pokemon-red bg-red-50 hover:bg-red-100 border border-pokemon-red/20"
                    >
                      Share
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(d)} aria-label={`Delete ${d.artist}'s drawing`} className="px-2 py-1 rounded-lg text-[10px] font-bold text-ink-muted bg-surface-2 hover:bg-red-100 border border-line/20">
                      🗑
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this drawing?"
          message={`${confirmDelete.artist}'s drawing of ${entry.name} will be removed from this device. ${entry.name} stays in your Pokédex.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await deleteDrawing(confirmDelete.id);
            } catch {
              onNotice('Could not delete the drawing.');
            }
            setConfirmDelete(null);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}

// ---- Stats and badges ---------------------------------------------------------------------------

function StatsView({ stats, drawingCount, onReset }: { stats: Stats; drawingCount: number; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  const top = mostDrawn(stats);
  const tiles: [string, string | number][] = [
    ['Games finished', stats.gamesPlayed],
    ['Online wins', stats.onlineGames ? `${stats.onlineWins} / ${stats.onlineGames}` : '—'],
    ['Rounds played', stats.roundsPlayed],
    ['Drawings guessed', pct(stats.roundsGuessed, stats.roundsPlayed)],
    ['Quick draws', stats.quickDraws],
    ['Best guess streak', stats.bestStreak],
    ['Solo drawings', stats.soloDrawings],
    ['Pokémon drawn', `${stats.discovered.length} / ${DEX_ORDER.length}`],
    ['Daily streak', currentDailyStreak(stats, dateKey())],
    ['Best daily streak', stats.daily.best],
    ['Dailies finished', stats.daily.played],
    ['Drawings saved', drawingCount],
  ];
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Stats">
        {tiles.map(([label, value]) => (
          <li key={label} className="pokemon-card">
            <div className="pokemon-card-body text-center py-2">
              <p className="font-pixel text-sm text-pokemon-blue">{value}</p>
              <p className="text-[11px] font-body font-bold text-ink-muted mt-1">{label}</p>
            </div>
          </li>
        ))}
      </ul>
      {top.length > 0 && (
        <div className="pokemon-card">
          <div className="pokemon-card-body font-body space-y-1">
            <h3 className="settings-legend">Most drawn</h3>
            <ol className="text-sm text-ink space-y-0.5">
              {top.map((t, i) => (
                <li key={t.pokemonId}>
                  {i + 1}. <b>{nameOf.get(t.pokemonId)}</b> <span className="text-ink-muted">× {t.count}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <p className="text-[11px] text-center font-body text-ink-muted">Everything here is stored only on this device.</p>
      <button type="button" onClick={() => setConfirm(true)} className="w-full text-sm font-body font-bold text-pokemon-red-dark underline">
        Delete all drawings and progress
      </button>
      {confirm && (
        <ConfirmDialog
          title="Start over?"
          message="Every saved drawing, stat, badge and your daily streak will be deleted from this device. This can't be undone."
          confirmLabel="Delete everything"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            onReset();
          }}
        />
      )}
    </div>
  );
}

function BadgesView({ stats }: { stats: Stats }) {
  const earned = ACHIEVEMENTS.filter((a) => isUnlocked(a, stats)).length;
  return (
    <div className="space-y-2">
      <p className="text-center font-pixel text-[11px] text-ink leading-relaxed">
        {earned} / {ACHIEVEMENTS.length} badges
      </p>
      <ul className="grid sm:grid-cols-2 gap-2" aria-label="Badges">
        {ACHIEVEMENTS.map((a) => {
          const [cur, goal] = a.progress(stats);
          const done = cur >= goal;
          return (
            <li key={a.id} className={`flex items-center gap-3 rounded-xl border-2 p-2 ${done ? 'border-pokemon-yellow-dark bg-yellow-50' : 'border-line/20 bg-surface'}`}>
              <span className={`text-3xl ${done ? '' : 'grayscale opacity-40'}`} aria-hidden>
                {a.icon}
              </span>
              <div className="flex-1 min-w-0 font-body">
                <p className="text-sm font-bold text-ink">
                  {a.title}
                  {done && <span className="sr-only"> (earned)</span>}
                </p>
                <p className="text-[11px] text-ink-muted">{a.description}</p>
                {!done && goal > 1 && (
                  <div className="mt-1 flex items-center gap-2" aria-label={`${Math.min(cur, goal)} of ${goal}`}>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-pokemon-blue" style={{ width: `${(Math.min(cur, goal) / goal) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-ink-muted tabular-nums">
                      {Math.min(cur, goal)}/{goal}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
