'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Event, EventFormData } from '@/models/event';
import { checkEventConflicts } from '@/services/events';
import type { Category } from '@/models/category';
import type { Season } from '@/models/season';
import type { FormatType } from '@/models/formatType';
import { getCategories, createCategory } from '@/services/categories';
import { getSeasons, createSeason } from '@/services/seasons';
import { getFormatTypes } from '@/services/formatTypes';
import type { MatchFormatRecord } from '@/models/matchFormat';
import { getMatchFormats, createMatchFormat } from '@/services/matchFormats';

type EventDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  event?: Event | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: EventFormData) => Promise<void>;
};

type ConflictState = {
  nameExists: boolean;
  keyExists: boolean;
};

const initialValues: EventFormData = {
  key: '',
  name: '',
  season_id: 0,
  category_id: null,
  start_date: '',
  end_date: '',
  auto: true,
  status: 'draft',
  format_type: 'round_robin',
  round_robin_cycles: 1,
  match_day_of_week: 1,
  match_format: '11v11',
  venue_type: 'outside',
  field_count: 4,
  match_duration_minutes: 80,
  simultaneous_matches: true,

  has_playoffs: false,
  playoff_teams_count: null,
  playoff_home_away: false,

  group_count: null,
};

const initialConflicts: ConflictState = {
  nameExists: false,
  keyExists: false,
};

function generateEventKey(name: string): string {
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

export default function EventDialog({
  open,
  mode,
  event,
  loading = false,
  onClose,
  onSubmit,
}: EventDialogProps) {
  const [values, setValues] = useState<EventFormData>(initialValues);
  const [conflicts, setConflicts] = useState<ConflictState>(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [formatTypes, setFormatTypes] = useState<FormatType[]>([]);
  const [matchFormats, setMatchFormats] = useState<MatchFormatRecord[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Inline create — Season
  const [createSeasonOpen, setCreateSeasonOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Inline create — Category
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Inline create — Match Format
  const [createMatchFormatOpen, setCreateMatchFormatOpen] = useState(false);
  const [newMatchFormatName, setNewMatchFormatName] = useState('');
  const [savingMatchFormat, setSavingMatchFormat] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([getCategories(), getSeasons(), getFormatTypes(), getMatchFormats()])
      .then(([cats, seas, fmts, mfmts]) => {
        setCategories(cats);
        setSeasons(seas);
        setFormatTypes(fmts);
        setMatchFormats(mfmts);
      })
      .catch(console.error)
      .finally(() => setLoadingOptions(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && event) {
      setValues({
        key: event.key ?? '',
        name: event.name ?? '',
        season_id: event.season_id ?? 0,
        category_id: event.category_id ?? null,
        start_date: event.start_date ?? '',
        end_date: event.end_date ?? '',
        auto: event.auto ?? true,
        status: event.status ?? 'draft',
        format_type: event.format_type ?? 'round_robin',
        round_robin_cycles: event.round_robin_cycles ?? 1,
        match_day_of_week: event.match_day_of_week ?? 1,
        match_format: event.match_format ?? '11v11',
        venue_type: event.venue_type ?? 'outside',
        field_count: event.field_count ?? 4,
        match_duration_minutes: event.match_duration_minutes ?? 80,
        simultaneous_matches: event.simultaneous_matches ?? true,

        has_playoffs: event.has_playoffs ?? false,
        playoff_teams_count: event.playoff_teams_count ?? null,
        playoff_home_away: event.playoff_home_away ?? false,

        group_count: event.group_count ?? null,
      });
      setConflicts(initialConflicts);
      setSubmitError(null);
      return;
    }

    setValues(initialValues);
    setConflicts(initialConflicts);
    setSubmitError(null);
  }, [open, mode, event]);

  const generatedKey = useMemo(() => generateEventKey(values.name), [values.name]);

  useEffect(() => {
    if (!open) return;

    setValues((prev) => ({
      ...prev,
      key: generatedKey,
    }));
  }, [generatedKey, open]);

  useEffect(() => {
    if (!open) return;

    if (values.format_type !== 'round_robin' && values.format_type !== 'groups' && values.round_robin_cycles !== 1) {
      setValues((prev) => ({
        ...prev,
        round_robin_cycles: 1,
      }));
    }
  }, [values.format_type, values.round_robin_cycles, open]);

  useEffect(() => {
    if (!open) return;

    const trimmedName = values.name.trim();
    const trimmedKey = values.key.trim();

    if (!trimmedName || !trimmedKey) {
      setConflicts(initialConflicts);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingConflicts(true);

        const result = await checkEventConflicts(
          trimmedName,
          trimmedKey,
          mode === 'edit' && event ? event.id : undefined
        );

        setConflicts(result);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.name, values.key, mode, event]);

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) return;
    try {
      setSavingSeason(true);
      const created = await createSeason({ name: newSeasonName.trim() });
      setSeasons((prev) => [...prev, created]);
      handleChange('season_id', created.id);
      setCreateSeasonOpen(false);
      setNewSeasonName('');
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSeason(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setSavingCategory(true);
      const created = await createCategory({ name: newCategoryName.trim(), description: '' });
      setCategories((prev) => [...prev, created]);
      handleChange('category_id', created.id);
      setCreateCategoryOpen(false);
      setNewCategoryName('');
    } catch (error) {
      console.error(error);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateMatchFormat = async () => {
    if (!newMatchFormatName.trim()) return;
    const key = newMatchFormatName.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    try {
      setSavingMatchFormat(true);
      const created = await createMatchFormat({ key, name: newMatchFormatName.trim() });
      setMatchFormats((prev) => [...prev, created]);
      handleChange('match_format', created.key);
      setCreateMatchFormatOpen(false);
      setNewMatchFormatName('');
    } catch (error) {
      console.error(error);
    } finally {
      setSavingMatchFormat(false);
    }
  };

  const handleChange = (
    field: keyof EventFormData,
    value: string | number | boolean | null
  ) => {
    setSubmitError(null);

    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasConflicts = conflicts.nameExists || conflicts.keyExists;

  const isDisabled =
    !values.name.trim() ||
    !values.key.trim() ||
    !values.start_date ||
    !values.format_type ||
    !values.season_id ||
    (values.has_playoffs && !values.playoff_teams_count) ||
    (values.format_type === 'groups' && !values.group_count) ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const latestConflicts = await checkEventConflicts(
        values.name.trim(),
        values.key.trim(),
        mode === 'edit' && event ? event.id : undefined
      );

      setConflicts(latestConflicts);

      if (latestConflicts.nameExists || latestConflicts.keyExists) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      if (values.has_playoffs && !values.playoff_teams_count) {
        setSubmitError('Please select how many teams qualify for playoffs.');
        return;
      }

      await onSubmit({
        key: values.key.trim(),
        name: values.name.trim(),
        season_id: Number(values.season_id),
        category_id: values.category_id ? Number(values.category_id) : null,
        start_date: values.start_date,
        end_date: values.end_date,
        auto: values.auto,
        status: values.status,
        format_type: values.format_type,
        round_robin_cycles:
          values.format_type === 'round_robin' || values.format_type === 'groups'
            ? Number(values.round_robin_cycles)
            : 1,
        match_day_of_week: Number(values.match_day_of_week),
        match_format: values.match_format,
        venue_type: values.venue_type,
        field_count: Number(values.field_count),
        match_duration_minutes: Number(values.match_duration_minutes),
        simultaneous_matches: values.simultaneous_matches,
        has_playoffs: values.has_playoffs,
        playoff_teams_count: values.has_playoffs
          ? values.playoff_teams_count
          : null,
        playoff_home_away: values.has_playoffs
          ? values.playoff_home_away
          : false,
        group_count: values.format_type === 'groups' ? values.group_count : null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save event';
      setSubmitError(message);
    }
  };

  return (
    <>
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>

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
              helperText={conflicts.nameExists ? 'An event with this name already exists.' : ' '}
            />

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

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                select
                label="Season"
                value={values.season_id || ''}
                onChange={(e) => handleChange('season_id', Number(e.target.value))}
                fullWidth
                required
                disabled={loadingOptions}
                helperText={seasons.length === 0 && !loadingOptions ? 'No seasons yet. Click + to create one.' : ' '}
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Create new season">
                <IconButton onClick={() => { setNewSeasonName(''); setCreateSeasonOpen(true); }} sx={{ mt: 1 }}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                select
                label="Category"
                value={values.category_id ?? ''}
                onChange={(e) => handleChange('category_id', e.target.value === '' ? null : Number(e.target.value))}
                fullWidth
                disabled={loadingOptions}
                helperText=" "
              >
                <MenuItem value=""><em>No category</em></MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Create new category">
                <IconButton onClick={() => { setNewCategoryName(''); setCreateCategoryOpen(true); }} sx={{ mt: 1 }}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <TextField
              select
              label="Format Type"
              value={values.format_type}
              onChange={(e) => handleChange('format_type', e.target.value)}
              fullWidth
              disabled={loadingOptions || formatTypes.length === 0}
              helperText={formatTypes.length === 0 && !loadingOptions ? 'No format types available. Create one in Settings → Format Types first.' : ' '}
            >
              {formatTypes.map((ft) => (
                <MenuItem key={ft.key} value={ft.key}>{ft.name}</MenuItem>
              ))}
            </TextField>

            {values.format_type === 'round_robin' && (
              <TextField
                select
                label="Round Robin Cycles"
                value={values.round_robin_cycles}
                onChange={(e) =>
                  handleChange('round_robin_cycles', Number(e.target.value))
                }
                fullWidth
                helperText="How many full round-robin cycles this tournament will have."
              >
                <MenuItem value={1}>1 cycle</MenuItem>
                <MenuItem value={2}>2 cycles</MenuItem>
                <MenuItem value={3}>3 cycles</MenuItem>
              </TextField>
            )}

            {values.format_type === 'groups' && (
              <>
                <TextField
                  select
                  label="Number of Groups"
                  value={values.group_count ?? ''}
                  onChange={(e) =>
                    handleChange('group_count', e.target.value === '' ? null : Number(e.target.value))
                  }
                  fullWidth
                  required
                  helperText="How many groups will the teams be divided into."
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <MenuItem key={n} value={n}>{n} groups</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Round Robin Cycles (per group)"
                  value={values.round_robin_cycles}
                  onChange={(e) =>
                    handleChange('round_robin_cycles', Number(e.target.value))
                  }
                  fullWidth
                  helperText="How many times each team plays the others within its group."
                >
                  <MenuItem value={1}>1 cycle</MenuItem>
                  <MenuItem value={2}>2 cycles</MenuItem>
                  <MenuItem value={3}>3 cycles</MenuItem>
                </TextField>
              </>
            )}

            <TextField
              select
              label="Match Day"
              value={values.match_day_of_week}
              onChange={(e) => handleChange('match_day_of_week', Number(e.target.value))}
              fullWidth
            >
              <MenuItem value={1}>Monday</MenuItem>
              <MenuItem value={2}>Tuesday</MenuItem>
              <MenuItem value={3}>Wednesday</MenuItem>
              <MenuItem value={4}>Thursday</MenuItem>
              <MenuItem value={5}>Friday</MenuItem>
              <MenuItem value={6}>Saturday</MenuItem>
              <MenuItem value={7}>Sunday</MenuItem>
            </TextField>

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                select
                label="Match Format"
                value={values.match_format}
                onChange={(e) => handleChange('match_format', e.target.value)}
                fullWidth
                disabled={loadingOptions}
                helperText={matchFormats.length === 0 && !loadingOptions ? 'No match formats yet. Click + to create one.' : ' '}
              >
                {matchFormats.map((mf) => (
                  <MenuItem key={mf.key} value={mf.key}>{mf.name}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Create new match format">
                <IconButton onClick={() => { setNewMatchFormatName(''); setCreateMatchFormatOpen(true); }} sx={{ mt: 1 }}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.has_playoffs}
                  onChange={(e) => handleChange('has_playoffs', e.target.checked)}
                />
              }
              label="Has Playoffs"
            />

            {values.has_playoffs && (
              <>
                <TextField
                  select
                  label="Playoff Teams Count"
                  value={values.playoff_teams_count ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'playoff_teams_count',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  fullWidth
                >
                  <MenuItem value={2}>2 teams</MenuItem>
                  <MenuItem value={4}>4 teams</MenuItem>
                  <MenuItem value={8}>8 teams</MenuItem>
                  <MenuItem value={16}>16 teams</MenuItem>
                </TextField>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.playoff_home_away}
                      onChange={(e) =>
                        handleChange('playoff_home_away', e.target.checked)
                      }
                    />
                  }
                  label="Playoffs Home and Away"
                />
              </>
            )}

            {/* <TextField
              select
              label="Venue Type"
              value={values.venue_type}
              onChange={(e) => handleChange('venue_type', e.target.value)}
              fullWidth
            >
              <MenuItem value="inside">Inside</MenuItem>
              <MenuItem value="outside">Outside</MenuItem>
            </TextField> */}

            {/* <TextField
              label="Field Count"
              type="number"
              value={values.field_count}
              onChange={(e) => handleChange('field_count', Number(e.target.value))}
              fullWidth
            /> */}

            <TextField
              label="Match Duration (minutes)"
              type="number"
              value={values.match_duration_minutes}
              onChange={(e) =>
                handleChange('match_duration_minutes', Number(e.target.value))
              }
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.simultaneous_matches}
                  onChange={(e) =>
                    handleChange('simultaneous_matches', e.target.checked)
                  }
                />
              }
              label="Simultaneous Matches"
            />

            <TextField
              label="Start Date"
              type="date"
              value={values.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            {/* <TextField
              label="End Date"
              type="date"
              value={values.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            /> */}

            <TextField
              select
              label="Status"
              value={values.status}
              onChange={(e) => handleChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.auto}
                  onChange={(e) => handleChange('auto', e.target.checked)}
                />
              }
              label="Auto"
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
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Inline: Create Season */}
    <Dialog open={createSeasonOpen} onClose={savingSeason ? undefined : () => setCreateSeasonOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>New Season</DialogTitle>
      <DialogContent>
        <TextField
          label="Season Name"
          placeholder="e.g. Spring 2026, 2025-26"
          value={newSeasonName}
          onChange={(e) => setNewSeasonName(e.target.value)}
          fullWidth
          autoFocus
          sx={{ mt: 1 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSeason(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateSeasonOpen(false)} disabled={savingSeason}>Cancel</Button>
        <Button variant="contained" onClick={handleCreateSeason} disabled={savingSeason || !newSeasonName.trim()}>
          {savingSeason ? <CircularProgress size={18} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Inline: Create Category */}
    <Dialog open={createCategoryOpen} onClose={savingCategory ? undefined : () => setCreateCategoryOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>New Category</DialogTitle>
      <DialogContent>
        <TextField
          label="Category Name"
          placeholder="e.g. Adult, Youth U15"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          fullWidth
          autoFocus
          sx={{ mt: 1 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateCategoryOpen(false)} disabled={savingCategory}>Cancel</Button>
        <Button variant="contained" onClick={handleCreateCategory} disabled={savingCategory || !newCategoryName.trim()}>
          {savingCategory ? <CircularProgress size={18} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Inline: Create Match Format */}
    <Dialog open={createMatchFormatOpen} onClose={savingMatchFormat ? undefined : () => setCreateMatchFormatOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>New Match Format</DialogTitle>
      <DialogContent>
        <TextField
          label="Match Format Name"
          placeholder="e.g. 5v5, 8v8, 11v11"
          value={newMatchFormatName}
          onChange={(e) => setNewMatchFormatName(e.target.value)}
          fullWidth
          autoFocus
          sx={{ mt: 1 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateMatchFormat(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateMatchFormatOpen(false)} disabled={savingMatchFormat}>Cancel</Button>
        <Button variant="contained" onClick={handleCreateMatchFormat} disabled={savingMatchFormat || !newMatchFormatName.trim()}>
          {savingMatchFormat ? <CircularProgress size={18} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}