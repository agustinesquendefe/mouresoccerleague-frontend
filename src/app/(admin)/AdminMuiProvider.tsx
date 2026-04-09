'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EmotionCacheProvider from '@/app/EmotionCacheProvider';
import { baselightTheme } from '@/utils/theme/DefaultColors';

export default function AdminMuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider options={{ key: 'css' }}>
      <ThemeProvider theme={baselightTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </EmotionCacheProvider>
  );
}
