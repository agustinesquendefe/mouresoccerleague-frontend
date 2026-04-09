'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Team, TeamFormData } from '@/models/team';
import { checkTeamConflicts } from '@/services/teams/checkTeamConflicts';
import { uploadImage } from '@/services/storage/uploadImage';
import type { Category } from '@/models/category';
import { getCategories } from '@/services/categories';

type TeamDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  team?: Team | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: TeamFormData) => Promise<void>;
};

type ConflictState = {
  nameExists: boolean;
  keyExists: boolean;
};

const initialValues: TeamFormData = {
  key: '',
  name: '',
  code: '',
  club: true,
  national: false,
  logo_url: null,
  category_id: null,
};

const initialConflicts: ConflictState = {
  nameExists: false,
  keyExists: false,
};

function generateTeamKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function generateTeamCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

    if (words.length === 0) return '';

    const codeParts: string[] = [];

    for (const word of words) {
      const cleanWord = word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '');

      // Si es una sigla (2-3 letras), tomar todas
      if (cleanWord.length <= 3) {
        codeParts.push(cleanWord.toUpperCase());
      } else {
        // Si es palabra larga, tomar solo la primera letra
        codeParts.push(cleanWord[0].toUpperCase());
      }
    }

    return codeParts.join('').slice(0, 5); // opcional límite
}

export default function TeamDialog({
  open,
  mode,
  team,
  loading = false,
  onClose,
  onSubmit,
}: TeamDialogProps) {
  const [values, setValues] = useState<TeamFormData>(initialValues);
  const [conflicts, setConflicts] = useState<ConflictState>(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!open) return;
    getCategories().then(setCategories).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && team) {
      setValues({
        key: team.key ?? '',
        name: team.name ?? '',
        code: team.code ?? '',
        club: team.club ?? false,
        national: team.national ?? false,
        logo_url: team.logo_url ?? null,
        category_id: team.category_id ?? null,
      });
      setConflicts(initialConflicts);
      setSubmitError(null);
      setLogoFile(null);
      setLogoPreview(team.logo_url ?? null);
      return;
    }

    if (mode === 'create') {
      setValues(initialValues);
      setConflicts(initialConflicts);
      setSubmitError(null);
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [open, mode, team]);

  const generatedKey = useMemo(() => generateTeamKey(values.name), [values.name]);
  const generatedCode = useMemo(() => generateTeamCode(values.name), [values.name]);

  useEffect(() => {
    if (!open) return;

    setValues((prev) => ({
      ...prev,
      key: generatedKey,
      code: generatedCode,
    }));
  }, [generatedKey, generatedCode, open]);

  useEffect(() => {
    if (!open) return;

    const trimmedName = values.name.trim();
    const trimmedKey = values.key.trim();
    const trimmedCode = values.code.trim();

    if (!trimmedName || !trimmedKey || !trimmedCode) {
      setConflicts(initialConflicts);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingConflicts(true);

        const result = await checkTeamConflicts(
          trimmedName,
          trimmedKey,
          mode === 'edit' && team ? team.id : undefined
        );

        setConflicts(result);
      } catch (error) {
        console.error('Conflict validation failed:', error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.name, values.key, values.code, mode, team]);

  const handleChange = (field: keyof TeamFormData, value: string | boolean) => {
    setSubmitError(null);

    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasConflicts =
    conflicts.nameExists || conflicts.keyExists;

  const isDisabled =
    !values.name.trim() ||
    !values.key.trim() ||
    !values.code.trim() ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const trimmedName = values.name.trim();
      const trimmedKey = values.key.trim();
      const trimmedCode = values.code.trim();

      const latestConflicts = await checkTeamConflicts(
        trimmedName,
        trimmedKey,
        mode === 'edit' && team ? team.id : undefined
      );

      setConflicts(latestConflicts);

      if (
        latestConflicts.nameExists ||
        latestConflicts.keyExists
      ) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      // Upload logo if a new file was selected
      let logoUrl: string | null | undefined = values.logo_url ?? null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() ?? 'png';
        const path = `${trimmedKey}.${ext}`;
        const { publicUrl } = await uploadImage({ bucket: 'team-logos', path, file: logoFile, upsert: true });
        logoUrl = publicUrl;
      }

      await onSubmit({
        key: trimmedKey,
        name: trimmedName,
        code: trimmedCode,
        club: values.club,
        national: values.national,
        logo_url: logoUrl,
        category_id: values.category_id ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save team';
      setSubmitError(message);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Team' : 'Edit Team'}</DialogTitle>

      <DialogContent>
        <Box mt={1}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Name"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              required
              error={conflicts.nameExists}
              helperText={conflicts.nameExists ? 'A team with this name already exists.' : ' '}
              autoCapitalize='words'
            />

            <TextField
              label="Key"
              value={values.key}
              fullWidth
              InputProps={{ readOnly: true }}
              error={conflicts.keyExists}
              helperText={conflicts.keyExists ? 'This key is already in use.' : 'Generated automatically from the name.'}
            />

            <TextField
              label="Code"
              value={values.code}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Generated automatically from the name."
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.club}
                  onChange={(e) => handleChange('club', e.target.checked)}
                />
              }
              label="Club"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.national}
                  onChange={(e) => handleChange('national', e.target.checked)}
                />
              }
              label="National Team"
            />

            {/* Logo upload */}
            <TextField
              select
              label="Category"
              value={values.category_id ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, category_id: e.target.value === '' ? null : Number(e.target.value) }))}
              fullWidth
            >
              <MenuItem value=""><em>No category</em></MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>

            {/* Logo upload */}
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600}>Logo (PNG, WebP, SVG)</Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={logoPreview ?? undefined}
                  variant="rounded"
                  sx={{ width: 56, height: 56 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {logoPreview && (
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setValues((prev) => ({ ...prev, logo_url: null }));
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                  e.target.value = '';
                }}
              />
            </Stack>

            {checkingConflicts && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Box component="span">Checking duplicates...</Box>
              </Stack>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleSubmit} disabled={isDisabled}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}