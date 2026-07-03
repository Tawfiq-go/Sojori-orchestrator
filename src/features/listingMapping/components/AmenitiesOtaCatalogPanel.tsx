import { useCallback, useEffect, useMemo, useState, memo, type Dispatch, type SetStateAction } from 'react';
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
  Link,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CategoryIcon from '@mui/icons-material/Category';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
import { MEDIA_GRID_THEME as T } from '../../../components/listing/upload/mediaGridConstants';
import {
  bootstrapAmenityCatalogMappings,
  assignAirbnbCategoriesCatalogMappings,
  selectPmListingModelCatalog,
  fetchAmenityCatalogCategories,
  fetchAmenityCatalogMappings,
  updateAmenityCatalogMapping,
  type AmenityCatalogCategoryRow,
  type AmenityCatalogMappingFilter,
  type AmenityCatalogMappingRow,
  type RuIdDetailRow,
} from '../api/listingMappingApi';

const FILTERS: { value: AmenityCatalogMappingFilter; label: string }[] = [
  { value: 'curated', label: 'Location courte (curaté)' },
  { value: 'airbnb', label: 'Airbnb actif' },
  { value: 'booking', label: 'Booking actif' },
  { value: 'vrbo', label: 'Vrbo actif' },
  { value: 'to-enrich', label: 'RU à catégoriser' },
  { value: 'basic', label: 'Équipements de base' },
  { value: 'listing', label: 'Actifs listing' },
  { value: 'ru-orphan', label: 'Tous orphelins RU' },
  { value: 'all', label: 'Tout (1626)' },
];

function categoryIdOf(row: AmenityCatalogMappingRow): string {
  const cat = row.categoryId;
  if (cat && typeof cat === 'object' && '_id' in cat) return cat._id;
  return typeof cat === 'string' ? cat : '';
}

function categoryNameFr(row: AmenityCatalogMappingRow): string {
  const cat = row.categoryId;
  if (cat && typeof cat === 'object' && 'nameFr' in cat) return cat.nameFr;
  return row.categoryAirbnb || row.categorySojori || '';
}

export function AmenitiesOtaCatalogPanel() {
  const [categories, setCategories] = useState<AmenityCatalogCategoryRow[]>([]);
  const [rows, setRows] = useState<AmenityCatalogMappingRow[]>([]);
  const [filter, setFilter] = useState<AmenityCatalogMappingFilter>('curated');
  const [listingFlagFilter, setListingFlagFilter] = useState<'all' | 'on' | 'off'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [assigningCategories, setAssigningCategories] = useState(false);
  const [selectingPm, setSelectingPm] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(100);
  const [ruAudit, setRuAudit] = useState<{
    title: string;
    details: RuIdDetailRow[];
  } | null>(null);
  const airbnbCategories = useMemo(
    () => [...categories.filter((c) => c.source === 'airbnb')].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const categoryTabs = useMemo(() => {
    const orphan = categories.filter((c) => c.source === 'ru-orphan');
    return [...airbnbCategories, ...orphan];
  }, [categories, airbnbCategories]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const id = categoryIdOf(row) || '__none__';
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [rows]);

  const categoryListingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.enabledForListing) continue;
      const id = categoryIdOf(row) || '__none__';
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [rows]);

  useEffect(() => {
    void fetchAmenityCatalogCategories().then(setCategories).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const apiCategoryId =
        categoryId && categoryId !== '__none__' ? categoryId : undefined;
      const data = await fetchAmenityCatalogMappings({
        filter,
        categoryId: apiCategoryId,
      });
      setRows(data);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'API catalogue indisponible (srv-listing pas à jour ?)';
      setLoadError(msg);
      setRows([]);
      toast.error('Impossible de charger le catalogue OTA');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (categoryId === '__none__') {
      list = list.filter((r) => !categoryIdOf(r));
    }
    if (listingFlagFilter === 'on') {
      list = list.filter((r) => r.enabledForListing);
    } else if (listingFlagFilter === 'off') {
      list = list.filter((r) => !r.enabledForListing);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const hay = [
        categoryNameFr(r),
        r.nameRu,
        r.nameSojoriFr,
        r.nameSojoriEn,
        r.airbnb?.nameEn,
        r.booking?.nameEn,
        r.vrbo?.nameEn,
        r.categoryBooking,
        r.categoryVrbo,
        ...(r.rentalAmenityIds || []).map(String),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, categoryId, listingFlagFilter]);

  const pageRows = filtered.slice(page * limit, page * limit + limit);

  const stats = useMemo(
    () => ({
      shown: rows.length,
      categories: categories.length,
      basic: rows.filter((r) => r.isBasicEquipment).length,
      airbnb: rows.filter((r) => r.airbnb?.enabled).length,
      booking: rows.filter((r) => r.booking?.enabled).length,
      vrbo: rows.filter((r) => r.vrbo?.enabled).length,
      orphan: rows.filter((r) => r.source === 'ru-orphan').length,
      listing: rows.filter((r) => r.enabledForListing).length,
    }),
    [rows, categories],
  );

  const patchRow = async (id: string, patch: Partial<AmenityCatalogMappingRow>) => {
    try {
      const updated = await updateAmenityCatalogMapping(id, patch);
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      toast.error('Mise à jour impossible');
      console.error(e);
    }
  };

  const assignCategory = async (row: AmenityCatalogMappingRow, newCategoryId: string) => {
    await patchRow(row._id, { categoryId: newCategoryId || undefined });
    if (row.source === 'ru-orphan' && newCategoryId && !row.airbnb?.enabled) {
      await patchRow(row._id, {
        airbnb: {
          enabled: true,
          nameEn: row.airbnb?.nameEn || row.nameSojoriEn || row.nameRu,
        },
      });
      toast.info('Airbnb activé — ligne visible dans « Location courte »');
    }
  };

  const handleBootstrap = async () => {
    if (
      !window.confirm(
        'Bootstrap catalogue : seed Airbnb (139) + fusion RU sémantique + Booking/Vrbo depuis le doc RU embarqué.\n\nLes amenities Mongo existantes sont conservées (pas de sync API RU). Les réglages manuels sur les lignes seront réinitialisés.',
      )
    ) {
      return;
    }
    setBootstrapping(true);
    try {
      const result = await bootstrapAmenityCatalogMappings();
      toast.success(
        `Bootstrap OK — ${result.curatedTotal} lignes curatées · catégories ${result.categories.updated} mises à jour (${result.categories.stillOrphanCategory} encore RU orphelin) · Booking +${result.ota.bookingEnabled} · Vrbo +${result.ota.vrboEnabled}`,
      );
      const cats = await fetchAmenityCatalogCategories();
      setCategories(cats);
      await load();
    } catch (e) {
      toast.error('Échec bootstrap catalogue');
      console.error(e);
    } finally {
      setBootstrapping(false);
    }
  };

  const handleAssignCategories = async () => {
    setAssigningCategories(true);
    try {
      const result = await assignAirbnbCategoriesCatalogMappings();
      toast.success(
        `Catégories assignées : ${result.updated} lignes · ${result.stillOrphanCategory} restent en « RU hors catalogue » (listing inchangé)`,
      );
      await load();
    } catch (e) {
      toast.error('Échec assignation catégories');
      console.error(e);
    } finally {
      setAssigningCategories(false);
    }
  };

  const handleSelectPmModel = async () => {
    if (
      !window.confirm(
        'Appliquer le modèle PM ?\n\nActive enabledForListing sur ~139 Airbnb-first + ajouts Booking utiles (≤350), exclut hôtel/politiques.',
      )
    ) {
      return;
    }
    setSelectingPm(true);
    try {
      const result = await selectPmListingModelCatalog();
      toast.success(
        `Modèle PM : ${result.enabledTotal} lignes (${result.airbnbFirstEnabled} Airbnb + ${result.ruOrphanEnabled} ajouts RU)`,
      );
      if (result.excludedHotel.length) {
        console.info('Exclus hôtel:', result.excludedHotel);
      }
      await load();
    } catch (e) {
      toast.error('Échec modèle PM');
      console.error(e);
    } finally {
      setSelectingPm(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.text }}>
            Catalogue OTA
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            Pivot Airbnb + Booking + Vrbo — catégories, libellés Sojori, activation listing
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            color="success"
            startIcon={
              selectingPm ? <CircularProgress size={16} color="inherit" /> : <ChecklistIcon />
            }
            disabled={selectingPm || bootstrapping || assigningCategories}
            onClick={() => void handleSelectPmModel()}
            sx={{ textTransform: 'none' }}
          >
            Modèle PM (listing)
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              assigningCategories ? <CircularProgress size={16} color="inherit" /> : <CategoryIcon />
            }
            disabled={assigningCategories || bootstrapping}
            onClick={() => void handleAssignCategories()}
            sx={{ textTransform: 'none' }}
          >
            Catégoriser auto
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={bootstrapping ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
            disabled={bootstrapping}
            onClick={() => void handleBootstrap()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Bootstrap catalogue
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          size="small"
          label={`Toutes (${rows.length} - ${stats.listing})`}
          color={!categoryId ? 'primary' : 'default'}
          onClick={() => {
            setCategoryId('');
            setPage(0);
          }}
        />
        {categoryTabs.map((c) => {
          const active = categoryId === c._id;
          const n = categoryCounts.get(c._id) ?? 0;
          const listingN = categoryListingCounts.get(c._id) ?? 0;
          return (
            <Chip
              key={c._id}
              size="small"
              color={active ? 'primary' : c.isBasicEquipment ? 'warning' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              label={`${c.nameFr} (${n} - ${listingN})`}
              title={`${n} affichée(s) · ${listingN} Listing ON`}
              onClick={() => {
                setCategoryId(c._id);
                setPage(0);
              }}
            />
          );
        })}
        {(categoryCounts.get('__none__') ?? 0) > 0 && (
          <Chip
            size="small"
            color={categoryId === '__none__' ? 'primary' : 'default'}
            variant="outlined"
            label={`Sans catégorie (${categoryCounts.get('__none__')} - ${categoryListingCounts.get('__none__') ?? 0})`}
            onClick={() => {
              setCategoryId('__none__');
              setPage(0);
            }}
          />
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label={`Affichées ${stats.shown}`} title={`Filtre API : ${filter}`} />
        <Chip
          size="small"
          variant={filter === 'curated' ? 'filled' : 'outlined'}
          label={`Curaté ${filter === 'curated' ? stats.shown : '—'}`}
        />
        <Chip size="small" color="warning" label={`Équip. base ${stats.basic}`} />
        <Chip size="small" color="primary" label={`Airbnb ${stats.airbnb}`} />
        <Chip size="small" color="secondary" label={`Booking ${stats.booking}`} />
        <Chip size="small" sx={{ bgcolor: '#0E64A4', color: '#fff' }} label={`Vrbo ${stats.vrbo}`} />
        <Chip size="small" label={`Orphelins (filtre) ${stats.orphan}`} />
        <Chip size="small" color="success" label={`Listing ON ${stats.listing}`} title="enabledForListing — même périmètre que le formulaire listing PM" />
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: { sm: 'center' } }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filtre</InputLabel>
          <Select
            label="Filtre"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as AmenityCatalogMappingFilter);
              setPage(0);
            }}
          >
            {FILTERS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Listing</InputLabel>
          <Select
            label="Listing"
            value={listingFlagFilter}
            onChange={(e) => {
              setListingFlagFilter(e.target.value as 'all' | 'on' | 'off');
              setPage(0);
            }}
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="on">Listing ON</MenuItem>
            <MenuItem value="off">Listing OFF</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ opacity: 0.5 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
        />
        <Typography sx={{ fontSize: 12, color: T.text3, whiteSpace: 'nowrap' }}>
          {search.trim() ? `${filtered.length} / ${rows.length}` : rows.length} amenity(s)
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : loadError ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" sx={{ mb: 1 }}>
            Catalogue OTA inaccessible
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {loadError}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
            Vérifiez que srv-listing est déployé avec les routes /amenities/catalog-mapping (pas une image main
            sans cette feature).
          </Typography>
          <Button variant="outlined" size="small" onClick={() => void load()}>
            Réessayer
          </Button>
        </Paper>
      ) : (
        <>
          {rows.length === 0 && filter === 'vrbo' && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Aucune ligne Vrbo — l&apos;enrichissement OTA n&apos;a pas encore été appliqué.
              </Typography>
              <Button variant="contained" size="small" onClick={() => void handleBootstrap()}>
                Bootstrap catalogue (Booking + Vrbo)
              </Button>
            </Paper>
          )}
          <AmenityRowsTable
            rows={pageRows}
            filter={filter}
            airbnbCategories={airbnbCategories}
            onPatch={patchRow}
            onAssignCategory={assignCategory}
            onLocalUpdate={setRows}
            onAuditRuIds={(title, details) => setRuAudit({ title, details })}
          />
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
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Lignes"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          />
        </>
      )}

      <Dialog open={Boolean(ruAudit)} onClose={() => setRuAudit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          IDs RU — {ruAudit?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID RU</TableCell>
                <TableCell>Nom RU (anglais)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(ruAudit?.details || []).map((d) => (
                <TableRow key={d.rentalAmenityId}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{d.rentalAmenityId}</TableCell>
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

function AmenityRowsTable({
  rows,
  filter,
  airbnbCategories,
  onPatch,
  onAssignCategory,
  onLocalUpdate,
  onAuditRuIds,
}: {
  rows: AmenityCatalogMappingRow[];
  filter: AmenityCatalogMappingFilter;
  airbnbCategories: AmenityCatalogCategoryRow[];
  onPatch: (id: string, patch: Partial<AmenityCatalogMappingRow>) => Promise<void>;
  onAssignCategory: (row: AmenityCatalogMappingRow, categoryId: string) => Promise<void>;
  onLocalUpdate: Dispatch<SetStateAction<AmenityCatalogMappingRow[]>>;
  onAuditRuIds: (title: string, details: RuIdDetailRow[]) => void;
}) {
  if (!rows.length) {
    const hint =
      filter === 'vrbo'
        ? 'Filtre Vrbo actif : 0 ligne — lancez « Bootstrap catalogue ».'
        : filter === 'booking'
          ? 'Filtre Booking actif : 0 ligne.'
          : 'Aucune ligne — changez le filtre (ex. « RU à catégoriser »)';
    return (
      <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
        {hint}
      </Typography>
    );
  }
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 200 }}>Catégorie Airbnb</TableCell>
            <TableCell align="center">Équip. base</TableCell>
            <TableCell>IDs RU</TableCell>
            <TableCell>Nom RU</TableCell>
            <TableCell>Sojori FR</TableCell>
            <TableCell>Sojori EN</TableCell>
            <TableCell align="center">Airbnb</TableCell>
            <TableCell>Nom Airbnb EN</TableCell>
            <TableCell align="center">Booking</TableCell>
            <TableCell>Nom Booking EN</TableCell>
            <TableCell>Cat. Booking</TableCell>
            <TableCell align="center">Vrbo</TableCell>
            <TableCell>Nom Vrbo</TableCell>
            <TableCell>Scope Vrbo</TableCell>
            <TableCell align="center">Listing</TableCell>
            <TableCell>Source</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <AmenityTableRow
              key={row._id}
              row={row}
              airbnbCategories={airbnbCategories}
              onPatch={onPatch}
              onAssignCategory={onAssignCategory}
              onLocalUpdate={onLocalUpdate}
              onAuditRuIds={onAuditRuIds}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Select natif : 200× MUI Select + MenuItem faisait planter l'onglet (DOM trop lourd). */
const AmenityTableRow = memo(function AmenityTableRow({
  row,
  airbnbCategories,
  onPatch,
  onAssignCategory,
  onLocalUpdate,
  onAuditRuIds,
}: {
  row: AmenityCatalogMappingRow;
  airbnbCategories: AmenityCatalogCategoryRow[];
  onPatch: (id: string, patch: Partial<AmenityCatalogMappingRow>) => Promise<void>;
  onAssignCategory: (row: AmenityCatalogMappingRow, categoryId: string) => Promise<void>;
  onLocalUpdate: Dispatch<SetStateAction<AmenityCatalogMappingRow[]>>;
  onAuditRuIds: (title: string, details: RuIdDetailRow[]) => void;
}) {
  const categoryValue = categoryIdOf(row);

  return (
    <TableRow hover selected={Boolean(row.enabledForListing && row.listingManageable !== false)}>
      <TableCell>
        <Box
          component="select"
          value={categoryValue}
          onChange={(e) => void onAssignCategory(row, e.target.value)}
          sx={{
            width: '100%',
            minWidth: 160,
            maxWidth: 220,
            fontSize: 12,
            py: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          <option value="">— Choisir catégorie —</option>
          {airbnbCategories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.nameFr}
            </option>
          ))}
        </Box>
        {row.isBasicEquipment && (
          <Chip size="small" color="warning" label="Équipements de base" sx={{ mt: 0.5 }} />
        )}
      </TableCell>
      <TableCell align="center">
        <Switch
          size="small"
          color="warning"
          checked={row.isBasicEquipment}
          onChange={(_, v) => void onPatch(row._id, { isBasicEquipment: v })}
        />
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
        {(row.rentalAmenityIds || []).length > 1 ? (
          <Link
            component="button"
            type="button"
            underline="hover"
            sx={{ fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}
            onClick={() =>
              onAuditRuIds(
                row.nameSojoriFr || row.nameSojoriEn,
                row.ruIdDetails ||
                  (row.rentalAmenityIds || []).map((id) => ({
                    rentalAmenityId: id,
                    nameEn: '—',
                  })),
              )
            }
          >
            {(row.rentalAmenityIds || []).join(', ')}
          </Link>
        ) : (
          (row.rentalAmenityIds || []).join(', ') || '—'
        )}
      </TableCell>
      <TableCell>{row.nameRu}</TableCell>
      <TableCell>
        <TextField
          size="small"
          variant="standard"
          value={row.nameSojoriFr}
          onChange={(e) =>
            onLocalUpdate((prev) =>
              prev.map((r) => (r._id === row._id ? { ...r, nameSojoriFr: e.target.value } : r)),
            )
          }
          onBlur={(e) => void onPatch(row._id, { nameSojoriFr: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          variant="standard"
          value={row.nameSojoriEn}
          onChange={(e) =>
            onLocalUpdate((prev) =>
              prev.map((r) => (r._id === row._id ? { ...r, nameSojoriEn: e.target.value } : r)),
            )
          }
          onBlur={(e) => void onPatch(row._id, { nameSojoriEn: e.target.value })}
        />
      </TableCell>
      <TableCell align="center">
        <Switch
          size="small"
          checked={Boolean(row.airbnb?.enabled)}
          onChange={(_, v) =>
            void onPatch(row._id, {
              airbnb: {
                enabled: v,
                nameEn: row.airbnb?.nameEn || row.nameSojoriEn || row.nameRu,
              },
            })
          }
        />
      </TableCell>
      <TableCell sx={{ fontSize: 12 }}>{row.airbnb?.nameEn}</TableCell>
      <TableCell align="center">
        <Switch
          size="small"
          checked={Boolean(row.booking?.enabled)}
          onChange={(_, v) =>
            void onPatch(row._id, {
              booking: {
                enabled: v,
                nameEn: row.booking?.nameEn || row.nameSojoriEn || row.nameRu,
              },
            })
          }
        />
      </TableCell>
      <TableCell sx={{ fontSize: 12 }}>{row.booking?.nameEn}</TableCell>
      <TableCell sx={{ fontSize: 11 }}>{row.categoryBooking || '—'}</TableCell>
      <TableCell align="center">
        <Switch
          size="small"
          checked={Boolean(row.vrbo?.enabled)}
          onChange={(_, v) =>
            void onPatch(row._id, {
              vrbo: {
                enabled: v,
                nameEn: row.vrbo?.nameEn || row.nameSojoriEn || row.nameRu,
              },
            })
          }
        />
      </TableCell>
      <TableCell sx={{ fontSize: 12 }}>{row.vrbo?.nameEn}</TableCell>
      <TableCell sx={{ fontSize: 11 }}>{row.categoryVrbo || '—'}</TableCell>
      <TableCell align="center">
        <Tooltip
          title={
            row.listingManageable === false
              ? 'Orphelin RU / hôtel — listing PM toujours OFF (non modifiable)'
              : 'Afficher dans le formulaire listing PM'
          }
        >
          <span>
            <Switch
              size="small"
              color="success"
              checked={Boolean(row.enabledForListing && row.listingManageable !== false)}
              disabled={row.listingManageable === false}
              onChange={(_, v) => void onPatch(row._id, { enabledForListing: v })}
            />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Chip size="small" label={row.source} variant="outlined" />
      </TableCell>
    </TableRow>
  );
});

export default AmenitiesOtaCatalogPanel;
