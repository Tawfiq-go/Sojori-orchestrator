// ════════════════════════════════════════════════════════════════════
// Sojori — FinancialSection (réservation)
// Cards résumé + table ventilation + actions (paiement, frais)
// ════════════════════════════════════════════════════════════════════
import {
  Box, Stack, Typography, Button, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.08)',
  success: '#10b981', successTint: 'rgba(16,185,129,0.10)',
  error: '#ef4444', errorTint: 'rgba(239,68,68,0.10)',
  warning: '#f59e0b',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export interface FinancialLine {
  id: string;
  label: string;
  qty?: number;
  unit?: string;
  unitPrice: number;
  total: number;
  category: 'base' | 'cleaning' | 'extra' | 'tax' | 'commission';
}

export interface Payment {
  id: string;
  method: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
}

interface Props {
  totalGuest?: number;
  commission?: number;
  netOwner?: number;
  currency?: string;
  lines?: FinancialLine[];
  payments?: Payment[];
  onAddPayment?: () => void;
  onAddCharge?: () => void;
}

const MOCK_LINES: FinancialLine[] = [
  { id: 'l1', label: 'Hébergement', qty: 7, unit: 'nuits', unitPrice: 220, total: 1540, category: 'base' },
  { id: 'l2', label: 'Frais ménage', unitPrice: 80, total: 80, category: 'cleaning' },
  { id: 'l3', label: 'Lit bébé', unitPrice: 25, total: 25, category: 'extra' },
  { id: 'l4', label: 'Petit-déjeuner', qty: 14, unit: 'pers/jour', unitPrice: 12, total: 168, category: 'extra' },
  { id: 'l5', label: 'Taxe de séjour', qty: 14, unit: 'pers/nuit', unitPrice: 2.50, total: 35, category: 'tax' },
];

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', method: 'Airbnb (versement OTA)', amount: 1546, status: 'paid', date: '2026-05-10' },
  { id: 'p2', method: 'Caution (Stripe)',       amount: 300,  status: 'pending', date: '2026-05-13' },
];

const CAT_META: Record<FinancialLine['category'], { label: string; color: string }> = {
  base:       { label: 'Hébergement',  color: T.primary },
  cleaning:   { label: 'Ménage',       color: T.success },
  extra:      { label: 'Extra',        color: T.warning },
  tax:        { label: 'Taxe',         color: T.text3 },
  commission: { label: 'Commission',   color: T.error },
};

export default function FinancialSection({
  totalGuest = 1848, commission = 277, netOwner = 1571, currency = '€',
  lines = MOCK_LINES, payments = MOCK_PAYMENTS,
  onAddPayment, onAddCharge,
}: Props) {
  return (
    <Stack spacing={2}>
      {/* Cards résumé */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        <SummaryCard label="Prix total guest" value={totalGuest} currency={currency} color={T.text} bg={T.bg1} />
        <SummaryCard label="Commission OTA" value={-commission} currency={currency} color={T.error} bg={T.errorTint} />
        <SummaryCard label="Net owner" value={netOwner} currency={currency} color={T.success} bg={T.successTint} highlight />
      </Box>

      {/* Table ventilation */}
      <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" spacing={2} sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700 }}>Ventilation des frais</Typography>
          <Button size="small" onClick={onAddCharge} sx={{ textTransform: 'none' }}>+ Ajouter frais</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: T.bg2 }}>
              <TableCell sx={cellHeadSx}>Libellé</TableCell>
              <TableCell sx={cellHeadSx}>Catégorie</TableCell>
              <TableCell sx={cellHeadSx} align="right">Qté</TableCell>
              <TableCell sx={cellHeadSx} align="right">PU</TableCell>
              <TableCell sx={cellHeadSx} align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map(l => {
              const meta = CAT_META[l.category];
              return (
                <TableRow key={l.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{l.label}</TableCell>
                  <TableCell><Chip size="small" label={meta.label} sx={{ height: 20, fontSize: 10.5, bgcolor: `${meta.color}15`, color: meta.color, fontWeight: 600 }} /></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Geist Mono', color: T.text3 }}>{l.qty ? `${l.qty} ${l.unit || ''}` : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Geist Mono' }}>{l.unitPrice.toFixed(2)} {currency}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'Geist Mono' }}>{l.total.toFixed(2)} {currency}</TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ bgcolor: T.primaryTint }}>
              <TableCell colSpan={4} sx={{ fontWeight: 700 }}>TOTAL HT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontFamily: 'Geist Mono', fontSize: 14 }}>
                {lines.reduce((sum, l) => sum + l.total, 0).toFixed(2)} {currency}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* Paiements */}
      <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700 }}>Paiements ({payments.length})</Typography>
          <Button size="small" variant="contained" onClick={onAddPayment} sx={{
            textTransform: 'none', fontWeight: 600,
            background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
            color: T.text,
            '&:hover': { background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
          }}>+ Ajouter paiement</Button>
        </Stack>
        <Stack divider={<Divider />}>
          {payments.map(p => {
            const color = p.status === 'paid' ? T.success : p.status === 'pending' ? T.warning : T.error;
            const label = p.status === 'paid' ? '✓ Payé' : p.status === 'pending' ? '⏳ En attente' : '✕ Échec';
            return (
              <Stack key={p.id} direction="row" spacing={2} sx={{ px: 2.5, py: 1.5, alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{p.method}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.text3, fontFamily: 'Geist Mono' }}>
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
                <Chip size="small" label={label} sx={{ bgcolor: `${color}15`, color, fontWeight: 600, fontSize: 10.5 }} />
                <Typography sx={{ fontWeight: 700, fontFamily: 'Geist Mono', minWidth: 80, textAlign: 'right' }}>
                  {p.amount.toFixed(2)} {currency}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}

function SummaryCard({ label, value, currency, color, bg, highlight }: { label: string; value: number; currency: string; color: string; bg: string; highlight?: boolean }) {
  return (
    <Box sx={{
      p: 2, bgcolor: bg, border: '1px solid', borderColor: highlight ? color : T.border,
      borderRadius: 2, boxShadow: highlight ? `0 4px 12px ${color}25` : 'none',
    }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'Geist Mono', letterSpacing: '-0.6px', color, mt: 0.5 }}>
        {value < 0 ? '−' : ''}{Math.abs(value).toFixed(2)} {currency}
      </Typography>
    </Box>
  );
}

const cellHeadSx = {
  fontSize: 10.5, fontWeight: 700, color: T.text3,
  letterSpacing: 0.5, textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${T.border}`,
};
