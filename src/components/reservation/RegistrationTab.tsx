// ════════════════════════════════════════════════════════════════════
// Sojori — Onglet Enregistrement (voyageurs + passeports)
// Restaure l’UI legacy « Travellers » sur la fiche résa Atelier 2026.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState, useEffect, type ChangeEvent } from 'react';
import {
  Alert,
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Add, Close, CloudUpload, Edit, Person, PictureAsPdf } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { ReservationRegistrationActions } from '../reservations/ReservationRegistrationActions';
import * as fulltaskApi from '../../services/fulltaskApi';
import listingsService from '../../services/listingsService';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { generateRandomString } from '../../utils/upload/helpers';
import { postFormDataAsMultipart } from '../../utils/upload/postFormData';
import { getListingMediaDisplayUrl, isListingsBucketUrl } from '../../features/finances/services/listingMediaApi';
import { normalizeRegistrationLevel, type RegistrationLevel } from '../../features/registration/registrationLevel';
import {
  enabledFields,
  evaluateRegistrationCompleteness,
  fieldLabel,
  fieldValueForStay,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
  type RegistrationFieldDef,
  type RegistrationFormSchema,
} from '../../features/registration/formSchema';
import { downloadFichePolicePdf } from '../../features/registration/fichePolicePdf';
import { GuestContractSection } from './GuestContractSection';
import { fetchDefaultPmReportHeader } from '../../features/finances/financesApi';
import { normalizeProfitReportHeader } from '../../features/finances/utils/profitReportHeader';

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
  place_of_birth: string;
  profession: string;
  domicile: string;
  city: string;
  coming_from: string;
  going_to: string;
  document_issued_at: string;
  document_issued_on: string;
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
  place_of_birth: '',
  profession: '',
  domicile: '',
  city: '',
  coming_from: '',
  going_to: '',
  document_issued_at: '',
  document_issued_on: '',
};

function memberDocUrl(m: Member, side: 'front' | 'back'): string {
  if (side === 'front') {
    return String(m.document_front_download || m.document_front_scan || '').trim();
  }
  return String(m.document_back_download || m.document_back_scan || '').trim();
}

function memberStatus(
  m: Member,
  schema: RegistrationFormSchema,
  travelerAnswers?: Record<string, unknown>,
): 'complete' | 'draft' | 'empty' {
  const schemaMissing =
    evaluateRegistrationCompleteness(schema, {
      members: [m],
      customAnswers: { stay: {}, travelers: { '0': travelerAnswers ?? {} } },
      travelerCount: 1,
    }).travelersMissing[0] ?? [];
  if (schemaMissing.length === 0) return 'complete';
  if (m.status === 'DRAFT' || m.draft === true) return 'draft';
  const hasAny =
    Boolean(m.first_name || m.firstName) ||
    Boolean(m.document_number || m.passport) ||
    Boolean(memberDocUrl(m, 'front'));
  return hasAny ? 'draft' : 'empty';
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
  const issuedOnRaw = String(m.document_issued_on || m.issued_on || '');
  let document_issued_on = '';
  if (issuedOnRaw) {
    const d = new Date(issuedOnRaw);
    if (!Number.isNaN(d.getTime())) document_issued_on = d.toISOString().slice(0, 10);
    else if (/^\d{4}-\d{2}-\d{2}/.test(issuedOnRaw)) document_issued_on = issuedOnRaw.slice(0, 10);
  }
  return {
    first_name: String(m.first_name || m.firstName || ''),
    last_name: String(m.last_name || m.lastName || ''),
    nationality: String(m.nationality || ''),
    gender: String(m.gender || '').toLowerCase(),
    document_type: String(m.document_type || 'passport').toLowerCase() || 'passport',
    document_number: String(m.document_number || m.passport || ''),
    date_of_birth,
    country_of_residence: String(m.country_of_residence || m.residence_country || m.country || ''),
    email: String(m.email || ''),
    phone: String(m.phone || ''),
    document_front_download: memberDocUrl(m, 'front'),
    document_back_download: memberDocUrl(m, 'back'),
    place_of_birth: String(m.place_of_birth || m.birth_place || ''),
    profession: String(m.profession || m.occupation || ''),
    domicile: String(m.domicile || m.address || ''),
    city: String(m.city || ''),
    coming_from: String(m.coming_from || m.provenance || ''),
    going_to: String(m.going_to || m.destination || ''),
    document_issued_at: String(m.document_issued_at || m.issued_at || ''),
    document_issued_on,
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
  const listingId = String(
    r?.listingId ||
      r?.listing_id ||
      r?.sojoriId ||
      r?.listing?._id ||
      r?.listing?.id ||
      '',
  ).trim();
  const guestReg = r?.guestRegistration ?? {};
  const customAnswersKey = JSON.stringify(
    (r?.guestRegistration as { customAnswers?: unknown } | undefined)?.customAnswers ?? null,
  );
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
  const [registrationLevel, setRegistrationLevel] = useState<RegistrationLevel>('simple');
  const [formSchema, setFormSchema] = useState<RegistrationFormSchema>(simplePresetSchema());
  const [stayAnswers, setStayAnswers] = useState<Record<string, unknown>>({});
  const [travelerAnswers, setTravelerAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [editCustom, setEditCustom] = useState<Record<string, unknown>>({});
  const [pdfBusy, setPdfBusy] = useState(false);

  const loadLevel = useCallback(async () => {
    const custom = ((r?.guestRegistration as { customAnswers?: {
      stay?: Record<string, unknown>
      travelers?: Record<string, Record<string, unknown>>
    } } | undefined)?.customAnswers ?? {}) as {
      stay?: Record<string, unknown>;
      travelers?: Record<string, Record<string, unknown>>;
    };
    setStayAnswers(custom.stay ?? {});
    setTravelerAnswers(custom.travelers ?? {});
    if (!listingId) {
      setRegistrationLevel('simple');
      setFormSchema(simplePresetSchema());
      return;
    }
    try {
      const raw = (await listingsService.getListingOrchestrationCompiled(listingId)) as {
        data?: {
          registrationForm?: { schema?: RegistrationFormSchema; registrationLevel?: unknown };
          capabilities?: { registration?: { gestion?: Record<string, unknown> } };
        };
        registrationForm?: { schema?: RegistrationFormSchema; registrationLevel?: unknown };
        capabilities?: { registration?: { gestion?: Record<string, unknown> } };
      } | null;
      const doc = raw && typeof raw === 'object' && 'data' in raw && raw.data ? raw.data : raw;
      const attached = doc?.registrationForm?.schema;
      const resolved = attached?.fields
        ? {
            schema: attached,
            registrationLevel: normalizeRegistrationLevel(doc?.registrationForm?.registrationLevel),
          }
        : resolveEffectiveRegistrationForm({
            listingGestion: doc?.capabilities?.registration?.gestion ?? {},
          });
      setFormSchema(resolved.schema);
      setRegistrationLevel(resolved.registrationLevel);
    } catch {
      setRegistrationLevel('simple');
      setFormSchema(simplePresetSchema());
    }
  }, [listingId, resaId, customAnswersKey]);

  useEffect(() => {
    void loadLevel();
  }, [loadLevel]);

  const stats = useMemo(() => {
    const completeness = evaluateRegistrationCompleteness(formSchema, {
      members,
      customAnswers: { stay: stayAnswers, travelers: travelerAnswers },
      stay: r,
      travelerCount: regTotal,
    });
    const allMissing = new Set<string>();
    completeness.stayMissing.forEach((k) => allMissing.add(k));
    completeness.travelersMissing.forEach((list) => list.forEach((k) => allMissing.add(k)));
    const labels = [...allMissing].map((id) => {
      const field = formSchema.fields.find((f) => f.id === id);
      return field ? fieldLabel(field) : id;
    });
    return {
      ok: completeness.registeredCount,
      draft: Math.max(0, completeness.total - completeness.registeredCount),
      missing: Math.max(0, completeness.total - completeness.registeredCount),
      missingLabels: labels,
      stayMissing: completeness.stayMissing,
      complete: completeness.complete,
    };
  }, [members, regTotal, formSchema, stayAnswers, travelerAnswers, r]);

  const complete = stats.complete;

  const openAdd = () => {
    // Première case vide / brouillon plutôt que d’empiler un 4e voyageur
    let target: number | null = null;
    for (let i = 0; i < Math.max(members.length, regTotal); i++) {
      const m = members[i] || {};
      const hasIdentity =
        Boolean(String(m.first_name || m.firstName || '').trim()) ||
        Boolean(String(m.document_number || m.passport || '').trim()) ||
        Boolean(memberDocUrl(m, 'front'));
      if (!hasIdentity) {
        target = i;
        break;
      }
    }
    setPreviewUrl(null);
    setEditIndex(target);
    setForm({ ...EMPTY_FORM });
    setEditCustom({});
    setImageKey(Date.now());
    setModalOpen(true);
  };

  const openEdit = (index: number) => {
    const m = members[index] || {};
    const hasIdentity =
      Boolean(String(m.first_name || m.firstName || '').trim()) ||
      Boolean(String(m.document_number || m.passport || '').trim());
    setPreviewUrl(null);
    setEditIndex(index);
    // Case vide / brouillon sans identité → formulaire vierge (pas d’image du voyageur N-1)
    setForm(hasIdentity ? toForm(m) : { ...EMPTY_FORM });
    setEditCustom({ ...(travelerAnswers[String(index)] ?? {}) });
    setImageKey(Date.now());
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
    setPreviewUrl(null);
    setForm({ ...EMPTY_FORM });
    setEditCustom({});
    setImageKey(Date.now());
  };

  const setField = <K extends keyof MemberForm>(key: K, value: MemberForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!resaId) return;
    if (!form.first_name.trim()) {
      toast.error('Prénom requis');
      return;
    }
    setSaving(true);
    try {
      const index =
        editIndex !== null && editIndex >= 0
          ? editIndex
          : (() => {
              for (let i = 0; i < members.length; i++) {
                const m = members[i] || {};
                const hasIdentity =
                  Boolean(String(m.first_name || m.firstName || '').trim()) ||
                  Boolean(String(m.document_number || m.passport || '').trim()) ||
                  Boolean(memberDocUrl(m, 'front'));
                if (!hasIdentity) return i;
              }
              return members.length;
            })();
      const res = await fulltaskApi.registerGuestMember(resaId, index, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        nationality: form.nationality.trim() || undefined,
        gender: form.gender.trim() || undefined,
        document_type: form.document_type || 'passport',
        document_number: form.document_number.trim() || undefined,
        date_of_birth: form.date_of_birth
          ? `${form.date_of_birth}T00:00:00.000Z`
          : undefined,
        residence_country: form.country_of_residence.trim() || undefined,
        country: form.country_of_residence.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        document_front_download: form.document_front_download || undefined,
        document_back_download: form.document_back_download || undefined,
        place_of_birth: form.place_of_birth.trim() || undefined,
        profession: form.profession.trim() || undefined,
        domicile: form.domicile.trim() || undefined,
        city: form.city.trim() || undefined,
        coming_from: form.coming_from.trim() || undefined,
        going_to: form.going_to.trim() || undefined,
        document_issued_at: form.document_issued_at.trim() || undefined,
        document_issued_on: form.document_issued_on
          ? `${form.document_issued_on}T00:00:00.000Z`
          : undefined,
        customAnswers: editCustom,
        stayAnswers,
      });
      if (res?.success === false) throw new Error(res?.error || 'Échec enregistrement');
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
    if (
      !window.confirm(
        'Supprimer ce voyageur ? Identité, passeport/OCR et statut d’enregistrement seront effacés ; la tâche et l’orchestration seront remises à jour.',
      )
    )
      return;
    setSaving(true);
    try {
      const res = await fulltaskApi.unregisterGuestMember(resaId, index);
      if (res?.success === false) throw new Error(res?.error || 'Échec suppression');
      toast.success('Voyageur supprimé');
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFichePolice = async () => {
    if (registrationLevel !== 'complete') return;
    setPdfBusy(true);
    try {
      let listingName = String(
        r?.listingName || r?.listing_nickname || r?.listing?.name || r?.title || '',
      ).trim();
      if (!listingName && listingId) {
        try {
          const doc = await listingsService.getListingDocument(listingId);
          listingName = String(doc?.name || doc?.nickname || doc?.internalName || '').trim();
        } catch {
          /* ignore */
        }
      }

      let brand: {
        companyName?: string;
        phone?: string;
        email?: string;
        address?: string;
        logoUrl?: string;
      } = {};
      try {
        const header = normalizeProfitReportHeader(
          (await fetchDefaultPmReportHeader()) || undefined,
        );
        brand = {
          companyName: header.companyName || header.publicName || '',
          phone: header.phone || '',
          email: header.email || '',
          address: header.address || '',
          logoUrl: header.logoUrl || '',
        };
      } catch {
        /* branding optionnel */
      }

      await downloadFichePolicePdf(members, {
        reservationLabel: String(r?.reservationNumber || r?.reservation_id || resaId || ''),
        listingName: listingName || '—',
        checkIn: String(r?.arrivalDate || r?.checkIn || r?.startDate || ''),
        checkOut: String(r?.departureDate || r?.checkOut || r?.endDate || ''),
        brand,
      });
      toast.success('PDF fiche police téléchargé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec génération PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: T.bg0, minHeight: 320 }}>
      {stats.missingLabels.length ? (
        <Alert
          severity="error"
          sx={{
            mb: 1.5,
            py: 0.75,
            '& .MuiAlert-message': { fontSize: 13, fontWeight: 700 },
          }}
        >
          Champs requis manquants : {stats.missingLabels.slice(0, 8).join(', ')}
          {stats.missingLabels.length > 8 ? '…' : ''}
        </Alert>
      ) : null}
      {enabledFields(formSchema).some((f) => f.scope === 'per_stay') ? (
        <Paper
          sx={{
            p: 2,
            mb: 1.75,
            border: `1px solid ${T.border}`,
            borderRadius: 1.5,
            bgcolor: T.bg1,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Questions du séjour</Typography>
          <Stack spacing={1.25}>
            {enabledFields(formSchema)
              .filter((f) => f.scope === 'per_stay')
              .map((field) => (
                <SchemaAnswerField
                  key={field.id}
                  field={field}
                  value={fieldValueForStay(field, r, stayAnswers)}
                  onChange={(v) => setStayAnswers((prev) => ({ ...prev, [field.id]: v }))}
                  readOnly={readOnly}
                />
              ))}
            {!readOnly && (
              <Button
                size="small"
                variant="outlined"
                disabled={saving}
                onClick={() => {
                  if (!resaId) return;
                  void (async () => {
                    setSaving(true);
                    try {
                      const res = await fulltaskApi.saveRegistrationAnswers(resaId, { stay: stayAnswers });
                      if (res?.success === false) throw new Error(res.error || 'Échec');
                      toast.success('Questions du séjour enregistrées');
                      onRefresh?.();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erreur');
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                Enregistrer le séjour
              </Button>
            )}
          </Stack>
        </Paper>
      ) : null}
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
                {stats.ok}/{regTotal}
              </Typography>
              <Chip
                size="small"
                label={
                  registrationLevel === 'complete' ? 'Mode complet' : 'Mode simple'
                }
                sx={{
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  bgcolor: T.bg3,
                  color: T.text2,
                }}
              />
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
                {regDone !== stats.ok ? ` · sync ${regDone}` : ''}
              </Typography>
            </Stack>
            {!complete && stats.missingLabels.length > 0 ? (
              <Alert
                severity="error"
                sx={{
                  mt: 1.25,
                  py: 0.5,
                  alignItems: 'center',
                  '& .MuiAlert-message': { fontSize: 12.5, fontWeight: 600 },
                }}
              >
                Champs manquants : {stats.missingLabels.slice(0, 10).join(', ')}
                {stats.missingLabels.length > 10
                  ? ` (+${stats.missingLabels.length - 10})`
                  : ''}
              </Alert>
            ) : null}
          </Box>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {registrationLevel === 'complete' ? (
              <Button
                size="small"
                variant="contained"
                disabled={pdfBusy || members.length === 0}
                startIcon={
                  pdfBusy ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <PictureAsPdf sx={{ fontSize: 16 }} />
                  )
                }
                onClick={() => void handleDownloadFichePolice()}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  bgcolor: T.primaryDeep,
                  '&:hover': { bgcolor: '#6e4f14' },
                }}
              >
                PDF fiche police
              </Button>
            ) : null}
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

      {resaId ? <GuestContractSection reservationId={resaId} readOnly={readOnly} /> : null}

      {Math.max(members.length, regTotal) === 0 ? (
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
          {Array.from({ length: Math.max(members.length, regTotal) }, (_, i) => {
            const m = (members[i] || {}) as Member;
            const status = memberStatus(m, formSchema, travelerAnswers[String(i)]);
            const missing = evaluateRegistrationCompleteness(formSchema, {
              members: [m],
              customAnswers: { stay: stayAnswers, travelers: { '0': travelerAnswers[String(i)] ?? {} } },
              travelerCount: 1,
            }).travelersMissing[0] ?? [];
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
                  border: `1px solid ${missing.length ? 'rgba(200,30,30,0.35)' : T.border}`,
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
                              : 'rgba(200,30,30,0.10)',
                        color:
                          status === 'complete'
                            ? T.success
                            : status === 'draft'
                              ? T.warning
                              : T.error,
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

                {missing.length > 0 ? (
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.error,
                      mb: 1,
                      lineHeight: 1.35,
                    }}
                  >
                    Manquent :{' '}
                    {missing
                      .slice(0, 8)
                      .map((k) => {
                        const field = formSchema.fields.find((f) => f.id === k);
                        return field ? fieldLabel(field) : k;
                      })
                      .join(', ')}
                    {missing.length > 8 ? ` (+${missing.length - 8})` : ''}
                  </Typography>
                ) : null}

                <Stack spacing={0.45} sx={{ mb: 1.25 }}>
                  <InfoRow
                    label="Nationalité"
                    value={String(m.nationality || '—')}
                    missing={missing.includes('nationality')}
                  />
                  <InfoRow
                    label="Passeport / pièce"
                    value={passport}
                    mono
                    missing={missing.includes('document_number')}
                  />
                  <InfoRow
                    label="Naissance"
                    value={
                      formDate(String(m.date_of_birth || m.birth_date || m.birthDate || '')) || '—'
                    }
                    missing={missing.includes('birth_date')}
                  />
                  <InfoRow
                    label="Lieu de naissance"
                    value={String(m.place_of_birth || m.birth_place || '—')}
                  />
                  <InfoRow
                    label="Délivré à"
                    value={String(m.document_issued_at || m.issued_at || '—')}
                  />
                  <InfoRow
                    label="Délivré le"
                    value={formDate(String(m.document_issued_on || m.issued_on || '')) || '—'}
                  />
                  <InfoRow label="Genre" value={String(m.gender || '—')} />
                  <InfoRow
                    label="Résidence"
                    value={String(m.country_of_residence || m.residence_country || m.country || '—')}
                  />
                  {registrationLevel === 'complete' ? (
                    <>
                      <InfoRow
                        label="Profession"
                        value={String(m.profession || '—')}
                        missing={missing.includes('profession')}
                      />
                      <InfoRow
                        label="Provenance"
                        value={String(m.coming_from || '—')}
                        missing={missing.includes('coming_from')}
                      />
                      <InfoRow
                        label="Destination"
                        value={String(m.going_to || '—')}
                        missing={missing.includes('going_to')}
                      />
                      <InfoRow
                        label="Téléphone"
                        value={String(m.phone || '—')}
                        missing={missing.includes('phone')}
                      />
                      <InfoRow label="Domicile" value={String(m.domicile || m.address || '—')} />
                      <InfoRow label="Ville" value={String(m.city || '—')} />
                    </>
                  ) : null}
                </Stack>

                {(front || back) ? (
                  <Stack direction="row" spacing={1}>
                    {front ? (
                      <SignedDocThumb src={front} label="Recto" onPreview={setPreviewUrl} />
                    ) : null}
                    {back ? (
                      <SignedDocThumb src={back} label="Verso" onPreview={setPreviewUrl} />
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

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        // Remount formulaire à chaque ouverture → pas d’image / champs fantômes du voyageur précédent
        key={`reg-modal-${editIndex ?? 'new'}-${imageKey}`}
      >
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
                slotProps={{ inputLabel: { shrink: true } }}
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
                error={registrationLevel === 'complete' && !form.phone.trim()}
                helperText={
                  registrationLevel === 'complete' && !form.phone.trim()
                    ? 'Requis en mode complet'
                    : undefined
                }
              />
            </Stack>

            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, pt: 0.5 }}>
              Passeport / pièce (OCR)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Lieu de naissance"
                size="small"
                fullWidth
                value={form.place_of_birth}
                onChange={(e) => setField('place_of_birth', e.target.value)}
              />
              <TextField
                label="Délivré à"
                size="small"
                fullWidth
                value={form.document_issued_at}
                onChange={(e) => setField('document_issued_at', e.target.value)}
              />
              <TextField
                label="Délivré le"
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.document_issued_on}
                onChange={(e) => setField('document_issued_on', e.target.value)}
              />
            </Stack>

            {registrationLevel === 'complete' ? (
              <>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.error, pt: 0.5 }}>
                  Fiche de police — champs complémentaires
                </Typography>
                <TextField
                  label="Profession"
                  size="small"
                  fullWidth
                  value={form.profession}
                  onChange={(e) => setField('profession', e.target.value)}
                  error={!form.profession.trim()}
                />
                <TextField
                  label="Domicile habituel"
                  size="small"
                  fullWidth
                  value={form.domicile}
                  onChange={(e) => setField('domicile', e.target.value)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Ville"
                    size="small"
                    fullWidth
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                  />
                  <TextField
                    label="Lieu de provenance"
                    size="small"
                    fullWidth
                    value={form.coming_from}
                    onChange={(e) => setField('coming_from', e.target.value)}
                    error={!form.coming_from.trim()}
                  />
                  <TextField
                    label="Allant à"
                    size="small"
                    fullWidth
                    value={form.going_to}
                    onChange={(e) => setField('going_to', e.target.value)}
                    error={!form.going_to.trim()}
                  />
                </Stack>
              </>
            ) : null}

            {enabledFields(formSchema)
              .filter((f) => f.scope === 'per_traveler' && f.kind === 'custom')
              .map((field) => (
                <SchemaAnswerField
                  key={field.id}
                  field={field}
                  value={editCustom[field.id]}
                  onChange={(v) => setEditCustom((prev) => ({ ...prev, [field.id]: v }))}
                />
              ))}

            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, pt: 0.5 }}>
              Pièce d’identité
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                {form.document_front_download ? (
                  <Box sx={{ position: 'relative', mb: 1 }}>
                    <Box
                      component="img"
                      key={`front-img-${imageKey}-${form.document_front_download}`}
                      src={form.document_front_download}
                      alt="Recto"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: `1px solid ${T.border}`,
                        cursor: 'pointer',
                        display: 'block',
                      }}
                      onClick={() => setPreviewUrl(form.document_front_download)}
                    />
                    <Button
                      size="small"
                      onClick={() => setField('document_front_download', '')}
                      sx={{
                        mt: 0.5,
                        textTransform: 'none',
                        fontSize: 11,
                        color: T.error,
                        minWidth: 0,
                        p: 0.25,
                      }}
                    >
                      Retirer la photo
                    </Button>
                  </Box>
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
                    <Box sx={{ position: 'relative', mb: 1 }}>
                      <Box
                        component="img"
                        key={`back-img-${imageKey}-${form.document_back_download}`}
                        src={form.document_back_download}
                        alt="Verso"
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: `1px solid ${T.border}`,
                          cursor: 'pointer',
                          display: 'block',
                        }}
                        onClick={() => setPreviewUrl(form.document_back_download)}
                      />
                      <Button
                        size="small"
                        onClick={() => setField('document_back_download', '')}
                        sx={{
                          mt: 0.5,
                          textTransform: 'none',
                          fontSize: 11,
                          color: T.error,
                          minWidth: 0,
                          p: 0.25,
                        }}
                      >
                        Retirer
                      </Button>
                    </Box>
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

function InfoRow({
  label,
  value,
  mono,
  missing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  missing?: boolean;
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: missing ? T.error : T.text3, fontWeight: missing ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: missing ? T.error : T.text,
          textAlign: 'right',
          fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
        }}
      >
        {missing && (!value || value === '—') ? 'manquant' : value}
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

/** GCS documents are private — resolve a signed URL before display. */
function SignedDocThumb({
  src,
  label,
  onPreview,
}: {
  src: string;
  label: string;
  onPreview: (url: string) => void;
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    setDisplayUrl(null);
    void (async () => {
      try {
        const url = isListingsBucketUrl(src)
          ? await getListingMediaDisplayUrl(src)
          : src;
        if (url.startsWith('blob:')) objectUrl = url;
        if (!cancelled) setDisplayUrl(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text4, mb: 0.35 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11, color: T.error }}>Image indisponible</Typography>
      </Box>
    );
  }

  if (!displayUrl) {
    return (
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 88 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  return <DocThumb src={displayUrl} label={label} onClick={() => onPreview(displayUrl)} />;
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
  const [loading, setLoading] = useState(false);
  const inputId = `doc-upload-${label.replace(/\W+/g, '-').toLowerCase()}`;

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true);
    try {
      const rid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `upl-${Date.now()}`;
      const formData = new FormData();
      formData.append('media', file);
      formData.append('type', 'documents');
      formData.append('name', generateRandomString(15));
      formData.append('client_rid', rid);

      const response = await postFormDataAsMultipart(MICROSERVICE_BASE_URL.UPLOAD_IMAGE, formData, {
        rid,
      });
      const url = response?.data?.url;
      if (url) {
        onUploaded(String(url));
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

function SchemaAnswerField({
  field,
  value,
  onChange,
  readOnly = false,
}: {
  field: RegistrationFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}) {
  const str = value == null ? '' : Array.isArray(value) ? value.join(',') : String(value);
  const label = `${field.label}${field.required ? ' *' : ''}`;
  if (field.type === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={str === 'true' || str === '1' || value === true}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
          />
        }
        label={label}
      />
    );
  }
  if (field.type === 'select' || field.type === 'multi_select') {
    return (
      <TextField
        select
        label={label}
        size="small"
        fullWidth
        value={str}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        slotProps={field.type === 'multi_select' ? { select: { multiple: true } } : undefined}
      >
        <MenuItem value="">—</MenuItem>
        {(field.options ?? []).map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <TextField
      label={label}
      size="small"
      fullWidth
      multiline={field.type === 'long_text'}
      minRows={field.type === 'long_text' ? 2 : undefined}
      type={field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
      value={str}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      slotProps={
        field.type === 'date' || field.type === 'time' ? { inputLabel: { shrink: true } } : undefined
      }
    />
  );
}
