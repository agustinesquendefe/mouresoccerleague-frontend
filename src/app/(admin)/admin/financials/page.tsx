'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import DashboardCard from '@/app/(admin)/components/shared/DashboardCard';
import {
  getFinancialOverview,
  type FinancialOverview,
  type FinancialPaymentRow,
} from '@/services/dashboard';

const PAYMENT_ROWS_PER_PAGE = 10;
const PAYMENT_TABS = ['all', 'paid', 'partial', 'pending'] as const;

type PaymentTab = (typeof PAYMENT_TABS)[number];

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'No date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function getPaymentChipColor(status: FinancialPaymentRow['status']) {
  if (status === 'paid') return 'success';
  if (status === 'partial') return 'warning';
  return 'default';
}

function isPaymentTab(value: unknown): value is PaymentTab {
  return typeof value === 'string' && PAYMENT_TABS.includes(value as PaymentTab);
}

function matchesPaymentTab(row: FinancialPaymentRow, tab: PaymentTab) {
  if (tab === 'all') return true;
  return row.status === tab;
}

function SummaryMetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
      }}
    >
      <Stack spacing={2} height="100%">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={0.5}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function FinancialsPage() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<PaymentTab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const response = await fetch('/api/admin/financial-overview');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error ?? 'Failed to load financial overview');
        }

        setOverview(result.data ?? null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load financial overview');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredPaymentRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = overview?.paymentRows ?? [];

    return rows.filter((row) => {
      const matchesTab = matchesPaymentTab(row, statusTab);

      if (!matchesTab) return false;
      if (!query) return true;

      return [row.playerName, row.teamName, row.eventName].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [overview, search, statusTab]);

  useEffect(() => {
    setPage(0);
  }, [search, statusTab]);

  const paginatedPaymentRows = useMemo(() => {
    const start = page * PAYMENT_ROWS_PER_PAGE;
    return filteredPaymentRows.slice(start, start + PAYMENT_ROWS_PER_PAGE);
  }, [filteredPaymentRows, page]);

  return (
    <PageContainer title="Financials" description="Admin financial overview">
      <Box>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700}>
              Financials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track gross sales, collections, pending balances, and net revenue across organized events and private field rentals.
            </Typography>
          </Stack>

          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : !overview ? (
            <Alert severity="info">No financial data is available yet.</Alert>
          ) : (
            <Stack spacing={3}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                  <SummaryMetricCard
                    title="Gross Sales"
                    value={formatMoney(overview.overall.grossSales)}
                    subtitle={`${overview.overall.totalCount} billable memberships across all tracked revenue sources.`}
                    icon={<ReceiptLongOutlinedIcon fontSize="small" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                  <SummaryMetricCard
                    title="Collected"
                    value={formatMoney(overview.overall.collected)}
                    subtitle={`${overview.overall.paidCount} players are fully paid.`}
                    icon={<PaidOutlinedIcon fontSize="small" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                  <SummaryMetricCard
                    title="Outstanding"
                    value={formatMoney(overview.overall.outstanding)}
                    subtitle={`${overview.overall.pendingCount} players still have an open balance.`}
                    icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
                  <SummaryMetricCard
                    title="Net Revenue"
                    value={formatMoney(overview.overall.netRevenue)}
                    subtitle="Net revenue currently reflects collected cash only. Operating expenses are not modeled yet."
                    icon={<MonetizationOnOutlinedIcon fontSize="small" />}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <DashboardCard
                    title="Organized Events"
                    subtitle="Revenue already tracked through event memberships and payments."
                  >
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">Gross sales</Typography>
                        <Typography variant="h6" fontWeight={700}>{formatMoney(overview.organizedEvents.grossSales)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">Collected</Typography>
                        <Typography variant="h6" fontWeight={700}>{formatMoney(overview.organizedEvents.collected)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">Outstanding</Typography>
                        <Typography variant="h6" fontWeight={700}>{formatMoney(overview.organizedEvents.outstanding)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">Net revenue</Typography>
                        <Typography variant="h6" fontWeight={700}>{formatMoney(overview.organizedEvents.netRevenue)}</Typography>
                      </Grid>
                    </Grid>
                  </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                  <DashboardCard
                    title="Private Field Rentals"
                    subtitle="Separated from event revenue so you can track it independently once rental bookings are stored."
                  >
                    <Stack spacing={2}>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">Gross sales</Typography>
                          <Typography variant="h6" fontWeight={700}>{formatMoney(overview.privateFieldRentals.grossSales)}</Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">Net revenue</Typography>
                          <Typography variant="h6" fontWeight={700}>{formatMoney(overview.privateFieldRentals.netRevenue)}</Typography>
                        </Grid>
                      </Grid>
                      <Alert severity="info">{overview.privateFieldRentalsNote}</Alert>
                    </Stack>
                  </DashboardCard>
                </Grid>
              </Grid>

              <DashboardCard
                title="Event Revenue Breakdown"
                subtitle="Gross sales, collections, and outstanding balances for each organized event."
              >
                {overview.eventRows.length === 0 ? (
                  <Typography color="text.secondary">No events found.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Event</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Dates</TableCell>
                          <TableCell align="right">Players</TableCell>
                          <TableCell align="right">Paid</TableCell>
                          <TableCell align="right">Pending</TableCell>
                          <TableCell align="right">Gross Sales</TableCell>
                          <TableCell align="right">Collected</TableCell>
                          <TableCell align="right">Outstanding</TableCell>
                          <TableCell align="right">Net Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {overview.eventRows.map((row) => (
                          <TableRow key={row.eventId} hover>
                            <TableCell>
                              <Typography fontWeight={600}>{row.eventName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.status ?? 'unknown'}
                                size="small"
                                color={row.status === 'active' ? 'success' : row.status === 'completed' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{`${formatDate(row.startDate)} - ${formatDate(row.endDate)}`}</TableCell>
                            <TableCell align="right">{row.players}</TableCell>
                            <TableCell align="right">{row.paidPlayers}</TableCell>
                            <TableCell align="right">{row.pendingPlayers}</TableCell>
                            <TableCell align="right">{formatMoney(row.grossSales)}</TableCell>
                            <TableCell align="right">{formatMoney(row.collected)}</TableCell>
                            <TableCell align="right">{formatMoney(row.outstanding)}</TableCell>
                            <TableCell align="right">{formatMoney(row.netRevenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DashboardCard>

              <DashboardCard
                title="Payments and Pending Collections"
                subtitle="See who already paid, who paid partially, and what is still left to collect."
              >
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                  >
                    <Tabs
                      value={statusTab}
                      onChange={(_, nextValue) => {
                        if (isPaymentTab(nextValue)) {
                          setStatusTab(nextValue);
                        }
                      }}
                    >
                      <Tab label="All" value="all" />
                      <Tab label="Paid" value="paid" />
                      <Tab label="Partial" value="partial" />
                      <Tab label="Pending" value="pending" />
                    </Tabs>

                    <TextField
                      size="small"
                      label="Search player, team, or event"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      sx={{ minWidth: { xs: '100%', md: 280 } }}
                    />
                  </Stack>

                  {filteredPaymentRows.length === 0 ? (
                    <Typography color="text.secondary">No payment rows match the current filters.</Typography>
                  ) : (
                    <>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Player</TableCell>
                              <TableCell>Team</TableCell>
                              <TableCell>Event</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Gross Sales</TableCell>
                              <TableCell align="right">Paid</TableCell>
                              <TableCell align="right">Outstanding</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedPaymentRows.map((row) => (
                              <TableRow key={`${row.eventId}:${row.membershipId}:${row.playerName}`} hover>
                                <TableCell>
                                  <Typography fontWeight={600}>{row.playerName}</Typography>
                                </TableCell>
                                <TableCell>{row.teamName}</TableCell>
                                <TableCell>{row.eventName}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={row.status}
                                    size="small"
                                    color={getPaymentChipColor(row.status)}
                                    variant={row.status === 'pending' ? 'outlined' : 'filled'}
                                  />
                                </TableCell>
                                <TableCell align="right">{formatMoney(row.membershipPrice)}</TableCell>
                                <TableCell align="right">{formatMoney(row.amountPaid)}</TableCell>
                                <TableCell align="right">{formatMoney(row.balanceDue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <TablePagination
                        component="div"
                        count={filteredPaymentRows.length}
                        page={page}
                        onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={PAYMENT_ROWS_PER_PAGE}
                        rowsPerPageOptions={[PAYMENT_ROWS_PER_PAGE]}
                      />
                    </>
                  )}
                </Stack>
              </DashboardCard>
            </Stack>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}