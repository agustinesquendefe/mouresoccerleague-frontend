"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";
import {
  getPlayerPortalData,
  type PlayerPortalData,
  type PlayerPortalEvent,
} from "@/services/playerPortal";

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPaymentColor(status: PlayerPortalEvent["payment_status"]) {
  return status === "paid" ? "success" : "warning";
}

export default function PlayerPortalPage() {
  const [email, setEmail] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<PlayerPortalData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const playerFirstName = useMemo(() => {
    if (!portalData?.player) return "Player";
    return portalData.player.first_name || portalData.player.full_name || "Player";
  }, [portalData]);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentEmail = data.session?.user.email ?? null;
      setSessionEmail(currentEmail);
      setLoadingSession(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionEmail) {
      setPortalData(null);
      return;
    }

    const loadPortal = async () => {
      try {
        setLoadingPortal(true);
        setErrorMessage(null);
        const data = await getPlayerPortalData(sessionEmail);
        setPortalData(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load player portal."
        );
      } finally {
        setLoadingPortal(false);
      }
    };

    loadPortal();
  }, [sessionEmail]);

  const handleSendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    try {
      setSendingLink(true);
      setErrorMessage(null);
      setMagicLinkSent(false);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/player-portal`,
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send verification email."
      );
    } finally {
      setSendingLink(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setPortalData(null);
    setMagicLinkSent(false);
  };

  if (loadingSession) {
    return (
      <main className="container mx-auto px-4 py-16">
        <Stack alignItems="center">
          <CircularProgress />
        </Stack>
      </main>
    );
  }

  return (
    <main className="bg-white text-brand-black">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <Stack spacing={4}>
          <Box>
            <Typography variant="h3" fontWeight={800}>
              Player Portal
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1 }}>
              Sign in with the email registered on your player profile to review
              your events, team, schedule, and membership status.
            </Typography>
          </Box>

          {!sessionEmail && (
            <Box
              component="form"
              onSubmit={handleSendMagicLink}
              sx={{
                width: "100%",
                maxWidth: 520,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 3,
              }}
            >
              <Stack spacing={2}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                {magicLinkSent && (
                  <Alert severity="success">
                    Check your email. We sent you a secure sign-in link.
                  </Alert>
                )}
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  fullWidth
                  required
                />
                <Button
                  variant="contained"
                  type="submit"
                  disabled={sendingLink || !email.trim()}
                  size="large"
                >
                  {sendingLink ? "Sending..." : "Send sign-in link"}
                </Button>
              </Stack>
            </Box>
          )}

          {sessionEmail && (
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Welcome, {playerFirstName}
                  </Typography>
                  <Typography color="text.secondary">{sessionEmail}</Typography>
                </Box>
                <Button variant="outlined" onClick={handleSignOut}>
                  Sign out
                </Button>
              </Stack>

              {loadingPortal && (
                <Stack alignItems="center" py={4}>
                  <CircularProgress />
                </Stack>
              )}

              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

              {!loadingPortal && !portalData && (
                <Alert severity="warning">
                  We could not find an active player profile for this email.
                </Alert>
              )}

              {!loadingPortal && portalData && portalData.events.length === 0 && (
                <Alert severity="info">
                  No active event assignments were found for your player profile.
                </Alert>
              )}

              {!loadingPortal &&
                portalData?.events.map((event) => (
                  <Box
                    key={`${event.event_id}:${event.team_id}`}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: { xs: 2, md: 3 },
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography variant="h5" fontWeight={800}>
                            {event.event_name}
                          </Typography>
                          <Typography color="text.secondary">
                            {event.team_name}
                            {event.jersey_number ? ` | #${event.jersey_number}` : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            label={event.payment_status === "paid" ? "Paid" : "Payment pending"}
                            color={getPaymentColor(event.payment_status)}
                          />
                          <Chip
                            label={`${event.free_appearances_remaining} free appearances`}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      <Divider />

                      <Stack spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Schedule
                        </Typography>
                        {event.upcoming_matches.length === 0 ? (
                          <Typography color="text.secondary">
                            No matches scheduled yet.
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {event.upcoming_matches.map((match) => (
                              <Box
                                key={match.id}
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "150px 1fr 120px",
                                  },
                                  gap: 1,
                                  py: 1,
                                }}
                              >
                                <Typography fontWeight={700}>
                                  {formatDate(match.date)} {formatTime(match.time)}
                                </Typography>
                                <Typography>
                                  {match.home_team_name} vs {match.away_team_name}
                                </Typography>
                                <Typography color="text.secondary">
                                  {match.field_name ?? match.status ?? ""}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
            </Stack>
          )}
        </Stack>
      </section>
    </main>
  );
}
