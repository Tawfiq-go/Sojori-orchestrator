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
  calendarPrimaryColumns, calendarCollapseColumns, isCalendarAuditFilterOn,
} from './_shared';

/** Fonds soft — uniquement statut inventaire (jamais M/D). */
/** Couleurs par canal de résa — aligné SimpleView (Airbnb / Booking / Mews / …). */
const CHANNEL_COLORS = {
  airbnb:  { bg: 'rgba(255,90,95,0.16)',  accent: '#FF5A5F' },
  booking: { bg: 'rgba(0,113,194,0.14)',  accent: '#0071C2' },
  vrbo:    { bg: 'rgba(59,130,246,0.14)', accent: '#3B82F6' },
  expedia: { bg: 'rgba(255,201,51,0.22)', accent: '#F5C518' },
  mews:    { bg: 'rgba(13,148,136,0.16)', accent: '#0D9488' },
  sojori:  { bg: 'rgba(184,133,26,0.18)', accent: '#b8851a' },
  pending: { bg: 'rgba(245,158,11,0.18)', accent: '#F59E0B' },
  other:   { bg: 'rgba(124,58,237,0.13)', accent: '#7C3AED' },
};

const CELL_BG = {
  available: '#ffffff', // ouvert / vendable
  // hachures = bloqué (stopSell / dispo 0 / OOO)
  blocked: 'repeating-linear-gradient(-45deg, rgba(136,135,128,0.22), rgba(136,135,128,0.22) 3px, transparent 3px, transparent 6px)',
};

function isRoomHousekeepingBlocked(housekeepingState, enabled) {
  if (enabled === false) return true;
  const hk = String(housekeepingState || '');
  return hk === 'OutOfOrder' || hk === 'OutOfService';
}

function reservationChannelKind(channelName, status) {
  const st = String(status || '').toLowerCase();
  if (st.includes('pend')) return 'pending';
  const n = String(channelName || '').toLowerCase();
  if (n.includes('airbnb') || n.includes('air bnb')) return 'airbnb';
  if (n.includes('whatsapp') || n === 'wa') return 'sojori';
  if (n.includes('booking')) return 'booking';
  if (n.includes('vrbo') || n.includes('homeaway')) return 'vrbo';
  if (n.includes('expedia')) return 'expedia';
  if (n.includes('mews')) return 'mews';
  if (n.includes('sojori') || n.includes('direct') || n.includes('manual')) return 'sojori';
  return 'other';
}

/** Canal du jour — si départ + arrivée le même jour, la couleur suit la résa qui arrive. */
function dayChannelColors(inv) {
  const resas = inv?.reservations || [];
  if (resas.length === 0) return null;
  let pick = resas[0];
  for (const r of resas) {
    if (String(r?.arrivalDate || '') > String(pick?.arrivalDate || '')) pick = r;
  }
  return CHANNEL_COLORS[reservationChannelKind(pick?.channelName, pick?.status)];
}

/** Résa overlay couvre-t-elle ce jour calendaire (arrivée inclusive, départ exclusif) ? */
function dayHasRoomResa(reservations, iso) {
  if (!Array.isArray(reservations) || !iso) return false;
  return reservations.some((r) => {
    const arr = isoDay(r.arrivalDate);
    const dep = isoDay(r.departureDate);
    return Boolean(arr && dep && arr <= iso && iso < dep);
  });
}

/**
 * Fond cellule = blanc (ouvert) ou hachures (bloqué).
 * - roomType / building : stock catégorie (availableRoom 0 / stopSell)
 * - room : OOO ou résa sur CETTE unité (pas le stock du type — sinon régression
 *   « plus d’indispo visible » après suppression du fond vert réservé)
 */
function inventoryStatusBackground(state, inv, opts = {}) {
  const { roomRow = false, roomOccupied = false, roomBlocked = false } = opts;
  if (state === 'out_of_window') return OUT_OF_WINDOW_CELL_BG;
  if (state === 'archive') return ARCHIVE_CELL_BG;
  if (state === 'missing' || !hasInventoryData(inv)) return T.bg2;
  if (roomRow) {
    if (roomBlocked || roomOccupied) return CELL_BG.blocked;
    return CELL_BG.available;
  }
  const isStop = inv?.stopSell === true;
  const ar = inv?.availableRoom;
  const isZero = ar != null && Number(ar) <= 0;
  const isClosed = inv?.available === false;
  if (isStop || isZero || isClosed) return CELL_BG.blocked;
  return CELL_BG.available;
}

/** Plus d’accent canal sur la cellule — réservé aux barres / pastilles. */
function channelAccentShadow() {
  return undefined;
}

function isoDay(v) {
  return toIsoDay(v);
}

/** Index jour relatif à la fenêtre visible (peut être hors [0, n)). */
function isoOffsetInWindow(iso, days) {
  if (!days?.length || !iso) return null;
  const t0 = Date.parse(`${days[0].iso}T00:00:00`);
  const t = Date.parse(`${iso}T00:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t)) return null;
  return Math.round((t - t0) / 86400000);
}

/**
 * Overlay résas (filtre « Rés. ») :
 * barres Gantt uniquement sur lignes room (ou Single unité).
 */
function MultiResaOverlay({
  mode, // 'pastilles' | 'bars'
  days,
  cellW,
  reservations,
  inventories,
  onReservationClick,
  rowHeight,
}) {
  if (mode === 'pastilles') {
    // Pastilles en bas de ligne (dispo / tarif restent en haut) — format /planning multi
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: 3,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {days.map((d) => {
          const fromInv = inventories?.[d.iso]?.reservations || [];
          const n =
            fromInv.length > 0
              ? new Set(fromInv.map((r) => String(r._id || r.reservationId || ''))).size
              : countReservationsOnDay(reservations, d.iso);
          return (
            <div
              key={d.iso}
              style={{
                width: cellW,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              {n > 0 ? (
                <button
                  type="button"
                  title={`${n} réservation${n > 1 ? 's' : ''} le ${d.iso}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const list =
                      fromInv.length > 0
                        ? fromInv
                        : reservations.filter((r) => {
                            const arr = isoDay(r.arrivalDate);
                            const dep = isoDay(r.departureDate);
                            return arr && dep && arr <= d.iso && d.iso < dep;
                          });
                    onReservationClick?.(e.currentTarget.getBoundingClientRect(), d.iso, list);
                  }}
                  style={(() => {
                    const list =
                      fromInv.length > 0
                        ? fromInv
                        : reservations.filter((r) => {
                            const arr = isoDay(r.arrivalDate);
                            const dep = isoDay(r.departureDate);
                            return arr && dep && arr <= d.iso && d.iso < dep;
                          });
                    const ch = n === 1 ? dayChannelColors({ reservations: list }) : null;
                    return {
                      minWidth: 24,
                      height: 24,
                      padding: '0 6px',
                      borderRadius: 999,
                      border: ch
                        ? `1px solid ${ch.accent}66`
                        : '1px solid rgba(37,99,235,0.35)',
                      background: ch
                        ? ch.bg
                        : n >= 3
                          ? 'rgba(59,130,246,0.22)'
                          : 'rgba(59,130,246,0.14)',
                      color: T.text,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: ch ? `inset 3px 0 0 ${ch.accent}` : undefined,
                    };
                  })()}
                >
                  {n}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Barres Gantt (même géométrie check-in/out que /planning)
  const segments = [];
  reservations.forEach((r) => {
    const arr = isoDay(r.arrivalDate);
    const dep = isoDay(r.departureDate);
    if (!arr || !dep || !days.length) return;
    const arrIdx = isoOffsetInWindow(arr, days);
    const depIdx = isoOffsetInWindow(dep, days);
    if (arrIdx == null || depIdx == null) return;
    if (depIdx < 0 || arrIdx > days.length - 1) return;
    const startIdx = Math.max(0, arrIdx);
    const endIdx = Math.min(days.length - 1, depIdx);
    segments.push({
      r,
      startIdx,
      endIdx,
      clippedStart: arrIdx < 0,
      clippedEnd: depIdx > days.length - 1,
    });
  });

  // ~25 % d’air en haut (10 % + 15 %) pour alléger la barre vs le rectangle cellule
  const rh = rowHeight || 48;
  const barGapTop = Math.max(8, Math.round(rh * 0.25));
  const barGapBottom = 2;
  const barH = Math.max(16, rh - barGapTop - barGapBottom);
  const barTop = barGapTop;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {segments.map(({ r, startIdx, endIdx, clippedStart, clippedEnd }) => {
        const { leftPct, widthPct } = computeReservationBarLayout(
          startIdx,
          endIdx,
          days.length,
          { clippedStart, clippedEnd },
        );
        const channel = channelFromName(r.channelName);
        const ch = CHANNEL_COCKPIT[channel] || CHANNEL_COCKPIT.direct;
        const name = r.guestName || r.guestFirstName || 'Réservation';
        const nights = (() => {
          const a = Date.parse(`${isoDay(r.arrivalDate)}T00:00:00`);
          const b = Date.parse(`${isoDay(r.departureDate)}T00:00:00`);
          if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
          return Math.round((b - a) / 86400000);
        })();
        const pending = String(r.status || '').toLowerCase().includes('pend');
        // Arrivée / départ réels dans la fenêtre (pas juste clip scroll)
        const startsHere = !clippedStart;
        const endsHere = !clippedEnd;
        const pillR = Math.round(barH / 2);
        const showLabel = startsHere || startIdx === 0;
        return (
          <button
            key={String(r._id || r.reservationId)}
            type="button"
            title={`${name} · ${isoDay(r.arrivalDate)} → ${isoDay(r.departureDate)}${r.channelName ? ` · ${r.channelName}` : ''} · arrivée / départ`}
            onClick={(e) => {
              e.stopPropagation();
              onReservationClick?.(e.currentTarget.getBoundingClientRect(), isoDay(r.arrivalDate), [r]);
            }}
            style={{
              position: 'absolute',
              top: barTop,
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: barH,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: showLabel ? '0 8px 0 4px' : '0 4px',
              // Pilule : arrondi fort au check-in / check-out (comme SimpleView / Airbnb)
              borderRadius: `${startsHere ? pillR : 2}px ${endsHere ? pillR : 2}px ${endsHere ? pillR : 2}px ${startsHere ? pillR : 2}px`,
              border: `1px solid ${ch.color}66`,
              borderLeft: startsHere ? `3px solid ${ch.color}` : `1px solid ${ch.color}40`,
              borderRight: endsHere ? `3px solid ${ch.color}` : `1px solid ${ch.color}40`,
              background: ch.wash,
              color: T.text,
              fontSize: 11,
              fontWeight: 700,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              pointerEvents: 'auto',
              boxShadow: `0 1px 3px ${ch.color}28`,
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            {showLabel ? (
              <span
                title="Arrivée"
                style={{
                  width: Math.max(18, barH - 8),
                  height: Math.max(18, barH - 8),
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: ch.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0,
                }}
              >
                {(name || '?').charAt(0).toUpperCase()}
              </span>
            ) : null}
            {pending ? <span style={{ fontSize: 9, color: T.warning, flexShrink: 0 }}>⏳</span> : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
              {showLabel ? name : ''}
              {showLabel && nights != null && nights > 0 ? (
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.text3,
                    marginLeft: 4,
                  }}
                >
                  {nights}n
                </span>
              ) : null}
            </span>
            {endsHere ? (
              <span
                title="Départ"
                style={{
                  flexShrink: 0,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: ch.color,
                  boxShadow: `0 0 0 2px ${ch.wash}`,
                  marginLeft: 2,
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Barres Gantt des CalendarBlocks à l’unité (roomId) — lignes chambre Multi.
 * Wording Sojori uniquement ; blocs PMS = non cliquables (gérés par le PMS).
 */
function MultiRoomBlockOverlay({ days, blocks, rowHeight, onBlockClick }) {
  if (!Array.isArray(blocks) || blocks.length === 0 || !days?.length) return null;

  const segments = [];
  blocks.forEach((b) => {
    const from = blockIsoDay(b.dateFrom);
    const toExclusive = blockExclusiveEndIso(b.dateTo);
    if (!from || !toExclusive) return;
    const arrIdx = isoOffsetInWindow(from, days);
    const depIdx = isoOffsetInWindow(toExclusive, days);
    if (arrIdx == null || depIdx == null) return;
    if (depIdx < 0 || arrIdx > days.length - 1) return;
    segments.push({
      b,
      startIdx: Math.max(0, arrIdx),
      endIdx: Math.min(days.length - 1, depIdx),
      clippedStart: arrIdx < 0,
      clippedEnd: depIdx > days.length - 1,
    });
  });
  if (segments.length === 0) return null;

  const rh = rowHeight || 48;
  const barGapTop = Math.max(8, Math.round(rh * 0.25));
  const barGapBottom = 2;
  const barH = Math.max(16, rh - barGapTop - barGapBottom);
  const barTop = barGapTop;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {segments.map(({ b, startIdx, endIdx, clippedStart, clippedEnd }) => {
        const { leftPct, widthPct } = computeReservationBarLayout(
          startIdx,
          endIdx,
          days.length,
          { clippedStart, clippedEnd },
        );
        const title = String(b.title || 'Blocage').trim() || 'Blocage';
        const cat = inferRoomBlockCategory(title);
        const visual = roomBlockCategoryVisual(cat);
        const tip = roomBlockTooltip(b, { canRelease: Boolean(onBlockClick) });
        const startsHere = !clippedStart;
        const endsHere = !clippedEnd;
        const pillR = Math.round(barH / 2);
        const showLabel = startsHere || startIdx === 0;
        return (
          <button
            key={String(b._id)}
            type="button"
            title={tip}
            aria-label={tip}
            onClick={(e) => {
              e.stopPropagation();
              onBlockClick?.(b, e.currentTarget.getBoundingClientRect());
            }}
            style={{
              position: 'absolute',
              top: barTop,
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: barH,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: showLabel ? '0 8px 0 4px' : '0 4px',
              borderRadius: `${startsHere ? pillR : 2}px ${endsHere ? pillR : 2}px ${endsHere ? pillR : 2}px ${startsHere ? pillR : 2}px`,
              border: `1px solid ${visual.accent}66`,
              borderLeft: startsHere ? `3px solid ${visual.accent}` : `1px solid ${visual.accent}40`,
              borderRight: endsHere ? `3px solid ${visual.accent}` : `1px solid ${visual.accent}40`,
              background: visual.wash,
              color: visual.text,
              fontSize: 11,
              fontWeight: 700,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              cursor: onBlockClick ? 'pointer' : 'default',
              pointerEvents: 'auto',
              boxShadow: `0 1px 3px ${visual.accent}28`,
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            {showLabel ? (
              <span
                aria-hidden
                style={{
                  width: Math.max(18, barH - 8),
                  height: Math.max(18, barH - 8),
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: visual.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                ⊗
              </span>
            ) : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0, color: visual.text }}>
              {showLabel ? title : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
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
import {
  CHANNEL_COCKPIT,
  channelFromName,
  computeReservationBarLayout,
} from '../calendar-views/_shared';
import { countReservationsOnDay } from '../../utils/planningMultiExpand';
import {
  filterReservationsForRoom,
  filterReservationsForRoomType,
  groupMultiReservationsByListing,
  mongoId,
  resolveRoomsForRoomType,
  toIsoDay,
} from './multiCalendarReservations';
import {
  blockExclusiveEndIso,
  blockIsoDay,
  dayHasRoomBlock,
  filterBlocksForRoom,
  inferRoomBlockCategory,
  roomBlockCategoryVisual,
  roomBlockTooltip,
} from './roomBlockDisplay';

/** Métadonnées CalendarBlock par blockId — contexte pour éviter le prop drilling jusqu'aux cellules. */
const CalendarBlocksContext = React.createContext({});

const CELL_W_DESKTOP = 117; // 90 + 30%
const CELL_W_MOBILE = 99;   // 76 + 30%
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
  /** Résas srv-reservations (comme /planning) — pastilles building / barres roomType. */
  overlayReservations = [],
  calendarBlocksById = {},
  inventoryLoading = false,
  selectedColumns = [],
  onCellsSelected,
  onOpenReservation,
  onToggleDynamicPrice,
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
  /** Admin only — passer un listing en revue import (jamais Owner). */
  canActivateCalendarImport = false,
  /** Plein écran : grille occupe presque tout le viewport. */
  fillViewport = false,
  /** Admin/SuperAdmin : drag sur ligne chambre → bloquer. */
  canBlockRooms = false,
  onRoomBlockClick,
}) {
  const listings = listingCatalog.length > 0 ? listingCatalog : listingsLegacy || [];
  const { isMobile } = useCalendarBreakpoint();
  const LEFT_W = isMobile ? LEFT_W_MOBILE : LEFT_W_DESKTOP;
  const CELL_W = isMobile ? CELL_W_MOBILE : CELL_W_DESKTOP;
  const days = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const syncing = useRef(false);

  /** listingId → résas normalisées (source planning, pas inventaire). */
  const reservationsByListing = useMemo(
    () => groupMultiReservationsByListing(overlayReservations, listings),
    [overlayReservations, listings],
  );

  /* ─── Expand/collapse par listing — fermé par défaut ─── */
  const [expanded, setExpanded] = useState({});
  /** Multi only: collapse détail (min stay…) par roomType — clé `${listingId}:${rtId}` */
  const [rtExpanded, setRtExpanded] = useState({});
  const toggleListing = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const toggleRoomType = useCallback((key) => {
    setRtExpanded((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const showResaFilter = selectedColumns.includes('reservations');

  const roomTypesByListing = useMemo(() => {
    const map = {};
    listings.forEach((listing) => {
      const listingId = String(listing._id || listing.id || '');
      const inv = inventoryData[listing._id] || inventoryData[listingId] || {};
      const catalogRts = Array.isArray(listing.roomTypes) ? listing.roomTypes : [];
      const catalogById = new Map();
      const catalogByName = new Map();
      catalogRts.forEach((rt) => {
        const id = mongoId(rt?._id || rt?.id);
        const name = String(rt?.roomTypeName || rt?.name || '')
          .trim()
          .toLowerCase();
        if (id) catalogById.set(id, rt);
        if (name) catalogByName.set(name, rt);
      });
      const listingResas =
        reservationsByListing.get(listingId) ||
        reservationsByListing.get(String(listing._id)) ||
        [];

      map[listing._id] = Object.entries(inv).map(([id, v]) => {
        const rtId = mongoId(id) || String(id);
        const rtName = v?.name || `Type ${String(id).slice(-4)}`;
        const catalogRt =
          catalogById.get(rtId) ||
          catalogByName.get(String(rtName).trim().toLowerCase()) ||
          null;
        const rooms = resolveRoomsForRoomType({
          catalogRt,
          roomTypeId: rtId,
          roomTypeName: rtName,
          roomNumber: Number(v?.roomNumber) || Number(catalogRt?.roomNumber) || 0,
          reservations: listingResas,
        });
        return {
          id: rtId,
          name: rtName,
          availability: v?.availability || {},
          rooms,
        };
      });
    });
    return map;
  }, [listings, inventoryData, reservationsByListing]);

  /* Multi : ouvrir les listings hôtel pour voir types (+ rooms sous chaque type). */
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      listings.forEach((listing) => {
        const rts = roomTypesByListing[listing._id] || [];
        const isMulti =
          String(listing.propertyUnit || '') === 'Multi' && rts.length > 1;
        if (isMulti && !next[listing._id]) {
          next[listing._id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [listings, roomTypesByListing]);

  /* Multi : ouvrir les roomTypes qui ont des rooms catalogue (rooms toujours visibles). */
  useEffect(() => {
    setRtExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      listings.forEach((listing) => {
        const rts = roomTypesByListing[listing._id] || [];
        const isMulti =
          String(listing.propertyUnit || '') === 'Multi' && rts.length > 1;
        if (!isMulti || !expanded[listing._id]) return;
        rts.forEach((rt) => {
          const rooms = Array.isArray(rt.rooms) ? rt.rooms : [];
          const key = `${listing._id}:${rt.id}`;
          if (rooms.length > 0 && !next[key]) {
            next[key] = true;
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [listings, roomTypesByListing, expanded]);

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
    // Blocage chambre (ligne villa) : pas le gate inventaire building / Excel.
    if (cell?.column === 'roomBlock') {
      setActiveTip(null);
      dragMovedRef.current = false;
      dragStartPosRef.current = e ? { x: e.clientX, y: e.clientY } : null;
      if (e?.currentTarget) tipAnchorElRef.current = e.currentTarget;
      setIsDragging(true);
      setDragStart(cell);
      setCurrentHoverCell(cell);
      setSelectedCells([cell]);
      return;
    }
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
    if (
      dragStart.column === 'roomBlock' &&
      String(dragStart.roomId || '') !== String(cell.roomId || '')
    ) {
      return;
    }
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
    const onBody = () => {
      if (syncing.current) return;
      syncing.current = true;
      h.scrollLeft = b.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };
    const onHead = () => {
      if (syncing.current) return;
      // Header overflow:hidden : si pas de overflow réel, scrollLeft reste 0
      // et réécraserait body → casse le scroll hori (souvent collapse fermé).
      if (h.scrollWidth - h.clientWidth <= 1) return;
      syncing.current = true;
      b.scrollLeft = h.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };
    b.addEventListener('scroll', onBody, { passive: true });
    h.addEventListener('scroll', onHead, { passive: true });
    return () => { b.removeEventListener('scroll', onBody); h.removeEventListener('scroll', onHead); };
  }, []);

  /* ─── Molette / trackpad : axes naturels ─────────────────────────────────
   * deltaX → horizontal, deltaY → vertical (partout sur la grille).
   * Shift + molette verticale → horizontal (souris sans trackpad).
   * Avant : le vertical était remappé en horizontal sauf sur la colonne Listing,
   * ce qui bloquait le scroll listings (et le plein écran). */
  useEffect(() => {
    const body = bodyRef.current;
    const header = headerRef.current;
    const root = body?.parentElement;
    if (!body || !root) return undefined;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom navigateur
      const maxX = body.scrollWidth - body.clientWidth;
      const maxY = body.scrollHeight - body.clientHeight;
      if (maxX <= 1 && maxY <= 1) return;

      const overRoot =
        root.contains(/** @type {Node} */ (e.target)) ||
        (() => {
          const r = root.getBoundingClientRect();
          return (
            e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom
          );
        })();
      if (!overRoot) return;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      let moved = false;

      const applyH = (delta) => {
        if (!delta || maxX <= 1) return;
        const next = clamp(body.scrollLeft + delta, 0, maxX);
        if (next === body.scrollLeft) return;
        syncing.current = true;
        body.scrollLeft = next;
        if (header) header.scrollLeft = next;
        requestAnimationFrame(() => { syncing.current = false; });
        moved = true;
      };
      const applyV = (delta) => {
        if (!delta || maxY <= 1) return;
        const next = clamp(body.scrollTop + delta, 0, maxY);
        if (next === body.scrollTop) return;
        body.scrollTop = next;
        moved = true;
      };

      // Shift + molette verticale = scroll dates (souris)
      if (e.shiftKey && absY >= absX) {
        applyH(e.deltaY || e.deltaX);
      } else {
        // Trackpad : appliquer les deux axes s’ils sont présents
        if (absX > 0) applyH(e.deltaX);
        if (absY > 0) applyV(e.deltaY);
      }

      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    root.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      root.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, [LEFT_W, fillViewport, days.length, listings.length]);

  /* ─── Flèches clavier : ←→ horizontal, ↑↓ vertical ───────────────────────
   * Actives dès le chargement (pas besoin de clic cellule).
   * Ignore les vraies modales, mais PAS le plein écran calendrier (aria-modal
   * technique sur PageFullscreenLayer — sinon ←→ morts en fullscreen). */
  useEffect(() => {
    const body = bodyRef.current;
    const header = headerRef.current;
    if (!body) return undefined;

    const ROW_STEP = 44; // hauteur approx. d’une ligne listing

    const onKeyDown = (e) => {
      const isH = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      const isV = e.key === 'ArrowUp' || e.key === 'ArrowDown';
      if (!isH && !isV) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      if (
        ae &&
        (ae.tagName === 'INPUT' ||
          ae.tagName === 'TEXTAREA' ||
          ae.tagName === 'SELECT' ||
          ae.isContentEditable)
      ) return;
      // Modale VISIBLE uniquement — exclure le plein écran page (data-page-fullscreen)
      const modalOpen = [...document.querySelectorAll('[aria-modal="true"]')].some((el) => {
        if (el.getAttribute('data-page-fullscreen') === 'true') return false;
        return el.getClientRects().length > 0;
      });
      if (modalOpen) return;

      const maxX = body.scrollWidth - body.clientWidth;
      const maxY = body.scrollHeight - body.clientHeight;

      if (isH) {
        if (maxX <= 1) return;
        const step = CELL_W * (e.shiftKey ? 7 : 1);
        const next = Math.max(
          0,
          Math.min(maxX, body.scrollLeft + (e.key === 'ArrowRight' ? step : -step)),
        );
        e.preventDefault();
        if (next === body.scrollLeft) return;
        syncing.current = true;
        body.scrollLeft = next;
        if (header) header.scrollLeft = next;
        requestAnimationFrame(() => { syncing.current = false; });
        return;
      }

      // ↑ ↓ : scroll vertical listings
      if (maxY <= 1) return;
      const step = ROW_STEP * (e.shiftKey ? 5 : 1);
      const next = Math.max(
        0,
        Math.min(maxY, body.scrollTop + (e.key === 'ArrowDown' ? step : -step)),
      );
      e.preventDefault();
      if (next === body.scrollTop) return;
      body.scrollTop = next;
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [CELL_W, fillViewport, days.length, listings.length]);

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
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      userSelect: isDragging ? 'none' : 'auto',
      maxWidth: '100%',
      width: '100%',
      minWidth: 0,
      // freeze panes : header dates fixe + colonne listing sticky left dans le même scroll
      ...(fillViewport
        ? {
            height: '100%',
            // filet de secours si la chaîne flex parent n’a pas de hauteur résolue
            maxHeight: 'min(100%, calc(100dvh - 96px))',
            display: 'flex',
            flexDirection: 'column',
          }
        : {}),
    }}>
      {/* Légende des couleurs - au-dessus du header */}
      <div style={{
        padding: '4px 12px', background: T.bg0, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Légende
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: T.text2, fontWeight: 600, flexWrap: 'wrap' }}>
          <Legend dot={CHANNEL_COLORS.airbnb.accent} label="Résa Airbnb" />
          <Legend dot={CHANNEL_COLORS.booking.accent} label="Résa Booking" />
          <Legend dot={CHANNEL_COLORS.sojori.accent} label="Résa Sojori" />
          <Legend dot={CHANNEL_COLORS.other.accent} label="Autre canal" />
          <Legend dot="repeating-linear-gradient(-45deg, rgba(136,135,128,0.6), rgba(136,135,128,0.6) 2px, transparent 2px, transparent 4px)" label="Bloqué (type fermé / stop sell)" />
          <Legend dot="#fff" dotBorder label="Disponible (room vide = libre)" />
          {canBlockRooms ? (
            <Legend
              dot="rgba(184,133,26,0.35)"
              label="⊗ case villa = glisser pour bloquer la chambre"
            />
          ) : null}
          <Legend dot="#b91c1c" label="Import calendrier à finir" />
          <span style={{ color: T.text3, fontWeight: 600 }}>Lettres : M = manuel · D = dynamique</span>
          <Legend dot={ARCHIVE_CELL_BG} label="Historique (lecture seule)" />
          <Legend dot={T.text4} label="Hors inventaire (—)" />
        </div>
      </div>

      {/* Header dates fixe (hors scroll body) — sync hori via scrollLeft */}
      <div ref={headerRef} style={{
        flexShrink: 0,
        zIndex: 5,
        background: T.bg2, borderBottom: `1px solid ${T.borderStrong}`,
        overflowX: 'hidden', overflowY: 'hidden',
        minWidth: 0,
        width: '100%',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
          minWidth: 'max-content',
          width: LEFT_W + days.length * CELL_W,
        }}>
          <div style={{
            padding: '7px 12px', display: 'flex', alignItems: 'center',
            fontSize: 11, fontWeight: 700, color: T.text3,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRight: `1px solid ${T.border}`,
            position: 'sticky', left: 0, zIndex: 12,
            background: T.bg2,
            boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
          }}>Listing</div>
          {days.map(d => (
            <DayHeader key={d.iso} day={d} loading={inventoryLoading} />
          ))}
        </div>
      </div>

      {/* Body scrollable — listing sticky left + calendrier alignés sur le même scroll */}
      <div
        ref={bodyRef}
        className="calendar-multi-hscroll"
        style={{
          overflowX: 'auto',
          overflowY: fillViewport ? 'auto' : 'visible',
          flex: fillViewport ? 1 : undefined,
          minHeight: fillViewport ? 0 : undefined,
          minWidth: 0,
          width: '100%',
          position: 'relative',
          paddingBottom: 24,
          // Trackpad / molette : laisser le navigateur reconnaître les gestes 2 axes
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'contain',
        }}
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
            const listingResas =
              reservationsByListing.get(String(listing._id))
              || reservationsByListing.get(String(listing.id))
              || [];
            const buildingInventories = inventoriesByListing[listing._id] || {};
            /* Single / monotype : barres résa sur la ligne unité si filtre Rés. */
            const singleUnitResas =
              !isMultiHotel && showResaFilter ? listingResas : null;
            return (
              <div key={listing._id}>
                <ListingRow
                  listing={{
                    ...listing,
                    roomTypeCount: roomTypes.length,
                  }}
                  dpEnabled={dpEnabledByListing[String(listing._id)] !== false}
                  inventories={buildingInventories}
                  overlayLineReservations={singleUnitResas}
                  showResaBars={showResaFilter}
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
                  canActivateCalendarImport={canActivateCalendarImport}
                />
                {isOpen && isMultiHotel
                  ? roomTypes.map((rt) => {
                      const rtKey = `${listing._id}:${rt.id}`;
                      const rtOpen = !!rtExpanded[rtKey];
                      const rooms = Array.isArray(rt.rooms) ? rt.rooms : [];
                      const rtResas = filterReservationsForRoomType(listingResas, rt.id, rt.name);
                      return (
                      <React.Fragment key={`${listing._id}-${rt.id}`}>
                      <ListingRow
                        listing={{
                          ...listing,
                          _id: listing._id,
                          name: rt.name,
                          roomTypeId: rt.id,
                          roomTypeName: rt.name,
                          propertyUnit: 'Single',
                          _isRoomTypeRow: true,
                          _roomCount: rooms.length,
                          _showResaRooms: rooms.length > 0,
                        }}
                        dpEnabled={dpEnabledByListing[String(listing._id)] !== false}
                        inventories={rt.availability || {}}
                        overlayLineReservations={null}
                        showResaBars={showResaFilter}
                        days={days}
                        leftW={LEFT_W}
                        cellW={CELL_W}
                        expanded={rtOpen}
                        onToggle={() => toggleRoomType(rtKey)}
                        forceChevron={rooms.length > 0}
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
                      {/* Rooms toujours visibles sous le type (blocage / barres).
                          Chevron rtOpen = détail inventaire (min stay…), pas les villas. */}
                      {rooms.length === 0 ? (
                        <ListingRow
                          key={`${listing._id}-${rt.id}-no-rooms`}
                          listing={{
                            ...listing,
                            _id: listing._id,
                            name: 'Aucune room configurée',
                            roomTypeId: rt.id,
                            roomTypeName: rt.name,
                            propertyUnit: 'Single',
                            _isRoomTypeRow: false,
                            _isRoomRow: true,
                          }}
                          dpEnabled={false}
                          inventories={rt.availability || {}}
                          overlayLineReservations={rtResas}
                          showResaBars={showResaFilter}
                          days={days}
                          leftW={LEFT_W}
                          cellW={CELL_W}
                          expanded={false}
                          onToggle={undefined}
                          forceChevron={false}
                          hideDetailCollapse
                          selectedColumns={selectedColumns}
                          isSelected={isSelected}
                          onMouseDown={onMouseDown}
                          onMouseEnter={onMouseEnter}
                          onPriceClick={onPriceClick}
                          onReservationClick={handleReservationDayClick}
                          activeTip={activeTip}
                        />
                      ) : (
                        (() => {
                            const claimed = new Set();
                            const roomRows = rooms.map((room) => {
                              const roomResas = filterReservationsForRoom(
                                rtResas,
                                room.id,
                                room.name,
                              );
                              roomResas.forEach((r) =>
                                claimed.add(String(r._id || r.reservationId || '')),
                              );
                              return { room, roomResas };
                            });
                            const leftover = rtResas.filter(
                              (r) => !claimed.has(String(r._id || r.reservationId || '')),
                            );
                            if (leftover.length > 0) {
                              roomRows.push({
                                room: {
                                  id: `${rt.id}:unassigned`,
                                  name: 'Non assignée',
                                },
                                roomResas: leftover,
                              });
                            }
                            return roomRows.map(({ room, roomResas }) => (
                              <ListingRow
                                key={`${listing._id}-${rt.id}-room-${room.id}`}
                                listing={{
                                  ...listing,
                                  _id: listing._id,
                                  name: room.name,
                                  roomTypeId: rt.id,
                                  roomTypeName: rt.name,
                                  roomId: room.id,
                                  housekeepingState: room.housekeepingState || null,
                                  enabled: room.enabled,
                                  propertyUnit: 'Single',
                                  _isRoomTypeRow: false,
                                  _isRoomRow: true,
                                }}
                                dpEnabled={false}
                                inventories={rt.availability || {}}
                                overlayLineReservations={roomResas}
                                showResaBars={showResaFilter}
                                days={days}
                                leftW={LEFT_W}
                                cellW={CELL_W}
                                expanded={false}
                                onToggle={undefined}
                                forceChevron={false}
                                hideDetailCollapse
                                selectedColumns={selectedColumns}
                                isSelected={isSelected}
                                onMouseDown={onMouseDown}
                                onMouseEnter={onMouseEnter}
                                onPriceClick={onPriceClick}
                                onReservationClick={handleReservationDayClick}
                                activeTip={activeTip}
                                canBlockRooms={canBlockRooms}
                                onRoomBlockClick={onRoomBlockClick}
                              />
                            ));
                          })()
                      )}
                      </React.Fragment>
                    );
                    })
                  : null}
              </div>
            );
          })}
        </div>
      </div>

      {activeTip && (() => {
        const listing = listings.find((l) => String(l._id) === String(activeTip.listingId));
        if (!listing) return null;
        // RoomType : prendre l’inventaire du type, pas l’agrégat building.
        const rtId = activeTip.roomTypeId;
        const rtDay =
          rtId && rtId !== 'default'
            ? inventoryData?.[activeTip.listingId]?.[rtId]?.availability?.[activeTip.dateStr]
            : null;
        const inv = rtDay || inventoriesByListing[activeTip.listingId]?.[activeTip.dateStr];
        if (!inv || !hasInventoryData(inv)) return null;
        /* Résa gagne vs Import initial : tooltip ne montre le blocage que s’il n’y a pas de résa.
         * Bloc à roomId → affiché sur la ligne chambre, pas ici. */
        const dayBlockRaw =
          (inv?.reservations?.length ?? 0) > 0
            ? null
            : (inv?.blockId ? calendarBlocksById[String(inv.blockId)] : null);
        const dayBlock =
          dayBlockRaw && String(dayBlockRaw.roomId || '').trim() ? null : dayBlockRaw;
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
  onAuditClick,
}) {
  const isSingle = listing.propertyUnit === 'Single';
  const isRoomTypeRow = Boolean(listing._isRoomTypeRow);
  const isRoomRow = Boolean(listing._isRoomRow);
  const isMultiHotelParent = !isRoomTypeRow && !isRoomRow && Number(listing.roomTypeCount) > 1;
  const currency = listing.currencyCode || listing.currency || 'MAD';
  const dpHref = `/dynamic-pricing/bien/${listing._id}`;
  const roomTypeCount = Number(listing.roomTypeCount) || 0;
  const reviewActive = !isRoomTypeRow && !isRoomRow && isCalendarImportReviewActive(listing);
  // Fond OPAQUE obligatoire : sticky left laisse passer les cellules dates si rgba translucide
  const labelBg = reviewActive
    ? '#fef2f2'
    : isRoomRow
      ? T.bg1
      : (isRoomTypeRow ? T.bg2 : T.bg1);
  const simpleHref =
    isRoomTypeRow && listing.roomTypeId
      ? `/calendar?view=simple&listing=${encodeURIComponent(String(listing._id))}&roomType=${encodeURIComponent(String(listing.roomTypeId))}`
      : `/calendar?view=simple&listing=${encodeURIComponent(String(listing._id))}`;
  return (
    <div
      onClick={showChevron ? onToggle : undefined}
      style={{
        padding: isRoomRow
          ? '5px 12px 5px 44px'
          : isRoomTypeRow
            ? '6px 12px 6px 28px'
            : '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: labelBg,
        borderRight: `1px solid ${T.border}`,
        cursor: showChevron ? 'pointer' : 'default',
        transition: 'background 0.15s',
        position: 'sticky',
        left: 0,
        zIndex: 12,
        boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
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
      {!isRoomTypeRow && !isRoomRow && (
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
        {isRoomRow ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: T.text2,
              minWidth: 0,
            }}
            title={
              listing.housekeepingState
                ? `${listing.name} · ${listing.housekeepingState}`
                : listing.name
            }
          >
            {listing.housekeepingState ? (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 8.5,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  padding: '1px 4px',
                  borderRadius: 4,
                  lineHeight: 1.2,
                  background:
                    listing.housekeepingState === 'Clean'
                      ? '#ecfdf5'
                      : listing.housekeepingState === 'Dirty'
                        ? '#fff7ed'
                        : listing.housekeepingState === 'Inspected'
                          ? '#eff6ff'
                          : listing.housekeepingState === 'OutOfOrder'
                            ? '#fef2f2'
                            : listing.housekeepingState === 'OutOfService'
                              ? '#f3f4f6'
                              : '#f8fafc',
                  color:
                    listing.housekeepingState === 'Clean'
                      ? '#047857'
                      : listing.housekeepingState === 'Dirty'
                        ? '#c2410c'
                        : listing.housekeepingState === 'Inspected'
                          ? '#1d4ed8'
                          : listing.housekeepingState === 'OutOfOrder'
                            ? '#b91c1c'
                            : listing.housekeepingState === 'OutOfService'
                              ? '#4b5563'
                              : '#475569',
                  border: '1px solid',
                  borderColor:
                    listing.housekeepingState === 'Clean'
                      ? '#a7f3d0'
                      : listing.housekeepingState === 'Dirty'
                        ? '#fed7aa'
                        : listing.housekeepingState === 'Inspected'
                          ? '#bfdbfe'
                          : listing.housekeepingState === 'OutOfOrder'
                            ? '#fecaca'
                            : listing.housekeepingState === 'OutOfService'
                              ? '#d1d5db'
                              : '#e2e8f0',
                }}
              >
                {listing.housekeepingState === 'OutOfOrder'
                  ? 'OOO'
                  : listing.housekeepingState === 'OutOfService'
                    ? 'OOS'
                    : String(listing.housekeepingState).slice(0, 9)}
              </span>
            ) : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.name}</span>
          </span>
        ) : (
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
        )}
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
            {/* Building multi : pas de prix (tarif = roomType). RoomType / Single : Moy. */}
            {avgPrice > 0 && !isMultiHotelParent ? (
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
              </span>
            ) : isMultiHotelParent ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>
                {roomTypeCount} types — dispo somme · tarif ▶ type
              </span>
            ) : isRoomRow ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>Barres résas</span>
            ) : isSingle && !isRoomTypeRow ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>Dispo · tarif</span>
            ) : isRoomTypeRow ? (
              <span style={{ fontSize: 9.5, color: T.text4 }}>
                {listing._showResaRooms
                  ? `Dispo · ${listing._roomCount || 0} room${(listing._roomCount || 0) > 1 ? 's' : ''} ↓`
                  : 'Dispo · tarif · ▶ Min stay'}
              </span>
            ) : null}
            {!isRoomTypeRow && onAuditClick ? (
              <button
                type="button"
                title="Audit calendrier — overbooking, disponibilités, prix min/max"
                onClick={(e) => {
                  e.stopPropagation();
                  onAuditClick();
                }}
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#fff',
                  background: T.primaryDeep || '#92400e',
                  border: 0,
                  borderRadius: 6,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  lineHeight: 1.3,
                }}
              >
                Audit
              </button>
            ) : null}
            {!isRoomTypeRow && onActivateCalendarImport ? (
              <button
                type="button"
                title="Admin : passer en mode Import (sinon activé à l’import listing)"
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
      {!isRoomTypeRow && !isRoomRow && (
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
  listing, inventories, overlayLineReservations = null, showResaBars = true, days, leftW: LEFT_W, cellW: CELL_W, expanded, onToggle, selectedColumns, isSelected, onMouseDown, onMouseEnter, onPriceClick, onReservationClick, activeTip,
  onToggleDynamicPrice, dpEnabled = true, forceChevron = false, hideDetailCollapse = false,
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
  canActivateCalendarImport = false,
  canBlockRooms = false,
  onRoomBlockClick,
}) {
  const primaryCols = calendarPrimaryColumns(selectedColumns);
  const collapseColumns = calendarCollapseColumns(selectedColumns).filter((colId) => {
    // Pilote OFF sur ce bien → pas de lignes Prix dyn. / Mode (comme la modal sélection)
    if (!dpEnabled && (colId === 'dynamicPrice' || colId === 'priceMode')) return false;
    return true;
  });
  const isRoomTypeRow = Boolean(listing._isRoomTypeRow);
  const isRoomRow = Boolean(listing._isRoomRow);
  // Multi roomType rows: chevron pour min stay / détail ; rooms = pas de chevron
  const showChevron =
    !isRoomRow &&
    (forceChevron ||
      (!isRoomTypeRow && !hideDetailCollapse && collapseColumns.length > 0) ||
      (isRoomTypeRow && collapseColumns.length > 0));
  const showDispo = primaryCols.includes('availableRoom');
  const showRate = primaryCols.includes('rate');
  const getInv = (dateStr) => inventories[dateStr];

  /* ─── Audit jours bloqués sans réservation — modal résultat en tableau ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({
    loading: false, error: null, roomTypes: [], postImportAudit: null,
  });
  const [finishingCalendarImport, setFinishingCalendarImport] = useState(false);
  const [publishingCalendar, setPublishingCalendar] = useState(false);
  const [activatingCalendarImport, setActivatingCalendarImport] = useState(false);
  const calendarReviewActive = !isRoomTypeRow && isCalendarImportReviewActive(listing);

  const handleAuditClick = useCallback(() => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [], postImportAudit: null });
  }, []);

  const handleFinishCalendarImport = useCallback(async () => {
    if (!listing?._id || finishingCalendarImport) return;
    setFinishingCalendarImport(true);
    console.log('[MultiView] Terminer import — début', { listingId: String(listing._id) });
    try {
      await finishListingCalendarImportReview(String(listing._id));
      // Publication lancée côté serveur (arrière-plan) — on ferme la modal tout de suite.
      console.log('[MultiView] Terminer import — OK, fermeture modal', { listingId: String(listing._id) });
      setAuditOpen(false);
      onCalendarImportReviewFinished?.(String(listing._id));
    } catch (err) {
      console.error('[MultiView] Terminer import — échec', err);
      window.alert(err?.message || 'Impossible de finir l’import calendrier');
    } finally {
      setFinishingCalendarImport(false);
    }
  }, [listing?._id, finishingCalendarImport, onCalendarImportReviewFinished]);

  const handlePublishCalendar = useCallback(async () => {
    if (!listing?._id || publishingCalendar) return;
    setPublishingCalendar(true);
    console.log('[MultiView] Mise à jour calendrier 365j — début', { listingId: String(listing._id) });
    try {
      await calendarService.pushInventoryToChannels(String(listing._id));
      console.log('[MultiView] Mise à jour calendrier 365j — OK', { listingId: String(listing._id) });
      setAuditOpen(false);
    } catch (err) {
      console.error('[MultiView] Mise à jour calendrier 365j — échec', err);
      window.alert(err?.response?.data?.message || err?.message || 'Impossible de publier le calendrier');
    } finally {
      setPublishingCalendar(false);
    }
  }, [listing?._id, publishingCalendar]);

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

  /**
   * Calendrier Multi = dispo (building / roomType).
   * Rooms : toujours listées ; fond = dispo/réservé/bloqué ; barres = filtre Rés. only.
   */
  const isMultiHotelParent = hideDetailCollapse && !isRoomTypeRow && !isRoomRow;
  const statusReservations = useMemo(() => {
    if (isMultiHotelParent || isRoomTypeRow) return [];
    return Array.isArray(overlayLineReservations) ? overlayLineReservations : [];
  }, [overlayLineReservations, isMultiHotelParent, isRoomTypeRow]);
  const lineReservations = showResaBars ? statusReservations : [];
  const roomHkBlocked =
    isRoomRow &&
    isRoomHousekeepingBlocked(listing.housekeepingState, listing.enabled);
  const blocksByIdForRow = useContext(CalendarBlocksContext);
  const roomBlocks = useMemo(() => {
    if (!isRoomRow || !listing.roomId) return [];
    return filterBlocksForRoom(blocksByIdForRow, listing.roomId);
  }, [isRoomRow, listing.roomId, blocksByIdForRow]);
  // Rooms : barre résa quasi pleine hauteur
  const resaOverlayMode =
    isRoomRow || lineReservations.length > 0 ? (lineReservations.length > 0 ? 'bars' : 'none') : 'none';
  const primaryRowH = isRoomRow || resaOverlayMode === 'bars' ? 48 : 32;

  return (
    <div>
      {/* Ligne principale — inventaire + overlay résas (planning) */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${LEFT_W}px repeat(${days.length}, ${CELL_W}px)`,
          borderBottom: `1px solid ${T.border}`,
          minHeight: primaryRowH,
        }}>
          <ListingLabel
            listing={listing}
            expanded={expanded}
            showChevron={showChevron}
            onToggle={onToggle}
            avgPrice={avgPrice}
            dpEnabled={dpEnabled}
            onFinishCalendarImport={
              !isRoomTypeRow && !isRoomRow && isCalendarImportReviewActive(listing)
                ? handleAuditClick
                : undefined
            }
            finishingCalendarImport={false}
            onAuditClick={
              !isRoomTypeRow &&
              !isRoomRow &&
              !isCalendarImportReviewActive(listing) &&
              isCalendarAuditFilterOn(selectedColumns)
                ? handleAuditClick
                : undefined
            }
            onActivateCalendarImport={
              canActivateCalendarImport &&
              !isRoomTypeRow &&
              !isRoomRow &&
              !isCalendarImportReviewActive(listing)
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
            const roomDayBusy =
              isRoomRow &&
              (dayHasRoomResa(statusReservations, d.iso) ||
                dayHasRoomBlock(roomBlocks, d.iso) ||
                roomHkBlocked);
            const roomBlockSelectable =
              canBlockRooms &&
              isRoomRow &&
              Boolean(listing.roomId) &&
              !String(listing.roomId).includes(':') &&
              !roomDayBusy;
            const draggable = isRoomRow
              ? roomBlockSelectable
              : cellState === 'data';
            const roomOccupied = isRoomRow && dayHasRoomResa(statusReservations, d.iso);
            const roomDayBlocked =
              roomHkBlocked || (isRoomRow && dayHasRoomBlock(roomBlocks, d.iso));
            const roomBlockMeta = roomBlockSelectable
              ? {
                  listingId: listing._id,
                  roomTypeId,
                  dateStr: d.iso,
                  column: 'roomBlock',
                  roomId: listing.roomId,
                  roomName: listing.name,
                }
              : null;
            return (
              <PrimaryInventoryCell
                key={d.iso}
                day={d}
                inv={inv}
                listing={listing}
                showRate={isRoomRow ? false : showRate}
                showDispo={isRoomRow ? false : showDispo}
                rowHeight={primaryRowH}
                isSelected={isSelected}
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                onPriceClick={onPriceClick}
                listingId={listing._id}
                roomTypeId={roomTypeId}
                draggable={draggable}
                dpEnabled={dpEnabled}
                roomOccupied={roomOccupied}
                roomBlocked={roomDayBlocked}
                roomBlockMeta={roomBlockMeta}
                tipOpen={
                  activeTip?.listingId === listing._id &&
                  activeTip?.dateStr === d.iso &&
                  activeTip?.column === 'rate' &&
                  String(activeTip?.roomTypeId || 'default') === String(roomTypeId)
                }
              />
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: LEFT_W,
            top: 0,
            right: 0,
            height: primaryRowH,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {roomBlocks.length > 0 ? (
            <MultiRoomBlockOverlay
              days={days}
              blocks={roomBlocks}
              rowHeight={primaryRowH}
              onBlockClick={
                canBlockRooms
                  ? (b) => onRoomBlockClick?.(b, { roomId: listing.roomId, roomName: listing.name })
                  : undefined
              }
            />
          ) : null}
          {resaOverlayMode === 'bars' ? (
            <MultiResaOverlay
              mode="bars"
              days={days}
              cellW={CELL_W}
              reservations={lineReservations}
              inventories={inventories}
              onReservationClick={onReservationClick}
              rowHeight={primaryRowH}
            />
          ) : null}
        </div>
      </div>

      {/* Lignes sélection Excel — collapse (colonnes hors ligne principale).
          Multi hôtel parent: hideDetailCollapse → détail sur chaque roomType.
          Rooms : jamais de collapse. */}
      {expanded && !hideDetailCollapse && !isRoomRow && collapseColumns.map(colId => {
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
              position: 'sticky', left: 0, zIndex: 11,
              background: T.bg2,
              boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
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
        onPublishCalendar={!calendarReviewActive ? handlePublishCalendar : undefined}
        publishingCalendar={publishingCalendar}
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
          // Libérer d’abord les métadonnées CalendarBlock (bandeau « Import initial », etc.)
          try {
            const blocks = await calendarService.getCalendarBlocks(
              [String(listing._id)],
              range.from,
              range.to,
              'active',
            );
            await Promise.all(
              (blocks || [])
                .filter((b) => String(b.roomTypeId) === String(roomTypeId))
                .map((b) =>
                  calendarService.releaseCalendarBlock(String(b._id), {
                    dateFrom: range.from,
                    dateTo: range.to,
                  }),
                ),
            );
          } catch (e) {
            console.warn('[MultiView] release CalendarBlocks (non bloquant)', e);
          }
          // En revue import, le backend conserve la correction localement (pas de push canal).
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
    const isImport =
      block.type === 'import_ru' || block.type === 'import_airbnb' || block.type === 'import_booking';
    if (isImport) {
      const who = block.createdBy?.name || '—';
      const when = block.createdAt
        ? new Date(block.createdAt).toLocaleDateString('fr-FR')
        : '';
      return {
        kind: 'block',
        color: 'rgba(220,38,38,0.9)',
        title: 'Import initial',
        label: when
          ? `Import initial · réalisé par ${who} · le ${when}`
          : `Import initial · réalisé par ${who}`,
      };
    }
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

/* ─── Ligne principale : building = dispo/résas (pas de prix) · roomType = tarif + dispo ─── */
function PrimaryInventoryCell({
  day, inv, listing, showRate, showDispo, rowHeight = 32,
  isSelected, onMouseDown, onMouseEnter, onPriceClick,
  listingId, roomTypeId, draggable, tipOpen, dpEnabled = true,
  roomOccupied = false,
  roomBlocked = false,
  roomBlockMeta = null,
}) {
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';
  const isRoomTypeRow = Boolean(listing._isRoomTypeRow);
  const isRoomRow = Boolean(listing._isRoomRow);
  const isMultiHotelParent =
    listing.propertyUnit === 'Multi' && !isRoomTypeRow && !isRoomRow;
  // Room : pas de tarif / chiffre dispo — fond hérité du type (bloqué vs libre).
  // Building : jamais de tarif. RoomType / Single : tarif si filtre Tarif.
  const effectiveShowRate = Boolean(showRate) && !isMultiHotelParent && !isRoomRow;
  // Dispo sur building (somme) + roomType ; Single classique : aussi si filtre Dispo.
  const showDispoNumber =
    Boolean(showDispo) &&
    !isRoomRow &&
    (isMultiHotelParent || isRoomTypeRow || listing.propertyUnit === 'Single');
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const rate = formatInventoryRateLabel(state, inv);
  const archived = state === 'archive';
  const noData = state === 'out_of_window' || state === 'missing';
  const mode = resolvePriceMode(inv);
  const modeLetter = mode === 'dynamic' ? 'D' : mode === 'manual' ? 'M' : null;
  const canInteract = draggable && !archived;
  const canPriceClick = canInteract && effectiveShowRate && hasInventoryData(inv) && !noData;

  const blocksById = useContext(CalendarBlocksContext);
  const dayBlockRaw = inv?.blockId ? blocksById[String(inv.blockId)] : null;
  // Room : pas de tooltip « bloqué canal » du type (évite bruit) ; fond suffit.
  // Bloc à l’unité → barre chambre uniquement (pas le bandeau roomType).
  const dayBlock =
    dayBlockRaw && String(dayBlockRaw.roomId || '').trim() ? null : dayBlockRaw;
  const blockInfo = !isRoomRow && state === 'data' ? blockedNoResaInfo(inv, dayBlock) : null;
  const background = inventoryStatusBackground(state, inv, {
    roomRow: isRoomRow,
    roomOccupied: Boolean(roomOccupied),
    roomBlocked: Boolean(roomBlocked),
  });
  const accentShadow = channelAccentShadow(state, inv);
  // Inventaire en haut, place libre en bas (barres roomType OU pastilles building)
  const stackForBars = rowHeight >= 38;

  const dash = '—';
  const dispoVal = inv?.stopSell ? '🚫' : (inv?.availableRoom != null ? inv.availableRoom : dash);
  const dispoColor = inv?.stopSell || blockInfo ? 'rgba(220,38,38,0.95)' : T.text2;

  const rateMeta = { listingId, roomTypeId, dateStr: day.iso, column: 'rate' };
  const dispoMeta = { listingId, roomTypeId, dateStr: day.iso, column: 'availableRoom' };
  const excelMeta = effectiveShowRate ? rateMeta : dispoMeta;
  const excelSelected = isSelected?.(excelMeta);
  const roomBlockSelected = roomBlockMeta ? isSelected?.(roomBlockMeta) : false;
  const anySelected = excelSelected
    || isSelected?.(effectiveShowRate ? dispoMeta : rateMeta)
    || roomBlockSelected;

  const bindExcel = (meta) => ({
    onMouseDown: canInteract ? (e) => { e.stopPropagation(); onMouseDown?.(meta, e); } : undefined,
    onMouseEnter: canInteract ? () => onMouseEnter?.(meta) : undefined,
  });

  const roomBlockBind =
    isRoomRow && roomBlockMeta && canInteract
      ? {
          onMouseDown: (e) => {
            e.stopPropagation();
            onMouseDown?.(roomBlockMeta, e);
          },
          onMouseEnter: () => onMouseEnter?.(roomBlockMeta),
          title: 'Glisser (ou cliquer) pour bloquer cette chambre',
        }
      : {};

  const hasExcelZone = effectiveShowRate || showDispoNumber;
  const hasPriceZone = effectiveShowRate;

  return (
    <div
      ref={ref}
      {...roomBlockBind}
      style={{
        borderRight: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: stackForBars ? 'column' : 'row',
        alignItems: 'stretch',
        justifyContent: stackForBars ? 'flex-start' : 'stretch',
        padding: stackForBars ? '1px 2px 0' : '2px 2px',
        minHeight: rowHeight,
        height: '100%',
        position: 'relative',
        fontFamily: '"Geist Mono", monospace',
        background: anySelected
          ? T.primaryTint3
          : roomBlockMeta
            ? 'rgba(184,133,26,0.08)'
            : background,
        boxShadow: anySelected
          ? `inset 0 0 0 2px ${T.primary}`
          : roomBlockMeta
            ? `inset 0 0 0 1.5px rgba(184,133,26,0.55)`
            : accentShadow,
        userSelect: 'none',
        cursor: roomBlockBind.title ? 'cell' : undefined,
        gap: stackForBars ? 0 : 2,
      }}
    >
      {roomBlockMeta && !anySelected ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: 'rgba(184,133,26,0.45)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          ⊗
        </span>
      ) : null}

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
            gap: 4,
            minHeight: 26,
            borderRadius: 4,
            cursor: archived ? 'not-allowed' : canInteract ? 'cell' : 'default',
            boxShadow: excelSelected ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: excelSelected ? T.primaryTint3 : 'transparent',
          }}
        >
          {showDispoNumber && (
            <span style={{ fontSize: 11, fontWeight: 700, color: dispoColor, whiteSpace: 'nowrap' }}>
              {dispoVal}
            </span>
          )}
        </div>
      )}

      {hasPriceZone && (
        <div
          onClick={canPriceClick ? (e) => onPriceClick?.(rateMeta, e) : undefined}
          style={{
            flex: stackForBars ? '0 0 auto' : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            minWidth: 0,
            minHeight: stackForBars ? 14 : 26,
            borderRadius: 4,
            cursor: canPriceClick ? 'pointer' : archived ? 'not-allowed' : 'default',
            boxShadow: tipOpen ? `inset 0 0 0 2px ${T.primary}` : 'none',
            background: tipOpen ? T.primaryTint : 'transparent',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: stackForBars ? 10 : state === 'data' ? 12 : 11,
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

      {/* Place réservée aux barres Gantt (overlay) */}
      {stackForBars ? <div style={{ flex: 1, minHeight: 22 }} /> : null}
    </div>
  );
}

/* ─── Collapse cell — tarif : + Excel · prix clic ; autres : cellule Excel ─── */
function CollapseCell({ col, day, inv, listing, selected, draggable, onMouseDown, onMouseEnter, onReservationClick, tipOpen, onPriceClick, onToggleDynamicPrice, dpEnabled = true }) {
  const blocksById = useContext(CalendarBlocksContext);
  const dayBlockRaw = inv?.blockId ? blocksById[String(inv.blockId)] : null;
  const dayBlock =
    dayBlockRaw && String(dayBlockRaw.roomId || '').trim() ? null : dayBlockRaw;
  const ref = useRef(null);
  const currency = listing.currencyCode || listing.currency || 'MAD';

  // Détecter les états de la cellule
  const state = resolveInventoryCellState(day.iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
  const noData = state === 'out_of_window' || state === 'missing';
  const archived = state === 'archive';
  // Fond = uniquement canal résa / dispo / bloqué (jamais M/D)
  let background = inventoryStatusBackground(state, inv);
  const accentShadow = selected ? undefined : channelAccentShadow(state, inv);
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
    const chan = dayChannelColors(inv);
    const resaBadgeStyle = {
      fontSize: 10, fontWeight: 700, color: '#fff',
      background: chan?.accent || T.primaryDeep, padding: '1px 6px', borderRadius: 99,
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
          boxShadow: accentShadow,
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
        boxShadow: selected || tipOpen ? `inset 0 0 0 2px ${T.primary}` : (accentShadow || 'none'),
        color: selected ? T.primaryDeep : T.text,
        transition: 'background 0.1s',
      }}>
      {content}
    </div>
  );
}

/* ─── Legend item (dot + label) ─── */
function Legend({ dot, label, dotBorder }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <i style={{
        width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0,
        border: dotBorder ? `1px solid ${T.borderStrong}` : 'none',
      }} />
      {label}
    </span>
  );
}
