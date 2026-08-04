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
  components: {
    MuiTableContainer: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          width: 'max-content',
          minWidth: '100%',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          whiteSpace: 'nowrap',
        },
      },
    },
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
