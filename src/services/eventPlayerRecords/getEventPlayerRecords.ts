import { supabase } from '@/lib/supabaseClient';

export type EventPlayerMatchRecord = {
  matchId: number;
  roundNumber: number | null;
  status: string | null;
  opponentId: number;
  opponentName: string;
  scoreFor: number | null;
  scoreAgainst: number | null;
  penaltyScoreFor: number | null;
  penaltyScoreAgainst: number | null;
  date: string | null;
};

export type EventPlayerRecord = {
  rosterId: number;
  playerId: number;
  playerName: string;
  documentId: string | null;
  jerseyNumber: number | null;
  appearancesCount: number;
  playedMatches: EventPlayerMatchRecord[];
};

export type EventTeamPlayerRecords = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  players: EventPlayerRecord[];
  matches: EventPlayerMatchRecord[];
};

type EventTeamRow = {
  team_id: number;
  display_name: string | null;
  teams: { name?: string | null; logo_url?: string | null } | Array<{ name?: string | null; logo_url?: string | null }> | null;
};

type MatchRow = {
  id: number;
  team1_id: number;
  team2_id: number;
  round_number: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  date: string | null;
};

type RosterRow = {
  id: number;
  team_id: number;
  player_id: number;
  jersey_number: number | null;
  player: { full_name?: string | null; document_id?: string | null } | Array<{ full_name?: string | null; document_id?: string | null }> | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function getEventPlayerRecords(eventId: number): Promise<EventTeamPlayerRecords[]> {
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new Error('Invalid event id');
  }

  const [eventTeamsResponse, matchesResponse, rosterResponse] = await Promise.all([
    supabase
      .from('event_teams')
      .select('team_id, display_name, teams(name, logo_url)')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, round_number, status, score1, score2, penalty_score1, penalty_score2, date')
      .eq('event_id', eventId)
      .order('round_number', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('team_players')
      .select('id, team_id, player_id, jersey_number, player:players(full_name, document_id)')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('jersey_number', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (eventTeamsResponse.error) throw new Error(eventTeamsResponse.error.message);
  if (matchesResponse.error) throw new Error(matchesResponse.error.message);
  if (rosterResponse.error) throw new Error(rosterResponse.error.message);

  const eventTeams = (eventTeamsResponse.data ?? []) as EventTeamRow[];
  const matches = (matchesResponse.data ?? []) as MatchRow[];
  const roster = (rosterResponse.data ?? []) as RosterRow[];
  const matchIds = matches.map((match) => match.id);

  const checkInsResponse = matchIds.length > 0
    ? await supabase
      .from('match_check_ins')
      .select('match_id, team_id, player_id, status')
      .in('match_id', matchIds)
      .eq('status', 'approved')
    : { data: [], error: null };

  if (checkInsResponse.error) throw new Error(checkInsResponse.error.message);

  const teamNameMap = new Map<number, string>();
  eventTeams.forEach((eventTeam) => {
    const team = firstRelation(eventTeam.teams);
    teamNameMap.set(
      Number(eventTeam.team_id),
      eventTeam.display_name?.trim() || team?.name?.trim() || `Team #${eventTeam.team_id}`
    );
  });

  const buildMatchRecord = (match: MatchRow, teamId: number): EventPlayerMatchRecord => {
    const isTeam1 = Number(match.team1_id) === teamId;
    const opponentId = Number(isTeam1 ? match.team2_id : match.team1_id);

    return {
      matchId: Number(match.id),
      roundNumber: match.round_number == null ? null : Number(match.round_number),
      status: match.status,
      opponentId,
      opponentName: teamNameMap.get(opponentId) ?? `Team #${opponentId}`,
      scoreFor: isTeam1 ? match.score1 : match.score2,
      scoreAgainst: isTeam1 ? match.score2 : match.score1,
      penaltyScoreFor: isTeam1 ? match.penalty_score1 : match.penalty_score2,
      penaltyScoreAgainst: isTeam1 ? match.penalty_score2 : match.penalty_score1,
      date: match.date,
    };
  };

  const playedMatchMap = new Map(
    matches
      .filter((match) => String(match.status ?? '').toLowerCase() === 'played')
      .map((match) => [Number(match.id), match])
  );
  const playerPlayedMatchIds = new Map<string, Set<number>>();

  (checkInsResponse.data ?? []).forEach((checkIn) => {
    const matchId = Number(checkIn.match_id);
    if (!playedMatchMap.has(matchId)) return;

    const playerId = Number(checkIn.player_id);
    const teamId = Number(checkIn.team_id);
    const key = `${teamId}:${playerId}`;
    const current = playerPlayedMatchIds.get(key) ?? new Set<number>();
    current.add(matchId);
    playerPlayedMatchIds.set(key, current);
  });

  return eventTeams.map((eventTeam) => {
    const teamId = Number(eventTeam.team_id);
    const team = firstRelation(eventTeam.teams);
    const teamMatches = matches
      .filter((match) => Number(match.team1_id) === teamId || Number(match.team2_id) === teamId)
      .map((match) => buildMatchRecord(match, teamId));
    const teamMatchById = new Map(teamMatches.map((match) => [match.matchId, match]));

    const players = roster
      .filter((row) => Number(row.team_id) === teamId)
      .map((row) => {
        const player = firstRelation(row.player);
        const playedMatchIds = playerPlayedMatchIds.get(`${teamId}:${Number(row.player_id)}`) ?? new Set<number>();
        const playedMatches = Array.from(playedMatchIds)
          .map((matchId) => teamMatchById.get(matchId))
          .filter((match): match is EventPlayerMatchRecord => Boolean(match));

        return {
          rosterId: Number(row.id),
          playerId: Number(row.player_id),
          playerName: player?.full_name?.trim() || `Player #${row.player_id}`,
          documentId: player?.document_id ?? null,
          jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
          appearancesCount: playedMatches.length,
          playedMatches,
        };
      });

    return {
      teamId,
      teamName: teamNameMap.get(teamId) ?? `Team #${teamId}`,
      teamLogoUrl: team?.logo_url ?? null,
      players,
      matches: teamMatches,
    };
  });
}
