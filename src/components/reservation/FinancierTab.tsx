// ════════════════════════════════════════════════════════════════════
// Sojori — Financier Tab · édition « Atelier 2026 »
// Hero · Répartition Sojori · Prix OTA · Commission/Net · Frais à payer
// · Paiement · Breakdown détaillé par jour · Notes
// ════════════════════════════════════════════════════════════════════

import { Box, Stack, Typography, Paper, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import moment from 'moment';
import 'moment/locale/fr';
import { formatPrice, formatPriceWithCurrency, formatPriceOrPlaceholder } from '../../utils/formatPrice';

moment.locale('fr');

interface FinancierTabProps {
  reservationDetails: any;
  isEditMode: boolean;
}

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
};

const SectionCard = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
  <Paper sx={{
    p: 2.25, mb: 1.75, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1,
    ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
  }}>
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1.5 }}>{title}</Typography>
    {children}
  </Paper>
);

const Row = ({ label, value, bold, mono, accent }: { label: string; value: any; bold?: boolean; mono?: boolean; accent?: string }) => (
  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.6 }}>
    <Typography sx={{ fontSize: 12.5, color: T.text2 }}>{label}</Typography>
    <Typography sx={{
      fontSize: 12.75, fontWeight: bold ? 700 : 500, color: accent || T.text, textAlign: 'right',
      fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
    }}>{value ?? '—'}</Typography>
  </Stack>
);

export function FinancierTab({ reservationDetails }: FinancierTabProps) {
  if (!reservationDetails) {
    return <Box sx={{ p: 3 }}><Typography sx={{ color: T.text3 }}>Aucune donnée disponible.</Typography></Box>;
  }
  const r = reservationDetails;
  const breakdown = r.reservationBreakdown?.normalizedBreakdown;

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      {/* Hero financier */}
      <Paper sx={{
        p: 2.5, mb: 2, border: `1px solid ${T.border}`, borderRadius: 1.75,
        background: `linear-gradient(135deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.5 }}>
              Prix total réservation
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 700, color: T.primaryDeep, fontFamily: '"Geist Mono", monospace', lineHeight: 1 }}>
              {formatPriceOrPlaceholder(r.totalPrice, r.currency || 'MAD')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.5 }}>
              Statut paiement
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: r.paymentStatus === 'Paid' ? T.success : T.warning }}>
              {r.paymentStatus || 'Non défini'}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25, fontFamily: '"Geist Mono", monospace' }}>
              Déjà payé : {formatPriceWithCurrency(r.alreadyPaid || 0, r.currency)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Grille 2 colonnes */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* LEFT */}
        <Box>
          <SectionCard title="📊 Répartition prix Sojori" accent={T.primary}>
            <Row label="Prix hébergement" value={formatPriceWithCurrency(r.sojoriPriceTotal || r.totalPrice || 0, r.currency)} bold mono />
            <Row label="Taxes Sojori"     value={formatPriceWithCurrency(r.sojoriTaxTotal || 0, r.currency)} mono />
            <Divider sx={{ my: 1.25 }} />
            <Row label="Total Sojori" value={formatPriceWithCurrency(r.sojoriTotal || r.totalPrice || 0, r.currency)} bold mono accent={T.primaryDeep} />
          </SectionCard>

          {breakdown && (
            <SectionCard title="💼 Prix OTA" accent={T.info}>
              <Row label="Prix chambre" value={breakdown.accommodation ? formatPriceWithCurrency(breakdown.accommodation.amount, breakdown.accommodation.currency) : '—'} bold mono />
              {breakdown.taxes?.length > 0 && (
                <>
                  <Typography sx={subHead}>✓ Taxes incluses</Typography>
                  {breakdown.taxes.map((t: any, i: number) => <Row key={i} label={t.name} value={formatPriceWithCurrency(t.amount, t.currency)} mono />)}
                </>
              )}
              {breakdown.fees?.filter((f: any) => f.paid).length > 0 && (
                <>
                  <Typography sx={subHead}>✓ Frais inclus</Typography>
                  {breakdown.fees.filter((f: any) => f.paid).map((f: any, i: number) => <Row key={i} label={f.name} value={formatPriceWithCurrency(f.amount, f.currency)} mono />)}
                </>
              )}
              <Divider sx={{ my: 1.25 }} />
              <Row label="Total payé par client"
                value={breakdown.totalPaidByCustomer ? formatPriceWithCurrency(breakdown.totalPaidByCustomer.amount, breakdown.totalPaidByCustomer.currency) : '—'}
                bold mono accent={T.info}
              />
            </SectionCard>
          )}
        </Box>

        {/* RIGHT */}
        <Box>
          {breakdown?.otaCommission && (
            <SectionCard title="💰 Commission & net reçu" accent={T.success}>
              <Row label="Prix client OTA"
                value={breakdown.totalPaidByCustomer ? formatPriceWithCurrency(breakdown.totalPaidByCustomer.amount, breakdown.totalPaidByCustomer.currency) : '—'} mono />
              <Box sx={{ textAlign: 'center', color: T.text4, fontSize: 16, py: 0.5 }}>−</Box>
              <Row label="Commission OTA" value={formatPriceWithCurrency(breakdown.otaCommission.amount, breakdown.otaCommission.currency)} bold mono accent={T.error} />
              <Box sx={{ textAlign: 'center', color: T.text4, fontSize: 16, py: 0.5 }}>=</Box>
              <Paper sx={{ p: 1.75, bgcolor: 'rgba(10,143,94,0.08)', border: `1px solid rgba(10,143,94,0.18)`, borderRadius: 1 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>Net reçu Sojori</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.success, fontFamily: '"Geist Mono", monospace' }}>
                    {formatPriceWithCurrency((breakdown.totalPaidByCustomer?.amount || 0) - (breakdown.otaCommission?.amount || 0), breakdown.otaCommission.currency)}
                  </Typography>
                </Stack>
              </Paper>

              {breakdown.otaCommission.currency !== r.currency && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Équivalent en {r.currency}
                  </Typography>
                  <Row label={`Net reçu (${r.currency})`} value={formatPriceOrPlaceholder(r.totalPrice, r.currency)} bold mono accent={T.success} />
                </>
              )}
            </SectionCard>
          )}

          {breakdown?.fees?.filter((f: any) => !f.paid).length > 0 && (
            <SectionCard title="⚠ Frais à payer en plus" accent={T.warning}>
              <Typography sx={{ fontSize: 11.5, color: T.warning, mb: 1 }}>
                Ces frais doivent être payés séparément par le client.
              </Typography>
              {breakdown.fees.filter((f: any) => !f.paid).map((f: any, i: number) => (
                <Row key={i} label={f.name} value={formatPriceWithCurrency(f.amount, f.currency)} bold mono />
              ))}
              <Divider sx={{ my: 1 }} />
              <Row label="Total à payer en plus"
                value={breakdown.totalPaidAtArrival ? formatPriceWithCurrency(breakdown.totalPaidAtArrival.amount, breakdown.totalPaidAtArrival.currency) : '—'}
                bold mono accent={T.warning}
              />
            </SectionCard>
          )}

          <SectionCard title="💳 Paiement">
            <Row label="Statut"     value={r.paymentStatus} bold />
            <Row label="Méthode"    value={r.paymentMethod} />
            <Row label="Type"       value={r.paymentType} />
            <Row label="Déjà payé"  value={formatPriceWithCurrency(r.alreadyPaid || 0, r.currency)} bold mono accent={T.success} />
            {r.paymentLink && (
              <Box sx={{ mt: 1, p: 1, bgcolor: T.bg2, borderRadius: 0.75 }}>
                <Typography sx={{ fontSize: 11, color: T.text3 }}>Lien de paiement disponible</Typography>
              </Box>
            )}
          </SectionCard>
        </Box>
      </Box>

      {/* Breakdown détaillé par jour */}
      {r.priceBreakdown && r.priceBreakdown.length > 0 && (
        <SectionCard title="📅 Breakdown prix par jour">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: T.bg2 }}>
                  {['Date', 'Prix base', 'Ajust. mois', 'Ajust. jour', 'Occupancy', 'Prix final'].map(h => (
                    <TableCell key={h} sx={cellHead}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {r.priceBreakdown.map((day: any, idx: number) => {
                  const c = day.calculatedPriceHistory || {};
                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={cellBody}>{moment(day.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell sx={{ ...cellBody, fontFamily: '"Geist Mono", monospace' }}>{c.base ?? '—'}</TableCell>
                      <TableCell sx={{ ...cellBody, fontFamily: '"Geist Mono", monospace', color: c.month > 0 ? T.success : T.text2 }}>{c.month ? `+${c.month}` : '—'}</TableCell>
                      <TableCell sx={{ ...cellBody, fontFamily: '"Geist Mono", monospace', color: c.weekday > 0 ? T.success : T.text2 }}>{c.weekday ? `+${c.weekday}` : '—'}</TableCell>
                      <TableCell sx={{ ...cellBody, fontFamily: '"Geist Mono", monospace', color: c.occupancy < 0 ? T.error : T.success }}>{c.occupancy ?? '—'}</TableCell>
                      <TableCell sx={{ ...cellBody, fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>{formatPriceWithCurrency(day.price, r.currency)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ bgcolor: T.bg2 }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: 13 }}>TOTAL</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13, fontFamily: '"Geist Mono", monospace' }}>
                    {formatPriceOrPlaceholder(r.sojoriPriceTotal || r.totalPrice, r.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      {r.notes && r.notes.toLowerCase().includes('payment') && (
        <SectionCard title="📝 Notes financières">
          <Box sx={{ p: 1.5, bgcolor: T.bg2, borderRadius: 1 }}>
            <Typography sx={{ fontSize: 12.5, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
              {r.notes}
            </Typography>
          </Box>
        </SectionCard>
      )}
    </Box>
  );
}

const subHead = { fontSize: 10.5, fontWeight: 700, color: T.text3, mt: 1.25, mb: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' as const };
const cellHead = { fontWeight: 700, fontSize: 10.75, color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase' as const };
const cellBody = { fontSize: 12.5, color: T.text2 };

export default FinancierTab;
