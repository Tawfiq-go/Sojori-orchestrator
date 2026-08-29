import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import { autocompleteOptionLiProps } from '../../utils/autocompleteOptionLiProps';
import {
  applyOwnerStock,
  fetchNotifySettings,
  fetchStockKinds,
  fetchStockRooms,
  listExtras,
  patchExtra,
  STOCK_KINDS_FALLBACK,
  syncExtraCatalog,
  type ExtraProduct,
  type ExtraStockRoom,
  type StockKind,
} from './extrasApi';

function money(n?: number, currency = 'MAD'): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
}

export function ExtraCatalogTable({
  ownerId,
  reloadToken = 0,
  allowApply = true,
}: {
  ownerId?: string | null;
  reloadToken?: number;
  allowApply?: boolean;
}) {
  const [kinds, setKinds] = useState<StockKind[]>(STOCK_KINDS_FALLBACK);
  const [kind, setKind] = useState('minibar');
  const [rows, setRows] = useState<ExtraProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<Array<{ id: string; name: string }>>([]);
  const [listingId, setListingId] = useState('');
  const [listingsLoading, setListingsLoading] = useState(false);
  const [rooms, setRooms] = useState<ExtraStockRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<ExtraStockRoom[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [receptionLabel, setReceptionLabel] = useState('');

  const kindDef = kinds.find((k) => k.id === kind) || kinds[0];
  const canApplyKind = kind === 'minibar';
  const listingName = listings.find((l) => l.id === listingId)?.name || listingId;

  const load = async (stockKind = kind) => {
    setLoading(true);
    try {
      setRows(await listExtras({ stockKind }, { ownerId }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStockKinds({ ownerId })
      .then(setKinds)
      .catch(() => setKinds(STOCK_KINDS_FALLBACK));
  }, [ownerId]);

  useEffect(() => {
    void load(kind);
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on owner / tab / parent import
  }, [ownerId, kind, reloadToken]);

  useEffect(() => {
    if (!allowApply) return;
    let cancelled = false;
    setListingsLoading(true);
    void listingsService
      .getListings({
        page: 0,
        limit: 500,
        compact: true,
        useActiveFilter: true,
        filterOwnerId: ownerId || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        const items = (res.data?.items || []).map((l) => ({ id: l.id, name: l.name }));
        setListings(items);
        setListingId((prev) => {
          if (prev && items.some((i) => i.id === prev)) return prev;
          return items.length === 1 ? items[0]!.id : '';
        });
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Listings impossibles à charger');
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, allowApply]);

  useEffect(() => {
    if (!allowApply || !listingId) {
      setRooms([]);
      setSelectedRooms([]);
      return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    void fetchStockRooms(listingId, { ownerId })
      .then((next) => {
        if (cancelled) return;
        setRooms(next);
        setSelectedRooms([]);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Villas impossibles à charger');
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, ownerId, allowApply]);

  useEffect(() => {
    if (!allowApply || !listingId) {
      setReceptionLabel('');
      return;
    }
    let cancelled = false;
    void fetchNotifySettings(listingId, { ownerId })
      .then((s) => {
        if (cancelled) return;
        if (!s.notifyPhone) {
          setReceptionLabel('');
          return;
        }
        const extra = s.count > 1 ? ` (+${s.count - 1})` : '';
        setReceptionLabel(`${s.notifyName || 'Réception'} · ${s.notifyPhone}${extra}`);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Réception impossible à charger');
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, ownerId, allowApply]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.productId.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const filteredIds = filtered.map((r) => r.productId);
  const selectedVisible = filteredIds.filter((id) => selectedIds.has(id));
  const allVisibleSelected = filteredIds.length > 0 && selectedVisible.length === filteredIds.length;
  const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected;

  const onToggleActive = async (row: ExtraProduct) => {
    setBusyId(row.productId);
    try {
      const next = await patchExtra(row.productId, { isActive: !row.isActive }, { ownerId });
      setRows((prev) => prev.map((r) => (r.productId === next.productId ? next : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setBusyId(null);
    }
  };

  const onParBlur = async (row: ExtraProduct, raw: string) => {
    const trimmed = raw.trim();
    const nextQty = trimmed === '' ? undefined : Math.max(0, Math.floor(Number(trimmed)));
    if (nextQty != null && !Number.isFinite(nextQty)) return;
    if ((row.defaultParQty ?? undefined) === nextQty) return;
    if (nextQty == null) return;
    setBusyId(row.productId);
    try {
      const next = await patchExtra(row.productId, { defaultParQty: nextQty }, { ownerId });
      setRows((prev) => prev.map((r) => (r.productId === next.productId ? next : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Par impossible à enregistrer');
    } finally {
      setBusyId(null);
    }
  };

  const onSyncCatalog = async () => {
    setSyncing(true);
    try {
      const res = await syncExtraCatalog({ ownerId });
      toast.success(`Catalogue mis à jour (${res.updated} ligne${res.updated > 1 ? 's' : ''}). Stock villas inchangé.`);
      await load(kind);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rafraîchissement impossible');
    } finally {
      setSyncing(false);
    }
  };

  const toggleRow = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  };

  const openApply = () => {
    if (!canApplyKind) {
      toast.error(
        `Le type « ${kindDef?.label || kind} » n’a pas encore de stock chambre — mini-bar seulement pour l’instant.`,
      );
      return;
    }
    if (!listingId) {
      toast.error('Choisissez un établissement.');
      return;
    }
    if (!selectedRooms.length) {
      toast.error('Cochez une ou plusieurs villas en haut.');
      return;
    }
    if (!selectedIds.size) {
      toast.error('Cochez un ou plusieurs articles dans le tableau.');
      return;
    }
    setApplyOpen(true);
  };

  const onApply = async () => {
    setApplyBusy(true);
    try {
      const res = await applyOwnerStock(
        {
          listingId,
          kind,
          roomIds: selectedRooms.map((r) => r.id),
          productIds: [...selectedIds],
        },
        { ownerId },
      );
      toast.success(
        `Stock ${kindDef?.label || kind} : ${res.products} article${res.products > 1 ? 's' : ''} × ${res.rooms} villa${res.rooms > 1 ? 's' : ''} (${res.written} écriture${res.written > 1 ? 's' : ''}).`,
      );
      setApplyOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Application impossible');
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <>
      <Tabs
        value={kind}
        onChange={(_e, v: string) => setKind(v)}
        sx={{ mb: 2, minHeight: 40 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {kinds.map((k) => (
          <Tab
            key={k.id}
            value={k.id}
            label={k.staffLetter ? `${k.label} (${k.staffLetter})` : k.label}
            sx={{ textTransform: 'none', minHeight: 40 }}
          />
        ))}
      </Tabs>
      {allowApply ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Cochez les articles, choisissez les villas, puis « Mettre à jour le stock ». Rien ne s’écrit tout seul.
          Les articles non cochés restent tels quels sur les villas.
        </Alert>
      ) : null}

      {allowApply ? (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Établissement"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            disabled={listingsLoading || applyBusy}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Choisir…</MenuItem>
            {listings.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            multiple
            disableCloseOnSelect
            size="small"
            options={rooms}
            value={selectedRooms}
            onChange={(_e, v) => setSelectedRooms(v)}
            loading={roomsLoading}
            disabled={!listingId || roomsLoading || applyBusy}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 280, flex: '1 1 280px' }}
            renderOption={(props, option, { selected }) => {
              const { key, liProps } = autocompleteOptionLiProps(props);
              return (
                <Box component="li" key={key} {...liProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  {option.name}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Villas"
                placeholder={rooms.length ? 'Cochez une, plusieurs ou toutes' : 'Choisissez un établissement'}
              />
            )}
          />
          <Button
            size="small"
            variant="text"
            disabled={!rooms.length || applyBusy}
            onClick={() => setSelectedRooms(rooms)}
          >
            Toutes les villas
          </Button>
          <Button
            size="small"
            variant="text"
            disabled={!selectedRooms.length || applyBusy}
            onClick={() => setSelectedRooms([])}
          >
            Aucune
          </Button>
          <Button size="small" variant="contained" disabled={applyBusy} onClick={openApply}>
            Mettre à jour le stock
          </Button>
        </Stack>
      ) : null}

      {allowApply && listingId ? (
        <Alert severity={receptionLabel ? 'info' : 'warning'} sx={{ mb: 2 }}>
          {receptionLabel
            ? `Réception (Équipe) : ${receptionLabel}. Le contrôleur envoie chaque facture (extra) par WhatsApp — le client peut payer plusieurs fois.`
            : 'Aucun staff type Réception pour cet établissement. Ajoutez-le dans Équipe (activité Réception) — pas ici.'}{' '}
          <Box
            component="a"
            href="/admin/equipe?tab=worker"
            sx={{ fontWeight: 700, color: 'inherit' }}
          >
            Ouvrir Équipe
          </Box>
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher (${kindDef?.label || 'stock'})…`}
        />
        <Typography variant="body2" color="text.secondary">
          {loading
            ? 'Chargement…'
            : `${filtered.length} / ${rows.length} extra${rows.length > 1 ? 's' : ''}`}
          {allowApply
            ? ` · ${selectedIds.size} article${selectedIds.size > 1 ? 's' : ''} · ${selectedRooms.length} villa${selectedRooms.length > 1 ? 's' : ''}`
            : ''}
        </Typography>
        {allowApply ? (
          <Button size="small" variant="text" onClick={toggleAllVisible} disabled={!filteredIds.length}>
            {allVisibleSelected ? 'Aucun article' : 'Tous les articles'}
          </Button>
        ) : null}
        <Button size="small" variant="outlined" disabled={syncing} onClick={() => void onSyncCatalog()}>
          {syncing ? 'Catalogue…' : 'Rafraîchir catalogue (prix / TVA / ventes)'}
        </Button>
      </Stack>
      <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {allowApply ? (
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={!filteredIds.length}
                  />
                </TableCell>
              ) : null}
              <TableCell>#</TableCell>
              <TableCell>Extra</TableCell>
              <TableCell align="right">TTC</TableCell>
              <TableCell align="right">HT</TableCell>
              <TableCell align="right">TVA</TableCell>
              <TableCell align="right">Ventes 90 j</TableCell>
              <TableCell align="right">Par / villa</TableCell>
              <TableCell align="center">Actif</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row, idx) => (
              <TableRow key={row.productId} sx={{ opacity: row.isActive ? 1 : 0.5 }}>
                {allowApply ? (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(row.productId)}
                      onChange={() => toggleRow(row.productId)}
                    />
                  </TableCell>
                ) : null}
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  {row.label}
                  {row.missingFromPms ? (
                    <Typography component="span" sx={{ ml: 1, color: '#b45309', fontSize: 11 }}>
                      absent PMS
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell align="right">{money(row.effectivePrice, row.currency)}</TableCell>
                <TableCell align="right">{money(row.priceHT, row.currency)}</TableCell>
                <TableCell align="right">
                  {row.taxRatePct != null ? `${row.taxRatePct} %` : row.taxCode || '—'}
                </TableCell>
                <TableCell align="right">{row.soldQty90d ?? '—'}</TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={row.defaultParQty ?? ''}
                    key={`${row.productId}-${row.defaultParQty ?? ''}`}
                    placeholder="1"
                    disabled={busyId === row.productId}
                    onBlur={(e) => void onParBlur(row, e.target.value)}
                    inputProps={{ min: 0, step: 1, style: { textAlign: 'right', width: 56 } }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={row.isActive}
                    disabled={busyId === row.productId}
                    onChange={() => void onToggleActive(row)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={applyOpen} onClose={() => !applyBusy && setApplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mettre à jour le stock — {kindDef?.label || kind}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ceci pose la colonne <strong>Par</strong> des <strong>{selectedIds.size}</strong> article
            {selectedIds.size > 1 ? 's' : ''} cochés sur <strong>{selectedRooms.length}</strong> villa
            {selectedRooms.length > 1 ? 's' : ''}
            {listingName ? ` (${listingName})` : ''}. Les autres articles des villas ne sont pas touchés.
            Jamais automatique.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Villas : {selectedRooms.map((r) => r.name).join(', ') || '—'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyOpen(false)} disabled={applyBusy}>
            Annuler
          </Button>
          <Button variant="contained" disabled={applyBusy} onClick={() => void onApply()}>
            {applyBusy ? 'Écriture…' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
