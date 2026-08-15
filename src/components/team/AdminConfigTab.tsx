/**
 * Config IA & Paiement — réglages Admin séparés de Account/pmProfile (objet à
 * part : AdminPmConfig côté srv-user). Jamais visible/éditable par le PM.
 * Tier IA WhatsApp par PM + plafond des moyens de paiement direct booking
 * (carte/virement/cash), plus le plafond plateforme (Sojori) au-dessus.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
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
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { hasAdminAccess } from '../../utils/rbac.utils';
import {
  getOwnersAllPages,
  listAdminPmConfigs,
  updateAdminPmConfig,
  updateOwnerWhatsappAiTier,
  getPlatformPaymentPolicy,
  updatePlatformPaymentPolicy,
} from '../../features/staff/services/serverApi.task';
import { WHATSAPP_AI_TIER_OPTIONS } from '../../constants/whatsappAiTier';
import { resolveRuEmailDisplay } from '../../features/staff/utils/ruEmailUtils';
import { TEAM_T } from './teamHubTokens';

type PaymentMethod = 'card' | 'wire' | 'cash';

const PAYMENT_COLUMNS: { key: PaymentMethod; label: string }[] = [
  { key: 'card', label: 'Carte' },
  { key: 'wire', label: 'Virement' },
  { key: 'cash', label: 'Cash' },
];

type OwnerRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  ruEmail?: string;
  whatsappConversationalTier?: number;
};

function ownerLabel(row: OwnerRow): string {
  const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return n || row.email || '—';
}

function cellKey(ownerId: string, suffix: string) {
  return `${ownerId}:${suffix}`;
}

export function AdminConfigTab() {
  const { user } = useAuth();
  const isPlatformAdmin = hasAdminAccess(user?.role);

  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [paymentByOwnerId, setPaymentByOwnerId] = useState<Record<string, PaymentMethod[]>>({});
  const [platformMethods, setPlatformMethods] = useState<PaymentMethod[]>(['card', 'wire', 'cash']);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [platformSaving, setPlatformSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, configs, platformPolicy] = await Promise.all([
        getOwnersAllPages({ accountStatus: 'live', deleted: false, banned: false }),
        listAdminPmConfigs(),
        getPlatformPaymentPolicy(),
      ]);
      setOwners(Array.isArray(rows) ? rows : []);
      const map: Record<string, PaymentMethod[]> = {};
      for (const c of Array.isArray(configs) ? configs : []) {
        map[String(c.ownerId)] = c.directPayment?.methods || ['card', 'wire', 'cash'];
      }
      setPaymentByOwnerId(map);
      setPlatformMethods(platformPolicy?.directPayment?.methods || ['card', 'wire', 'cash']);
    } catch (err) {
      console.error('[AdminConfigTab] load failed', err);
      toast.error('Impossible de charger la configuration admin');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) void load();
  }, [isPlatformAdmin, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = [...owners].sort((a, b) => ownerLabel(a).localeCompare(ownerLabel(b), 'fr'));
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        ownerLabel(row),
        row.email,
        resolveRuEmailDisplay(row),
        row.firstName,
        row.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [owners, search]);

  const toggleTier = async (row: OwnerRow, tier: number) => {
    const ownerId = String(row._id);
    const prev = row.whatsappConversationalTier;
    setOwners((list) => list.map((o) => (o._id === row._id ? { ...o, whatsappConversationalTier: tier } : o)));
    setSaving((s) => ({ ...s, [cellKey(ownerId, 'tier')]: true }));
    try {
      await updateOwnerWhatsappAiTier(ownerId, tier);
    } catch (err) {
      setOwners((list) => list.map((o) => (o._id === row._id ? { ...o, whatsappConversationalTier: prev } : o)));
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Échec de la mise à jour du tier IA',
      );
    } finally {
      setSaving((s) => {
        const copy = { ...s };
        delete copy[cellKey(ownerId, 'tier')];
        return copy;
      });
    }
  };

  const togglePaymentMethod = async (row: OwnerRow, method: PaymentMethod, checked: boolean) => {
    const ownerId = String(row._id);
    const prevMethods = paymentByOwnerId[ownerId] || ['card', 'wire', 'cash'];
    const nextMethods = checked ? [...new Set([...prevMethods, method])] : prevMethods.filter((m) => m !== method);

    setPaymentByOwnerId((m) => ({ ...m, [ownerId]: nextMethods }));
    setSaving((s) => ({ ...s, [cellKey(ownerId, method)]: true }));
    try {
      await updateAdminPmConfig(ownerId, { methods: nextMethods });
    } catch (err) {
      setPaymentByOwnerId((m) => ({ ...m, [ownerId]: prevMethods }));
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Échec de la mise à jour du plafond paiement',
      );
    } finally {
      setSaving((s) => {
        const copy = { ...s };
        delete copy[cellKey(ownerId, method)];
        return copy;
      });
    }
  };

  const togglePlatformMethod = async (method: PaymentMethod, checked: boolean) => {
    const prev = platformMethods;
    const next = checked ? [...new Set([...prev, method])] : prev.filter((m) => m !== method);
    setPlatformMethods(next);
    setPlatformSaving(true);
    try {
      await updatePlatformPaymentPolicy({ methods: next });
      toast.success('Plafond plateforme mis à jour');
    } catch (err) {
      setPlatformMethods(prev);
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Échec de la mise à jour du plafond plateforme',
      );
    } finally {
      setPlatformSaving(false);
    }
  };

  if (!isPlatformAdmin) {
    return <Navigate to="/admin/equipe?tab=worker" replace />;
  }

  const colSpan = 4 + PAYMENT_COLUMNS.length;

  return (
    <Box>
      <Typography sx={{ fontSize: 14, color: TEAM_T.text2, mb: 1.5, lineHeight: 1.55 }}>
        <b>Config IA &amp; Paiement</b> — réglages Admin uniquement, jamais visibles ni modifiables par le PM.
        Le tier IA pilote le modèle Claude utilisé sur WhatsApp pour ce PM. Le plafond paiement limite les
        moyens de paiement direct booking réellement proposés (intersection avec ce que le PM autorise sur
        son listing).
      </Typography>

      <Box
        sx={{
          border: `1px solid ${TEAM_T.border}`,
          borderRadius: 2,
          p: 2,
          mb: 2.5,
          bgcolor: 'rgba(184,133,26,0.06)',
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
          Plafond plateforme (Sojori) {platformSaving ? <CircularProgress size={12} sx={{ ml: 1 }} /> : null}
        </Typography>
        <Typography sx={{ fontSize: 12, color: TEAM_T.text3, mb: 1 }}>
          Mesure de sécurité globale — s'applique à TOUS les PM, en plus de leur propre plafond ci-dessous.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {PAYMENT_COLUMNS.map((col) => (
            <FormControlLabel
              key={col.key}
              control={
                <Checkbox
                  size="small"
                  checked={platformMethods.includes(col.key)}
                  disabled={platformSaving}
                  onChange={(_, checked) => void togglePlatformMethod(col.key, checked)}
                />
              }
              label={col.label}
            />
          ))}
        </Box>
      </Box>

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
          maxHeight: 'calc(100vh - 460px)',
          overflow: 'auto',
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Property manager</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Email RU</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Config IA (WhatsApp)</TableCell>
              {PAYMENT_COLUMNS.map((col) => (
                <TableCell key={col.key} align="center" sx={{ fontWeight: 700, minWidth: 90 }}>
                  {col.label}
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
            {filtered.map((row) => {
              const ownerId = String(row._id);
              const tierBusy = saving[cellKey(ownerId, 'tier')] === true;
              const methods = paymentByOwnerId[ownerId] || ['card', 'wire', 'cash'];

              return (
                <TableRow key={ownerId} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{ownerLabel(row)}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: TEAM_T.text2 }}>{row.email || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: TEAM_T.text2 }}>
                    {resolveRuEmailDisplay(row) || '—'}
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={row.whatsappConversationalTier || 2}
                      disabled={tierBusy}
                      onChange={(e) => void toggleTier(row, Number(e.target.value))}
                      sx={{ fontSize: 12.5, minWidth: 180 }}
                    >
                      {WHATSAPP_AI_TIER_OPTIONS.map((opt) => (
                        <MenuItem key={opt.tier} value={opt.tier} sx={{ fontSize: 12.5 }}>
                          {opt.label} — {opt.hint}
                        </MenuItem>
                      ))}
                    </Select>
                    {tierBusy ? <CircularProgress size={12} sx={{ ml: 1 }} /> : null}
                  </TableCell>
                  {PAYMENT_COLUMNS.map((col) => {
                    const sk = cellKey(ownerId, col.key);
                    const busy = saving[sk] === true;
                    return (
                      <TableCell key={col.key} align="center">
                        <Checkbox
                          size="small"
                          checked={methods.includes(col.key)}
                          disabled={busy}
                          onChange={(_, checked) => void togglePaymentMethod(row, col.key, checked)}
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

export default AdminConfigTab;
