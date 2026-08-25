import { notFound } from 'next/navigation';
import { formatTime12Hour } from '@/utils/formatTime';
import { getPublicEventTeamDetail, type EventTeamMatch } from '@/services/eventTeams/getPublicEventTeamDetail';

export const dynamic = 'force-dynamic';

type TeamInfo = { name: string; logo: string | null };

const STATUS_LABELS: Record<string, string> = {
  played: 'Complete',
  in_progress: 'Live',
  scheduled: 'Scheduled',
  cancelled: 'Cancelled',
};

const BRACKET_LABELS: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  third_place: 'Third Place',
  final: 'Final',
};

function formatMatchDate(date: string | null, compact = false) {
  if (!date) return 'TBD';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', compact
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getGameType(match: EventTeamMatch) {
  if (match.stage_type === 'knockout') {
    return match.bracket_round ? BRACKET_LABELS[match.bracket_round] ?? 'Playoff' : 'Playoff';
  }
  return match.round_number ? `Regular · Round ${match.round_number}` : 'Regular';
}

function getHomeAway(match: EventTeamMatch, team: TeamInfo) {
  const opponent = { name: match.opponent_name, logo: match.opponent_logo };
  return match.is_home ? { home: team, away: opponent } : { home: opponent, away: team };
}

function getResultTone(match: EventTeamMatch) {
  if (match.status !== 'played' || match.score1 == null || match.score2 == null) return 'text-slate-700';
  const teamScore = match.is_home ? match.score1 : match.score2;
  const opponentScore = match.is_home ? match.score2 : match.score1;
  if (teamScore > opponentScore) return 'text-emerald-700';
  if (teamScore < opponentScore) return 'text-red-600';
  return 'text-amber-600';
}

function TeamIdentity({ team, align = 'left' }: { team: TeamInfo; align?: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {align === 'left' && (team.logo
        ? <img src={team.logo} alt="" className="h-9 w-9 shrink-0 rounded-md object-contain" />
        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">{team.name.slice(0, 2).toUpperCase()}</span>)}
      <span className={`truncate font-filson-bold text-[#075ccf] ${align === 'right' ? 'text-right' : ''}`}>{team.name}</span>
      {align === 'right' && (team.logo
        ? <img src={team.logo} alt="" className="h-9 w-9 shrink-0 rounded-md object-contain" />
        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">{team.name.slice(0, 2).toUpperCase()}</span>)}
    </div>
  );
}

function Status({ match }: { match: EventTeamMatch }) {
  const label = STATUS_LABELS[match.status ?? ''] ?? match.status ?? 'Scheduled';
  const live = match.status === 'in_progress';
  return (
    <div>
      {match.status !== 'played' && match.time && <div className="font-filson-bold text-slate-900">{formatTime12Hour(match.time)}</div>}
      <span className={`text-sm font-filson-regular ${live ? 'font-bold text-red-600' : 'text-[#075ccf]'}`}>{label}</span>
    </div>
  );
}

function DesktopMatchTable({ matches, team }: { matches: EventTeamMatch[]; team: TeamInfo }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-sm font-filson-black text-slate-600">
            <th className="w-[13%] px-5 py-4">Date</th>
            <th className="w-[24%] px-4 py-4">Home</th>
            <th className="w-[9%] px-2 py-4 text-center">Score</th>
            <th className="w-[24%] px-4 py-4">Away</th>
            <th className="w-[12%] px-4 py-4">Time/Status</th>
            <th className="w-[10%] px-4 py-4">Venue</th>
            <th className="w-[14%] px-4 py-4">Game Type</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => {
            const { home, away } = getHomeAway(match, team);
            return (
              <tr key={match.id} className={`${index % 2 === 0 ? 'bg-[#eef5f8]' : 'bg-white'} border-b border-white`}>
                <td className="px-5 py-5 font-filson-regular text-[#075ccf]">{formatMatchDate(match.date, true)}</td>
                <td className="px-4 py-5"><TeamIdentity team={home} align="right" /></td>
                <td className={`px-2 py-5 text-center text-lg font-filson-black ${getResultTone(match)}`}>
                  {match.score1 == null || match.score2 == null ? '–' : `${match.score1} - ${match.score2}`}
                </td>
                <td className="px-4 py-5"><TeamIdentity team={away} /></td>
                <td className="px-4 py-5"><Status match={match} /></td>
                <td className="px-4 py-5 text-sm text-slate-700">{match.venue_name ?? 'TBD'}</td>
                <td className="px-4 py-5 text-sm text-slate-700">{getGameType(match)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileMatchCards({ matches, team }: { matches: EventTeamMatch[]; team: TeamInfo }) {
  return (
    <div className="divide-y divide-slate-200 md:hidden">
      {matches.map((match) => {
        const { home, away } = getHomeAway(match, team);
        return (
          <article key={match.id} className="bg-white px-4 py-5">
            <div className="mb-4 flex items-center justify-between gap-3 text-xs">
              <span className="font-filson-bold text-[#075ccf]">{formatMatchDate(match.date)}</span>
              <Status match={match} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <TeamIdentity team={home} align="right" />
              <span className={`min-w-14 text-center text-lg font-filson-black ${getResultTone(match)}`}>
                {match.score1 == null || match.score2 == null ? 'vs' : `${match.score1} - ${match.score2}`}
              </span>
              <TeamIdentity team={away} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span>{match.venue_name ?? 'Venue TBD'}</span><span>•</span><span>{getGameType(match)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MatchSection({ title, matches, team }: { title: string; matches: EventTeamMatch[]; team: TeamInfo }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-filson-black text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-filson-bold text-slate-600">{matches.length} games</span>
      </div>
      {matches.length === 0
        ? <p className="px-5 py-10 text-center text-sm text-slate-500">No matches to display.</p>
        : <><DesktopMatchTable matches={matches} team={team} /><MobileMatchCards matches={matches} team={team} /></>}
    </section>
  );
}

export default async function EventTeamPage({ params }: { params: Promise<{ eventId: string; teamKey: string }> }) {
  const { eventId: rawEventId, teamKey: rawTeamKey } = await params;
  const eventId = Number(rawEventId);
  if (!Number.isFinite(eventId)) notFound();
  const detail = await getPublicEventTeamDetail(eventId, decodeURIComponent(rawTeamKey));
  if (!detail || !detail.standing) notFound();

  const played = detail.matches
    .filter((match) => match.status === 'played')
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const upcoming = detail.matches
    .filter((match) => match.status !== 'played')
    .sort((a, b) => (a.date ?? '9999-12-31').localeCompare(b.date ?? '9999-12-31'));
  const team = { name: detail.participation.name, logo: detail.participation.logo_url };
  const stats = [
    ['POS', detail.position], ['MP', detail.standing.played], ['W', detail.standing.won],
    ['D', detail.standing.drawn], ['L', detail.standing.lost], ['GF', detail.standing.goals_for],
    ['GA', detail.standing.goals_against], ['GD', detail.standing.goal_difference], ['PTS', detail.standing.points],
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f8] pb-14">
      <header className="px-4 py-10 text-center text-white" style={{ background: 'var(--color-blue, #023467)' }}>
        {detail.participation.logo_url && <img src={detail.participation.logo_url} alt="" className="mx-auto mb-4 h-24 w-24 rounded-xl bg-white object-contain p-2" />}
        <p className="text-sm text-blue-200">{detail.event.name}</p>
        <h1 className="text-3xl font-filson-black">{detail.participation.name}</h1>
        {detail.participation.status === 'disqualified' && <span className="mt-3 inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold">Disqualified</span>}
      </header>

      <div className="container mx-auto max-w-7xl space-y-7 px-4 py-8">
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-[650px] grid-cols-9 divide-x divide-slate-100">
            {stats.map(([label, value]) => (
              <div key={String(label)} className="px-3 py-4 text-center">
                <p className="text-[11px] font-filson-bold tracking-wide text-slate-400">{label}</p>
                <p className={`mt-1 text-xl font-filson-black ${label === 'PTS' ? 'text-[#075ccf]' : 'text-slate-900'}`}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <MatchSection title="Results" matches={played} team={team} />
        <MatchSection title="Schedule" matches={upcoming} team={team} />
      </div>
    </main>
  );
}
