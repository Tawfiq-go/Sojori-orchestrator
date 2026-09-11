import { useEffect, useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import messagesService, { type RoomServiceCartRow } from '../services/messagesService';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#F4CF5E',
  goldTint: 'rgba(244,207,94,0.14)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  error: '#c81e1e',
  warning: '#c46506',
};

const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace';

type SortKey = 'recent' | 'amountDesc' | 'expiringSoon';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Plus récents' },
  { key: 'amountDesc', label: 'Montant ↓' },
  { key: 'expiringSoon', label: 'Expire bientôt' },
];

function formatRelative(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function hoursUntil(dateIso: string): number {
  return (new Date(dateIso).getTime() - Date.now()) / 3_600_000;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Chip
      size="small"
      label={label}
      onClick={onClick}
      sx={{
        fontWeight: 700,
        fontSize: 11.5,
        height: 26,
        cursor: 'pointer',
        border: `1.5px solid ${active ? T.gold : T.border}`,
        bgcolor: active ? T.goldTint : T.bg1,
        color: active ? T.primaryDeep : T.text2,
        '&:hover': { bgcolor: active ? T.goldTint : T.bg3 },
      }}
    />
  );
}

export function RoomServiceCartsPage() {
  const { requestOwnerId } = useAdminOwnerFilter();
  const [carts, setCarts] = useState<RoomServiceCartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [onlyExpiringSoon, setOnlyExpiringSoon] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    messagesService
      .getRoomServiceCarts(requestOwnerId || undefined)
      .then((rows) => {
        if (!cancelled) setCarts(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestOwnerId, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = carts;
    if (q) {
      rows = rows.filter((c) => {
        const haystack = [
          c.guestName ?? '',
          c.reservationCode ?? '',
          ...c.items.map((i) => i.dish),
          ...c.items.map((i) => i.category),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (onlyExpiringSoon) {
      rows = rows.filter((c) => hoursUntil(c.expiresAt) <= 4);
    }
    const sorted = [...rows];
    if (sortKey === 'amountDesc') {
      sorted.sort((a, b) => b.totalMad - a.totalMad);
    } else if (sortKey === 'expiringSoon') {
      sorted.sort((a, b) => hoursUntil(a.expiresAt) - hoursUntil(b.expiresAt));
    } else {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return sorted;
  }, [carts, search, sortKey, onlyExpiringSoon]);

  const expiringSoonCount = useMemo(
    () => carts.filter((c) => hoursUntil(c.expiresAt) <= 4).length,
    [carts],
  );

  return (
    <DashboardWrapper hidePageHeader disableScopeGate>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1, mb: 0.5 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Paniers room service en attente
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography
            sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: T.text3 }}
          >
            {filtered.length} / {carts.length}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setRefreshKey((k) => k + 1)}
            sx={{ color: T.text2 }}
            title="Actualiser"
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: T.text3, mb: 1.5 }}>
        Articles ajoutés côté voyageur, pas encore commandés — aucune tâche créée pour ces
        lignes. Un panier abandonné disparaît de lui-même après 24 h.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 1.5, alignItems: { sm: 'center' }, flexWrap: 'wrap', rowGap: 1 }}
      >
        <TextField
          size="small"
          placeholder="Voyageur, code résa, plat…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: T.text3 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            minWidth: 220,
            '& .MuiOutlinedInput-root': { bgcolor: T.bg1, fontSize: 13 },
          }}
        />
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {SORT_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.key}
              label={opt.label}
              active={sortKey === opt.key}
              onClick={() => setSortKey(opt.key)}
            />
          ))}
          <FilterChip
            label={`⏳ Expire < 4h${expiringSoonCount ? ` (${expiringSoonCount})` : ''}`}
            active={onlyExpiringSoon}
            onClick={() => setOnlyExpiringSoon((v) => !v)}
          />
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          sx={{
            p: 2.5,
            textAlign: 'center',
            border: `1px dashed ${T.border}`,
            borderRadius: 1.25,
            bgcolor: T.bg1,
          }}
        >
          <Typography sx={{ fontSize: 13, color: T.text3 }}>
            {carts.length === 0
              ? 'Aucun panier en attente pour le moment.'
              : 'Aucun panier ne correspond à la recherche/aux filtres.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {filtered.map((cart) => {
            const hLeft = hoursUntil(cart.expiresAt);
            const soon = hLeft <= 4;
            return (
              <Paper
                key={cart.reservationId}
                sx={{
                  p: 1.5,
                  border: `1px solid ${soon ? 'rgba(196,101,6,0.28)' : T.border}`,
                  borderRadius: 1.25,
                  bgcolor: T.bg1,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1, mb: 1 }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      {cart.guestName || 'Voyageur'}
                    </Typography>
                    {cart.reservationCode ? (
                      <Chip
                        size="small"
                        label={cart.reservationCode}
                        sx={{ height: 20, fontSize: 10.5, bgcolor: T.bg3, color: T.text2 }}
                      />
                    ) : null}
                    <Typography sx={{ fontSize: 11, color: T.text3 }}>
                      maj {formatRelative(cart.updatedAt)}
                    </Typography>
                    {soon ? (
                      <Chip
                        size="small"
                        label="Expire bientôt"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: 'rgba(196,101,6,0.12)',
                          color: T.warning,
                        }}
                      />
                    ) : null}
                  </Stack>
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 800,
                      fontSize: 14,
                      color: T.primaryDeep,
                    }}
                  >
                    {cart.totalMad} MAD
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {cart.items.map((item, idx) => (
                    <Typography key={idx} sx={{ fontSize: 12.5, color: T.text }}>
                      {item.qty}× {item.dish}
                      {item.options.length ? ` — ${item.options.join(', ')}` : ''}
                      {item.note ? ` (${item.note})` : ''}
                      <Typography component="span" sx={{ fontSize: 11.5, color: T.text3 }}>
                        {' '}
                        · {item.unitPriceMad} MAD/u
                      </Typography>
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </DashboardWrapper>
  );
}

export default RoomServiceCartsPage;
