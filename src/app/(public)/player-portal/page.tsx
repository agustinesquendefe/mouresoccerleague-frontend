"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { supabase } from "@/lib/supabaseClient";
import type { PlayerPortalData, PlayerPortalEvent } from "@/services/playerPortal";

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

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getPaymentProgress(event: PlayerPortalEvent) {
  if (event.event_price <= 0) return 0;
  return Math.min((event.paid_amount / event.event_price) * 100, 100);
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
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [payingEventId, setPayingEventId] = useState<number | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({});

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

  const loadPortalData = async (emailToLoad: string) => {
    setLoadingPortal(true);
    setErrorMessage(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please sign in again to load your portal.");
    }

    const response = await fetch("/api/player-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error ?? "Failed to load player portal.");
    }

    setPortalData(result.data);
    setLoadingPortal(false);
  };

  useEffect(() => {
    if (!sessionEmail) {
      setPortalData(null);
      return;
    }

    const loadPortal = async () => {
      try {
        await loadPortalData(sessionEmail);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load player portal."
        );
        setLoadingPortal(false);
      }
    };

    loadPortal();
  }, [sessionEmail]);

  useEffect(() => {
    if (!sessionEmail) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("checkout_session_id");

    if (!sessionId) return;

    const confirmPayment = async () => {
      try {
        setLoadingPortal(true);
        setErrorMessage(null);
        setPaymentMessage(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in again before confirming payment.");
        }

        const response = await fetch("/api/stripe/player-event-checkout/confirm", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to confirm payment.");
        }

        if (data.paid) {
          setPaymentMessage("Payment confirmed. Your event balance was updated.");
          await loadPortalData(sessionEmail);
        }

        window.history.replaceState({}, "", window.location.pathname);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to confirm payment."
        );
        setLoadingPortal(false);
      }
    };

    confirmPayment();
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

  const handlePayEvent = async (event: PlayerPortalEvent) => {
    try {
      const amount = Number(paymentAmounts[event.event_id] ?? event.balance_due);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      if (amount > event.balance_due) {
        throw new Error(`Payment amount cannot be greater than ${formatMoney(event.balance_due)}.`);
      }

      setPayingEventId(event.event_id);
      setErrorMessage(null);
      setPaymentMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again before paying.");
      }

      const response = await fetch("/api/stripe/player-event-checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId: event.event_id, amount }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to start checkout.");
      }

      if (!data.checkout_url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = data.checkout_url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setPayingEventId(null);
    }
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
    <main className="min-h-screen bg-slate-50 text-brand-black">
      <section className="container mx-auto px-4 py-8 md:py-12">
        <Stack spacing={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                bgcolor: "#0f172a",
                color: "white",
                p: { xs: 3, md: 4 },
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    Moure Premier League
                  </Typography>
                  <Typography variant="h3" fontWeight={800}>
                    Player Portal
                  </Typography>
                  <Typography sx={{ maxWidth: 720, mt: 1, color: "rgba(255,255,255,0.78)" }}>
                    Review your events, team assignments, upcoming games, and payment status.
                  </Typography>
                  <Alert
                    severity="warning"
                    sx={{
                      mt: 2,
                      maxWidth: "100%",
                      bgcolor: "rgba(255, 244, 229, 0.95)",
                      color: "#663c00",
                    }}
                  >
                    To play an event without issues, you must complete the full registration payment. Partial payments allow you to play up to 4 games only; starting with the 5th game, you will not be allowed to play until the balance is paid.
                  </Alert>
                </Box>
                {sessionEmail && (
                  <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={1}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      Signed in as
                    </Typography>
                    <Typography fontWeight={700}>{sessionEmail}</Typography>
                    <Button variant="outlined" color="inherit" onClick={handleSignOut}>
                      Sign out
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Card>

          {!sessionEmail && (
            <Card
              component="form"
              onSubmit={handleSendMagicLink}
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 520,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Sign in
                    </Typography>
                    <Typography color="text.secondary">
                      Use the email registered on your player profile.
                    </Typography>
                  </Box>
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
              </CardContent>
            </Card>
          )}

          {sessionEmail && (
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h4" fontWeight={800}>
                    Welcome, {playerFirstName}
                  </Typography>
                  <Typography color="text.secondary">
                    {portalData?.events.length ?? 0} active event{portalData?.events.length === 1 ? "" : "s"}
                  </Typography>
                </Box>
              </Stack>

              {loadingPortal && (
                <Stack alignItems="center" py={4}>
                  <CircularProgress />
                </Stack>
              )}

              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              {paymentMessage && <Alert severity="success">{paymentMessage}</Alert>}

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
                  <Card
                    key={`${event.event_id}:${event.team_id}`}
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Stack spacing={2.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography variant="h5" fontWeight={900}>
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
                            label={`${event.free_appearances_remaining} free games left`}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.75}>
                          <Typography variant="body2" color="text.secondary">
                            Payment progress
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {Math.round(getPaymentProgress(event))}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={getPaymentProgress(event)}
                          color={event.payment_status === "paid" ? "success" : "warning"}
                          sx={{ height: 8, borderRadius: 999 }}
                        />
                      </Box>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", sm: "flex-start" }}
                        spacing={2}
                      >
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(90px, 1fr))" },
                            gap: 1,
                            flex: 1,
                          }}
                        >
                          {[
                            ["Cost", event.event_price],
                            ["Paid", event.paid_amount],
                            ["Due", event.balance_due],
                          ].map(([label, value]) => (
                            <Box
                              key={label}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                p: 1.5,
                                bgcolor: "background.paper",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {label}
                              </Typography>
                              <Typography fontWeight={800}>{formatMoney(Number(value))}</Typography>
                            </Box>
                          ))}
                        </Box>
                        <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 260 } }}>
                          <TextField
                            label="Amount to pay"
                            type="number"
                            size="small"
                            value={paymentAmounts[event.event_id] ?? String(event.balance_due)}
                            onChange={(changeEvent) =>
                              setPaymentAmounts((prev) => ({
                                ...prev,
                                [event.event_id]: changeEvent.target.value,
                              }))
                            }
                            inputProps={{
                              min: 0.01,
                              max: event.balance_due,
                              step: 0.01,
                            }}
                            disabled={event.balance_due <= 0 || event.event_price <= 0}
                            error={
                              event.balance_due > 0 &&
                              (
                                !Number.isFinite(Number(paymentAmounts[event.event_id] ?? event.balance_due)) ||
                                Number(paymentAmounts[event.event_id] ?? event.balance_due) <= 0 ||
                                Number(paymentAmounts[event.event_id] ?? event.balance_due) > event.balance_due
                              )
                            }
                            helperText={
                              event.balance_due > 0 &&
                              Number(paymentAmounts[event.event_id] ?? event.balance_due) > event.balance_due
                                ? `Maximum: ${formatMoney(event.balance_due)}`
                                : " "
                            }
                            fullWidth
                          />
                          {(() => {
                            const amount = Number(paymentAmounts[event.event_id] ?? event.balance_due);
                            const isValidPartial =
                              Number.isFinite(amount) &&
                              amount > 0 &&
                              amount < event.balance_due;

                            return isValidPartial ? (
                              <Alert severity="warning">
                                Partial payment accepted. You can only play up to 4 matches unless the event is fully paid.
                              </Alert>
                            ) : null;
                          })()}
                          <Button
                            variant="contained"
                            disabled={
                              event.balance_due <= 0 ||
                              event.event_price <= 0 ||
                              !Number.isFinite(Number(paymentAmounts[event.event_id] ?? event.balance_due)) ||
                              Number(paymentAmounts[event.event_id] ?? event.balance_due) <= 0 ||
                              Number(paymentAmounts[event.event_id] ?? event.balance_due) > event.balance_due ||
                              payingEventId === event.event_id
                            }
                            onClick={() => handlePayEvent(event)}
                          >
                            {payingEventId === event.event_id
                              ? "Starting checkout..."
                              : event.balance_due <= 0
                                ? "Paid"
                                : "Pay event"}
                          </Button>
                        </Stack>
                      </Stack>

                      <Accordion
                        disableGutters
                        elevation={0}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: "12px !important",
                          "&:before": { display: "none" },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            spacing={0.5}
                            sx={{ width: "100%", pr: 1 }}
                          >
                            <Typography fontWeight={800}>Games</Typography>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${event.upcoming_matches.length} upcoming`}
                            />
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          {event.upcoming_matches.length === 0 ? (
                            <Typography color="text.secondary">
                              No matches scheduled yet.
                            </Typography>
                          ) : (
                            <Stack divider={<Divider flexItem />} spacing={0}>
                              {event.upcoming_matches.map((match) => (
                                <Box
                                  key={match.id}
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      md: "170px 1fr 140px",
                                    },
                                    gap: 1,
                                    py: 1.25,
                                  }}
                                >
                                  <Typography fontWeight={800}>
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
                        </AccordionDetails>
                      </Accordion>
                    </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
          )}
        </Stack>
      </section>
    </main>
  );
}
