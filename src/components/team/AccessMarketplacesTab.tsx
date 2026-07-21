/**
 * Access Marketplaces — toggles canal PM + ordre homepage sojori.com.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Switch,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { hasAdminAccess } from '../../utils/rbac.utils';
import { getOwnersAllPages, updateOwner } from '../../features/staff/services/serverApi.task';
import { TEAM_T } from './teamHubTokens';

type ChannelKey = 'sojori' | 'directBooking' | 'whatsapp' | 'marketplace';

type OwnerRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  pmProfile?: {
    publicName?: string;
    published?: boolean;
    marketplaceRank?: number;
    distributionChannels?: Partial<Record<ChannelKey, boolean>>;
  };
};

const CHANNEL_COLUMNS: { key: ChannelKey; label: string; hint: string }[] = [
  { key: 'sojori', label: 'Sojori', hint: 'Marketplace sojori.com' },
  { key: 'directBooking', label: 'Direct booking', hint: 'Site marque blanche PM' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Réservation via flow WhatsApp' },
  { key: 'marketplace', label: 'Autres PMs', hint: 'Catalogue inter-PMs' },
];

const DEFAULT_RANK = 1000;

function ownerLabel(row: OwnerRow): string {
  const publicName = String(row.pmProfile?.publicName || '').trim();
  if (publicName) return publicName;
  const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return n || row.email || '—';
}

function resolveRank(pmProfile?: OwnerRow['pmProfile']) {
  const n = Number(pmProfile?.marketplaceRank);
  return Number.isFinite(n) ? n : DEFAULT_RANK;
}

function resolveChannels(pmProfile?: OwnerRow['pmProfile']) {
  const dc = pmProfile?.distributionChannels || {};
  return {
    sojori: dc.sojori !== false,
    directBooking: dc.directBooking !== false,
    whatsapp: dc.whatsapp !== false,
    marketplace: dc.marketplace !== false,
  };
}

function isHomepageEligible(row: OwnerRow) {
  const ch = resolveChannels(row.pmProfile);
  return row.pmProfile?.published === true && ch.sojori;
}

function sortByMarketplaceRank(rows: OwnerRow[]) {
  return [...rows].sort((a, b) => {
    const dr = resolveRank(a.pmProfile) - resolveRank(b.pmProfile);
    if (dr !== 0) return dr;
    return ownerLabel(a).localeCompare(ownerLabel(b), 'fr');
  });
}

function cellKey(ownerId: string, suffix: string) {
  return `${ownerId}:${suffix}`;
}

export function AccessMarketplacesTab() {
  const { user } = useAuth();
  const isPlatformAdmin = hasAdminAccess(user?.role);

  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [homepageOnly, setHomepageOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getOwnersAllPages({ accountStatus: 'live', deleted: false, banned: false });
      setOwners(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('[AccessMarketplaces] load failed', err);
      toast.error('Impossible de charger les property managers');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) void load();
  }, [isPlatformAdmin, load]);

  const sortedOwners = useMemo(() => sortByMarketplaceRank(owners), [owners]);

  const filtered = useMemo(() => {
    let rows = sortedOwners;
    if (homepageOnly) {
      rows = rows.filter(isHomepageEligible);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [ownerLabel(row), row.email, row.firstName, row.lastName, row.pmProfile?.publicName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sortedOwners, search, homepageOnly]);

  const homepageOrderIndex = useMemo(() => {
    const map = new Map<string, number>();
    sortByMarketplaceRank(owners.filter(isHomepageEligible)).forEach((row, idx) => {
      map.set(String(row._id), idx + 1);
    });
    return map;
  }, [owners]);

  const moveRow = async (row: OwnerRow, direction: 'up' | 'down') => {
    if (search.trim()) {
      toast.info('Effacez la recherche pour réordonner');
      return;
    }
    const list = homepageOnly ? sortedOwners.filter(isHomepageEligible) : sortedOwners;
    const idx = list.findIndex((o) => o._id === row._id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);

    // Rangs séquentiels — un simple swap échoue quand tout le monde est à 1000 (défaut).
    const rankById = new Map<string, number>();
    reordered.forEach((o, i) => {
      rankById.set(String(o._id), (i + 1) * 10);
    });

    const prevOwners = owners;
    setOwners((all) =>
      all.map((o) => {
        const nextRank = rankById.get(String(o._id));
        if (nextRank == null) return o;
        return { ...o, pmProfile: { ...(o.pmProfile || {}), marketplaceRank: nextRank } };
      }),
    );

    const updates = reordered
      .map((o) => ({
        row: o,
        rank: rankById.get(String(o._id))!,
      }))
      .filter(({ row, rank }) => resolveRank(row.pmProfile) !== rank);

    if (!updates.length) {
      toast.info('Ordre inchangé');
      return;
    }

    setSaving((s) => {
      const copy = { ...s };
      for (const { row } of updates) {
        copy[cellKey(String(row._id), 'rank')] = true;
      }
      return copy;
    });

    try {
      await Promise.all(
        updates.map(({ row, rank }) =>
          updateOwner(String(row._id), {
            pmProfile: { ...(row.pmProfile || {}), marketplaceRank: rank },
          }),
        ),
      );
      toast.success('Ordre mis à jour');
    } catch (err) {
      setOwners(prevOwners);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Échec du réordonnancement';
      toast.error(msg);
    } finally {
      setSaving((s) => {
        const copy = { ...s };
        for (const { row } of updates) {
          delete copy[cellKey(String(row._id), 'rank')];
        }
        return copy;
      });
    }
  };

  const toggleChannel = async (row: OwnerRow, channel: ChannelKey, next: boolean) => {
    const ownerId = String(row._id);
    const key = cellKey(ownerId, channel);
    const prev = resolveChannels(row.pmProfile);
    const nextChannels = { ...prev, [channel]: next };

    setOwners((list) =>
      list.map((o) =>
        o._id === row._id
          ? {
              ...o,
              pmProfile: { ...(o.pmProfile || {}), distributionChannels: nextChannels },
            }
          : o,
      ),
    );
    setSaving((s) => ({ ...s, [key]: true }));

    try {
      const pmProfile = { ...(row.pmProfile || {}), distributionChannels: nextChannels };
      await updateOwner(ownerId, { pmProfile });
    } catch (err) {
      setOwners((list) =>
        list.map((o) =>
          o._id === row._id
            ? {
                ...o,
                pmProfile: { ...(o.pmProfile || {}), distributionChannels: prev },
              }
            : o,
        ),
      );
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as Error)?.message ||
          'Échec de la mise à jour',
      );
    } finally {
      setSaving((s) => {
        const copy = { ...s };
        delete copy[key];
        return copy;
      });
    }
  };

  if (!isPlatformAdmin) {
    return <Navigate to="/admin/equipe?tab=worker" replace />;
  }

  const colSpan = 5 + CHANNEL_COLUMNS.length;

  return (
    <Box>
      <Typography sx={{ fontSize: 14, color: TEAM_T.text2, mb: 1.5, lineHeight: 1.55 }}>
        <b>Access Marketplaces</b> — autorisez les canaux par PM et définissez l&apos;ordre d&apos;affichage
        sur sojori.com (<em>Conciergeries de confiance / Partenaires sélectionnés</em>). Le{' '}
        <b>#1</b> = grande carte featured en tête de liste.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Rechercher un PM…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: '1 1 220px' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Chip
          label="Homepage sojori.com uniquement"
          clickable
          color={homepageOnly ? 'primary' : 'default'}
          variant={homepageOnly ? 'filled' : 'outlined'}
          onClick={() => setHomepageOnly((v) => !v)}
          sx={{ fontWeight: 600 }}
        />
        <Tooltip title="Recharger">
          <span>
            <IconButton onClick={() => void load()} disabled={loading} size="small">
              {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Typography sx={{ fontSize: 12, color: TEAM_T.text3 }}>
          {filtered.length} PM{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <TableContainer
        sx={{
          border: `1px solid ${TEAM_T.border}`,
          borderRadius: 2,
          maxHeight: 'calc(100vh - 340px)',
          overflow: 'auto',
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 88 }} align="center">
                Ordre
              </TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Property manager</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">
                Vitrine
              </TableCell>
              {CHANNEL_COLUMNS.map((col) => (
                <TableCell key={col.key} align="center" sx={{ fontWeight: 700, minWidth: 100 }}>
                  <Tooltip title={col.hint}>
                    <span>{col.label}</span>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !owners.length ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && !filtered.length ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: TEAM_T.text3 }}>
                  Aucun property manager trouvé
                </TableCell>
              </TableRow>
            ) : null}
            {filtered.map((row, idx) => {
              const channels = resolveChannels(row.pmProfile);
              const ownerId = String(row._id);
              const hpIdx = homepageOrderIndex.get(ownerId);
              const rankBusy = saving[cellKey(ownerId, 'rank')] === true;
              const featured = homepageOnly && idx === 0 && isHomepageEligible(row);

              return (
                <TableRow
                  key={ownerId}
                  hover
                  sx={featured ? { bgcolor: 'rgba(184,133,26,0.08)' } : undefined}
                >
                  <TableCell align="center">
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: TEAM_T.text2 }}>
                      {homepageOnly ? idx + 1 : hpIdx ?? '—'}
                    </Typography>
                    {featured ? (
                      <Typography sx={{ fontSize: 10, color: TEAM_T.primaryDeep, fontWeight: 700 }}>
                        Featured
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                      <IconButton
                        size="small"
                        disabled={rankBusy || idx === 0 || !!search.trim()}
                        onClick={() => void moveRow(row, 'up')}
                        aria-label="Monter"
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={rankBusy || idx === filtered.length - 1 || !!search.trim()}
                        onClick={() => void moveRow(row, 'down')}
                        aria-label="Descendre"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{ownerLabel(row)}</Typography>
                    {!isHomepageEligible(row) && !homepageOnly ? (
                      <Typography sx={{ fontSize: 10, color: TEAM_T.text3 }}>
                        Hors homepage
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: TEAM_T.text2 }}>{row.email || '—'}</TableCell>
                  <TableCell align="center">
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: row.pmProfile?.published ? 'success.main' : TEAM_T.text3,
                      }}
                    >
                      {row.pmProfile?.published ? 'Publié' : '—'}
                    </Typography>
                  </TableCell>
                  {CHANNEL_COLUMNS.map((col) => {
                    const sk = cellKey(ownerId, col.key);
                    const busy = saving[sk] === true;
                    return (
                      <TableCell key={col.key} align="center">
                        <Switch
                          size="small"
                          checked={channels[col.key]}
                          disabled={busy}
                          onChange={(_, checked) => void toggleChannel(row, col.key, checked)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default AccessMarketplacesTab;
