// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPage.jsx — wrapper toolbar + Multi/Simple toggle
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { T, resolveSelectionCurrency, sortCalendarColumns } from './_shared';
import MultiView from './MultiView';
import SimpleView from './SimpleView';
import ColumnFilters from './ColumnFilters';
import UpdateInventoryModal from './UpdateInventoryModal';
import BlockRoomModal from './BlockRoomModal';
import ReleaseRoomBlockPanel from './ReleaseRoomBlockPanel';
import CalendarDatePicker from './CalendarDatePicker';
import DpSyncAuditStrip from './DpSyncAuditStrip';
import CalendarLandscapeHint from './CalendarLandscapeHint';
import ReservationCalendarDrawer from './ReservationCalendarDrawer';
import { useCalendarBreakpoint } from '../../hooks/useCalendarBreakpoint';
import { normalizeCalendarReservation, reservationRouteId } from './reservationCalendarUtils';
import reservationsService from '../../services/reservationsService';
import calendarService from '../../services/calendarService';
import { isCalendarImportReviewActive } from '../../services/calendarImportReviewService';
import {
  MULTI_VISIBLE_DAYS,
  INVENTORY_PAST_RETENTION_DAYS,
  CALENDAR_HORIZON_MESSAGE,
  clampPivotDate,
  isAtHorizonEnd,
  formatHorizonEndLabel,
  getCalendarWindowBounds,
} from './inventoryCalendarConstants';
import { toIsoDay, filterReservationsForRoom } from './multiCalendarReservations';
import { filterBlocksForRoom, roomRangeOverlapMessage } from './roomBlockDisplay';
import { useWriteAccess } from '../../hooks/useWriteAccess';
import { useAuth } from '../../hooks/useAuth';
import { fetchPilotConfig } from '../../services/dynamicPricingApi';
import {
  PageFullscreenEnterBtn,
  PageFullscreenLayer,
  usePageFullscreen,
} from '../page-fullscreen';
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarInventoryPage({
  startDate = new Date(),
  listingCatalog = [],
  listings: listingsProp,
  inventoriesByListing = {},
  inventoryData = {},
  calendarBlocksById = {},
  inventoryLoading = false,
  onUpdateInventory,
  onDateChange,
  defaultView = 'multi',
  simpleMonthsCount = 3,
  onLoadMoreMonths,
  dpSyncSummary = null,
  dpSyncLoading = false,
  listingNameById = {},
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
  onRefreshCalendarBlocks,
}) {
  const listings = listingCatalog.length > 0 ? listingCatalog : listingsProp || [];

  // ── Prix dynamique par listing : pilote OFF → éléments DP masqués partout ──
  const { user: authUser } = useAuth();
  const roleLc = String(authUser?.role || '').toLowerCase();
  const isPlatformAdmin = roleLc === 'admin' || roleLc === 'superadmin';
  /** Blocage / libération chambre : Owner + Admin + SuperAdmin (modal dédié, pas inventaire). */
  const canBlockRooms =
    isPlatformAdmin || roleLc === 'owner';
  const [dpEnabledByListing, setDpEnabledByListing] = useState({});
  const listingIdsKey = listings.map((l) => String(l._id)).join(',');
  useEffect(() => {
    let cancelled = false;
    const ids = listingIdsKey ? listingIdsKey.split(',').filter(Boolean).slice(0, 30) : [];
    if (!ids.length) return undefined;
    Promise.all(
      ids.map(async (id) => {
        try {
          const cfg = await fetchPilotConfig(id);
          return [id, Boolean(cfg?.data?.config?.enabled)];
        } catch {
          return [id, false];
        }
      }),
    ).then((entries) => {
      if (!cancelled) setDpEnabledByListing(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [listingIdsKey]);
  /** undefined (chargement) → true pour éviter le flash sur les biens pilote ON */
  const dpOn = (id) => dpEnabledByListing[String(id)] !== false;
  const { canWrite } = useWriteAccess('calendar/multi');
  const [searchParams, setSearchParams] = useSearchParams();
  const viewFromUrl = searchParams.get('view') === 'simple' ? 'simple' : 'multi';

  const [view, setViewState] = useState(viewFromUrl || defaultView);
  /** Vue simple : listing sélectionné porté par l'URL (?listing=) — deep-linkable. */
  const selectedListingId = searchParams.get('listing') || null;
  /** Multi simple Airbnb : 1 calendrier = 1 roomType (?roomType=). */
  const selectedRoomTypeId = searchParams.get('roomType') || null;
  const setSelectedListingId = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (id) p.set('listing', String(id));
          else p.delete('listing');
          // Changer de listing → reset roomType (sera ré-auto-sélectionné si Multi)
          p.delete('roomType');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setSelectedRoomTypeId = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (id) p.set('roomType', String(id));
          else p.delete('roomType');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setView = useCallback(
    (next) => {
      const v = next === 'simple' ? 'simple' : 'multi';
      setViewState(v);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('view', v);
          if (v === 'multi') {
            // Multi ignore roomType ; on le garde en URL pour revenir en simple
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setViewState(viewFromUrl);
  }, [viewFromUrl]);

  const [selectedColumns, setSelectedColumns] = useState([
    'rate',
    'availableRoom',
    'reservations',
    'minStay',
    'dynamicPrice',
  ]);
  const [pivotDate, setPivotDate] = useState(() => startOfDay(startDate));
  const [modalCells, setModalCells] = useState(null);
  const [blockRoomDraft, setBlockRoomDraft] = useState(null);
  const [releaseBlockTarget, setReleaseBlockTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const [limitHint, setLimitHint] = useState(null);
  const [drawerReservation, setDrawerReservation] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  /** Plein écran grille — même geste ⛶ que planning / inbox (mobile + web). */
  const calendarFs = usePageFullscreen();
  const calendarFullscreen = calendarFs.fullscreen;

  const { showLandscapeHint } = useCalendarBreakpoint();
  const { maxPivotStart, horizonEnd } = useMemo(() => getCalendarWindowBounds(), []);
  const atHorizonEnd = isAtHorizonEnd(pivotDate);

  const windowStart = useMemo(() => startOfDay(pivotDate), [pivotDate]);

  /**
   * Multi — toujours fetch résas pour statut room (dispo/réservé).
   * Filtre « Rés. » = barres Gantt uniquement (pas l’affichage des rooms).
   */
  const [multiOverlayReservations, setMultiOverlayReservations] = useState([]);
  const resaFilterOn = view === 'multi' && selectedColumns.includes('reservations');

  const handleCellsSelected = useCallback(
    (cells) => {
      if (!Array.isArray(cells) || cells.length === 0) return;
      if (cells[0]?.column === 'roomBlock') {
        if (!canBlockRooms) return;
        const isos = cells.map((c) => c.dateStr).filter(Boolean).sort();
        const dateFrom = isos[0];
        const dateTo = isos[isos.length - 1];
        const roomId = String(cells[0].roomId || '');
        const roomName = cells[0].roomName || 'Chambre';
        const roomBlocks = filterBlocksForRoom(calendarBlocksById, roomId);
        const roomResas = filterReservationsForRoom(
          multiOverlayReservations,
          roomId,
          roomName,
        );
        const overlapMessage = roomRangeOverlapMessage({
          reservations: roomResas,
          blocks: roomBlocks,
          dateFrom,
          dateTo,
        });
        setBlockRoomDraft({
          roomId,
          roomName,
          dateFrom,
          dateTo,
          overlapMessage,
        });
        return;
      }
      if (cells[0]?.column === 'roomUnblock') {
        if (!canBlockRooms) return;
        const isos = cells.map((c) => c.dateStr).filter(Boolean).sort();
        const dateFrom = isos[0];
        const dateTo = isos[isos.length - 1];
        const roomId = String(cells[0].roomId || '');
        const roomName = cells[0].roomName || 'Chambre';
        const roomBlocks = filterBlocksForRoom(calendarBlocksById, roomId);
        const covering = roomBlocks.filter((b) => {
          const bf = String(b.dateFrom || '').slice(0, 10);
          const bt = String(b.dateTo || '').slice(0, 10);
          return bf && bt && bf <= dateTo && dateFrom <= bt;
        });
        if (covering.length === 0) return;
        setReleaseBlockTarget({
          block: covering[0],
          roomName,
        });
        return;
      }
      if (canWrite) setModalCells(cells);
    },
    [canBlockRooms, canWrite, calendarBlocksById, multiOverlayReservations],
  );

  const refreshBlocks = useCallback(async () => {
    await onRefreshCalendarBlocks?.();
  }, [onRefreshCalendarBlocks]);

  useEffect(() => {
    if (view !== 'multi') {
      setMultiOverlayReservations([]);
      return undefined;
    }
    let cancelled = false;
    const from = toIsoDay(windowStart);
    const end = new Date(windowStart);
    end.setDate(end.getDate() + MULTI_VISIBLE_DAYS);
    const to = toIsoDay(end);
    if (!from || !to) return undefined;
    (async () => {
      try {
        const res = await reservationsService.getList({
          limit: 500,
          // Calendrier : actifs seulement. Annulées (même non ack) → pages /resa, pas ici.
          status: 'Confirmed,Started,Pending,Inside',
          dateType: 'arrival_or_departure',
          startDate: from,
          endDate: to,
        });
        if (!cancelled) setMultiOverlayReservations(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.warn('[CalendarMulti] fetch résas overlay:', err);
        if (!cancelled) setMultiOverlayReservations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, windowStart]);

  useEffect(() => {
    setPivotDate(clampPivotDate(startDate));
  }, [startDate]);

  useEffect(() => {
    if (!limitHint) return undefined;
    const t = setTimeout(() => setLimitHint(null), 4500);
    return () => clearTimeout(t);
  }, [limitHint]);

  useEffect(() => {
    // Vue simple façon Airbnb : le 1er listing est auto-sélectionné,
    // et on re-sélectionne si le listing de l'URL n'existe plus dans le catalogue.
    if (view !== 'simple' || listings.length === 0) return;
    const exists =
      selectedListingId &&
      listings.some((l) => String(l._id) === String(selectedListingId));
    if (!exists) setSelectedListingId(String(listings[0]._id));
  }, [view, listings, selectedListingId, setSelectedListingId]);

  /**
   * Libère un CalendarBlock (partagé vue simple + modal) :
   * 1. métadonnée d'abord (retire blockId des jours) — si échec, on s'arrête et la dispo n'est pas touchée ;
   * 2. réouverture dispo via le chemin existant (→ RU U=1, Channex) + refetch.
   */
  const releaseBlock = useCallback(
    async (block, fromIso, toIso) => {
      await calendarService.releaseCalendarBlock(String(block._id), {
        dateFrom: fromIso,
        dateTo: toIso,
      });
      await onUpdateInventory?.([
        {
          roomTypeId: String(block.roomTypeId),
          date_from: fromIso,
          date_to: toIso,
          type: 'availability',
          availableRoom: 1,
        },
        {
          roomTypeId: String(block.roomTypeId),
          date_from: fromIso,
          date_to: toIso,
          type: 'stopSell',
          stopSell: false,
        },
      ]);
    },
    [onUpdateInventory],
  );

  const catalogListing = useMemo(
    () => listings.find((l) => String(l._id) === String(selectedListingId)) || null,
    [listings, selectedListingId],
  );

  /** RoomTypes inventaire + chambres physiques (listing forCalendar). */
  const roomTypesForSelected = useMemo(() => {
    if (!selectedListingId) return [];
    const block = inventoryData[selectedListingId] || {};
    const catalogRts = Array.isArray(catalogListing?.roomTypes) ? catalogListing.roomTypes : [];
    const roomsByRtId = new Map();
    catalogRts.forEach((rt) => {
      const id = String(rt?._id || rt?.id || '');
      if (!id) return;
      const roomsSrc = Array.isArray(rt.rooms) ? rt.rooms : [];
      roomsByRtId.set(
        id,
        roomsSrc
          .map((rm) => {
            const rid = String(rm?._id || rm?.id || '');
            const name =
              rm?.roomName ||
              rm?.name ||
              (rm?.roomNumber != null ? `Chambre ${rm.roomNumber}` : '');
            if (!rid || !name) return null;
            return {
              id: rid,
              name: String(name),
              number: rm?.roomNumber != null ? Number(rm.roomNumber) : undefined,
            };
          })
          .filter(Boolean),
      );
    });
    return Object.entries(block)
      .map(([id, v]) => ({
        _id: String(id),
        name: (v && v.name) || `Type ${String(id).slice(-4)}`,
        roomNumber: Number(v?.roomNumber) || roomsByRtId.get(String(id))?.length || 0,
        personCapacityMax: Number(v?.personCapacityMax) || 0,
        availability: (v && v.availability) || {},
        rooms: roomsByRtId.get(String(id)) || [],
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr'));
  }, [inventoryData, selectedListingId, catalogListing]);

  /** Simple Airbnb Multi : rail = room types (pas l'agrégat hôtel). */
  const isMultiListing = Boolean(catalogListing) && String(catalogListing.propertyUnit || '') === 'Multi';
  const isMultiSimple = isMultiListing && roomTypesForSelected.length > 1;

  useEffect(() => {
    if (view !== 'simple' || !isMultiSimple || roomTypesForSelected.length === 0) return;
    const exists = roomTypesForSelected.some(
      (rt) => String(rt._id) === String(selectedRoomTypeId),
    );
    if (!exists) setSelectedRoomTypeId(String(roomTypesForSelected[0]._id));
  }, [
    view,
    isMultiSimple,
    roomTypesForSelected,
    selectedRoomTypeId,
    setSelectedRoomTypeId,
  ]);

  const activeRoomType = useMemo(() => {
    if (!isMultiListing) return null;
    return (
      roomTypesForSelected.find((rt) => String(rt._id) === String(selectedRoomTypeId)) ||
      roomTypesForSelected[0] ||
      null
    );
  }, [isMultiListing, roomTypesForSelected, selectedRoomTypeId]);

  const simpleInventories = useMemo(() => {
    // Multi : jamais l'agrégat hôtel — uniquement le roomType actif (ou vide tant que non chargé)
    if (isMultiListing) return activeRoomType?.availability || {};
    if (!selectedListingId) return {};
    return inventoriesByListing[selectedListingId] || {};
  }, [isMultiListing, activeRoomType, selectedListingId, inventoriesByListing]);

  const simpleRailItems = useMemo(() => {
    if (!isMultiSimple) return listings;
    return roomTypesForSelected.map((rt) => ({
      _id: rt._id,
      name: rt.name,
      roomNumber: rt.roomNumber,
      personCapacityMax: rt.personCapacityMax,
      city: catalogListing?.name || '',
    }));
  }, [isMultiSimple, listings, roomTypesForSelected, catalogListing]);

  const multiHotelMeta = useMemo(() => {
    if (!isMultiSimple || !catalogListing) return null;
    const units = roomTypesForSelected.reduce((s, rt) => s + (Number(rt.roomNumber) || 0), 0);
    return {
      name: catalogListing.name || '',
      city: catalogListing.city || '',
      coverImageUrl: catalogListing.coverImageUrl || '',
      photoColor: catalogListing.photoColor || '#fde68a',
      photoColorDeep: catalogListing.photoColorDeep || '#d97706',
      roomTypeCount: roomTypesForSelected.length,
      units,
    };
  }, [isMultiSimple, catalogListing, roomTypesForSelected]);

  const selectedListing = useMemo(() => {
    if (!catalogListing) return null;
    const rtId = isMultiListing
      ? String(activeRoomType?._id || selectedRoomTypeId || roomTypesForSelected[0]?._id || '')
      : String(catalogListing.roomTypeId || roomTypesForSelected[0]?._id || 'default');
    const rtName = isMultiListing
      ? activeRoomType?.name || roomTypesForSelected[0]?.name || ''
      : roomTypesForSelected[0]?.name || 'Standard';
    const rooms = Array.isArray(activeRoomType?.rooms)
      ? activeRoomType.rooms
      : Array.isArray(roomTypesForSelected[0]?.rooms)
        ? roomTypesForSelected[0].rooms
        : [];
    return {
      ...catalogListing,
      roomTypeId: rtId,
      roomTypeName: isMultiListing ? rtName : undefined,
      rooms,
      roomTypes: [
        {
          _id: rtId || 'default',
          name: rtName || 'Standard',
          inventories: simpleInventories,
          rooms,
        },
      ],
    };
  }, [
    catalogListing,
    isMultiListing,
    activeRoomType,
    selectedRoomTypeId,
    roomTypesForSelected,
    simpleInventories,
  ]);

  const handleSimpleRailSelect = useCallback(
    (id) => {
      if (isMultiSimple) setSelectedRoomTypeId(String(id));
      else setSelectedListingId(String(id));
    },
    [isMultiSimple, setSelectedRoomTypeId, setSelectedListingId],
  );

  const commitDate = (d) => {
    const requested = startOfDay(d);
    const next = clampPivotDate(requested);
    if (next.getTime() !== requested.getTime()) {
      setLimitHint(CALENDAR_HORIZON_MESSAGE);
    }
    setPivotDate(next);
    onDateChange?.(next);
  };

  const navDay = (delta) =>
    commitDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth(), pivotDate.getDate() + delta));
  const navWeek = (delta) => navDay(delta * 7);
  const navMonth = (delta) =>
    commitDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() + delta, pivotDate.getDate()));

  const startLabel = pivotDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const openReservationDrawer = useCallback(async (rawRes) => {
    const shell = normalizeCalendarReservation(rawRes);
    if (!shell) return;
    setDrawerReservation(shell);
    setDrawerLoading(true);
    try {
      const id = reservationRouteId(shell);
      if (id) {
        const full = await reservationsService.getByRouteParam(id);
        setDrawerReservation({
          ...full,
          guestName:
            full.guestName ||
            `${full.guestFirstName || ''} ${full.guestLastName || ''}`.trim() ||
            shell.guestName,
        });
      }
    } catch (err) {
      console.error('[CalendarV3] détail résa:', err);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeReservationDrawer = useCallback(() => {
    setDrawerReservation(null);
    setDrawerLoading(false);
  }, []);

  const pageShellStyle = calendarFullscreen
    ? {
        padding: view === 'simple' ? '6px 10px 12px' : '8px 12px 12px',
        maxWidth: '100%',
        margin: 0,
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#f6f5f1',
      }
    : view === 'multi'
      ? {
          // Multi : occupe la hauteur main → scroll interne (freeze dates + colonne listing)
          padding: '8px 12px 12px',
          maxWidth: '100%',
          margin: 0,
          width: '100%',
          height: '100%',
          maxHeight: 'calc(100dvh - 56px)',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }
      : {
          // Simple : hauteur utile pour scroll mois interne (flèches ↑↓)
          padding: '8px 24px 24px',
          maxWidth: '100%',
          margin: '0 auto',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          height: 'calc(100dvh - 64px)',
          boxSizing: 'border-box',
        };

  const calendarPage = (
    <div style={pageShellStyle}>
      {showLandscapeHint && !calendarFullscreen && <CalendarLandscapeHint />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: view === 'simple' ? '5px 10px' : '6px 12px',
          marginBottom: 8,
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          flexWrap: 'wrap',
          overflow: 'visible',
          flexShrink: 0,
        }}
      >
        {view === 'multi' && (
          <ColumnFilters selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        )}

        {view === 'multi' && (
          <button
            type="button"
            title="Affiche uniquement les barres de réservation sur les chambres (les rooms restent toujours visibles)"
            onClick={() => {
              setSelectedColumns((prev) =>
                prev.includes('reservations')
                  ? prev.filter((id) => id !== 'reservations')
                  : sortCalendarColumns([...prev, 'reservations']),
              );
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${resaFilterOn ? T.primary : T.border}`,
              background: resaFilterOn ? T.primaryTint : T.bg1,
              color: resaFilterOn ? T.primaryDeep : T.text2,
              flexShrink: 0,
            }}
          >
            {resaFilterOn ? 'Réservations ✓' : 'Réservations'}
          </button>
        )}

        <div
          style={{
            display: 'inline-flex',
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[
            { id: 'multi', label: '📊 Vue multi', count: listings.length },
            { id: 'simple', label: '📅 Vue simple', count: 1 },
          ].map((opt) => {
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: active ? T.text : T.text3,
                  background: active ? T.bg1 : 'transparent',
                  boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    background: active ? T.primaryTint : T.bg3,
                    color: active ? T.primaryDeep : T.text3,
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  {opt.count} listing{opt.count > 1 ? 's' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: 3,
          }}
        >
          <NavBtn title="−1 mois" onClick={() => navMonth(-1)}>
            &lt;&lt;&lt;
          </NavBtn>
          <NavBtn title="−1 semaine" onClick={() => navWeek(-1)}>
            &lt;&lt;
          </NavBtn>
          <NavBtn title="−1 jour" onClick={() => navDay(-1)}>
            &lt;
          </NavBtn>

          <button
            type="button"
            onClick={(e) => {
              setPickerAnchor(e.currentTarget);
              setPickerOpen(true);
            }}
            title="Choisir la date de début (fenêtre 31 jours en vue multi)"
            style={{
              padding: '0 12px',
              minWidth: 148,
              height: 28,
              fontSize: 12.5,
              fontWeight: 700,
              color: T.text,
              fontFamily: '"Geist Mono", monospace',
              textAlign: 'center',
              background: pickerOpen ? T.primaryTint : T.bg2,
              border: `1px solid ${pickerOpen ? T.primary : T.border}`,
              borderRadius: 7,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {startLabel}
          </button>

          <NavBtn title="+1 jour" onClick={() => navDay(1)} disabled={atHorizonEnd}>
            &gt;
          </NavBtn>
          <NavBtn title="+1 semaine" onClick={() => navWeek(1)} disabled={atHorizonEnd}>
            &gt;&gt;
          </NavBtn>
          <NavBtn title="+1 mois" onClick={() => navMonth(1)} disabled={atHorizonEnd}>
            &gt;&gt;&gt;
          </NavBtn>

          <NavBtn title="Aujourd'hui" onClick={() => commitDate(new Date())}>
            ⊙
          </NavBtn>
        </div>

        {!calendarFullscreen && (
          <PageFullscreenEnterBtn
            onClick={calendarFs.enter}
            label="Calendrier plein écran"
          />
        )}

        <CalendarDatePicker
          anchorEl={pickerAnchor}
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
          value={pivotDate}
          maxSelectableDate={maxPivotStart}
          horizonEndDate={horizonEnd}
          onSelect={(d) => {
            commitDate(d);
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
        />

        {view !== 'simple' && (
          <span
            style={{
              fontSize: 10.5,
              color: T.text3,
              fontWeight: 600,
              maxWidth: 280,
              lineHeight: 1.35,
            }}
            title={`Dernière date inventaire : ${formatHorizonEndLabel()}`}
          >
            Calendrier géré sur 3 ans · jusqu&apos;au {formatHorizonEndLabel()}
          </span>
        )}

        {limitHint && (
          <span
            role="status"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.warning,
              background: T.warningTint,
              padding: '4px 10px',
              borderRadius: 8,
              maxWidth: 320,
            }}
          >
            {limitHint}
          </span>
        )}

        {view !== 'simple' && !calendarFullscreen && (
          <span
            style={{
              fontSize: 10.5,
              color: T.text3,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            title={`Jours avant J-${INVENTORY_PAST_RETENTION_DAYS} : InventoryArchive (srv-calendar)`}
          >
            Historique gris · hors fenêtre : — (pas de 0)
          </span>
        )}

        {isPlatformAdmin ? (
          <DpSyncAuditStrip
            summary={dpSyncSummary}
            listingNameById={listingNameById}
            selectedListingId={view === 'simple' ? selectedListingId : null}
            loading={dpSyncLoading}
          />
        ) : null}

      </div>

      <div
        style={
          view === 'multi' || view === 'simple' || calendarFullscreen
            ? { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : undefined
        }
      >
      {view === 'multi' && (
        <MultiView
          startDate={windowStart}
          daysCount={MULTI_VISIBLE_DAYS}
          listingCatalog={listings}
          dpEnabledByListing={dpEnabledByListing}
          inventoriesByListing={inventoriesByListing}
          inventoryData={inventoryData}
          overlayReservations={multiOverlayReservations}
          calendarBlocksById={calendarBlocksById}
          inventoryLoading={inventoryLoading}
          selectedColumns={selectedColumns}
          fillViewport
          onCellsSelected={canWrite || canBlockRooms ? handleCellsSelected : undefined}
          canBlockRooms={canBlockRooms}
          onRoomBlockClick={
            canBlockRooms
              ? (block, meta) =>
                  setReleaseBlockTarget({
                    block,
                    roomName: meta?.roomName || '',
                  })
              : undefined
          }
          onOpenReservation={openReservationDrawer}
          onCalendarImportReviewFinished={onCalendarImportReviewFinished}
          onCalendarImportReviewActivated={onCalendarImportReviewActivated}
          canActivateCalendarImport={isPlatformAdmin}
          onToggleDynamicPrice={
            canWrite
              ? async ({ listingId, roomTypeId, dateStr, enable }) => {
                  const listing = listings.find((l) => String(l._id) === String(listingId));
                  if (isCalendarImportReviewActive(listing)) return;
                  const rtId = roomTypeId || listing?.roomTypeId || listing?.roomTypes?.[0]?._id;
                  if (!rtId || !dateStr) return;
                  const base = {
                    roomTypeId: String(rtId),
                    date_from: dateStr,
                    date_to: dateStr,
                    listingName: listing?.name || listing?.title || '',
                    roomTypeName: listing?.roomTypeName || '',
                  };
                  await onUpdateInventory?.([
                    {
                      ...base,
                      type: 'setUseDynamicPriceManual',
                      setUseDynamicPriceManual: enable,
                    },
                    {
                      ...base,
                      type: 'setPriceMode',
                      priceMode: enable ? 'dynamic' : 'base',
                    },
                  ]);
                }
              : undefined
          }
        />
      )}
      {view === 'simple' && inventoryLoading && (
        <div
          style={{
            fontSize: 11,
            color: T.text3,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Mise à jour des dates…
        </div>
      )}
      {view === 'simple' && selectedListing && (
        <SimpleView
          listing={selectedListing}
          listings={simpleRailItems}
          rooms={selectedListing?.rooms || []}
          dpEnabled={dpOn(selectedListingId)}
          selectedListingId={isMultiSimple ? selectedRoomTypeId : selectedListingId}
          onSelectListing={handleSimpleRailSelect}
          railMode={isMultiSimple ? 'roomTypes' : 'listings'}
          multiHotel={multiHotelMeta}
          year={pivotDate.getFullYear()}
          month={pivotDate.getMonth()}
          monthsCount={simpleMonthsCount}
          onLoadMoreMonths={onLoadMoreMonths}
          inventoryLoading={inventoryLoading}
          inventories={simpleInventories}
          calendarBlocksById={calendarBlocksById}
          fillViewport
          onCellsSelected={canWrite ? setModalCells : undefined}
          onOpenReservation={openReservationDrawer}
          onReleaseBlock={canWrite ? releaseBlock : undefined}
          onCalendarImportReviewFinished={onCalendarImportReviewFinished}
          onCalendarImportReviewActivated={onCalendarImportReviewActivated}
          canActivateCalendarImport={isPlatformAdmin}
        />
      )}
      {view === 'simple' && !selectedListing && (
        <div
          style={{
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Choisissez un listing
          </div>
          <div style={{ fontSize: 13, color: T.text3 }}>
            {listings.length === 0
              ? 'Aucun listing disponible. Veuillez ajouter des propriétés.'
              : 'Sélectionnez un listing dans le menu déroulant ci-dessus pour afficher le calendrier.'}
          </div>
        </div>
      )}
      </div>

      <UpdateInventoryModal
        open={!!modalCells}
        dpEnabled={!modalCells || modalCells.some((c) => dpOn(c.listingId))}
        selectedCells={modalCells || []}
        currency={resolveSelectionCurrency(modalCells, listings, 'MAD')}
        inventoryData={inventoryData}
        calendarBlocksById={calendarBlocksById}
        onReleaseBlock={canWrite ? releaseBlock : undefined}
        listings={listings}
        onClose={() => setModalCells(null)}
        onSave={async (payloads) => {
          await onUpdateInventory?.(payloads);
          setModalCells(null);
        }}
      />

      <BlockRoomModal
        open={!!blockRoomDraft}
        roomId={blockRoomDraft?.roomId}
        roomName={blockRoomDraft?.roomName}
        dateFrom={blockRoomDraft?.dateFrom}
        dateTo={blockRoomDraft?.dateTo}
        overlapMessage={blockRoomDraft?.overlapMessage}
        onClose={() => setBlockRoomDraft(null)}
        onSuccess={refreshBlocks}
      />

      {releaseBlockTarget ? (
        <ReleaseRoomBlockPanel
          block={releaseBlockTarget.block}
          roomName={releaseBlockTarget.roomName}
          onClose={() => setReleaseBlockTarget(null)}
          onReleased={refreshBlocks}
        />
      ) : null}

      {drawerReservation && (
        <ReservationCalendarDrawer
          reservation={drawerReservation}
          loading={drawerLoading}
          onClose={closeReservationDrawer}
        />
      )}
    </div>
  );

  return (
    <>
      {!calendarFullscreen && calendarPage}
      <PageFullscreenLayer
        open={calendarFullscreen}
        onClose={calendarFs.exit}
        label="Calendrier plein écran"
        // z-index bas : modales calendrier (audit ~50) doivent passer au-dessus
        zIndex={40}
      >
        {calendarPage}
      </PageFullscreenLayer>
    </>
  );
}

function NavBtn({ children, onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      title={disabled ? `${title} (limite 3 ans)` : title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        minWidth: 28,
        height: 28,
        borderRadius: 7,
        color: disabled ? T.text4 : T.text2,
        fontSize: 13,
        fontWeight: 700,
        background: 'transparent',
        border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        padding: '0 4px',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = T.bg2;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
