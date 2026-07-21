/**
 * Onglet Financier — vue pro « Atelier Sojori »
 * KPI · Flux argent · Sojori / OTA · Paiement · Nuitées
 */

import type { ReactNode } from 'react';
import { Box, Stack, Typography, Paper, Divider, TextField, MenuItem, Chip, LinearProgress } from '@mui/material';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice, formatPriceWithCurrency, formatPriceOrPlaceholder } from '../../utils/formatPrice';

interface FinancierTabProps {
  reservationDetails: any;
  isEditMode: boolean;
  editedData?: Record<string, unknown>;
  onEditedDataChange?: (data: Record<string, unknown>) => void;
}

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.12)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.08)',
  success: '#0a8f5e',
  successBg: 'rgba(10,143,94,0.08)',
  warning: '#c46506',
  warningBg: 'rgba(196,101,6,0.10)',
  error: '#c81e1e',
  errorBg: 'rgba(200,30,30,0.08)',
  info: '#0673b3',
  infoBg: 'rgba(6,115,179,0.08)',
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown, currency = 'MAD'): string {
  return formatPriceWithCurrency(num(v), currency);
}

function amt(obj: any): number {
  if (obj == null) return 0;
  if (typeof obj === 'number') return obj;
  return num(obj.amount);
}

function cur(obj: any, fallback = 'MAD'): string {
  if (obj && typeof obj === 'object' && obj.currency) return String(obj.currency);
  return fallback;
}

function formatDay(value: unknown): string {
  if (!value) return '—';
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? parseISO(s.slice(0, 10)) : new Date(s);
  if (!isValid(d)) return '—';
  return format(d, 'EEE d MMM', { locale: fr });
}

function paymentMeta(status: unknown): { label: string; color: string; bg: string } {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s.includes('payé') || s.includes('paid')) {
    return { label: 'Payé', color: T.success, bg: T.successBg };
  }
  if (s === 'pending' || s.includes('attente')) {
    return { label: 'En attente', color: T.warning, bg: T.warningBg };
  }
  return { label: status ? String(status) : 'Non payé', color: T.error, bg: T.errorBg };
}

function channelLabel(r: any): string {
  const raw = `${r.channelName || r.source || r.communicationChannel || ''}`.toLowerCase();
  if (raw.includes('airbnb')) return 'Airbnb';
  if (raw.includes('booking')) return 'Booking.com';
  if (raw.includes('vrbo')) return 'Vrbo';
  if (raw.includes('whatsapp')) return 'WhatsApp';
  if (raw.includes('direct') || raw.includes('sojori')) return 'Direct Sojori';
  return r.channelName || r.source || 'Canal';
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Paper
      sx={{
        p: 1.75,
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        bgcolor: T.bg1,
        borderTop: accent ? `3px solid ${accent}` : undefined,
        minHeight: 92,
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          color: T.text3,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 18, sm: 20 },
          fontWeight: 800,
          color: accent || T.text,
          fontFamily: '"Geist Mono", monospace',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, lineHeight: 1.3 }}>{hint}</Typography>
      ) : null}
    </Paper>
  );
}

function Line({
  label,
  value,
  bold,
  accent,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: 'space-between',
        alignItems: 'baseline',
        py: 0.7,
        gap: 2,
        borderBottom: `1px solid ${T.border}`,
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: muted ? T.text4 : T.text2, fontWeight: bold ? 700 : 500 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: bold ? 14 : 12.75,
          fontWeight: bold ? 800 : 600,
          color: accent || T.text,
          fontFamily: '"Geist Mono", monospace',
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function Panel({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Paper
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.75,
        bgcolor: T.bg1,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.25,
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: T.bg2,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 800,
            color: T.text2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {icon ? `${icon} ` : ''}
          {title}
        </Typography>
        {action}
      </Stack>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

export function FinancierTab({
  reservationDetails,
  isEditMode,
  editedData = {},
  onEditedDataChange,
}: FinancierTabProps) {
  if (!reservationDetails) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: T.text3 }}>Aucune donnée financière.</Typography>
      </Box>
    );
  }

  const r = reservationDetails;
  const currency = String(r.currency || 'MAD').toUpperCase();
  const breakdown = r.reservationBreakdown?.normalizedBreakdown;
  const displayTotal = editedData.totalPrice ?? r.totalPrice;
  const displayPaymentStatus = editedData.paymentStatus ?? r.paymentStatus;
  const pay = paymentMeta(displayPaymentStatus);

  /**
   * Affichage 100 % MAD.
   * EUR canal → MAD via taux admin déduit (commission convertie / paid÷canal / défaut 10).
   */
  const channelClient = breakdown?.totalPaidByCustomer?.amount != null
    ? { amount: amt(breakdown.totalPaidByCustomer), currency: cur(breakdown.totalPaidByCustomer, currency) }
    : null;
  const channelCommissionEur =
    breakdown?.otaCommission?.channelAmount != null
      ? {
          amount: num(breakdown.otaCommission.channelAmount),
          currency: String(breakdown.otaCommission.channelCurrency || 'EUR').toUpperCase(),
        }
      : breakdown?.otaCommission?.amount != null &&
          cur(breakdown.otaCommission, currency) !== 'MAD'
        ? { amount: amt(breakdown.otaCommission), currency: cur(breakdown.otaCommission, 'EUR') }
        : null;

  const commissionMad =
    breakdown?.otaCommission?.currency &&
    String(breakdown.otaCommission.currency).toUpperCase() === 'MAD' &&
    breakdown.otaCommission.amount != null
      ? amt(breakdown.otaCommission)
      : num(r.otaCommission) ||
        (channelCommissionEur == null && breakdown?.otaCommission
          ? amt(breakdown.otaCommission)
          : 0);

  const alreadyPaid = num(r.alreadyPaid);
  const eurMadRate = (() => {
    if (channelCommissionEur && channelCommissionEur.amount > 0 && commissionMad > 0) {
      return commissionMad / channelCommissionEur.amount;
    }
    if (channelClient && channelClient.currency !== 'MAD' && channelClient.amount > 0 && alreadyPaid > 0) {
      return alreadyPaid / channelClient.amount;
    }
    const roomEur = num(r.reservationBreakdown?.ChannelBreakdown?.roomRate);
    const sojoriH = num(r.sojoriPriceTotal || r.totalPrice);
    if (roomEur > 0 && sojoriH > 0) return sojoriH / roomEur;
    return 10;
  })();

  const toMad = (amount: number, fromCur?: string): number => {
    const c = String(fromCur || 'MAD').toUpperCase();
    if (!Number.isFinite(amount)) return 0;
    if (c === 'MAD' || !c) return amount;
    if (c === 'EUR') return Math.round(amount * eurMadRate * 100) / 100;
    return amount;
  };
  const moneyMad = (amount: number) => money(amount, 'MAD');

  const channelClientMad =
    channelClient != null ? toMad(channelClient.amount, channelClient.currency) : 0;

  const clientPaidMad = num(displayTotal);
  /** Base % = total client canal MAD (incl. frais), sinon hébergement. */
  const commissionBaseMad = channelClientMad > 0 ? channelClientMad : clientPaidMad;
  const netMad = Math.max(0, clientPaidMad - commissionMad);

  const commissionPct =
    commissionBaseMad > 0 && commissionMad > 0
      ? Math.round((commissionMad / commissionBaseMad) * 1000) / 10
      : 0;
  const commissionPctLabel =
    commissionPct > 0 ? `${String(commissionPct).replace('.', ',')}%` : '';
  const commissionCalcLabel =
    commissionPct > 0
      ? `${formatPrice(commissionBaseMad)} × ${commissionPctLabel} = ${formatPrice(commissionMad)} MAD`
      : '';

  const encaisseBase = Math.max(clientPaidMad, channelClientMad, alreadyPaid);
  const remaining = Math.max(0, encaisseBase - alreadyPaid);
  const paidPct =
    encaisseBase > 0 ? Math.min(100, Math.round((alreadyPaid / encaisseBase) * 100)) : 0;

  const nights =
    num(r.nights) ||
    (Array.isArray(r.priceBreakdown) ? r.priceBreakdown.length : 0) ||
    0;
  const avgNight = nights > 0 ? clientPaidMad / nights : 0;

  const setField = (field: string, value: unknown) => {
    onEditedDataChange?.({ ...editedData, [field]: value });
  };

  const unpaidFees = (breakdown?.fees || []).filter((f: any) => !f.paid);
  const paidFees = (breakdown?.fees || []).filter((f: any) => f.paid);
  const taxes = breakdown?.taxes || [];

  const isBooking = /booking/i.test(String(r.channelName || r.source || ''));
  const isAirbnb = /airbnb/i.test(String(r.channelName || r.source || ''));
  const cb = r.reservationBreakdown?.ChannelBreakdown || {};
  const otaDayPricesBrut: any[] = Array.isArray(cb.DayPricesBrut) ? cb.DayPricesBrut : [];
  const otaDayPrices: any[] = Array.isArray(cb.DayPrices) ? cb.DayPrices : [];
  /** Jour par jour — prix canal uniquement (EUR × taux admin → MAD). Colonne Sojori désactivée pour l’instant. */
  const dayRows: Array<{
    date: unknown;
    bookingMad: number | null;
  }> = (() => {
    const dayKey = (d: unknown) => {
      if (d == null || String(d) === 'null') return null;
      const s = String(d).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : null;
    };
    const n = Math.max(otaDayPricesBrut.length, otaDayPrices.length);
    if (n === 0) return [];
    const rows = [];
    for (let i = 0; i < n; i++) {
      const brut = otaDayPricesBrut[i];
      const raw = otaDayPrices[i];
      const date =
        (brut?.Date && String(brut.Date) !== 'null' ? brut.Date : null) ||
        raw?.Date ||
        raw?.date ||
        null;
      let otaEur: number | null = null;
      if (brut?.Price != null && Number.isFinite(Number(brut.Price))) {
        otaEur = Number(brut.Price);
      } else if (raw?.Price != null && Number.isFinite(Number(raw.Price))) {
        otaEur = Number(raw.Price);
      } else if (date && otaDayPrices.length) {
        const key = dayKey(date);
        const hit = key
          ? otaDayPrices.find((d: any) => dayKey(d.Date || d.date) === key)
          : null;
        if (hit?.Price != null) otaEur = Number(hit.Price);
      }
      rows.push({
        date,
        bookingMad: otaEur != null ? toMad(otaEur, 'EUR') : null,
      });
    }
    return rows;
  })();

  const bookingDayTotalMad =
    cb.roomRate != null && Number.isFinite(Number(cb.roomRate))
      ? toMad(Number(cb.roomRate), 'EUR')
      : dayRows.reduce((s, d) => s + (d.bookingMad || 0), 0);
  const hasOtaDayPrices = dayRows.some((d) => d.bookingMad != null);
  const showDayCompare = dayRows.length > 0;


  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.25 }, bgcolor: T.bg0 }}>
      {/* Header */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          border: `1px solid ${T.border}`,
          borderRadius: 2,
          background: `linear-gradient(135deg, #fff 0%, ${T.bg2} 55%, ${T.primaryTint} 140%)`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: T.text3,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Finances séjour
              </Typography>
              <Chip
                size="small"
                label={channelLabel(r)}
                sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: T.bg1, border: `1px solid ${T.border}` }}
              />
              <Chip
                size="small"
                label={pay.label}
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 800,
                  bgcolor: pay.bg,
                  color: pay.color,
                }}
              />
            </Stack>
            {isEditMode ? (
              <TextField
                size="small"
                type="number"
                value={displayTotal ?? ''}
                onChange={(e) => setField('totalPrice', e.target.value === '' ? '' : Number(e.target.value))}
                sx={{
                  maxWidth: 240,
                  '& .MuiInputBase-input': {
                    fontSize: 28,
                    fontWeight: 800,
                    fontFamily: '"Geist Mono", monospace',
                  },
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: { xs: 28, sm: 34 },
                  fontWeight: 800,
                  color: T.primaryDeep,
                  fontFamily: '"Geist Mono", monospace',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatPriceOrPlaceholder(displayTotal, currency)}
              </Typography>
            )}
            <Typography sx={{ fontSize: 12.5, color: T.text2, mt: 0.75 }}>
              {formatDay(r.arrivalDate)} → {formatDay(r.departureDate)}
              {nights > 0 ? ` · ${nights} nuit${nights > 1 ? 's' : ''}` : ''}
              {avgNight > 0 ? ` · ${formatPrice(avgNight)} ${currency}/nuit` : ''}
            </Typography>
          </Box>

          <Box sx={{ minWidth: { md: 220 }, width: { xs: '100%', md: 240 } }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>Encaissement</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: pay.color, fontFamily: '"Geist Mono", monospace' }}>
                {paidPct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={paidPct}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: T.bg3,
                '& .MuiLinearProgress-bar': {
                  bgcolor: paidPct >= 100 ? T.success : T.primary,
                  borderRadius: 99,
                },
              }}
            />
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.75 }}>
              <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                Payé {moneyMad(alreadyPaid)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: remaining > 0 ? T.warning : T.success }}>
                Reste {moneyMad(remaining)}
              </Typography>
            </Stack>
            {isEditMode ? (
              <TextField
                select
                size="small"
                fullWidth
                value={String(displayPaymentStatus || 'UnPaid')}
                onChange={(e) => setField('paymentStatus', e.target.value)}
                sx={{ mt: 1.25 }}
              >
                <MenuItem value="Paid">Payé</MenuItem>
                <MenuItem value="UnPaid">Non payé</MenuItem>
                <MenuItem value="Pending">En attente</MenuItem>
              </TextField>
            ) : null}
          </Box>
        </Stack>
      </Paper>

      {/* KPI strip — montants Sojori (MAD) ; commission canal en devise RU si différente */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 1.25,
          mb: 2,
        }}
      >
        <KpiCard
          label="Total séjour"
          value={moneyMad(clientPaidMad)}
          hint={
            channelClientMad > 0
              ? `Client canal : ${moneyMad(channelClientMad)}`
              : 'Montant Sojori'
          }
          accent={T.info}
        />
        <KpiCard
          label="Commission OTA"
          value={commissionMad > 0 ? moneyMad(commissionMad) : '—'}
          hint={
            commissionPctLabel
              ? `${commissionPctLabel} · Calcul : ${commissionCalcLabel}`
              : 'Aucune'
          }
          accent={T.error}
        />
        <KpiCard
          label="Net Sojori"
          value={moneyMad(netMad)}
          hint="Hébergement − commission"
          accent={T.success}
        />
        <KpiCard
          label="Reste à encaisser"
          value={moneyMad(remaining)}
          hint={remaining <= 0 ? 'Soldé' : 'Solde client'}
          accent={remaining > 0 ? T.warning : T.success}
        />
      </Box>

      {/* Money flow — toujours en devise Sojori (même unité) */}
      {(commissionMad > 0 || breakdown) && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            border: `1px solid ${T.border}`,
            borderRadius: 1.75,
            bgcolor: T.bg1,
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              color: T.text3,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              mb: 1.5,
            }}
          >
            Flux argent ({currency})
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'stretch' } }}
          >
            {[
              {
                label: 'Client',
                value: moneyMad(commissionBaseMad || clientPaidMad),
                sub: undefined as string | undefined,
                color: T.info,
                bg: T.infoBg,
              },
              {
                label: commissionPctLabel ? `− Commission · ${commissionPctLabel}` : '− Commission',
                value: commissionMad > 0 ? moneyMad(commissionMad) : '—',
                sub: commissionCalcLabel || undefined,
                color: T.error,
                bg: T.errorBg,
              },
              {
                label: '= Net reçu',
                value: moneyMad(Math.max(0, (commissionBaseMad || clientPaidMad) - commissionMad)),
                sub: commissionPctLabel
                  ? `${formatPrice(commissionBaseMad || clientPaidMad)} − ${formatPrice(commissionMad)}`
                  : undefined,
                color: T.success,
                bg: T.successBg,
              },
            ].map((step, i) => (
              <Box key={step.label} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {i > 0 ? (
                  <Typography
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      color: T.text4,
                      fontWeight: 800,
                      fontSize: 18,
                      px: 0.25,
                    }}
                  >
                    →
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 1.25,
                    bgcolor: step.bg,
                    border: `1px solid ${T.border}`,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: step.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {step.label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: '"Geist Mono", monospace', mt: 0.35 }}>
                    {step.value}
                  </Typography>
                  {step.sub ? (
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.text2,
                        mt: 0.5,
                        fontFamily: '"Geist Mono", monospace',
                        lineHeight: 1.3,
                      }}
                    >
                      {step.sub}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Stack>
          {eurMadRate > 0 && (channelClientMad > 0 || channelCommissionEur) ? (
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 1.25, lineHeight: 1.4 }}>
              Montants canal convertis en MAD (taux {formatPrice(eurMadRate)}).
            </Typography>
          ) : null}
        </Paper>
      )}

      {/* 2 columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Panel title="Répartition Sojori" icon="🏠">
          <Line label="Hébergement" value={moneyMad(num(r.sojoriPriceTotal || r.totalPrice))} bold />
          <Line label="Taxes Sojori" value={moneyMad(num(r.sojoriTaxTotal || 0))} />
          <Line
            label="Total Sojori"
            value={moneyMad(num(r.sojoriTotal || r.totalPrice))}
            bold
            accent={T.primaryDeep}
          />
          {nights > 0 ? (
            <Line label={`Moyenne / nuit (${nights})`} value={moneyMad(avgNight)} muted />
          ) : null}
        </Panel>

        <Panel title="Paiement" icon="💳">
          {isEditMode ? (
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, color: T.text2 }}>Statut</Typography>
              <TextField
                select
                size="small"
                value={String(displayPaymentStatus || 'UnPaid')}
                onChange={(e) => setField('paymentStatus', e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="Paid">Payé</MenuItem>
                <MenuItem value="UnPaid">Non payé</MenuItem>
                <MenuItem value="Pending">En attente</MenuItem>
              </TextField>
            </Stack>
          ) : (
            <Line label="Statut" value={pay.label} bold accent={pay.color} />
          )}
          <Line label="Méthode" value={r.paymentMethod || '—'} />
          <Line label="Type" value={r.paymentType || '—'} />
          <Line label="Déjà encaissé" value={moneyMad(alreadyPaid)} bold accent={T.success} />
          <Line
            label="Reste à encaisser"
            value={moneyMad(remaining)}
            bold
            accent={remaining > 0 ? T.warning : T.success}
          />
          {r.paymentLink ? (
            <Box sx={{ mt: 1.25, p: 1.25, bgcolor: T.infoBg, borderRadius: 1, border: `1px solid rgba(6,115,179,0.2)` }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.info }}>
                Lien de paiement disponible
              </Typography>
            </Box>
          ) : null}
        </Panel>
      </Box>

      {/* OTA detail */}
      {breakdown ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: unpaidFees.length ? '1fr 1fr' : '1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Panel title={`Détail ${channelLabel(r)}`} icon="🏨">
            {breakdown.accommodation ? (
              <Line
                label="Prix chambre"
                value={moneyMad(toMad(breakdown.accommodation.amount, cur(breakdown.accommodation, 'EUR')))}
                bold
              />
            ) : null}
            {taxes.map((t: any, i: number) => (
              <Line
                key={`tax-${i}`}
                label={t.name || 'Taxe'}
                value={moneyMad(toMad(t.amount, t.currency || 'EUR'))}
              />
            ))}
            {paidFees.map((f: any, i: number) => (
              <Line
                key={`fee-${i}`}
                label={`${f.name || 'Frais'} (inclus)`}
                value={moneyMad(toMad(f.amount, f.currency || 'EUR'))}
              />
            ))}
            <Divider sx={{ my: 1 }} />
            <Line
              label="Total payé par le client"
              value={
                channelClientMad > 0
                  ? moneyMad(channelClientMad)
                  : breakdown.totalPaidByCustomer
                    ? moneyMad(
                        toMad(
                          breakdown.totalPaidByCustomer.amount,
                          cur(breakdown.totalPaidByCustomer, 'EUR'),
                        ),
                      )
                    : '—'
              }
              bold
              accent={T.info}
            />
            {commissionMad > 0 ? (
              <Line
                label="Commission plateforme"
                value={moneyMad(commissionMad)}
                bold
                accent={T.error}
              />
            ) : null}
          </Panel>

          {unpaidFees.length > 0 ? (
            <Panel title="À régler sur place" icon="⚠">
              <Typography sx={{ fontSize: 12, color: T.warning, mb: 1, lineHeight: 1.4 }}>
                Frais non inclus dans le paiement OTA — à collecter auprès du voyageur.
              </Typography>
              {unpaidFees.map((f: any, i: number) => (
                <Line
                  key={`unpaid-${i}`}
                  label={f.name || 'Frais'}
                  value={moneyMad(toMad(f.amount, f.currency || 'EUR'))}
                  bold
                />
              ))}
              {breakdown.totalPaidAtArrival ? (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Line
                    label="Total à l’arrivée"
                    value={moneyMad(
                      toMad(
                        breakdown.totalPaidAtArrival.amount,
                        cur(breakdown.totalPaidAtArrival, 'EUR'),
                      ),
                    )}
                    bold
                    accent={T.warning}
                  />
                </>
              ) : null}
            </Panel>
          ) : null}
        </Box>
      ) : null}

      {/* Breakdown jour par jour — en bas, tout MAD */}
      {showDayCompare ? (
        <Box sx={{ mt: 0.5, mb: 1.5 }}>
          <Panel
            title="Prix par jour"
            icon="📅"
            action={
              <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>
                {isAirbnb && !hasOtaDayPrices ? 'Airbnb : N/A' : `${channelLabel(r)} · MAD`}
              </Typography>
            }
          >
            <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.25, lineHeight: 1.45 }}>
              Prix canal (EUR × taux admin
              {isBooking ? ', promotions / remises incluses' : ''}).
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px,1.4fr) minmax(140px,1fr)',
                  gap: 0,
                  minWidth: 280,
                }}
              >
                {['Date', `${channelLabel(r)} (MAD)`].map((h) => (
                  <Typography
                    key={h}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.text3,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      px: 1,
                      py: 0.85,
                      bgcolor: T.bg2,
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {h}
                  </Typography>
                ))}
                {dayRows.map((day, idx) => {
                  const cell = {
                    fontSize: 13,
                    fontFamily: '"Geist Mono", monospace',
                    px: 1,
                    py: 0.9,
                    borderBottom: `1px solid ${T.border}`,
                    color: T.text2,
                  } as const;
                  const bookingCell =
                    day.bookingMad != null
                      ? moneyMad(day.bookingMad)
                      : isAirbnb || !isBooking
                        ? 'N/A'
                        : '—';
                  return (
                    <Box key={idx} sx={{ display: 'contents' }}>
                      <Typography sx={{ ...cell, fontFamily: 'inherit', fontWeight: 700, color: T.text }}>
                        {formatDay(day.date)}
                      </Typography>
                      <Typography
                        sx={{
                          ...cell,
                          color: bookingCell === 'N/A' || bookingCell === '—' ? T.text4 : T.text,
                          fontWeight: day.bookingMad != null ? 800 : 500,
                        }}
                      >
                        {bookingCell}
                      </Typography>
                    </Box>
                  );
                })}
                <Typography sx={{ fontSize: 13, fontWeight: 800, px: 1, py: 1.1, bgcolor: T.bg2 }}>
                  TOTAL
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    fontFamily: '"Geist Mono", monospace',
                    px: 1,
                    py: 1.1,
                    bgcolor: T.bg2,
                    color: hasOtaDayPrices ? T.primaryDeep : T.text4,
                  }}
                >
                  {hasOtaDayPrices ? moneyMad(bookingDayTotalMad) : isAirbnb ? 'N/A' : '—'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
              Taux EUR→MAD : {formatPrice(eurMadRate)}
            </Typography>
          </Panel>
        </Box>
      ) : null}

      {r.notes && String(r.notes).toLowerCase().includes('payment') ? (
        <Box sx={{ mt: 1.5 }}>
          <Panel title="Notes paiement" icon="📝">
            <Typography sx={{ fontSize: 12.5, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
              {r.notes}
            </Typography>
          </Panel>
        </Box>
      ) : null}
    </Box>
  );
}

export default FinancierTab;
