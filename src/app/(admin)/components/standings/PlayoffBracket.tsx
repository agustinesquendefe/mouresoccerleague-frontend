'use client';

import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { PlayoffRoundGroup, PlayoffMatch } from '@/services/standings/getPlayoffMatches';

type Props = {
  rounds: PlayoffRoundGroup[];
};

function MatchCard({ match }: { match: PlayoffMatch }) {
  const isPlayed = String(match.status).toLowerCase() === 'played';
  const winner = match.winner_team_id;

  const team1IsWinner = isPlayed && winner === match.team1_id;
  const team2IsWinner = isPlayed && winner === match.team2_id;

  const hasScore = match.score1 !== null && match.score2 !== null;
  const hasPenalties = match.penalty_score1 !== null && match.penalty_score2 !== null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        minWidth: 200,
      }}
    >
      {/* Team 1 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 1,
          bgcolor: team1IsWinner ? 'primary.main' : 'transparent',
        }}
      >
        <Typography
          variant="body2"
          fontWeight={team1IsWinner ? 700 : 400}
          color={team1IsWinner ? 'primary.contrastText' : 'text.primary'}
          sx={{ flex: 1, mr: 1 }}
        >
          {match.team1_name}
        </Typography>
        {hasScore && (
          <Typography
            variant="body2"
            fontWeight={700}
            color={team1IsWinner ? 'primary.contrastText' : 'text.primary'}
          >
            {match.score1}
            {hasPenalties ? ` (${match.penalty_score1})` : ''}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Team 2 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 1,
          bgcolor: team2IsWinner ? 'primary.main' : 'transparent',
        }}
      >
        <Typography
          variant="body2"
          fontWeight={team2IsWinner ? 700 : 400}
          color={team2IsWinner ? 'primary.contrastText' : 'text.primary'}
          sx={{ flex: 1, mr: 1 }}
        >
          {match.team2_name}
        </Typography>
        {hasScore && (
          <Typography
            variant="body2"
            fontWeight={700}
            color={team2IsWinner ? 'primary.contrastText' : 'text.primary'}
          >
            {match.score2}
            {hasPenalties ? ` (${match.penalty_score2})` : ''}
          </Typography>
        )}
      </Box>

      {/* Status chip */}
      {match.status && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Chip
            label={isPlayed ? 'Played' : match.status}
            size="small"
            color={isPlayed ? 'success' : 'default'}
            sx={{ fontSize: 10, height: 18 }}
          />
        </Box>
      )}
    </Paper>
  );
}

export default function PlayoffBracket({ rounds }: Props) {
  if (!rounds.length) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Playoff Bracket
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          pb: 1,
          alignItems: 'flex-start',
        }}
      >
        {rounds.map((group) => (
          <Box key={group.round} sx={{ minWidth: 220, flexShrink: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="text.secondary"
              sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}
            >
              {group.label}
            </Typography>

            <Stack spacing={1.5}>
              {group.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
