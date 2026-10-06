'use client';

import { useEffect, useState } from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  Badge,
  Button,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import type { Category } from '@/models/category';
import type { EventFormatType, EventStatus } from '@/models/event';
import type { Season } from '@/models/season';
import { WEEKDAY_OPTIONS } from '@/utils/weekdays';

export type EventFilters = {
  search: string;
  categoryId: number | null;
  seasonId: number | null;
  dayOfWeek: number | null;
  status: EventStatus | null;
  formatType: EventFormatType | null;
};

type Props = {
  value: EventFilters;
  categories: Category[];
  seasons: Season[];
  onChange: (filters: EventFilters) => void;
};

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const FORMAT_OPTIONS: { value: EventFormatType; label: string }[] = [
  { value: 'round_robin', label: 'Round robin' },
  { value: 'groups', label: 'Groups' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'mixed', label: 'Mixed' },
];

const EMPTY_FILTERS: EventFilters = {
  search: '',
  categoryId: null,
  seasonId: null,
  dayOfWeek: null,
  status: null,
  formatType: null,
};

export default function EventsFilters({ value, categories, seasons, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setDraft(value), [value]);

  const activeFilterCount = [
    value.categoryId,
    value.seasonId,
    value.dayOfWeek,
    value.status,
    value.formatType,
  ].filter((item) => item !== null).length;

  const updateDraft = <K extends keyof EventFilters>(key: K, nextValue: EventFilters[K]) => {
    setDraft((current) => ({ ...current, [key]: nextValue }));
  };

  const apply = () => onChange({ ...draft, search: draft.search.trim() });

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Search events"
          placeholder="Name, key, season, or category"
          value={draft.search}
          onChange={(event) => {
            const search = event.target.value;
            updateDraft('search', search);
            if (search.trim() === '') onChange({ ...value, search: '' });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply();
          }}
        />
        <Button variant="contained" onClick={apply}>
          Search
        </Button>
        <Badge badgeContent={activeFilterCount} color="primary">
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFiltersOpen((open) => !open)}
            sx={{ height: '100%', whiteSpace: 'nowrap' }}
          >
            Filters
          </Button>
        </Badge>
      </Stack>

      <Collapse in={filtersOpen}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 2 }}
        >
          <TextField
            select
            label="Event day"
            value={draft.dayOfWeek ?? ''}
            onChange={(event) =>
              updateDraft('dayOfWeek', event.target.value === '' ? null : Number(event.target.value))
            }
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All days</MenuItem>
            {WEEKDAY_OPTIONS.map((day) => (
              <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            value={draft.categoryId ?? ''}
            onChange={(event) =>
              updateDraft('categoryId', event.target.value === '' ? null : Number(event.target.value))
            }
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Season"
            value={draft.seasonId ?? ''}
            onChange={(event) =>
              updateDraft('seasonId', event.target.value === '' ? null : Number(event.target.value))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All seasons</MenuItem>
            {seasons.map((season) => (
              <MenuItem key={season.id} value={season.id}>{season.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={draft.status ?? ''}
            onChange={(event) =>
              updateDraft('status', (event.target.value || null) as EventStatus | null)
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Format"
            value={draft.formatType ?? ''}
            onChange={(event) =>
              updateDraft('formatType', (event.target.value || null) as EventFormatType | null)
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All formats</MenuItem>
            {FORMAT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={apply}>Apply filters</Button>
          <Button
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onChange(EMPTY_FILTERS);
            }}
          >
            Clear
          </Button>
        </Stack>
      </Collapse>
    </Paper>
  );
}
