import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Inbox as InboxIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import moment from 'moment';
import 'moment/locale/fr';
import { useNavigate } from 'react-router-dom';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import listingsService from '../../services/listingsService';
import { CHATBOT_T as T } from './chatbotTokens';
import WhatsappConfigCell from './WhatsappConfigCell';
import WhitelistLanguageCell from './WhitelistLanguageCell';
import {
  interpretMenuOptionsForStay,
  type GuestContextLike,
  type MenuOptionLike,
  type MenuOptionInterpretation,
} from './whatsappMenuAvailability';

moment.locale('fr');

export type WhitelistRow = {
  reservationId: string;
  listingId?: string;
  reservationCode?: string;
  guestName?: string;
  phoneOta?: string;
  guestLanguage?: string;
  whatsappSelectedLanguage?: string | null;
  status?: string;
  hasCommunicated?: boolean;
  checkIn?: string;
  checkOut?: Date | string;
  adults?: number;
  createdAt?: string | Date;
};

type QuickFilter = 'contacted' | 'pending' | 'cancelled' | 'arr7' | null;

function isCancelled(status?: string) {
  return String(status ?? '').toLowerCase().includes('cancel');
}

function waMeta(row: WhitelistRow) {
  if (isCancelled(row.status)) {
    return { label: 'Annulée', bg: 'rgba(200,30,30,0.10)', color: T.error };
  }
  if (row.hasCommunicated) {
    return { label: 'Contacté', bg: 'rgba(10,143,94,0.12)', color: T.success };
  }
  return { label: 'En attente', bg: 'rgba(196,101,6,0.12)', color: T.warning };
}

function formatCreatedAt(value?: string | Date | null) {
  if (!value) return '—';
  const m = moment(value);
  return m.isValid() ? m.format('DD MMM YY HH:mm:ss') : '—';
}

function statusMeta(status?: string) {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('cancel')) return { label: 'Annulé', bg: 'rgba(200,30,30,0.10)', color: T.error };
  if (s === 'confirmed') return { label: 'Confirmé', bg: 'rgba(10,143,94,0.12)', color: T.success };
  return { label: status || '—', bg: 'rgba(20,17,10,0.05)', color: T.text3 };
}

export default function ChatbotWhitelistView() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [page, setPage] = useState(0);
  const limit = 50;
  const [listingNames, setListingNames] = useState<Record<string, string>>({});
  const [menuByListing, setMenuByListing] = useState<Record<string, MenuOptionLike[]>>({});
  const [guestCtxByResa, setGuestCtxByResa] = useState<Record<string, GuestContextLike>>({});
  const [enrichingMenus, setEnrichingMenus] = useState(false);
  const [enrichingCtx, setEnrichingCtx] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fullchatbotApi.listWhitelist({ limit: 500 });
      const data = Array.isArray(res?.data) ? (res.data as WhitelistRow[]) : [];
      setRows(data);

      const nameMap: Record<string, string> = {};
      try {
        const snapList = await fullchatbotApi.listListingSnapshots({ limit: 500, activeOnly: 'true' });
        const items = Array.isArray(snapList?.data) ? snapList.data : [];
        for (const row of items as Array<{ listingId?: string; name?: string }>) {
          if (row.listingId && row.name) nameMap[row.listingId] = row.name;
        }
      } catch {
        // fallback listings service
      }

      const uniqueListingIds = [...new Set(data.map((r) => r.listingId).filter(Boolean))] as string[];
      const stillMissing = uniqueListingIds.filter((id) => !nameMap[id]);
      if (stillMissing.length > 0) {
        try {
          const listingsRes = await listingsService.getListings({ limit: 1000, useActiveFilter: true, active: true });
          for (const l of listingsRes.data.items) {
            if (l.id && l.name) nameMap[l.id] = l.name;
          }
        } catch {
          // ignore
        }
      }
      setListingNames(nameMap);

      setEnrichingMenus(true);
      const menuMap: Record<string, MenuOptionLike[]> = {};
      const chunkSize = 8;
      for (let i = 0; i < uniqueListingIds.length; i += chunkSize) {
        const chunk = uniqueListingIds.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (listingId) => {
            try {
              const snapRes = await fullchatbotApi.getListingSnapshot(listingId);
              const snap = snapRes?.data as { menu?: { menuOptions?: MenuOptionLike[] } } | null;
              const opts = snap?.menu?.menuOptions;
              if (Array.isArray(opts)) menuMap[listingId] = opts;
            } catch {
              menuMap[listingId] = [];
            }
          }),
        );
      }
      setMenuByListing(menuMap);
      setEnrichingMenus(false);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const now = moment();
    const in7 = moment().add(7, 'days');

    return rows.filter((r) => {
      if (quickFilter !== 'cancelled' && isCancelled(r.status)) return false;
      if (quickFilter === 'contacted' && !r.hasCommunicated) return false;
      if (quickFilter === 'pending' && (r.hasCommunicated || isCancelled(r.status))) return false;
      if (quickFilter === 'cancelled' && !isCancelled(r.status)) return false;
      if (quickFilter === 'arr7') {
        const arr = moment(r.checkIn);
        if (!arr.isValid() || !arr.isBetween(now, in7, 'day', '[]')) return false;
      }
      if (!needle) return true;
      const listingName = r.listingId ? listingNames[r.listingId] : '';
      return [r.guestName, r.reservationCode, r.phoneOta, r.reservationId, r.listingId, listingName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, search, quickFilter, listingNames]);

  const paged = filtered.slice(page * limit, (page + 1) * limit);

  useEffect(() => {
    if (!paged.length) return;
    let cancelled = false;
    setEnrichingCtx(true);

    void (async () => {
      const chunkSize = 6;
      const next: Record<string, GuestContextLike> = { ...guestCtxByResa };
      for (let i = 0; i < paged.length; i += chunkSize) {
        const chunk = paged.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (row) => {
            if (next[row.reservationId]) return;
            try {
              const detail = await fullchatbotApi.getWhitelistDetail(row.reservationId);
              const gc = detail?.data?.guestContext as GuestContextLike | null | undefined;
              if (gc) next[row.reservationId] = gc;
            } catch {
              // ignore
            }
          }),
        );
        if (cancelled) return;
      }
      if (!cancelled) {
        setGuestCtxByResa(next);
        setEnrichingCtx(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharge contexte page visible uniquement
  }, [page, filtered.length, paged.map((r) => r.reservationId).join('|')]);

  const waInterpretByResa = useMemo(() => {
    const out: Record<string, { options: MenuOptionInterpretation[]; hasConfig: boolean }> = {};
    for (const row of paged) {
      const menu = row.listingId ? menuByListing[row.listingId] : undefined;
      const gc = guestCtxByResa[row.reservationId];
      out[row.reservationId] = interpretMenuOptionsForStay(menu || [], row.checkIn, row.checkOut, gc);
    }
    return out;
  }, [paged, menuByListing, guestCtxByResa]);

  const kpis = useMemo(() => {
    const contacted = rows.filter((r) => r.hasCommunicated && !isCancelled(r.status)).length;
    const pending = rows.filter((r) => !r.hasCommunicated && !isCancelled(r.status)).length;
    const cancelled = rows.filter((r) => isCancelled(r.status)).length;
    const arr7 = rows.filter((r) => {
      const arr = moment(r.checkIn);
      return arr.isValid() && arr.isBetween(moment(), moment().add(7, 'days'), 'day', '[]');
    }).length;
    return { total: rows.length, contacted, pending, cancelled, arr7 };
  }, [rows]);

  const toggleQuick = (key: QuickFilter) => {
    setQuickFilter((prev) => (prev === key ? null : key));
    setPage(0);
  };

  const handleReset = () => {
    setSearch('');
    setQuickFilter(null);
    setPage(0);
  };

  const openDetail = (reservationId: string) => {
    navigate(`/chatbot/whitelist/${encodeURIComponent(reservationId)}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Rechercher voyageur, SJ, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 180, maxWidth: 360 }}
          />
          <Tooltip title="Actualiser">
            <IconButton size="small" onClick={load}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack
          direction="row"
          sx={{ mt: 1.5, gap: 0.75, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            <FilterPill label="Contactées" count={kpis.contacted} active={quickFilter === 'contacted'} color={T.success} onClick={() => toggleQuick('contacted')} />
            <FilterPill label="En attente" count={kpis.pending} active={quickFilter === 'pending'} color={T.warning} onClick={() => toggleQuick('pending')} />
            <FilterPill label="Annulées" count={kpis.cancelled} active={quickFilter === 'cancelled'} color={T.error} onClick={() => toggleQuick('cancelled')} />
            <FilterPill label="Arr. 7 j" count={kpis.arr7} active={quickFilter === 'arr7'} color={T.info} onClick={() => toggleQuick('arr7')} />
          </Stack>
          <Stack direction="row" sx={{ gap: 0.75 }}>
            <KpiCompact label="Total" value={kpis.total} accent={T.primary} />
            <KpiCompact label="Contactées" value={kpis.contacted} accent={T.success} onClick={() => toggleQuick('contacted')} />
            <KpiCompact label="En attente" value={kpis.pending} accent={T.warning} onClick={() => toggleQuick('pending')} />
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} sx={{ color: T.primary }} />
        </Box>
      )}

      {!loading && !isMobile && paged.length > 0 && (
        <WhitelistTable
          rows={paged}
          listingNames={listingNames}
          waInterpretByResa={waInterpretByResa}
          waLoading={enrichingMenus || enrichingCtx}
          onOpen={openDetail}
        />
      )}

      {!loading && isMobile && paged.length > 0 && (
        <Stack spacing={1.25}>
          {paged.map((r) => (
            <WhitelistMobileCard
              key={r.reservationId}
              row={r}
              listingName={r.listingId ? listingNames[r.listingId] : undefined}
              waInterpret={waInterpretByResa[r.reservationId]}
              waLoading={enrichingMenus || enrichingCtx}
              onOpen={() => openDetail(r.reservationId)}
            />
          ))}
        </Stack>
      )}

      {!loading && filtered.length === 0 && (
        <Paper sx={{ textAlign: 'center', py: 8, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
          <InboxIcon sx={{ fontSize: 64, color: T.text4, mb: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: T.text2 }}>Aucune entrée whitelist</Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
            Les réservations apparaissent après <code>create.reservation</code>.
          </Typography>
          <Button onClick={handleReset} variant="text" sx={{ mt: 2, textTransform: 'none', color: T.primaryDeep }}>
            ↻ Réinitialiser
          </Button>
        </Paper>
      )}

      {!loading && filtered.length > 0 && (
        <Stack direction="row" sx={{ mt: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
            {page * limit + 1}–{Math.min((page + 1) * limit, filtered.length)} sur {filtered.length}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)} sx={{ textTransform: 'none' }}>
              ← Précédent
            </Button>
            <Button
              size="small"
              disabled={(page + 1) * limit >= filtered.length}
              onClick={() => setPage(page + 1)}
              sx={{ textTransform: 'none' }}
            >
              Suivant →
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
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
}

function KpiCompact({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <Paper
      sx={{
        px: 1.25,
        py: 0.75,
        border: `1px solid ${T.border}`,
        borderRadius: 1,
        bgcolor: T.bg1,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 72,
      }}
      onClick={onClick}
    >
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</Typography>
    </Paper>
  );
}

function WhitelistTable({
  rows,
  listingNames,
  waInterpretByResa,
  waLoading,
  onOpen,
}: {
  rows: WhitelistRow[];
  listingNames: Record<string, string>;
  waInterpretByResa: Record<string, { options: MenuOptionInterpretation[]; hasConfig: boolean }>;
  waLoading: boolean;
  onOpen: (id: string) => void;
}) {
  const headers = [
    'Réservation',
    'Création',
    'Voyageur',
    'Téléphone',
    'Langue',
    'Listing',
    'Check-in',
    'Check-out',
    'Config WhatsApp',
    'Contact WA',
    'Statut',
    'Actions',
  ];

  return (
    <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 1380, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: T.bg2 }}>
              {headers.map((h) => (
                <Box
                  component="th"
                  key={h}
                  sx={{
                    textAlign: h === 'Actions' ? 'center' : 'left',
                    px: 1.5,
                    py: 1.25,
                    fontSize: 10.75,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: T.text3,
                    borderBottom: `1px solid ${T.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((r) => {
              const wa = waMeta(r);
              const st = statusMeta(r.status);
              return (
                <Box
                  component="tr"
                  key={r.reservationId}
                  sx={{
                    transition: 'background-color 100ms',
                    '&:hover': { bgcolor: T.bg2 },
                    '& > td': { borderBottom: `1px solid ${T.border}`, px: 1.5, py: 1.25, verticalAlign: 'middle' },
                  }}
                >
                  <Box component="td">
                    <Typography
                      onClick={() => onOpen(r.reservationId)}
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.primaryDeep,
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {r.reservationCode || '—'}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 11.5, color: T.text2, whiteSpace: 'nowrap' }}>
                      {formatCreatedAt(r.createdAt)}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{r.guestName || '—'}</Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 11.5, color: T.text2 }}>
                      {r.phoneOta || '—'}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <WhitelistLanguageCell
                      guestLanguage={r.guestLanguage}
                      whatsappSelectedLanguage={r.whatsappSelectedLanguage}
                    />
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text }} noWrap>
                      {(r.listingId && listingNames[r.listingId]) || '—'}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12 }}>{r.checkIn ? moment(r.checkIn).format('DD MMM YY') : '—'}</Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12 }}>{r.checkOut ? moment(r.checkOut).format('DD MMM YY') : '—'}</Typography>
                  </Box>
                  <Box component="td" onClick={(e) => e.stopPropagation()}>
                    <WhatsappConfigCell
                      options={waInterpretByResa[r.reservationId]?.options ?? []}
                      hasConfig={waInterpretByResa[r.reservationId]?.hasConfig ?? false}
                      loading={waLoading && !waInterpretByResa[r.reservationId]}
                      listingName={r.listingId ? listingNames[r.listingId] : undefined}
                      guestName={r.guestName}
                      reservationCode={r.reservationCode}
                      checkInLabel={r.checkIn ? moment(r.checkIn).format('DD MMM YYYY') : undefined}
                      checkOutLabel={r.checkOut ? moment(r.checkOut).format('DD MMM YYYY') : undefined}
                    />
                  </Box>
                  <Box component="td">
                    <Chip label={wa.label} size="small" sx={{ bgcolor: wa.bg, color: wa.color, fontWeight: 600, fontSize: 11, height: 22 }} />
                  </Box>
                  <Box component="td">
                    <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 600, fontSize: 11, height: 22 }} />
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <Tooltip title="Voir détail">
                      <IconButton size="small" onClick={() => onOpen(r.reservationId)}>
                        <VisibilityIcon sx={{ fontSize: 18, color: T.primaryDeep }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

function WhitelistMobileCard({
  row,
  listingName,
  waInterpret,
  waLoading,
  onOpen,
}: {
  row: WhitelistRow;
  listingName?: string;
  waInterpret?: { options: MenuOptionInterpretation[]; hasConfig: boolean };
  waLoading?: boolean;
  onOpen: () => void;
}) {
  const wa = waMeta(row);
  const st = statusMeta(row.status);
  return (
    <Card
      onClick={onOpen}
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        cursor: 'pointer',
        bgcolor: T.bg1,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 700, color: T.primaryDeep }}>
            {row.reservationCode || '—'}
          </Typography>
          <Chip label={wa.label} size="small" sx={{ bgcolor: wa.bg, color: wa.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
        </Stack>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>{row.guestName || 'Voyageur'}</Typography>
        <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: T.text3, mb: 0.5 }}>
          Créé {formatCreatedAt(row.createdAt)}
        </Typography>
        {listingName && (
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text2, mb: 0.5 }}>{listingName}</Typography>
        )}
        <Typography sx={{ fontSize: 12, color: T.text2, mb: 0.75 }}>{row.phoneOta}</Typography>
        <Box sx={{ mb: 1 }}>
          <WhitelistLanguageCell
            guestLanguage={row.guestLanguage}
            whatsappSelectedLanguage={row.whatsappSelectedLanguage}
            compact
          />
        </Box>
        <Box sx={{ mb: 1 }} onClick={(e) => e.stopPropagation()}>
          <WhatsappConfigCell
            options={waInterpret?.options ?? []}
            hasConfig={waInterpret?.hasConfig ?? false}
            loading={waLoading}
            listingName={listingName}
            guestName={row.guestName}
            reservationCode={row.reservationCode}
            checkInLabel={row.checkIn ? moment(row.checkIn).format('DD MMM YYYY') : undefined}
            checkOutLabel={row.checkOut ? moment(row.checkOut).format('DD MMM YYYY') : undefined}
          />
        </Box>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12 }}>{row.checkIn ? moment(row.checkIn).format('DD MMM') : '—'}</Typography>
          <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontSize: 10.5, height: 20 }} />
          <Typography sx={{ fontSize: 12 }}>{row.checkOut ? moment(row.checkOut).format('DD MMM') : '—'}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
