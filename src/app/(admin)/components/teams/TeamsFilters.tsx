'use client';

import { Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import type { Category } from '@/models/category';
import { WEEKDAY_OPTIONS } from '@/utils/weekdays';

type Props = {
  initialSearch?: string;
  initialCategoryId?: number | null;
  initialDayOfWeek?: number | null;
  categories: Category[];
  onFilter: (filters: { search: string; categoryId: number | null; dayOfWeek: number | null }) => void;
};

export default function TeamsFilters({
  initialSearch = '',
  initialCategoryId = null,
  initialDayOfWeek = null,
  categories,
  onFilter,
}: Props) {
  const [value, setValue] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<number | ''>(initialCategoryId ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<number | ''>(initialDayOfWeek ?? '');

  useEffect(() => {
    setValue(initialSearch);
    setCategoryId(initialCategoryId ?? '');
    setDayOfWeek(initialDayOfWeek ?? '');
  }, [initialSearch, initialCategoryId, initialDayOfWeek]);

  const submitFilters = (nextSearch = value, nextCategoryId = categoryId, nextDayOfWeek = dayOfWeek) => {
    onFilter({
      search: nextSearch,
      categoryId: nextCategoryId === '' ? null : Number(nextCategoryId),
      dayOfWeek: nextDayOfWeek === '' ? null : Number(nextDayOfWeek),
    });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Search team"
          placeholder="Name, code, or category"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);

            if (nextValue.trim() === '') {
              submitFilters('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitFilters();
          }}
        />

        <TextField
          select
          label="Category"
          value={categoryId}
          onChange={(event) => {
            const nextValue = event.target.value === '' ? '' : Number(event.target.value);
            setCategoryId(nextValue);
            submitFilters(value, nextValue, dayOfWeek);
          }}
          sx={{ minWidth: { xs: '100%', md: 220 } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Playing day"
          value={dayOfWeek}
          onChange={(event) => {
            const nextValue = event.target.value === '' ? '' : Number(event.target.value);
            setDayOfWeek(nextValue);
            submitFilters(value, categoryId, nextValue);
          }}
          sx={{ minWidth: { xs: '100%', md: 180 } }}
        >
          <MenuItem value="">All days</MenuItem>
          {WEEKDAY_OPTIONS.map((day) => (
            <MenuItem key={day.value} value={day.value}>
              {day.label}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={() => submitFilters()}>
          Search
        </Button>
      </Stack>
    </Paper>
  );
}
