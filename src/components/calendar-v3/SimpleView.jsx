// ════════════════════════════════════════════════════════════════════
// SimpleView.jsx — vue 1 listing façon Airbnb Host
// · Rail vignettes à gauche — grille 5×N (hover = nom, clic = changer de bien)
// · Mois empilés en scroll vertical (lazy-load via sentinel)
// · Défaut : cellules teintées canal (Airbnb / Booking / Direct), clic pour éditer
// · « Résas » : cellules neutres + barres prénom sur la ligne (comme avant)
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
import { normalizeCalendarReservations, calendarTodayStayBadges, calendarTodayIso } from './reservationCalendarUtils';
import calendarService from '../../services/calendarService';
import {
  activateListingCalendarImportReview,
  finishListingCalendarImportReview,
  isCalendarImportReviewActive,
} from '../../services/calendarImportReviewService';
import { useArrowKeyScroll } from '../../hooks/useArrowKeyScroll';

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* Aligné sur la vue multi : corail Airbnb, bleu Booking, or brand Sojori, violet autres. */
const RESA_BAR_COLORS = {
  airbnb: { bg: '#FF5A5F', text: '#fff', label: 'Airbnb', tint: 'rgba(255,90,95,0.28)' },
  booking: { bg: '#0071C2', text: '#fff', label: 'Booking.com', tint: 'rgba(0,113,194,0.26)' },
  vrbo: { bg: '#3B82F6', text: '#fff', label: 'Vrbo', tint: 'rgba(59,130,246,0.24)' },
  expedia: { bg: '#FEC10D', text: '#1a1a1a', label: 'Expedia', tint: 'rgba(254,193,13,0.32)' },
  mews: { bg: '#0D9488', text: '#fff', label: 'Mews', tint: 'rgba(13,148,136,0.24)' },
  direct: { bg: '#b8851a', text: '#fff', label: 'Sojori', tint: 'rgba(184,133,26,0.30)' },
  pending: { bg: '#D97706', text: '#fff', label: 'En attente', tint: 'rgba(217,119,6,0.26)' },
  default: { bg: '#7C3AED', text: '#fff', label: 'Autre canal', tint: 'rgba(124,58,237,0.22)' },
};

/* Hachures grises = bloqué (même code visuel que la vue multi / Airbnb). */
const BLOCKED_HATCH_BG = 'repeating-linear-gradient(-45deg, rgba(136,135,128,0.22), rgba(136,135,128,0.22) 3px, transparent 3px, transparent 6px)';

/** Canal du jour (arrivée gagne si départ + arrivée le même jour). */
function dayReservationChannel(inv, filterRoomId) {
  const resas = normalizeCalendarReservations(inv?.reservations).filter((r) =>
    reservationMatchesRoomFilter(r, filterRoomId),
  );
  if (resas.length === 0) return null;
  let pick = resas[0];
  for (const r of resas) {
    if (String(r?.arrivalDate || '') > String(pick?.arrivalDate || '')) pick = r;
  }
  return reservationBarColors(pick);
}

function reservationBarColors(res) {
  const status = String(res?.status || '').toLowerCase();
  if (status.includes('pend')) return RESA_BAR_COLORS.pending;
  const c = String(res?.channelName || res?.channel || '').toLowerCase();
  if (c.includes('airbnb') || c.includes('air bnb')) return RESA_BAR_COLORS.airbnb;
  if (c.includes('booking')) return RESA_BAR_COLORS.booking;
  if (c.includes('vrbo') || c.includes('homeaway')) return RESA_BAR_COLORS.vrbo;
  if (c.includes('expedia')) return RESA_BAR_COLORS.expedia;
  if (c.includes('mews')) return RESA_BAR_COLORS.mews;
  if (c.includes('direct') || c.includes('sojori') || c.includes('manual')) return RESA_BAR_COLORS.direct;
  return RESA_BAR_COLORS.default;
}

function isoDate(v) {
  if (!v) return null;
  const s = String(v);
  // '2026-07-16T…' → '2026-07-16' (dates résa stockées à minuit)
  return s.length >= 10 ? s.slice(0, 10) : null;
}

export default function SimpleView({
  listing,
  dpEnabled = true,
  listings = [],
  /** Chambres physiques du roomType actif (multi) — [{ id, name, number? }] */
  rooms = [],
  selectedListingId = null,
  onSelectListing,
  /** 'listings' (Single / défaut) | 'roomTypes' (Multi Airbnb : 1 type = 1 calendrier) */
  railMode = 'listings',
  /** Multi : carte hôtel (image + capacité) au-dessus de la liste des types */
  multiHotel = null,
  year,
  month,
  monthsCount = 3,
  onLoadMoreMonths,
  inventoryLoading = false,
  inventories = {},
  calendarBlocksById = {},
  onCellsSelected,
  onOpenReservation,
  /** Libère un CalendarBlock (métadonnée + réouverture dispo) : (block, fromIso, toIso) => Promise */
  onReleaseBlock,
  onCalendarImportReviewFinished,
  onCalendarImportReviewActivated,
  /** Admin only — jamais Owner. */
  canActivateCalendarImport = false,
  /** Plein écran / hauteur contrainte : scroll interne des mois. */
  fillViewport = false,
}) {
  const todayIso = toIso(new Date());
  const monthsScrollRef = useRef(null);
  useArrowKeyScroll(monthsScrollRef, {
    horizontal: false,
    vertical: true,
    vStep: 72,
    enabled: true,
  });

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
  useEffect(() => { setSelected([]); setFocusIso(null); }, [selectedListingId, listing?.roomTypeId]);
  /** null = toutes les chambres du type ; id = filtre barre résa sur cette room */
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  useEffect(() => {
    setSelectedRoomId(null);
  }, [selectedListingId, listing?.roomTypeId]);

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
    const roomTypeId =
      listing.roomTypeId || listing.roomTypes?.[0]?._id || undefined;
    onCellsSelected?.(selected.map(iso => ({
      listingId: listing._id, roomTypeId, dateStr: iso, column: 'rate',
    })));
    clearSelection();
  };

  /* ─── Audit jours bloqués sans réservation ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({
    loading: false, error: null, roomTypes: [], postImportAudit: null,
  });
  const [finishingCalendarImport, setFinishingCalendarImport] = useState(false);
  const [publishingCalendar, setPublishingCalendar] = useState(false);
  const [activatingCalendarImport, setActivatingCalendarImport] = useState(false);
  const calendarReviewActive = isCalendarImportReviewActive(listing);
  const handleAuditClick = () => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [], postImportAudit: null });
  };
  const handleFinishCalendarImport = async () => {
    if (!listing?._id || finishingCalendarImport) return;
    setFinishingCalendarImport(true);
    console.log('[SimpleView] Terminer import — début', { listingId: String(listing._id) });
    try {
      await finishListingCalendarImportReview(String(listing._id));
      // Publication lancée côté serveur (arrière-plan) — on ferme la modal tout de suite.
      console.log('[SimpleView] Terminer import — OK, fermeture modal', { listingId: String(listing._id) });
      setAuditOpen(false);
      onCalendarImportReviewFinished?.(String(listing._id));
    } catch (err) {
      console.error('[SimpleView] Terminer import — échec', err);
      window.alert(err?.message || 'Impossible de finir l’import calendrier');
    } finally {
      setFinishingCalendarImport(false);
    }
  };
  const handlePublishCalendar = async () => {
    if (!listing?._id || publishingCalendar) return;
    setPublishingCalendar(true);
    console.log('[SimpleView] Mise à jour calendrier 365j — début', { listingId: String(listing._id) });
    try {
      await calendarService.pushInventoryToChannels(String(listing._id));
      console.log('[SimpleView] Mise à jour calendrier 365j — OK', { listingId: String(listing._id) });
      setAuditOpen(false);
    } catch (err) {
      console.error('[SimpleView] Mise à jour calendrier 365j — échec', err);
      window.alert(err?.response?.data?.message || err?.message || 'Impossible de publier le calendrier');
    } finally {
      setPublishingCalendar(false);
    }
  };
  const handleActivateCalendarImport = async () => {
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
  };
  useEffect(() => {
    if (!auditOpen || !auditResult.loading) return;
    let cancelled = false;
    const roomTypeId = listing.roomTypeId || listing.roomTypes?.[0]?._id || undefined;
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

  /* ─── Sentinel scroll → charger plus de mois (root = panneau mois) ─── */
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    const root = monthsScrollRef.current;
    if (!el || !onLoadMoreMonths || inventoryLoading) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMoreMonths();
      },
      { root: root || null, rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMoreMonths, monthsCount, inventoryLoading]);

  const currency = listing.currencyCode || listing.currency || 'MAD';
  const isRoomTypeRail = railMode === 'roomTypes';
  /** Défaut : cellules colorées canal, sans barre. Clic « Résas » = barres + cellules neutres. */
  const [showResaLine, setShowResaLine] = useState(false);
  const physicalRooms = useMemo(() => {
    if (Array.isArray(rooms) && rooms.length > 0) return rooms;
    const fromListing = listing?.rooms;
    if (Array.isArray(fromListing) && fromListing.length > 0) return fromListing;
    return [];
  }, [rooms, listing?.rooms]);
  const headerTitle = isRoomTypeRail && listing.roomTypeName
    ? listing.roomTypeName
    : listing.name;
  const headerSubtitle = isRoomTypeRail
    ? (listing.name || '')
    : (listing.city || '');

  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        alignItems: fillViewport ? 'stretch' : 'flex-start',
        justifyContent: 'center',
        height: fillViewport ? '100%' : undefined,
        minHeight: fillViewport ? 0 : undefined,
      }}
    >
      {/* ─── Rail : Multi = hôtel + types empilés ; Single = vignettes ─── */}
      {isRoomTypeRail ? (
        <MultiHotelRail
          hotel={multiHotel}
          roomTypes={listings}
          selectedId={selectedListingId}
          onSelect={onSelectListing}
        />
      ) : (
        <ListingRail
          listings={listings}
          selectedId={selectedListingId}
          onSelect={onSelectListing}
        />
      )}

      {/* ─── Calendrier vertical — scroll interne (flèches ↑↓ + plein écran) ─── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: 1150,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          height: fillViewport ? '100%' : undefined,
          maxHeight: fillViewport ? '100%' : 'calc(100dvh - 140px)',
        }}
      >
        <div style={{
          background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}>
          {/* En-tête listing / room type */}
          <div style={{
            padding: '7px 14px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            flexShrink: 0,
          }}>
            <h3 style={{
              margin: 0, fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
              color: calendarReviewActive ? '#b91c1c' : 'inherit',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {headerTitle}
              </span>
              {headerSubtitle ? (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: calendarReviewActive ? '#b91c1c' : T.text3, flexShrink: 0 }}>
                  · {headerSubtitle}
                </span>
              ) : null}
              {calendarReviewActive ? (
                <button
                  type="button"
                  title="Ouvrir l’analyse import — Oui/Non pour sortir du mode Import dans la popup"
                  onClick={handleAuditClick}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: '#fff',
                    background: '#b91c1c',
                    border: 0,
                    borderRadius: 7,
                    padding: '4px 9px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Revue import
                </button>
              ) : canActivateCalendarImport ? (
                <button
                  type="button"
                  title="Admin : passer en mode Import calendrier (sinon activé à l’import listing)"
                  disabled={activatingCalendarImport}
                  onClick={handleActivateCalendarImport}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: '#b91c1c',
                    background: 'rgba(185,28,28,0.08)',
                    border: '1px solid rgba(185,28,28,0.28)',
                    borderRadius: 7,
                    padding: '4px 9px',
                    cursor: activatingCalendarImport ? 'wait' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {activatingCalendarImport ? '…' : 'Mode Import'}
                </button>
              ) : null}
              {isRoomTypeRail ? (
                <a
                  href={`/calendar?view=multi`}
                  title="Retour vue multi"
                  style={{
                    fontSize: 10, fontWeight: 700, color: T.primary, textDecoration: 'none',
                    flexShrink: 0, opacity: 0.85,
                  }}
                >
                  ← multi
                </a>
              ) : null}
              <button
                type="button"
                title={calendarReviewActive
                  ? 'Revue calendrier post-import — overbooking, prix, jours bloqués'
                  : 'Audit disponibilité — bloqué sans résa OU résa confirmée encore disponible (365 j.)'}
                onClick={handleAuditClick}
                style={{
                  background: calendarReviewActive ? 'rgba(185,28,28,0.08)' : 'none',
                  border: calendarReviewActive ? '1px solid rgba(185,28,28,0.28)' : 0,
                  borderRadius: calendarReviewActive ? 7 : 0,
                  padding: calendarReviewActive ? '3px 8px' : '0 2px',
                  flexShrink: 0,
                  color: calendarReviewActive ? '#b91c1c' : T.text4,
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
                  opacity: calendarReviewActive ? 1 : 0.7,
                  transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!calendarReviewActive) {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = T.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!calendarReviewActive) {
                    e.currentTarget.style.opacity = '0.7';
                    e.currentTarget.style.color = T.text4;
                  }
                }}
              >
                {calendarReviewActive ? '▶ revue cal.' : '▶ audit'}
              </button>
            </h3>
            <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: T.text3, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                title={showResaLine ? 'Cellules neutres + barres résa' : 'Cellules colorées canal, sans barre — clic pour éditer'}
                onClick={() => setShowResaLine((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 800, lineHeight: 1,
                  padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
                  background: showResaLine ? T.primaryTint : 'transparent',
                  color: showResaLine ? T.primaryDeep : T.text3,
                  border: `1px solid ${showResaLine ? T.primary : T.border}`,
                  transition: 'all 0.15s',
                }}
              >
                {showResaLine ? 'Résas ✓' : 'Résas'}
              </button>
              <Legend dot={RESA_BAR_COLORS.airbnb.bg} label="Airbnb" />
              <Legend dot={RESA_BAR_COLORS.booking.bg} label="Booking" />
              <Legend dot={RESA_BAR_COLORS.direct.bg} label="Direct" />
              <Legend dot={RESA_BAR_COLORS.default.bg} label="Autre" />
              <Legend dot={BLOCKED_HATCH_BG} label="Bloqué (stop sell)" />
              {dpEnabled ? <Legend dot={T.ai} label="Prix dynamique" /> : null}
              {inventoryLoading && <span style={{ fontWeight: 700 }}>Chargement…</span>}
            </div>
          </div>

          {/* Chambres physiques du type (multi) — filtre les barres résa */}
          {physicalRooms.length > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                padding: '6px 12px',
                borderBottom: `1px solid ${T.border}`,
                background: T.bg2,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 800, color: T.text3, marginRight: 2 }}>
                Chambres
              </span>
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 99,
                  border: `1px solid ${selectedRoomId == null ? T.primary : T.border}`,
                  background: selectedRoomId == null ? T.primaryTint : T.bg1,
                  color: selectedRoomId == null ? T.primaryDeep : T.text2,
                  cursor: 'pointer',
                }}
              >
                Toutes ({physicalRooms.length})
              </button>
              {physicalRooms.map((room) => {
                const active = String(selectedRoomId) === String(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    title={room.name}
                    onClick={() => setSelectedRoomId(String(room.id))}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 99,
                      border: `1px solid ${active ? T.primary : T.border}`,
                      background: active ? T.primaryTint : T.bg1,
                      color: active ? T.primaryDeep : T.text2,
                      cursor: 'pointer',
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {room.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Jours de semaine — fixe hors scroll mois */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            flexShrink: 0,
            zIndex: 5,
            background: T.bg1, borderBottom: `1px solid ${T.border}`,
          }}>
            {WEEKDAYS.map((w) => (
              <span key={w} style={{
                textAlign: 'center', padding: '4px 0', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', color: T.text3,
              }}>{w}</span>
            ))}
          </div>

          {/* Mois empilés — scroll vertical (flèches ↑↓) */}
          <div
            ref={monthsScrollRef}
            className="calendar-simple-vscroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
          {months.map(({ year: y, month: m }) => (
            <MonthGrid
              key={`${y}-${m}`}
              year={y}
              month={m}
              inventories={inventories}
              todayIso={todayIso}
              currency={currency}
              selected={selected}
              showReservations={showResaLine}
              filterRoomId={selectedRoomId}
              rooms={physicalRooms}
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
      </div>

      {/* Panneau latéral façon Airbnb : détails du/des jour(s) au clic (plus de hover) */}
      {selected.length > 0 && (
        <DaySidePanel
          dpEnabled={dpEnabled}
          selected={selected}
          focusIso={focusIso || selected[selected.length - 1]}
          inventories={inventories}
          calendarBlocksById={calendarBlocksById}
          currency={currency}
          onModify={commitSelection}
          onClose={clearSelection}
          onReleaseBlock={onReleaseBlock}
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
            ? Math.max(1, Number(range.roomNumber ?? listing.roomNumber ?? listing.roomTypes?.[0]?.roomNumber ?? 1))
            : 1;
          // Libérer d’abord les métadonnées CalendarBlock (bandeau Import initial / blocages)
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
            console.warn('[SimpleView] release CalendarBlocks (non bloquant)', e);
          }
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
          await calendarService.updateCalendar([
            { ...base, type: 'availability', availableRoom: 0 },
            { ...base, type: 'stopSell', stopSell: false },
          ]);
          setAuditResult((s) => ({ ...s, loading: true }));
        }}
        onFixPrice={async (row) => {
          const roomTypeId = row.roomTypeId || listing.roomTypeId || listing.roomTypes?.[0]?._id;
          if (!roomTypeId) throw new Error('Room type introuvable');
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

/* ════════════════ Rail Multi : hôtel + room types empilés ════════════════ */

function formatRtCapacity(rt) {
  const units = Number(rt?.roomNumber) || 0;
  const guests = Number(rt?.personCapacityMax) || 0;
  const parts = [];
  if (units > 0) parts.push(`${units} u.`);
  if (guests > 0) parts.push(`max ${guests}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function MultiHotelRail({ hotel, roomTypes = [], selectedId, onSelect }) {
  if (!hotel && (!roomTypes || roomTypes.length === 0)) return null;

  return (
    <div
      style={{
        position: 'sticky',
        top: 12,
        flexShrink: 0,
        zIndex: 30,
        width: 292,
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: '2px 2px 8px',
      }}
    >
      {/* Image hôtel à gauche (place dispo) */}
      {hotel ? (
        <div style={{ width: 76, flexShrink: 0 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${T.border}`,
              background: `linear-gradient(135deg, ${hotel.photoColor || '#fde68a'}, ${hotel.photoColorDeep || '#d97706'})`,
              boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
            }}
            title={hotel.name}
          >
            {hotel.coverImageUrl ? (
              <img
                src={hotel.coverImageUrl}
                alt={hotel.name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  color: hotel.photoColorDeep || T.text2,
                }}
              >
                {(hotel.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 9.5,
              fontWeight: 700,
              color: T.text3,
              lineHeight: 1.25,
              textAlign: 'center',
            }}
          >
            <div>{hotel.roomTypeCount || roomTypes.length} types</div>
            {hotel.units > 0 ? <div>{hotel.units} u.</div> : null}
          </div>
        </div>
      ) : null}

      {/* Room types — empilés à droite de l’image */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          scrollbarWidth: 'thin',
        }}
      >
        {roomTypes.map((rt) => {
          const id = String(rt._id);
          const active = String(selectedId) === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect?.(id)}
              aria-label={rt.name}
              style={{
                textAlign: 'left',
                width: '100%',
                padding: '7px 9px',
                borderRadius: 10,
                cursor: 'pointer',
                border: active ? `2px solid ${T.text}` : `1px solid ${T.border}`,
                background: active ? T.bg2 : T.bg1,
                boxShadow: active ? '0 0 0 2px rgba(20,17,10,0.08)' : 'none',
                fontFamily: 'inherit',
                transition: 'border 0.12s, background 0.12s',
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: active ? 800 : 700,
                  color: T.text,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {rt.name}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, marginTop: 2 }}>
                {formatRtCapacity(rt)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════ Rail vignettes (Single) ════════════════ */

const RAIL_THUMB = 48;
const RAIL_GAP = 8;
/** Blocs de 5 vignettes en horizontal, puis ligne suivante (même zone gauche). */
const RAIL_COLS = 5;

function ListingRail({ listings, selectedId, onSelect, tooltipSecondaryLabel }) {
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
        const reviewActive = isCalendarImportReviewActive(l);
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
            aria-label={reviewActive ? `${l.name} — import calendrier à finir` : l.name}
            style={{
              width: RAIL_THUMB, height: RAIL_THUMB, padding: 0, borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', display: 'block',
              border: reviewActive
                ? '2px solid #b91c1c'
                : (active ? `2px solid ${T.text}` : `1px solid ${T.border}`),
              boxShadow: reviewActive
                ? '0 0 0 2px rgba(185,28,28,0.25)'
                : (active ? '0 0 0 2px rgba(20,17,10,0.10)' : 'none'),
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
        const secondary = tooltipSecondaryLabel === 'type'
          ? (l.city ? `hôtel · ${l.city}` : null)
          : (l.city ? l.city : null);
        return (
          <div style={{
            position: 'fixed', left: hovered.left, top: hovered.top, transform: 'translateY(-50%)',
            background: isCalendarImportReviewActive(l) ? '#b91c1c' : T.text, color: '#fff', padding: '6px 11px', borderRadius: 9,
            fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 80,
            boxShadow: '0 6px 20px rgba(20,17,10,0.25)', pointerEvents: 'none',
          }}>
            {l.name}
            {isCalendarImportReviewActive(l) ? (
              <span style={{ fontWeight: 500, opacity: 0.9 }}> · import calendrier à finir</span>
            ) : secondary ? (
              <span style={{ fontWeight: 500, opacity: 0.7 }}> · {secondary}</span>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}

/* ════════════════ Grille d'un mois ════════════════ */

function reservationMatchesRoomFilter(res, filterRoomId) {
  if (!filterRoomId) return true;
  return String(res?.roomId || '') === String(filterRoomId);
}

function MonthGrid({
  year, month, inventories, todayIso, currency, selected,
  showReservations = false, filterRoomId = null, rooms = [],
  onToggleDay, onOpenReservation,
}) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Lun = 0
  const lastDay = new Date(year, month + 1, 0).getDate();
  const roomNameById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => {
      if (r?.id) m.set(String(r.id), r.name || '');
    });
    return m;
  }, [rooms]);

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
          if (!r || !reservationMatchesRoomFilter(r, filterRoomId)) return;
          if (!resById.has(String(r._id))) resById.set(String(r._id), r);
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
        booked: normalizeCalendarReservations(inv?.reservations).some((r) =>
          reservationMatchesRoomFilter(r, filterRoomId),
        ),
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
  }, [year, month, inventories, todayIso, offset, lastDay, filterRoomId]);

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
          {filterRoomId && roomNameById.get(String(filterRoomId))
            ? ` · ${roomNameById.get(String(filterRoomId))}`
            : ''}
        </span>
      </div>

      {weeks.map((week, wi) => (
        <WeekRow
          key={wi}
          week={week}
          monthReservations={showReservations ? monthReservations : []}
          showReservations={showReservations}
          filterRoomId={filterRoomId}
          roomNameById={roomNameById}
          showRoomOnBar={!filterRoomId && roomNameById.size > 0}
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

function WeekRow({
  week, monthReservations, showReservations = false, filterRoomId = null,
  roomNameById, showRoomOnBar = false,
  selected, currency, onToggleDay, onOpenReservation,
}) {
  const dayIsos = week.map((c) => (c ? c.iso : null));
  const firstIso = dayIsos.find(Boolean);
  const lastIso = [...dayIsos].reverse().find(Boolean);

  /* Segments de barres résa sur cette semaine — jamais calculés si « Résas » est off. */
  const segments = useMemo(() => {
    if (!showReservations || !firstIso || !lastIso) return [];
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
  }, [showReservations, monthReservations, dayIsos.join(','), firstIso, lastIso]);

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
              tintChannel={!showReservations}
              filterRoomId={filterRoomId}
              onToggle={(e) => onToggleDay(c.iso, e)}
            />
          ) : (
            <div key={`pad-${i}`} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.bg2, opacity: 0.4 }} />
          )
        ))}
      </div>

      {/* Barres uniquement si « Résas » est coché — sinon cellules teintées, clic pour éditer. */}
      {showReservations && segments.map(({ res, startIdx, endIdx, startsHere, endsHere }, si) => {
        const left = ((startIdx + (startsHere ? 0.55 : 0)) / 7) * 100;
        const right = ((endIdx + (endsHere ? 0.45 : 1)) / 7) * 100;
        const colors = reservationBarColors(res);
        const guests = Number(res.numberOfGuests) || 0;
        const name = res.guestName || res.guestFirstName || 'Réservation';
        const roomLabel = showRoomOnBar
          ? (res.roomName || roomNameById?.get(String(res.roomId || '')) || '')
          : '';
        const label = [
          guests > 1 ? `${name} + ${guests - 1}` : name,
          roomLabel || null,
        ].filter(Boolean).join(' · ');
        const showLabel = startsHere || startIdx === 0;
        const channelHint = colors.label || res.channelName || '';
        const { nameCircle, departureCircle } = calendarTodayStayBadges(res, calendarTodayIso());
        const letterBg = (showLabel && nameCircle?.color)
          || (endsHere && departureCircle?.color)
          || 'rgba(255,255,255,0.22)';
        const letterTitle = nameCircle?.title || departureCircle?.title || '';
        return (
          <button
            key={`${res._id}-${si}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenReservation?.(res); }}
            title={`${label} · ${isoDate(res.arrivalDate)} → ${isoDate(res.departureDate)}${channelHint ? ` · ${channelHint}` : ''}${res.status ? ` · ${res.status}` : ''}${letterTitle ? ` · ${letterTitle}` : ''}`}
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
                <span
                  title={letterTitle || undefined}
                  style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: letterBg, color: colors.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  boxShadow: nameCircle || departureCircle ? `0 0 0 2px ${letterBg}55` : undefined,
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

function DayCell({ c, currency, selected, onToggle, tintChannel = true, filterRoomId = null }) {
  const muted = c.isPast || c.isArchived;
  const channel = tintChannel && c.booked ? dayReservationChannel(c.inv, filterRoomId) : null;

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
          channel ? channel.tint :
          c.stopSell ? BLOCKED_HATCH_BG :
          'transparent',
        boxShadow: selected
          ? `inset 0 0 0 2px ${T.primary}`
          : channel
            ? `inset 3px 0 0 ${channel.bg}`
            : 'none',
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

function DaySidePanel({ selected, focusIso, inventories, calendarBlocksById = {}, currency, onModify, onClose, onReleaseBlock, dpEnabled = true }) {
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState(null);
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
        {PANEL_TABS.filter((t) => dpEnabled || t.id !== 'ai').map((t) => {
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
            {inv.calculatedPrice != null && dpEnabled && (
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
            {(() => {
              /* Résa gagne vs Import initial / blocage : ne pas afficher le bandeau
                 de blocage si une réservation Sojori occupe déjà le jour. */
              if ((inv.reservations?.length ?? 0) > 0) return null;
              const dayBlock = inv.blockId ? calendarBlocksById[String(inv.blockId)] : null;
              if (!dayBlock) return null;
              const bFrom = String(dayBlock.dateFrom).slice(0, 10);
              const bTo = String(dayBlock.dateTo).slice(0, 10);
              const selMin = sorted[0];
              const selMax = sorted[sorted.length - 1];
              const selectionInsideBlock = selMin >= bFrom && selMax <= bTo;
              const isPartialSelection = selectionInsideBlock && (selMin !== bFrom || selMax !== bTo);
              const doRelease = async (fromIso, toIso, label) => {
                if (!onReleaseBlock || releasing) return;
                const ok = window.confirm(
                  `Libérer ${label} (${fromIso} → ${toIso}) ?\n\nLes dates seront rouvertes à la vente, OTAs incluses.`,
                );
                if (!ok) return;
                setReleasing(true);
                setReleaseError(null);
                try {
                  await onReleaseBlock(dayBlock, fromIso, toIso);
                  onClose?.();
                } catch (e) {
                  setReleaseError(e?.message || 'Échec de la libération');
                } finally {
                  setReleasing(false);
                }
              };
              const relBtnStyle = {
                width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8,
                border: `1px solid ${T.error}`, background: 'transparent', color: T.error,
                fontSize: 11.5, fontWeight: 800, cursor: releasing ? 'wait' : 'pointer',
                fontFamily: 'inherit', opacity: releasing ? 0.6 : 1,
              };
              return (
                <div style={{
                  margin: '4px 0 2px', padding: '8px 10px', borderRadius: 9,
                  background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.error, marginBottom: 2 }}>
                    🚫 {(dayBlock.type === 'import_ru' || dayBlock.type === 'import_airbnb' || dayBlock.type === 'import_booking')
                      ? 'Import initial'
                      : dayBlock.title}
                  </div>
                  {(dayBlock.type === 'import_ru' || dayBlock.type === 'import_airbnb' || dayBlock.type === 'import_booking') ? (
                    <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2 }}>
                      Réalisé par {dayBlock.createdBy?.name || '—'}
                      {dayBlock.createdAt ? ` · le ${new Date(dayBlock.createdAt).toLocaleDateString('fr-FR')}` : ''}
                    </div>
                  ) : (
                    <>
                      {dayBlock.note ? (
                        <div style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {dayBlock.note}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 10.5, color: T.text3, marginTop: 4 }}>
                        Bloqué par {dayBlock.createdBy?.name || '—'}
                        {dayBlock.createdAt ? ` · ${new Date(dayBlock.createdAt).toLocaleDateString('fr-FR')}` : ''}
                        {` · ${bFrom} → ${bTo}`}
                      </div>
                    </>
                  )}
                  {onReleaseBlock ? (
                    <>
                      {isPartialSelection ? (
                        <button
                          type="button"
                          disabled={releasing}
                          onClick={() => doRelease(selMin, selMax, `les ${sorted.length > 1 ? `${sorted.length} jours sélectionnés` : 'le jour sélectionné'}`)}
                          style={relBtnStyle}
                        >
                          🔓 Libérer la sélection ({selMin === selMax ? selMin : `${selMin} → ${selMax}`})
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={releasing}
                        onClick={() => doRelease(bFrom, bTo, 'tout le blocage')}
                        style={relBtnStyle}
                      >
                        🔓 Libérer tout le blocage
                      </button>
                      {releaseError ? (
                        <div style={{ fontSize: 10.5, color: T.error, marginTop: 4, fontWeight: 700 }}>
                          {releaseError}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            })()}
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
