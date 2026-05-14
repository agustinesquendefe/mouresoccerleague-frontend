'use client';

import { useEffect, useState } from 'react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import AdminScannerClient from '@/app/(admin)/components/scanner/AdminScannerClient';
import { supabase } from '@/lib/supabaseClient';
import type { ScannerContextData } from '@/models/scanner';

type RefereeScannerPayload = {
  context: ScannerContextData;
};

export default function RefereeScannerClient() {
  const [context, setContext] = useState<ScannerContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error('Please log in before opening the referee portal.');
        }

        const response = await fetch('/api/referee/context', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to load scanner context.');
        }

        if (active) {
          setContext((payload.data as RefereeScannerPayload).context);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load scanner context.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" fontWeight={800}>
          Scanner
        </Typography>
        <Typography color="text.secondary">
          Validate memberships and check players into assigned matches.
        </Typography>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {context && context.matches.length > 0 ? (
        <AdminScannerClient
          initialContext={context}
          restrictToInitialContext
          storageKey="moure-referee-scanner-context"
        />
      ) : !errorMessage ? (
        <Alert severity="info">No assigned matches are available for scanner validation.</Alert>
      ) : null}
    </Stack>
  );
}
