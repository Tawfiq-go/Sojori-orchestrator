// ════════════════════════════════════════════════════════════════════
// SimpleView.jsx — vue 1 listing façon Airbnb Host
// · Rail vignettes à gauche — grille 5×N (hover = nom, clic = changer de bien)
// · Mois empilés en scroll vertical (lazy-load via sentinel)
// · Réservations en barres qui s'étalent sur les jours (« Prénom + N »)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  T, toIso, ARCHIVE_CELL_BG, ARCHIVE_CELL_TEXT,
  resolveInventoryCellState, formatInventoryRateLabel, hasInventoryData, OUT_OF_WINDOW_CELL_BG,
  resolvePriceMode, priceOf, PRICE_MODE_LABEL,
} from './_shared';
import { INVENTORY_FUTURE_HORIZON_DAYS } from './inventoryCalendarConstants';
import AuditBlockedDaysModal from './AuditBlockedDaysModal';
import { TooltipBody } from './TooltipBreakdown';
import { normalizeCalendarReservations } from './reservationCalendarUtils';
import calendarService from '../../services/calendarService';

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

const RESA_BAR_COLORS = {
  Confirmed: { bg: '#3d3a33', text: '#fff' },
  Pending: { bg: 'rgba(196,101,6,0.88)', text: '#fff' },
};

function isoDate(v) {
  if (!v) return null;
  const s = String(v);
  // '2026-07-16T…' → '2026-07-16' (dates résa stockées à minuit)
  return s.length >= 10 ? s.slice(0, 10) : null;
}

export default function SimpleView({
  listing,
  listings = [],
  selectedListingId = null,
  onSelectListing,
  year,
  month,
  monthsCount = 3,
  onLoadMoreMonths,
  inventoryLoading = false,
  inventories = {},
  onCellsSelected,
  onOpenReservation,
}) {
  const todayIso = toIso(new Date());

  /** Mois empilés : [pivot, pivot+1, …] (scroll vertical façon Airbnb). */
  const months = useMemo(() => {
    const out = [];
    for (let i = 0; i < monthsCount; i++) {
      const d = new Date(year, month + i, 1);
      out.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return out;
  }, [year, month, monthsCount]);

  /** Liste ordonnée de tous les jours affichés — pour la sélection shift-range. */
  const allIsos = useMemo(() => {
    const out = [];
    months.forEach(({ year: y, month: m }) => {
      const last = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) out.push(toIso(new Date(y, m, d)));
    });
    return out;
  }, [months]);

  /* ─── Sélection multi-jours (édition prix/dispo) — clic → panneau latéral ─── */
  const [selected, setSelected] = useState([]);
  /** Dernier jour cliqué : ses détails s'affichent dans le panneau. */
  const [focusIso, setFocusIso] = useState(null);
  useEffect(() => { setSelected([]); setFocusIso(null); }, [selectedListingId]);

  const clearSelection = () => { setSelected([]); setFocusIso(null); };

  useEffect(() => {
    if (selected.length === 0) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') clearSelection(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.length]);

  const toggleDay = (iso, e) => {
    const inv = inventories[iso];
    const st = resolveInventoryCellState(iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
    if (st !== 'data') return;
    if (e.shiftKey && selected.length > 0) {
      const a = allIsos.indexOf(selected[0]);
      const b = allIsos.indexOf(iso);
      if (a >= 0 && b >= 0) {
        const [from, to] = a < b ? [a, b] : [b, a];
        setSelected(allIsos.slice(from, to + 1));
        setFocusIso(iso);
        return;
      }
    }
    setSelected(prev => {
      if (prev.includes(iso)) {
        const next = prev.filter(x => x !== iso);
        setFocusIso(next.length > 0 ? next[next.length - 1] : null);
        return next;
      }
      setFocusIso(iso);
      return [...prev, iso];
    });
  };
  const commitSelection = () => {
    if (selected.length === 0) return;
    onCellsSelected?.(selected.map(iso => ({
      listingId: listing._id, roomTypeId: listing.roomTypes?.[0]?._id, dateStr: iso, column: 'rate',
    })));
    clearSelection();
  };

  /* ─── Audit jours bloqués sans réservation ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({ loading: false, error: null, roomTypes: [] });
  const handleAuditClick = () => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [] });
  };
  useEffect(() => {
    if (!auditOpen || !auditResult.loading) return;
    let cancelled = false;
    const roomTypeId = listing.roomTypeId || listing.roomTypes?.[0]?._id || undefined;
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

  /* ─── Sentinel scroll → charger plus de mois ─── */
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !onLoadMoreMonths || inventoryLoading) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMoreMonths();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMoreMonths, monthsCount, inventoryLoading]);

  const currency = listing.currencyCode || listing.currency || 'MAD';

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'center' }}>
      {/* ─── Rail vignettes listings (façon Airbnb) ─── */}
      <ListingRail
        listings={listings}
        selectedId={selectedListingId}
        onSelect={onSelectListing}
      />

      {/* ─── Calendrier vertical — plafonné et centré (façon Airbnb) ─── */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 1150 }}>
        <div style={{
          background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}>
          {/* En-tête listing */}
          <div style={{
            padding: '7px 14px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {listing.name}
              </span>
              {listing.city ? (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text3, flexShrink: 0 }}>· {listing.city}</span>
              ) : null}
              <button
                type="button"
                title="Audit disponibilité — bloqué sans résa OU résa confirmée encore disponible (365 j.)"
                onClick={handleAuditClick}
                style={{
                  background: 'none', border: 0, padding: '0 2px', flexShrink: 0,
                  color: T.text4, fontSize: 10, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
                  opacity: 0.7, transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = T.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = T.text4; }}
              >
                ▶ audit
              </button>
            </h3>
            <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: T.text3, flexShrink: 0 }}>
              <Legend dot="#3d3a33" label="Réservé" />
              <Legend dot={T.error} label="Stop sell" />
              <Legend dot={T.ai} label="Prix dynamique" />
              {inventoryLoading && <span style={{ fontWeight: 700 }}>Chargement…</span>}
            </div>
          </div>

          {/* Jours de semaine — sticky pendant le scroll */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            position: 'sticky', top: 0, zIndex: 5,
            background: T.bg1, borderBottom: `1px solid ${T.border}`,
          }}>
            {WEEKDAYS.map((w) => (
              <span key={w} style={{
                textAlign: 'center', padding: '4px 0', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', color: T.text3,
              }}>{w}</span>
            ))}
          </div>

          {/* Mois empilés */}
          {months.map(({ year: y, month: m }) => (
            <MonthGrid
              key={`${y}-${m}`}
              year={y}
              month={m}
              inventories={inventories}
              todayIso={todayIso}
              currency={currency}
              selected={selected}
              onToggleDay={toggleDay}
              onOpenReservation={onOpenReservation}
            />
          ))}

          {/* Sentinel : approche du bas → mois suivants */}
          <div ref={sentinelRef} style={{ padding: '18px 0 26px', textAlign: 'center', fontSize: 11, color: T.text4, fontWeight: 600 }}>
            {inventoryLoading ? 'Chargement des mois suivants…' : '⌄ faire défiler pour plus de mois'}
          </div>
        </div>
      </div>

      {/* Panneau latéral façon Airbnb : détails du/des jour(s) au clic (plus de hover) */}
      {selected.length > 0 && (
        <DaySidePanel
          selected={selected}
          focusIso={focusIso || selected[selected.length - 1]}
          inventories={inventories}
          currency={currency}
          onModify={commitSelection}
          onClose={clearSelection}
        />
      )}

      <AuditBlockedDaysModal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        listingName={listing.name || 'Listing'}
        roomTypeName={listing.roomTypeName || listing.roomTypes?.[0]?.name || null}
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
          // Rouvre à la vente : dispo 1 + stop-sell levé → publié vers les canaux
          await calendarService.updateCalendar([
            { ...base, type: 'availability', availableRoom: 1 },
            { ...base, type: 'stopSell', stopSell: false },
          ]);
          setAuditResult((s) => ({ ...s, loading: true }));
        }}
      />
    </div>
  );
}

/* ════════════════ Rail vignettes ════════════════ */

const RAIL_THUMB = 48;
const RAIL_GAP = 8;
/** Blocs de 5 vignettes en horizontal, puis ligne suivante (même zone gauche). */
const RAIL_COLS = 5;

function ListingRail({ listings, selectedId, onSelect }) {
  /** Tooltip en position fixed : le rail est scrollable (overflow-y auto),
      un tooltip absolu serait clippé horizontalement. */
  const [hovered, setHovered] = useState(null); // { id, top, left }
  if (!listings || listings.length <= 0) return null;
  const railWidth = RAIL_COLS * RAIL_THUMB + (RAIL_COLS - 1) * RAIL_GAP;
  return (
    <div style={{
      position: 'sticky', top: 12, flexShrink: 0,
      // au-dessus des en-têtes sticky du calendrier (zIndex 5) pour que le tooltip ne soit jamais caché
      zIndex: 30,
      width: railWidth,
      display: 'grid',
      gridTemplateColumns: `repeat(${RAIL_COLS}, ${RAIL_THUMB}px)`,
      gap: RAIL_GAP,
      maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', overflowX: 'hidden',
      padding: '4px 2px', scrollbarWidth: 'thin',
      alignContent: 'start',
    }}>
      {listings.map((l) => {
        const id = String(l._id);
        const active = String(selectedId) === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            onMouseEnter={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHovered({ id, top: r.top + r.height / 2, left: r.right + 10 });
            }}
            onMouseLeave={() => setHovered((h) => (h?.id === id ? null : h))}
            aria-label={l.name}
            style={{
              width: RAIL_THUMB, height: RAIL_THUMB, padding: 0, borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', display: 'block',
              border: active ? `2px solid ${T.text}` : `1px solid ${T.border}`,
              boxShadow: active ? '0 0 0 2px rgba(20,17,10,0.10)' : 'none',
              opacity: active ? 1 : 0.75,
              transform: active ? 'scale(1.04)' : 'scale(1)',
              transition: 'all 0.15s',
              background: l.photoColor || T.bg3,
            }}
          >
            {l.coverImageUrl ? (
              <img
                src={l.coverImageUrl}
                alt={l.name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: l.photoColorDeep || T.text2,
              }}>
                {(l.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        );
      })}
      {/* Tooltip nom au survol — fixed pour échapper au clipping du rail scrollable */}
      {hovered && (() => {
        const l = listings.find((x) => String(x._id) === hovered.id);
        if (!l) return null;
        return (
          <div style={{
            position: 'fixed', left: hovered.left, top: hovered.top, transform: 'translateY(-50%)',
            background: T.text, color: '#fff', padding: '6px 11px', borderRadius: 9,
            fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 80,
            boxShadow: '0 6px 20px rgba(20,17,10,0.25)', pointerEvents: 'none',
          }}>
            {l.name}
            {l.city ? <span style={{ fontWeight: 500, opacity: 0.7 }}> · {l.city}</span> : null}
          </div>
        );
      })()}
    </div>
  );
}

/* ════════════════ Grille d'un mois ════════════════ */

function MonthGrid({ year, month, inventories, todayIso, currency, selected, onToggleDay, onOpenReservation }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Lun = 0
  const lastDay = new Date(year, month + 1, 0).getDate();

  /* Cellules du mois (sans padding 6×7 : le mois occupe juste ses semaines) */
  const { weeks, monthStats, monthReservations } = useMemo(() => {
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    let available = 0, booked = 0, revenue = 0;
    const resById = new Map();
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      const iso = toIso(d);
      const inv = inventories[iso];
      const cellState = resolveInventoryCellState(iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
      const rate = formatInventoryRateLabel(cellState, inv);
      if (hasInventoryData(inv)) {
        if (inv.reservations?.length > 0) { booked++; revenue += priceOf(inv); }
        else if (!inv.stopSell) available++;
        normalizeCalendarReservations(inv.reservations).forEach((r) => {
          if (r && !resById.has(String(r._id))) resById.set(String(r._id), r);
        });
      }
      cells.push({
        iso, num: day,
        isPast: iso < todayIso,
        isToday: iso === todayIso,
        cellState,
        isArchived: cellState === 'archive',
        noInventory: cellState === 'out_of_window' || cellState === 'missing',
        stopSell: hasInventoryData(inv) && !!inv.stopSell,
        booked: (inv?.reservations?.length ?? 0) > 0,
        useDynamic: hasInventoryData(inv) && resolvePriceMode(inv) === 'dynamic',
        hasManual: inv?.manualPrice != null,
        priceLabel: rate.main,
        showPriceCurrency: rate.showCurrency,
        inv,
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return {
      weeks: rows,
      monthStats: { available, booked, revenue },
      monthReservations: Array.from(resById.values()),
    };
  }, [year, month, inventories, todayIso, offset, lastDay]);

  return (
    <div>
      {/* Label mois façon Airbnb */}
      <div style={{ padding: '9px 14px 4px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.text }}>
          {MONTHS[month]}
          <span style={{ fontWeight: 600, color: T.text3, fontSize: 13, marginLeft: 6 }}>{year}</span>
        </span>
        <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>
          {monthStats.booked} nuit(s) réservée(s) · {monthStats.available} dispo
          {monthStats.revenue > 0 ? ` · ${Math.round(monthStats.revenue).toLocaleString('fr-FR')} ${currency}` : ''}
        </span>
      </div>

      {weeks.map((week, wi) => (
        <WeekRow
          key={wi}
          week={week}
          monthReservations={monthReservations}
          selected={selected}
          currency={currency}
          onToggleDay={onToggleDay}
          onOpenReservation={onOpenReservation}
        />
      ))}
    </div>
  );
}

/* ════════════════ Semaine (7 cellules + barres résa en overlay) ════════════════ */

function WeekRow({ week, monthReservations, selected, currency, onToggleDay, onOpenReservation }) {
  const dayIsos = week.map((c) => (c ? c.iso : null));
  const firstIso = dayIsos.find(Boolean);
  const lastIso = [...dayIsos].reverse().find(Boolean);

  /* Segments de barres résa sur cette semaine */
  const segments = useMemo(() => {
    if (!firstIso || !lastIso) return [];
    const out = [];
    monthReservations.forEach((res) => {
      const arr = isoDate(res.arrivalDate);
      const dep = isoDate(res.departureDate);
      if (!arr || !dep || arr > lastIso || dep < firstIso) return;
      const startIso = arr >= firstIso ? arr : firstIso;
      const endIso = dep <= lastIso ? dep : lastIso;
      const startIdx = dayIsos.indexOf(startIso);
      const endIdx = dayIsos.indexOf(endIso);
      if (startIdx < 0 || endIdx < 0) return;
      const startsHere = arr >= firstIso;   // le check-in tombe dans cette semaine
      const endsHere = dep <= lastIso;      // le check-out tombe dans cette semaine
      out.push({ res, startIdx, endIdx, startsHere, endsHere });
    });
    return out;
  }, [monthReservations, dayIsos.join(','), firstIso, lastIso]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 86 }}>
        {week.map((c, i) => (
          c ? (
            <DayCell
              key={c.iso}
              c={c}
              currency={currency}
              selected={selected.includes(c.iso)}
              onToggle={(e) => onToggleDay(c.iso, e)}
            />
          ) : (
            <div key={`pad-${i}`} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.bg2, opacity: 0.4 }} />
          )
        ))}
      </div>

      {/* Barres réservation façon Airbnb : check-in mi-cellule → check-out mi-cellule */}
      {segments.map(({ res, startIdx, endIdx, startsHere, endsHere }, si) => {
        const left = ((startIdx + (startsHere ? 0.55 : 0)) / 7) * 100;
        const right = ((endIdx + (endsHere ? 0.45 : 1)) / 7) * 100;
        const colors = RESA_BAR_COLORS[res.status] || RESA_BAR_COLORS.Confirmed;
        const guests = Number(res.numberOfGuests) || 0;
        const name = res.guestName || res.guestFirstName || 'Réservation';
        const label = guests > 1 ? `${name} + ${guests - 1}` : name;
        const showLabel = startsHere || startIdx === 0;
        return (
          <button
            key={`${res._id}-${si}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenReservation?.(res); }}
            title={`${label} · ${isoDate(res.arrivalDate)} → ${isoDate(res.departureDate)}${res.status ? ` · ${res.status}` : ''}`}
            style={{
              position: 'absolute', top: 48, height: 30,
              left: `${left}%`, width: `${Math.max(right - left, 4)}%`,
              background: colors.bg, color: colors.text,
              border: 0, cursor: 'pointer',
              borderRadius: `${startsHere ? '17px' : '0'} ${endsHere ? '17px' : '0'} ${endsHere ? '17px' : '0'} ${startsHere ? '17px' : '0'}`,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: showLabel ? '0 10px 0 5px' : 0,
              overflow: 'hidden', whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(20,17,10,0.18)', zIndex: 3,
              fontFamily: 'inherit',
            }}
          >
            {showLabel && (
              <>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.22)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {(name || '?').charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════ Cellule jour ════════════════ */

function DayCell({ c, currency, selected, onToggle }) {
  const muted = c.isPast || c.isArchived;

  return (
    <div
      onClick={onToggle}
      style={{
        borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
        padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 2,
        cursor: c.noInventory || c.isArchived ? 'default' : 'pointer',
        transition: 'background 0.15s', position: 'relative',
        background:
          c.cellState === 'out_of_window' ? OUT_OF_WINDOW_CELL_BG :
          c.isArchived ? ARCHIVE_CELL_BG :
          c.noInventory ? T.bg2 :
          selected ? T.primaryTint3 :
          c.stopSell ? 'rgba(200,30,30,0.05)' :
          'transparent',
        boxShadow: selected ? `inset 0 0 0 2px ${T.primary}` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Numéro du jour — passé = barré gris (façon Airbnb), aujourd'hui = pastille rouge */}
        {c.isToday ? (
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: '#e0243c', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 800,
          }}>{c.num}</span>
        ) : (
          <span style={{
            fontSize: 12.5, fontWeight: 700,
            color: muted ? (c.isArchived ? ARCHIVE_CELL_TEXT : T.text4) : T.text,
            textDecoration: muted ? 'line-through' : 'none',
          }}>{c.num}</span>
        )}
        <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {c.stopSell && !c.booked && (
            <span style={{ fontSize: 8.5, background: T.errorTint, color: T.error, padding: '1px 5px', borderRadius: 99, fontWeight: 800 }}>🚫</span>
          )}
          {c.useDynamic && <i style={{ width: 6, height: 6, borderRadius: '50%', background: T.ai }} />}
          {c.hasManual && <i style={{ width: 6, height: 6, borderRadius: '50%', background: T.warning }} />}
        </span>
      </div>

      {/* Prix façon Airbnb : MAD1260 sous le numéro */}
      <div
        title={c.priceHint}
        style={{
          fontFamily: '"Geist Mono", monospace', fontSize: 12.5, fontWeight: 700,
          color: c.noInventory ? T.text4 : muted ? T.text4 : c.useDynamic ? T.ai : T.text2,
          textDecoration: muted && !c.noInventory ? 'line-through' : 'none',
          letterSpacing: '-0.01em',
        }}
      >
        {c.showPriceCurrency ? <small style={{ fontSize: 9, fontWeight: 600, marginRight: 2 }}>{currency}</small> : null}
        {c.priceLabel}
      </div>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <i style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
      {label}
    </span>
  );
}

/* ════════════════ Panneau latéral jour(s) sélectionné(s) — façon Airbnb ════════════════ */

const PANEL_TABS = [
  { id: 'infos', label: 'Tarif & dispo' },
  { id: 'ai', label: '⚡ Prix dynamique' },
];

function fmtDayLabel(iso) {
  if (!iso) return '';
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch {
    return iso;
  }
}

function PanelRow({ label, value, color, strong }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '4px 0' }}>
      <span style={{ fontSize: 11.5, color: strong ? T.text : T.text2, fontWeight: strong ? 800 : 600 }}>{label}</span>
      <span style={{
        fontSize: strong ? 13 : 11.5, fontWeight: strong ? 800 : 700, textAlign: 'right',
        fontFamily: '"Geist Mono", monospace', color: color || T.text,
      }}>{value}</span>
    </div>
  );
}

function DaySidePanel({ selected, focusIso, inventories, currency, onModify, onClose }) {
  const [tab, setTab] = useState('infos');
  const sorted = useMemo(() => [...selected].sort(), [selected]);
  const inv = inventories[focusIso];
  const hasData = hasInventoryData(inv);
  const nb = selected.length;
  const mode = hasData ? resolvePriceMode(inv) : null;

  const rangeLabel = nb === 1
    ? fmtDayLabel(sorted[0])
    : `${fmtDayLabel(sorted[0])} → ${fmtDayLabel(sorted[nb - 1])}`;

  return (
    <div style={{
      position: 'fixed', right: 18, top: 120, width: 322, zIndex: 46,
      maxHeight: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column',
      background: T.bg1, border: `1px solid ${T.borderStrong || T.border}`, borderRadius: 16,
      boxShadow: '0 18px 60px rgba(20,17,10,0.22)', animation: 'fadeIn 0.15s both', overflow: 'hidden',
    }}>
      {/* En-tête */}
      <div style={{
        padding: '12px 16px 10px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, textTransform: 'capitalize' }}>{rangeLabel}</div>
          <div style={{ fontSize: 10.5, color: T.text3, fontWeight: 600, marginTop: 2 }}>
            {nb} jour(s) sélectionné(s)
            {nb > 1 ? ` · détails : ${fmtDayLabel(focusIso)}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          title="Fermer (Esc)"
          style={{
            border: 0, background: T.bg2, width: 26, height: 26, borderRadius: '50%',
            cursor: 'pointer', fontSize: 12, fontWeight: 700, color: T.text2, flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 0' }}>
        {PANEL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '7px 8px', borderRadius: 9, border: 0, cursor: 'pointer',
                fontSize: 11.5, fontWeight: 800, fontFamily: 'inherit',
                background: active ? (t.id === 'ai' ? 'rgba(124,58,237,0.10)' : T.bg3) : 'transparent',
                color: active ? (t.id === 'ai' ? T.ai : T.text) : T.text3,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Corps scrollable */}
      <div style={{ padding: '10px 16px 12px', overflowY: 'auto', flex: 1 }}>
        {!hasData ? (
          <div style={{ fontSize: 11.5, color: T.text3, fontWeight: 600, padding: '12px 0' }}>
            Pas de données inventaire pour ce jour.
          </div>
        ) : tab === 'ai' ? (
          <TooltipBody inv={inv} dateStr={focusIso} currency={currency} />
        ) : (
          <>
            <PanelRow
              strong
              label={`Prix final · ${PRICE_MODE_LABEL[mode] || mode || ''}`}
              value={`${Math.round(priceOf(inv))} ${currency}`}
              color={mode === 'manual' ? T.warning : mode === 'dynamic' ? T.ai : T.primary}
            />
            {inv.calculatedPrice != null && (
              <PanelRow label="Prix dynamique" value={`${Math.round(inv.calculatedPrice)} ${currency}`} color={mode === 'dynamic' ? T.ai : T.text3} />
            )}
            {inv.manualPrice != null && (
              <PanelRow label="Prix manuel" value={`${Math.round(inv.manualPrice)} ${currency}`} color={mode === 'manual' ? T.warning : T.text3} />
            )}
            {inv.basePrice != null && (
              <PanelRow label="Prix base" value={`${Math.round(inv.basePrice)} ${currency}`} color={T.text3} />
            )}
            <div style={{ borderTop: `1px solid ${T.border}`, margin: '6px 0' }} />
            <PanelRow
              label="Disponibilité"
              value={inv.stopSell ? '🚫 Stop sell' : `${inv.availableRoom ?? '—'} dispo`}
              color={inv.stopSell ? T.error : (inv.availableRoom ?? 1) <= 0 ? T.warning : T.success}
            />
            {(inv.reservations?.length ?? 0) > 0 && (
              <PanelRow label="Réservations" value={String(inv.reservations.length)} color={T.info} />
            )}
            <PanelRow label="Min stay arrivée" value={inv.minStay != null ? `${inv.minStay} nuit(s)` : null} />
            <PanelRow label="Max stay" value={inv.maxStay != null && Number(inv.maxStay) > 0 ? `${inv.maxStay} nuit(s)` : null} />
            <PanelRow label="Arrivée fermée" value={inv.closedArrival ? 'Oui' : null} color={T.warning} />
            <PanelRow label="Départ fermé" value={inv.closedDeparture ? 'Oui' : null} color={T.warning} />
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onModify}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 9, border: 0, cursor: 'pointer',
            background: T.text, color: '#fff', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
          }}
        >
          ✏ Modifier {nb > 1 ? `${nb} jours` : 'ce jour'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border}`, cursor: 'pointer',
            background: 'transparent', color: T.text2, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
