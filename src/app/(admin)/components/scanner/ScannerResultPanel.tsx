'use client';

import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ScannerValidationResponse } from '@/models/scanner';

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

type Props = {
  result: ScannerValidationResponse | null;
};

export default function ScannerResultPanel({ result }: Props) {
  if (!result) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography color="text.secondary">
          Scan a player barcode or type a document ID manually to validate eligibility.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 3,
        borderColor: result.approved ? 'success.main' : 'error.main',
        bgcolor: result.approved ? 'success.light' : 'error.light',
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.1 }}>
              Scanner Decision
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {result.headline} {result.approved ? '✅' : '❌'}
            </Typography>
            <Typography variant="body1">{result.summary}</Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Chip label={result.context.scannedCode || 'No code'} color={result.approved ? 'success' : 'error'} />
            <Chip label={result.context.teamName ?? 'No team'} variant="outlined" />
          </Stack>
        </Stack>

        {result.player ? (
          <Alert severity={result.approved ? 'success' : 'warning'}>
            <strong>{result.player.fullName}</strong> · Document ID: {result.player.documentId} · Event paid: {formatMoney(result.player.amountPaid)} · Outstanding: {formatMoney(result.player.balanceDue)}
          </Alert>
        ) : null}

        {result.checkIn ? (
          <Alert severity={result.checkIn.status === 'already_checked_in' ? 'info' : 'success'}>
            {result.checkIn.message}
          </Alert>
        ) : null}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Check</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.checks.map((check) => (
              <TableRow key={check.code}>
                <TableCell>{check.label}</TableCell>
                <TableCell>
                  <Chip
                    label={check.passed ? 'Pass' : 'Fail'}
                    size="small"
                    color={check.passed ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{check.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Paper>
  );
}
