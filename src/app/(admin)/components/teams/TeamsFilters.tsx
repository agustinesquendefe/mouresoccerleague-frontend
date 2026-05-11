'use client';

import { Button, Paper, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

type Props = {
  initialSearch?: string;
  onSearch: (value: string) => void;
};

export default function TeamsFilters({ initialSearch = '', onSearch }: Props) {
  const [value, setValue] = useState(initialSearch);

  useEffect(() => {
    setValue(initialSearch);
  }, [initialSearch]);

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
              onSearch('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch(value);
          }}
        />

        <Button variant="contained" onClick={() => onSearch(value)}>
          Search
        </Button>
      </Stack>
    </Paper>
  );
}
