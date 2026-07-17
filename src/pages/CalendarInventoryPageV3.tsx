// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPageV3 — wrapper avec nouveau design Atelier 2026
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/fr';
import { Box, Button, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import listingsService from '../services/listingsService';
import calendarService from '../services/calendarService';
import type { Listing as ListingType } from '../types/listings.types';
import CalendarInventoryPage from '../components/calendar-v3/CalendarInventoryPage.jsx';
import {
  computeInventoryFetchRange,
  clampPivotDate,
} from '../components/calendar-v3/inventoryCalendarConstants';
import { processInventoryResponse, type ProcessedInventoryData } from '../components/calendar-v3/processInventoryResponse';
import {
  fetchApplySyncSummary,
  type PortfolioApplySyncSummaryDto,
} from '../services/dynamicPricingApi';

export const CALENDAR_LISTINGS_PAGE_SIZE = 25;

moment.locale('fr');

function inventoryCacheKey(from: string, to: string, listingIds: string[]): string {
  return `${from}|${to}|${[...listingIds].sort().join(',')}`;
}

export function CalendarInventoryPageV3() {
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  const [listingsLoading, setListingsLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [inventoryData, setInventoryData] = useState<ProcessedInventoryData>({});
  const [currentDate, setCurrentDate] = useState(() => moment(clampPivotDate(new Date())));
  const [roomTypeByListing, setRoomTypeByListing] = useState<Record<string, string>>({});
  const inventorySeqRef = useRef(0);
  const inventoryCacheRef = useRef<Map<string, ProcessedInventoryData>>(new Map());
  const [dpSyncSummary, setDpSyncSummary] = useState<PortfolioApplySyncSummaryDto | null>(null);
  const [dpSyncLoading, setDpSyncLoading] = useState(false);

  const fetchRange = useMemo(
    () => computeInventoryFetchRange(currentDate),
    [currentDate.format('YYYY-MM')],
  );

  const visibleListingIds = useMemo(
    () => listings.map((listing) => listing._id),
    [listings],
  );

  /** Listings paginés — refetch quand scope / page change */
  useEffect(() => {
    let cancelled = false;
    if (!scopeFetchReady) {
      setListings([]);
      setListingsTotal(0);
      setInventoryData({});
      inventoryCacheRef.current.clear();
      setListingsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setListingsLoading(true);
      setInventoryData({});
      inventoryCacheRef.current.clear();
      try {
        const listingsResponse = await listingsService.getListingsForCalendar(
          listingsPage,
          CALENDAR_LISTINGS_PAGE_SIZE,
          {
            active: true,
            staging,
            filterOwnerId: requestOwnerId || undefined,
          },
        );

        if (!listingsResponse?.success || !Array.isArray(listingsResponse?.data)) {
          if (!cancelled) {
            setListings([]);
            setListingsTotal(0);
          }
          return;
        }

        if (!cancelled) {
          setListings(listingsResponse.data);
          setListingsTotal(listingsResponse.total || listingsResponse.data.length);
        }
      } catch (error) {
        console.error('[CalendarV3] Erreur chargement listings:', error);
        if (!cancelled) {
          setListings([]);
          setListingsTotal(0);
        }
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staging, scopeFetchReady, requestOwnerId, listingsPage]);

  /** DP sync — basse priorité, après le premier paint inventaire */
  useEffect(() => {
    if (visibleListingIds.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setDpSyncLoading(true);
        try {
          const res = await fetchApplySyncSummary(visibleListingIds);
          if (!cancelled && res.data?.success) setDpSyncSummary(res.data);
        } catch (e) {
          console.error('[CalendarV3] DP sync summary:', e);
          if (!cancelled) setDpSyncSummary(null);
        } finally {
          if (!cancelled) setDpSyncLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [visibleListingIds.join(',')]);

  const listingNameById = useMemo(() => {
    const m: Record<string, string> = {};
    listings.forEach((listing) => {
      m[listing._id] = listing.name;
    });
    return m;
  }, [listings]);

  const loadInventory = useCallback(
    async (listingIds: string[], from: string, to: string, seq: number) => {
      if (listingIds.length === 0) {
        setInventoryData({});
        setInventoryLoading(false);
        return;
      }

      const cacheKey = inventoryCacheKey(from, to, listingIds);
      const cached = inventoryCacheRef.current.get(cacheKey);
      if (cached) {
        if (seq === inventorySeqRef.current) {
          setInventoryData(cached);
          setInventoryLoading(false);
        }
        return;
      }

      setInventoryLoading(true);
      try {
        const inventory = await calendarService.getInventoryForListings(
          listingIds,
          from,
          to,
          true,
          false,
        );

        if (seq !== inventorySeqRef.current) return;

        const processed = processInventoryResponse(inventory);
        inventoryCacheRef.current.set(cacheKey, processed);
        setInventoryData(processed);

        setRoomTypeByListing((prev) => {
          const next = { ...prev };
          listingIds.forEach((id) => {
            if (next[id]) return;
            const keys = processed[id] ? Object.keys(processed[id]) : [];
            if (keys[0]) next[id] = keys[0];
          });
          return next;
        });
      } catch (error) {
        console.error('[CalendarV3] Erreur chargement inventaire:', error);
      } finally {
        if (seq === inventorySeqRef.current) {
          setInventoryLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    setListingsPage(0);
  }, [requestOwnerId]);

  /** Inventaire : plage stable par mois + page listings (pas à chaque jour) */
  useEffect(() => {
    if (listings.length === 0) return;

    const seq = ++inventorySeqRef.current;
    let cancelled = false;

    void loadInventory(visibleListingIds, fetchRange.from, fetchRange.to, seq);

    return () => {
      cancelled = true;
      if (cancelled) {
        // noop — seq guard inside loadInventory
      }
    };
  }, [fetchRange.from, fetchRange.to, visibleListingIds.join(','), listings.length, loadInventory]);

  const listingCatalog = useMemo(
    () =>
      listings.map((listing) => ({
        _id: listing._id,
        name: listing.name,
        propertyUnit: listing.propertyUnit || 'Multi',
        currencyCode: listing.currencyCode || listing.currency || 'MAD',
        photoColor: listing.photoColor || '#fde68a',
        photoColorDeep: listing.photoColorDeep || '#d97706',
        roomTypeId: roomTypeByListing[listing._id] || 'default',
      })),
    [listings, roomTypeByListing],
  );

  const inventoriesByListing = useMemo(() => {
    const result: Record<string, Record<string, unknown>> = {};
    listings.forEach((listing) => {
      const listingInv = inventoryData[listing._id];
      const rtId = roomTypeByListing[listing._id];
      const roomInv = rtId && listingInv?.[rtId];
      result[listing._id] = roomInv?.availability || {};
    });
    return result;
  }, [listings, inventoryData, roomTypeByListing]);

  const handleUpdateInventory = async (payloads: unknown[]) => {
    if (payloads.length === 0) return;
    await calendarService.updateCalendar(payloads as never);

    inventoryCacheRef.current.clear();
    const seq = ++inventorySeqRef.current;
    await loadInventory(visibleListingIds, fetchRange.from, fetchRange.to, seq);
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(moment(clampPivotDate(newDate)));
  };

  const monthLabel = useMemo(() => {
    const raw = currentDate.format('MMMM YYYY');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  const totalPages = Math.max(1, Math.ceil(listingsTotal / CALENDAR_LISTINGS_PAGE_SIZE));

  if (listingsLoading && listings.length === 0) {
    return (
      <DashboardWrapper titleMeta={monthLabel}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#7a756c' }}>
          Chargement des propriétés…
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper titleMeta={monthLabel}>
      {listingsTotal > CALENDAR_LISTINGS_PAGE_SIZE ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5, px: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {listingsTotal} propriété(s) · page {listingsPage + 1}/{totalPages}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={listingsPage <= 0 || listingsLoading}
              onClick={() => setListingsPage((p) => Math.max(0, p - 1))}
            >
              Précédent
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={listingsPage >= totalPages - 1 || listingsLoading}
              onClick={() => setListingsPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </Box>
        </Stack>
      ) : null}
      <CalendarInventoryPage
        startDate={currentDate.toDate()}
        listingCatalog={listingCatalog}
        inventoriesByListing={inventoriesByListing}
        inventoryData={inventoryData}
        inventoryLoading={inventoryLoading || listingsLoading}
        defaultView="multi"
        onUpdateInventory={handleUpdateInventory}
        onDateChange={handleDateChange}
        dpSyncSummary={dpSyncSummary}
        dpSyncLoading={dpSyncLoading}
        listingNameById={listingNameById}
      />
    </DashboardWrapper>
  );
}

export default CalendarInventoryPageV3;
