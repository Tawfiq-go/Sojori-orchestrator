// ════════════════════════════════════════════════════════════════════
// SimpleView.jsx — vue 1 listing, grille mensuelle 7×N
// Inspiration Airbnb Host · stat cards en haut · cellules riches
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  T, priceOf, toIso, ARCHIVE_CELL_BG, ARCHIVE_CELL_TEXT,
  resolveInventoryCellState, formatInventoryRateLabel, hasInventoryData, OUT_OF_WINDOW_CELL_BG,
} from './_shared';
import { INVENTORY_FUTURE_HORIZON_DAYS } from './inventoryCalendarConstants';
import PopoverReservations from './PopoverReservations';
import AuditBlockedDaysModal from './AuditBlockedDaysModal';
import { normalizeCalendarReservations } from './reservationCalendarUtils';
import calendarService from '../../services/calendarService';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function SimpleView({ listing, year, month, inventories = {}, onCellsSelected, onOpenReservation }) {
  const first = useMemo(() => new Date(year, month, 1), [year, month]);
  const offset = (first.getDay() + 6) % 7;     // Mon = 0
  const lastDay = new Date(year, month + 1, 0).getDate();
  /** Grille 6×7 = taille visuelle stable quel que soit le mois */
  const totalCells = 42;
  const todayIso = toIso(new Date());

  /* ─── Stats du mois ─── */
  const stats = useMemo(() => {
    let available = 0, booked = 0, stop = 0, revenue = 0, dynamicWin = 0;
    for (let day = 1; day <= lastDay; day++) {
      const iso = toIso(new Date(year, month, day));
      const inv = inventories[iso];
      if (!hasInventoryData(inv)) continue;
      if (inv.stopSell) stop++;
      else if (inv.reservations?.length > 0) { booked++; revenue += priceOf(inv); }
      else available++;
      if (inv.useDynamicPrice && inv.calculatedPrice && inv.basePrice) {
        dynamicWin += Math.max(0, inv.calculatedPrice - inv.basePrice);
      }
    }
    return { available, booked, stop, revenue, dynamicWin };
  }, [inventories, year, month, lastDay]);

  /* ─── Sélection multi-jours ─── */
  const [selected, setSelected] = useState([]);
  const [popover, setPopover] = useState(null);

  /* ─── Audit jours bloqués sans réservation — modal résultat en tableau ─── */
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState({ loading: false, error: null, roomTypes: [] });

  const handleAuditClick = () => {
    setAuditOpen(true);
    setAuditResult({ loading: true, error: null, roomTypes: [] });
  };

  React.useEffect(() => {
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

  const toggleDay = (iso, e) => {
    const inv = inventories[iso];
    const st = resolveInventoryCellState(iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
    if (st !== 'data') return;
    if (e.shiftKey && selected.length > 0) {
      const isos = [];
      for (let d = 1; d <= lastDay; d++) isos.push(toIso(new Date(year, month, d)));
      const a = isos.indexOf(selected[0]);
      const b = isos.indexOf(iso);
      if (a >= 0 && b >= 0) {
        const [from, to] = a < b ? [a, b] : [b, a];
        setSelected(isos.slice(from, to + 1));
        return;
      }
    }
    setSelected(prev => prev.includes(iso) ? prev.filter(x => x !== iso) : [...prev, iso]);
  };
  const commitSelection = () => {
    if (selected.length === 0) return;
    onCellsSelected?.(selected.map(iso => ({
      listingId: listing._id, roomTypeId: listing.roomTypes?.[0]?._id, dateStr: iso, column: 'rate',
    })));
    setSelected([]);
  };

  const handleReservationClick = (rect, dateStr, rawReservations) => {
    const reservations = normalizeCalendarReservations(rawReservations);
    if (reservations.length === 0) return;
    if (reservations.length === 1) {
      onOpenReservation?.(reservations[0]);
      return;
    }
    setPopover({ rect, dateStr, reservations });
  };

  /* ─── Render ─── */
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    const inMonth = dayNum >= 1 && dayNum <= lastDay;
    if (!inMonth) { cells.push({ inMonth: false, key: `e${i}` }); continue; }
    const d = new Date(year, month, dayNum);
    const iso = toIso(d);
    const inv = inventories[iso];
    const cellState = resolveInventoryCellState(iso, inv, { futureHorizonDays: INVENTORY_FUTURE_HORIZON_DAYS });
    const rate = formatInventoryRateLabel(cellState, inv);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    cells.push({
      inMonth: true, key: iso, num: dayNum, iso,
      isToday: iso === todayIso, isWeekend,
      cellState,
      isArchived: cellState === 'archive',
      noInventory: cellState === 'out_of_window' || cellState === 'missing',
      stopSell: hasInventoryData(inv) && !!inv.stopSell,
      booked: (inv?.reservations?.length ?? 0) > 0,
      reservations: inv?.reservations || [],
      useDynamic: hasInventoryData(inv) && !!inv.useDynamicPrice,
      hasManual: inv?.manualPrice != null,
      priceLabel: rate.main,
      showPriceCurrency: rate.showCurrency,
      priceHint: rate.hint,
      basePrice: inv?.basePrice,
      available: inv?.availableRoom ?? 1,
      currency: listing.currencyCode || 'EUR',
    });
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
        <StatCard icon="🟢" color={T.success} value={`${stats.available}j`} label="Disponibles" />
        <StatCard icon="🔵" color={T.info}    value={`${stats.booked}j`}    label="Réservés" />
        <StatCard icon="🚫" color={T.error}   value={`${stats.stop}j`}      label="Stop sell" />
        <StatCard icon="€"  color={T.primary} value={`€${stats.revenue.toFixed(0)}`} label={`Revenu ${MONTHS[month].toLowerCase()}`} />
        <StatCard icon="⚡" color={T.ai}      value={`+€${stats.dynamicWin.toFixed(0)}`} label="Manque-à-gagner AI" highlight />
      </div>

      <div style={{
        background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: `1px solid ${T.border}`, background: T.bg2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
            {listing.name} · {MONTHS[month]} {year}
            <button
              type="button"
              title="Audit disponibilité — jours bloqués sans réservation (365 j.)"
              onClick={handleAuditClick}
              style={{
                background: 'none', border: 0, padding: '0 2px',
                color: T.text4, fontSize: 10, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
                opacity: 0.7, transition: 'opacity 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = T.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = T.text4; }}
            >
              ▶ audit
            </button>
          </h3>
          <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: T.text3 }}>
            <Legend dot={T.success} label="Disponible" />
            <Legend dot={T.info} label="Réservé" />
            <Legend dot={T.error} label="Stop sell" />
            <Legend dot={T.ai} label="Prix dynamique" />
            <Legend dot={ARCHIVE_CELL_BG} label="Historique" />
          </div>
        </div>

        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: T.bg2, borderBottom: `1px solid ${T.border}` }}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} style={{
              textAlign: 'center', padding: '8px 0', fontSize: 10.5, fontWeight: 700,
              fontFamily: '"Geist Mono", monospace', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: i >= 5 ? T.warning : T.text3,
            }}>{w}</span>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 110 }}>
          {cells.map(c => {
            if (!c.inMonth) {
              return <div key={c.key} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.bg2, opacity: 0.5 }} />;
            }
            const isSel = selected.includes(c.iso);
            return (
              <div key={c.key} onClick={(e) => toggleDay(c.iso, e)} style={{
                borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
                padding: 8, display: 'flex', flexDirection: 'column', gap: 5,
                cursor: c.noInventory || c.isArchived ? 'not-allowed' : 'cell', transition: 'all 0.15s', position: 'relative',
                background:
                  c.cellState === 'out_of_window' ? OUT_OF_WINDOW_CELL_BG :
                  c.isArchived ? ARCHIVE_CELL_BG :
                  c.noInventory ? T.bg2 :
                  isSel ? T.primaryTint3 :
                  c.isToday ? T.primaryTint :
                  c.stopSell ? 'rgba(200,30,30,0.05)' :
                  c.booked ? 'rgba(6,115,179,0.06)' :
                  c.isWeekend ? T.bg2 : 'transparent',
                boxShadow: isSel ? `inset 0 0 0 2px ${T.primary}` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 13, fontWeight: c.isToday ? 800 : 700,
                    color: c.isArchived ? ARCHIVE_CELL_TEXT : c.isToday ? T.primaryDeep : T.text,
                  }}>{c.num}</span>
                  {c.isArchived && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: ARCHIVE_CELL_TEXT }}>hist.</span>
                  )}
                  <span style={{ display: 'flex', gap: 3 }}>
                    {c.useDynamic && <i style={{ width: 6, height: 6, borderRadius: '50%', background: T.ai }} />}
                    {c.hasManual && <i style={{ width: 6, height: 6, borderRadius: '50%', background: T.warning }} />}
                  </span>
                </div>
                {c.noInventory || c.cellState === 'out_of_window' ? (
                  <div
                    title={c.priceHint}
                    style={{
                      fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 700,
                      color: T.text4, marginTop: 2,
                    }}
                  >
                    {c.priceLabel}
                    <small style={{ fontSize: 9, color: T.text4, marginLeft: 3, display: 'block', fontWeight: 600 }}>
                      {c.cellState === 'out_of_window' ? 'hors fenêtre' : 'n/d'}
                    </small>
                  </div>
                ) : c.stopSell ? (
                  <div style={{
                    fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 700,
                    color: T.error, textDecoration: 'line-through', marginTop: 2,
                  }}>{c.basePrice ?? '—'}<small style={{ fontSize: 9.5, color: T.text3, marginLeft: 3, fontWeight: 600 }}>{c.currency}</small></div>
                ) : (
                  <div style={{
                    fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 700,
                    color: c.useDynamic ? T.ai : T.text, letterSpacing: '-0.01em', marginTop: 2,
                  }}>{c.priceLabel}{c.showPriceCurrency ? <small style={{ fontSize: 9.5, color: T.text3, marginLeft: 3, fontWeight: 600 }}>{c.currency}</small> : null}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
                  {c.stopSell && (
                    <span style={{ fontSize: 9, background: T.errorTint, color: T.error, padding: '1px 5px', borderRadius: 99, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>🚫 Stop</span>
                  )}
                  {!c.stopSell && c.booked && (
                    <span style={{ fontSize: 9.5, color: T.error, fontFamily: '"Geist Mono", monospace', fontWeight: 700 }}>0 / {c.available}</span>
                  )}
                  {!c.noInventory && !c.stopSell && !c.booked && (
                    <span style={{ fontSize: 9.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{c.available} / {c.available}</span>
                  )}
                  {c.reservations.length >= 1 && (
                    <span onClick={(e) => {
                      e.stopPropagation();
                      handleReservationClick(
                        e.currentTarget.getBoundingClientRect(),
                        c.iso,
                        c.reservations,
                      );
                    }} style={{
                      fontSize: 9, background: T.infoTint, color: T.info,
                      padding: '1px 5px', borderRadius: 99, fontWeight: 700,
                      fontFamily: '"Geist Mono", monospace', cursor: 'pointer',
                    }}>{c.reservations.length === 1 ? '1 résa' : `${c.reservations.length} résa`}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sélection toolbar flottante */}
      {selected.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.text, color: '#fff', padding: '10px 18px', borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 12px 40px rgba(20,17,10,0.30)', zIndex: 40,
          animation: 'fadeIn 0.25s both',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            📋 <b style={{ fontFamily: '"Geist Mono", monospace', color: T.primarySoft }}>{selected.length} jour(s)</b> sélectionné(s)
          </span>
          <button onClick={commitSelection} style={{
            padding: '6px 12px', borderRadius: 7, background: '#fff', color: T.text,
            fontSize: 11.5, fontWeight: 700, border: 0, cursor: 'pointer',
          }}>✏ Modifier</button>
          <button onClick={() => setSelected([])} style={{
            padding: '6px 12px', borderRadius: 7, background: 'transparent', color: '#fff',
            fontSize: 11.5, fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
          }}>Annuler</button>
          <span style={{ fontSize: 10, color: '#9c958a', fontFamily: '"Geist Mono", monospace' }}>⎋ Esc</span>
        </div>
      )}

      {popover && (
        <PopoverReservations
          open={!!popover} anchorRect={popover.rect} dayStr={popover.dateStr}
          reservations={popover.reservations} onClose={() => setPopover(null)}
          onResaClick={(res) => {
            onOpenReservation?.(normalizeCalendarReservations([res])[0]);
            setPopover(null);
          }}
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

function StatCard({ icon, color, value, label, highlight }) {
  return (
    <div style={{
      background: T.bg1, border: `1px solid ${highlight ? `${color}30` : T.border}`,
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: highlight ? `0 0 0 1px ${color}10` : 'none',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}15`, color, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{
          fontFamily: '"Geist Mono", monospace', fontSize: 18, fontWeight: 700,
          letterSpacing: '-0.02em', lineHeight: 1, color: highlight ? color : T.text,
        }}>{value}</div>
        <div style={{
          fontSize: 10, color: T.text3, marginTop: 3,
          fontFamily: '"Geist Mono", monospace', letterSpacing: '0.06em',
          fontWeight: 700, textTransform: 'uppercase',
        }}>{label}</div>
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
