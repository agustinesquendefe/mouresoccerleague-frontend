'use client';

import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EmotionCacheProvider from '@/app/EmotionCacheProvider';

const theme = createTheme({
  palette: {
    primary: { main: '#023467' },
    secondary: { main: '#ffb304' },
  },
});

export default function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </EmotionCacheProvider>
  );
}
