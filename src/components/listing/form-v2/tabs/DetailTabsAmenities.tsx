/**
 * Onglet Équipements
 * - Single : catalogue existant (AmenitiesTab)
 * - Multi : filtres catégorie + checklist cochable (pas « Ajouter ») + chips Partage OTA
 * Mapping RU inchangé : _id catalogue → rentalAmenityIds au sync.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AmenitiesTabUi from '../../amenities/AmenitiesTab';
import { useSojoriAmenitiesData } from '../../amenities/useSojoriAmenitiesData';
import { getCategoryMeta } from '../../amenities/_tokens';
import { FieldIndicator } from '../components/FieldIndicator';
import { RuFormLegend } from './_shared';
import type { Amenity, SelectedAmenity } from '../../amenities/_tokens';

interface ListingAmenityRow {
  _id: string;
  count: number;
  shareToAllRoomTypes?: boolean;
  roomTypeIds?: string[];
  amenityData?: {
    name?: string | { fr?: string; en?: string };
    compositionRooms?: Array<{ roomId?: string | number }>;
    iconUrl?: string;
    basic?: boolean;
    SojoriSubcategory?: unknown[];
  };
}

interface AmenitiesTabProps {
  values: {
    listingAmenitiesIds?: ListingAmenityRow[];
    propertyUnit?: string;
    roomTypes?: Array<Record<string, unknown>>;
  };
  onChange: (field: string, value: unknown) => void;
  listingId?: string;
}

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
};

type FilterMode = 'all' | 'selected' | 'basic' | string;

/**
 * Bruit catalogue RU/tests/composition lits — pas des équipements listing réels.
 * Masqué en Multi (owner + admin) ; le mapping OTA admin reste intact.
 */
function isCatalogNoiseAmenity(a: Amenity): boolean {
  if (a.useBed) return true;
  const n = `${a.nameFr || ''} ${a.nameEn || ''}`.trim();
  if (!n) return true;
  if (/^FEAT-\d+/i.test(n)) return true;
  if (/Space feature/i.test(n)) return true;
  if (/^(Test space|Wemeldinge|DayOffer|YECOMF\b|TAC$|Room2|Address(\s+Lisbon)?|Twin Phones)$/i.test(n)) {
    return true;
  }
  if (/^Beyond-(Baths|Bedrooms)/i.test(n)) return true;
  if (/^\d+\s*(BR|Bathrooms?|Bedrooms?|Double Beds?|King Size Beds?|Single Beds?)\b/i.test(n)) {
    return true;
  }
  if (/^(double bed|DOUBLE BED|king Bed|Lit King Size)$/i.test(n)) return true;
  if (/^\d{1,4}$/.test(n)) return true;
  return false;
}

function toSelected(items: ListingAmenityRow[] | undefined): SelectedAmenity[] {
  return (items ?? []).map((item) => ({
    _id: String(item._id),
    count: Math.max(1, Number(item.count) || 1),
    roomRentalIds: (item.amenityData?.compositionRooms ?? [])
      .map((r) => String(r.roomId ?? ''))
      .filter(Boolean),
  }));
}

function toListingRows(
  next: SelectedAmenity[],
  catalogById: Map<string, Amenity>,
  prevRows: ListingAmenityRow[],
  opts?: { defaultShareAll?: boolean },
): ListingAmenityRow[] {
  const prevById = new Map(prevRows.map((r) => [String(r._id), r]));
  return next.map((s) => {
    const am = catalogById.get(s._id);
    const prev = prevById.get(s._id);
    const isNew = !prev;
    return {
      _id: s._id,
      count: s.count,
      ...(prev?.shareToAllRoomTypes !== undefined
        ? { shareToAllRoomTypes: prev.shareToAllRoomTypes }
        : isNew && opts?.defaultShareAll
          ? { shareToAllRoomTypes: true, roomTypeIds: [] }
          : {}),
      ...(Array.isArray(prev?.roomTypeIds) ? { roomTypeIds: prev.roomTypeIds } : {}),
      amenityData: am
        ? {
            name: { fr: am.nameFr, en: am.nameEn },
            iconUrl: am.iconUrl,
            basic: am.basic,
            SojoriSubcategory: am.categories.map((c) => ({ fr: c })),
            compositionRooms: (s.roomRentalIds ?? []).map((roomId) => ({ roomId })),
          }
        : prev?.amenityData,
    };
  });
}

function amenityLabel(row: ListingAmenityRow, catalogById: Map<string, Amenity>): string {
  const fromCat = catalogById.get(String(row._id));
  if (fromCat?.nameFr) return fromCat.nameFr;
  if (fromCat?.nameEn) return fromCat.nameEn;
  const n = row.amenityData?.name;
  if (typeof n === 'string' && n.trim()) return n;
  if (n && typeof n === 'object') {
    const s = String(n.fr || n.en || '').trim();
    if (s) return s;
  }
  return `Équipement …${String(row._id).slice(-6)}`;
}

function shareStatusLabel(row: ListingAmenityRow): string {
  if (row.shareToAllRoomTypes === true) return 'Toutes unités';
  const ids = Array.isArray(row.roomTypeIds) ? row.roomTypeIds : [];
  if (row.shareToAllRoomTypes === false && ids.length === 0) return 'Building only';
  if (ids.length > 0) return `${ids.length} type(s)`;
  return 'Tous (défaut)';
}

type RoomTypeOpt = { id: string; name: string };

function filterChipSx(on: boolean) {
  return {
    textTransform: 'none' as const,
    fontSize: 11,
    fontWeight: 700,
    py: 0.25,
    px: 1,
    minHeight: 0,
    lineHeight: 1.35,
    bgcolor: on ? T.primary : 'transparent',
    color: on ? '#fff' : T.text2,
    borderColor: T.borderStrong,
    '&:hover': { bgcolor: on ? T.primaryDeep : T.primaryTint },
  };
}

function MultiAmenitiesChecklist({
  rows,
  catalog,
  catalogById,
  catalogCategories,
  roomTypeOptions,
  onChangeRows,
  loading,
}: {
  rows: ListingAmenityRow[];
  catalog: Amenity[];
  catalogById: Map<string, Amenity>;
  catalogCategories: string[];
  roomTypeOptions: RoomTypeOpt[];
  onChangeRows: (next: ListingAmenityRow[]) => void;
  loading?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('selected');

  const selectedMap = useMemo(() => {
    const m = new Map<string, ListingAmenityRow>();
    rows.forEach((r) => m.set(String(r._id), r));
    return m;
  }, [rows]);

  /** Catalogue Multi utile — hors lits / bruit RU-tests. */
  const usableCatalog = useMemo(
    () => catalog.filter((a) => !isCatalogNoiseAmenity(a)),
    [catalog],
  );

  const categoryFilters = useMemo(() => {
    const fromUsable = [...new Set(usableCatalog.flatMap((a) => a.categories))].sort();
    if (!catalogCategories.length) return fromUsable;
    // garder l’ordre catalogue PM, sans catégories vides après filtre bruit
    const usableSet = new Set(fromUsable);
    return catalogCategories.filter((c) => usableSet.has(c));
  }, [catalogCategories, usableCatalog]);

  const counts = useMemo(() => {
    const all = usableCatalog.length;
    const selected = rows.filter((r) => {
      const a = catalogById.get(String(r._id));
      return a ? !isCatalogNoiseAmenity(a) : true;
    }).length;
    const basicPool = usableCatalog.filter((a) => a.basic);
    const basicSelected = rows.filter((r) => catalogById.get(String(r._id))?.basic).length;
    const byCat: Record<string, { sel: number; tot: number }> = {};
    for (const cat of categoryFilters) {
      const tot = usableCatalog.filter((a) => a.categories.includes(cat)).length;
      const sel = rows.filter((r) => {
        const a = catalogById.get(String(r._id));
        return a && !isCatalogNoiseAmenity(a) && a.categories.includes(cat);
      }).length;
      byCat[cat] = { sel, tot };
    }
    return {
      selected,
      all,
      basicSelected,
      basic: basicPool.length,
      byCat,
    };
  }, [rows, usableCatalog, catalogById, categoryFilters]);

  const visible = useMemo(() => {
    let list = usableCatalog;
    if (filter === 'selected') list = list.filter((a) => selectedMap.has(a._id));
    else if (filter === 'basic') list = list.filter((a) => a.basic);
    else if (filter !== 'all') {
      list = list.filter((a) => a.categories.includes(filter));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.nameFr.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      const aOn = selectedMap.has(a._id) ? 0 : 1;
      const bOn = selectedMap.has(b._id) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return (a.nameFr || a.nameEn).localeCompare(b.nameFr || b.nameEn, 'fr');
    });
  }, [usableCatalog, filter, query, selectedMap]);

  const toggle = useCallback(
    (am: Amenity) => {
      if (selectedMap.has(am._id)) {
        onChangeRows(rows.filter((r) => String(r._id) !== am._id));
        return;
      }
      onChangeRows([
        ...rows,
        {
          _id: am._id,
          count: 1,
          shareToAllRoomTypes: true,
          roomTypeIds: [],
          amenityData: {
            name: { fr: am.nameFr, en: am.nameEn },
            iconUrl: am.iconUrl,
            basic: am.basic,
            SojoriSubcategory: am.categories.map((c) => ({ fr: c })),
            compositionRooms: [],
          },
        },
      ]);
    },
    [onChangeRows, rows, selectedMap],
  );

  const patchRow = useCallback(
    (amenityId: string, patch: Partial<ListingAmenityRow>) => {
      onChangeRows(
        rows.map((r) => (String(r._id) === String(amenityId) ? { ...r, ...patch } : r)),
      );
    },
    [onChangeRows, rows],
  );

  if (loading) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.text3, py: 2 }}>
        Chargement catalogue…
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.4 }}>
        Cochez pour activer. Chiffres = sélectionnés / disponibles. Partage : Toutes unités ou types.
      </Typography>

      <TextField
        size="small"
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher… Wifi, piscine, parking"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': { bgcolor: T.bg2, fontSize: 13, py: 0.1 },
        }}
      />

      <Stack direction="row" gap={0.4} flexWrap="wrap" useFlexGap>
        {(
          [
            {
              id: 'selected' as const,
              label: `Sélectionnés ${counts.selected}/${counts.all}`,
            },
            {
              id: 'all' as const,
              label: `Tous ${counts.all}`,
            },
            {
              id: 'basic' as const,
              label: `Basic ${counts.basicSelected}/${counts.basic}`,
            },
          ] as const
        ).map((f) => (
          <Button
            key={f.id}
            size="small"
            variant={filter === f.id ? 'contained' : 'outlined'}
            onClick={() => setFilter(f.id)}
            sx={filterChipSx(filter === f.id)}
          >
            {f.label}
          </Button>
        ))}
        {categoryFilters.map((cat) => {
          const c = counts.byCat[cat] || { sel: 0, tot: 0 };
          const short = getCategoryMeta(cat).short || cat;
          return (
            <Button
              key={cat}
              size="small"
              variant={filter === cat ? 'contained' : 'outlined'}
              onClick={() => setFilter(cat)}
              sx={filterChipSx(filter === cat)}
              title={cat}
            >
              {short} {c.sel}/{c.tot}
            </Button>
          );
        })}
      </Stack>

      <Box
        sx={{
          border: `1px solid ${T.border}`,
          borderRadius: 1,
          maxHeight: 480,
          overflowY: 'auto',
          bgcolor: '#fff',
        }}
      >
        {visible.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: T.text3, p: 1.5, textAlign: 'center' }}>
            {filter === 'selected'
              ? 'Aucun équipement sélectionné — passez sur « Tous » pour cocher.'
              : 'Aucun résultat pour ce filtre.'}
          </Typography>
        ) : (
          visible.map((am) => {
            const row = selectedMap.get(am._id);
            const on = Boolean(row);
            const shareAll = row?.shareToAllRoomTypes === true;
            const ids = Array.isArray(row?.roomTypeIds) ? row!.roomTypeIds! : [];
            return (
              <Box
                key={am._id}
                sx={{
                  px: 1,
                  py: 0.55,
                  borderBottom: `1px solid ${T.border}`,
                  bgcolor: on ? T.primaryTint : 'transparent',
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Stack direction="row" alignItems="flex-start" gap={0.5}>
                  <Checkbox
                    size="small"
                    checked={on}
                    onChange={() => toggle(am)}
                    sx={{
                      p: 0.35,
                      mt: 0.1,
                      color: T.text3,
                      '&.Mui-checked': { color: T.primaryDeep },
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="baseline" gap={0.75} flexWrap="wrap">
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: on ? 700 : 500,
                          color: T.text,
                          lineHeight: 1.25,
                        }}
                      >
                        {am.nameFr || am.nameEn}
                      </Typography>
                      {am.basic ? (
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.primaryDeep }}>
                          Basic
                        </Typography>
                      ) : null}
                      {on ? (
                        <Typography sx={{ fontSize: 10, color: T.text3 }}>
                          {shareStatusLabel(row!)}
                        </Typography>
                      ) : null}
                    </Stack>
                    {am.nameEn && am.nameFr && am.nameEn !== am.nameFr ? (
                      <Typography sx={{ fontSize: 10.5, color: T.text3, lineHeight: 1.2 }}>
                        {am.nameEn}
                      </Typography>
                    ) : null}

                    {on ? (
                      <Stack direction="row" gap={0.35} flexWrap="wrap" sx={{ mt: 0.4 }}>
                        <Button
                          size="small"
                          variant={shareAll ? 'contained' : 'outlined'}
                          onClick={() =>
                            patchRow(am._id, {
                              shareToAllRoomTypes: !shareAll,
                              roomTypeIds: !shareAll ? [] : ids,
                            })
                          }
                          sx={filterChipSx(shareAll)}
                        >
                          Toutes unités
                        </Button>
                        {!shareAll &&
                          roomTypeOptions.map((rt) => {
                            const rtOn = ids.includes(rt.id);
                            return (
                              <Button
                                key={rt.id}
                                size="small"
                                variant={rtOn ? 'contained' : 'outlined'}
                                onClick={() => {
                                  const next = rtOn
                                    ? ids.filter((x) => x !== rt.id)
                                    : [...ids, rt.id];
                                  patchRow(am._id, {
                                    shareToAllRoomTypes: false,
                                    roomTypeIds: next,
                                  });
                                }}
                                sx={filterChipSx(rtOn)}
                              >
                                {rt.name}
                              </Button>
                            );
                          })}
                      </Stack>
                    ) : null}
                  </Box>
                </Stack>
              </Box>
            );
          })
        )}
      </Box>
    </Stack>
  );
}

export default function AmenitiesTab({ values, onChange, listingId = '' }: AmenitiesTabProps) {
  const { catalog, catalogById, categories, rooms, loading } = useSojoriAmenitiesData(listingId);

  const selected = useMemo(() => toSelected(values.listingAmenitiesIds), [values.listingAmenitiesIds]);
  const isMulti = values.propertyUnit === 'Multi';
  const propertyUnit = values.propertyUnit === 'Single' ? 'Single' : 'Multi';

  const roomTypeOptions = useMemo(
    () =>
      (values.roomTypes ?? [])
        .map((rt, i) => ({
          id: String(rt._id || ''),
          name: String(rt.otaDisplayName || rt.roomTypeName || `Type ${i + 1}`),
        }))
        .filter((r) => Boolean(r.id)),
    [values.roomTypes],
  );

  const handleChange = useCallback(
    (next: SelectedAmenity[]) => {
      onChange(
        'listingAmenitiesIds',
        toListingRows(next, catalogById, values.listingAmenitiesIds ?? [], {
          defaultShareAll: isMulti,
        }),
      );
    },
    [onChange, catalogById, values.listingAmenitiesIds, isMulti],
  );

  const handleMultiRows = useCallback(
    (next: ListingAmenityRow[]) => {
      onChange('listingAmenitiesIds', next);
    },
    [onChange],
  );

  if (!listingId) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
        Enregistrez le listing avant de configurer les équipements.
      </Box>
    );
  }

  return (
    <Box>
      {!isMulti && <RuFormLegend />}
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {isMulti ? 'Équipements · Partage OTA' : 'Équipements'}
        </Typography>
        <FieldIndicator field="listingAmenitiesIds" dense />
        {isMulti ? (
          <Typography sx={{ fontSize: 11, color: T.text3, ml: 0.5 }}>
            {(values.listingAmenitiesIds ?? []).length} coché
            {(values.listingAmenitiesIds ?? []).length !== 1 ? 's' : ''}
          </Typography>
        ) : null}
      </Stack>

      {isMulti ? (
        <MultiAmenitiesChecklist
          rows={values.listingAmenitiesIds ?? []}
          catalog={catalog}
          catalogById={catalogById}
          catalogCategories={categories}
          roomTypeOptions={roomTypeOptions}
          onChangeRows={handleMultiRows}
          loading={loading}
        />
      ) : (
        <AmenitiesTabUi
          catalog={catalog}
          catalogCategories={categories}
          rooms={rooms}
          value={selected}
          onChange={handleChange}
          propertyUnit={propertyUnit}
          loading={loading}
        />
      )}
    </Box>
  );
}
