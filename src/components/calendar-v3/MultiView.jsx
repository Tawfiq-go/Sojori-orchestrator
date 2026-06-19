// ════════════════════════════════════════════════════════════════════
// MultiView.jsx — grille Multi-listing · Rate TOP + collapse
// Excel selection drag · scroll sync · tooltip breakdown · popover rotations
// ════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  T, ALL_COLUMNS, priceOf, cellKey, genDays, isArchiveDay, ARCHIVE_CELL_BG, ARCHIVE_CELL_TEXT,
  hasInventoryData, resolveInventoryCellState, formatInventoryRateLabel, OUT_OF_WINDOW_CELL_BG,
} from './_shared';
import { INVENTORY_FUTURE_HORIZON_DAYS } from './inventoryCalendarConstants';
import TooltipBreakdown from './TooltipBreakdown';
import PopoverReservations from './PopoverReservations';
import { normalizeCalendarReservations } from './reservationCalendarUtils';

const CELL_W = 90;
const LEFT_W = 200;

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
  const days = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const syncing = useRef(false);

  /* ─── Expand/collapse par listing ─── */
  const [expanded, setExpanded] = useState({});
  const toggleListing = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  /* ─── Sélection Excel ─── */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [currentHoverCell, setCurrentHoverCell] = useState(null);

  const selectedSet = useMemo(() => new Set(selectedCells.map(cellKey)), [selectedCells]);
  const isSelected = useCallback((c) => selectedSet.has(cellKey(c)), [selectedSet]);

  const onMouseDown = (cell) => {
    const inv = inventoriesByListing[cell.listingId]?.[cell.dateStr];
    const st = resolveInventoryCellState(cell.dateStr, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
    if (st !== 'data') return;
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
    setCurrentHoverCell(cell);
    const allIso = days.map(d => d.iso);
    const a = allIso.indexOf(dragStart.dateStr);
    const b = allIso.indexOf(cell.dateStr);
    const [from, to] = a < b ? [a, b] : [b, a];
    setSelectedCells(allIso.slice(from, to + 1).map(iso => ({ ...cell, dateStr: iso })));
  };
  const onMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStart(null);
    setCurrentHoverCell(null);
    if (selectedCells.length > 0) onCellsSelected?.(selectedCells);
  }, [isDragging, selectedCells, onCellsSelected]);

  useEffect(() => {
    const onUp = () => onMouseUp();
    const onKey = (e) => { if (e.key === 'Escape') { setSelectedCells([]); setIsDragging(false); setDragStart(null); setCurrentHoverCell(null); } };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('keydown', onKey); };
  }, [onMouseUp]);

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
      maxHeight: 'calc(100vh - 220px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Légende des couleurs - au-dessus du header */}
      <div style={{
        padding: '10px 16px', background: T.bg0, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Légende
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: T.text2, fontWeight: 600 }}>
          <Legend dot="rgba(6,115,179,0.7)" label="Réservé" />
          <Legend dot="rgba(200,30,30,0.7)" label="Stop sell" />
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
            padding: '14px 16px', display: 'flex', alignItems: 'center',
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
              expanded={!!expanded[listing._id]}
              onToggle={() => toggleListing(listing._id)}
              selectedColumns={selectedColumns.length ? selectedColumns : []}
              isSelected={isSelected}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
              onReservationClick={handleReservationDayClick}
            />
          ))}
        </div>
      </div>

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
      padding: '10px 0', textAlign: 'center',
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
const ListingLabel = memo(function ListingLabel({ listing, expanded, showChevron, onToggle, avgPrice }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '12px 16px',
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
        {avgPrice > 0 && (
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
            Moy: {avgPrice} {listing.currencyCode || 'EUR'}
          </span>
        )}
      </div>
    </div>
  );
});

/* ─── Ligne d'un listing (Rate TOP + collapse) ─── */
function ListingRow({
  listing, inventories, days, expanded, onToggle, selectedColumns, isSelected, onMouseDown, onMouseEnter, onReservationClick,
}) {
  const showChevron = selectedColumns.length > 0;
  const getInv = (dateStr) => inventories[dateStr];

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
      {/* Rate TOP — toujours visible */}
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
          return (
            <RateTopCell
              key={d.iso}
              day={d}
              inv={inv}
              currency={listing.currencyCode || 'EUR'}
            />
          );
        })}
      </div>

      {/* Collapse rows */}
      {expanded && selectedColumns.map(colId => {
        const col = ALL_COLUMNS.find(c => c.id === colId);
        if (!col) return null;
        return (
          <div key={colId} style={{
            display: 'grid',
            gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
            borderBottom: `1px dashed ${T.border}`,
            background: T.bg2,
            animation: 'fadeIn 0.25s both',
          }}>
            <div style={{
              padding: '8px 16px 8px 38px', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, color: T.text2,
              fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em',
              borderRight: `1px solid ${T.border}`,
              position: 'sticky', left: 0, zIndex: 3,
              background: T.bg2,
              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
            }}>
              {col.short}
              {col.hasTooltip && <span style={{ fontSize: 11, color: T.ai, cursor: 'help' }} title="Tooltip breakdown au hover">ⓘ</span>}
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
                  onMouseDown={draggable && cellState === 'data' ? () => onMouseDown(cellMeta) : undefined}
                  onMouseEnter={draggable ? () => onMouseEnter(cellMeta) : undefined}
                  onReservationClick={(rect) => {
                    if (colId === 'reservations' && (inv.reservations?.length ?? 0) >= 1) {
                      onReservationClick(rect, d.iso, inv.reservations);
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Rate TOP cell (lecture seule, pas de sélection Excel) ─── */
function RateTopCell({ day, inv, currency }) {
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const rate = formatInventoryRateLabel(state, inv);
  const archived = state === 'archive';
  const noData = state === 'out_of_window' || state === 'missing';
  const isDynamic = hasInventoryData(inv) && !!inv.useDynamicPrice;
  const isStop = hasInventoryData(inv) && !!inv.stopSell;
  const isBooked = (inv?.reservations?.length ?? 0) > 0;
  const isWeekend = day.isWeekend;

  let background = T.bg1;
  if (state === 'out_of_window') {
    background = OUT_OF_WINDOW_CELL_BG;
  } else if (archived) {
    background = ARCHIVE_CELL_BG;
  } else if (noData) {
    background = T.bg2;
  } else if (isStop) {
    background = 'rgba(200,30,30,0.05)'; // Rouge léger
  } else if (isBooked) {
    background = 'rgba(6,115,179,0.06)'; // Bleu léger
  } else if (isWeekend) {
    background = T.bg2; // Gris clair
  } else if (day.isToday) {
    background = 'rgba(184,133,26,0.04)'; // Jaune/gold léger
  } else if (isDynamic) {
    background = 'rgba(124,58,237,0.04)'; // Violet très léger
  }

  return (
    <div
      style={{
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8px 4px', minHeight: 54, position: 'relative',
        fontFamily: '"Geist Mono", monospace',
        background,
        transition: 'all 0.15s',
      }}>
      {isDynamic && state === 'data' && (
        <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: T.ai }}>⚡</span>
      )}
      <span
        title={rate.hint}
        style={{
          fontSize: state === 'data' ? 13 : 12,
          fontWeight: 700,
          color: archived ? ARCHIVE_CELL_TEXT : noData ? T.text4 : isDynamic ? T.ai : T.text,
          letterSpacing: '-0.01em',
        }}
      >
        {rate.main}
      </span>
      {rate.showCurrency && (
        <span style={{ fontSize: 9, color: T.text3, fontWeight: 600, letterSpacing: '0.04em' }}>{currency}</span>
      )}
      {rate.hint && state !== 'data' && (
        <span style={{ fontSize: 7.5, color: T.text4, fontWeight: 600, marginTop: 2, textAlign: 'center', lineHeight: 1.1 }}>
          {state === 'out_of_window' ? 'hors fen.' : state === 'archive' ? 'hist.' : 'n/d'}
        </span>
      )}
    </div>
  );
}

/* ─── Collapse cell (Excel selection + tooltip + popover) ─── */
function CollapseCell({ col, day, inv, listing, selected, draggable, onMouseDown, onMouseEnter, onReservationClick }) {
  const [showTip, setShowTip] = useState(false);
  const ref = useRef(null);
  const currency = listing.currencyCode || 'EUR';

  // Détecter les états de la cellule
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const noData = state === 'out_of_window' || state === 'missing';
  const archived = state === 'archive';
  const isStopSell = hasInventoryData(inv) && !!inv.stopSell;
  const isBooked = (inv?.reservations?.length ?? 0) > 0;
  const isDynamic = hasInventoryData(inv) && !!inv.useDynamicPrice;
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
    content = rate.showCurrency
      ? <span style={{ color: inv.useDynamicPrice ? T.ai : T.text }}>{rate.main}</span>
      : <span style={{ color: T.text4 }}>{rate.main}</span>;
  } else if (col.id === 'basePrice') content = inv.basePrice ?? dash;
  else if (col.id === 'manualPrice') content = inv.manualPrice ?? dash;
  else if (col.id === 'dynamicPrice') content = inv.calculatedPrice ?? dash;
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
    content = n === 0 ? '—' : (
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

  return (
    <div ref={ref}
      onMouseDown={onMouseDown}
      onMouseEnter={() => { setShowTip(true); onMouseEnter?.(); }}
      onMouseLeave={() => setShowTip(false)}
      style={{
        borderRight: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px 4px', minHeight: 38, position: 'relative',
        fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 600,
        cursor: archived ? 'not-allowed' : draggable ? 'cell' : 'default',
        background,
        boxShadow: selected ? `inset 0 0 0 2px ${T.primary}` : 'none',
        color: selected ? T.primaryDeep : T.text,
        transition: 'background 0.1s',
      }}>
      {content}
      {col.hasTooltip && showTip && hasInventoryData(inv) && (
        <TooltipBreakdown inv={inv} dateStr={day.iso} currency={currency} />
      )}
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
