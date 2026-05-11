'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '@/lib/supabaseClient';

const navItems = [
  {
    href: '/referee/matches',
    label: 'My Matches',
    icon: SportsSoccerIcon,
  },
  {
    href: '/referee/scanner',
    label: 'Scanner',
    icon: QrCodeScannerIcon,
  },
];

export default function RefereeLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/authentication/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 220 }}>
            <AssignmentTurnedInIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                Referee Portal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Match check-in and player validation
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);

              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  variant={active ? 'contained' : 'text'}
                  startIcon={<Icon fontSize="small" />}
                  sx={{ flexShrink: 0 }}
                >
                  {item.label}
                </Button>
              );
            })}
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={handleLogout}
              sx={{ flexShrink: 0 }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
