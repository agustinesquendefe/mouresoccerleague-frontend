'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  Grid,
} from '@mui/material';
import { getAppSettings, upsertAppSettings } from '@/services/settings/settings.service';
import type { AppSettings } from '@/models/appSettings';
import LogoUploadField from './logoUploadField';

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
        </Box>

        <Divider />

        {children}
      </Stack>
    </Paper>
  );
}

export default function GeneralSettingsForm() {
  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await getAppSettings();
      if (data) setForm(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccess(false);

      await upsertAppSettings(form);

      setSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading settings...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {errorMessage ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Settings saved successfully.
        </Alert>
      ) : null}

      <SectionCard
        title="General Information"
        description="Basic identity and public website information for the league."
      >
        <Grid container spacing={2} direction={"column"}>
          <Grid>
            <TextField
                fullWidth
                label="League Name"
                placeholder="Moure Premier Soccer League"
                value={form.league_name ?? ''}
                onChange={(e) => handleChange('league_name', e.target.value)}
                />
            </Grid>

            <Grid>
                <TextField
                fullWidth
                label="Website"
                placeholder="https://example.com"
                value={form.website ?? ''}
                onChange={(e) => handleChange('website', e.target.value)}
                />
            </Grid>

            <Grid>
                <LogoUploadField/>
            </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Contact Information"
        description="Main contact details that may appear on the public website."
      >
        <Grid container spacing={2} direction={"column"}>
          <Grid>
            <TextField
              fullWidth
              label="Contact Email"
              placeholder="info@league.com"
              value={form.contact_email ?? ''}
              onChange={(e) => handleChange('contact_email', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Contact Phone"
              placeholder="(000) 000-0000"
              value={form.contact_phone ?? ''}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Address"
              placeholder="123 Main St"
              value={form.address ?? ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Address Line 2"
              placeholder="Apt, Suite, etc."
              value={form.address_line_2 ?? ''}
              onChange={(e) => handleChange('address_line_2', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="City"
              placeholder="Greensboro"
              value={form.city ?? ''}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="State"
              placeholder="NC"
              value={form.state ?? ''}
              onChange={(e) => handleChange('state', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Zip Code"
              placeholder="27401"
              value={form.zip_code ?? ''}
              onChange={(e) => handleChange('zip_code', e.target.value)}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Social Media"
        description="Public social links for your league or organization."
      >
        <Grid container spacing={2} direction={"column"}>
          <Grid>
            <TextField
              fullWidth
              label="Facebook URL"
              placeholder="https://facebook.com/..."
              value={form.facebook_url ?? ''}
              onChange={(e) => handleChange('facebook_url', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Instagram URL"
              placeholder="https://instagram.com/..."
              value={form.instagram_url ?? ''}
              onChange={(e) => handleChange('instagram_url', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="YouTube URL"
              placeholder="https://youtube.com/..."
              value={form.youtube_url ?? ''}
              onChange={(e) => handleChange('youtube_url', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="TikTok URL"
              placeholder="https://tiktok.com/@..."
              value={form.tiktok_url ?? ''}
              onChange={(e) => handleChange('tiktok_url', e.target.value)}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* <SectionCard
        title="Branding"
        description="Basic visual settings for future use across the public site."
      >
        <Grid container spacing={2}>
          <Grid>
            <TextField
              fullWidth
              label="Primary Color"
              placeholder="#0F172A"
              value={form.primary_color ?? ''}
              onChange={(e) => handleChange('primary_color', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Secondary Color"
              placeholder="#22C55E"
              value={form.secondary_color ?? ''}
              onChange={(e) => handleChange('secondary_color', e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              fullWidth
              label="Support Text"
              placeholder="For questions, contact us at..."
              multiline
              minRows={3}
              value={form.support_text ?? ''}
              onChange={(e) => handleChange('support_text', e.target.value)}
            />
          </Grid>
        </Grid>
      </SectionCard> */}

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Save Changes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Update your league settings and keep the public information current.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            sx={{
              minWidth: 180,
              borderRadius: 2,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}