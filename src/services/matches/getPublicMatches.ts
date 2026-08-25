import { supabase } from '@/lib/supabaseClient';

export type PublicMatchRow = {
  id: number;
  event_id: number;
  date: string | null;
  time: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  score1: number | null;
  score2: number | null;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team1_logo: string | null;
  team2_name: string;
  team2_logo: string | null;
  team1_disqualified: boolean;
  team2_disqualified: boolean;
  field_name: string | null;
};

type RawMatch = {
  id: number;
  event_id: number;
  date: string | null;
  time: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  score1: number | null;
  score2: number | null;
  team1_id: number | null;
  team2_id: number | null;
  field_id: number | null;
};

type TeamSummary = {
  name: string;
  logo_url: string | null;
};

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEventTeamKey(eventId: number, teamId: number) {
  return `${eventId}:${teamId}`;
}

function filterUpcomingRounds(matches: RawMatch[]) {
  const today = getTodayDateKey();
  const upcomingRoundNumbers = Array.from(
    new Set(
      matches
        .filter((match) => match.round_number != null && (!match.date || match.date >= today))
        .sort((a, b) => {
          const dateCompare = (a.date ?? '9999-12-31').localeCompare(b.date ?? '9999-12-31');
          if (dateCompare !== 0) return dateCompare;
          return (a.round_number ?? 0) - (b.round_number ?? 0);
        })
        .map((match) => match.round_number as number)
    )
  ).slice(0, 4);

  if (upcomingRoundNumbers.length === 0) {
    return [];
  }

  const visibleRounds = new Set(upcomingRoundNumbers);
  return matches.filter((match) => match.round_number != null && visibleRounds.has(match.round_number));
}

export async function getPublicMatches(eventId: number): Promise<PublicMatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      event_id,
      date,
      time,
      round_number,
      status,
      stage_type,
      bracket_round,
      score1,
      score2,
      team1_id,
      team2_id,
      field_id
    `)
    .eq('event_id', eventId)
    .order('stage_type', { ascending: true })
    .order('round_number', { ascending: true })
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  const matches = filterUpcomingRounds((data ?? []) as RawMatch[]);

  const teamIds = Array.from(
    new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]).filter((id): id is number => Number.isFinite(id)))
  );
  const fieldIds = Array.from(
    new Set(matches.map((m) => m.field_id).filter((id): id is number => Number.isFinite(id)))
  );

  const [teamRes, eventTeamRes, fieldRes] = await Promise.all([
    teamIds.length > 0
      ? supabase.from('teams').select('id, name, logo_url').in('id', teamIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? supabase
        .from('event_teams')
        .select('event_id, team_id, display_name, status')
        .eq('event_id', eventId)
        .in('team_id', teamIds)
      : Promise.resolve({ data: [], error: null }),
    fieldIds.length > 0
      ? supabase.from('fields').select('id, name').in('id', fieldIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamRes.error) throw new Error(teamRes.error.message);
  if (eventTeamRes.error) throw new Error(eventTeamRes.error.message);
  if (fieldRes.error) throw new Error(fieldRes.error.message);

  const teamById = new Map<number, TeamSummary>(
    ((teamRes.data ?? []) as { id: number; name: string; logo_url: string | null }[]).map((t) => [t.id, t])
  );
  const eventTeamDisplayNameByKey = new Map<string, string>(
    ((eventTeamRes.data ?? []) as { event_id: number; team_id: number; display_name: string | null; status: string | null }[])
      .filter((row) => Boolean(row.display_name?.trim()))
      .map((row) => [getEventTeamKey(row.event_id, row.team_id), row.display_name!.trim()])
  );
  const disqualifiedTeamIds = new Set(
    ((eventTeamRes.data ?? []) as { team_id: number; status: string | null }[])
      .filter((row) => row.status === 'disqualified')
      .map((row) => row.team_id)
  );
  const fieldById = new Map<number, string>(
    ((fieldRes.data ?? []) as { id: number; name: string }[]).map((f) => [f.id, f.name])
  );

  const getTeamName = (teamId: number | null) => {
    if (teamId == null) return '-';
    return eventTeamDisplayNameByKey.get(getEventTeamKey(eventId, teamId)) ?? teamById.get(teamId)?.name ?? '-';
  };

  return matches.map((m) => ({
    id: m.id,
    event_id: m.event_id,
    date: m.date,
    time: m.time,
    round_number: m.round_number,
    status: m.status,
    stage_type: m.stage_type,
    bracket_round: m.bracket_round,
    score1: m.score1,
    score2: m.score2,
    team1_id: m.team1_id ?? 0,
    team2_id: m.team2_id ?? 0,
    team1_name: getTeamName(m.team1_id),
    team1_logo: m.team1_id != null ? (teamById.get(m.team1_id)?.logo_url ?? null) : null,
    team2_name: getTeamName(m.team2_id),
    team2_logo: m.team2_id != null ? (teamById.get(m.team2_id)?.logo_url ?? null) : null,
    team1_disqualified: m.team1_id != null && disqualifiedTeamIds.has(m.team1_id),
    team2_disqualified: m.team2_id != null && disqualifiedTeamIds.has(m.team2_id),
    field_name: m.field_id != null ? (fieldById.get(m.field_id) ?? null) : null,
  }));
}
