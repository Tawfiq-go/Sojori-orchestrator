// ════════════════════════════════════════════════════════════════════
// Sojori — Guest Info Tab · édition « Atelier 2026 »
// Structure : séjour (timeline) · header OTA · Voyageur · Actions · Notes · Propriété · Statuts
// ════════════════════════════════════════════════════════════════════

import { Box, Stack, Typography, Paper, Chip, Button, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem } from '@mui/material';
import moment from 'moment';
import 'moment/locale/fr';
import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPriceOrPlaceholder } from '../../utils/formatPrice';
import { formatReservationPaid } from '../../utils/reservationPaidDisplay';
import { formatDateInputValue } from '../../utils/reservationEditPayload';
import * as fulltaskApi from '../../services/fulltaskApi';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { ReservationRegistrationActions } from '../reservations/ReservationRegistrationActions';

moment.locale('fr');

interface GuestInfoTabProps {
  reservationDetails: any;
  isEditMode: boolean;
  editedData?: Record<string, unknown>;
  onEditedDataChange?: (data: Record<string, unknown>) => void;
  reservationId?: string;
  onRefresh?: () => void;
}

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
};

// ─── Helpers UI ────────────────────────────────────────────────────
const SectionCard = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <Paper sx={{ p: 2.25, mb: 1.75, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</Typography>
      {action}
    </Stack>
    {children}
  </Paper>
);

const Row = ({ label, value, bold, mono, accent }: { label: string; value: any; bold?: boolean; mono?: boolean; accent?: string }) => (
  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.6 }}>
    <Typography sx={{ fontSize: 12.5, color: T.text3 }}>{label}</Typography>
    <Typography sx={{
      fontSize: 12.75, fontWeight: bold ? 700 : 500, color: accent || T.text, textAlign: 'right',
      fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
    }}>{value ?? '—'}</Typography>
  </Stack>
);

const RESERVATION_STATUS_OPTIONS = [
  { value: 'Pending', label: 'En attente' },
  { value: 'Confirmed', label: 'Confirmée' },
  { value: 'Completed', label: 'Terminée' },
  { value: 'CancelledByAdmin', label: 'Annulée (Admin)' },
  { value: 'CancelledByCustomer', label: 'Annulée (Client)' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'Paid', label: 'Payé' },
  { value: 'UnPaid', label: 'Non payé' },
  { value: 'Pending', label: 'En attente' },
];

type EditableRowProps = {
  label: string;
  field: string;
  value: unknown;
  isEditMode: boolean;
  editedData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
  mono?: boolean;
};

const fieldSx = {
  '& .MuiInputBase-input': { fontSize: 12.5, py: 0.75, textAlign: 'right' as const },
  '& .MuiOutlinedInput-root': { borderRadius: 1 },
  minWidth: 160,
  maxWidth: 220,
};

const EditableRow = ({
  label,
  field,
  value,
  isEditMode,
  editedData,
  onChange,
  type = 'text',
  options,
  mono,
}: EditableRowProps) => {
  if (!isEditMode) {
    const display =
      type === 'date' ? formatDate(value) : value == null || value === '' ? '—' : value;
    return <Row label={label} value={display} mono={mono} />;
  }
  const current = editedData[field] ?? value ?? '';
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, gap: 1 }}>
      <Typography sx={{ fontSize: 12.5, color: T.text3, flexShrink: 0 }}>{label}</Typography>
      {type === 'select' && options ? (
        <TextField
          select
          size="small"
          value={String(current)}
          onChange={(e) => onChange(field, e.target.value)}
          sx={fieldSx}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          size="small"
          type={type}
          value={type === 'date' ? formatDateInputValue(current) : current}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(field, type === 'number' ? Number(raw) : raw);
          }}
          sx={{
            ...fieldSx,
            ...(mono ? { '& .MuiInputBase-input': { ...fieldSx['& .MuiInputBase-input'], fontFamily: '"Geist Mono", monospace' } } : {}),
          }}
        />
      )}
    </Stack>
  );
};

const formatDate = (date: any) => date ? moment(date).format('DD MMM YYYY') : '—';
const formatTime = (t: any) => {
  if (t == null || t === '' || typeof t === 'boolean') return '—';
  if (typeof t === 'number') {
    const h = Math.floor(t / 100), m = t % 100;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  const s = String(t).trim();
  if (s === 'true' || s === 'false') return '—';
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
};

/** Emails proxy OTA (Airbnb/Booking via RU) — inutiles à afficher. */
function isProxyGuestEmail(email: unknown): boolean {
  const e = String(email || '').toLowerCase();
  if (!e || !e.includes('@')) return true;
  return (
    e.includes('guest.airbnb') ||
    e.includes('guests.quickconnect') ||
    e.includes('@guest.booking') ||
    e.includes('noreply') ||
    e.includes('no-reply') ||
    /@guests?\./i.test(e)
  );
}

/** Nettoie notes OTA (&#xD;, entités HTML) et formate Key: value. */
function cleanNotes(raw: unknown): string {
  let s = String(raw ?? '');
  if (!s.trim()) return '';
  s = s
    .replace(/&#x[dD];/gi, '\n')
    .replace(/&#13;/g, '\n')
    .replace(/&#xA;/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

function notesAsRows(raw: unknown): Array<{ label: string; value: string }> | null {
  const cleaned = cleanNotes(raw);
  if (!cleaned) return null;
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const m = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (!m) return null;
    rows.push({ label: m[1].trim(), value: m[2].trim() });
  }
  return rows.length >= 2 ? rows : null;
}

function parseDay(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? startOfDay(value) : null;
  const s = String(value).trim();
  if (!s) return null;
  const dayOnly = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayOnly)) {
    const d = parseISO(dayOnly);
    return isValid(d) ? startOfDay(d) : null;
  }
  const d = new Date(s);
  return isValid(d) ? startOfDay(d) : null;
}

function formatDayShort(d: Date | null): string {
  if (!d) return '—';
  return format(d, 'EEE d MMM', { locale: fr });
}

function formatCheckClock(t: unknown): string {
  if (t == null || t === '' || typeof t === 'boolean') return '';
  if (typeof t === 'number') {
    // 15 or 1500 → 15:00 ; 11 → 11:00
    if (t >= 0 && t < 24) return `${String(t).padStart(2, '0')}:00`;
    const h = Math.floor(t / 100);
    const m = t % 100;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  }
  const s = String(t).trim();
  if (s === 'true' || s === 'false') return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    // ISO date alone is not a check-in clock — ignore (évite 21:00 fantôme UTC)
    return '';
  }
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  if (/^\d{1,2}h\d{0,2}$/i.test(s)) {
    const [h, m = '00'] = s.toLowerCase().replace('h', ':').split(':');
    return `${h.padStart(2, '0')}:${m.padEnd(2, '0').slice(0, 2)}`;
  }
  if (/^\d{1,2}$/.test(s)) {
    const h = Number(s);
    if (h >= 0 && h < 24) return `${String(h).padStart(2, '0')}:00`;
  }
  return '';
}

function pickClock(...vals: unknown[]): string {
  for (const v of vals) {
    const f = formatCheckClock(v);
    if (f) return f;
  }
  return '';
}

function channelMeta(channel: string) {
  const c = (channel || '').toLowerCase();
  if (c.includes('airbnb')) return { label: 'Airbnb', bg: '#FF5A5F' };
  if (c.includes('booking')) return { label: 'Booking', bg: '#003580' };
  return { label: 'Direct', bg: T.primary };
}

/**
 * Hero compact : canal + prix + countdown + timeline 1 ligne.
 * (page header a déjà n° résa / dates — on ne répète pas)
 */
function StayHero({ r }: { r: any }) {
  const listingName = r.listing?.name || r.listingName || 'Propriété';
  const arrival = parseDay(r.arrivalDate);
  const departure = parseDay(r.departureDate);
  const today = startOfDay(new Date());
  const nights =
    arrival && departure
      ? Math.max(1, differenceInCalendarDays(departure, arrival))
      : Number(r.nights) || 0;
  // Prefer real clock fields — confirmed* can be boolean flags
  const checkIn = pickClock(r.checkInTime, r.confirmedCheckInTime);
  const checkOut = pickClock(r.checkOutTime, r.confirmedCheckOutTime);
  const adults = Number(r.adults ?? 0);
  const children = Number(r.children ?? 0);
  const infants = Number(r.infants ?? 0);
  const ch = channelMeta(r.channelName || 'Direct');

  type Phase = 'before' | 'during' | 'after';
  const phase: Phase =
    !arrival || !departure ? 'before' : today < arrival ? 'before' : today >= departure ? 'after' : 'during';
  const daysToArrival = arrival ? differenceInCalendarDays(arrival, today) : null;
  const daysToDeparture = departure ? differenceInCalendarDays(departure, today) : null;

  const gapLabel =
    phase === 'before' && daysToArrival != null
      ? daysToArrival === 0
        ? "Aujourd'hui"
        : `${daysToArrival} j`
      : phase === 'during' && daysToDeparture != null
        ? daysToDeparture === 0
          ? "Aujourd'hui"
          : `${daysToDeparture} j`
        : '—';

  const guests = [
    adults ? `${adults}A` : null,
    children ? `${children}E` : null,
    infants ? `${infants}B` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const statusOk = String(r.status || '').toLowerCase().includes('confirm');
  const paidOk = String(r.paymentStatus || '').toLowerCase().includes('paid') &&
    !String(r.paymentStatus || '').toLowerCase().includes('un');

  const stepSx = {
    flex: 1,
    minWidth: 0,
    textAlign: 'center' as const,
    px: 0.75,
    py: 1,
  };

  return (
    <Paper
      sx={{
        mb: 1.5,
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        bgcolor: T.bg1,
        overflow: 'hidden',
      }}
    >
      {/* Ligne 1 — identité + prix */}
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          px: 1.5,
          py: 1.15,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          background: `linear-gradient(135deg, #fff 0%, ${T.bg2} 70%, ${T.primaryTint} 160%)`,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 0.75,
              bgcolor: ch.bg,
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {ch.label[0]}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text }}>{ch.label}</Typography>
              <Chip
                size="small"
                label={r.status || '—'}
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: statusOk ? 'rgba(10,143,94,0.12)' : T.bg2,
                  color: statusOk ? T.success : T.text3,
                }}
              />
              <Chip
                size="small"
                label={r.paymentStatus || '—'}
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: paidOk ? 'rgba(10,143,94,0.12)' : T.bg2,
                  color: paidOk ? T.success : T.text3,
                }}
              />
            </Stack>
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 700,
                color: T.text2,
                mt: 0.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: 200, sm: 360 },
              }}
            >
              {listingName}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, fontFamily: '"Geist Mono", monospace', color: T.primaryDeep, lineHeight: 1.1 }} title="Total déjà payé — hors taxes non payées">
            {formatReservationPaid(r) || formatPriceOrPlaceholder(r.totalPrice, r.currency || 'MAD')}
          </Typography>
          <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 600, mt: 0.2 }}>
            {nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : ''}
            {guests ? ` · ${guests}` : ''}
          </Typography>
        </Box>
      </Stack>

      {/* Une ligne : Aujourd’hui · délai · Arrivée · Départ */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1.4fr 1.4fr',
          alignItems: 'stretch',
          position: 'relative',
        }}
      >
        <Box sx={stepSx}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: T.text3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Aujourd’hui
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mt: 0.2 }}>
            {format(today, 'd MMM', { locale: fr })}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 0.5,
            bgcolor: T.primaryTint,
            borderLeft: `1px solid ${T.border}`,
            borderRight: `1px solid ${T.border}`,
            minWidth: 56,
          }}
        >
          <Typography sx={{ fontSize: 9, fontWeight: 800, color: T.primaryDeep, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {phase === 'during' ? 'Reste' : 'Dans'}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.primaryDeep, fontFamily: '"Geist Mono", monospace' }}>
            {gapLabel}
          </Typography>
        </Box>

        <Box sx={{ ...stepSx, borderRight: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: T.text3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Arrivée
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mt: 0.2, lineHeight: 1.25 }}>
            {formatDayShort(arrival)}
            {checkIn ? (
              <Box component="span" sx={{ display: 'block', color: T.primaryDeep, fontFamily: '"Geist Mono", monospace', fontSize: 12, mt: 0.15 }}>
                {checkIn}
              </Box>
            ) : null}
          </Typography>
        </Box>

        <Box sx={stepSx}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: T.text3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Départ
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mt: 0.2, lineHeight: 1.25 }}>
            {formatDayShort(departure)}
            {checkOut ? (
              <Box component="span" sx={{ display: 'block', color: T.text2, fontFamily: '"Geist Mono", monospace', fontSize: 12, mt: 0.15 }}>
                {checkOut}
              </Box>
            ) : null}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Composant principal ───────────────────────────────────────────
export function GuestInfoTab({
  reservationDetails,
  isEditMode,
  editedData = {},
  onEditedDataChange,
  reservationId,
  onRefresh,
}: GuestInfoTabProps) {
  const [, setSearchParams] = useSearchParams();

  if (!reservationDetails) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: T.text3 }}>Aucune donnée disponible.</Typography>
      </Box>
    );
  }
  const r = reservationDetails;
  const patch = editedData;
  const setField = (field: string, value: unknown) => {
    onEditedDataChange?.({ ...patch, [field]: value });
  };
  const rowProps = {
    isEditMode,
    editedData: patch,
    onChange: setField,
  };
  const isBooking = (r.channelName || '').toLowerCase().includes('booking');
  const resaId = reservationId || r._id;

  const handleDeclareArrival = async () => {
    if (!resaId) return;
    try {
      await fulltaskApi.declareGuestArrival(String(resaId));
      toast.success('Arrivée déclarée');
      onRefresh?.();
    } catch {
      toast.error('Erreur déclaration arrivée');
    }
  };

  const handleDeclareDeparture = async () => {
    if (!resaId) return;
    try {
      await fulltaskApi.declareGuestDeparture(String(resaId));
      toast.success('Départ déclaré');
      onRefresh?.();
    } catch {
      toast.error('Erreur déclaration départ');
    }
  };

  const members = Array.isArray(r.guestRegistration?.members) ? r.guestRegistration.members : [];
  const showEmail = isEditMode || !isProxyGuestEmail(r.guestEmail);
  const notesRows = !isEditMode ? notesAsRows(r.notes) : null;
  const regTotal = Number(r.guestRegistration?.nbre_guest_to_register ?? r.adults ?? 0) || 0;
  const regDone = Number(r.guestRegistration?.nbre_guest_registered ?? 0) || 0;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: T.bg0 }}>
      <StayHero r={r} />

      {/* ─── Grille 2 colonnes ───────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
        {/* ── LEFT ── */}
        <Box>
          <SectionCard title="Voyageur">
            <EditableRow label="Nom" field="guestName" value={r.guestName || `${r.guestFirstName ?? ''} ${r.guestLastName ?? ''}`.trim()} {...rowProps} />
            {showEmail ? (
              <EditableRow label="Email" field="guestEmail" value={r.guestEmail} type="email" {...rowProps} />
            ) : null}
            <EditableRow label="Téléphone" field="phone" value={r.phone} type="tel" mono {...rowProps} />
            <EditableRow label="Pays" field="guestCountry" value={r.guestCountry} {...rowProps} />
            {isEditMode ? (
              <>
                <EditableRow label="Adultes" field="adults" value={r.adults ?? 0} type="number" mono {...rowProps} />
                <EditableRow label="Enfants" field="children" value={r.children ?? 0} type="number" mono {...rowProps} />
                <EditableRow label="Bébés" field="infants" value={r.infants ?? 0} type="number" mono {...rowProps} />
              </>
            ) : (
              <Row label="Voyageurs" value={`${r.adults || 0}A · ${r.children || 0}E · ${r.infants || 0}B`} bold mono />
            )}
          </SectionCard>

          {(regTotal > 0 || members.length > 0 || resaId) && (
            <SectionCard
              title="Enregistrement"
              action={
                resaId ? (
                  <ReservationRegistrationActions
                    reservationId={String(resaId)}
                    registered={regDone}
                    total={regTotal || Math.max(1, Number(r.adults) || 1)}
                    members={members}
                    onRegistrationUpdated={(patch) => {
                      onEditedDataChange?.({
                        ...patch,
                        // keep local view in sync without full form edit
                      });
                      onRefresh?.();
                    }}
                  />
                ) : null
              }
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: members.length ? 1 : 0 }}>
                <Typography sx={{ fontSize: 12.5, color: T.text2 }}>
                  {regDone >= regTotal && regTotal > 0 ? 'Finalisé' : 'En cours'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: '"Geist Mono", monospace',
                    color: regDone >= regTotal && regTotal > 0 ? T.success : T.primaryDeep,
                  }}
                >
                  {regDone}/{regTotal || '—'}
                </Typography>
              </Stack>
              {members.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Prénom</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Nom</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Nationalité</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Passeport</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: 12 }}>{m.first_name || m.firstName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{m.last_name || m.lastName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{m.nationality || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontFamily: '"Geist Mono", monospace' }}>
                            {m.document_number || m.passport || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ fontSize: 12, color: T.text3 }}>
                  Cliquez sur {regDone}/{regTotal || 0} pour enregistrer, ou ouvrez l’onglet Enregistrement.
                </Typography>
              )}
              <Button
                size="small"
                onClick={() => setSearchParams({ tab: 'enregistrement' })}
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 11.5,
                  color: T.primaryDeep,
                  px: 0,
                  minWidth: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                Voir passeports & détails →
              </Button>
            </SectionCard>
          )}

          <SectionCard title="Actions">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button fullWidth variant="contained" size="small" onClick={handleDeclareArrival} sx={{
                textTransform: 'none', fontWeight: 600,
                background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
                color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
                '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
              }}>Déclarer arrivé</Button>
              <Button fullWidth variant="outlined" size="small" onClick={handleDeclareDeparture} sx={{
                textTransform: 'none', fontWeight: 600,
                borderColor: 'rgba(20,17,10,0.14)', color: T.text2,
                '&:hover': { bgcolor: T.bg2 },
              }}>Déclarer parti</Button>
            </Stack>
          </SectionCard>

          {(r.notes || isEditMode) && (
            <SectionCard title="Notes">
              {isEditMode ? (
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  size="small"
                  value={String(patch.notes ?? r.notes ?? '')}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Notes internes…"
                  sx={{ '& .MuiInputBase-input': { fontSize: 12.5, lineHeight: 1.55 } }}
                />
              ) : notesRows ? (
                <Stack spacing={0.35}>
                  {notesRows.map((row) => (
                    <Stack
                      key={row.label}
                      direction="row"
                      sx={{ justifyContent: 'space-between', gap: 1, py: 0.35, borderBottom: `1px solid ${T.border}` }}
                    >
                      <Typography sx={{ fontSize: 11.5, color: T.text3, flexShrink: 0 }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text, textAlign: 'right' }}>
                        {row.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ p: 1.5, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
                  <Typography sx={{ fontSize: 12.5, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.55, maxHeight: 200, overflowY: 'auto' }}>
                    {cleanNotes(r.notes)}
                  </Typography>
                </Box>
              )}
            </SectionCard>
          )}
        </Box>

        {/* ── RIGHT ── */}
        <Box>
          <SectionCard title="Propriété">
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.text, mb: 0.35 }}>
              {r.listing?.name || r.listingName || '—'}
            </Typography>
            {(r.roomTypes?.roomTypeName || r.roomTypeName) && (
              <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1 }}>
                {r.roomTypes?.roomTypeName || r.roomTypeName}
              </Typography>
            )}
            {r.sojoriId ? (
              <Typography sx={{ fontSize: 11, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
                {String(r.sojoriId)}
              </Typography>
            ) : null}
            {isEditMode ? (
              <>
                <Divider sx={{ my: 1.25 }} />
                <EditableRow label="Check-in" field="arrivalDate" value={r.arrivalDate} type="date" {...rowProps} />
                <EditableRow label="Heure check-in" field="checkInTime" value={r.checkInTime ?? ''} mono {...rowProps} />
                <EditableRow label="Check-out" field="departureDate" value={r.departureDate} type="date" {...rowProps} />
                <EditableRow label="Heure check-out" field="checkOutTime" value={r.checkOutTime ?? ''} mono {...rowProps} />
              </>
            ) : null}
          </SectionCard>

          <SectionCard title="Statuts">
            <EditableRow label="Réservation" field="status" value={r.status} type="select" options={RESERVATION_STATUS_OPTIONS} {...rowProps} />
            <EditableRow label="Paiement" field="paymentStatus" value={r.paymentStatus} type="select" options={PAYMENT_STATUS_OPTIONS} {...rowProps} />
            <Row label="Mode d'encaissement" value={r.paymentMethod} />
            <Row label="Créé le" value={formatDate(r.createdAt || r.reservationDate)} />
          </SectionCard>

          {isBooking && (
            <SectionCard title="Booking.com">
              <Stack spacing={1.25}>
                <FinancialRow label="Prix OTA" value={priceOf(r.reservationBreakdown?.normalizedBreakdown?.totalPaidByCustomer) || `${r.totalPrice ?? '—'} ${r.currency || ''}`} bold />
                <Box sx={{ textAlign: 'center', color: T.text4, fontSize: 16 }}>↓</Box>
                <FinancialRow label="Commission OTA" value={priceOf(r.reservationBreakdown?.normalizedBreakdown?.otaCommission) || '—'} accent={T.error} bold />
                <Box sx={{ textAlign: 'center', color: T.text4, fontSize: 16 }}>=</Box>
                <Paper sx={{ p: 1.5, bgcolor: 'rgba(10,143,94,0.08)', border: `1px solid rgba(10,143,94,0.18)`, borderRadius: 1 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Net reçu</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.success, fontFamily: '"Geist Mono", monospace' }}>
                      {netReceived(r)}
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </SectionCard>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Sub-composants ────────────────────────────────────────────────
const FinancialRow = ({ label, value, accent, bold }: { label: string; value: any; accent?: string; bold?: boolean }) => (
  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography sx={{ fontSize: 12.5, color: T.text2 }}>{label}</Typography>
    <Typography sx={{
      fontSize: 14, fontWeight: bold ? 700 : 500,
      color: accent || T.text, fontFamily: '"Geist Mono", monospace',
    }}>{value}</Typography>
  </Stack>
);

// ─── Utils ─────────────────────────────────────────────────────────
const priceOf = (obj: any) => (obj?.amount != null) ? `${obj.amount} ${obj.currency || ''}`.trim() : null;
/** Net en MAD — commission déjà convertie (taux admin) dans otaCommission. */
const netReceived = (r: any): string => {
  const paid = Number(r.totalPrice) || 0;
  const nb = r.reservationBreakdown?.normalizedBreakdown?.otaCommission;
  const cur = String(r.currency || nb?.currency || 'MAD').toUpperCase();
  const comm =
    nb?.currency && String(nb.currency).toUpperCase() === 'MAD' && nb.amount != null
      ? Number(nb.amount)
      : Number(r.otaCommission) || 0;
  return `${(paid - comm).toFixed(2)} ${cur}`.trim();
};

export default GuestInfoTab;
