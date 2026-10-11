'use client';

import { AvatarIcon } from './AvatarPicker';
import { TEAMS, TEAM_NAMES, autoTeam, teamsProblem, type Player, type Team } from '@/lib/game-state';

export const TEAM_STYLE: Record<Team, { border: string; bg: string; dot: string }> = {
  red: { border: 'border-pokemon-red', bg: 'bg-red-50', dot: '🔴' },
  blue: { border: 'border-pokemon-blue', bg: 'bg-blue-50', dot: '🔵' },
};

/** The team of each player: the host's choice if there is one, otherwise alternating. */
export function teamAssignment(ids: string[], chosen: Record<string, Team>): Record<string, Team> {
  return Object.fromEntries(ids.map((id, i) => [id, chosen[id] ?? autoTeam(i)]));
}

/** Players with their teams applied, in lobby order. */
export function withTeams<T extends Pick<Player, 'id'>>(players: T[], chosen: Record<string, Team>): (T & { team: Team })[] {
  const teams = teamAssignment(
    players.map((p) => p.id),
    chosen,
  );
  return players.map((p) => ({ ...p, team: teams[p.id] }));
}

/** Why the game can't start with this split, or null. */
export function teamStartProblem(players: Pick<Player, 'id'>[], chosen: Record<string, Team>): string | null {
  return teamsProblem(withTeams(players, chosen));
}

interface TeamPickerProps {
  players: Pick<Player, 'id' | 'nickname' | 'avatarId'>[];
  chosen: Record<string, Team>;
  /** Called with the full assignment after the host taps a player to swap their team. */
  onChange: (chosen: Record<string, Team>) => void;
}

/** Red and Blue rosters; tapping a player moves them to the other team. */
export default function TeamPicker({ players, chosen, onChange }: TeamPickerProps) {
  const teams = teamAssignment(
    players.map((p) => p.id),
    chosen,
  );
  const problem = teamStartProblem(players, chosen);
  const swap = (id: string) => onChange({ ...teams, [id]: teams[id] === 'red' ? 'blue' : 'red' });

  return (
    <section className="w-full space-y-2" aria-label="Teams">
      <div className="grid grid-cols-2 gap-2">
        {TEAMS.map((team) => (
          <div key={team} className={`rounded-xl border-2 ${TEAM_STYLE[team].border} ${TEAM_STYLE[team].bg} p-2 space-y-1.5`}>
            <h3 className="text-xs font-bold font-body text-ink text-center">
              <span aria-hidden>{TEAM_STYLE[team].dot}</span> {TEAM_NAMES[team]}
            </h3>
            <ul className="space-y-1">
              {players
                .filter((p) => teams[p.id] === team)
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => swap(p.id)}
                      aria-label={`${p.nickname}, ${TEAM_NAMES[team]}. Tap to move to ${TEAM_NAMES[team === 'red' ? 'blue' : 'red']}`}
                      className="w-full flex items-center gap-1.5 rounded-lg bg-surface px-1.5 py-1 font-body text-sm font-bold text-ink hover:bg-surface-2 active:scale-95 transition"
                    >
                      <AvatarIcon avatarId={p.avatarId} size="sm" />
                      <span className="truncate">{p.nickname}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className={`text-[11px] text-center font-body ${problem ? 'font-bold text-accent-red' : 'text-ink-muted'}`} role={problem ? 'alert' : undefined}>
        {problem ?? 'Tap a player to swap their team.'}
      </p>
    </section>
  );
}

/** Team totals, e.g. on the reveal and game over screens. */
export function TeamScores({ scores, highlight = [] }: { scores: Record<Team, number>; highlight?: Team[] }) {
  return (
    <ul className="flex w-full justify-center gap-3 font-body" aria-label="Team scores">
      {TEAMS.map((team) => (
        <li
          key={team}
          className={`flex flex-1 max-w-[10rem] items-center justify-between gap-2 rounded-xl border-2 px-3 py-1.5 ${TEAM_STYLE[team].border} ${highlight.includes(team) ? 'bg-yellow-100' : TEAM_STYLE[team].bg}`}
        >
          <span className="text-xs font-bold text-ink">
            <span aria-hidden>{TEAM_STYLE[team].dot}</span> {TEAM_NAMES[team]}
          </span>
          <span className="text-xl font-black text-accent">{scores[team]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Which players belong to each team, for the end of the game. */
export function TeamRosters({ players }: { players: Pick<Player, 'id' | 'nickname' | 'team'>[] }) {
  return (
    <div className="text-[11px] text-center font-body text-ink-muted">
      {TEAMS.map((team) => (
        <p key={team}>
          {TEAM_NAMES[team]}:{' '}
          {players
            .filter((p) => p.team === team)
            .map((p) => p.nickname)
            .join(', ')}
        </p>
      ))}
    </div>
  );
}
