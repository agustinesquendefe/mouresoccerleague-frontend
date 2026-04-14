'use client';

import { Button, Paper, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

type Props = {
  initialSearch?: string;
  onSearch: (value: string) => void;
};

export default function PlayersFilters({ initialSearch = '', onSearch }: Props) {
  const [value, setValue] = useState(initialSearch);

  useEffect(() => {
    setValue(initialSearch);
  }, [initialSearch]);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Search player"
          placeholder="Document ID, first name, or last name"
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value;
            setValue(nextValue);

            if (nextValue.trim() === '') {
              onSearch('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch(value);
          }}
        />

        <Button variant="contained" onClick={() => onSearch(value)}>
          Search
        </Button>
      </Stack>
    </Paper>
  );
}