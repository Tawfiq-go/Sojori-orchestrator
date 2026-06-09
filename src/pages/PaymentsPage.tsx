import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/fr';
import { DashboardWrapper } from '../components/DashboardWrapper';
import paymentsService, { type PaymentAuditRow } from '../services/paymentsService';
import {
  getCachedPaymentsList,
  invalidatePaymentsListCache,
  paymentsCacheKey,
  setCachedPaymentsList,
} from '../utils/paymentsListCache';

moment.locale('fr');

const PAGE_SIZE = 50;

const T = {
  primary: '#b8851a',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  text: '#14110a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
};

function paymentStatusChip(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') {
    return { label: 'Payé', color: T.success, bg: 'rgba(10,143,94,0.12)' };
  }
  return { label: 'Non payé', color: T.warning, bg: 'rgba(196,101,6,0.12)' };
}

function copyText(value: string) {
  if (!value) return;
  void navigator.clipboard.writeText(value);
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: 1,
        fontSize: 11,
        overflow: 'auto',
        maxHeight: 280,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

function DetailGrid({ row }: { row: PaymentAuditRow }) {
  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'idDemande', value: row.naps.idDemande },
    { label: 'token', value: row.naps.token },
    { label: 'signature', value: row.naps.signature },
    { label: 'idcommande', value: row.naps.idcommande },
    { label: 'numTrans', value: row.naps.numTrans },
    { label: 'numAuto', value: row.naps.numAuto },
    { label: 'repauto', value: row.naps.repauto },
    { label: 'repauto message', value: row.naps.repautoMessage },
    { label: 'carte', value: row.naps.carte },
    { label: 'type carte', value: row.naps.typecarte },
    { label: 'montant NAPS', value: row.naps.montant },
    { label: 'Lien paiement', value: row.payment.link },
    { label: 'Return base (vente)', value: row.payment.returnBase },
    { label: 'Redirect success hit', value: row.payment.redirectSuccess ? 'oui' : 'non' },
    { label: 'Redirect fail hit', value: row.payment.redirectFail ? 'oui' : 'non' },
    { label: 'Méthode', value: row.payment.method },
    { label: 'Type', value: row.payment.type },
    { label: 'Email', value: row.guestEmail },
    { label: 'Téléphone', value: row.phone },
  ];

  return (
    <Stack spacing={2} sx={{ p: 2, bgcolor: T.bg0, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Détail NAPS & paiement
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 1,
        }}
      >
        {fields.map((f) => (
          <Box
            key={f.label}
            sx={{
              p: 1,
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: 1,
            }}
          >
            <Typography sx={{ fontSize: 10, color: T.text3, textTransform: 'uppercase' }}>
              {f.label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {f.value || '—'}
              </Typography>
              {f.value ? (
                <Tooltip title="Copier">
                  <IconButton size="small" onClick={() => copyText(String(f.value))}>
                    <CopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Box>
        ))}
      </Box>

      {row.naps.lastError ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: T.error }}>
            Dernière erreur NAPS
          </Typography>
          <JsonBlock value={row.naps.lastError} />
        </>
      ) : null}

      {row.naps.payload ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            napsPayload (callback)
          </Typography>
          <JsonBlock value={row.naps.payload} />
        </>
      ) : null}

      {row.naps.events?.length ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Historique napsPaymentEvents ({row.naps.events.length})
          </Typography>
          <JsonBlock value={row.naps.events} />
        </>
      ) : null}

      {row.paymentStatusTimes?.length ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            paymentStatusTimes
          </Typography>
          <JsonBlock value={row.paymentStatusTimes} />
        </>
      ) : null}
    </Stack>
  );
}

export function PaymentsPage() {
  const navigate = useNavigate();
  const initialCacheKey = paymentsCacheKey({
    page: 0,
    paymentStatus: 'UnPaid,Paid',
    cardOnly: true,
    search: '',
  });
  const initialCache = getCachedPaymentsList(initialCacheKey);

  const [rows, setRows] = useState<PaymentAuditRow[]>(() => initialCache?.rows ?? []);
  const [total, setTotal] = useState(() => initialCache?.total ?? 0);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableReady, setTableReady] = useState(() => Boolean(initialCache));
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('UnPaid,Paid');
  const [cardOnly, setCardOnly] = useState(true);
  const [page, setPage] = useState(0);
  const loadRequestIdRef = useRef(0);

  const queryKey = useMemo(
    () =>
      paymentsCacheKey({
        page,
        paymentStatus,
        cardOnly,
        search: appliedSearch,
      }),
    [page, paymentStatus, cardOnly, appliedSearch],
  );

  const loadDetail = useCallback(async (row: PaymentAuditRow) => {
    try {
      const detail = await paymentsService.getDetail(row._id);
      if (detail) {
        setRows((prev) => prev.map((r) => (r._id === row._id ? detail : r)));
      }
    } catch {
      /* keep list row */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedPaymentsList(queryKey);
    const isBootstrap = !cached;

    if (cached) {
      setRows(cached.rows);
      setTotal(cached.total);
      setTableReady(true);
    } else {
      setIsLoading(true);
      setTableReady(false);
    }

    const requestId = ++loadRequestIdRef.current;
    if (!isBootstrap) setIsRefreshing(true);
    setError(null);

    void (async () => {
      try {
        const res = await paymentsService.getList({
          page,
          limit: PAGE_SIZE,
          paymentStatus,
          reservationNumber: appliedSearch.trim() || undefined,
          cardOnly,
        });
        if (cancelled || requestId !== loadRequestIdRef.current) return;
        if (!res.success) throw new Error('API error');
        setRows(res.data || []);
        setTotal(res.total || 0);
        setCachedPaymentsList(queryKey, res.data || [], res.total || 0);
        setTableReady(true);
      } catch (e) {
        if (cancelled || requestId !== loadRequestIdRef.current) return;
        if (isBootstrap) {
          setRows([]);
          setTotal(0);
        }
        setError(e instanceof Error ? e.message : 'Impossible de charger les paiements');
        if (isBootstrap) setTableReady(true);
      } finally {
        if (!cancelled && requestId === loadRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryKey, page, paymentStatus, appliedSearch, cardOnly]);

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim());
    setPage(0);
  };

  const handleRefresh = () => {
    invalidatePaymentsListCache();
    const requestId = ++loadRequestIdRef.current;
    setIsRefreshing(true);
    setError(null);
    void (async () => {
      try {
        const res = await paymentsService.getList({
          page,
          limit: PAGE_SIZE,
          paymentStatus,
          reservationNumber: appliedSearch.trim() || undefined,
          cardOnly,
        });
        if (requestId !== loadRequestIdRef.current) return;
        if (!res.success) throw new Error('API error');
        setRows(res.data || []);
        setTotal(res.total || 0);
        setCachedPaymentsList(queryKey, res.data || [], res.total || 0);
      } catch (e) {
        if (requestId !== loadRequestIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger les paiements');
      } finally {
        if (requestId === loadRequestIdRef.current) setIsRefreshing(false);
      }
    })();
  };

  const stats = useMemo(() => {
    const unpaid = rows.filter((r) => (r.payment.status || '').toLowerCase() !== 'paid').length;
    const withError = rows.filter((r) => r.naps.lastError).length;
    const withEvents = rows.filter(
      (r) => (r.naps.eventsCount ?? r.naps.events?.length ?? 0) > 0,
    ).length;
    return { unpaid, withError, withEvents };
  }, [rows]);

  const showBlockingSpinner = isLoading && !tableReady;

  return (
    <DashboardWrapper>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: T.bg0, minHeight: '100vh' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ mb: 3, justifyContent: 'space-between', alignItems: { md: 'center' } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: T.text }}>
              Paiements NAPS
            </Typography>
            <Typography sx={{ color: T.text3, fontSize: 14 }}>
              Audit complet : idDemande, token, callbacks, erreurs ACS/3DS
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`${total} total`} size="small" />
            <Chip label={`${stats.unpaid} non payés (page)`} size="small" color="warning" variant="outlined" />
            <Chip label={`${stats.withError} erreurs (page)`} size="small" color="error" variant="outlined" />
            <Button startIcon={<RefreshIcon />} onClick={handleRefresh} variant="outlined" size="small">
              Actualiser
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2, mb: 2, border: `1px solid ${T.border}` }} elevation={0}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              size="small"
              placeholder="N° réservation SJ-…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="UnPaid,Paid">Tous statuts</MenuItem>
                <MenuItem value="UnPaid">UnPaid seulement</MenuItem>
                <MenuItem value="Paid">Paid seulement</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={cardOnly ? 'card' : 'all'}
                onChange={(e) => {
                  setCardOnly(e.target.value === 'card');
                  setPage(0);
                }}
              >
                <MenuItem value="card">Carte / NAPS uniquement</MenuItem>
                <MenuItem value="all">Toutes réservations</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={applyFilters} sx={{ bgcolor: T.primary }}>
              Filtrer
            </Button>
          </Stack>
        </Paper>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {isLoading && !tableReady && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={40} sx={{ color: T.primary }} />
          </Box>
        )}

        {tableReady && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: `1px solid ${T.border}`, position: 'relative', opacity: isRefreshing ? 0.92 : 1 }}
        >
          {isRefreshing && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 10,
                bgcolor: 'rgba(184,133,26,0.92)',
                color: '#fff',
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CircularProgress size={14} sx={{ color: '#fff' }} />
              Mise à jour…
            </Box>
          )}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafaf7' }}>
                  <TableCell width={40} />
                  <TableCell>Réservation</TableCell>
                  <TableCell>Voyageur / Bien</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>idDemande</TableCell>
                  <TableCell>repauto</TableCell>
                  <TableCell>Events</TableCell>
                  <TableCell>Créé</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: T.text3 }}>
                      Aucun paiement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const ps = paymentStatusChip(row.payment.status);
                    const open = expandedId === row._id;
                    return (
                      <Fragment key={row._id}>
                        <TableRow hover sx={{ '& > *': { borderBottom: open ? 0 : undefined } }}>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const next = open ? null : row._id;
                                setExpandedId(next);
                                if (!open) void loadDetail(row);
                              }}
                            >
                              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                              {row.reservationNumber}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: T.text3 }}>{row.channelName || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13 }}>{row.guestName}</Typography>
                            <Typography sx={{ fontSize: 11, color: T.text3 }}>
                              {row.listing?.name || '—'}
                              {row.listing?.city ? ` · ${row.listing.city}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>
                              {row.pricing.total} {row.pricing.currency}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ps.label}
                              size="small"
                              sx={{ bgcolor: ps.bg, color: ps.color, fontWeight: 700, fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {row.naps.idDemande || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                color: row.naps.repauto === '00' ? T.success : row.naps.repauto ? T.error : T.text3,
                              }}
                            >
                              {row.naps.repauto ||
                                (row.naps.lastError?.repauto as string | undefined) ||
                                '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{row.naps.eventsCount ?? row.naps.events?.length ?? 0}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 12 }}>
                              {moment(row.dates.createdAt).format('DD MMM YY HH:mm')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              <Tooltip title="Voir réservation">
                                <IconButton size="small" onClick={() => navigate(`/reservations/${row._id}`)}>
                                  <OpenIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {row.payment.link ? (
                                <Tooltip title="Ouvrir lien NAPS">
                                  <IconButton
                                    size="small"
                                    component={Link}
                                    href={row.payment.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <OpenIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                              ) : null}
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={10} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
                            <Collapse in={open} timeout="auto" unmountOnExit>
                              <DetailGrid row={row} />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
        </TableContainer>
        )}

        {tableReady && total > PAGE_SIZE ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center', alignItems: 'center' }}>
            <Button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Précédent
            </Button>
            <Typography sx={{ alignSelf: 'center', fontSize: 13 }}>
              Page {page + 1} · {total} paiements
            </Typography>
            <Button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </Stack>
        ) : null}
      </Box>
    </DashboardWrapper>
  );
}

export default PaymentsPage;
