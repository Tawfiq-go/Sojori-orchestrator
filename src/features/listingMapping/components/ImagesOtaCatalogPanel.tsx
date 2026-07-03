import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
import { MEDIA_GRID_THEME as T } from '../../../components/listing/upload/mediaGridConstants';
import {
  bootstrapImageOtaCatalogMappings,
  fetchImageOtaCatalogCategories,
  fetchImageOtaCatalogMappings,
  selectPmImageListingModelCatalog,
  updateImageOtaCatalogMapping,
  type ImageOtaCatalogCategoryRow,
  type ImageOtaCatalogMappingFilter,
  type ImageOtaCatalogMappingRow,
  type RuImageIdDetailRow,
} from '../api/listingMappingApi';

const FILTERS: { value: ImageOtaCatalogMappingFilter; label: string }[] = [
  { value: 'curated', label: 'Curaté (OTA actifs)' },
  { value: 'airbnb', label: 'Airbnb actif' },
  { value: 'booking', label: 'Booking actif' },
  { value: 'vrbo', label: 'Vrbo actif' },
  { value: 'to-enrich', label: 'RU à catégoriser' },
  { value: 'listing', label: 'Actifs listing' },
  { value: 'ru-orphan', label: 'Tous orphelins RU' },
  { value: 'all', label: 'Tout' },
];

function categoryIdOf(row: ImageOtaCatalogMappingRow): string {
  const cat = row.categoryId;
  if (cat && typeof cat === 'object' && '_id' in cat) return cat._id;
  return typeof cat === 'string' ? cat : '';
}

export function ImagesOtaCatalogPanel() {
  const [categories, setCategories] = useState<ImageOtaCatalogCategoryRow[]>([]);
  const [rows, setRows] = useState<ImageOtaCatalogMappingRow[]>([]);
  const [filter, setFilter] = useState<ImageOtaCatalogMappingFilter>('curated');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [pmSelecting, setPmSelecting] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [ruAudit, setRuAudit] = useState<{ title: string; details: RuImageIdDetailRow[] } | null>(
    null,
  );

  const categoryTabs = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  useEffect(() => {
    void fetchImageOtaCatalogCategories().then(setCategories).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchImageOtaCatalogMappings({
        filter,
        categoryId: categoryId && categoryId !== '__none__' ? categoryId : undefined,
      });
      setRows(data);
    } catch (e: unknown) {
      toast.error(`Catalogue Image OTA: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.nameSojoriFr,
        r.nameSojoriEn,
        r.nameRu,
        r.airbnb?.nameEn,
        r.booking?.nameEn,
        r.vrbo?.nameEn,
        r.categoryAirbnb,
        ...(r.rentalImageTypeIds || []).map(String),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const pageRows = useMemo(
    () => filtered.slice(page * limit, page * limit + limit),
    [filtered, page, limit],
  );

  const patchRow = async (id: string, patch: Partial<ImageOtaCatalogMappingRow>) => {
    const updated = await updateImageOtaCatalogMapping(id, patch);
    setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const result = await bootstrapImageOtaCatalogMappings({ syncRu: false });
      toast.success(
        `Image OTA : ${result.seed.airbnbRows} espaces Airbnb, ${result.seed.orphanRows} orphelins RU, ${result.merge.idsMerged} IDs fusionnés legacy`,
      );
      await load();
    } catch (e: unknown) {
      toast.error(`Bootstrap Image OTA: ${String(e)}`);
    } finally {
      setBootstrapping(false);
    }
  };

  const handleSelectPmModel = async () => {
    setPmSelecting(true);
    try {
      const result = await selectPmImageListingModelCatalog();
      toast.success(
        `Modèle PM images : ${result.enabledTotal} espaces actifs (${result.airbnbEnabledTotal ?? result.airbnbFirstEnabled} Airbnb)`,
      );
      await load();
    } catch (e: unknown) {
      toast.error(`Modèle PM images: ${String(e)}`);
    } finally {
      setPmSelecting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.text }}>
            Catalogue Image OTA
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3, maxWidth: 640 }}>
            Un nom Sojori par espace photo (base Airbnb). Plusieurs IDs RU peuvent être mappés sur le
            même concept pour faciliter la modélisation PM.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={pmSelecting || bootstrapping}
            onClick={() => void handleSelectPmModel()}
            sx={{ textTransform: 'none' }}
          >
            {pmSelecting ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
            Modèle PM (listing)
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={bootstrapping ? <CircularProgress size={14} color="inherit" /> : <CloudDownloadIcon />}
            disabled={bootstrapping || pmSelecting}
            onClick={() => void handleBootstrap()}
            sx={{ textTransform: 'none' }}
          >
            Bootstrap Image OTA
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filtre</InputLabel>
          <Select label="Filtre" value={filter} onChange={(e) => { setFilter(e.target.value as ImageOtaCatalogMappingFilter); setPage(0); }}>
            {FILTERS.map((f) => (
              <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select label="Catégorie" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}>
            <MenuItem value="">Toutes</MenuItem>
            {categoryTabs.map((c) => (
              <MenuItem key={c._id} value={c._id}>{c.nameFr}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            Catalogue vide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520, mx: 'auto' }}>
            Aucune ligne pour le filtre « {FILTERS.find((f) => f.value === filter)?.label} ».
            {filter !== 'all' ? ' Essayez le filtre « Tout », ou ' : ' '}
            lancez <strong>Bootstrap Image OTA</strong> (connexion admin requise — pas seulement
            VITE_DISABLE_AUTH).
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
            <Button variant="contained" size="small" onClick={() => void handleBootstrap()} disabled={bootstrapping}>
              Bootstrap Image OTA
            </Button>
            {filter !== 'all' && (
              <Button variant="outlined" size="small" onClick={() => setFilter('all')}>
                Voir tout
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '65vh' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>IDs RU</TableCell>
                  <TableCell>Sojori FR</TableCell>
                  <TableCell>Sojori EN</TableCell>
                  <TableCell align="center">Airbnb</TableCell>
                  <TableCell>Nom Airbnb</TableCell>
                  <TableCell align="center">Booking</TableCell>
                  <TableCell>Nom Booking</TableCell>
                  <TableCell align="center">Vrbo</TableCell>
                  <TableCell>Nom Vrbo</TableCell>
                  <TableCell align="center">Listing</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell sx={{ fontSize: 12 }}>{row.categoryAirbnb || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${row.rentalImageTypeIds?.length || 0} ID(s)`}
                        onClick={() =>
                          setRuAudit({
                            title: row.nameSojoriFr,
                            details: row.ruIdDetails || [],
                          })
                        }
                        sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="standard"
                        value={row.nameSojoriFr}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r._id === row._id ? { ...r, nameSojoriFr: e.target.value } : r)),
                          )
                        }
                        onBlur={() => void patchRow(row._id, { nameSojoriFr: row.nameSojoriFr })}
                        sx={{ minWidth: 120 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.nameSojoriEn}</TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(row.airbnb?.enabled)}
                        onChange={(_, v) => void patchRow(row._id, { airbnb: { ...row.airbnb, enabled: v } })}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.airbnb?.nameEn || '—'}</TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(row.booking?.enabled)}
                        onChange={(_, v) => void patchRow(row._id, { booking: { ...row.booking, enabled: v } })}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.booking?.nameEn || '—'}</TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(row.vrbo?.enabled)}
                        onChange={(_, v) => void patchRow(row._id, { vrbo: { ...row.vrbo, enabled: v } })}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{row.vrbo?.nameEn || '—'}</TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(row.enabledForListing && row.listingManageable !== false)}
                        disabled={row.listingManageable === false}
                        title={
                          row.listingManageable === false
                            ? 'Orphelin RU / sans ID RU — Listing toujours OFF'
                            : 'Visible dans la galerie listing PM'
                        }
                        onChange={(_, v) => void patchRow(row._id, { enabledForListing: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.source} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Lignes"
          />
        </>
      )}

      <Dialog open={Boolean(ruAudit)} onClose={() => setRuAudit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>IDs RU — {ruAudit?.title}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ImageTypeID RU</TableCell>
                <TableCell>Nom RU</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(ruAudit?.details || []).map((d) => (
                <TableRow key={d.rentalImageTypeId}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{d.rentalImageTypeId}</TableCell>
                  <TableCell>{d.nameEn}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default ImagesOtaCatalogPanel;
