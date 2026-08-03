/**
 * Onglet « Résas » Inbox Guest — même grille StayView que /tasks/planning
 * et /reservations/planning, avec panneau pour communiquer (WA / OTA / initier).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import {
  Box,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import StayView from '../calendar-views/StayView';
import {
  PageFullscreenLayer,
  usePageFullscreen,
} from '../page-fullscreen';
import type { ListingRow, TimelineItem } from '../calendar-views/_shared';
import reservationsService from '../../services/reservationsService';
import listingsService from '../../services/listingsService';
import calendarService, { type CalendarBlockDto } from '../../services/calendarService';
import { usePmTasksScope } from '../../hooks/usePmTasksScope';
import cleanlinessService from '../../services/cleanlinessService';
import type { DisplayCleanliness } from '../../utils/cleanlinessDisplay';
import { mergeListingOperationalRow } from '../../utils/operationalStatusStore';
import {
  getCachedPlanningListings,
  setCachedPlanningListings,
  invalidatePlanningListingsCache,
} from '../../utils/planningListingsCache';
import { useAuth } from '../../hooks/useAuth';
import type { Reservation } from '../../types/reservations.types';
import type { ListingSummary } from '../../types/listings.types';
import {
  getPlanningDefaultStartDate,
  PLANNING_FORWARD_DAYS,
  PLANNING_INITIAL_BACK_DAYS,
  PLANNING_LOOKBACK_DAYS,
} from '../../utils/planningViewDates';
import {
  buildListingIdIndex,
  mergeActiveAndOrphanListings,
  reservationOwnerId,
  findListingForReservation,
} from '../../utils/planningListingMatch';
import { freeBlockSegmentsAfterReservations } from '../../utils/reservationBeatsCalendarBlock';
import {
  fetchInboxResas,
  initiateWhatsAppForResa,
  type InboxResaRow,
} from '../../services/inboxResasService';
import { last9Phone } from '../../utils/commsDeepLinks';
import messagesService from '../../services/messagesService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useTaskDetailDrawer } from '../../features/tasksNew/hooks/useTaskDetailDrawer';
import { usePlanningReservationDrawer } from '../../features/planning/usePlanningReservationDrawer';
import { fetchTaskNewPlanning } from '../../services/planningFulltaskMerge';
import PlanningQuickTaskMenu from '../planning/PlanningQuickTaskMenu';
import type { PlanningCreateContext } from '../calendar-views/_shared';
import {
  fetchPlanningCommsIndex,
  lookupPlanningComms,
  type PlanningCommsMeta,
} from '../../services/planningCommsEnrichment';
import { toast } from 'react-toastify';

const WA_TEMPLATE_ID = 'welcome_sojori_v2';

function mapReservationStatus(status?: string): 'confirmed' | 'pending' {
  const s = (status || '').toLowerCase();
  if (s.includes('confirm')) return 'confirmed';
  return 'pending';
}

function toIsoDate(d: Date | string | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function mapTimelineItems(raw: unknown): TimelineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => {
    const item = (t || {}) as Record<string, unknown>;
    const data = (item.data as Record<string, unknown>) || {};
    const type = (item.type || 'task') as TimelineItem['type'];
    const category = (item.category as string | undefined) || undefined;
    const cleaning_type =
      (item.cleaning_type as TimelineItem['cleaning_type']) ||
      (data.cleaning_type as TimelineItem['cleaning_type']) ||
      (data.cleaningType as TimelineItem['cleaning_type']) ||
      (type === 'cleaning' ? (category as TimelineItem['cleaning_type']) : undefined) ||
      (type === 'cleaning' ? (data.type as TimelineItem['cleaning_type']) : undefined);
    const rawPriority =
      (item.priority as TimelineItem['priority']) ||
      (data.priority as TimelineItem['priority']);
    const priority =
      rawPriority &&
      (rawPriority.urgency === 'red' ||
        rawPriority.urgency === 'orange' ||
        rawPriority.urgency === 'green')
        ? rawPriority
        : undefined;
    return {
      type,
      category,
      scheduledFor: String(item.scheduledFor || item.startDate || ''),
      isTask: (item.isTask as boolean) ?? true,
      staffId: (item.staffId as string | null) ?? null,
      staffName: (item.staffName as string | null) ?? null,
      status: String(item.status || item.taskStatus || 'CREATED'),
      cleaning_type,
      priority,
      data,
    };
  });
}

/** Index tâches par id / numéro de réservation (même dual-key que le planning). */
function buildTaskTimelineIndex(
  listings: Array<Record<string, unknown>> | undefined,
): Map<string, TimelineItem[]> {
  const map = new Map<string, TimelineItem[]>();
  if (!listings?.length) return map;
  for (const listing of listings) {
    const resas = Array.isArray(listing.reservations)
      ? (listing.reservations as Array<Record<string, unknown>>)
      : [];
    for (const r of resas) {
      const timeline = mapTimelineItems(r.timeline);
      if (!timeline.length) continue;
      for (const key of [
        String(r.reservationId || ''),
        String(r._id || ''),
        String(r.reservationNumber || ''),
      ]) {
        const k = key.trim();
        if (k) map.set(k, timeline);
      }
    }
  }
  return map;
}

export default function ResasTabV2() {
  const listFs = usePageFullscreen();
  const listFullscreen = listFs.fullscreen;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { loading: authLoading } = useAuth();
  const scope = usePmTasksScope();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const listingsCacheKey = `comms-resas-multi-v2:${scope.scopeCacheKey}`;

  /* Clic droit grille → menu création tâche (contexte logement + jour + résa déduit). */
  const [quickTaskCtx, setQuickTaskCtx] = useState<PlanningCreateContext | null>(null);
  const [quickTaskAnchor, setQuickTaskAnchor] = useState<{ x: number; y: number } | null>(null);

  const [startDate, setStartDate] = useState<Date>(() => getPlanningDefaultStartDate());
  const [daysCount] = useState(PLANNING_LOOKBACK_DAYS + PLANNING_FORWARD_DAYS);
  const [activeListings, setActiveListings] = useState<ListingSummary[]>(() => {
    return getCachedPlanningListings(listingsCacheKey) ?? [];
  });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  /** Blocages calendrier (métadonnées) — chargés en fond APRÈS les résas, jamais bloquant. */
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlockDto[]>([]);
  const [taskTimelineByKey, setTaskTimelineByKey] = useState<Map<string, TimelineItem[]>>(
    () => new Map(),
  );
  const [commsIndex, setCommsIndex] = useState<Map<string, PlanningCommsMeta>>(() => new Map());
  const [inboxByKey, setInboxByKey] = useState<Map<string, InboxResaRow>>(new Map());
  const [waPhones, setWaPhones] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openTaskById, drawer: taskDetailDrawer } = useTaskDetailDrawer();
  const fetchInboxMetaRef = useRef<() => void>(() => {});

  const windowRequestIdRef = useRef(0);
  const listingsHydratedRef = useRef(activeListings.length > 0);
  const initialViewAlignedRef = useRef(false);

  const windowRange = useCallback(() => {
    const apiStart = format(startDate, 'yyyy-MM-dd');
    const apiEnd = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
    return { apiStart, apiEnd };
  }, [startDate, daysCount]);

  const fetchActiveListings = useCallback(async () => {
    const cached = getCachedPlanningListings(listingsCacheKey);
    if (cached?.length) {
      setActiveListings(cached);
      listingsHydratedRef.current = true;
      return;
    }
    const res = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      compact: true,
      forListingsOverview: false,
      limit: 500,
      filterOwnerId: scope.filterOwnerId,
    });
    const items = res.data.items;
    setActiveListings(items);
    setCachedPlanningListings(listingsCacheKey, items);
    listingsHydratedRef.current = true;
  }, [listingsCacheKey, scope.filterOwnerId]);

  const fetchReservationsWindow = useCallback(async (): Promise<Reservation[]> => {
    const { apiStart, apiEnd } = windowRange();
    const reservationsResponse = await reservationsService.getList({
      limit: 100,
      status: 'Confirmed,Pending,Inside',
      dateType: 'arrival_or_departure',
      startDate: apiStart,
      endDate: apiEnd,
      filterOwnerId: scope.filterOwnerId,
    });
    return reservationsResponse.data;
  }, [windowRange, scope.filterOwnerId]);

  const fetchInboxMeta = useCallback(async () => {
    if (!scopeFetchReady) return;
    try {
      const [resas, convRes, comms] = await Promise.all([
        fetchInboxResas(requestOwnerId || undefined),
        messagesService
          .getConversations({
            filter: 'smart',
            hasReservation: true,
            limit: 200,
            owner_id: requestOwnerId || undefined,
            silent: true,
          })
          .catch(() => null),
        fetchPlanningCommsIndex({ ownerId: requestOwnerId || undefined }).catch(
          () => new Map<string, PlanningCommsMeta>(),
        ),
      ]);
      const map = new Map<string, InboxResaRow>();
      for (const r of resas) {
        if (r.id) map.set(r.id, r);
        if (r.reservationNumber) map.set(r.reservationNumber, r);
      }
      setInboxByKey(map);
      setCommsIndex(comms);
      const phones = new Set<string>();
      if (convRes?.status === 'success') {
        for (const c of convRes.data.conversations as Array<{ phone?: string }>) {
          if (c.phone) phones.add(last9Phone(String(c.phone)));
        }
      }
      setWaPhones(phones);
    } catch {
      /* meta canal optionnelle */
    }
  }, [scopeFetchReady, requestOwnerId]);

  fetchInboxMetaRef.current = () => {
    void fetchInboxMeta();
  };

  const { openReservation, drawer: reservationDrawer } = usePlanningReservationDrawer({
    onTaskClick: (item) => {
      const d = (item.data || {}) as Record<string, unknown>;
      const taskId = String(d.taskId || d._id || '').trim();
      if (taskId) void openTaskById(taskId);
    },
    canInitiateWhatsApp: (sel) => {
      const key = sel.reservation.reservationId || sel.reservation.reservationNumber || '';
      const inbox = inboxByKey.get(key) || inboxByKey.get(sel.reservation.reservationNumber || '');
      const phone = String(inbox?.phone || sel.reservation.lastWa?.phone || '').trim();
      if (!phone) return false;
      return !waPhones.has(last9Phone(phone));
    },
    onInitiateWhatsApp: async (sel) => {
      const key = sel.reservation.reservationId || sel.reservation.reservationNumber || '';
      const inbox = inboxByKey.get(key) || inboxByKey.get(sel.reservation.reservationNumber || '');
      const id = String(inbox?.id || sel.reservation.reservationId || key);
      const result = await initiateWhatsAppForResa(id, WA_TEMPLATE_ID);
      if (result.success) {
        toast.success('Template envoyé — le fil apparaît dans WhatsApp.');
        fetchInboxMetaRef.current();
      } else {
        toast.error(
          result.notWhatsApp
            ? 'Ce numéro ne semble pas avoir WhatsApp.'
            : result.error || 'Envoi impossible',
        );
      }
    },
  });

  const fetchWindowData = useCallback(async () => {
    const requestId = ++windowRequestIdRef.current;
    setIsRefreshing(true);
    setError(null);
    try {
      const { apiStart, apiEnd } = windowRange();
      const ownerId = scope.filterOwnerId || scope.ownerId || requestOwnerId || undefined;
      const [data, planning] = await Promise.all([
        fetchReservationsWindow(),
        ownerId
          ? fetchTaskNewPlanning({
              startDate: apiStart,
              endDate: apiEnd,
              ownerId,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (requestId !== windowRequestIdRef.current) return;
      setReservations(data);
      if (planning?.success && planning.data?.listings) {
        setTaskTimelineByKey(
          buildTaskTimelineIndex(planning.data.listings as Array<Record<string, unknown>>),
        );
      } else {
        setTaskTimelineByKey(new Map());
      }
      void fetchInboxMeta();
    } catch (e) {
      if (requestId !== windowRequestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      if (requestId === windowRequestIdRef.current) setIsRefreshing(false);
    }
  }, [
    fetchReservationsWindow,
    fetchInboxMeta,
    windowRange,
    scope.filterOwnerId,
    scope.ownerId,
    requestOwnerId,
  ]);

  useEffect(() => {
    setActiveListings([]);
    setReservations([]);
    listingsHydratedRef.current = false;
    setCalendarReady(false);
    invalidatePlanningListingsCache(listingsCacheKey);
  }, [listingsCacheKey]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        await fetchActiveListings();
        if (cancelled) return;
        await fetchWindowData();
        if (!cancelled) setCalendarReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchActiveListings, fetchWindowData]);

  useEffect(() => {
    if (!calendarReady || !listingsHydratedRef.current) return;
    if (!initialViewAlignedRef.current) {
      initialViewAlignedRef.current = true;
      return;
    }
    void fetchWindowData();
  }, [startDate, calendarReady, fetchWindowData]);

  /**
   * Blocages calendrier — fetch "smart" : APRÈS le rendu des résas (calendarReady),
   * non bloquant (getCalendarBlocks → [] sur erreur). Le planning affiche donc
   * toujours les résas, avec ou sans les blocs.
   */
  useEffect(() => {
    if (!calendarReady) return;
    const ids = activeListings.map((l) => String(l.id)).filter(Boolean);
    if (ids.length === 0) {
      setCalendarBlocks([]);
      return;
    }
    let cancelled = false;
    const { apiStart, apiEnd } = windowRange();
    void (async () => {
      const blocks = await calendarService.getCalendarBlocks(ids, apiStart, apiEnd, 'active');
      if (!cancelled) setCalendarBlocks(blocks);
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarReady, activeListings, windowRange]);

  const listingRows: ListingRow[] = useMemo(() => {
    const ownerKey = scope.filterOwnerId ? String(scope.filterOwnerId) : '';
    const rowsSource = mergeActiveAndOrphanListings(activeListings);
    if (rowsSource.length === 0) return [];

    const byId = buildListingIdIndex(activeListings);
    const windowStart = startDate;
    const windowEnd = addDays(startDate, daysCount);

    const reservationsByListing = new Map<string, Reservation[]>();
    for (const res of reservations) {
      if (ownerKey) {
        const resOwner = reservationOwnerId(res);
        if (resOwner && resOwner !== ownerKey) continue;
      }

      const matched = findListingForReservation(res, byId);
      if (!matched?.id) continue; // inactifs / hors grille : ignorés

      const arrival = toIsoDate(res.arrivalDate);
      const departure = toIsoDate(res.departureDate);
      if (!arrival || !departure) continue;
      const arr = new Date(arrival);
      const dep = new Date(departure);
      if (dep < windowStart || arr > windowEnd) continue;

      const listingId = matched.id;
      const bucket = reservationsByListing.get(listingId);
      if (bucket) bucket.push(res);
      else reservationsByListing.set(listingId, [res]);
    }

    // Blocages calendrier → pseudo-résas (kind:'block') par listing
    const blocksByListing = new Map<string, CalendarBlockDto[]>();
    for (const b of calendarBlocks) {
      const lid = String(b.listingId);
      const bucket = blocksByListing.get(lid);
      if (bucket) bucket.push(b);
      else blocksByListing.set(lid, [b]);
    }
    return rowsSource.map((listing) => {
      const listingId = String(listing.id);
      const resas = reservationsByListing.get(listingId) || [];
      const op = mergeListingOperationalRow(
        listingId,
        {
          occupancyStatus: listing.occupancyStatus,
          cleanlinessStatus_v2: listing.cleanlinessStatus_v2,
          cleanlinessEmergency: listing.cleanlinessEmergency,
        },
        undefined,
      );
      return {
        listingId,
        listingName: listing.name || 'Sans nom',
        city: listing.city || 'Sans ville',
        cleanlinessStatus_v2: String(op?.cleanlinessStatus_v2 || 'clean'),
        occupancyStatus: String(op?.occupancyStatus || 'vacant'),
        cleanlinessEmergency: Boolean(op?.cleanlinessEmergency),
        propertyUnit: String(listing.propertyUnit || 'Single'),
        roomTypes: listing.roomTypes?.length
          ? listing.roomTypes.map((rt) => ({ id: String(rt.id), name: String(rt.name) }))
          : undefined,
        reservations: resas.map((r) => {
          const reservationId = String(
            r.id || (r as { _id?: string })._id || r.reservationNumber || '',
          );
          const reservationNumber = r.reservationNumber || '';
          const inbox = inboxByKey.get(reservationId) || inboxByKey.get(reservationNumber);
          const timeline =
            taskTimelineByKey.get(reservationId) ||
            taskTimelineByKey.get(reservationNumber) ||
            [];
          const guestPhone =
            String(r.phone || '').trim() ||
            String(inbox?.phone || '').trim() ||
            '';
          const comms = lookupPlanningComms(commsIndex, reservationId, reservationNumber, {
            guestName: r.guestName || '',
            phone: guestPhone || inbox?.phone,
          });
          // WA : même preview que l’onglet WhatsApp (Q / R / A + date). Pas de faux « WhatsApp ».
          const lastWa = (() => {
            const wa = comms.lastWa;
            const phone = String(wa?.phone || guestPhone || '').trim() || undefined;
            const hasContent = Boolean(
              wa?.lastMessageKind ||
                wa?.programmedAuto ||
                (wa?.text &&
                  !/^(whatsapp|whatsapp lié|aucun message|pas de nº|—|-)$/i.test(
                    String(wa.text).trim(),
                  ) &&
                  !String(wa.text).toLowerCase().startsWith('aucun message')),
            );
            if (hasContent && wa) {
              return { ...wa, phone: phone || wa.phone, exists: true };
            }
            if (phone) {
              return {
                text: '—',
                channel: 'wa' as const,
                phone,
                exists: true,
                count: 0,
                unread: 0,
                needsReply: false,
              };
            }
            return {
              text: '—',
              channel: 'wa' as const,
              exists: false,
              count: 0,
              unread: 0,
              needsReply: false,
            };
          })();
          const lastOta = (() => {
            const ota = comms.lastOta;
            const hasContent = Boolean(
              ota?.lastMessageKind ||
                ota?.programmedAuto ||
                (ota?.text &&
                  !/^(fil ota|aucun message|message ota|—|-)$/i.test(String(ota.text).trim()) &&
                  !String(ota.text).toLowerCase().startsWith('aucun message')),
            );
            if (hasContent && ota) {
              return { ...ota, exists: true };
            }
            if (ota?.exists || ota?.threadId) {
              return {
                text: '—',
                channel: 'ota' as const,
                threadId: ota.threadId,
                exists: true,
                count: ota.count || 0,
                unread: ota.unread || 0,
                needsReply: Boolean(ota.needsReply),
              };
            }
            return ota;
          })();
          const reg = r.guestRegistration || r.police_registration;
          const toRegisterFromReg = Number(reg?.nbre_guest_to_register || 0);
          const toRegister =
            toRegisterFromReg > 0
              ? toRegisterFromReg
              : reg
                ? 0
                : Number(r.numberOfGuests || 0) || 0;
          const registered = Number(
            reg?.nbre_guest_complete ?? reg?.nbre_guest_registered ?? 0,
          );
          // Heure listing par défaut (ex. 15h / 11h) ≠ choix client — seuls les flags comptent pour la couleur.
          const arrivalChosen = Boolean(r.arrival_time_chosen || r.confirmedCheckInTime);
          const departureChosen = Boolean(r.departure_time_chosen || r.confirmedCheckOutTime);
          const customerStatus = String(r.customerStatus || '').toLowerCase();
          const arrived = Boolean(
            r.actualArrivalTime ||
              customerStatus === 'arrived' ||
              customerStatus === 'on_site',
          );
          const arrivalTime =
            r.arrival_time || r.checkInTime || r.confirmedCheckInTime || '15:00';
          const departureTime =
            (r as { departure_time?: string | null }).departure_time ||
            r.checkOutTime ||
            r.confirmedCheckOutTime ||
            '11:00';
          return {
            reservationId,
            guestName: r.guestName || 'Guest',
            arrivalDate: toIsoDate(r.arrivalDate),
            departureDate: toIsoDate(r.departureDate),
            status: mapReservationStatus(r.status),
            channelName: r.channelName || 'direct',
            numberOfGuests: r.numberOfGuests || 0,
            reservationNumber,
            roomTypeName: (() => {
              const n = String(r.roomTypeName || r.roomTypes?.roomTypeName || '').trim();
              return n || undefined;
            })(),
            roomTypeId: (() => {
              const id = String(r.roomTypeId || '').trim();
              return id || undefined;
            })(),
            roomId: (() => {
              const id = String(r.roomId || '').trim();
              return id || undefined;
            })(),
            roomName: (() => {
              const n = String(r.roomName || '').trim();
              return n || undefined;
            })(),
            lastOta,
            lastWa,
            timeline,
            stayOps: {
              registered,
              toRegister,
              arrivalChosen,
              arrivalTime,
              departureChosen,
              departureTime,
              arrived,
              arrivalDate: toIsoDate(r.arrivalDate),
              departureDate: toIsoDate(r.departureDate),
            },
          };
        }),
      };
    }).map((row) => {
      /* Résa gagne vs blocage (Import initial / manuel) : on ne montre le
         blocage que sur les jours sans séjour Sojori (segments découpés). */
      const blockRows = (blocksByListing.get(String(row.listingId)) || []).flatMap((b) => {
        const segments = freeBlockSegmentsAfterReservations({
          blockDateFrom: String(b.dateFrom),
          blockDateToInclusive: String(b.dateTo),
          reservations: row.reservations,
        });
        return segments.map((seg) => ({
          reservationId: `block-${b._id}-${seg.start}`,
          guestName: b.title,
          arrivalDate: seg.start,
          departureDate: seg.end,
          status: 'confirmed' as const,
          channelName: 'direct',
          kind: 'block' as const,
          blockNote: b.note,
          blockAuthor: b.createdBy?.name,
        }));
      });
      if (blockRows.length === 0) return row;
      return { ...row, reservations: [...row.reservations, ...blockRows] };
    });
  }, [
    activeListings,
    reservations,
    calendarBlocks,
    startDate,
    daysCount,
    scope.filterOwnerId,
    taskTimelineByKey,
    commsIndex,
    inboxByKey,
  ]);

  const goToday = useCallback(() => setStartDate(getPlanningDefaultStartDate()), []);
  const shiftDays = useCallback((delta: number) => {
    setStartDate((prev) => startOfDay(addDays(prev, delta)));
  }, []);

  const handleCleanlinessChange = useCallback(
    async (listingId: string, status: DisplayCleanliness) => {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) throw new Error(result.message || 'Échec propreté');
      invalidatePlanningListingsCache(listingsCacheKey);
      setActiveListings((prev) => {
        const next = prev.map((l) =>
          l.id === listingId
            ? {
                ...l,
                occupancyStatus: result.data?.occupancyStatus ?? l.occupancyStatus,
                cleanlinessStatus_v2: result.data?.cleanlinessStatus_v2 ?? l.cleanlinessStatus_v2,
                cleanlinessEmergency:
                  result.data?.cleanlinessEmergency ?? l.cleanlinessEmergency,
              }
            : l,
        );
        setCachedPlanningListings(listingsCacheKey, next);
        return next;
      });
    },
    [listingsCacheKey],
  );

  if ((isLoading && !calendarReady) || authLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: '#b8851a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f6f5f1' }}>
      {error && (
        <Typography sx={{ px: 2, py: 1, fontSize: 12, color: '#c81e1e' }}>{error}</Typography>
      )}
      {isRefreshing && (
        <Typography sx={{ px: 2, py: 0.5, fontSize: 11, color: '#7a756c' }}>Actualisation…</Typography>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!listFullscreen && (
        <StayView
          variant="reservations"
          enableCommsCockpit
          startDate={startDate}
          daysCount={daysCount}
          todayBackDays={PLANNING_INITIAL_BACK_DAYS}
          listings={listingRows}
          onReservationClick={(reservation, listing) => {
            openReservation(reservation, listing, 'overview');
          }}
          onTaskClick={(item: TimelineItem) => {
            const d = (item.data || {}) as Record<string, unknown>;
            const taskId = String(d.taskId || d._id || '').trim();
            if (taskId) {
              void openTaskById(taskId);
              return;
            }
            // Pas de taskId → ouvrir le drawer résa liée si possible
            const resNum = String(d.reservationNumber || d.reservationCode || '').trim();
            if (!resNum) return;
            const hit = listingRows
              .flatMap((l) =>
                (l.reservations || []).map((r) => ({ reservation: r, listing: l })),
              )
              .find(
                (x) =>
                  x.reservation.reservationNumber === resNum ||
                  x.reservation.reservationId === resNum,
              );
            if (hit) {
              openReservation(hit.reservation, {
                listingId: hit.listing.listingId,
                listingName: hit.listing.listingName,
                city: hit.listing.city,
              });
            }
          }}
          onCommsClick={(kind, reservation, listing) => {
            openReservation(reservation, listing, kind);
          }}
          onGoToday={goToday}
          onPrevDay={() => shiftDays(-1)}
          onNextDay={() => shiftDays(1)}
          onPrevWeek={() => shiftDays(-7)}
          onNextWeek={() => shiftDays(7)}
          onDateChange={(d) => setStartDate(startOfDay(d))}
          onCleanlinessChange={handleCleanlinessChange}
          onCreateTaskAt={(ctx, anchor) => {
            setQuickTaskCtx(ctx);
            setQuickTaskAnchor(anchor);
          }}
          compactLayout={isMobile}
          denseToolbar={!isMobile}
          // Toujours fillViewport : le wrapper page est overflow:hidden — sans
          // scroll interne, le vertical est mort sur desktop. Bonus : header
          // jours sticky pendant le scroll vertical (comme le calendrier).
          fillViewport
          showFullscreenEnter={!listFullscreen}
          onEnterFullscreen={listFs.enter}
        />
        )}
      </Box>

      <PageFullscreenLayer
        open={listFullscreen}
        onClose={listFs.exit}
        label="Planning ops plein écran"
      >
        <StayView
          variant="reservations"
          enableCommsCockpit
          startDate={startDate}
          daysCount={daysCount}
          todayBackDays={PLANNING_INITIAL_BACK_DAYS}
          listings={listingRows}
          onReservationClick={(reservation, listing) => {
            openReservation(reservation, listing, 'overview');
          }}
          onTaskClick={(item: TimelineItem) => {
            const d = (item.data || {}) as Record<string, unknown>;
            const taskId = String(d.taskId || d._id || '').trim();
            if (taskId) {
              void openTaskById(taskId);
              return;
            }
            const resNum = String(d.reservationNumber || d.reservationCode || '').trim();
            if (!resNum) return;
            const hit = listingRows
              .flatMap((l) =>
                (l.reservations || []).map((r) => ({ reservation: r, listing: l })),
              )
              .find(
                (x) =>
                  x.reservation.reservationNumber === resNum ||
                  x.reservation.reservationId === resNum,
              );
            if (hit) {
              openReservation(hit.reservation, {
                listingId: hit.listing.listingId,
                listingName: hit.listing.listingName,
                city: hit.listing.city,
              });
            }
          }}
          onCommsClick={(kind, reservation, listing) => {
            openReservation(reservation, listing, kind);
          }}
          onGoToday={goToday}
          onPrevDay={() => shiftDays(-1)}
          onNextDay={() => shiftDays(1)}
          onPrevWeek={() => shiftDays(-7)}
          onNextWeek={() => shiftDays(7)}
          onDateChange={(d) => setStartDate(startOfDay(d))}
          onCleanlinessChange={handleCleanlinessChange}
          onCreateTaskAt={(ctx, anchor) => {
            setQuickTaskCtx(ctx);
            setQuickTaskAnchor(anchor);
          }}
          compactLayout={isMobile}
          denseToolbar={!isMobile}
          fillViewport
          showFullscreenEnter={false}
        />
      </PageFullscreenLayer>

      {/* Clic droit sur une cellule → créer une tâche (contexte déduit de la position). */}
      <PlanningQuickTaskMenu
        ctx={quickTaskCtx}
        anchorPos={quickTaskAnchor}
        ownerId={scope.filterOwnerId || scope.ownerId || requestOwnerId || undefined}
        onClose={() => {
          setQuickTaskCtx(null);
          setQuickTaskAnchor(null);
        }}
        onCreated={() => void fetchWindowData()}
      />

      {reservationDrawer}
      {taskDetailDrawer}
    </Box>
  );
}
