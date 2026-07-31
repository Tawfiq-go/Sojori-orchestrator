// ════════════════════════════════════════════════════════════════════
// MultiView.jsx — grille Multi-listing · ligne principale (prix + dispo) + détail optionnel
// Excel selection drag · scroll sync · tooltip breakdown · popover rotations
// ════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback, useContext, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  T, ALL_COLUMNS, priceOf, cellKey, genDays, isArchiveDay, ARCHIVE_CELL_BG, ARCHIVE_CELL_TEXT,
  hasInventoryData, resolveInventoryCellState, formatInventoryRateLabel, OUT_OF_WINDOW_CELL_BG,
  resolvePriceMode, PRICE_MODE_LABEL, PRICE_MODE_LETTER,
  calendarPrimaryColumns, calendarCollapseColumns,
} from './_shared';

/** Fonds soft — uniquement statut inventaire (jamais M/D). */
const CELL_BG = {
  reserved: 'rgba(22, 163, 74, 0.14)',   // vert = réservé
  available: 'rgba(37, 99, 235, 0.12)',  // bleu = disponible
  blocked: 'rgba(220, 38, 38, 0.14)',    // rouge = bloqué
};

/** Couleur de fond cellule selon réservé / dispo / bloqué — pas selon M/D. */
function inventoryStatusBackground(state, inv) {
  if (state === 'out_of_window') return OUT_OF_WINDOW_CELL_BG;
  if (state === 'archive') return ARCHIVE_CELL_BG;
  if (state === 'missing' || !hasInventoryData(inv)) return T.bg2;
  const isBooked = (inv?.reservations?.length ?? 0) > 0;
  if (isBooked) return CELL_BG.reserved;
  const isStop = inv?.stopSell === true;
  const ar = inv?.availableRoom;
  const isZero = ar != null && Number(ar) <= 0;
  const isClosed = inv?.available === false;
  if (isStop || isZero || isClosed) return CELL_BG.blocked;
  return CELL_BG.available;
}
import { INVENTORY_FUTURE_HORIZON_DAYS } from './inventoryCalendarConstants';
import TooltipBreakdown from './TooltipBreakdown';
import PopoverReservations from './PopoverReservations';
import AuditBlockedDaysModal from './AuditBlockedDaysModal';
import { normalizeCalendarReservations } from './reservationCalendarUtils';
import { useCalendarBreakpoint } from '../../hooks/useCalendarBreakpoint';
import calendarService from '../../services/calendarService';
import {
  activateListingCalendarImportReview,
  finishListingCalendarImportReview,
  isCalendarImportReviewActive,
} from '../../services/calendarImportReviewService';

/** Métadonnées CalendarBlock par blockId — contexte pour éviter le prop drilling jusqu'aux cellules. */
const CalendarBlocksContext = React.createContext({});

const CELL_W_DESKTOP = 90;
const CELL_W_MOBILE = 76;
const LEFT_W_DESKTOP = 268;
const LEFT_W_MOBILE = 168;

/** Icône éclair (prix dynamique) — SVG inline, pas d’emoji. */
function BoltIcon({ size = 12, color = T.ai }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9.2 1.2 3.5 9.1h4.1L6.8 14.8l5.7-7.9H8.4L9.2 1.2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MultiView({
  startDate = new Date(),
  daysCount = 31,
  listingCatalog = [],
  dpEnabledByListing = {},
  listings: listingsLegacy,
  inventoriesByListing = {},
  inventoryData = {},
  calendarBlocksById = {},
  inventoryLoading = false,
  selectedColumns = [],
  onCellsSelected,
  onOpenReservation,
  onToggleDynamicPrice,
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
}) {
  const listings = listingCatalog.length > 0 ? listingCatalog : listingsLegacy || [];
  const { isMobile } = useCalendarBreakpoint();
  const LEFT_W = isMobile ? LEFT_W_MOBILE : LEFT_W_DESKTOP;
  const CELL_W = isMobile ? CELL_W_MOBILE : CELL_W_DESKTOP;
  const days = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const syncing = useRef(false);

  /* ─── Expand/collapse par listing — fermé par défaut ─── */
  const [expanded, setExpanded] = useState({});
  /** Multi only: collapse détail (min stay…) par roomType — clé `${listingId}:${rtId}` */
  const [rtExpanded, setRtExpanded] = useState({});
  const toggleListing = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const toggleRoomType = useCallback((key) => {
    setRtExpanded((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const roomTypesByListing = useMemo(() => {
    const map = {};
    listings.forEach((listing) => {
      const inv = inventoryData[listing._id] || {};
      map[listing._id] = Object.entries(inv).map(([id, v]) => ({
        id,
        name: v?.name || `Type ${String(id).slice(-4)}`,
        availability: v?.availability || {},
      }));
    });
    return map;
  }, [listings, inventoryData]);

  /* ─── Sélection Excel vs clic détail tarif ─── */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [currentHoverCell, setCurrentHoverCell] = useState(null);
  const [activeTip, setActiveTip] = useState(null);
  const dragMovedRef = useRef(false);
  const dragStartPosRef = useRef(null);
  const tipAnchorElRef = useRef(null);
  const selectedCellsRef = useRef([]);
  selectedCellsRef.current = selectedCells;

  const selectedSet = useMemo(() => new Set(selectedCells.map(cellKey)), [selectedCells]);
  const isSelected = useCallback((c) => selectedSet.has(cellKey(c)), [selectedSet]);

  const onPriceClick = useCallback((cell, e) => {
    e?.stopPropagation?.();
    if (e?.currentTarget) tipAnchorElRef.current = e.currentTarget;
    setActiveTip((prev) => (prev && cellKey(prev) === cellKey(cell) ? null : cell));
  }, []);

  const onMouseDown = (cell, e) => {
    const inv = inventoriesByListing[cell.listingId]?.[cell.dateStr];
    const st = resolveInventoryCellState(cell.dateStr, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
    // Prix dyn. : sélection Excel aussi sur jours passés (archive)
    if (st !== 'data' && !(st === 'archive' && cell.column === 'dynamicPrice')) return;
    setActiveTip(null);
    dragMovedRef.current = false;
    dragStartPosRef.current = e ? { x: e.clientX, y: e.clientY } : null;
    if (e?.currentTarget) tipAnchorElRef.current = e.currentTarget;
    setIsDragging(true);
    setDragStart(cell);
    setCurrentHoverCell(cell);
    setSelectedCells([cell]);
  };
  const onMouseEnter = (cell) => {
    if (!isDragging || !dragStart) return;
    if (dragStart.listingId !== cell.listingId ||
        dragStart.roomTypeId !== cell.roomTypeId ||
        dragStart.column !== cell.column) return;
    if (cell.dateStr !== dragStart.dateStr) dragMovedRef.current = true;
    setCurrentHoverCell(cell);
    const allIso = days.map(d => d.iso);
    const a = allIso.indexOf(dragStart.dateStr);
    const b = allIso.indexOf(cell.dateStr);
    const [from, to] = a < b ? [a, b] : [b, a];
    setSelectedCells(allIso.slice(from, to + 1).map(iso => ({ ...cell, dateStr: iso })));
  };
  const onMouseUp = useCallback((e) => {
    if (!isDragging) return;
    if (dragStartPosRef.current && e?.clientX != null) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 5) dragMovedRef.current = true;
    }
    const cells = selectedCellsRef.current;
    setIsDragging(false);
    setDragStart(null);
    setCurrentHoverCell(null);
    dragStartPosRef.current = null;
    setSelectedCells([]);

    if (cells.length === 0) return;

    onCellsSelected?.(cells);
  }, [isDragging, onCellsSelected]);

  useEffect(() => {
    const onUp = (e) => onMouseUp(e);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedCells([]);
        setIsDragging(false);
        setDragStart(null);
        setCurrentHoverCell(null);
        setActiveTip(null);
      }
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('keydown', onKey); };
  }, [onMouseUp]);

  useEffect(() => {
    if (!activeTip) return undefined;
    const close = (ev) => {
      if (tipAnchorElRef.current?.contains(ev.target)) return;
      setActiveTip(null);
    };
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [activeTip]);

  /* ─── Auto-scroll pendant le drag ─── */
  useEffect(() => {
    if (!isDragging) return;
    let animationFrame;
    const EDGE_SIZE = 100; // pixels du bord où déclencher l'auto-scroll
    const MAX_SPEED = 20; // pixels par frame

    const autoScroll = (e) => {
      const body = bodyRef.current;
      if (!body) return;

      const rect = body.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollWidth = body.scrollWidth;
      const clientWidth = body.clientWidth;

      let scrollDelta = 0;

      // Scroll à gauche
      if (mouseX < EDGE_SIZE && body.scrollLeft > 0) {
        const ratio = 1 - (mouseX / EDGE_SIZE);
        scrollDelta = -Math.ceil(ratio * MAX_SPEED);
      }
      // Scroll à droite
      else if (mouseX > clientWidth - EDGE_SIZE && body.scrollLeft < scrollWidth - clientWidth) {
        const ratio = (mouseX - (clientWidth - EDGE_SIZE)) / EDGE_SIZE;
        scrollDelta = Math.ceil(ratio * MAX_SPEED);
      }

      if (scrollDelta !== 0) {
        body.scrollLeft += scrollDelta;
        // Mettre à jour la sélection après le scroll
        if (currentHoverCell && dragStart) {
          const allIso = days.map(d => d.iso);
          const a = allIso.indexOf(dragStart.dateStr);
          const b = allIso.indexOf(currentHoverCell.dateStr);
          const [from, to] = a < b ? [a, b] : [b, a];
          setSelectedCells(allIso.slice(from, to + 1).map(iso => ({ ...currentHoverCell, dateStr: iso })));
        }
      }

      animationFrame = requestAnimationFrame(() => autoScroll(e));
    };

    const onMouseMove = (e) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => autoScroll(e));
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isDragging, currentHoverCell, dragStart, days]);

  /* ─── Scroll sync header ↔ body ─── */
  useEffect(() => {
    const h = headerRef.current, b = bodyRef.current;
    if (!h || !b) return;
    const onBody = () => { if (syncing.current) return; syncing.current = true; h.scrollLeft = b.scrollLeft; requestAnimationFrame(() => syncing.current = false); };
    const onHead = () => { if (syncing.current) return; syncing.current = true; b.scrollLeft = h.scrollLeft; requestAnimationFrame(() => syncing.current = false); };
    b.addEventListener('scroll', onBody, { passive: true });
    h.addEventListener('scroll', onHead, { passive: true });
    return () => { b.removeEventListener('scroll', onBody); h.removeEventListener('scroll', onHead); };
  }, []);

  /* ─── Scroll horizontal molette / trackpad (pattern docs/scroll : wheel non passif) ───
   * Sans ça, sur Mac le geste horizontal part en navigation arrière et la molette
   * verticale ne fait rien quand la grille n'a pas de débordement vertical.
   * Marche partout sur la grille (en-tête inclus) — aucun rapport avec la sélection Excel. */
  useEffect(() => {
    const body = bodyRef.current;
    const header = headerRef.current;
    if (!body) return undefined;

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom navigateur
      const maxScrollLeft = body.scrollWidth - body.clientWidth;
      if (maxScrollLeft <= 1) return;

      const canScrollY = body.scrollHeight - body.clientHeight > 1;
      const horizontalGesture = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      // Molette verticale → horizontal seulement si la grille ne scrolle pas verticalement
      const delta = horizontalGesture || e.shiftKey ? (e.deltaX || e.deltaY) : (canScrollY ? 0 : e.deltaY);
      if (!delta) return;

      const next = Math.max(0, Math.min(maxScrollLeft, body.scrollLeft + delta));
      if (next === body.scrollLeft) return;
      e.preventDefault();
      body.scrollLeft = next;
    };

    body.addEventListener('wheel', onWheel, { passive: false });
    header?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      body.removeEventListener('wheel', onWheel);
      header?.removeEventListener('wheel', onWheel);
    };
  }, []);

  /* ─── Popover rotations / clic résa ─── */
  const [popover, setPopover] = useState(null);

  const handleReservationDayClick = useCallback((rect, dateStr, rawReservations) => {
    const reservations = normalizeCalendarReservations(rawReservations);
    if (reservations.length === 0) return;
    if (reservations.length === 1) {
      onOpenReservation?.(reservations[0]);
      return;
    }
    setPopover({ rect, dateStr, reservations });
  }, [onOpenReservation]);


  return (
    <CalendarBlocksContext.Provider value={calendarBlocksById}>
    <div style={{
      background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      userSelect: isDragging ? 'none' : 'auto',
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 150px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Légende des couleurs - au-dessus du header */}
      <div style={{
        padding: '4px 12px', background: T.bg0, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Légende
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: T.text2, fontWeight: 600, flexWrap: 'wrap' }}>
          <Legend dot="rgba(22,163,74,0.85)" label="Réservé" />
          <Legend dot="rgba(37,99,235,0.85)" label="Disponible" />
          <Legend dot="rgba(220,38,38,0.85)" label="Bloqué" />
          <Legend dot="#b91c1c" label="Import calendrier à finir" />
          <span style={{ color: T.text3, fontWeight: 600 }}>Lettres : M = manuel · D = dynamique</span>
          <Legend dot={ARCHIVE_CELL_BG} label="Historique (lecture seule)" />
          <Legend dot={T.text4} label="Hors inventaire (—)" />
        </div>
      </div>

      {/* Header sticky avec scroll sync */}
      <div ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: T.bg2, borderBottom: `1px solid ${T.borderStrong}`,
        overflowX: 'hidden', overflowY: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
          minWidth: 'max-content',
        }}>
          <div style={{
            padding: '7px 12px', display: 'flex', alignItems: 'center',
            fontSize: 11, fontWeight: 700, color: T.text3,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRight: `1px solid ${T.border}`,
            position: 'sticky', left: 0, zIndex: 10,
            background: T.bg2,
            boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
          }}>Listing</div>
          {days.map(d => (
            <DayHeader key={d.iso} day={d} loading={inventoryLoading} />
          ))}
        </div>
      </div>

      {/* Body scrollable — overlay chargement uniquement sur la zone dates */}
      <div
        ref={bodyRef}
        className="calendar-multi-hscroll"
        style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0, position: 'relative' }}
      >
        {inventoryLoading && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: LEFT_W,
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 8,
              background: 'rgba(255,255,255,0.55)',
              pointerEvents: 'none',
            }}
          />
        )}
        <div style={{ minWidth: LEFT_W + days.length * CELL_W }}>
          {listings.map((listing) => {
            const roomTypes = roomTypesByListing[listing._id] || [];
            const isMultiHotel =
              String(listing.propertyUnit || '') === 'Multi' && roomTypes.length > 1;
            const isOpen = !!expanded[listing._id];
            return (
              <div key={listing._id}>
                <ListingRow
                  listing={{
                    ...listing,
                    roomTypeCount: roomTypes.length,
                  }}
                  dpEnabled={dpEnabledByListing[String(listing._id)] !== false}
                  inventories={inventoriesByListing[listing._id] || {}}
                  days={days}
                  leftW={LEFT_W}
                  cellW={CELL_W}
                  expanded={isOpen}
                  onToggle={() => toggleListing(listing._id)}
                  forceChevron={isMultiHotel}
                  /* Multi hôtel : ▶ ouvre les roomTypes ; min/max stay sur chaque type */
                  hideDetailCollapse={isMultiHotel}
                  selectedColumns={selectedColumns}
                  isSelected={isSelected}
                  onMouseDown={onMouseDown}
                  onMouseEnter={onMouseEnter}
                  onPriceClick={onPriceClick}
                  onReservationClick={handleReservationDayClick}
                  activeTip={activeTip}
                  onToggleDynamicPrice={
                    isCalendarImportReviewActive(listing) ? undefined : onToggleDynamicPrice
                  }
                  onCalendarImportReviewFinished={onCalendarImportReviewFinished}
                  onCalendarImportReviewActivated={onCalendarImportReviewActivated}
                />
                {isOpen && isMultiHotel
                  ? roomTypes.map((rt) => {
                      const rtKey = `${listing._id}:${rt.id}`;
                      const rtOpen = !!rtExpanded[rtKey];
                      return (
                      <ListingRow
                        key={`${listing._id}-${rt.id}`}
                        listing={{
                          ...listing,
                          _id: listing._id,
                          name: rt.name,
                          roomTypeId: rt.id,
                          roomTypeName: rt.name,
                          propertyUnit: 'Single',
                          _isRoomTypeRow: true,
                        }}
                        dpEnabled={dpEnabledByListing[String(listing._id)] !== false}
                        inventories={rt.availability}
                        days={days}
                        leftW={LEFT_W}
                        cellW={CELL_W}
                        expanded={rtOpen}
                        onToggle={() => toggleRoomType(rtKey)}
                        forceChevron
                        hideDetailCollapse={false}
                        selectedColumns={selectedColumns}
                        isSelected={isSelected}
                        onMouseDown={onMouseDown}
                        onMouseEnter={onMouseEnter}
                        onPriceClick={onPriceClick}
                        onReservationClick={handleReservationDayClick}
                        activeTip={activeTip}
                        onToggleDynamicPrice={
                          isCalendarImportReviewActive(listing) ? undefined : onToggleDynamicPrice
                        }
                      />
                    );
                    })
                  : null}
              </div>
            );
          })}
        </div>
      </div>

      {activeTip && (() => {
        const inv = inventoriesByListing[activeTip.listingId]?.[activeTip.dateStr];
        const listing = listings.find((l) => String(l._id) === String(activeTip.listingId));
        if (!inv || !listing || !hasInventoryData(inv)) return null;
        const dayBlock = inv?.blockId ? calendarBlocksById[String(inv.blockId)] : null;
        return (
          <TooltipBreakdown
            open
            anchorRef={tipAnchorElRef}
            inv={inv}
            dateStr={activeTip.dateStr}
            currency={listing.currencyCode || listing.currency || 'MAD'}
            block={dayBlock}
          />
        );
      })()}

      {popover && (
        <PopoverReservations
          open={!!popover}
          anchorRect={popover.rect}
          dayStr={popover.dateStr}
          reservations={popover.reservations}
          onClose={() => setPopover(null)}
          onResaClick={(res) => {
            onOpenReservation?.(normalizeCalendarReservations([res])[0]);
            setPopover(null);
          }}
        />
      )}
    </div>
    </CalendarBlocksContext.Provider>
  );
}

/* ─── Header d'un jour ─── */
const DayHeader = memo(function DayHeader({ day, loading }) {
  return (
    <div style={{
      padding: '5px 0 4px', textAlign: 'center',
      borderRight: `1px solid ${T.border}`,
      background: day.isToday ? T.primaryTint : 'transparent',
      position: 'relative',
      opacity: loading ? 0.55 : 1,
      transition: 'opacity 0.15s',
    }}>
      <div style={{
        fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: day.isToday ? T.primaryDeep : day.isWeekend ? T.warning : T.text3,
        lineHeight: 1,
      }}>{day.weekday}</div>
      <div style={{
        fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 700,
        color: day.isToday ? T.primaryDeep : T.text, marginTop: 3,
      }}>{day.day}</div>
      <div style={{
        fontFamily: '"Geist Mono", monospace', fontSize: 8.5, color: T.text4, marginTop: 1,
      }}>{day.month}</div>
      {day.isToday && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)',
          width: 24, height: 2, background: T.primary, borderRadius: 999,
        }} />
      )}
    </div>
  );
});

/* ─── Colonne listing (sticky) — ne dépend pas des dates ─── */
const ListingLabel = memo(function ListingLabel({
  listing, expanded, showChevron, onToggle, avgPrice, dpEnabled = true,
  onFinishCalendarImport, finishingCalendarImport = false,
  onActivateCalendarImport, activatingCalendarImport = false,
}) {
  const isSingle = listing.propertyUnit === 'Single';
  const isRoomTypeRow = Boolean(listing._isRoomTypeRow);
  const currency = listing.currencyCode || listing.currency || 'MAD';
  const dpHref = `/dynamic-pricing/bien/${listing._id}`;
  const roomTypeCount = Number(listing.roomTypeCount) || 0;
  const reviewActive = !isRoomTypeRow && isCalendarImportReviewActive(listing);
  const simpleHref =
    isRoomTypeRow && listing.roomTypeId
      ? `/calendar?view=simple&listing=${encodeURIComponent(String(listing._id))}&roomType=${encodeURIComponent(String(listing.roomTypeId))}`
      : `/calendar?view=simple&listing=${encodeURIComponent(String(listing._id))}`;
  return (
    <div
      onClick={showChevron ? onToggle : undefined}
      style={{
        padding: isRoomTypeRow ? '6px 12px 6px 28px' : '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: reviewActive ? 'rgba(185,28,28,0.06)' : (isRoomTypeRow ? T.bg2 : T.bg1),
        borderRight: `1px solid ${T.border}`,
        cursor: showChevron ? 'pointer' : 'default',
        transition: 'background 0.15s',
        position: 'sticky',
        left: 0,
        zIndex: 4,
        boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
      }}
    >
      {showChevron && (
        <span
          style={{
            fontSize: 10,
            color: expanded ? T.primary : T.text3,
            width: 14,
            textAlign: 'center',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          ▶
        </span>
      )}
      {!isRoomTypeRow && (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: reviewActive
              ? 'linear-gradient(135deg, #fecaca, #b91c1c)'
              : `linear-gradient(135deg, ${listing.photoColor || '#fde68a'}, ${listing.photoColorDeep || '#d97706'})`,
            flexShrink: 0,
            boxShadow: reviewActive ? '0 0 0 2px rgba(185,28,28,0.35)' : 'none',
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          to={simpleHref}
          title={reviewActive ? 'Import calendrier non terminé — ouvrir vue simple' : 'Ouvrir la vue simple (Airbnb)'}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: isRoomTypeRow ? 11.5 : 12.5,
            fontWeight: isRoomTypeRow ? 600 : 700,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            color: reviewActive ? '#b91c1c' : 'inherit',
            textDecoration: 'none',
          }}
        >
          {listing.name}
        </Link>
        {reviewActive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#b91c1c', letterSpacing: '0.02em' }}>
              Import calendrier
            </span>
            {onFinishCalendarImport ? (
              <button
                type="button"
                title="Ouvrir l’analyse import (prix min/max, overbooking) — la sortie du mode Import se fait dans la popup"
                onClick={(e) => {
                  e.stopPropagation();
                  onFinishCalendarImport();
                }}
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#fff',
                  background: '#b91c1c',
                  border: 0,
                  borderRadius: 6,
                  padding: '2px 7px',
                  cursor: 'pointer',
                  lineHeight: 1.3,
                }}
              >
                Revue import
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {avgPrice > 0 ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: T.text3,
                  fontFamily: '"Geist Mono", monospace',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 3,
                }}
              >
                <span>Moy: {avgPrice}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: T.text4, letterSpacing: '0.04em' }}>
                  {currency}
                </span>
                {!isRoomTypeRow && roomTypeCount > 1 ? (
                  <span style={{ fontSize: 9, color: T.text4, marginLeft: 4 }}>
                    · {roomTypeCount} types
                  </span>
                ) : null}
              </span>
            ) : isSingle && !isRoomTypeRow ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>Tarif · ▶ Dispo / Min stay</span>
            ) : !isRoomTypeRow && roomTypeCount > 1 ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>
                {roomTypeCount} types — ▶ types, puis ▶ Dispo / Min stay
              </span>
            ) : isRoomTypeRow ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>▶ Dispo / Min stay</span>
            ) : null}
            {!isRoomTypeRow && onActivateCalendarImport ? (
              <button
                type="button"
                title="Passer en mode Import calendrier — prix non modifiables, pas de push canal"
                disabled={activatingCalendarImport}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivateCalendarImport();
                }}
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#b91c1c',
                  background: 'rgba(185,28,28,0.08)',
                  border: '1px solid rgba(185,28,28,0.28)',
                  borderRadius: 6,
                  padding: '2px 7px',
                  cursor: activatingCalendarImport ? 'wait' : 'pointer',
                  lineHeight: 1.3,
                }}
              >
                {activatingCalendarImport ? '…' : 'Mode Import'}
              </button>
            ) : null}
          </div>
        )}
      </div>
      {!isRoomTypeRow && (
      <Link
        to={dpHref}
        title={
          dpEnabled
            ? 'Prix dynamique ON — ouvrir la fiche pricing'
            : 'Prix dynamique OFF — ouvrir la fiche pricing'
        }
        aria-label={`Prix dynamique ${dpEnabled ? 'ON' : 'OFF'} — ${listing.name}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 7,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: dpEnabled ? 'rgba(124,58,237,0.14)' : 'rgba(20,17,10,0.05)',
          border: dpEnabled
            ? '1px solid rgba(124,58,237,0.35)'
            : `1px solid ${T.border}`,
          color: dpEnabled ? T.ai : T.text3,
          textDecoration: 'none',
          transition: 'background 0.15s, transform 0.12s',
          opacity: dpEnabled ? 1 : 0.75,
          position: 'relative',
          zIndex: 2,
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = dpEnabled
            ? 'rgba(124,58,237,0.24)'
            : 'rgba(20,17,10,0.09)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dpEnabled
            ? 'rgba(124,58,237,0.14)'
            : 'rgba(20,17,10,0.05)';
        }}
      >
        <BoltIcon size={13} color={dpEnabled ? T.ai : T.text3} />
      </Link>
      )}
    </div>
  );
});

/* ─── Ligne d'un listing (prix + dispo sur une ligne, détail en collapse) ─── */
function ListingRow({
  listing, inventories, days, leftW: LEFT_W, cellW: CELL_W, expanded, onToggle, selectedColumns, isSelected, onMouseDown, onMouseEnter, onPriceClick, onReservationClick, activeTip,
  onToggleDynamicPrice, dpEnabled = true, forceChevron = false, hideDetailCollapse = false,
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
}) {
  const primaryCols = calendarPrimaryColumns(selectedColumns);
  const collapseColumns = calendarCollapseColumns(selectedColumns).filter((colId) => {
    // Pilote OFF sur ce bien → pas de lignes Prix dyn. / Mode (comme la modal sélection)
    if (!dpEnabled && (colId === 'dynamicPrice' || colId === 'priceMode')) return false;
    return true;
  });
  const isRoomTypeRow = Boolean(listing._isRoomTypeRow);
  // Multi roomType rows: chevron pour min stay / détail ; Single listing inchangé
  const showChevron =
    forceChevron ||
    (!isRoomTypeRow && !hideDetailCollapse && collapseColumns.length > 0) ||
    (isRoomTypeRow && collapseColumns.length > 0);
  const showDispo = primaryCols.includes('availableRoom');
  const showRate = primaryCols.includes('rate');
  const getInv = (dateStr) => inventories[dateStr];

  /* ─── Audit jours bloqués sans réservation — modal résultat en tableau ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({
    loading: false, error: null, roomTypes: [], postImportAudit: null,
  });
  const [finishingCalendarImport, setFinishingCalendarImport] = useState(false);
  const [activatingCalendarImport, setActivatingCalendarImport] = useState(false);
  const calendarReviewActive = !isRoomTypeRow && isCalendarImportReviewActive(listing);

  const handleAuditClick = useCallback(() => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [], postImportAudit: null });
  }, []);

  const handleFinishCalendarImport = useCallback(async () => {
    if (!listing?._id || finishingCalendarImport) return;
    setFinishingCalendarImport(true);
    try {
      await finishListingCalendarImportReview(String(listing._id));
      onCalendarImportReviewFinished?.(String(listing._id));
    } catch (err) {
      window.alert(err?.message || 'Impossible de finir l’import calendrier');
    } finally {
      setFinishingCalendarImport(false);
    }
  }, [listing?._id, finishingCalendarImport, onCalendarImportReviewFinished]);

  const handleActivateCalendarImport = useCallback(async () => {
    if (!listing?._id || activatingCalendarImport) return;
    const ok = window.confirm(
      'Passer en mode Import calendrier ?\n\n• Prix non modifiables\n• Pas de publication canaux tant que vous n’avez pas fini l’import',
    );
    if (!ok) return;
    setActivatingCalendarImport(true);
    try {
      const data = await activateListingCalendarImportReview(String(listing._id));
      onCalendarImportReviewActivated?.(String(listing._id), data);
    } catch (err) {
      window.alert(err?.response?.data?.error || err?.message || 'Impossible d’activer le mode Import');
    } finally {
      setActivatingCalendarImport(false);
    }
  }, [listing?._id, activatingCalendarImport, onCalendarImportReviewActivated]);

  useEffect(() => {
    if (!auditOpen || !auditResult.loading) return;
    let cancelled = false;
    const roomTypeId = listing.roomTypeId || undefined;
    (async () => {
      try {
        const result = await calendarService.auditBlockedDays(listing._id, roomTypeId);
        if (!cancelled) {
          setAuditResult({
            loading: false,
            error: null,
            roomTypes: result.roomTypes,
            postImportAudit: result.postImportAudit || null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setAuditResult({
            loading: false,
            error: err?.message || 'Erreur inconnue',
            roomTypes: [],
            postImportAudit: null,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [auditOpen, auditResult.loading, listing._id, listing.roomTypeId]);

  const avgPrice = useMemo(() => {
    const prices = days
      .map((d) => {
        const inv = getInv(d.iso);
        if (resolveInventoryCellState(d.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS }) !== 'data') {
          return 0;
        }
        return priceOf(inv);
      })
      .filter((p) => p > 0);
    if (prices.length === 0) return 0;
    return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  }, [days, inventories]);

  return (
    <div>
      {/* Ligne principale — prix + dispo (filtre par défaut) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <ListingLabel
          listing={listing}
          expanded={expanded}
          showChevron={showChevron}
          onToggle={onToggle}
          avgPrice={avgPrice}
          dpEnabled={dpEnabled}
          onFinishCalendarImport={
            !isRoomTypeRow && isCalendarImportReviewActive(listing)
              ? handleAuditClick
              : undefined
          }
          finishingCalendarImport={false}
          onActivateCalendarImport={
            !isRoomTypeRow && !isCalendarImportReviewActive(listing)
              ? handleActivateCalendarImport
              : undefined
          }
          activatingCalendarImport={activatingCalendarImport}
        />

        {days.map(d => {
          const inv = getInv(d.iso);
          const roomTypeId = listing.roomTypeId || 'default';
          const cellState = resolveInventoryCellState(d.iso, inv, {
            futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS,
          });
          const draggable = cellState === 'data';
          return (
            <PrimaryInventoryCell
              key={d.iso}
              day={d}
              inv={inv}
              listing={listing}
              showRate={showRate}
              showDispo={showDispo}
              isSelected={isSelected}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
              onPriceClick={onPriceClick}
              listingId={listing._id}
              roomTypeId={roomTypeId}
              draggable={draggable}
              dpEnabled={dpEnabled}
              tipOpen={
                activeTip?.listingId === listing._id &&
                activeTip?.dateStr === d.iso &&
                activeTip?.column === 'rate'
              }
            />
          );
        })}
      </div>

      {/* Lignes sélection Excel — collapse (colonnes hors ligne principale).
          Multi hôtel parent: hideDetailCollapse → détail sur chaque roomType.
          Simple / roomType: expanded montre min stay, max stay, etc. */}
      {expanded && !hideDetailCollapse && collapseColumns.map(colId => {
        const col = ALL_COLUMNS.find(c => c.id === colId);
        if (!col) return null;
        return (
          <React.Fragment key={colId}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
            borderBottom: `1px dashed ${T.border}`,
            background: T.bg2,
            animation: 'fadeIn 0.25s both',
          }}>
            <div style={{
              padding: isRoomTypeRow ? '5px 16px 5px 48px' : '5px 16px 5px 38px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, color: T.text2,
              fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em',
              borderRight: `1px solid ${T.border}`,
              position: 'sticky', left: 0, zIndex: 3,
              background: T.bg2,
              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
            }}>
              {col.short}
              {colId === 'availableRoom' && (
                <button
                  type="button"
                  title="Audit disponibilité — bloqué sans résa OU résa confirmée encore disponible (365 j.)"
                  onClick={handleAuditClick}
                  style={{
                    background: 'none', border: 0, padding: '0 2px', marginLeft: 2,
                    color: T.text4, fontSize: 10, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
                  }}
                >
                  ▶ audit
                </button>
              )}
            </div>

            {days.map(d => {
              const inv = getInv(d.iso);
              const cellState = resolveInventoryCellState(d.iso, inv, {
                futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS,
              });
              const cellMeta = {
                listingId: listing._id,
                roomTypeId: listing.roomTypeId || 'default',
                dateStr: d.iso,
                column: colId,
              };
              const sel = isSelected(cellMeta);
              const draggable = col.excelSelectable;
              return (
                <CollapseCell
                  key={d.iso} col={col} day={d} inv={inv} listing={listing}
                  dpEnabled={dpEnabled}
                  selected={sel} draggable={draggable}
                  onMouseDown={
                    draggable && (cellState === 'data' || (colId === 'dynamicPrice' && cellState === 'archive'))
                      ? (e) => onMouseDown(cellMeta, e)
                      : undefined
                  }
                  onMouseEnter={draggable ? () => onMouseEnter(cellMeta) : undefined}
                  onPriceClick={onPriceClick}
                  onToggleDynamicPrice={calendarReviewActive ? undefined : onToggleDynamicPrice}
                  tipOpen={
                    colId === 'rate' &&
                    activeTip?.listingId === listing._id &&
                    activeTip?.dateStr === d.iso &&
                    activeTip?.column === 'rate'
                  }
                  onReservationClick={(rect) => {
                    if (colId === 'reservations' && (inv.reservations?.length ?? 0) >= 1) {
                      onReservationClick(rect, d.iso, inv.reservations);
                    }
                  }}
                />
              );
            })}
          </div>
          </React.Fragment>
        );
      })}

      <AuditBlockedDaysModal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        listingName={listing.name || listing.title || 'Listing'}
        roomTypeName={listing.roomTypeName || null}
        loading={auditResult.loading}
        error={auditResult.error}
        roomTypes={auditResult.roomTypes}
        postImportAudit={auditResult.postImportAudit}
        calendarReviewActive={calendarReviewActive}
        onFinishCalendarImport={calendarReviewActive ? handleFinishCalendarImport : undefined}
        finishingCalendarImport={finishingCalendarImport}
        onRelease={async (range) => {
          const roomTypeId = range.roomTypeId || listing.roomTypeId || listing.roomTypes?.[0]?._id;
          if (!roomTypeId) throw new Error('Room type introuvable');
          const base = {
            roomTypeId: String(roomTypeId),
            date_from: range.from,
            date_to: range.to,
            listingName: listing.name || '',
            roomTypeName: range.roomTypeName || '',
          };
          const isMulti = listing.propertyUnit === 'Multi';
          const capacity = isMulti
            ? Math.max(1, Number(range.roomNumber ?? listing.roomNumber ?? 1))
            : 1;
          // En revue import, le backend conserve la correction localement.
          await calendarService.updateCalendar([
            { ...base, type: 'availability', availableRoom: capacity },
            { ...base, type: 'stopSell', stopSell: false },
          ]);
          setAuditResult((s) => ({ ...s, loading: true }));
        }}
        onBlockForReservation={async (range) => {
          const roomTypeId = range.roomTypeId || listing.roomTypeId || listing.roomTypes?.[0]?._id;
          if (!roomTypeId) throw new Error('Room type introuvable');
          const base = {
            roomTypeId: String(roomTypeId),
            date_from: range.from,
            date_to: range.to,
            listingName: listing.name || '',
            roomTypeName: range.roomTypeName || '',
          };
          // Résa ouverte encore dispo → corriger l'inventaire local.
          await calendarService.updateCalendar([
            { ...base, type: 'availability', availableRoom: 0 },
            { ...base, type: 'stopSell', stopSell: false },
          ]);
          setAuditResult((s) => ({ ...s, loading: true }));
        }}
        onFixPrice={async (row) => {
          const roomTypeId = row.roomTypeId || listing.roomTypeId || listing.roomTypes?.[0]?._id;
          if (!roomTypeId) throw new Error('Room type introuvable');
          // Prix : calendrier local seulement pendant revue (gate backend)
          await calendarService.updateCalendar([
            {
              roomTypeId: String(roomTypeId),
              date_from: row.date,
              date_to: row.date,
              listingName: listing.name || '',
              roomTypeName: row.roomTypeName || '',
              type: 'manualPrice',
              price: Number(row.newPrice),
            },
          ]);
        }}
      />
    </div>
  );
}

/* ─── Jour indisponible SANS réservation Sojori : classification de la cause ───
 * Contexte : les dates fermées côté canal sont importées dans l'inventaire avec
 * availableRoom=0 (et stopSell=false), sans objet réservation Sojori. On les
 * distingue du stop-sell manuel pour l'affichage. */
function blockedNoResaInfo(inv, block) {
  if (!inv || !hasInventoryData(inv)) return null;
  if ((inv.reservations?.length ?? 0) > 0) return null; // occupé par une résa → normal
  const ar = inv.availableRoom;
  const isStop = inv.stopSell === true;
  const isZero = ar != null && ar <= 0;
  if (!isStop && !isZero) return null;
  // Bloc avec métadonnées (titre/note/auteur) → priorité sur la classification générique
  if (block) {
    const author = block.createdBy?.name ? ` · par ${block.createdBy.name}` : '';
    const note = block.note ? `\n${block.note}` : '';
    return {
      kind: 'block',
      color: 'rgba(220,38,38,0.9)',
      title: block.title,
      label: `« ${block.title} »${author}${note}`,
    };
  }
  if (isStop) {
    return {
      kind: 'stop',
      color: 'rgba(220,38,38,0.9)',
      label: 'Stop-sell — bloqué manuellement sur les canaux, aucune réservation Sojori.',
    };
  }
  return {
    kind: 'channel',
    color: 'rgba(220,38,38,0.9)',
    label: 'Bloqué côté canal — date fermée à l’import, sans réservation Sojori. Ne pas rouvrir sans vérifier le canal (risque de sur-réservation).',
  };
}

/* ─── Ligne principale : bandeau Excel (+) · prix clic · M/D (pas de 0/1 Single) ─── */
function PrimaryInventoryCell({
  day, inv, listing, showRate, showDispo, isSelected, onMouseDown, onMouseEnter, onPriceClick,
  listingId, roomTypeId, draggable, tipOpen, dpEnabled = true,
}) {
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';
  const isSingle = listing.propertyUnit === 'Single' || Boolean(listing._isRoomTypeRow);
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const rate = formatInventoryRateLabel(state, inv);
  const archived = state === 'archive';
  const noData = state === 'out_of_window' || state === 'missing';
  const mode = resolvePriceMode(inv);
  const modeLetter = mode === 'dynamic' ? 'D' : mode === 'manual' ? 'M' : null;
  const canInteract = draggable && !archived;
  const canPriceClick = canInteract && showRate && hasInventoryData(inv) && !noData;

  const blocksById = useContext(CalendarBlocksContext);
  const dayBlock = inv?.blockId ? blocksById[String(inv.blockId)] : null;
  const blockInfo = state === 'data' ? blockedNoResaInfo(inv, dayBlock) : null;
  // Fond = uniquement réservé / dispo / bloqué (jamais M/D)
  const background = inventoryStatusBackground(state, inv);

  const dash = '—';
  // Single : jamais 0/1 sur la ligne principale (dispo → collapse). Multi : compteur si filtre Dispo actif.
  const showDispoNumber = showDispo && !isSingle;
  const dispoVal = inv?.stopSell ? '🚫' : (inv?.availableRoom != null ? inv.availableRoom : dash);
  const dispoColor = inv?.stopSell || blockInfo ? 'rgba(220,38,38,0.95)' : T.text2;

  const rateMeta = { listingId, roomTypeId, dateStr: day.iso, column: 'rate' };
  const dispoMeta = { listingId, roomTypeId, dateStr: day.iso, column: 'availableRoom' };
  const excelMeta = showRate ? rateMeta : dispoMeta;
  const excelSelected = isSelected?.(excelMeta);
  const anySelected = excelSelected || isSelected?.(showRate ? dispoMeta : rateMeta);

  const bindExcel = (meta) => ({
    onMouseDown: canInteract ? (e) => { e.stopPropagation(); onMouseDown?.(meta, e); } : undefined,
    onMouseEnter: canInteract ? () => onMouseEnter?.(meta) : undefined,
  });

  const hasExcelZone = showRate || showDispo;
  const hasPriceZone = showRate;

  return (
    <div
      ref={ref}
      style={{
        borderRight: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: '2px 2px',
        minHeight: 30,
        position: 'relative',
        fontFamily: '"Geist Mono", monospace',
        background: anySelected ? T.primaryTint3 : background,
        userSelect: 'none',
        gap: 2,
      }}
    >
      {blockInfo && (
        <span
          aria-hidden
          title={blockInfo.label}
          style={{
            position: 'absolute', top: 3, left: 3, width: 5, height: 5,
            borderRadius: '50%', background: blockInfo.color, lineHeight: 1, zIndex: 2,
          }}
        />
      )}

      {hasExcelZone && hasPriceZone && (
        <div
          {...bindExcel(excelMeta)}
          title="Sélection Excel"
          aria-label="Sélection Excel"
          style={{
            flex: '0 0 14px',
            minHeight: 26,
            borderRadius: '4px 0 0 4px',
            cursor: archived ? 'not-allowed' : canInteract ? 'cell' : 'default',
            boxShadow: excelSelected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: excelSelected ? T.primaryTint3 : 'rgba(20,17,10,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: excelSelected ? T.primaryDeep : T.text4,
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          +
        </div>
      )}

      {hasExcelZone && !hasPriceZone && (
        <div
          {...bindExcel(excelMeta)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 26,
            borderRadius: 4,
            cursor: archived ? 'not-allowed' : canInteract ? 'cell' : 'default',
            boxShadow: excelSelected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: excelSelected ? T.primaryTint3 : 'transparent',
          }}
        >
          {showDispoNumber && (
            <span style={{ fontSize: 10, fontWeight: 700, color: dispoColor, whiteSpace: 'nowrap' }}>
              {dispoVal}
            </span>
          )}
        </div>
      )}

      {hasPriceZone && (
        <div
          onClick={canPriceClick ? (e) => onPriceClick?.(rateMeta, e) : undefined}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            minWidth: 0,
            minHeight: 26,
            borderRadius: 4,
            cursor: canPriceClick ? 'pointer' : archived ? 'not-allowed' : 'default',
            boxShadow: tipOpen ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: tipOpen ? T.primaryTint : 'transparent',
            position: 'relative',
          }}
        >
          <span
            style={{
              fontSize: state === 'data' ? 12 : 11,
              fontWeight: 700,
              color: archived ? ARCHIVE_CELL_TEXT : noData ? T.text4 : T.text,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {rate.main}
            {rate.showCurrency && (
              <span style={{ fontSize: 8, color: T.text3, fontWeight: 600, marginLeft: 2 }}>{currency}</span>
            )}
          </span>
          {modeLetter && state === 'data' && !archived && (
            <span
              title={PRICE_MODE_LABEL[mode]}
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: mode === 'dynamic' ? T.ai : T.warning,
                letterSpacing: '0.02em',
                opacity: 0.9,
              }}
            >
              {modeLetter}
            </span>
          )}
          {showDispoNumber && (
            <>
              <span style={{ color: T.text4, fontSize: 9, fontWeight: 600 }}>·</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: dispoColor, whiteSpace: 'nowrap' }}>
                {dispoVal}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Collapse cell — tarif : + Excel · prix clic ; autres : cellule Excel ─── */
function CollapseCell({ col, day, inv, listing, selected, draggable, onMouseDown, onMouseEnter, onReservationClick, tipOpen, onPriceClick, onToggleDynamicPrice, dpEnabled = true }) {
  const blocksById = useContext(CalendarBlocksContext);
  const dayBlock = inv?.blockId ? blocksById[String(inv.blockId)] : null;
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';

  // Détecter les états de la cellule
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const noData = state === 'out_of_window' || state === 'missing';
  const archived = state === 'archive';
  // Fond = uniquement réservé / dispo / bloqué (jamais M/D)
  let background = inventoryStatusBackground(state, inv);
  if (selected) background = T.primaryTint3;

  const dash = '—';
  let content = null;
  if (!hasInventoryData(inv) && state !== 'archive') {
    content = <span style={{ color: T.text4, fontSize: 11 }} title={formatInventoryRateLabel(state, inv).hint}>{dash}</span>;
  } else if (col.id === 'availableRoom') content = inv.availableRoom ?? dash;
  else if (col.id === 'rate') {
    const rate = formatInventoryRateLabel(state, inv);
    const mode = resolvePriceMode(inv);
    content = rate.showCurrency
      ? (
        <span style={{ color: T.text }} title={`Mode: ${PRICE_MODE_LABEL[mode]}`}>
          {rate.main}
          <span style={{ fontSize: 9, color: T.text3, marginLeft: 2 }}>{currency}</span>
          {(mode === 'manual' || mode === 'dynamic') && (
            <span style={{ fontSize: 9, fontWeight: 800, marginLeft: 3, color: mode === 'dynamic' ? T.ai : T.warning }}>
              {PRICE_MODE_LETTER[mode]}
            </span>
          )}
        </span>
      )
      : <span style={{ color: T.text4 }}>{rate.main}</span>;
  } else if (col.id === 'basePrice') content = inv.basePrice ?? dash;
  else if (col.id === 'manualPrice') content = inv.manualPrice ?? dash;
  else if (col.id === 'dynamicPrice' && !dpEnabled) {
    // Pilote prix dynamique OFF sur ce bien → pas d'élément DP dans le calendrier
    content = dash;
  }
  else if (col.id === 'dynamicPrice') {
    const isDyn = resolvePriceMode(inv) === 'dynamic';
    const canToggle =
      Boolean(onToggleDynamicPrice) &&
      hasInventoryData(inv) &&
      (state === 'data' || state === 'archive');
    content = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!canToggle) return;
          onToggleDynamicPrice?.({
            listingId: listing._id,
            roomTypeId: listing.roomTypeId || 'default',
            dateStr: day.iso,
            enable: !isDyn,
            isArchived: archived,
          });
        }}
        disabled={!canToggle}
        title={isDyn ? 'D = dynamique — cliquer pour Manuel (M)' : 'M = manuel — cliquer pour Dynamique (D)'}
        style={{
          border: 0,
          cursor: canToggle ? 'pointer' : 'default',
          color: isDyn ? T.ai : T.warning,
          fontSize: 11,
          fontWeight: 800,
          background: isDyn ? 'rgba(124,58,237,0.14)' : 'rgba(184,133,26,0.12)',
          padding: '1px 7px',
          borderRadius: 99,
          letterSpacing: '0.04em',
          fontFamily: '"Geist Mono", monospace',
          opacity: canToggle ? 1 : 0.55,
        }}
      >
        {isDyn ? 'D' : 'M'}
      </button>
    );
  }
  else if (col.id === 'priceMode') {
    const mode = resolvePriceMode(inv);
    const color = mode === 'manual' ? T.warning : mode === 'dynamic' ? T.ai : T.text3;
    content = (
      <span style={{ color, fontSize: 12, fontWeight: 800 }} title={PRICE_MODE_LABEL[mode]}>
        {PRICE_MODE_LETTER[mode]}
      </span>
    );
  }
  else if (col.id === 'stopSell')  content = inv.stopSell ? <span style={{ color: T.error }}>🚫</span> : <span style={{ color: T.success }}>✅</span>;
  else if (col.id === 'minStay')   content = inv.minStay ?? dash;
  else if (col.id === 'maxStay')   content = inv.maxStay ?? dash;
  else if (col.id === 'closedArrival') content = inv.closedArrival ? <span style={{ color: T.error }}>⛔</span> : <span style={{ color: T.success }}>✅</span>;
  else if (col.id === 'closedDeparture') content = inv.closedDeparture ? <span style={{ color: T.error }}>⛔</span> : <span style={{ color: T.success }}>✅</span>;
  else if (col.id === 'reservations') {
    const n = inv.reservations?.length ?? 0;
    const resaBadgeStyle = {
      fontSize: 10, fontWeight: 700, color: T.primaryDeep,
      background: T.primaryTint, padding: '1px 6px', borderRadius: 99,
      cursor: 'pointer', fontFamily: '"Geist Mono", monospace',
    };
    if (n === 0) {
      const blockInfo = state === 'data' ? blockedNoResaInfo(inv, dayBlock) : null;
      content = blockInfo ? (
        <span
          title={blockInfo.label}
          style={{ color: blockInfo.color, fontSize: 12, fontWeight: 800, cursor: 'help', lineHeight: 1 }}
        >
          {blockInfo.kind === 'stop' || blockInfo.kind === 'block' ? '🚫' : '⧗'}
        </span>
      ) : '—';
    } else {
      content = (
      <span
        onClick={(e) => {
          e.stopPropagation();
          onReservationClick?.(ref.current?.getBoundingClientRect());
        }}
        style={resaBadgeStyle}
      >
        {n === 1 ? '1 résa' : `${n} résa`}
      </span>
      );
    }
  }

  const canInteract = draggable && !archived;
  const isRateSplit = col.id === 'rate' && hasInventoryData(inv) && !noData && !archived;
  const rateMeta = {
    listingId: listing._id,
    roomTypeId: listing.roomTypeId || 'default',
    dateStr: day.iso,
    column: 'rate',
  };
  const canPriceClick = isRateSplit && onPriceClick;

  if (isRateSplit) {
    return (
      <div
        ref={ref}
        style={{
          borderRight: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 1,
          padding: '2px 2px',
          minHeight: 27,
          position: 'relative',
          fontFamily: '"Geist Mono", monospace',
          fontSize: 12,
          fontWeight: 600,
          background: selected ? T.primaryTint3 : background,
          color: selected ? T.primaryDeep : T.text,
        }}
      >
        <div
          onMouseDown={canInteract ? onMouseDown : undefined}
          onMouseEnter={canInteract ? onMouseEnter : undefined}
          title="Sélection Excel"
          aria-label="Sélection Excel"
          style={{
            flex: '0 0 14px',
            cursor: canInteract ? 'cell' : 'not-allowed',
            boxShadow: selected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: selected ? T.primaryTint3 : 'rgba(20,17,10,0.07)',
            borderRadius: '4px 0 0 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: selected ? T.primaryDeep : T.text4,
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          +
        </div>
        <div
          onClick={canPriceClick ? (e) => onPriceClick(rateMeta, e) : undefined}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canPriceClick ? 'pointer' : 'default',
            boxShadow: tipOpen ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: tipOpen ? T.primaryTint : 'transparent',
            borderRadius: 4,
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      style={{
        borderRight: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4,
        padding: '3px 4px', minHeight: 27, position: 'relative',
        fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 600,
        cursor: archived ? 'not-allowed' : draggable ? 'cell' : 'default',
        background: tipOpen ? T.primaryTint : background,
        boxShadow: selected || tipOpen ? `inset 0 0 0 2px ${T.primary}` : 'none',
        color: selected ? T.primaryDeep : T.text,
        transition: 'background 0.1s',
      }}>
      {content}
    </div>
  );
}

/* ─── Legend item (dot + label) ─── */
function Legend({ dot, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <i style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}
