/**
 * Bandeau « Aujourd'hui » + Toolbar planning — redesign Atelier 2026.
 * Palette alignée sur tokens DashboardV2 :
 *   primary  #b8851a   (ambre dignifié, remplace l'orange opérationnel)
 *   ai       #7c3aed   (réservé aux actions IA / proactives)
 *   success  #0a8f5e   warning #c46506   error #c81e1e
 * Typo Geist + Geist Mono, lettering UPPERCASE 0.08em pour les labels secs.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormControl, MenuItem, Select, useMediaQuery, useTheme } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PlanningListingRow } from '../../types/tasksPlanning.types';

// ─── Tokens locaux (alignés DashboardV2 export tokens) ──────────────
const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error:   '#c81e1e', errorTint:   'rgba(200,30,30,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text:  '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

const TODAY = format(new Date(), 'yyyy-MM-dd');

export function computeTodayOpsFromListings(listings: PlanningListingRow[]) {
  const arrivals: unknown[] = [];
  const departures: unknown[] = [];
  const cleans: unknown[] = [];
  let unassigned = 0;
  for (const listing of listings) {
    for (const res of listing.reservations || []) {
      for (const item of res.timeline || []) {
        const day = item.scheduledFor ? format(new Date(item.scheduledFor), 'yyyy-MM-dd') : null;
        if (day !== TODAY) continue;
        const type = String(item.type || '').toLowerCase();
        const cat = String(item.category || '').toLowerCase();
        if (type === 'arrival'   || (cat === 'timeslot' && type === 'arrival'))   arrivals.push(item);
        else if (type === 'departure' || (cat === 'timeslot' && type === 'departure')) departures.push(item);
        else if (type === 'cleaning'  || (cat === 'timeslot' && type === 'cleaning'))  cleans.push(item);
        const d = (item.data || {}) as Record<string, unknown>;
        const hasStaff = Boolean(d.staffId || item.staffId);
        const isDone = String(d.status || item.status || '') === 'COMPLETED';
        if (!hasStaff && !isDone) unassigned += 1;
      }
    }
  }
  return { arrivals, departures, cleans, unassigned };
}

// ─── KPI pill premium ──────────────────────────────────────────────
function KpiPill({
  icon, label, count, accent, alert, dense,
}: { icon: string; label: string; count: number; accent: string; alert?: boolean; dense?: boolean }) {
  const iconSz = dense ? 12 : 14;
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: dense ? 5 : 7,
        padding: dense ? '5px 9px' : '7px 11px',
        borderRadius: 999,
        background: T.bg1,
        border: `1px solid ${T.border}`,
        flexShrink: 0, whiteSpace: 'nowrap',
        transition: 'border-color 140ms ease, box-shadow 140ms ease',
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dense ? 20 : 22, height: dense ? 20 : 22, borderRadius: 6,
        background: `${accent}15`, color: accent, fontSize: iconSz, lineHeight: 1,
      }}>{icon}</span>
      <span style={{
        fontSize: dense ? 13 : 14, fontWeight: 700, color: T.text, lineHeight: 1,
        fontFamily: '"Geist Mono", monospace', letterSpacing: '-0.01em',
      }}>
        {count}
        {alert && count > 0 && (
          <span style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            background: T.error, marginLeft: 4, verticalAlign: 'middle',
          }}/>
        )}
      </span>
      <span style={{
        fontSize: dense ? 10 : 11, fontWeight: 700, color: T.text3,
        letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1,
      }}>{label}</span>
    </div>
  );
}

export function TasksStayTodayOpsBar({
  listings,
  planningWindowDays,
}: {
  listings: PlanningListingRow[];
  planningWindowDays: number;
}) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const stackPortrait = Boolean(isNarrow && isPortrait);

  const today = useMemo(() => computeTodayOpsFromListings(listings), [listings]);
  const todayLabel = format(new Date(), 'EEEE d MMMM', { locale: fr });

  const kpis = [
    { key: 'arr', icon: '🏠', label: 'Arrivées',     count: today.arrivals.length,   accent: T.success },
    { key: 'dep', icon: '🚪', label: 'Départs',      count: today.departures.length, accent: T.warning },
    { key: 'men', icon: '🧹', label: 'Ménages',      count: today.cleans.length,     accent: T.primary },
    { key: 'na',  icon: '⚠',  label: 'Non assignés', count: today.unassigned,        accent: today.unassigned > 0 ? T.error : T.text3, alert: true },
  ];

  return (
    <div
      style={{
        background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: stackPortrait ? '8px 10px' : '10px 14px',
        display: 'flex',
        flexDirection: stackPortrait ? 'column' : 'row',
        alignItems: stackPortrait ? 'stretch' : 'center',
        gap: stackPortrait ? 8 : 14, marginBottom: 10,
        width: '100%', boxSizing: 'border-box', minWidth: 0,
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: stackPortrait ? 4 : 1,
        lineHeight: 1.15,
      }}>
        <span style={{
          fontSize: 10, color: T.text3, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>Aujourd&apos;hui</span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'capitalize',
          whiteSpace: 'nowrap', letterSpacing: '-0.005em',
        }}>{todayLabel}</span>
        <span style={{
          fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
          marginTop: 2, lineHeight: 1.25,
        }}>
          {planningWindowDays} jours · {listings.length} propriété{listings.length > 1 ? 's' : ''}
        </span>
      </div>

      {!stackPortrait && <div style={{ width: 1, height: 30, background: T.border, flexShrink: 0 }} />}

      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: 8, flexWrap: 'nowrap', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin',
        flex: stackPortrait ? undefined : 1,
        minWidth: 0,
      }}>
        {kpis.map((k) => (
          <KpiPill key={k.key} icon={k.icon} label={k.label} count={k.count} accent={k.accent} alert={k.alert} dense={isNarrow} />
        ))}
      </div>

      {!stackPortrait && <div style={{ width: 1, height: 30, background: T.border, flexShrink: 0 }} />}

      <div style={{
        fontSize: 11, color: T.text3, flexShrink: 0, fontFamily: '"Geist Mono", monospace',
        marginLeft: stackPortrait ? 0 : 'auto',
        alignSelf: stackPortrait ? 'flex-end' : undefined,
      }}>
        {listings.length} prop.
      </div>
    </div>
  );
}

// ─── Légende sobre ─────────────────────────────────────────────────
const LEGEND = [
  { icon: '🏠', label: 'Arrivée',    bg: 'rgba(10,143,94,0.10)',  border: 'rgba(10,143,94,0.30)' },
  { icon: '🚪', label: 'Départ',     bg: 'rgba(200,30,30,0.08)',  border: 'rgba(200,30,30,0.25)' },
  { icon: '🧹', label: 'Ménage',     bg: 'rgba(196,101,6,0.10)',  border: 'rgba(196,101,6,0.28)' },
  { icon: '🛎',  label: 'Concierge',  bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.28)' },
  { icon: '🆘', label: 'Support',    bg: 'rgba(232,121,249,0.10)', border: 'rgba(232,121,249,0.32)' },
];

// ─── Toolbar planning ──────────────────────────────────────────────
export function TasksStayPlanningToolbar({
  startDate, endDate,
  onGoToday, onPrevDay, onNextDay, onPrevWeek, onNextWeek,
  showOwnerFilter, ownerSelectValue, ownerOptions, onOwnerChange,
  allListings, selectedListingIds, onSelectedListingsChange,
}: {
  startDate: string; endDate: string;
  onGoToday: () => void; onPrevDay: () => void; onNextDay: () => void;
  onPrevWeek: () => void; onNextWeek: () => void;
  showOwnerFilter: boolean;
  ownerSelectValue: string;
  ownerOptions: { id: string; name: string }[];
  onOwnerChange: (ownerId: string) => void;
  allListings: PlanningListingRow[];
  selectedListingIds: string[];
  onSelectedListingsChange: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isMobilePortrait = Boolean(isNarrow && isPortrait);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const ownerLabel =
    ownerSelectValue === '' ? 'Tous propriétaires'
      : ownerOptions.find((o) => o.id === ownerSelectValue)?.name || 'Propriétaire';

  const navBtn = (label: string, onClick: () => void, title: string) => (
    <button
      type="button" onClick={onClick} title={title}
      style={{
        width: 26, height: 26, borderRadius: 6,
        border: `1px solid ${T.border}`, background: T.bg1,
        cursor: 'pointer', fontSize: 12, color: T.text2, lineHeight: 1, padding: 0,
        transition: 'all 140ms ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderStrong; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}
    >{label}</button>
  );

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        gap: isMobilePortrait ? 6 : 8,
        padding: isMobilePortrait ? '7px 10px' : '9px 14px',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg2,
        flexWrap: isMobilePortrait ? 'wrap' : 'nowrap',
        overflowX: isMobilePortrait ? 'visible' : 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin',
        maxWidth: '100%', minWidth: 0, boxSizing: 'border-box',
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: 'nowrap',
        flexShrink: 0, fontFamily: '"Geist Mono", monospace', letterSpacing: '-0.01em',
      }}>
        {format(parseISO(startDate), 'd MMM', { locale: fr })}
        <span style={{ color: T.text4, margin: '0 6px' }}>→</span>
        {format(parseISO(endDate), 'd MMM yy', { locale: fr })}
      </span>

      <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />

      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
        {navBtn('«', onPrevWeek, '−7 jours')}
        {navBtn('‹', onPrevDay, '−1 jour')}
        <button
          type="button" onClick={onGoToday} title="Aller à aujourd'hui"
          style={{
            height: 26, padding: '0 10px', borderRadius: 6,
            background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
            color: '#1a1408', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
          }}
        >Auj.</button>
        {navBtn('›', onNextDay, '+1 jour')}
        {navBtn('»', onNextWeek, '+7 jours')}
      </div>

      {showOwnerFilter && (
        <>
          <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />
          <FormControl size="small" sx={{ minWidth: 170, maxWidth: 280, flexShrink: 0 }}>
            <Select
              value={ownerSelectValue}
              onChange={(e) => onOwnerChange(String(e.target.value))}
              displayEmpty
              renderValue={() => ownerLabel}
              sx={{
                height: 30, fontSize: 12, bgcolor: T.bg1, borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.borderStrong },
              }}
            >
              <MenuItem value=""><em>Tous propriétaires</em></MenuItem>
              {ownerOptions.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>
        </>
      )}

      <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />

      <div ref={filterWrapRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button" onClick={() => setFilterOpen((v) => !v)}
          style={{
            height: 26, padding: '0 10px', borderRadius: 6,
            border: `1px solid ${selectedListingIds.length ? T.primary : T.border}`,
            background: selectedListingIds.length ? T.primaryTint : T.bg1,
            color: selectedListingIds.length ? T.primaryDeep : T.text2,
            cursor: 'pointer', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >🏠 {selectedListingIds.length ? `${selectedListingIds.length} sélect.` : 'Toutes'} ▾</button>
        {filterOpen && (
          <div style={{
            position: 'absolute', top: 30, left: 0, zIndex: 2000,
            background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: '0 12px 28px -8px rgba(20,17,10,0.18)',
            padding: 8, minWidth: 240, maxHeight: 360, overflowY: 'auto',
          }}>
            {allListings.map((l) => {
              const id = String(l.listingId || '');
              const name = l.listingName || l.name || 'Sans nom';
              const sel = selectedListingIds.includes(id);
              return (
                <label key={id || name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                  background: sel ? T.primaryTint : 'transparent',
                }}>
                  <input
                    type="checkbox" checked={sel}
                    style={{ accentColor: T.primary }}
                    onChange={() => {
                      const cur = selectedListingIds;
                      onSelectedListingsChange(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: T.text }}>🏠 {name}</span>
                </label>
              );
            })}
            <div style={{
              borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 6,
              display: 'flex', gap: 6,
            }}>
              <button type="button" onClick={() => { onSelectedListingsChange([]); setFilterOpen(false); }}
                style={{
                  flex: 1, fontSize: 11.5, padding: '5px 0', borderRadius: 6,
                  border: `1px solid ${T.border}`, background: T.bg1,
                  cursor: 'pointer', color: T.text2, fontWeight: 600,
                }}>Tout afficher</button>
              <button type="button" onClick={() => setFilterOpen(false)}
                style={{
                  flex: 1, fontSize: 11.5, padding: '5px 0', borderRadius: 6,
                  border: 'none',
                  background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
                  cursor: 'pointer', color: '#1a1408', fontWeight: 700,
                }}>Fermer</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {LEGEND.map((x) => (
          <span key={x.label} title={x.label}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px 7px', borderRadius: 999,
              background: x.bg, border: `1px solid ${x.border}`,
              fontSize: 11, color: T.text2, fontWeight: 600, whiteSpace: 'nowrap',
            }}>{x.icon}</span>
        ))}
        <span style={{
          fontSize: isMobilePortrait ? 9 : 10.5, color: T.text3,
          whiteSpace: 'nowrap', paddingLeft: 4, fontFamily: '"Geist Mono", monospace',
        }} title="Tâche sans staff assigné">
          {isMobilePortrait ? '● n.a.' : '● = non assigné'}
        </span>
      </div>
    </div>
  );
}
