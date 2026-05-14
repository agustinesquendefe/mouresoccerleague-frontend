"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

type PortalOption = {
  type: "player" | "coach" | "referee";
  label: string;
  href: string;
  name: string;
};

type ResolvePortalResponse = {
  email: string;
  portals: PortalOption[];
  redirectTo: string | null;
};

function getMagicLinkErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return "Too many verification emails were requested. Please wait a few minutes before trying again.";
  }

  return message || "Unable to send verification email.";
}

export default function PortalAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [portalOptions, setPortalOptions] = useState<PortalOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvePortal = async (emailToResolve: string) => {
    const response = await fetch("/api/portal/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: emailToResolve }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to resolve portal access.");
    }

    return payload.data as ResolvePortalResponse;
  };

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user.email ?? null);
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
      setPortalOptions([]);
      return;
    }

    const loadPortal = async () => {
      try {
        setErrorMessage(null);
        const data = await resolvePortal(sessionEmail);

        if (data.redirectTo) {
          router.replace(data.redirectTo);
          return;
        }

        setPortalOptions(data.portals);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to resolve portal access.");
      }
    };

    loadPortal();
  }, [router, sessionEmail]);

  const handleSendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return;

    try {
      setSendingLink(true);
      setErrorMessage(null);
      setMagicLinkSent(false);

      await resolvePortal(trimmedEmail);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (error) {
      setErrorMessage(getMagicLinkErrorMessage(error));
    } finally {
      setSendingLink(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setPortalOptions([]);
    setMagicLinkSent(false);
  };

  if (loadingSession) {
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
        <Stack spacing={3} alignItems="center">
          <Box textAlign="center" maxWidth={720}>
            <Typography variant="overline" color="text.secondary">
              Moure Premier League
            </Typography>
            <Typography variant="h3" fontWeight={900}>
              My Portal
            </Typography>
            <Typography color="text.secondary" mt={1}>
              Enter your registered email and we will send a secure verification link.
            </Typography>
          </Box>

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
                {sessionEmail ? (
                  <Alert
                    severity="info"
                    action={
                      <Button color="inherit" size="small" onClick={handleSignOut}>
                        Sign out
                      </Button>
                    }
                  >
                    Signed in as {sessionEmail}
                  </Alert>
                ) : null}

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                {magicLinkSent ? (
                  <Alert severity="success">
                    Check your email. We sent you a secure verification link.
                  </Alert>
                ) : null}

                {!sessionEmail ? (
                  <>
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
                      {sendingLink ? "Sending..." : "Send verification link"}
                    </Button>
                  </>
                ) : null}

                {portalOptions.length > 1 ? (
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Choose your portal</Typography>
                    {portalOptions.map((option) => (
                      <Button
                        key={option.type}
                        variant="outlined"
                        size="large"
                        onClick={() => router.push(option.href)}
                      >
                        Continue as {option.label} · {option.name}
                      </Button>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </section>
    </main>
  );
}
