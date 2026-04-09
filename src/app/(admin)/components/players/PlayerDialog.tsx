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
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Player, PlayerFormData } from '@/models/player';
import { checkPlayerConflicts } from '@/services/players';
import type { Category } from '@/models/category';
import { getCategories } from '@/services/categories';
import { getPlayerCategories } from '@/services/playerCategories';

type PlayerDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  player?: Player | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: PlayerFormData, categoryIds: number[], photoFile: File | null) => Promise<void>;
};

type ConflictState = {
  keyExists: boolean;
  emailExists: boolean;
  documentExists: boolean;
};

const initialValues: PlayerFormData = {
  first_name: '',
  last_name: '',
  key: '',
  birth_date: '',
  jersey_number: null,
  phone: '',
  email: '',
  document_id: '',
  is_active: true,
  notes: '',
  photo_url: null,
};

const initialConflicts: ConflictState = {
  keyExists: false,
  emailExists: false,
  documentExists: false,
};

function generatePlayerKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export default function PlayerDialog({
  open,
  mode,
  player,
  loading = false,
  onClose,
  onSubmit,
}: PlayerDialogProps) {
  const [values, setValues] = useState<PlayerFormData>(initialValues);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    getCategories().then(setCategories).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Reset photo state on each open
    setPhotoFile(null);

    if (mode === 'edit' && player) {
      setValues({
        first_name: player.first_name ?? '',
        last_name: player.last_name ?? '',
        key: player.key ?? '',
        birth_date: player.birth_date ?? '',
        jersey_number: player.jersey_number ?? null,
        phone: player.phone ?? '',
        email: player.email ?? '',
        document_id: player.document_id ?? '',
        is_active: player.is_active ?? true,
        notes: player.notes ?? '',
        photo_url: player.photo_url ?? null,
      });
      setPhotoPreview(player.photo_url ?? null);
      setConflicts(initialConflicts);
      setSubmitError(null);
      getPlayerCategories(player.id).then(setSelectedCategoryIds).catch(console.error);
      return;
    }

    setValues(initialValues);
    setPhotoPreview(null);
    setConflicts(initialConflicts);
    setSubmitError(null);
    setSelectedCategoryIds([]);
  }, [open, mode, player]);

  // Revoke object URL on unmount / photo change
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    // Clear input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setValues((prev) => ({ ...prev, photo_url: null }));
  };

  const generatedKey = useMemo(
    () => generatePlayerKey(values.first_name, values.last_name),
    [values.first_name, values.last_name]
  );

  useEffect(() => {
    if (!open) return;
    setValues((prev) => ({ ...prev, key: generatedKey }));
  }, [generatedKey, open]);

  useEffect(() => {
    if (!open) return;

    const trimmedKey = values.key.trim();
    if (!trimmedKey) {
      setConflicts(initialConflicts);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingConflicts(true);
        const result = await checkPlayerConflicts(
          trimmedKey,
          values.email.trim(),
          values.document_id.trim(),
          mode === 'edit' && player ? player.id : undefined
        );
        setConflicts(result);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.key, values.email, values.document_id, mode, player]);

  const handleChange = (
    fieldName: keyof PlayerFormData,
    value: string | number | boolean | null
  ) => {
    setSubmitError(null);
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const hasConflicts =
    conflicts.keyExists || conflicts.emailExists || conflicts.documentExists;

  const isDisabled =
    !values.first_name.trim() ||
    !values.last_name.trim() ||
    !values.key.trim() ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const latestConflicts = await checkPlayerConflicts(
        values.key.trim(),
        values.email.trim(),
        values.document_id.trim(),
        mode === 'edit' && player ? player.id : undefined
      );

      setConflicts(latestConflicts);

      if (
        latestConflicts.keyExists ||
        latestConflicts.emailExists ||
        latestConflicts.documentExists
      ) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      await onSubmit(
        {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          key: values.key.trim(),
          birth_date: values.birth_date,
          jersey_number: values.jersey_number,
          phone: values.phone.trim(),
          email: values.email.trim(),
          document_id: values.document_id.trim(),
          is_active: values.is_active,
          notes: values.notes.trim(),
          photo_url: values.photo_url,
        },
        selectedCategoryIds,
        photoFile
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save player';
      setSubmitError(message);
    }
  };

  const initials =
    `${values.first_name.charAt(0)}${values.last_name.charAt(0)}`.toUpperCase() || '?';

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Player' : 'Edit Player'}</DialogTitle>

      <DialogContent>
        <Box mt={1}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            {/* Photo upload */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Avatar
                  src={photoPreview ?? undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: 28,
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: 'divider',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!photoPreview && initials}
                </Avatar>

                <Tooltip title="Upload photo">
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  Profile Photo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  JPG, PNG or WEBP · max 5 MB
                </Typography>
                {photoPreview && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                    onClick={handleRemovePhoto}
                    sx={{ alignSelf: 'flex-start', px: 0, minWidth: 0 }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handlePhotoChange}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name"
                value={values.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Last Name"
                value={values.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                fullWidth
                required
              />
            </Stack>

            <TextField
              label="Key"
              value={values.key}
              fullWidth
              InputProps={{ readOnly: true }}
              error={conflicts.keyExists}
              helperText={
                conflicts.keyExists
                  ? 'This key is already in use.'
                  : 'Generated automatically from the name.'
              }
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Birth Date"
                type="date"
                value={values.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Jersey Number"
                type="number"
                value={values.jersey_number ?? ''}
                onChange={(e) =>
                  handleChange(
                    'jersey_number',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                fullWidth
              />
            </Stack>

            <TextField
              label="Phone"
              value={values.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              fullWidth
            />

            <TextField
              label="Email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              fullWidth
              error={conflicts.emailExists}
              helperText={conflicts.emailExists ? 'This email is already in use.' : ' '}
            />

            <TextField
              label="Document ID"
              value={values.document_id}
              onChange={(e) => handleChange('document_id', e.target.value)}
              fullWidth
              error={conflicts.documentExists}
              helperText={
                conflicts.documentExists ? 'This document ID is already in use.' : ' '
              }
            />

            <TextField
              label="Notes"
              value={values.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />

            {categories.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight={600} mb={0.5}>Categories</Typography>
                <FormGroup row>
                  {categories.map((c) => (
                    <FormControlLabel
                      key={c.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedCategoryIds.includes(c.id)}
                          onChange={(e) =>
                            setSelectedCategoryIds((prev) =>
                              e.target.checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id)
                            )
                          }
                        />
                      }
                      label={c.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                />
              }
              label="Active"
            />

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
          {loading ? <CircularProgress size={18} /> : mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}