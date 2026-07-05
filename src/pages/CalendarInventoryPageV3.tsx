// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPageV3 — wrapper avec nouveau design Atelier 2026
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import 'moment/locale/fr';
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
import { processInventoryResponse } from '../components/calendar-v3/processInventoryResponse';
import {
  fetchApplySyncSummary,
  type PortfolioApplySyncSummaryDto,
} from '../services/dynamicPricingApi';

export const CALENDAR_LISTINGS_PAGE_SIZE = 25;

moment.locale('fr');

export function CalendarInventoryPageV3() {
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  const [listingsLoading, setListingsLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsNameQuery, setListingsNameQuery] = useState('');
  const [listingsNameFilter, setListingsNameFilter] = useState('');
  const [inventoryData, setInventoryData] = useState<ReturnType<typeof processInventoryResponse>>({});
  const [currentDate, setCurrentDate] = useState(() => moment(clampPivotDate(new Date())));
  const [roomTypeByListing, setRoomTypeByListing] = useState<Record<string, string>>({});
  const listingsReadyRef = useRef(false);
  const inventorySeqRef = useRef(0);
  const [dpSyncSummary, setDpSyncSummary] = useState<PortfolioApplySyncSummaryDto | null>(null);
  const [dpSyncLoading, setDpSyncLoading] = useState(false);

  /** Listings : refetch quand scope PM / staging change */
  useEffect(() => {
    let cancelled = false;
    if (!scopeFetchReady) {
      setListings([]);
      setInventoryData({});
      listingsReadyRef.current = false;
      setListingsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setListingsLoading(true);
      setInventoryData({});
      listingsReadyRef.current = false;
      try {
        const listingsResponse = await listingsService.getListingsForCalendar(0, 100, {
          active: true,
          staging,
          filterOwnerId: requestOwnerId || undefined,
        });

        if (!listingsResponse?.success || !Array.isArray(listingsResponse?.data)) {
          if (!cancelled) {
            setListings([]);
            setInventoryData({});
          }
          return;
        }

        if (!cancelled) {
          setListings(listingsResponse.data);
          listingsReadyRef.current = listingsResponse.data.length > 0;
        }
      } catch (error) {
        console.error('[CalendarV3] Erreur chargement listings:', error);
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staging, scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    if (listings.length === 0) return;
    let cancelled = false;
    (async () => {
      setDpSyncLoading(true);
      try {
        const res = await fetchApplySyncSummary(listings.map((l) => l._id));
        if (!cancelled && res.data?.success) setDpSyncSummary(res.data);
      } catch (e) {
        console.error('[CalendarV3] DP sync summary:', e);
        if (!cancelled) setDpSyncSummary(null);
      } finally {
        if (!cancelled) setDpSyncLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listings]);

  const listingNameById = useMemo(() => {
    const m: Record<string, string> = {};
    listings.forEach((l) => {
      m[l._id] = l.name;
    });
    return m;
  }, [listings]);

  /** Inventaire : uniquement quand la date change — pas de rechargement page entière */
  useEffect(() => {
    if (!listingsReadyRef.current || listings.length === 0) return;

    const seq = ++inventorySeqRef.current;
    let cancelled = false;

    (async () => {
      setInventoryLoading(true);
      try {
        const listingIds = listings.map((l) => l._id);
        const { from, to } = computeInventoryFetchRange(currentDate);

        const inventory = await calendarService.getInventoryForListings(
          listingIds,
          from,
          to,
          true,
          true,
        );

        if (cancelled || seq !== inventorySeqRef.current) return;

        const processed = processInventoryResponse(inventory);
        setInventoryData(processed);

        setRoomTypeByListing((prev) => {
          const next = { ...prev };
          listings.forEach((l) => {
            if (next[l._id]) return;
            const keys = processed[l._id] ? Object.keys(processed[l._id]) : [];
            if (keys[0]) next[l._id] = keys[0];
          });
          return next;
        });
      } catch (error) {
        console.error('[CalendarV3] Erreur chargement inventaire:', error);
      } finally {
        if (!cancelled && seq === inventorySeqRef.current) {
          setInventoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDate, listings]);

  /** Métadonnées listings — indépendantes de l’inventaire (colonne gauche stable) */
  const listingCatalog = useMemo(
    () =>
      listings.map((listing) => ({
        _id: listing._id,
        name: listing.name,
        propertyUnit: listing.propertyUnit || 'Multi',
        currencyCode: listing.currencyCode || 'MAD',
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

  const handleUpdateInventory = async (payloads: any[]) => {
    await Promise.all(payloads.map((payload) => calendarService.updateCalendar(payload)));

    const listingIds = listings.map((l) => l._id);
    const { from, to } = computeInventoryFetchRange(currentDate);
    const inventory = await calendarService.getInventoryForListings(listingIds, from, to, true, true);
    setInventoryData(processInventoryResponse(inventory));
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(moment(clampPivotDate(newDate)));
  };

  const monthLabel = useMemo(() => {
    const raw = currentDate.format('MMMM YYYY');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  if (listingsLoading) {
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
      <CalendarInventoryPage
        startDate={currentDate.toDate()}
        listingCatalog={listingCatalog}
        inventoriesByListing={inventoriesByListing}
        inventoryData={inventoryData}
        inventoryLoading={inventoryLoading}
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
