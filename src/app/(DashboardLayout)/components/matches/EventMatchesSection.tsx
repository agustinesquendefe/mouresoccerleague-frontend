'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { getMatchesByEvent } from '@/services/matches';
import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import type { Match } from '@/models/match';
import GenerateFixtureButton from './GenerateFixtureButton';
import MatchesTable from './MatchesTable';
import { Team } from '@/models/team';

type EventTeamRow = {
  id: number;
  team_id: number;
  teams?: Team[];
};

type Props = {
  eventId: number;
};

export default function EventMatchesSection({ eventId }: Props) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [eventTeams, setEventTeams] = useState<EventTeamRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
        setLoading(true);

        const [matchesData, eventTeamsData] = await Promise.all([
            getMatchesByEvent(eventId),
            getEventTeams(eventId),
        ]);

        setMatches(matchesData);
        setEventTeams((eventTeamsData ?? []) as EventTeamRow[]);

        } catch (error) {
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [eventId]);

    const teamMap = useMemo(() => {
        return eventTeams.reduce<Record<number, string>>((acc, row: any) => {
            const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

            if (team?.name) {
            acc[row.team_id] = team.name;
            }

            return acc;
        }, {});
    }, [eventTeams]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Matches</Typography>
        <GenerateFixtureButton eventId={eventId} onGenerated={loadData} />
      </Stack>

      {loading && <Typography>Loading matches...</Typography>}

      {!loading && matches.length === 0 && (
        <Alert severity="info">No matches generated yet.</Alert>
      )}

      {!loading && matches.length > 0 && (
        <MatchesTable matches={matches} teamMap={teamMap} />
      )}
    </Stack>
  );
}