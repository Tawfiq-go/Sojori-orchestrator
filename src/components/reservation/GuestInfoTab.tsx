// ════════════════════════════════════════════════════════════════════
// Sojori — Guest Info Tab · édition « Atelier 2026 »
// Structure préservée : header OTA · Voyageur · Actions · Notes · Propriété
// · Statuts · Données OTA · Comparaison prix · Frais & Taxes
// ════════════════════════════════════════════════════════════════════

import { Box, Stack, Typography, Paper, Chip, Button, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, TextField, MenuItem } from '@mui/material';
import moment from 'moment';
import 'moment/locale/fr';
import { formatPriceOrPlaceholder } from '../../utils/formatPrice';
import { formatDateInputValue } from '../../utils/reservationEditPayload';
import * as fulltaskApi from '../../services/fulltaskApi';
import { toast } from 'react-toastify';

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
    return <Row label={label} value={value} mono={mono} />;
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
  if (!t) return '—';
  if (typeof t === 'number') {
    const h = Math.floor(t / 100), m = t % 100;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return String(t);
};

const OTAHeaderBadge = ({ channel }: { channel: string }) => {
  const c = (channel || '').toLowerCase();
  const meta =
    c.includes('airbnb')  ? { label: 'Airbnb',  bg: '#FF5A5F', initial: 'A' } :
    c.includes('booking') ? { label: 'Booking', bg: '#003580', initial: 'B' } :
                            { label: 'Direct',  bg: T.primary, initial: 'S' };
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
      <Avatar sx={{ width: 44, height: 44, bgcolor: meta.bg, color: '#fff', fontSize: 18, fontWeight: 700 }}>{meta.initial}</Avatar>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{meta.label}</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: '"Geist Mono", monospace', color: T.text }}>
          {channel}
        </Typography>
      </Box>
    </Stack>
  );
};

// ─── Composant principal ───────────────────────────────────────────
export function GuestInfoTab({
  reservationDetails,
  isEditMode,
  editedData = {},
  onEditedDataChange,
  reservationId,
  onRefresh,
}: GuestInfoTabProps) {
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

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      {/* ─── Hero : OTA + Numéro + Prix + Statut ──────────────────── */}
      <Paper sx={{
        p: 2.5, mb: 2, border: `1px solid ${T.border}`, borderRadius: 1.75,
        background: `linear-gradient(135deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <OTAHeaderBadge channel={r.channelName || 'Direct'} />
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.text, mt: 1.25, fontFamily: '"Geist Mono", monospace' }}>
              {r.reservationNumber || r._id || '—'}
            </Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Prix total
              </Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 700, fontFamily: '"Geist Mono", monospace', color: T.primaryDeep, lineHeight: 1.1 }}>
                {formatPriceOrPlaceholder(r.totalPrice, r.currency || 'MAD')}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
                {r.paymentStatus || 'Non défini'} · {r.nights || 0} nuits
              </Typography>
            </Box>
            <Chip label={r.status || 'Unknown'} sx={{
              fontWeight: 700, fontSize: 12, px: 1,
              bgcolor: r.status === 'Confirmed' ? 'rgba(10,143,94,0.12)' :
                       r.status === 'Pending'   ? 'rgba(196,101,6,0.12)' :
                       'rgba(20,17,10,0.05)',
              color: r.status === 'Confirmed' ? T.success : r.status === 'Pending' ? T.warning : T.text3,
            }} />
          </Stack>
        </Stack>
      </Paper>

      {/* ─── Grille 2 colonnes ───────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* ── LEFT ── */}
        <Box>
          <SectionCard title="👤 Voyageur">
            <EditableRow label="Nom" field="guestName" value={r.guestName || `${r.guestFirstName ?? ''} ${r.guestLastName ?? ''}`.trim()} {...rowProps} />
            <EditableRow label="Email" field="guestEmail" value={r.guestEmail} type="email" {...rowProps} />
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
            {(r.guestRegistration || r.adults) && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" sx={{ justifyContent: 'center', gap: 2, alignItems: 'baseline' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.success, fontFamily: '"Geist Mono", monospace' }}>
                    {r.guestRegistration?.nbre_guest_registered ?? 0}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: T.text3, fontWeight: 600 }}>/</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: '"Geist Mono", monospace' }}>
                    {r.guestRegistration?.nbre_guest_to_register ?? r.adults ?? 0}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    enregistrés
                  </Typography>
                </Stack>
              </>
            )}
            {members.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Prénom</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Nom</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Nationalité</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Passeport</TableCell>
                        <TableCell sx={{ fontSize: 10, fontWeight: 700 }}>Genre</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: 12 }}>{m.first_name || m.firstName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{m.last_name || m.lastName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{m.nationality || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontFamily: '"Geist Mono", monospace' }}>{m.document_number || m.passport || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{m.gender || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </SectionCard>

          <SectionCard title="⚡ Actions rapides">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button fullWidth variant="contained" size="small" onClick={handleDeclareArrival} sx={{
                textTransform: 'none', fontWeight: 600,
                background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
                color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
                '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
              }}>✓ Déclarer arrivé</Button>
              <Button fullWidth variant="outlined" size="small" onClick={handleDeclareDeparture} sx={{
                textTransform: 'none', fontWeight: 600,
                borderColor: 'rgba(20,17,10,0.14)', color: T.text2,
                '&:hover': { bgcolor: T.bg2 },
              }}>👋 Déclarer parti</Button>
            </Stack>
          </SectionCard>

          {(r.notes || isEditMode) && (
            <SectionCard title="📝 Notes">
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
              ) : (
                <Box sx={{ p: 1.5, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
                  <Typography sx={{ fontSize: 12.5, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.55, maxHeight: 200, overflowY: 'auto' }}>
                    {r.notes}
                  </Typography>
                </Box>
              )}
            </SectionCard>
          )}
        </Box>

        {/* ── RIGHT ── */}
        <Box>
          <SectionCard title="🏠 Propriété & dates">
            <Row label="Nom" value={r.listing?.name || r.sojoriId} bold />
            <Row label="Type" value={r.roomTypes?.roomTypeName} />
            <Divider sx={{ my: 1.25 }} />
            <EditableRow label="Check-in" field="arrivalDate" value={r.arrivalDate} type="date" {...rowProps} />
            <EditableRow label="Heure check-in" field="checkInTime" value={r.checkInTime ?? ''} mono {...rowProps} />
            <EditableRow label="Check-out" field="departureDate" value={r.departureDate} type="date" {...rowProps} />
            <EditableRow label="Heure check-out" field="checkOutTime" value={r.checkOutTime ?? ''} mono {...rowProps} />
            {!isEditMode && (
              <>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, pl: 1.5 }}>
                  <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                    {r.confirmedCheckInTime ? 'Choisie guest' : 'Prévue OTA'} / Déclarée
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.text2, fontFamily: '"Geist Mono", monospace' }}>
                    {formatTime(r.checkInTime)} · {r.actualArrivalTime ? (
                      <Box component="span" sx={{ color: T.success, fontWeight: 700 }}>✓ {formatTime(r.actualArrivalTime)}</Box>
                    ) : <Box component="span" sx={{ color: T.text4 }}>—</Box>}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, pl: 1.5 }}>
                  <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                    {r.confirmedCheckOutTime ? 'Choisie guest' : 'Prévue OTA'} / Déclarée
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.text2, fontFamily: '"Geist Mono", monospace' }}>
                    {formatTime(r.checkOutTime)} · {r.actualDepartureTime ? (
                      <Box component="span" sx={{ color: T.warning, fontWeight: 700 }}>✓ {formatTime(r.actualDepartureTime)}</Box>
                    ) : <Box component="span" sx={{ color: T.text4 }}>—</Box>}
                  </Typography>
                </Stack>
              </>
            )}
          </SectionCard>

          <SectionCard title="📊 Statuts">
            <EditableRow label="Réservation" field="status" value={r.status} type="select" options={RESERVATION_STATUS_OPTIONS} {...rowProps} />
            <EditableRow label="Paiement" field="paymentStatus" value={r.paymentStatus} type="select" options={PAYMENT_STATUS_OPTIONS} {...rowProps} />
            <Row label="Mode d'encaissement" value={r.paymentMethod} />
            <Row label="Créé le" value={formatDate(r.createdAt || r.reservationDate)} />
          </SectionCard>

          {isBooking && (
            <SectionCard title="💼 Données Booking.com">
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

      {/* ─── Comparaison Prix par Jour ──────────────────────────── */}
      {r.priceBreakdown && r.priceBreakdown.length > 0 && (
        <SectionCard title="Comparaison prix par jour">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: T.bg2 }}>
                  <TableCell sx={cellHead}>Date</TableCell>
                  <TableCell sx={cellHead}>{r.channelName} (EUR)</TableCell>
                  <TableCell sx={cellHead}>Sojori ({r.currency || 'MAD'})</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {r.priceBreakdown.map((day: any, idx: number) => {
                  const otaDay = r.reservationBreakdown?.ChannelBreakdown?.DayPricesBrut?.find((d: any) => d.Date === day.date);
                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={cellBody}>{moment(day.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell sx={{ ...cellBody, fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
                        {otaDay?.Price ? `${otaDay.Price} EUR` : '—'}
                      </TableCell>
                      <TableCell sx={{ ...cellBody, fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
                        {day.price ?? '—'} {r.currency}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ bgcolor: T.bg2 }}>
                  <TableCell sx={{ ...cellBody, fontWeight: 700, fontSize: 13 }}>TOTAL</TableCell>
                  <TableCell sx={{ ...cellBody, fontWeight: 700, fontSize: 13, fontFamily: '"Geist Mono", monospace' }}>
                    {r.reservationBreakdown?.ChannelBreakdown?.roomRate ? `${r.reservationBreakdown.ChannelBreakdown.roomRate} EUR` : '—'}
                  </TableCell>
                  <TableCell sx={{ ...cellBody, fontWeight: 700, fontSize: 13, fontFamily: '"Geist Mono", monospace' }}>
                    {r.sojoriPriceTotal || r.totalPrice || '—'} {r.currency}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {/* ─── Frais & Taxes ──────────────────────────────────────── */}
      {(r.taxes || r.fees || r.reservationBreakdown?.normalizedBreakdown?.fees) && (
        <SectionCard title="Frais & taxes">
          <Stack spacing={2}>
            {r.taxes && (
              <Box>
                <Typography sx={subHead}>📋 Taxes Sojori</Typography>
                <Row label="Taxe inconnue" value="0.00 MAD" />
                <Divider sx={{ my: 1 }} />
                <Row label="Sous-total Taxes Sojori" value="0.00 MAD" bold />
              </Box>
            )}
            {(r.fees || r.reservationBreakdown?.normalizedBreakdown) && (
              <Box>
                <Typography sx={subHead}>🏦 Frais {r.channelName}</Typography>

                <Box sx={{ p: 1, bgcolor: 'rgba(10,143,94,0.06)', borderRadius: 0.75, border: `1px solid rgba(10,143,94,0.18)`, mb: 1 }}>
                  <Typography sx={{ fontSize: 11, color: T.success, fontWeight: 600 }}>✓ Inclus dans le total</Typography>
                </Box>

                {r.reservationBreakdown?.normalizedBreakdown?.taxes?.map((tax: any, i: number) => (
                  <Row key={i} label={tax.name} value={`${tax.amount} ${tax.currency}`} mono />
                ))}
                {r.reservationBreakdown?.normalizedBreakdown?.fees?.filter((f: any) => f.paid).map((fee: any, i: number) => (
                  <Row key={i} label={fee.name} value={`${fee.amount} ${fee.currency}`} mono />
                ))}

                <Box sx={{ p: 1, mt: 1.5, bgcolor: 'rgba(196,101,6,0.06)', borderRadius: 0.75, border: `1px solid rgba(196,101,6,0.20)` }}>
                  <Typography sx={{ fontSize: 11, color: T.warning, fontWeight: 600 }}>⚠ À payer en plus par le client</Typography>
                </Box>
                {r.reservationBreakdown?.normalizedBreakdown?.fees?.filter((f: any) => !f.paid).map((fee: any, i: number) => (
                  <Row key={i} label={fee.name} value={`${fee.amount} ${fee.currency}`} mono />
                ))}

                {r.fees && !r.reservationBreakdown?.normalizedBreakdown && (
                  <>
                    <Row label="TVA"                       value={r.fees.vat} />
                    <Row label="Frais d'entretien ménager" value={r.fees.cleaning} />
                    <Row label="Taxe de séjour"            value={r.fees.touristTax} />
                    <Row label="Taxe gouvernementale"      value={r.fees.govTax} />
                  </>
                )}

                <Divider sx={{ my: 1.25 }} />
                <Row
                  label={`Sous-total Frais ${r.channelName}`}
                  value={r.reservationBreakdown?.normalizedBreakdown?.totalPaidByCustomer
                    ? `${r.reservationBreakdown.normalizedBreakdown.totalPaidByCustomer.amount} ${r.reservationBreakdown.normalizedBreakdown.totalPaidByCustomer.currency}`
                    : r.fees?.total || '—'}
                  bold mono
                />
              </Box>
            )}
          </Stack>
        </SectionCard>
      )}
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
const netReceived = (r: any): string => {
  const paid = r.reservationBreakdown?.normalizedBreakdown?.totalPaidByCustomer?.amount ?? r.totalPrice ?? 0;
  const comm = r.reservationBreakdown?.normalizedBreakdown?.otaCommission?.amount ?? r.otaCommission ?? 0;
  const cur = r.reservationBreakdown?.normalizedBreakdown?.otaCommission?.currency || r.currency || '';
  return `${(paid - comm).toFixed(2)} ${cur}`.trim();
};

const cellHead = { fontWeight: 700, fontSize: 10.75, color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase' as const };
const cellBody = { fontSize: 12.5, color: T.text2 };
const subHead  = { fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, letterSpacing: '0.06em', textTransform: 'uppercase' as const };

export default GuestInfoTab;
