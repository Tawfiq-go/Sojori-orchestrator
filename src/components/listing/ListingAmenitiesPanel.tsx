import { useCallback, useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { listingsService } from '../../services/listingsService';
import { isMongoListingId } from '../../utils/listingConfigTabApi';
import { Panel, tokens as t } from '../dashboard/DashboardV2.components';

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export type ListingAmenitiesPanelProps = {
  listingId: string;
  onToast: (message: string, severity?: ToastSeverity) => void;
};

export function ListingAmenitiesPanel({ listingId, onToast }: ListingAmenitiesPanelProps) {
  const [loadingSelected, setLoadingSelected] = useState(true);
  const [selected, setSelected] = useState<
    { id: string; displayName: string; count: number; iconUrl: string }[]
  >([]);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalog, setCatalog] = useState<{ id: string; displayName: string; count: number; iconUrl: string }[]>(
    [],
  );
  const [catalogTotal, setCatalogTotal] = useState(0);

  const idOk = isMongoListingId(listingId);

  const loadSelected = useCallback(async () => {
    if (!idOk) {
      setLoadingSelected(false);
      setSelected([]);
      setSelectedError('ID listing invalide.');
      return;
    }
    setLoadingSelected(true);
    setSelectedError(null);
    const res = await listingsService.getListingAmenitiesWithCounts(listingId);
    setLoadingSelected(false);
    if (res.error) {
      setSelectedError(res.error);
      onToast(res.error, 'error');
    }
    setSelected(res.items);
  }, [listingId, idOk]);

  useEffect(() => {
    void loadSelected();
  }, [loadSelected]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!idOk) {
      setCatalog([]);
      setCatalogTotal(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      const res = await listingsService.getAmenitiesCatalogPage({
        page: 0,
        limit: debouncedSearch ? 120 : 40,
        paged: true,
        searchText: debouncedSearch || undefined,
      });
      if (cancelled) return;
      setCatalogLoading(false);
      setCatalog(res.items);
      setCatalogTotal(res.total);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, idOk]);

  if (!idOk) {
    return (
      <Panel sx={{ p: 2.5, borderColor: t.borderStrong, borderWidth: 1, borderStyle: 'dashed' }}>
        <Typography sx={{ fontSize: 13, color: t.text3 }}>
          Enregistrez le listing avec un ID Mongo valide pour charger les équipements depuis srv-listing.
        </Typography>
      </Panel>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Panel sx={{ p: 2.5, borderColor: t.primary, borderWidth: 1, borderStyle: 'solid' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.primary, mb: 0.5 }}>
          Property Amenities
        </Typography>
        <Typography sx={{ fontSize: 11, color: t.text3, mb: 1.5 }}>
          GET /api/v1/listing/listings/listing-amenities/:listingId (même source que le dashboard)
        </Typography>
        {loadingSelected ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ fontSize: 12, color: t.text3 }}>Chargement des équipements…</Typography>
          </Box>
        ) : (
          <>
            {selectedError && (
              <Typography sx={{ fontSize: 12, color: 'error.main', mb: 1 }}>
                {selectedError}
              </Typography>
            )}
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
              Selected Amenities ({selected.length})
            </Typography>
            {selected.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                Aucun équipement renvoyé pour ce listing (vérifiez listingAmenitiesIds en base).
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selected.map((a) => (
                  <Chip
                    key={a.id}
                    size="small"
                    label={
                      <span>
                        {a.displayName}
                        <Typography component="span" sx={{ ml: 0.75, fontSize: 11, opacity: 0.85 }}>
                          ×{a.count}
                        </Typography>
                      </span>
                    }
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </Panel>

      <Panel sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Search amenities…</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <SearchIcon sx={{ fontSize: 20, color: t.text3 }} />
          <TextField
            size="small"
            fullWidth
            placeholder="Rechercher dans le catalogue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Stack>
        <Typography sx={{ fontSize: 11, color: t.text3, mt: 1, mb: 1 }}>
          GET /api/v1/listing/amenities?paged=true&amp;useBed=false&amp;ignoreBed=true (aligné dashboard)
          {catalogTotal > 0 ? ` — ~${catalogTotal} résultat(s) côté serveur pour cette requête.` : ''}
        </Typography>
        {catalogLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <Box
            sx={{
              maxHeight: 280,
              overflow: 'auto',
              border: `1px solid ${t.border}`,
              borderRadius: '10px',
              p: 1,
              bgcolor: t.bg2,
            }}
          >
            {catalog.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: t.text3, p: 1 }}>
                Aucun résultat (ou catalogue indisponible). Essayez un autre mot-clé.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0.5}>
                {catalog.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.75,
                      px: 1,
                      borderRadius: '8px',
                      '&:hover': { bgcolor: t.bg1 },
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5 }}>{row.displayName}</Typography>
                    {selected.some((s) => s.id === row.id) && (
                      <Chip size="small" label="Selected" color="primary" variant="outlined" />
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}
        <Typography sx={{ fontSize: 11, color: t.text3, mt: 1.5, fontStyle: 'italic' }}>
          La modification des quantités / de la liste (formik listingAmenitiesIds) reste sur le dashboard admin
          (update-property) — ici lecture seule + recherche catalogue.
        </Typography>
      </Panel>
    </Stack>
  );
}
