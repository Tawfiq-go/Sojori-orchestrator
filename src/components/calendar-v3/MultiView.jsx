// ════════════════════════════════════════════════════════════════════
// MultiView.jsx — grille Multi-listing · ligne principale (prix + dispo) + détail optionnel
// Excel selection drag · scroll sync · tooltip breakdown · popover rotations
// ════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  T, ALL_COLUMNS, priceOf, cellKey, genDays, isArchiveDay, ARCHIVE_CELL_BG, ARCHIVE_CELL_TEXT,
  hasInventoryData, resolveInventoryCellState, formatInventoryRateLabel, OUT_OF_WINDOW_CELL_BG,
  resolvePriceMode, PRICE_MODE_LABEL,
  calendarPrimaryColumns, calendarCollapseColumns,
} from './_shared';
import { INVENTORY_FUTURE_HORIZON_DAYS } from './inventoryCalendarConstants';
import TooltipBreakdown from './TooltipBreakdown';
import PopoverReservations from './PopoverReservations';
import AuditBlockedDaysModal from './AuditBlockedDaysModal';
import { normalizeCalendarReservations } from './reservationCalendarUtils';
import { useCalendarBreakpoint } from '../../hooks/useCalendarBreakpoint';
import calendarService from '../../services/calendarService';

const CELL_W_DESKTOP = 90;
const CELL_W_MOBILE = 76;
const LEFT_W_DESKTOP = 200;
const LEFT_W_MOBILE = 132;

export default function MultiView({
  startDate = new Date(),
  daysCount = 31,
  listingCatalog = [],
  listings: listingsLegacy,
  inventoriesByListing = {},
  inventoryLoading = false,
  selectedColumns = [],
  onCellsSelected,
  onOpenReservation,
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
  const toggleListing = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

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
    if (st !== 'data') return;
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
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Légende
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: T.text2, fontWeight: 600 }}>
          <Legend dot="rgba(6,115,179,0.7)" label="Réservé" />
          <Legend dot="rgba(200,30,30,0.7)" label="Stop sell" />
          <Legend dot={T.warning} label="Bloqué canal (sans résa Sojori)" />
          <Legend dot={T.ai} label="Prix dynamique" />
          <Legend dot={T.bg2} label="Weekend" />
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
          {listings.map((listing) => (
            <ListingRow
              key={listing._id}
              listing={listing}
              inventories={inventoriesByListing[listing._id] || {}}
              days={days}
              leftW={LEFT_W}
              cellW={CELL_W}
              expanded={!!expanded[listing._id]}
              onToggle={() => toggleListing(listing._id)}
              selectedColumns={selectedColumns}
              isSelected={isSelected}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
              onPriceClick={onPriceClick}
              onReservationClick={handleReservationDayClick}
              activeTip={activeTip}
            />
          ))}
        </div>
      </div>

      {activeTip && (() => {
        const inv = inventoriesByListing[activeTip.listingId]?.[activeTip.dateStr];
        const listing = listings.find((l) => String(l._id) === String(activeTip.listingId));
        if (!inv || !listing || !hasInventoryData(inv)) return null;
        return (
          <TooltipBreakdown
            open
            anchorRef={tipAnchorElRef}
            inv={inv}
            dateStr={activeTip.dateStr}
            currency={listing.currencyCode || listing.currency || 'MAD'}
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
  listing, expanded, showChevron, onToggle, avgPrice,
}) {
  const isSingle = listing.propertyUnit === 'Single';
  return (
    <div
      onClick={showChevron ? onToggle : undefined}
      style={{
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: T.bg1,
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
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${listing.photoColor || '#fde68a'}, ${listing.photoColorDeep || '#d97706'})`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          {listing.name}
        </span>
        {avgPrice > 0 ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              marginTop: 2,
              display: 'block',
            }}
          >
            Moy: {avgPrice} {listing.currencyCode || listing.currency || 'MAD'}
          </span>
        ) : isSingle ? (
          <span style={{ fontSize: 9.5, color: T.text4, marginTop: 2, display: 'block' }}>
            Tarif · Dispo
          </span>
        ) : null}
      </div>
    </div>
  );
});

/* ─── Ligne d'un listing (prix + dispo sur une ligne, détail en collapse) ─── */
function ListingRow({
  listing, inventories, days, leftW: LEFT_W, cellW: CELL_W, expanded, onToggle, selectedColumns, isSelected, onMouseDown, onMouseEnter, onPriceClick, onReservationClick, activeTip,
}) {
  const primaryCols = calendarPrimaryColumns(selectedColumns);
  const collapseColumns = calendarCollapseColumns(selectedColumns);
  const showChevron = collapseColumns.length > 0;
  const showDispo = primaryCols.includes('availableRoom');
  const showRate = primaryCols.includes('rate');
  const getInv = (dateStr) => inventories[dateStr];

  /* ─── Audit jours bloqués sans réservation — modal résultat en tableau ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({ loading: false, error: null, roomTypes: [] });

  const handleAuditClick = useCallback(() => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [] });
  }, []);

  useEffect(() => {
    if (!auditOpen || !auditResult.loading) return;
    let cancelled = false;
    const roomTypeId = listing.roomTypeId || undefined;
    (async () => {
      try {
        const result = await calendarService.auditBlockedDays(listing._id, roomTypeId);
        if (!cancelled) setAuditResult({ loading: false, error: null, roomTypes: result.roomTypes });
      } catch (err) {
        if (!cancelled) setAuditResult({ loading: false, error: err?.message || 'Erreur inconnue', roomTypes: [] });
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
              tipOpen={
                activeTip?.listingId === listing._id &&
                activeTip?.dateStr === d.iso &&
                activeTip?.column === 'rate'
              }
            />
          );
        })}
      </div>

      {/* Lignes sélection Excel — collapse (colonnes hors ligne principale) */}
      {expanded && collapseColumns.map(colId => {
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
              padding: '5px 16px 5px 38px', display: 'flex', alignItems: 'center', gap: 6,
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
                  selected={sel} draggable={draggable}
                  onMouseDown={draggable && cellState === 'data' ? (e) => onMouseDown(cellMeta, e) : undefined}
                  onMouseEnter={draggable ? () => onMouseEnter(cellMeta) : undefined}
                  onPriceClick={onPriceClick}
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
          // Single : stock 1. Multi : revenir au roomNumber du type (pas hardcode 1).
          const isMulti = listing.propertyUnit === 'Multi';
          const capacity = isMulti
            ? Math.max(1, Number(range.roomNumber ?? listing.roomNumber ?? 1))
            : 1;
          await calendarService.updateCalendar([
            { ...base, type: 'availability', availableRoom: capacity },
            { ...base, type: 'stopSell', stopSell: false },
          ]);
          setAuditResult((s) => ({ ...s, loading: true }));
        }}
      />
    </div>
  );
}

/* ─── Jour indisponible SANS réservation Sojori : classification de la cause ───
 * Contexte : les dates fermées côté canal (Airbnb/Rentals United) sont importées
 * dans l'inventaire avec availableRoom=0 (et stopSell=false), sans objet
 * réservation Sojori. On les distingue du stop-sell manuel pour l'affichage. */
function blockedNoResaInfo(inv) {
  if (!inv || !hasInventoryData(inv)) return null;
  if ((inv.reservations?.length ?? 0) > 0) return null; // occupé par une résa → normal
  const ar = inv.availableRoom;
  const isStop = inv.stopSell === true;
  const isZero = ar != null && ar <= 0;
  if (!isStop && !isZero) return null;
  if (isStop) {
    return {
      kind: 'stop',
      color: T.error,
      label: 'Stop-sell OTA — bloqué manuellement sur les canaux, aucune réservation Sojori.',
    };
  }
  return {
    kind: 'channel',
    color: T.warning,
    label: 'Bloqué côté canal (Airbnb / Rentals United) — date fermée à l’import, sans réservation Sojori. Ne pas rouvrir sans vérifier le canal (risque de sur-réservation).',
  };
}

/* ─── Ligne principale : bandeau Excel (gauche) · prix clic détail (droite) ─── */
function PrimaryInventoryCell({
  day, inv, listing, showRate, showDispo, isSelected, onMouseDown, onMouseEnter, onPriceClick,
  listingId, roomTypeId, draggable, tipOpen,
}) {
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const rate = formatInventoryRateLabel(state, inv);
  const archived = state === 'archive';
  const noData = state === 'out_of_window' || state === 'missing';
  const isDynamic = hasInventoryData(inv) && resolvePriceMode(inv) === 'dynamic';
  const isStop = hasInventoryData(inv) && !!inv.stopSell;
  const isBooked = (inv?.reservations?.length ?? 0) > 0;
  const isWeekend = day.isWeekend;
  const mode = resolvePriceMode(inv);
  const modeColor = mode === 'manual' ? T.warning : mode === 'dynamic' ? T.ai : T.text;
  const canInteract = draggable && !archived;
  const canPriceClick = canInteract && showRate && hasInventoryData(inv) && !noData;

  let background = T.bg1;
  if (state === 'out_of_window') background = OUT_OF_WINDOW_CELL_BG;
  else if (archived) background = ARCHIVE_CELL_BG;
  else if (noData) background = T.bg2;
  else if (isStop) background = 'rgba(200,30,30,0.05)';
  else if (isBooked) background = 'rgba(6,115,179,0.06)';
  else if (isWeekend) background = T.bg2;
  else if (day.isToday) background = 'rgba(184,133,26,0.04)';
  else if (isDynamic) background = 'rgba(124,58,237,0.04)';

  const dash = '—';
  const dispoVal = inv?.stopSell ? '🚫' : (inv?.availableRoom != null ? inv.availableRoom : dash);
  const blockInfo = state === 'data' ? blockedNoResaInfo(inv) : null;
  const dispoColor = inv?.stopSell ? T.error : (blockInfo?.kind === 'channel' ? T.warning : T.text2);

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
        gap: 1,
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

      {/* Bandeau Excel (sans icône) */}
      {hasExcelZone && hasPriceZone && (
        <div
          {...bindExcel(excelMeta)}
          aria-hidden
          style={{
            flex: '0 0 6px',
            minHeight: 26,
            borderRadius: '4px 0 0 4px',
            cursor: archived ? 'not-allowed' : canInteract ? 'cell' : 'default',
            boxShadow: excelSelected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: excelSelected ? T.primaryTint3 : 'rgba(20,17,10,0.06)',
          }}
        />
      )}

      {/* Dispo seule — cellule Excel pleine largeur */}
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
          {showDispo && (
            <span style={{ fontSize: 10, fontWeight: 700, color: dispoColor, whiteSpace: 'nowrap' }}>
              {dispoVal}
            </span>
          )}
        </div>
      )}

      {/* Prix + dispo — clic détail sur le tarif */}
      {hasPriceZone && (
        <div
          onClick={canPriceClick ? (e) => onPriceClick?.(rateMeta, e) : undefined}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            minWidth: 0,
            minHeight: 26,
            borderRadius: 4,
            cursor: canPriceClick ? 'pointer' : archived ? 'not-allowed' : 'default',
            boxShadow: tipOpen ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: tipOpen ? T.primaryTint : 'transparent',
            position: 'relative',
          }}
        >
          {isDynamic && state === 'data' && (
            <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 8, color: T.ai, lineHeight: 1 }}>⚡</span>
          )}
          <span
            style={{
              fontSize: state === 'data' ? 12 : 11,
              fontWeight: 700,
              color: archived ? ARCHIVE_CELL_TEXT : noData ? T.text4 : isDynamic ? T.ai : modeColor,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {rate.main}
            {rate.showCurrency && (
              <span style={{ fontSize: 8, color: T.text3, fontWeight: 600, marginLeft: 2 }}>{currency}</span>
            )}
          </span>
          {showDispo && (
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
function CollapseCell({ col, day, inv, listing, selected, draggable, onMouseDown, onMouseEnter, onReservationClick, tipOpen, onPriceClick }) {
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';

  // Détecter les états de la cellule
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const noData = state === 'out_of_window' || state === 'missing';
  const archived = state === 'archive';
  const isStopSell = hasInventoryData(inv) && !!inv.stopSell;
  const isBooked = (inv?.reservations?.length ?? 0) > 0;
  const isDynamic = hasInventoryData(inv) && resolvePriceMode(inv) === 'dynamic';
  const isWeekend = day.isWeekend;

  let background = 'transparent';
  if (state === 'out_of_window') {
    background = OUT_OF_WINDOW_CELL_BG;
  } else if (archived) {
    background = ARCHIVE_CELL_BG;
  } else if (noData) {
    background = T.bg2;
  } else if (selected) {
    background = T.primaryTint3;
  } else if (isStopSell) {
    background = 'rgba(200,30,30,0.05)'; // Rouge très léger
  } else if (isBooked) {
    background = 'rgba(6,115,179,0.06)'; // Bleu léger
  } else if (isWeekend) {
    background = T.bg2; // Gris clair
  } else if (isDynamic) {
    background = 'rgba(124,58,237,0.04)'; // Violet très léger
  }

  const dash = '—';
  let content = null;
  if (!hasInventoryData(inv) && state !== 'archive') {
    content = <span style={{ color: T.text4, fontSize: 11 }} title={formatInventoryRateLabel(state, inv).hint}>{dash}</span>;
  } else if (col.id === 'availableRoom') content = inv.availableRoom ?? dash;
  else if (col.id === 'rate') {
    const rate = formatInventoryRateLabel(state, inv);
    const mode = resolvePriceMode(inv);
    const modeColor = mode === 'manual' ? T.warning : mode === 'dynamic' ? T.ai : T.text;
    content = rate.showCurrency
      ? (
        <span style={{ color: modeColor }} title={`Mode: ${PRICE_MODE_LABEL[mode]}`}>
          {rate.main}
          <span style={{ fontSize: 9, color: T.text3, marginLeft: 2 }}>{currency}</span>
        </span>
      )
      : <span style={{ color: T.text4 }}>{rate.main}</span>;
  } else if (col.id === 'basePrice') content = inv.basePrice ?? dash;
  else if (col.id === 'manualPrice') content = inv.manualPrice ?? dash;
  else if (col.id === 'dynamicPrice') {
    const isDyn = resolvePriceMode(inv) === 'dynamic';
    content = (
      <span style={{ color: isDyn ? T.ai : T.text3, fontSize: 11, fontWeight: 700 }}>
        {isDyn ? 'Oui' : 'Non'}
      </span>
    );
  }
  else if (col.id === 'priceMode') {
    const mode = resolvePriceMode(inv);
    const color = mode === 'manual' ? T.warning : mode === 'dynamic' ? T.ai : T.text3;
    content = (
      <span style={{ color, fontSize: 11, fontWeight: 600 }}>
        {PRICE_MODE_LABEL[mode]}
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
      const blockInfo = state === 'data' ? blockedNoResaInfo(inv) : null;
      content = blockInfo ? (
        <span
          title={blockInfo.label}
          style={{ color: blockInfo.color, fontSize: 12, fontWeight: 800, cursor: 'help', lineHeight: 1 }}
        >
          {blockInfo.kind === 'stop' ? '🚫' : '⧗'}
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
          aria-hidden
          style={{
            flex: '0 0 6px',
            cursor: canInteract ? 'cell' : 'not-allowed',
            boxShadow: selected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: selected ? T.primaryTint3 : 'rgba(20,17,10,0.06)',
            borderRadius: '4px 0 0 4px',
          }}
        />
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
