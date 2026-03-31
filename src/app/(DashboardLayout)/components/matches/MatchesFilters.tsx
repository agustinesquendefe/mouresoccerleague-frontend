'use client';

import { Stack, TextField, MenuItem } from '@mui/material';

type EventOption = {
  id: number;
  name: string;
};

type Props = {
  events: EventOption[];
  filters: {
    eventId: string;
    status: string;
    stageType: string;
  };
  onChange: (next: { eventId: string; status: string; stageType: string }) => void;
};

export default function MatchesFilters({ events, filters, onChange }: Props) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField
        select
        label="Event"
        value={filters.eventId}
        onChange={(e) =>
          onChange({
            ...filters,
            eventId: e.target.value,
          })
        }
        fullWidth
      >
        <MenuItem value="">All Events</MenuItem>
        {events.map((event) => (
          <MenuItem key={event.id} value={String(event.id)}>
            {event.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Status"
        value={filters.status}
        onChange={(e) =>
          onChange({
            ...filters,
            status: e.target.value,
          })
        }
        fullWidth
      >
        <MenuItem value="">All Statuses</MenuItem>
        <MenuItem value="scheduled">Scheduled</MenuItem>
        <MenuItem value="in_progress">In Progress</MenuItem>
        <MenuItem value="played">Played</MenuItem>
        <MenuItem value="cancelled">Cancelled</MenuItem>
      </TextField>

      <TextField
        select
        label="Stage"
        value={filters.stageType}
        onChange={(e) =>
          onChange({
            ...filters,
            stageType: e.target.value,
          })
        }
        fullWidth
      >
        <MenuItem value="">All Stages</MenuItem>
        <MenuItem value="league">League</MenuItem>
        <MenuItem value="knockout">Knockout</MenuItem>
      </TextField>
    </Stack>
  );
}