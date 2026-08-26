import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { toast } from 'react-toastify';
import { dashboardTokens as T } from '../../design/sojoriBrandTokens';
import { useWriteAccess } from '../../hooks/useWriteAccess';
import {
  fetchMinibarExtras,
  patchMinibarExtra,
  type MinibarPaymentType,
  type MinibarStayExtra,
} from './minibarApi';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const fmtMoney = (n: number, currency = 'MAD') => {
  const v = Number(n) || 0;
  const frac = Math.abs(v % 1) > 0.001 ? 2 : 0;
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: frac, maximumFractionDigits: 2 })} ${currency}`;
};

const PAYMENT_TYPE_LABEL: Record<MinibarPaymentType, string> = {
  reception: 'Réception WA',
  especes: 'Espèces',
  cb: 'Carte',
  virement: 'Virement',
  autre: 'Autre',
};

function loadErr(e: unknown) {
  toast.error(e instanceof Error ? e.message : 'Chargement impossible');
}

function ExtraChip({ extra }: { extra: MinibarStayExtra }) {
  const open = extra.extraStatus === 'open';
  return (
    <Chip
      size="small"
      label={open ? 'Ouvert' : 'Séjour terminé'}
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 700,
        bgcolor: open ? 'rgba(79,70,229,0.14)' : 'rgba(71,85,105,0.14)',
        color: open ? '#4338CA' : '#475569',
      }}
    />
  );
}

function PayChip({ extra }: { extra: MinibarStayExtra }) {
  const paid = extra.paymentStatus === 'paid';
  return (
    <Chip
      size="small"
      label={paid ? 'Payé' : 'Non payé'}
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 700,
        bgcolor: paid ? T.successTint : T.errorTint,
        color: paid ? T.success : T.error,
      }}
    />
  );
}

const HEADERS = [
  'Villa',
  'Client',
  'Extra',
  'Paiement',
  'Type',
  'Items',
  'HT',
  'TVA',
  'TTC',
  'Reste',
  'Staff',
  'Ouvert',
  '',
] as const;
const COL_W = [110, 140, 118, 92, 110, 52, 88, 80, 88, 80, 130, 118, 44] as const;

const Kpi = ({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <Paper
    onClick={onClick}
    sx={{
      px: 1.25,
      py: 0.75,
      minWidth: 78,
      border: `1px solid ${active ? accent : T.border}`,
      borderRadius: 1,
      bgcolor: active ? `${accent}14` : T.bg1,
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { bgcolor: T.bg2, borderColor: accent } : {},
    }}
  >
    <Typography sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.15 }}>{value}</Typography>
  </Paper>
);

const Pill = ({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      textTransform: 'none',
      fontSize: 12,
      fontWeight: 600,
      px: 1.25,
      py: 0.5,
      minHeight: 28,
      borderRadius: 999,
      border: '1px solid',
      borderColor: active ? color : T.border,
      bgcolor: active ? `${color}18` : T.bg1,
      color: active ? color : T.text2,
    }}
  >
    {label}
    <Box
      component="span"
      sx={{
        ml: 0.75,
        fontSize: 10.5,
        fontWeight: 700,
        bgcolor: active ? `${color}28` : T.bg3,
        color: active ? color : T.text3,
        borderRadius: 999,
        px: 0.75,
        py: 0.25,
      }}
    >
      {count}
    </Box>
  </Button>
);

export function MinibarExtrasTable() {
  const { canWrite, user } = useWriteAccess();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'dashboard';

  const [rows, setRows] = useState<MinibarStayExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [extraFilter, setExtraFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'not_paid'>('all');
  const [selected, setSelected] = useState<MinibarStayExtra | null>(null);
  const [busy, setBusy] = useState(false);
  const [payType, setPayType] = useState<MinibarPaymentType>('especes');

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchMinibarExtras({ status: 'all', limit: 500 }));
    } catch (e) {
      loadErr(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) setPayType(selected.paymentType && selected.paymentType !== 'reception' ? selected.paymentType : 'especes');
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((e) => {
      if (extraFilter !== 'all' && e.extraStatus !== extraFilter) return false;
      if (payFilter !== 'all' && e.paymentStatus !== payFilter) return false;
      if (!q) return true;
      const hay = [
        e.roomName,
        e.roomId,
        e.guestName,
        e.reservationCode,
        e.reservationId,
        e.staff.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, extraFilter, payFilter]);

  const kpis = useMemo(() => {
    const open = rows.filter((e) => e.extraStatus === 'open').length;
    const completed = rows.filter((e) => e.extraStatus === 'completed').length;
    const unpaid = rows.filter((e) => e.paymentStatus === 'not_paid').length;
    const paid = rows.filter((e) => e.paymentStatus === 'paid').length;
    const remaining = rows.reduce((n, e) => n + (e.remaining || 0), 0);
    const ttc = rows.reduce((n, e) => n + (e.totalToBill || 0), 0);
    return { open, completed, unpaid, paid, remaining, ttc };
  }, [rows]);

  const applyPatch = async (extra: MinibarStayExtra, body: Parameters<typeof patchMinibarExtra>[1]) => {
    if (!extra._id) {
      toast.error('Extra sans identifiant — recharger la page.');
      return;
    }
    setBusy(true);
    try {
      const next = await patchMinibarExtra(extra._id, { ...body, validatedBy: actor });
      setRows((prev) => prev.map((r) => (r._id === next._id ? next : r)));
      setSelected(next);
      toast.success('Extra mis à jour');
    } catch (e) {
      loadErr(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Paper sx={{ p: 1.25, mb: 1.5, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Villa, client, staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1, maxWidth: 320, '& .MuiOutlinedInput-root': { height: 32, fontSize: 13 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Actualiser">
            <IconButton size="small" onClick={() => void load()} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Chargement…' : `${filtered.length} extra${filtered.length > 1 ? 's' : ''}`}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ mt: 1.25, gap: 0.75, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            <Pill label="Tous" count={rows.length} active={extraFilter === 'all' && payFilter === 'all'} color={T.text2} onClick={() => { setExtraFilter('all'); setPayFilter('all'); }} />
            <Pill label="Ouverts" count={kpis.open} active={extraFilter === 'open'} color="#4338CA" onClick={() => setExtraFilter((s) => (s === 'open' ? 'all' : 'open'))} />
            <Pill label="Séjour terminé" count={kpis.completed} active={extraFilter === 'completed'} color="#475569" onClick={() => setExtraFilter((s) => (s === 'completed' ? 'all' : 'completed'))} />
            <Pill label="Impayés" count={kpis.unpaid} active={payFilter === 'not_paid'} color={T.error} onClick={() => setPayFilter((s) => (s === 'not_paid' ? 'all' : 'not_paid'))} />
            <Pill label="Payés" count={kpis.paid} active={payFilter === 'paid'} color={T.success} onClick={() => setPayFilter((s) => (s === 'paid' ? 'all' : 'paid'))} />
          </Stack>
          <Stack direction="row" sx={{ gap: 0.75 }}>
            <Kpi label="Impayés" value={kpis.unpaid} accent={T.error} active={payFilter === 'not_paid'} onClick={() => setPayFilter((s) => (s === 'not_paid' ? 'all' : 'not_paid'))} />
            <Kpi label="Reste" value={fmtMoney(kpis.remaining)} accent={T.warning} />
            <Kpi label="TTC" value={fmtMoney(kpis.ttc)} accent={T.text} />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ overflow: 'auto', maxHeight: '68vh', border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1 }}>
        <Table size="small" stickyHeader sx={{ minWidth: COL_W.reduce((a, b) => a + b, 0), tableLayout: 'fixed' }}>
          <colgroup>
            {COL_W.map((w, i) => (
              <col key={HEADERS[i] || i} style={{ width: w }} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              {HEADERS.map((h) => (
                <TableCell
                  key={h || 'act'}
                  align={['Items', 'HT', 'TVA', 'TTC', 'Reste'].includes(h) ? 'right' : 'left'}
                  sx={{ fontSize: 11, fontWeight: 700, color: T.text3, bgcolor: T.bg2, whiteSpace: 'nowrap' }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((e) => (
              <TableRow
                key={e._id || `${e.reservationId}-${e.openedAt}`}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => setSelected(e)}
              >
                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>{e.roomName || e.roomId}</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{e.guestName || '—'}</Typography>
                  {e.reservationCode ? (
                    <Typography sx={{ fontSize: 10.5, color: T.text3 }}>{e.reservationCode}</Typography>
                  ) : null}
                </TableCell>
                <TableCell><ExtraChip extra={e} /></TableCell>
                <TableCell><PayChip extra={e} /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {e.paymentStatus === 'paid' && e.paymentType ? PAYMENT_TYPE_LABEL[e.paymentType] : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{e.itemsCount}</TableCell>
                <TableCell align="right">{fmtMoney(e.htAmount, e.currency)}</TableCell>
                <TableCell align="right">{fmtMoney(e.vatAmount, e.currency)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(e.totalToBill, e.currency)}</TableCell>
                <TableCell align="right" sx={{ color: e.remaining > 0 ? T.error : T.text3, fontWeight: 600 }}>
                  {fmtMoney(e.remaining, e.currency)}
                </TableCell>
                <TableCell sx={{ fontSize: 11.5, color: T.text2 }}>{e.staff.length ? e.staff.join(' · ') : '—'}</TableCell>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.openedAt)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}>
                    <VisibilityIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && filtered.length === 0 ? (
          <Typography sx={{ p: 3, color: T.text3, fontSize: 13 }}>Aucun extra sur ces filtres.</Typography>
        ) : null}
      </Box>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 2.5 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              {selected.roomName || selected.roomId}
            </Typography>
            <Typography sx={{ fontSize: 13, color: T.text2, mb: 2 }}>
              {selected.guestName || 'Client'}
              {selected.reservationCode ? ` · ${selected.reservationCode}` : ''}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <ExtraChip extra={selected} />
              <PayChip extra={selected} />
            </Stack>

            <Stack spacing={1.25} sx={{ mb: 2.5 }}>
              {[
                ['Items', `${selected.itemsCount} (${selected.linesCount} ligne${selected.linesCount > 1 ? 's' : ''})`],
                ['HT', fmtMoney(selected.htAmount, selected.currency)],
                [`TVA ${selected.taxRatePct} %`, fmtMoney(selected.vatAmount, selected.currency)],
                ['Total TTC', fmtMoney(selected.totalToBill, selected.currency)],
                ['Payé', fmtMoney(selected.paidAmount, selected.currency)],
                ['Reste', fmtMoney(selected.remaining, selected.currency)],
                ['Staff', selected.staff.length ? selected.staff.join(' · ') : '—'],
                ['Ouvert', fmtDate(selected.openedAt)],
                ['Séjour terminé', selected.closedAt ? fmtDate(selected.closedAt) : '—'],
                ['Encaissé par', selected.invoiceValidatedBy || '—'],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5 }}>{value}</Typography>
                </Box>
              ))}
            </Stack>

            {canWrite ? (
              <Stack spacing={1.25} sx={{ mb: 2.5, p: 1.5, border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
                  Contrôle
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={selected.extraStatus === 'open' ? 'contained' : 'outlined'}
                    disabled={busy || selected.extraStatus === 'open'}
                    onClick={() => void applyPatch(selected, { extraStatus: 'open' })}
                    sx={{ textTransform: 'none' }}
                  >
                    Extra ouvert
                  </Button>
                  <Button
                    size="small"
                    variant={selected.extraStatus === 'completed' ? 'contained' : 'outlined'}
                    disabled={busy || selected.extraStatus === 'completed'}
                    onClick={() => void applyPatch(selected, { extraStatus: 'completed' })}
                    sx={{ textTransform: 'none' }}
                  >
                    Séjour terminé
                  </Button>
                </Stack>
                <FormControl size="small" fullWidth>
                  <Select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as MinibarPaymentType)}
                  >
                    {(['especes', 'cb', 'virement', 'reception', 'autre'] as const).map((t) => (
                      <MenuItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy || selected.paymentStatus === 'paid'}
                    onClick={() => void applyPatch(selected, { paymentStatus: 'paid', paymentType: payType })}
                    sx={{ textTransform: 'none' }}
                  >
                    Marquer payé
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={busy || selected.paymentStatus === 'not_paid'}
                    onClick={() => void applyPatch(selected, { paymentStatus: 'not_paid' })}
                    sx={{ textTransform: 'none' }}
                  >
                    Marquer non payé
                  </Button>
                </Stack>
              </Stack>
            ) : null}

            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', mb: 1 }}>
              Articles
            </Typography>
            {selected.lines.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: T.text3 }}>Aucune consommation.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell align="right">Qté</TableCell>
                    <TableCell align="right">PU</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell>Par</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.lines.map((l, i) => (
                    <TableRow key={`${l.productId}-${i}`}>
                      <TableCell>{l.productName}</TableCell>
                      <TableCell align="right">{l.qty}</TableCell>
                      <TableCell align="right">{fmtMoney(l.unitPrice, selected.currency)}</TableCell>
                      <TableCell align="right">{fmtMoney(l.amount, selected.currency)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {l.declaredBy || '—'}
                          {l.declaredAt ? ` · ${fmtDate(l.declaredAt)}` : ''}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        ) : null}
      </Drawer>
    </>
  );
}
