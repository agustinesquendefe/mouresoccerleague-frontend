import { Alert, Box, Stack, Typography } from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import AdminScannerClient from '@/app/(admin)/components/scanner/AdminScannerClient';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getScannerContext } from '@/services/scanner/getScannerContext';

export default async function ScannerPage() {
  let context;

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    context = await getScannerContext(supabaseAdmin);
  } catch (error) {
    return (
      <PageContainer title="Scanner" description="Barcode validation scanner">
        <Box>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load scanner context.'}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Scanner" description="Barcode validation scanner">
      <Box>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Scanner</Typography>
            <Typography variant="body2" color="text.secondary">
              Validate players by barcode before check-in using the current tournament logic for team membership, payments, and eligibility.
            </Typography>
          </Box>

          <AdminScannerClient initialContext={context} />
        </Stack>
      </Box>
    </PageContainer>
  );
}