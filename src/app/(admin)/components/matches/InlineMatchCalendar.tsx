'use client';

import { useMemo } from 'react';
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

type Props = {
  month: Date;
  selectedDate: string;
  matchCountByDate: Record<string, number>;
  onMonthChange: (month: Date) => void;
  onDateChange: (date: string) => void;
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameCalendarDay(left: Date, right: Date): boolean {
  return dateKey(left) === dateKey(right);
}

export default function InlineMatchCalendar({
  month,
  selectedDate,
  matchCountByDate,
  onMonthChange,
  onDateChange,
}: Props) {
  const days = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [month]);

  const today = new Date();

  return (
    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 390, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider' }}
      >
        <IconButton
          size="small"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography fontWeight={700}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', p: 1 }}>
        {weekdayLabels.map((label) => (
          <Typography
            key={label}
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            textAlign="center"
            sx={{ py: 0.75 }}
          >
            {label}
          </Typography>
        ))}

        {days.map((date) => {
          const key = dateKey(date);
          const selected = key === selectedDate;
          const inMonth = date.getMonth() === month.getMonth();
          const count = matchCountByDate[key] ?? 0;

          return (
            <Box
              component="button"
              type="button"
              key={key}
              aria-label={`${date.toLocaleDateString()}${count ? `, ${count} matches` : ''}`}
              onClick={() => {
                onDateChange(key);
                if (!inMonth) onMonthChange(new Date(date.getFullYear(), date.getMonth(), 1));
              }}
              sx={{
                position: 'relative',
                appearance: 'none',
                border: 0,
                bgcolor: selected ? 'primary.main' : 'transparent',
                color: selected ? 'primary.contrastText' : inMonth ? 'text.primary' : 'text.disabled',
                borderRadius: 1.5,
                minHeight: 42,
                cursor: 'pointer',
                font: 'inherit',
                outline: sameCalendarDay(date, today) && !selected ? '1px solid' : 'none',
                outlineColor: 'primary.main',
                outlineOffset: -3,
                '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              <Typography component="span" variant="body2" fontWeight={selected ? 700 : 400}>
                {date.getDate()}
              </Typography>
              {count > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 4,
                    transform: 'translateX(-50%)',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: selected ? 'primary.contrastText' : 'success.main',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
