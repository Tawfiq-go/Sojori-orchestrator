// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPageV3 — wrapper avec nouveau design Atelier 2026
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/fr';
import { Box, Button, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import listingsService from '../services/listingsService';
import calendarService, { type CalendarBlockDto } from '../services/calendarService';
import type { Listing as ListingType } from '../types/listings.types';
import CalendarInventoryPage from '../components/calendar-v3/CalendarInventoryPage.jsx';
import {
  computeSimpleMonthsFetchRange,
  computeMultiViewFetchRange,
  computeMultiViewPrefetchRange,
  eachIsoDayInclusive,
  clampPivotDate,
} from '../components/calendar-v3/inventoryCalendarConstants';
import { processInventoryResponse, type ProcessedInventoryData } from '../components/calendar-v3/processInventoryResponse';
import { mergeProcessedInventory } from '../components/calendar-v3/mergeProcessedInventory';
import {
  fetchApplySyncSummary,
  type PortfolioApplySyncSummaryDto,
} from '../services/dynamicPricingApi';

export const CALENDAR_LISTINGS_PAGE_SIZE = 25;

moment.locale('fr');

function inventoryCacheKey(from: string, to: string, listingIds: string[]): string {
  return `${from}|${to}|${[...listingIds].sort().join(',')}`;
}

function listingIdsKey(listingIds: string[]): string {
  return [...listingIds].sort().join(',');
}

function calMultiLog(step: string, extra?: Record<string, unknown>) {
  console.log(`[CalendarMulti] ${step}`, extra || '');
}

/** Nb de mois chargés initialement en vue simple (scroll → load more). 1 = 1er paint rapide (Multi 33 types). */
const SIMPLE_INITIAL_MONTHS = 1;
/** Mois ajoutés à chaque « load more » (sentinel de scroll). */
const SIMPLE_MONTHS_INCREMENT = 2;
/** Horizon max en mois (aligné INVENTORY_FUTURE_HORIZON_DAYS ≈ 36 mois). */
const SIMPLE_MAX_MONTHS = 37;

export function CalendarInventoryPageV3() {
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [searchParams] = useSearchParams();
  const simpleMode = searchParams.get('view') === 'simple';
  const simpleListingId = searchParams.get('listing') || null;
  const [simpleMonths, setSimpleMonths] = useState(SIMPLE_INITIAL_MONTHS);

  const [listingsLoading, setListingsLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [inventoryData, setInventoryData] = useState<ProcessedInventoryData>({});
  const [currentDate, setCurrentDate] = useState(() => moment(clampPivotDate(new Date())));
  const [roomTypeByListing, setRoomTypeByListing] = useState<Record<string, string>>({});
  const inventorySeqRef = useRef(0);
  /** Cache chunks bruts (simple + multi) — clé from|to|ids */
  const inventoryCacheRef = useRef<Map<string, ProcessedInventoryData>>(new Map());
  /** Multi only : jours déjà fusionnés en mémoire (évite refetch fenêtre déjà vue). */
  const multiLoadedDaysRef = useRef<Map<string, Set<string>>>(new Map());
  const [dpSyncSummary, setDpSyncSummary] = useState<PortfolioApplySyncSummaryDto | null>(null);
  const [dpSyncLoading, setDpSyncLoading] = useState(false);
  /** Métadonnées des blocages (titre/note/auteur) par blockId — chargées en fond, jamais bloquant. */
  const [calendarBlocksById, setCalendarBlocksById] = useState<Record<string, CalendarBlockDto>>({});
  const [blocksRefreshKey, setBlocksRefreshKey] = useState(0);

  /**
   * Simple : inchangé (mois / load-more).
   * Multi : uniquement la fenêtre visible (31j) — le reste à la demande.
   */
  const fetchRange = useMemo(
    () =>
      simpleMode
        ? computeSimpleMonthsFetchRange(currentDate, simpleMonths)
        : computeMultiViewFetchRange(currentDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- simple ancré mois ; multi ancré jour
    [
      simpleMode ? currentDate.format('YYYY-MM') : currentDate.format('YYYY-MM-DD'),
      simpleMode,
      simpleMonths,
    ],
  );

  const visibleListingIds = useMemo(
    () => listings.map((listing) => listing._id),
    [listings],
  );

  /** Vue simple : on ne charge l'inventaire que du listing sélectionné (plage longue). */
  const inventoryListingIds = useMemo(() => {
    if (!simpleMode) return visibleListingIds;
    if (!simpleListingId) return [];
    return visibleListingIds.includes(simpleListingId) ? [simpleListingId] : [];
  }, [simpleMode, simpleListingId, visibleListingIds]);

  const handleLoadMoreMonths = useCallback(() => {
    setSimpleMonths((m) => Math.min(m + SIMPLE_MONTHS_INCREMENT, SIMPLE_MAX_MONTHS));
  }, []);

  const clearInventoryState = useCallback(() => {
    setInventoryData({});
    inventoryCacheRef.current.clear();
    multiLoadedDaysRef.current.clear();
  }, []);

  const markMultiDaysLoaded = useCallback((idsKey: string, from: string, to: string) => {
    let set = multiLoadedDaysRef.current.get(idsKey);
    if (!set) {
      set = new Set();
      multiLoadedDaysRef.current.set(idsKey, set);
    }
    for (const day of eachIsoDayInclusive(from, to)) set.add(day);
  }, []);

  const isMultiRangeLoaded = useCallback((idsKey: string, from: string, to: string) => {
    const set = multiLoadedDaysRef.current.get(idsKey);
    if (!set || set.size === 0) return false;
    return eachIsoDayInclusive(from, to).every((d) => set.has(d));
  }, []);

  /** Listings paginés — refetch quand scope / page change */
  useEffect(() => {
    let cancelled = false;
    if (!scopeFetchReady) {
      setListings([]);
      setListingsTotal(0);
      clearInventoryState();
      setListingsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setListingsLoading(true);
      clearInventoryState();
      calMultiLog('listings:start', { page: listingsPage, owner: requestOwnerId || null });
      const t0 = performance.now();
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
          calMultiLog('listings:empty', { ms: Math.round(performance.now() - t0) });
          return;
        }

        if (!cancelled) {
          setListings(listingsResponse.data);
          setListingsTotal(listingsResponse.total || listingsResponse.data.length);
          if (listingsResponse.data.length > 0) {
            setInventoryLoading(true);
          }
          calMultiLog('listings:ok', {
            n: listingsResponse.data.length,
            names: listingsResponse.data.slice(0, 8).map((l) => l.name),
            multi: listingsResponse.data.filter((l) => String(l.propertyUnit) === 'Multi').length,
            catalogRts: listingsResponse.data.map((l) => ({
              name: l.name,
              rts: Array.isArray((l as { roomTypes?: unknown[] }).roomTypes)
                ? (l as { roomTypes: unknown[] }).roomTypes.length
                : 0,
            })),
            ms: Math.round(performance.now() - t0),
          });
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
  }, [staging, scopeFetchReady, requestOwnerId, listingsPage, clearInventoryState]);

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

  /**
   * Blocages (métadonnées) — fetch "smart" : en fond, après le paint inventaire,
   * getCalendarBlocks retourne [] sur erreur → l'affichage se dégrade en
   * "Bloqué" générique sans jamais casser ni ralentir le calendrier.
   */
  useEffect(() => {
    if (inventoryListingIds.length === 0) {
      setCalendarBlocksById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const blocks = await calendarService.getCalendarBlocks(
        inventoryListingIds,
        fetchRange.from,
        fetchRange.to,
        'active',
      );
      if (cancelled) return;
      const map: Record<string, CalendarBlockDto> = {};
      blocks.forEach((b) => {
        map[b._id] = b;
      });
      setCalendarBlocksById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [inventoryListingIds.join(','), fetchRange.from, fetchRange.to, blocksRefreshKey]);

  const applyRoomTypeDefaults = useCallback((listingIds: string[], processed: ProcessedInventoryData) => {
    setRoomTypeByListing((prev) => {
      const next = { ...prev };
      listingIds.forEach((id) => {
        if (next[id]) return;
        const keys = processed[id] ? Object.keys(processed[id]) : [];
        if (keys[0]) next[id] = keys[0];
      });
      return next;
    });
  }, []);

  /**
   * Charge un chunk inventaire.
   * - simple : replace (comportement historique)
   * - multi : merge + skip si fenêtre déjà en mémoire
   * - silent : prefetch (pas de spinner)
   */
  const loadInventory = useCallback(
    async (
      listingIds: string[],
      from: string,
      to: string,
      seq: number,
      options?: { merge?: boolean; silent?: boolean },
    ) => {
      const merge = options?.merge === true;
      const silent = options?.silent === true;

      if (listingIds.length === 0) {
        if (!silent) {
          setInventoryData({});
          setInventoryLoading(false);
        }
        return;
      }

      const idsKey = listingIdsKey(listingIds);

      if (merge && isMultiRangeLoaded(idsKey, from, to)) {
        calMultiLog('inventory:skip-loaded', { from, to, silent, seq });
        if (seq === inventorySeqRef.current && !silent) {
          setInventoryLoading(false);
        }
        return;
      }

      const cacheKey = inventoryCacheKey(from, to, listingIds);
      const cached = inventoryCacheRef.current.get(cacheKey);
      calMultiLog('inventory:start', {
        from,
        to,
        nIds: listingIds.length,
        merge,
        silent,
        seq,
        cache: Boolean(cached),
      });
      const t0 = performance.now();
      if (cached) {
        if (seq !== inventorySeqRef.current) return;
        if (merge) {
          setInventoryData((prev) => mergeProcessedInventory(prev, cached));
          markMultiDaysLoaded(idsKey, from, to);
        } else {
          setInventoryData(cached);
        }
        applyRoomTypeDefaults(listingIds, cached);
        if (!silent) setInventoryLoading(false);
        calMultiLog('inventory:cache', {
          from,
          to,
          keys: Object.keys(cached).length,
          ms: Math.round(performance.now() - t0),
        });
        return;
      }

      if (!silent) setInventoryLoading(true);
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

        if (merge) {
          setInventoryData((prev) => mergeProcessedInventory(prev, processed));
          markMultiDaysLoaded(idsKey, from, to);
        } else {
          setInventoryData(processed);
        }
        applyRoomTypeDefaults(listingIds, processed);
        calMultiLog('inventory:ok', {
          from,
          to,
          silent,
          merge,
          listings: Object.keys(processed).length,
          rts: Object.values(processed).reduce((n, block) => n + Object.keys(block || {}).length, 0),
          ms: Math.round(performance.now() - t0),
        });
      } catch (error) {
        console.error('[CalendarV3] Erreur chargement inventaire:', error);
      } finally {
        if (seq === inventorySeqRef.current && !silent) {
          setInventoryLoading(false);
        }
      }
    },
    [applyRoomTypeDefaults, isMultiRangeLoaded, markMultiDaysLoaded],
  );

  useEffect(() => {
    setListingsPage(0);
  }, [requestOwnerId]);

  /**
   * Inventaire simple : 1er mois bloquant, puis mois suivants en silent merge
   * (évite 3 mois × 33 roomTypes au premier chargement Multi).
   */
  useEffect(() => {
    if (!simpleMode) return;
    if (listings.length === 0) return;
    if (inventoryListingIds.length === 0) return;

    const seq = ++inventorySeqRef.current;
    const ids = inventoryListingIds;
    let cancelled = false;

    void (async () => {
      // Paint rapide : uniquement le 1er mois visible
      const primary = computeSimpleMonthsFetchRange(currentDate, 1);
      await loadInventory(ids, primary.from, primary.to, seq, {
        merge: true,
        silent: false,
      });
      if (cancelled || seq !== inventorySeqRef.current) return;

      // Mois 2..N déjà demandés (scroll / state) → compléter en fond
      if (simpleMonths > 1) {
        const full = computeSimpleMonthsFetchRange(currentDate, simpleMonths);
        window.setTimeout(() => {
          if (cancelled || seq !== inventorySeqRef.current) return;
          void loadInventory(ids, full.from, full.to, seq, { merge: true, silent: true });
        }, 200);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    simpleMode,
    currentDate.format('YYYY-MM'),
    simpleMonths,
    inventoryListingIds.join(','),
    listings.length,
    loadInventory,
  ]);

  /**
   * Inventaire multi : 1) fenêtre visible (bloquant), 2) prefetch fenêtre suivante (silent).
   * Ne touche pas à la vue simple.
   */
  useEffect(() => {
    if (simpleMode) return;
    if (listings.length === 0) return;

    const seq = ++inventorySeqRef.current;
    const ids = inventoryListingIds;
    const primary = fetchRange;
    let cancelled = false;

    void (async () => {
      await loadInventory(ids, primary.from, primary.to, seq, { merge: true, silent: false });
      if (cancelled || seq !== inventorySeqRef.current) return;

      // Prefetch fenêtre suivante (idle) — pas de spinner
      const prefetch = computeMultiViewPrefetchRange(currentDate);
      window.setTimeout(() => {
        if (cancelled || seq !== inventorySeqRef.current) return;
        void loadInventory(ids, prefetch.from, prefetch.to, seq, { merge: true, silent: true });
      }, 250);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    simpleMode,
    fetchRange.from,
    fetchRange.to,
    inventoryListingIds.join(','),
    listings.length,
    loadInventory,
    currentDate.format('YYYY-MM-DD'),
  ]);

  const listingCatalog = useMemo(
    () =>
      listings.map((listing) => ({
        _id: listing._id,
        name: listing.name,
        city: (listing as { city?: string }).city || '',
        coverImageUrl: (listing as { coverImageUrl?: string }).coverImageUrl || '',
        propertyUnit: listing.propertyUnit || 'Multi',
        currencyCode: listing.currencyCode || listing.currency || 'MAD',
        photoColor: listing.photoColor || '#fde68a',
        photoColorDeep: listing.photoColorDeep || '#d97706',
        roomTypeId: roomTypeByListing[listing._id] || 'default',
        calendarImportReview: listing.calendarImportReview || null,
        // Multi filtre Rés. : rooms physiques sous chaque roomType
        roomTypes: Array.isArray((listing as { roomTypes?: unknown[] }).roomTypes)
          ? (listing as { roomTypes: unknown[] }).roomTypes
          : [],
      })),
    [listings, roomTypeByListing],
  );

  const inventoriesByListing = useMemo(() => {
    const result: Record<string, Record<string, unknown>> = {};
    listings.forEach((listing) => {
      const listingInv = inventoryData[listing._id] || {};
      const keys = Object.keys(listingInv);
      const isMulti = String(listing.propertyUnit || '') === 'Multi' && keys.length > 1;
      if (isMulti) {
        // Ligne hôtel = somme des availableRoom de tous les roomTypes
        const agg: Record<string, Record<string, unknown>> = {};
        keys.forEach((rtId) => {
          const avail = listingInv[rtId]?.availability || {};
          Object.entries(avail).forEach(([dateStr, inv]) => {
            const day = inv as Record<string, unknown>;
            if (!agg[dateStr]) {
              // Hôtel Multi : somme dispo seulement — min/max stay sont par roomType
              agg[dateStr] = {
                ...day,
                availableRoom: 0,
                minStay: undefined,
                maxStay: undefined,
                min_stay_arrival: undefined,
                max_stay: undefined,
              };
            }
            const prev = Number(agg[dateStr].availableRoom) || 0;
            const add = Number(day.availableRoom) || 0;
            agg[dateStr].availableRoom = prev + add;
            // Building : dispo seulement (pas de prix, pas de résas — résas = filtre rooms).
            delete agg[dateStr].basePrice;
            delete agg[dateStr].calculatedPrice;
            delete agg[dateStr].manualPrice;
            delete agg[dateStr].dynamicPrice;
            delete agg[dateStr].price;
            delete agg[dateStr].reservations;
            // Conserver stopSell / blockId si un RT est bloqué (hachures building)
            if (day.stopSell === true) agg[dateStr].stopSell = true;
            if (day.blockId && !agg[dateStr].blockId) agg[dateStr].blockId = day.blockId;
            if (day.available === false) {
              // building reste « ouvert » si une autre chambre est dispo — on ne force pas false
            }
          });
        });
        result[listing._id] = agg;
        return;
      }
      const rtId = roomTypeByListing[listing._id] || keys[0];
      const roomInv = rtId ? listingInv[rtId] : undefined;
      result[listing._id] = roomInv?.availability || {};
    });
    return result;
  }, [listings, inventoryData, roomTypeByListing]);

  const handleUpdateInventory = async (payloads: unknown[]) => {
    if (payloads.length === 0) return;
    await calendarService.updateCalendar(payloads as never);

    inventoryCacheRef.current.clear();
    multiLoadedDaysRef.current.clear();
    const seq = ++inventorySeqRef.current;
    await loadInventory(inventoryListingIds, fetchRange.from, fetchRange.to, seq, {
      merge: !simpleMode,
      silent: false,
    });
    // Recharge les métadonnées de blocage (un bloc a pu être créé/libéré).
    setBlocksRefreshKey((k) => k + 1);
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(moment(clampPivotDate(newDate)));
  };

  const monthLabel = useMemo(() => {
    const raw = currentDate.format('MMMM YYYY');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  const totalPages = Math.max(1, Math.ceil(listingsTotal / CALENDAR_LISTINGS_PAGE_SIZE));
  const startDateJs = useMemo(
    () => currentDate.toDate(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDate.format('YYYY-MM-DD')],
  );
  const multiBooting =
    !simpleMode &&
    (listings.length === 0 || Object.keys(inventoryData).length === 0) &&
    (listingsLoading || inventoryLoading);

  if ((simpleMode && listingsLoading && listings.length === 0) || multiBooting) {
    return (
      <DashboardWrapper compactMain titleMeta={simpleMode ? undefined : monthLabel}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#7a756c' }}>
          Chargement du calendrier…
        </div>
      </DashboardWrapper>
    );
  }

  return (
    // Vue simple : pas de chip mois en haut — le mois est déjà dans le calendrier (verticalité).
    <DashboardWrapper compactMain titleMeta={simpleMode ? undefined : monthLabel}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
      {listingsTotal > CALENDAR_LISTINGS_PAGE_SIZE ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5, px: 0.5, flexShrink: 0 }}
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
        startDate={startDateJs}
        listingCatalog={listingCatalog}
        inventoriesByListing={inventoriesByListing}
        inventoryData={inventoryData}
        calendarBlocksById={calendarBlocksById}
        inventoryLoading={inventoryLoading || listingsLoading}
        defaultView="multi"
        simpleMonthsCount={simpleMonths}
        onLoadMoreMonths={handleLoadMoreMonths}
        onUpdateInventory={handleUpdateInventory}
        onDateChange={handleDateChange}
        dpSyncSummary={dpSyncSummary}
        dpSyncLoading={dpSyncLoading}
        listingNameById={listingNameById}
        onCalendarImportReviewFinished={(listingId: string) => {
          setListings((prev) =>
            prev.map((l) =>
              String(l._id) === String(listingId)
                ? {
                    ...l,
                    calendarImportReview: {
                      ...(l.calendarImportReview || {}),
                      active: false,
                      completedAt: new Date().toISOString(),
                    },
                  }
                : l,
            ),
          );
        }}
        onCalendarImportReviewActivated={(listingId: string, data?: { active?: boolean; startedAt?: string | null }) => {
          setListings((prev) =>
            prev.map((l) =>
              String(l._id) === String(listingId)
                ? {
                    ...l,
                    calendarImportReview: {
                      ...(l.calendarImportReview || {}),
                      ...(data || {}),
                      active: true,
                      startedAt: data?.startedAt || new Date().toISOString(),
                      completedAt: null,
                    },
                  }
                : l,
            ),
          );
        }}
        onRefreshCalendarBlocks={() => {
          setBlocksRefreshKey((k) => k + 1);
        }}
      />
      </Box>
    </DashboardWrapper>
  );
}

export default CalendarInventoryPageV3;
