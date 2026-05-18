import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAmenities } from '../../../../contexts/AmenitiesContext';
import {
  amenityMatchesCatalogCategories,
  getAllEnabledCompositionRoomIds,
  listingAmenityMatchesRoomTab,
  resolveRoomIdsForTab,
  resolveSelectedCategoriesForTab,
} from '../../../../services/listingsService';
import { AmenityCard } from '../components/AmenityCard';
import { RoomSelectionModal } from '../components/RoomSelectionModal';
import { RuFormLegend } from './_shared';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  return debounced;
}

interface AmenityData {
  _id: string;
  name: string | { en?: string; fr?: string; ar?: string };
  iconUrl?: string;
  compositionRooms?: Array<{
    roomId: string;
    roomType: string;
  }>;
  SojoriSubcategory?: string[];
  basic?: boolean;
  category?: string;
}

interface ListingAmenity {
  _id: string;
  count: number;
  amenityData?: AmenityData;
}

interface RoomAmenity {
  amenityId: string;
  count: number;
}

interface RoomType {
  roomAmenities?: RoomAmenity[];
  // ... other room fields
}

interface AmenitiesTabProps {
  values: {
    listingAmenitiesIds?: ListingAmenity[];
    roomTypes?: RoomType[];
  };
  onChange: (field: string, value: any) => void;
  listingId?: string;
}

const T = {
  bg1: '#ffffff',
  bg2: '#f8f9fa',
  bg3: '#f0eee8',
  border: '#e2e8f0',
  borderStrong: 'rgba(20,17,10,0.14)',
  text: '#1a1408',
  text2: '#64748b',
  text3: '#94a3b8',
  text4: '#a8a299',
  accent: '#b8851a',
  accentHover: '#8f6814',
  accentTint: 'rgba(184,133,26,0.10)',
  success: '#10b981',
  ai: '#7c3aed',
  aiTint: 'rgba(124,58,237,0.08)',
  aiBorder: 'rgba(124,58,237,0.20)',
};

function Card({ title, meta, children }: { title: React.ReactNode; meta?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 2.25, mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.75 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{title}</Typography>
        {meta && (
          <Typography sx={{ ml: 'auto', fontSize: 10.5, color: T.text3, fontFamily: 'Geist Mono' }}>
            {meta}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}


function getAmenityName(name: string | { en?: string; fr?: string; ar?: string }): string {
  if (typeof name === 'string') return name;
  return name.fr || name.en || name.ar || 'Nom indisponible';
}

type RoomTabOption = { id: string; label: string; rentalId?: string | number };

function getRoomLabelFromComposition(room: Record<string, unknown>, index: number): string {
  const sojori = room.RoomNameSojori;
  if (sojori && typeof sojori === 'object' && !Array.isArray(sojori)) {
    const n = sojori as Record<string, unknown>;
    const label = [n.fr, n.en, n.ar].find((v) => typeof v === 'string' && String(v).trim());
    if (label) return String(label);
  }
  if (typeof sojori === 'string' && sojori.trim()) return sojori;
  const fallback = room.roomType ?? room.roomName ?? room.name;
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return `Pièce ${index + 1}`;
}

const DEFAULT_CATEGORIES = ['All Categories', 'Basic'];

/** 4 cartes par ligne (responsive) */
const AMENITY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 1,
} as const;

const AMENITIES_DEBUG = import.meta.env.DEV;

function logAmenities(label: string, detail?: Record<string, unknown>) {
  if (!AMENITIES_DEBUG) return;
  if (detail) {
    console.debug(`[AmenitiesTab] ${label}`, detail);
  } else {
    console.debug(`[AmenitiesTab] ${label}`);
  }
}

export function AmenitiesTab({ values, onChange, listingId }: AmenitiesTabProps) {
  const { fetchAmenities, fetchRoomComposition, getPredefinedCategories, getAmenitiesByIds } =
    useAmenities();

  // Main tabs: By Categories vs By Room
  const [mainTab, setMainTab] = useState(0); // 0 = By Categories, 1 = By Room

  // State management
  const [categoryTab, setCategoryTab] = useState(0); // Sub-tab for categories (All, Basic, Kitchen, etc.)
  /** Filtre catalogue actif — synchro explicite au clic (évite course avec useMemo). */
  const [activeCatalogCategories, setActiveCatalogCategories] = useState<string[]>([]);
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const [roomTab, setRoomTab] = useState(0); // Sub-tab for rooms (Chambre 1, Chambre 2, etc.)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [rooms, setRooms] = useState<RoomTabOption[]>([
    { id: '__all__', label: 'Toutes les pièces' },
    { id: '1', label: 'Chambre 1' },
    { id: '2', label: 'Chambre 2' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availableAmenities, setAvailableAmenities] = useState<AmenityData[]>([]);
  const [page, setPage] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [roomComposition, setRoomComposition] = useState<any>(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [selectedAmenityForRoom, setSelectedAmenityForRoom] = useState<AmenityData | null>(null);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [hydratedListingAmenities, setHydratedListingAmenities] = useState(false);

  const PAGE_LIMIT = 30;

  // Debounced search
  const debouncedSearchHandler = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
    }, 500),
    [],
  );

  useEffect(() => {
    debouncedSearchHandler(searchText);
    return () => debouncedSearchHandler.cancel();
  }, [searchText, debouncedSearchHandler]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await getPredefinedCategories();
        setCategories(
          fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_CATEGORIES,
        );
        setCategoryTab(0);
      } catch (error) {
        console.error('[DetailTabsAmenities] Error loading categories:', error);
        setCategories(DEFAULT_CATEGORIES);
        setCategoryTab(0);
      } finally {
        setCategoriesReady(true);
      }
    };

    void loadCategories();
  }, [getPredefinedCategories]);

  useEffect(() => {
    setHydratedListingAmenities(false);
  }, [listingId]);

  useEffect(() => {
    if (!listingId || hydratedListingAmenities) return;

    const hydrateSelected = async () => {
      const current = values.listingAmenitiesIds || [];
      if (current.length === 0) {
        setHydratedListingAmenities(true);
        return;
      }

      const needsFetch = current.filter(
        (item) => !item.amenityData?.name || getAmenityName(item.amenityData.name) === 'Loading...',
      );
      if (needsFetch.length === 0) {
        setHydratedListingAmenities(true);
        return;
      }

      try {
        const fetched = await getAmenitiesByIds(
          needsFetch.map((item) => item._id),
          listingId,
        );
        const byId = new Map(fetched.map((a) => [a._id, a]));
        const updated = current.map((item) => {
          const full = byId.get(item._id);
          if (!full) return item;
          return {
            _id: item._id,
            count: item.count || 1,
            amenityData: {
              _id: full._id,
              name: full.name,
              iconUrl: full.iconUrl,
              compositionRooms: full.compositionRooms || [],
              SojoriSubcategory: full.SojoriSubcategory || [],
              basic: full.basic,
            },
          };
        });
        onChange('listingAmenitiesIds', updated);
      } catch (error) {
        console.warn('[DetailTabsAmenities] hydrate selected amenities:', error);
      } finally {
        setHydratedListingAmenities(true);
      }
    };

    void hydrateSelected();
  }, [listingId, hydratedListingAmenities, values.listingAmenitiesIds, getAmenitiesByIds, onChange]);

  const applyRoomsFromListingValues = useCallback((): RoomTabOption[] | null => {
    const roomTypes = (values.roomTypes || []) as Array<Record<string, unknown>>;
    let extracted: RoomTabOption[] = [];

    const firstRt = roomTypes[0];
    if (firstRt?.rooms && Array.isArray(firstRt.rooms)) {
      const legacyRooms = firstRt.rooms as Record<string, unknown>[];
      extracted = legacyRooms
        .filter((r) => r.enable !== false)
        .map((r, idx) => ({
          id: String(r.roomId ?? r.rentalId ?? idx),
          label:
            (typeof r.RoomNameSojori === 'object' &&
              (r.RoomNameSojori as { fr?: string }).fr) ||
            (typeof r.roomName === 'string' ? r.roomName : `Chambre ${idx + 1}`),
          rentalId: (r.roomId ?? r.rentalId) as string | number,
        }));
    } else if (roomTypes.length > 0) {
      extracted = roomTypes.map((rt, idx) => ({
        id: String(rt._id ?? rt.id ?? idx),
        label:
          (typeof rt.roomTypeName === 'string' && rt.roomTypeName) ||
          (typeof rt.name === 'string' && rt.name) ||
          `Chambre ${idx + 1}`,
        rentalId: (rt._id ?? rt.id ?? idx) as string | number,
      }));
    }

    if (extracted.length === 0) return null;
    return [{ id: '__all__', label: 'Toutes les pièces' }, ...extracted];
  }, [values.roomTypes]);

  /** Charge la composition une fois — ne pas réinitialiser roomTab au clic (sinon retour « Toutes les pièces »). */
  useEffect(() => {
    let cancelled = false;
    void fetchRoomComposition().then((composition) => {
      if (cancelled) return;
      setRoomComposition(composition);
      const rawRooms = Array.isArray(composition?.rooms) ? composition.rooms : [];
      const enabled = rawRooms.filter((r: { enable?: boolean }) => r.enable !== false);
      if (enabled.length > 0) {
        const nextRooms: RoomTabOption[] = [
          { id: '__all__', label: 'Toutes les pièces' },
          ...enabled.map((room: Record<string, unknown>, idx: number) => ({
            id: String(room.rentalId ?? idx),
            label: getRoomLabelFromComposition(room, idx),
            rentalId: room.rentalId as string | number,
          })),
        ];
        setRooms(nextRooms);
        return;
      }
      const fromListing = applyRoomsFromListingValues();
      if (fromListing) setRooms(fromListing);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchRoomComposition, applyRoomsFromListingValues]);

  const activeFilterLabel =
    mainTab === 0
      ? categories[categoryTab] || 'Toutes les catégories'
      : rooms[roomTab]?.label || 'Pièce';

  const selectedCategories = mainTab === 1 ? [] : activeCatalogCategories;

  const allEnabledRoomIds = useMemo(
    () => getAllEnabledCompositionRoomIds(rooms),
    [rooms],
  );

  const selectedRoomIds = useMemo(
    () => (mainTab === 1 ? resolveRoomIdsForTab(roomTab, rooms) : undefined),
    [mainTab, roomTab, rooms],
  );

  const fetchSeqRef = useRef(0);
  const lastFilterKeyRef = useRef('');

  const filterKey = useMemo(
    () =>
      [
        categoriesReady,
        categories.join(','),
        mainTab,
        categoryTab,
        roomTab,
        debouncedSearch,
        activeCatalogCategories.join(','),
        (selectedRoomIds ?? []).map(String).join(','),
        String(catalogEpoch),
      ].join('|'),
    [
      categoriesReady,
      categories,
      mainTab,
      categoryTab,
      roomTab,
      debouncedSearch,
      activeCatalogCategories,
      selectedRoomIds,
      catalogEpoch,
    ],
  );

  const selectedIdsSet = useMemo(() => {
    const ids = new Set<string>();
    for (const item of values.listingAmenitiesIds || []) {
      if (item._id) ids.add(item._id);
    }
    return ids;
  }, [values.listingAmenitiesIds]);

  type CatalogLoadOptions = {
    categories?: string[];
    roomIds?: Array<string | number>;
  };

  const loadAmenities = useCallback(
    async (
      pageNum: number,
      append: boolean = false,
      overrides?: CatalogLoadOptions,
    ) => {
      if (!categoriesReady) return;

      const catsForRequest =
        overrides?.categories !== undefined ? overrides.categories : selectedCategories;
      const roomsForRequest =
        overrides?.roomIds !== undefined
          ? overrides.roomIds
          : mainTab === 1
            ? selectedRoomIds
            : undefined;

      const seq = ++fetchSeqRef.current;
      const requestLimit =
        debouncedSearch.trim() ||
        catsForRequest.length > 0 ||
        (roomsForRequest && roomsForRequest.length > 0)
          ? 300
          : PAGE_LIMIT;
      const t0 = AMENITIES_DEBUG ? performance.now() : 0;
      setLoading(true);
      try {
        const result = await fetchAmenities(
          pageNum,
          requestLimit,
          false,
          debouncedSearch || undefined,
          catsForRequest.length > 0 ? catsForRequest : undefined,
          roomsForRequest,
        );

        if (seq !== fetchSeqRef.current) return;

        if (result.success) {
          const normalized = (result.data || []).map((row) => ({
            ...row,
            _id: String(row._id || (row as { id?: string }).id || ''),
            name: row.name ?? 'Équipement',
          })) as AmenityData[];

          const filtered = normalized.filter((amenity) => !selectedIdsSet.has(amenity._id));

          setAvailableAmenities((prev) => {
            if (!append) return filtered;
            const seen = new Set(prev.map((a) => a._id));
            const extra = filtered.filter((a) => a._id && !seen.has(a._id));
            return [...prev, ...extra];
          });
          const total = result.total ?? 0;
          setCatalogTotal(total);
          const fetched = (pageNum + 1) * requestLimit;
          setHasMore(fetched < total && normalized.length > 0);
          logAmenities('catalog loaded', {
            page: pageNum,
            count: filtered.length,
            total,
            ms: Math.round(performance.now() - t0),
            categories: catsForRequest,
            roomIds: roomsForRequest,
          });
        } else {
          if (!append) setAvailableAmenities([]);
          setHasMore(false);
          setCatalogTotal(0);
        }
      } catch (error) {
        if (seq !== fetchSeqRef.current) return;
        console.error('Error loading amenities:', error);
        if (!append) setAvailableAmenities([]);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [
      categoriesReady,
      fetchAmenities,
      debouncedSearch,
      selectedCategories,
      selectedRoomIds,
      mainTab,
      selectedIdsSet,
    ],
  );

  const applyFilterChange = useCallback(
    (nextFilterKey: string) => {
      const filterChanged = lastFilterKeyRef.current !== nextFilterKey;
      if (!filterChanged) return;
      lastFilterKeyRef.current = nextFilterKey;
      logAmenities('filter change', { filterKey: nextFilterKey });
      setPage(0);
      setAvailableAmenities([]);
      void loadAmenities(0, false);
    },
    [loadAmenities],
  );

  useEffect(() => {
    if (!categoriesReady) return;
    applyFilterChange(filterKey);
  }, [filterKey, categoriesReady, applyFilterChange]);

  useEffect(() => {
    if (!categoriesReady || page === 0) return;
    void loadAmenities(page, true);
  }, [page, categoriesReady, loadAmenities]);

  const handleMainTabChange = useCallback(
    (_: unknown, newValue: number) => {
      logAmenities('mainTab', { tab: newValue });
      setMainTab(newValue);
      setPage(0);
      setAvailableAmenities([]);
      setCatalogTotal(0);
      setHasMore(true);
      fetchSeqRef.current += 1;
      if (newValue === 1) {
        setRoomTab(0);
        setActiveCatalogCategories([]);
        setCatalogEpoch((n) => n + 1);
        void loadAmenities(0, false, {
          categories: [],
          roomIds: resolveRoomIdsForTab(0, rooms),
        });
      } else {
        setCategoryTab(0);
        setActiveCatalogCategories([]);
        setCatalogEpoch((n) => n + 1);
        void loadAmenities(0, false, { categories: [], roomIds: undefined });
      }
    },
    [loadAmenities, rooms],
  );

  const handleCategoryTabChange = useCallback(
    (_: unknown, newValue: number) => {
      const cats = resolveSelectedCategoriesForTab(newValue, categories);
      logAmenities('categoryTab', {
        index: newValue,
        label: categories[newValue],
        categories: cats,
      });
      setCategoryTab(newValue);
      setActiveCatalogCategories(cats);
      setCatalogEpoch((n) => n + 1);
      setPage(0);
      setAvailableAmenities([]);
      setCatalogTotal(0);
      setHasMore(true);
      fetchSeqRef.current += 1;
      void loadAmenities(0, false, { categories: cats, roomIds: undefined });
    },
    [categories, loadAmenities],
  );

  const handleRoomTabChange = useCallback(
    (_: unknown, newValue: number) => {
      const roomIds = resolveRoomIdsForTab(newValue, rooms);
      logAmenities('roomTab', {
        index: newValue,
        label: rooms[newValue]?.label,
        roomIds,
      });
      fetchSeqRef.current += 1;
      setRoomTab(newValue);
      setActiveCatalogCategories([]);
      setPage(0);
      setAvailableAmenities([]);
      setCatalogTotal(0);
      setHasMore(true);
      setCatalogEpoch((n) => n + 1);
      void loadAmenities(0, false, { categories: [], roomIds });
    },
    [rooms, loadAmenities],
  );

  // Get selected amenities
  const listingAmenitiesIds = values.listingAmenitiesIds || [];
  const selectedAmenitiesMap = useMemo(() => {
    const map = new Map<string, { count: number; amenityData?: AmenityData }>();
    listingAmenitiesIds.forEach((item) => {
      map.set(item._id, { count: item.count, amenityData: item.amenityData });
    });
    return map;
  }, [listingAmenitiesIds]);

  // Separate selected and available
  const selectedAmenities = useMemo(() => {
    return Array.from(selectedAmenitiesMap.entries()).map(([id, data]) => ({
      _id: id,
      count: data.count,
      amenityData: data.amenityData,
    }));
  }, [selectedAmenitiesMap]);

  /** Legacy : filtrer sélectionnés par catégorie ou par pièce. */
  const filteredSelectedAmenities = useMemo(() => {
    let list = selectedAmenities;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((item) => {
        const name = item.amenityData?.name;
        return getAmenityName(name ?? '').toLowerCase().includes(q);
      });
    }
    if (mainTab === 1) {
      return list.filter((item) =>
        listingAmenityMatchesRoomTab(
          item,
          selectedRoomIds,
          allEnabledRoomIds,
          values.roomTypes,
        ),
      );
    }
    if (activeCatalogCategories.length === 0) return list;
    return list.filter((item) =>
      amenityMatchesCatalogCategories(item.amenityData || { _id: item._id }, activeCatalogCategories),
    );
  }, [
    selectedAmenities,
    mainTab,
    activeCatalogCategories,
    selectedRoomIds,
    allEnabledRoomIds,
    values.roomTypes,
    debouncedSearch,
  ]);

  const availableNotSelected = useMemo(() => {
    return availableAmenities.filter((amenity) => !selectedAmenitiesMap.has(amenity._id));
  }, [availableAmenities, selectedAmenitiesMap]);

  const handleToggleAmenity = useCallback(
    (amenityId: string, checked: boolean) => {
      startTransition(() => {
        if (checked) {
          const amenityData = availableAmenities.find((a) => a._id === amenityId);
          onChange('listingAmenitiesIds', [
            ...(values.listingAmenitiesIds || []),
            { _id: amenityId, count: 1, amenityData },
          ]);
        } else {
          onChange(
            'listingAmenitiesIds',
            (values.listingAmenitiesIds || []).filter((item) => item._id !== amenityId),
          );
        }
      });
    },
    [availableAmenities, onChange, values.listingAmenitiesIds],
  );

  const handleCountChange = useCallback(
    (amenityId: string, delta: number) => {
      startTransition(() => {
        const updated = (values.listingAmenitiesIds || []).map((item) => {
          if (item._id === amenityId) {
            return { ...item, count: Math.max(1, item.count + delta) };
          }
          return item;
        });
        onChange('listingAmenitiesIds', updated);
      });
    },
    [onChange, values.listingAmenitiesIds],
  );

  const handleOpenRoomSelection = useCallback((amenity: AmenityData) => {
    setSelectedAmenityForRoom(amenity);
    setRoomModalOpen(true);
  }, []);

  const handleSaveRoomSelection = (amenityId: string, roomSelections: Array<{ roomId: string; count: number }>) => {
    const roomTypes = values.roomTypes || [];
    if (roomTypes.length === 0) {
      console.warn('No room types available');
      return;
    }

    // Update roomAmenities in first roomType (legacy structure)
    const updatedRoomTypes = [...roomTypes];
    const firstRoom = { ...updatedRoomTypes[0] };
    const roomAmenities = firstRoom.roomAmenities || [];

    // Remove existing entries for this amenity
    const filtered = roomAmenities.filter((ra) => ra.amenityId !== amenityId);

    // Add new selections
    const newEntries = roomSelections.map((sel) => ({
      amenityId,
      count: sel.count,
      roomId: sel.roomId,
    }));

    firstRoom.roomAmenities = [...filtered, ...newEntries];
    updatedRoomTypes[0] = firstRoom;

    onChange('roomTypes', updatedRoomTypes);
    setRoomModalOpen(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // Get current room selections for modal
  const getCurrentRoomSelections = (amenityId: string) => {
    const roomTypes = values.roomTypes || [];
    if (roomTypes.length === 0) return [];

    const roomAmenities = roomTypes[0]?.roomAmenities || [];
    return roomAmenities
      .filter((ra) => ra.amenityId === amenityId)
      .map((ra) => ({
        roomId: (ra as any).roomId || '',
        count: ra.count,
      }));
  };

  return (
    <Box>
      <RuFormLegend />
      {/* Main Tabs: By Categories vs By Room */}
      <Box
        sx={{
          borderBottom: `2px solid ${T.border}`,
          bgcolor: T.bg1,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          mb: 2,
        }}
      >
        <Tabs
          value={mainTab}
          onChange={handleMainTabChange}
          sx={{
            minHeight: 56,
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
              background: `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
            },
          }}
        >
          <Tab
            key="amenities-main-categories"
            label="🗂 Par Catégories"
            sx={{
              minHeight: 56,
              px: 3,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
              color: T.text3,
              '&:hover': { color: T.text2, bgcolor: T.bg2 },
              '&.Mui-selected': { color: T.accent, fontWeight: 700 },
            }}
          />
          <Tab
            key="amenities-main-rooms"
            label="🏠 Par Chambre"
            sx={{
              minHeight: 56,
              px: 3,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
              color: T.text3,
              '&:hover': { color: T.text2, bgcolor: T.bg2 },
              '&.Mui-selected': { color: T.accent, fontWeight: 700 },
            }}
          />
        </Tabs>
      </Box>

      {/* Sub-tabs based on main tab */}
      {mainTab === 0 ? (
        // By Categories - Sub-tabs
        <Box
          sx={{
            borderBottom: `1px solid ${T.border}`,
            bgcolor: T.bg1,
            position: 'sticky',
            top: 58,
            zIndex: 10,
            mb: 2,
          }}
        >
          <Tabs
            value={categoryTab}
            onChange={handleCategoryTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
              },
            }}
          >
            {categories.map((category, categoryIndex) => (
              <Tab
                key={`amenity-cat-${categoryIndex}-${category}`}
                label={category}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: T.text3,
                  '&:hover': { color: T.text2, bgcolor: T.bg2 },
                  '&.Mui-selected': { color: T.accent, fontWeight: 700 },
                }}
              />
            ))}
          </Tabs>
        </Box>
      ) : (
        // By Room - Sub-tabs
        <Box
          sx={{
            borderBottom: `1px solid ${T.border}`,
            bgcolor: T.bg1,
            position: 'sticky',
            top: 58,
            zIndex: 10,
            mb: 2,
          }}
        >
          <Tabs
            value={roomTab}
            onChange={handleRoomTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
              },
            }}
          >
            {rooms.map((room) => (
              <Tab
                key={`amenity-room-${room.id}`}
                label={room.label}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: T.text3,
                  '&:hover': { color: T.text2, bgcolor: T.bg2 },
                  '&.Mui-selected': { color: T.accent, fontWeight: 700 },
                }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Search */}
      <Card title="🔍 Rechercher" meta={`${selectedAmenities.length} sélectionnés au total`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon sx={{ color: T.text3, fontSize: 18 }} />
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher un équipement..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: 13,
                bgcolor: T.bg2,
                '& fieldset': { borderColor: T.border },
                '&:hover fieldset': { borderColor: T.borderStrong },
                '&.Mui-focused fieldset': { borderColor: T.accent },
              },
            }}
          />
        </Box>
      </Card>

      {/* Selected Amenities */}
      {filteredSelectedAmenities.length > 0 && (
        <Card
          title="✅ Équipements sélectionnés"
          meta={
            mainTab === 1
              ? `${filteredSelectedAmenities.length} pour « ${activeFilterLabel} » · ${selectedAmenities.length} au total`
              : activeCatalogCategories.length > 0
                ? `${filteredSelectedAmenities.length} dans « ${activeFilterLabel} » · ${selectedAmenities.length} au total`
                : `${selectedAmenities.length} élément(s)`
          }
        >
          <Box sx={AMENITY_GRID_SX}>
            {filteredSelectedAmenities.map((item, selectedIndex) => {
              const amenityData = item.amenityData || { _id: item._id, name: 'Équipement' };
              // Ensure amenityData has valid structure
              const validAmenityData = {
                ...amenityData,
                name: amenityData.name || 'Équipement',
              };
              const cardKey = item._id || amenityData._id || `selected-amenity-${selectedIndex}`;
              return (
                <AmenityCard
                  key={cardKey}
                  amenity={validAmenityData}
                  isSelected={true}
                  count={item.count}
                  compact
                  onToggle={handleToggleAmenity}
                  onCountChange={handleCountChange}
                  onRoomSelect={
                    amenityData.compositionRooms && amenityData.compositionRooms.length > 0
                      ? handleOpenRoomSelection
                      : undefined
                  }
                  showRoomButton={false}
                />
              );
            })}
          </Box>
        </Card>
      )}

      {mainTab === 0 && activeCatalogCategories.length > 0 && filteredSelectedAmenities.length === 0 && selectedAmenities.length > 0 && (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1.5, fontStyle: 'italic' }}>
          Aucun équipement sélectionné dans « {activeFilterLabel} » — voir les autres catégories ou « All Categories ».
        </Typography>
      )}

      {mainTab === 1 && filteredSelectedAmenities.length === 0 && selectedAmenities.length > 0 && (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1.5, fontStyle: 'italic' }}>
          Aucun équipement sélectionné pour « {activeFilterLabel} » — essayez « Toutes les pièces » ou une autre pièce.
        </Typography>
      )}

      {/* Available Amenities */}
      <Card
        key={`catalog-${catalogEpoch}-m${mainTab}-${activeCatalogCategories.join(',')}-r${(selectedRoomIds ?? []).join(',')}`}
        title="📦 Équipements disponibles"
        meta={
          loading
            ? 'Chargement...'
            : `${availableNotSelected.length}${catalogTotal ? ` / ${catalogTotal}` : ''} · ${activeFilterLabel}`
        }
      >
        {loading && page === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ color: T.accent }} />
            <Typography sx={{ mt: 2, fontSize: 13, color: T.text3 }}>Chargement des équipements...</Typography>
          </Box>
        ) : availableNotSelected.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: T.text3 }}>
              {searchText.trim()
                ? 'Aucun équipement trouvé pour cette recherche.'
                : mainTab === 1
                  ? `Aucun équipement pour « ${activeFilterLabel} ».`
                  : selectedCategories.length > 0
                    ? `Aucun équipement dans « ${activeFilterLabel} ».`
                    : 'Tous les équipements visibles sont déjà sélectionnés.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={AMENITY_GRID_SX} key={`avail-grid-${catalogEpoch}-m${mainTab}`}>
            {availableNotSelected.map((amenity, amenityIndex) => {
              const validAmenity = {
                ...amenity,
                name: amenity.name || 'Équipement',
              };
              const cardKey = amenity._id || `available-amenity-${amenityIndex}`;
              return (
                <AmenityCard
                  key={cardKey}
                  amenity={validAmenity}
                  isSelected={false}
                  count={1}
                  compact
                  onToggle={handleToggleAmenity}
                  onCountChange={handleCountChange}
                  showRoomButton={false}
                />
              );
            })}
          </Box>
        )}

        {hasMore && availableNotSelected.length > 0 && (
          <Box sx={{ mt: 2.5, textAlign: 'center' }}>
            <Button
              onClick={handleLoadMore}
              disabled={loading}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '8px',
                fontSize: 13,
                fontWeight: 600,
                color: T.text2,
                border: `1px solid ${T.border}`,
                '&:hover': {
                  bgcolor: T.bg2,
                  borderColor: T.accent,
                  color: T.accent,
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              {loading ? 'Chargement...' : 'Charger plus'}
            </Button>
          </Box>
        )}
      </Card>

      {/* Room Selection Modal */}
      <RoomSelectionModal
        open={roomModalOpen}
        amenity={selectedAmenityForRoom}
        roomComposition={roomComposition}
        currentRoomSelections={
          selectedAmenityForRoom ? getCurrentRoomSelections(selectedAmenityForRoom._id) : []
        }
        onSave={handleSaveRoomSelection}
        onClose={() => {
          setRoomModalOpen(false);
          setSelectedAmenityForRoom(null);
        }}
      />
    </Box>
  );
}

export default AmenitiesTab;
