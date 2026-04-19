'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getLegalDocuments } from '@/services/legalDocuments';
import type { LegalDocument } from '@/models/legalDocument';
import { supabase } from '@/lib/supabaseClient';
import { getPlayerLegalDocuments, deletePlayerLegalDocument, addPlayerLegalDocument } from '@/services/playerLegalDocuments';
// Helper to calculate age from birth date string (YYYY-MM-DD)
function getAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Central download function for signed URLs
async function handleDownloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo descargar el archivo.');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(link.href);
  } catch (e) {
    alert('No se pudo descargar el archivo.');
  }
}
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
  onSubmit: (values: PlayerFormData, categoryIds: number[], photoFile: File | null) => Promise<Player | { id: number }>;
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
  we_have_id: false,
  paid_membership: 0,
  registered_at: new Date().toISOString().split('T')[0],
  signature: '',
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

  // Legal document state for minors
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [tutorFile, setTutorFile] = useState<File | null>(null);
  const [participantFile, setParticipantFile] = useState<File | null>(null);
  const [tutorFileError, setTutorFileError] = useState<string | null>(null);
  const [participantFileError, setParticipantFileError] = useState<string | null>(null);
  // Player legal docs (edit mode)
  const [playerLegalDocs, setPlayerLegalDocs] = useState<{ tutor: any | null, participant: any | null }>({ tutor: null, participant: null });
  const [playerLegalDocUrls, setPlayerLegalDocUrls] = useState<{ tutor: string | null, participant: string | null }>({ tutor: null, participant: null });
  const [loadingLegalDocs, setLoadingLegalDocs] = useState(false);
    // Fetch player legal docs on edit
    useEffect(() => {
      if (!open || mode !== 'edit' || !player || !legalDocs.length) {
        setPlayerLegalDocs({ tutor: null, participant: null });
        setPlayerLegalDocUrls({ tutor: null, participant: null });
        setTutorFile(null);
        setParticipantFile(null);
        return;
      }
      setLoadingLegalDocs(true);
      getPlayerLegalDocuments(player.id.toString())
        .then(async (docs) => {
          // Buscar por tipo (tutor/participant)
          const tutorDoc = docs.find((d) => d.legal_document_id && legalDocs.find((ld) => ld.id === d.legal_document_id && ld.type === 'tutor')) || null;
          const participantDoc = docs.find((d) => d.legal_document_id && legalDocs.find((ld) => ld.id === d.legal_document_id && ld.type === 'participant')) || null;
          // Generar signed URLs
          const tutorUrl = tutorDoc && tutorDoc.file_url ? (await supabase.storage.from('player-legal-documents').createSignedUrl(tutorDoc.file_url, 600)).data?.signedUrl : null;
          const participantUrl = participantDoc && participantDoc.file_url ? (await supabase.storage.from('player-legal-documents').createSignedUrl(participantDoc.file_url, 600)).data?.signedUrl : null;
          setPlayerLegalDocs({ tutor: tutorDoc, participant: participantDoc });
          setPlayerLegalDocUrls({ tutor: tutorUrl!, participant: participantUrl! });
          setTutorFile(null);
          setParticipantFile(null);
        })
        .catch(() => {
          setPlayerLegalDocs({ tutor: null, participant: null });
          setTutorFile(null);
          setParticipantFile(null);
        })
        .finally(() => setLoadingLegalDocs(false));
    }, [open, mode, player, legalDocs]);
    // Eliminar documento legal del jugador
    const handleDeletePlayerLegalDoc = async (type: 'tutor' | 'participant') => {
      const doc = playerLegalDocs[type];
      if (!doc) return;
      await deletePlayerLegalDocument(doc.id);
      setPlayerLegalDocs((prev) => ({ ...prev, [type]: null }));
      setPlayerLegalDocUrls((prev) => ({ ...prev, [type]: null }));
    };
  // Fetch legal documents (for type info)
  useEffect(() => {
    if (!open) return;
    getLegalDocuments().then(setLegalDocs).catch(() => setLegalDocs([]));
  }, [open]);

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
        we_have_id: player.we_have_id ?? false,
        paid_membership: player.paid_membership ?? 0,
        registered_at: player.registered_at ?? new Date().toISOString().split('T')[0],
        signature: player.signature ?? '',
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

  // Handlers para archivos legales de tutor y participante
  const handleTutorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !/\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name)) {
      setTutorFileError('Solo PDF o imagen');
      setTutorFile(null);
    } else {
      setTutorFile(file || null);
      setTutorFileError(null);
    }
    e.target.value = '';
  };

  const handleParticipantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !/\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name)) {
      setParticipantFileError('Solo PDF o imagen');
      setParticipantFile(null);
    } else {
      setParticipantFile(file || null);
      setParticipantFileError(null);
    }
    e.target.value = '';
  };

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

  // Minor logic: require both files if under 18
  const isMinor = useMemo(() => getAge(values.birth_date) < 18, [values.birth_date]);
  // Solo requiere input si no existe ni en la base ni en el input
  const missingTutor = isMinor && !tutorFile && !playerLegalDocs.tutor;
  const missingParticipant = isMinor && !participantFile && !playerLegalDocs.participant;
  const missingMinorDocs = missingTutor || missingParticipant;
  const isDisabled =
    !values.first_name.trim() ||
    !values.last_name.trim() ||
    !values.key.trim() ||
    loading ||
    checkingConflicts ||
    hasConflicts ||
    missingMinorDocs;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      setTutorFileError(null);
      setParticipantFileError(null);

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

      // Validate minor docs (solo si no existen en la base ni input)
      if (isMinor) {
        let valid = true;
        if (!tutorFile && !playerLegalDocs.tutor) {
          setTutorFileError('Required for minors');
          valid = false;
        }
        if (!participantFile && !playerLegalDocs.participant) {
          setParticipantFileError('Required for minors');
          valid = false;
        }
        if (!valid) return;
      }

      // 1. Crear/editar jugador y obtener playerId
      const playerResult = await onSubmit(
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
          we_have_id: values.we_have_id,
          paid_membership: values.paid_membership,
          registered_at: values.registered_at,
          signature: values.signature,
        },
        selectedCategoryIds,
        photoFile
      );
      // playerResult debe ser el objeto Player o el id
      const playerId = playerResult?.id || player?.id;
      if (!playerId) return;

      // 2. Registrar documentos legales si hay archivos nuevos
      const tutorLegalDoc = legalDocs.find((doc) => doc.type === 'tutor');
      const participantLegalDoc = legalDocs.find((doc) => doc.type === 'participant');

      // Verificar usuario autenticado antes de subir documentos legales
      let user: any = null;
      if ((tutorFile && tutorLegalDoc) || (participantFile && participantLegalDoc)) {
        // Obtener sesión y loguear detalles
        const { data: { session } } = await supabase.auth.getSession();
        console.log('session exists:', !!session);
        console.log('auth user id:', session?.user?.id);
        // uploaded_by payload (simulado aquí, reemplaza por el real si es variable)
        console.log('uploaded_by payload:', session?.user?.id);
        user = session?.user;
        if (!user) {
          setSubmitError('Debes iniciar sesión para subir documentos legales.');
          return;
        }
      }

      // Tutor
      if (tutorFile && tutorLegalDoc) {
        const formData = new FormData();
        formData.append('file', tutorFile);
        formData.append('legal_document_id', tutorLegalDoc.id);
        formData.append('uploaded_by', user.id);
        // Solo fecha para el campo date
        const today = new Date().toISOString().split('T')[0];
        formData.append('date', today);
        formData.append('status', 'vigente');
        console.log('[DEBUG] Insertando documento legal de tutor:', {
          playerId,
          legal_document_id: tutorLegalDoc.id,
          file: tutorFile.name,
          uploaded_by: user.id,
          typeof_uploaded_by: typeof user.id,
          date: today,
        });
        try {
          const result = await addPlayerLegalDocument(playerId.toString(), formData);
          console.log('Documento legal de tutor guardado:', result);
        } catch (err) {
          console.error('Error guardando documento legal de tutor:', err);
          setSubmitError('Error guardando documento legal de tutor: ' + (err instanceof Error ? err.message : String(err)));
        }
      }
      // Participante
      if (participantFile && participantLegalDoc) {
        const formData = new FormData();
        formData.append('file', participantFile);
        formData.append('legal_document_id', participantLegalDoc.id);
        formData.append('uploaded_by', user.id);
        // Solo fecha para el campo date
        const today = new Date().toISOString().split('T')[0];
        formData.append('date', today);
        formData.append('status', 'vigente');
        console.log('[DEBUG] Insertando documento legal de participante:', {
          playerId,
          legal_document_id: participantLegalDoc.id,
          file: participantFile.name,
          uploaded_by: user.id,
          typeof_uploaded_by: typeof user.id,
          date: today,
        });
        try {
          const result = await addPlayerLegalDocument(playerId.toString(), formData);
          console.log('Documento legal de participante guardado:', result);
        } catch (err) {
          console.error('Error guardando documento legal de participante:', err);
          setSubmitError('Error guardando documento legal de participante: ' + (err instanceof Error ? err.message : String(err)));
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save player';
      setSubmitError(message);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const initials =
    `${values.first_name.charAt(0)}${values.last_name.charAt(0)}`.toUpperCase() || '?';

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create' ? 'Create Player' : 'Edit Player'}
      </DialogTitle>

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
                label="Paid Membership"
                type="number"
                value={values.paid_membership}
                onChange={(e) => handleChange('paid_membership', e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
              />

              <TextField
                label="Registered At"
                type="date"
                value={values.registered_at}
                onChange={(e) => handleChange('registered_at', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {/* Legal documents for minors */}
                {isMinor && (
                  <Box mt={2} mb={1} p={2} sx={{ border: '1px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: 'warning.light' }}>
                    <Typography variant="subtitle1" color="warning.dark" fontWeight={600} gutterBottom>
                      Required Documents for Minors
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Both documents must be uploaded to register a minor:
                    </Typography>
                    <Stack direction="column" spacing={2}>
                      {/* Tutor */}
                      <Box>
                        <Typography variant="caption" fontWeight={600}>Tutor</Typography>
                        {loadingLegalDocs ? (
                          <CircularProgress size={18} />
                        ) : tutorFile ? (
                          <Button
                            variant="outlined"
                            component="label"
                            color={tutorFileError ? 'error' : 'primary'}
                            sx={{ minWidth: 180, maxWidth: 260, overflowX: 'auto', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{
                              display: 'inline-block',
                              maxWidth: 180,
                              overflowX: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            }}>
                              {tutorFile.name}
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              onChange={handleTutorFileChange}
                            />
                          </Button>
                        ) : playerLegalDocs.tutor && playerLegalDocUrls.tutor ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() =>
                                handleDownloadFile(
                                  playerLegalDocUrls.tutor!,
                                  playerLegalDocs.tutor.file_url?.split('/').pop() || 'tutor_document.pdf'
                                )
                              }
                            >
                              Download Tutor Document
                            </Button>
                            <Button size="small" color="error" onClick={() => handleDeletePlayerLegalDoc('tutor')}>Delete</Button>
                          </Box>
                        ) : (
                          <Button
                            variant="outlined"
                            component="label"
                            color={tutorFileError ? 'error' : 'primary'}
                            sx={{ minWidth: 180, maxWidth: 260, overflowX: 'auto', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{
                              display: 'inline-block',
                              maxWidth: 180,
                              overflowX: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            }}>
                              Upload Tutor Document
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              onChange={handleTutorFileChange}
                            />
                          </Button>
                        )}
                        {tutorFileError && (
                          <Typography variant="caption" color="error">{tutorFileError}</Typography>
                        )}
                      </Box>
                      {/* Participante */}
                      <Box>
                        <Typography variant="caption" fontWeight={600}>Participant</Typography>
                        {loadingLegalDocs ? (
                          <CircularProgress size={18} />
                        ) : participantFile ? (
                          <Button
                            variant="outlined"
                            component="label"
                            color={participantFileError ? 'error' : 'primary'}
                            sx={{ minWidth: 180, maxWidth: 260, overflowX: 'auto', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{
                              display: 'inline-block',
                              maxWidth: 180,
                              overflowX: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            }}>
                              {participantFile.name}
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              onChange={handleParticipantFileChange}
                            />
                          </Button>
                        ) : playerLegalDocs.participant && playerLegalDocUrls.participant ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() =>
                                handleDownloadFile(
                                  playerLegalDocUrls.tutor!,
                                  playerLegalDocs.tutor.file_url?.split('/').pop() || 'tutor_document.pdf'
                                )
                              }
                            >
                              Download Participant Document
                            </Button>
                            <Button size="small" color="error" onClick={() => handleDeletePlayerLegalDoc('tutor')}>Delete</Button>
                          </Box>
                        ) : (
                          <Button
                            variant="outlined"
                            component="label"
                            color={participantFileError ? 'error' : 'primary'}
                            sx={{ minWidth: 180, maxWidth: 260, overflowX: 'auto', textAlign: 'left', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{
                              display: 'inline-block',
                              maxWidth: 180,
                              overflowX: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            }}>
                              Upload Participant Document
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              onChange={handleParticipantFileChange}
                            />
                          </Button>
                        )}
                        {participantFileError && (
                          <Typography variant="caption" color="error">{participantFileError}</Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                )}
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

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!values.we_have_id}
                  onChange={(e) => handleChange('we_have_id', e.target.checked)}
                />
              }
              label="We have ID"
            />

            <TextField
              label="Signature Date"
              type="date"
              value={values.signature}
              onChange={(e) => handleChange('signature', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
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