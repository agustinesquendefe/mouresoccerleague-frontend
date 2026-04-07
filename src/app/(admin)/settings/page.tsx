import { Box, Stack, Typography } from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import GeneralSettingsForm from '../components/settings/GeneralSettingsForm';

export default function SettingsPage() {
  return (
    <PageContainer title="Settings" description="Manage application settings">
      <Box>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Settings
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Manage league configuration and contact information
            </Typography>
          </Box>

          <GeneralSettingsForm />
        </Stack>
      </Box>
    </PageContainer>
  );
}