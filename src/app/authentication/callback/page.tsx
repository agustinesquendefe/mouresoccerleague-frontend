'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

function getRedirectPath(role?: string | null) {
  if (role === 'admin' || role === 'editor') return '/admin/dashboard';
  if (role === 'referee') return '/referee/matches';
  return '/';
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finishAuth = async () => {
      try {
        const code = searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(sessionError.message);

        const userId = sessionData.session?.user?.id;
        if (!userId) {
          throw new Error('Unable to complete sign in. Please request a new invite link.');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);

        router.replace(getRedirectPath(profile?.role));
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to complete sign in.');
        }
      }
    };

    finishAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={3}>
      <Stack spacing={2} alignItems="center" maxWidth={420}>
        {errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : (
          <>
            <CircularProgress />
            <Typography color="text.secondary">Completing sign in...</Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default function AuthenticationCallbackPage() {
  return (
    <Suspense
      fallback={
        <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={3}>
          <Stack spacing={2} alignItems="center" maxWidth={420}>
            <CircularProgress />
            <Typography color="text.secondary">Completing sign in...</Typography>
          </Stack>
        </Box>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
