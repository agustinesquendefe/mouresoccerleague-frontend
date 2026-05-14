"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

export default function CoachPortalPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    };

    loadSession();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <Stack alignItems="center">
          <CircularProgress />
        </Stack>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-brand-black">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h3" fontWeight={900}>
              Coach Portal
            </Typography>
            <Typography color="text.secondary">
              Team tools and match operations for coaches.
            </Typography>
          </Box>

          {!email ? (
            <Alert severity="warning">
              Please access this portal through My Portal using your registered email.
            </Alert>
          ) : (
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography fontWeight={800}>Signed in as {email}</Typography>
                  <Alert severity="info">
                    Coach-specific tools can be added here next.
                  </Alert>
                  <Button variant="outlined" onClick={handleSignOut} sx={{ alignSelf: "flex-start" }}>
                    Sign out
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </section>
    </main>
  );
}
