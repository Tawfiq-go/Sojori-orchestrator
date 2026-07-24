// ════════════════════════════════════════════════════════════════════
// Sojori — Onglet Enregistrement (voyageurs + passeports)
// Restaure l’UI legacy « Travellers » sur la fiche résa Atelier 2026.
// ════════════════════════════════════════════════════════════════════

import { useMemo, useState, type ChangeEvent } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add, Close, CloudUpload, Edit, Person } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { ReservationRegistrationActions } from '../reservations/ReservationRegistrationActions';
import reservationsService from '../../services/reservationsService';
import { uploadImageToAPI } from '../../redux/slices/UploadSlice';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
};

type Member = Record<string, unknown>;

type MemberForm = {
  first_name: string;
  last_name: string;
  nationality: string;
  gender: string;
  document_type: string;
  document_number: string;
  date_of_birth: string;
  country_of_residence: string;
  email: string;
  phone: string;
  document_front_download: string;
  document_back_download: string;
};

const EMPTY_FORM: MemberForm = {
  first_name: '',
  last_name: '',
  nationality: '',
  gender: '',
  document_type: 'passport',
  document_number: '',
  date_of_birth: '',
  country_of_residence: '',
  email: '',
  phone: '',
  document_front_download: '',
  document_back_download: '',
};

function memberDocUrl(m: Member, side: 'front' | 'back'): string {
  if (side === 'front') {
    return String(m.document_front_download || m.document_front_scan || '').trim();
  }
  return String(m.document_back_download || m.document_back_scan || '').trim();
}

function memberStatus(m: Member): 'complete' | 'draft' | 'empty' {
  if (m.status === 'COMPLETE' || m.draft === false) return 'complete';
  if (m.status === 'DRAFT' || m.draft === true) return 'draft';
  const hasCore =
    Boolean(m.first_name || m.firstName) &&
    Boolean(m.document_number || m.passport);
  return hasCore ? 'complete' : 'empty';
}

function toForm(m?: Member | null): MemberForm {
  if (!m) return { ...EMPTY_FORM };
  const dobRaw = String(m.date_of_birth || m.birth_date || m.birthDate || '');
  let date_of_birth = '';
  if (dobRaw) {
    const d = new Date(dobRaw);
    if (!Number.isNaN(d.getTime())) date_of_birth = d.toISOString().slice(0, 10);
    else if (/^\d{4}-\d{2}-\d{2}/.test(dobRaw)) date_of_birth = dobRaw.slice(0, 10);
  }
  return {
    first_name: String(m.first_name || m.firstName || ''),
    last_name: String(m.last_name || m.lastName || ''),
    nationality: String(m.nationality || ''),
    gender: String(m.gender || '').toLowerCase(),
    document_type: String(m.document_type || 'passport').toLowerCase() || 'passport',
    document_number: String(m.document_number || m.passport || ''),
    date_of_birth,
    country_of_residence: String(m.country_of_residence || m.residence_country || ''),
    email: String(m.email || ''),
    phone: String(m.phone || ''),
    document_front_download: memberDocUrl(m, 'front'),
    document_back_download: memberDocUrl(m, 'back'),
  };
}

function formToMember(form: MemberForm): Member {
  const dob = form.date_of_birth
    ? `${form.date_of_birth}T00:00:00.000Z`
    : '';
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    firstName: form.first_name.trim(),
    lastName: form.last_name.trim(),
    nationality: form.nationality.trim(),
    gender: form.gender.trim(),
    document_type: form.document_type || 'passport',
    document_number: form.document_number.trim(),
    passport: form.document_number.trim(),
    date_of_birth: dob,
    birth_date: dob,
    birthDate: dob,
    country_of_residence: form.country_of_residence.trim(),
    residence_country: form.country_of_residence.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    document_front_download: form.document_front_download,
    document_back_download: form.document_back_download,
    document_front_scan: form.document_front_download,
    document_back_scan: form.document_back_download,
    registration: 'Manual',
    status: 'COMPLETE',
    draft: false,
  };
}

interface RegistrationTabProps {
  reservationDetails: any;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function RegistrationTab({
  reservationDetails,
  onRefresh,
  readOnly = false,
}: RegistrationTabProps) {
  const r = reservationDetails;
  const resaId = String(r?._id || r?.id || '');
  const guestReg = r?.guestRegistration ?? {};
  const members: Member[] = Array.isArray(guestReg.members) ? guestReg.members : [];
  const regTotal =
    Number(guestReg.nbre_guest_to_register ?? r?.adults ?? 0) || Math.max(members.length, 1);
  const regDone = Number(guestReg.nbre_guest_registered ?? guestReg.nbre_guest_complete ?? 0) || 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const complete = regTotal > 0 && regDone >= regTotal;

  const stats = useMemo(() => {
    let ok = 0;
    let draft = 0;
    for (const m of members) {
      const s = memberStatus(m);
      if (s === 'complete') ok += 1;
      else if (s === 'draft') draft += 1;
    }
    return { ok, draft, missing: Math.max(0, regTotal - ok) };
  }, [members, regTotal]);

  const openAdd = () => {
    setEditIndex(null);
    setForm({ ...EMPTY_FORM });
    setImageKey(Date.now());
    setModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditIndex(index);
    setForm(toForm(members[index]));
    setImageKey(Date.now());
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
    setForm(EMPTY_FORM);
  };

  const setField = <K extends keyof MemberForm>(key: K, value: MemberForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const persistMembers = async (nextMembers: Member[]) => {
    const completeCount = nextMembers.filter((m) => memberStatus(m) === 'complete').length;
    const draftCount = nextMembers.filter((m) => memberStatus(m) === 'draft').length;
    const nextReg = {
      ...guestReg,
      members: nextMembers,
      nbre_guest_to_register: Math.max(regTotal, nextMembers.length, 1),
      nbre_guest_registered: completeCount,
      nbre_guest_complete: completeCount,
      nbre_guest_draft: draftCount,
      registration_status:
        completeCount >= Math.max(regTotal, 1) ? 'COMPLETED' : completeCount > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    };
    const res = await reservationsService.updateGuestRegistration(resaId, nextReg);
    if (!res.success) throw new Error(res.message || 'Échec enregistrement');
  };

  const handleSave = async () => {
    if (!resaId) return;
    if (!form.first_name.trim()) {
      toast.error('Prénom requis');
      return;
    }
    setSaving(true);
    try {
      const member = formToMember(form);
      const next =
        editIndex === null
          ? [...members, member]
          : members.map((m, i) => (i === editIndex ? { ...m, ...member } : m));
      await persistMembers(next);
      toast.success(editIndex === null ? 'Voyageur ajouté' : 'Voyageur mis à jour');
      closeModal();
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!resaId || readOnly) return;
    if (!window.confirm('Supprimer ce voyageur enregistré ?')) return;
    setSaving(true);
    try {
      const next = members.filter((_, i) => i !== index);
      await persistMembers(next);
      toast.success('Voyageur supprimé');
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: T.bg0, minHeight: 320 }}>
      <Paper
        sx={{
          p: 2,
          mb: 1.75,
          border: `1px solid ${T.border}`,
          borderRadius: 1.5,
          bgcolor: T.bg1,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: T.text3,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Enregistrement voyageurs
            </Typography>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: '"Geist Mono", monospace',
                  color: complete ? T.success : T.primaryDeep,
                }}
              >
                {regDone}/{regTotal}
              </Typography>
              <Chip
                size="small"
                label={complete ? 'Finalisé' : 'En cours'}
                sx={{
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  bgcolor: complete ? 'rgba(10,143,94,0.12)' : T.primaryTint,
                  color: complete ? T.success : T.primaryDeep,
                }}
              />
              <Typography sx={{ fontSize: 12, color: T.text3 }}>
                {stats.ok} validé{stats.ok > 1 ? 's' : ''} · {stats.draft} brouillon
                {stats.draft > 1 ? 's' : ''} · {stats.missing} manquant
                {stats.missing > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {resaId ? (
              <ReservationRegistrationActions
                reservationId={resaId}
                registered={regDone}
                total={regTotal}
                members={members as any}
                disabled={readOnly}
                variant="button"
                onRegistrationUpdated={() => onRefresh?.()}
              />
            ) : null}
            {!readOnly ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={openAdd}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  borderColor: T.border,
                  color: T.text2,
                }}
              >
                Nouveau voyageur
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {members.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px dashed ${T.border}`,
            borderRadius: 1.5,
            bgcolor: T.bg1,
          }}
        >
          <Person sx={{ fontSize: 36, color: T.text4, mb: 1 }} />
          <Typography sx={{ fontSize: 13, color: T.text3, mb: 1.5 }}>
            Aucun voyageur enregistré pour cette réservation.
          </Typography>
          {!readOnly ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAdd}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: T.primaryDeep,
                '&:hover': { bgcolor: '#6e4f14' },
              }}
            >
              Enregistrer un voyageur
            </Button>
          ) : null}
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          {members.map((m, i) => {
            const status = memberStatus(m);
            const first = String(m.first_name || m.firstName || '—');
            const last = String(m.last_name || m.lastName || '');
            const front = memberDocUrl(m, 'front');
            const back = memberDocUrl(m, 'back');
            const passport = String(m.document_number || m.passport || '—');
            return (
              <Paper
                key={i}
                sx={{
                  p: 2,
                  border: `1px solid ${T.border}`,
                  borderRadius: 1.5,
                  bgcolor: T.bg1,
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                      {first} {last}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: T.text3 }}>
                      Voyageur {i + 1}
                    </Typography>
                  </Box>
                  <Stack direction="row" sx={{ gap: 0.5, alignItems: 'flex-start' }}>
                    <Chip
                      size="small"
                      label={
                        status === 'complete' ? 'Validé' : status === 'draft' ? 'Brouillon' : 'Incomplet'
                      }
                      sx={{
                        height: 22,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor:
                          status === 'complete'
                            ? 'rgba(10,143,94,0.12)'
                            : status === 'draft'
                              ? 'rgba(196,101,6,0.12)'
                              : T.bg3,
                        color:
                          status === 'complete'
                            ? T.success
                            : status === 'draft'
                              ? T.warning
                              : T.text3,
                      }}
                    />
                    {!readOnly ? (
                      <>
                        <IconButton size="small" onClick={() => openEdit(i)} sx={{ color: T.text2 }}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => void handleDelete(i)}
                          sx={{ color: T.error }}
                        >
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </>
                    ) : null}
                  </Stack>
                </Stack>

                <Stack spacing={0.45} sx={{ mb: 1.25 }}>
                  <InfoRow label="Nationalité" value={String(m.nationality || '—')} />
                  <InfoRow label="Passeport / pièce" value={passport} mono />
                  <InfoRow
                    label="Naissance"
                    value={
                      formDate(String(m.date_of_birth || m.birth_date || m.birthDate || '')) || '—'
                    }
                  />
                  <InfoRow label="Genre" value={String(m.gender || '—')} />
                  <InfoRow
                    label="Résidence"
                    value={String(m.country_of_residence || m.residence_country || '—')}
                  />
                </Stack>

                {(front || back) ? (
                  <Stack direction="row" spacing={1}>
                    {front ? (
                      <DocThumb src={front} label="Recto" onClick={() => setPreviewUrl(front)} />
                    ) : null}
                    {back ? (
                      <DocThumb src={back} label="Verso" onClick={() => setPreviewUrl(back)} />
                    ) : null}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 11.5, color: T.text4 }}>
                    Aucune image de pièce d’identité
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, pr: 6 }}>
          {editIndex === null ? 'Ajouter un voyageur' : 'Modifier le voyageur'}
          <IconButton
            onClick={closeModal}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Prénom"
                size="small"
                fullWidth
                required
                value={form.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
              />
              <TextField
                label="Nom"
                size="small"
                fullWidth
                value={form.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Nationalité"
                size="small"
                fullWidth
                value={form.nationality}
                onChange={(e) => setField('nationality', e.target.value)}
              />
              <TextField
                select
                label="Genre"
                size="small"
                fullWidth
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="m">Homme</MenuItem>
                <MenuItem value="f">Femme</MenuItem>
                <MenuItem value="other">Autre</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                select
                label="Type de pièce"
                size="small"
                fullWidth
                value={form.document_type}
                onChange={(e) => setField('document_type', e.target.value)}
              >
                <MenuItem value="passport">Passeport</MenuItem>
                <MenuItem value="id_card">Carte d’identité</MenuItem>
                <MenuItem value="other">Autre</MenuItem>
              </TextField>
              <TextField
                label="N° document"
                size="small"
                fullWidth
                value={form.document_number}
                onChange={(e) => setField('document_number', e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Date de naissance"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)}
              />
              <TextField
                label="Pays de résidence"
                size="small"
                fullWidth
                value={form.country_of_residence}
                onChange={(e) => setField('country_of_residence', e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Email"
                size="small"
                fullWidth
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
              <TextField
                label="Téléphone"
                size="small"
                fullWidth
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Stack>

            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, pt: 0.5 }}>
              Pièce d’identité
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                {form.document_front_download ? (
                  <Box
                    component="img"
                    src={form.document_front_download}
                    alt="Recto"
                    sx={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: `1px solid ${T.border}`,
                      mb: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => setPreviewUrl(form.document_front_download)}
                  />
                ) : null}
                <DocUploadButton
                  key={`front-${imageKey}`}
                  label="Upload recto / passeport"
                  onUploaded={(url) => {
                    setField('document_front_download', url);
                    if (form.document_type === 'passport') setField('document_back_download', '');
                  }}
                />
              </Box>
              {form.document_type !== 'passport' ? (
                <Box sx={{ flex: 1 }}>
                  {form.document_back_download ? (
                    <Box
                      component="img"
                      src={form.document_back_download}
                      alt="Verso"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: `1px solid ${T.border}`,
                        mb: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewUrl(form.document_back_download)}
                    />
                  ) : null}
                  <DocUploadButton
                    key={`back-${imageKey}`}
                    label="Upload verso"
                    onUploaded={(url) => setField('document_back_download', url)}
                  />
                </Box>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={closeModal} sx={{ textTransform: 'none', color: T.text2 }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void handleSave()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: T.primaryDeep,
              '&:hover': { bgcolor: '#6e4f14' },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(previewUrl)} onClose={() => setPreviewUrl(null)} maxWidth="md">
        <DialogContent sx={{ p: 1 }}>
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt="Document"
              sx={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', mx: 'auto' }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: T.text3 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: T.text,
          textAlign: 'right',
          fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function DocThumb({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text4, mb: 0.35 }}>
        {label}
      </Typography>
      <Box
        component="img"
        src={src}
        alt={label}
        onClick={onClick}
        sx={{
          width: '100%',
          height: 88,
          objectFit: 'cover',
          borderRadius: 1,
          border: `1px solid ${T.border}`,
          cursor: 'pointer',
          '&:hover': { outline: `2px solid ${T.primary}` },
        }}
      />
    </Box>
  );
}

function formDate(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('fr-FR');
}

function DocUploadButton({
  label,
  onUploaded,
}: {
  label: string;
  onUploaded: (url: string) => void;
}) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const inputId = `doc-upload-${label.replace(/\W+/g, '-').toLowerCase()}`;

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true);
    try {
      const resultAction = await dispatch(uploadImageToAPI({ file, folder: 'documents' }) as any);
      if (uploadImageToAPI.fulfilled.match(resultAction) && resultAction.payload?.url) {
        onUploaded(String(resultAction.payload.url));
        toast.success('Image uploadée');
      } else {
        toast.error('Échec upload image');
      }
    } catch {
      toast.error('Échec upload image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => void onChange(e)}
      />
      <label htmlFor={inputId}>
        <Button
          component="span"
          size="small"
          variant="outlined"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <CloudUpload sx={{ fontSize: 16 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 11.5,
            borderColor: T.border,
            color: T.text2,
          }}
        >
          {loading ? 'Upload…' : label}
        </Button>
      </label>
    </>
  );
}
