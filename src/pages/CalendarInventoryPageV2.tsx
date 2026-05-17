// ════════════════════════════════════════════════════════════════════
// Sojori — Calendar Inventory Page V2
// RÉPLICATION EXACTE de sojori-dashboard/InventoryCalendarNew.jsx
// Garde le nouveau design, mais comportement 100% identique à l'ancien
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  Stack,
  IconButton,
} from '@mui/material';
import moment from 'moment';
import listingsService from '../services/listingsService';
import calendarService from '../services/calendarService';
import type { Listing } from '../types/listings.types';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ColumnFilters, type ColumnId } from '../components/calendar/ColumnFilters';
import { InventoryGridV2, type InventoryData } from '../components/calendar/InventoryGridV2';
import { UpdateInventoryModal } from '../components/calendar/UpdateInventoryModal';

// Tokens Atelier 2026 (gold/beige design system)
const t = {
  // Primaire (gold)
  primary: '#b8851a',
  primaryHover: '#876119',
  primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  primaryDeep: '#876119',

  // Backgrounds
  bg0: '#f6f5f1',  // Background page
  bg1: '#ffffff',  // Cards, panels
  bg2: '#fafaf7',  // Hover, secondary
  bg3: '#f0eee8',  // Tertiary

  // Texte
  text: '#14110a',   // Principal
  text2: '#55504a',  // Secondaire
  text3: '#7a756c',  // Tertiaire
  text4: '#a8a299',  // Disabled

  // Bordures
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',

  // Sémantiques
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
  info: '#0673b3',

  // Legacy compat (pour ne pas casser)
  cardBg: '#ffffff',
};

// Types pour l'inventaire (structure exacte de sojori-dashboard)
interface InventoryDay {
  available: number;
  basePrice: number;
  calculatedPrice: number;
  manualPrice?: number;
  applyManual?: boolean;
  stopSell?: boolean;
  useDynamicPrice?: boolean;
  min_stay_arrival?: number;
  max_stay?: number;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  reservations?: any[];
  currency?: string;
}

interface RoomTypeInventory {
  name: string;
  availability: Record<string, InventoryDay>; // date YYYY-MM-DD → day data
}

interface ListingInventory {
  [roomTypeId: string]: RoomTypeInventory;
}

interface InventoryData {
  [listingId: string]: ListingInventory;
}

export function CalendarInventoryPageV2() {
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');

  // États principaux (même structure que InventoryCalendarNew.jsx)
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryData>({});
  // Map listingId -> currency (extrait de l'API listing.currencyCode)
  const [listingCurrencies, setListingCurrencies] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(moment());

  // Filtres
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Expanded listings (tous expanded par défaut comme l'ancien)
  const [expandedListings, setExpandedListings] = useState<Record<string, boolean>>({});

  // Colonnes sélectionnées (défaut: VIDE - tout collapsed au chargement)
  const [selectedColumns, setSelectedColumns] = useState<ColumnId[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCells, setSelectedCells] = useState<
    Array<{ listingId: string; roomTypeId: string; dateStr: string }>
  >([]);

  // Date range: 31 jours à partir de currentDate (ligne 145-147 de l'ancien)
  const startDate = useMemo(() => currentDate.format('YYYY-MM-DD'), [currentDate]);
  const endDate = useMemo(
    () => currentDate.clone().add(30, 'days').format('YYYY-MM-DD'),
    [currentDate]
  );

  // Ref pour includeReservations (ligne 66-67 de l'ancien)
  const includeResaRef = useRef(true);
  const fetchInventoryRef = useRef<(listingIds: string[], options?: { silent?: boolean }) => Promise<void>>();

  /**
   * FETCH INVENTORY — PATTERN EXACT de InventoryCalendarNew.jsx:189-252
   * 1 requête BATCH pour TOUS les listings
   */
  const fetchInventory = useCallback(
    async (listingIds: string[], options = { silent: false }) => {
      const { silent } = options;
      const includeBookings = includeResaRef.current;

      console.log('[CalendarV2] fetchInventory called', {
        listingIds,
        count: listingIds.length,
        startDate,
        endDate,
        includeBookings,
      });

      if (!silent) setInventoryLoading(true);

      try {
        const response = await calendarService.getInventoryForListings(
          listingIds,
          startDate,
          endDate,
          includeBookings
        );

        console.log('[CalendarV2] fetchInventory response', {
          hasResponse: !!response,
          isArray: Array.isArray(response),
          length: Array.isArray(response) ? response.length : 0,
        });

        if (response && Array.isArray(response)) {
          // Process inventory data — TRANSFORMATION EXACTE (lignes 199-227)
          const processedData: InventoryData = response.reduce((acc, listing: any) => {
            acc[listing.listingId] = {};

            (listing.roomTypes || []).forEach((room: any) => {
              acc[listing.listingId][room.roomTypeId] = {
                name: room.name,
                availability: (room.availableRoomsByDay || []).reduce(
                  (dayAcc: Record<string, InventoryDay>, day: any) => {
                    const dateStr = moment(day.date).format('YYYY-MM-DD');
                    dayAcc[dateStr] = {
                      availableRoom: day.availableRoom,
                      available: day.availableRoom, // Alias
                      basePrice: day.basePrice,
                      calculatedPrice: day.calculatedPrice,
                      manualPrice: day.manualPrice,
                      applyManual: day.applyManual,
                      stopSell: day.stopSell,
                      useDynamicPrice: day.useDynamicPrice,
                      min_stay_arrival: day.min_stay_arrival,
                      max_stay: day.max_stay,
                      closed_to_arrival: day.closed_to_arrival,
                      closed_to_departure: day.closed_to_departure,
                      reservations: day.reservations || [],
                      currency: day.currency,
                    };
                    return dayAcc;
                  },
                  {}
                ),
              };
            });

            return acc;
          }, {});

          console.log('[CalendarV2] Processed inventory data:', {
            listingCount: Object.keys(processedData).length,
            firstListingId: Object.keys(processedData)[0],
            firstListing: processedData[Object.keys(processedData)[0]],
            allData: processedData,
          });

          setInventoryData(processedData);
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Erreur lors du chargement de l\'inventaire');
      } finally {
        if (!silent) setInventoryLoading(false);
      }
    },
    [startDate, endDate]
  );

  // Store fetchInventory in ref to avoid circular dependency
  useEffect(() => {
    fetchInventoryRef.current = fetchInventory;
  }, [fetchInventory]);

  /**
   * FETCH LISTINGS — PATTERN EXACT de InventoryCalendarNew.jsx:258-293
   */
  const fetchListings = useCallback(async () => {
    try {
      console.log('[CalendarV2] fetchListings started', { activeFilter, staging });
      setLoading(true);
      setError(null);

      const response = await listingsService.getListingsForCalendar(0, 100, {
        active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
        staging,
      });

      console.log('[CalendarV2] fetchListings response', {
        success: response?.success,
        count: response?.data?.length,
      });

      if (response?.success && response.data) {
        const formattedListings: Listing[] = response.data.map((listing: any) => ({
          _id: listing._id,
          name: listing.name,
          propertyUnit: listing.propertyUnit,
          active: listing.active,
        }));

        // Extraire les currencies depuis l'API (listing.currencyCode ou fallback "MAD")
        const currenciesMap: Record<string, string> = {};
        response.data.forEach((listing: any) => {
          currenciesMap[listing._id] = listing.currencyCode || listing.currency || 'MAD';
        });

        setListings(formattedListings);
        setListingCurrencies(currenciesMap);

        // Init expanded state (tous expanded = true par défaut comme l'ancien)
        const initialExpanded: Record<string, boolean> = {};
        formattedListings.forEach((listing) => {
          initialExpanded[listing._id] = true;
        });
        setExpandedListings(initialExpanded);

        // Lance inventory immédiatement (ligne 283-285)
        console.log('[CalendarV2] About to call fetchInventory', {
          count: formattedListings.length,
          ids: formattedListings.map((l) => l._id),
        });
        if (formattedListings.length > 0 && fetchInventoryRef.current) {
          fetchInventoryRef.current(formattedListings.map((l) => l._id));
        } else {
          console.warn('[CalendarV2] No listings to fetch inventory for');
        }
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  }, [staging, activeFilter]);

  // Effect 1: Charge les listings au montage (ligne 296-298)
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Navigation dates (lignes 336-343)
  const goToToday = () => setCurrentDate(moment());
  const goToPreviousDay = () => setCurrentDate((prev) => prev.clone().subtract(1, 'day'));
  const goToNextDay = () => setCurrentDate((prev) => prev.clone().add(1, 'day'));
  const goToPreviousWeek = () => setCurrentDate((prev) => prev.clone().subtract(7, 'days'));
  const goToNextWeek = () => setCurrentDate((prev) => prev.clone().add(7, 'days'));

  // Filtered listings basé sur activeFilter (lignes 174-185 de l'ancien)
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by active/inactive
    if (activeFilter === 'active') {
      result = result.filter((l) => l.active);
    } else if (activeFilter === 'inactive') {
      result = result.filter((l) => !l.active);
    }

    // Filter by selected listings
    if (selectedListings.length > 0) {
      result = result.filter((l) => selectedListings.includes(l._id));
    }

    return result;
  }, [listings, activeFilter, selectedListings]);

  // Paginated listings (lignes 186-187 de l'ancien)
  const paginatedListings = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredListings.slice(start, start + rowsPerPage);
  }, [filteredListings, page, rowsPerPage]);

  // Génère les dates pour l'affichage (31 jours)
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 31; i++) {
      result.push(currentDate.clone().add(i, 'days').format('YYYY-MM-DD'));
    }
    return result;
  }, [currentDate]);

  // Toggle listing expand/collapse
  const toggleListing = useCallback((listingId: string) => {
    setExpandedListings((prev) => ({
      ...prev,
      [listingId]: !prev[listingId],
    }));
  }, []);

  // Handle cell click → Open modal
  const handleCellClick = useCallback(
    (listingId: string, roomTypeId: string, date: string, column: string) => {
      setSelectedCells([{ listingId, roomTypeId, dateStr: date }]);
      setModalOpen(true);
    },
    []
  );

  // Handle modal save → Reload inventory
  const handleModalSave = useCallback(async () => {
    if (listings.length > 0) {
      await fetchInventory(
        listings.map((l) => l._id),
        { silent: false }
      );
    }
  }, [listings, fetchInventory]);

  // Loading state
  if (loading && listings.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={40} sx={{ color: t.primary }} />
        <Typography sx={{ ml: 2, color: t.text2 }}>
          Chargement des propriétés...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error && listings.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <Typography sx={{ color: t.error, fontSize: 15, fontWeight: 600 }}>
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={fetchListings}
          sx={{
            textTransform: 'none',
            bgcolor: t.primary,
            color: '#fff',
            '&:hover': { bgcolor: t.primaryHover },
          }}
        >
          🔄 Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Calendrier', 'Inventaire']}>
      <Box sx={{ p: 3 }}>
      {/* Toolbar: Navigation dates + Filtres | Stats + Colonnes */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 3,
          p: 2,
          bgcolor: t.bg1,
          borderRadius: 1.5, // 12px (Atelier 2026)
          border: `1px solid ${t.border}`,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left side: Date navigation + Active filter + Refresh */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {/* Date navigation */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton size="small" onClick={goToPreviousWeek} sx={{ color: t.text2 }}>
              ⏮
            </IconButton>
            <IconButton size="small" onClick={goToPreviousDay} sx={{ color: t.text2 }}>
              ◀
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              onClick={goToToday}
              sx={{
                textTransform: 'none',
                fontSize: 12,
                minWidth: 90,
                borderColor: t.border,
                color: t.text,
              }}
            >
              Aujourd'hui
            </Button>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: t.text,
                minWidth: 120,
                textAlign: 'center',
              }}
            >
              {currentDate.format('MMMM YYYY')}
            </Typography>
            <IconButton size="small" onClick={goToNextDay} sx={{ color: t.text2 }}>
              ▶
            </IconButton>
            <IconButton size="small" onClick={goToNextWeek} sx={{ color: t.text2 }}>
              ⏭
            </IconButton>
          </Stack>

          {/* Active filter */}
          <Select
            size="small"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            sx={{ fontSize: 12, minWidth: 120 }}
          >
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="active">Actives</MenuItem>
            <MenuItem value="inactive">Inactives</MenuItem>
          </Select>

          {/* Refresh button */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => fetchListings()}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontSize: 12,
              borderColor: t.border,
              color: t.text,
            }}
          >
            🔄 Actualiser
          </Button>
        </Stack>

        {/* Right side: Stats + Column filters */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {/* Stats */}
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
            {filteredListings.length} propriété(s) • {dates.length} jours
          </Typography>

          {/* Filtres de colonnes */}
          <Box>
            <ColumnFilters
              selectedColumns={selectedColumns}
              onSelectedColumnsChange={setSelectedColumns}
            />
          </Box>
        </Stack>
      </Stack>

      {/* Inventory loading indicator */}
      {inventoryLoading && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, color: t.text2, mb: 1 }}>
            Chargement de l'inventaire...
          </Typography>
          <Box sx={{ width: '100%', height: 4, bgcolor: t.border, borderRadius: 2 }}>
            <Box
              sx={{
                width: '60%',
                height: '100%',
                bgcolor: t.primary,
                borderRadius: 2,
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* Inventory Grid V2 */}
      {!loading && paginatedListings.length > 0 ? (
        <InventoryGridV2
          listings={paginatedListings}
          inventoryData={inventoryData}
          days={dates}
          selectedColumns={selectedColumns}
          expandedListings={expandedListings}
          onToggleListing={toggleListing}
          onCellClick={handleCellClick}
          inventoryLoading={inventoryLoading}
          listingCurrencies={listingCurrencies}
          selectedCells={selectedCells}
          onSelectedCellsChange={setSelectedCells}
          onOpenModal={() => setModalOpen(true)}
        />
      ) : paginatedListings.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: t.text2,
          }}
        >
          <Typography sx={{ fontSize: 15 }}>
            Aucune propriété à afficher
          </Typography>
        </Box>
      ) : null}

      {/* Pagination */}
      {filteredListings.length > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: t.text2 }}>
            {page * rowsPerPage + 1}-
            {Math.min((page + 1) * rowsPerPage, filteredListings.length)} sur{' '}
            {filteredListings.length}
          </Typography>
        </Box>
      )}

      {/* Update Inventory Modal */}
      <UpdateInventoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedCells={selectedCells}
        inventoryData={inventoryData}
        listings={listings}
        onSave={handleModalSave}
      />
      </Box>
    </DashboardWrapper>
  );
}

export default CalendarInventoryPageV2;
