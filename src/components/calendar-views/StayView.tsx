// ════════════════════════════════════════════════════════════════════
// StayView.tsx — Vue Séjour redesignée (Gantt + tasks chips)
// • Ligne fixe 76px (plus de hauteur dynamique)
// • Max 2 chips visibles + badge "+N" popover inline
// • Couleur barre par canal (Airbnb/Booking/Vrbo/Direct)
// • Mini-map 30j au-dessus
// • Groupement par ville
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Stack, Typography, Popover } from '@mui/material';
import {
  T, STAY, type ListingRow, type TimelineItem, channelFromName, genDays,
  KpiPill, DayHeader, CleanlinessBadge, TaskChip, GanttBar, SOJORI_KEYFRAMES, computeReservationBarLayout,
} from './_shared';

export type StayViewVariant = 'tasks' | 'reservations';

export interface StayViewProps {
  startDate: Date;
  daysCount?: number;           // défaut 30 (mini-map) — vue 14j visible
  listings: ListingRow[];
  /** tasks = chips tâches + KPI ops ; reservations = barres séjour uniquement + filtres statut */
  variant?: StayViewVariant;
  onTaskClick?: (item: TimelineItem) => void;
  onReservationClick?: (resId: string) => void;
  onCellClick?: (listingId: string, iso: string) => void;
  onGoToday?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onDateChange?: (date: Date) => void;
}

const VISIBLE_DAYS = 14;

export default function StayView({
  startDate, daysCount = 30, listings, variant = 'tasks', onTaskClick, onReservationClick,
  onGoToday, onPrevDay, onNextDay, onPrevWeek, onNextWeek, onDateChange,
}: StayViewProps) {
  const isReservations = variant === 'reservations';
  const minimapDays = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const days = useMemo(() => genDays(startDate, VISIBLE_DAYS), [startDate]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<'confirmed' | 'pending'>>(
    () => new Set(['confirmed', 'pending']),
  );

  const toggleStatus = (s: 'confirmed' | 'pending') => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size <= 1) return prev;
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const displayListings = useMemo(() => {
    if (!isReservations) return listings;
    return listings.map(l => ({
      ...l,
      reservations: l.reservations.filter(r => statusFilters.has(r.status)),
    }));
  }, [listings, isReservations, statusFilters]);

  // KPI "aujourd'hui"
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (isReservations) {
      let arr = 0, dep = 0, confirmed = 0, pending = 0;
      displayListings.forEach(l => l.reservations.forEach(r => {
        const arrIso = (r.arrivalDate || '').slice(0, 10);
        const depIso = (r.departureDate || '').slice(0, 10);
        if (arrIso === today) arr++;
        if (depIso === today) dep++;
        if (r.status === 'confirmed') confirmed++;
        else pending++;
      }));
      return { arr, dep, confirmed, pending };
    }
    let arr = 0, dep = 0, cln = 0, na = 0;
    listings.forEach(l => l.reservations.forEach(r => r.timeline?.forEach(t => {
      if ((t.scheduledFor || '').slice(0, 10) !== today) return;
      if (t.type === 'arrival')   arr++;
      if (t.type === 'departure') dep++;
      if (t.type === 'cleaning')  cln++;
      if (!t.staffId && t.status !== 'COMPLETED') na++;
    })));
    return { arr, dep, cln, na };
  }, [listings, displayListings, isReservations]);

  // Group by city
  const byCity = useMemo(() => {
    const map = new Map<string, ListingRow[]>();
    displayListings.forEach(l => {
      const c = l.city || 'Sans ville';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(l);
    });
    return Array.from(map.entries());
  }, [displayListings]);

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: '20px 24px 50px' } }}>
      <style>{SOJORI_KEYFRAMES}</style>

      <Stack direction="row" alignItems="baseline" gap={1.75} sx={{ mb: 1.75 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>
          {isReservations ? 'Planning Réservations' : 'Vue Séjour'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {displayListings.length} propriétés · {daysCount}j (mini) · {VISIBLE_DAYS}j visibles
        </Typography>
      </Stack>

      <Stack direction="row" gap={1.25} flexWrap="wrap" sx={{ mb: 1.5 }}>
        <KpiPill icon="🏠" count={kpis.arr} label="Arrivées auj." tone="success" />
        <KpiPill icon="🚪" count={kpis.dep} label="Départs auj." tone="warning" />
        {isReservations ? (
          <>
            <KpiPill icon="✓" count={kpis.confirmed} label="Confirmées" tone="primary" />
            <KpiPill icon="⏳" count={kpis.pending} label="En attente" tone="warning" />
          </>
        ) : (
          <>
            <KpiPill icon="🧹" count={kpis.cln} label="Ménages" tone="primary" />
            <KpiPill icon="⚠" count={kpis.na} label="Non assigné" tone="error" alert={kpis.na > 0} />
          </>
        )}
      </Stack>

      {/* Toolbar - Navigation + Filtres + Légende */}
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
        p: '10px 14px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        mb: 1.25, boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        {/* Date range - cliquable pour ouvrir calendrier */}
        <Box component="button" onClick={() => setShowDatePicker(true)} sx={{
          all: 'unset', cursor: 'pointer', fontFamily: '"Geist Mono", monospace',
          fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5,
          '&:hover': { color: T.primary },
        }}>
          {days[0]?.frShort || ''}<span style={{ color: T.text4, margin: '0 6px' }}>→</span>{days[days.length - 1]?.frShort || ''}
          <span style={{ fontSize: 10, marginLeft: 4 }}>📅</span>
        </Box>

        {/* Navigation pills */}
        <Box sx={{
          display: 'inline-flex', bgcolor: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: '9px', p: '3px', gap: '2px',
        }}>
          <Box component="button" onClick={onPrevWeek} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>«</Box>
          <Box component="button" onClick={onPrevDay} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>‹</Box>
          <Box component="button" onClick={onGoToday} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, background: `linear-gradient(180deg,#cb9b2c,${T.primary})`,
            color: '#1a1408',
          }}>Auj.</Box>
          <Box component="button" onClick={onNextDay} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>›</Box>
          <Box component="button" onClick={onNextWeek} sx={{
            all: 'unset', cursor: 'pointer', p: '5px 9px', borderRadius: '6px',
            fontSize: 11.5, fontWeight: 700, color: T.text2, '&:hover': { bgcolor: T.bg1 },
          }}>»</Box>
        </Box>

        {/* Date Picker Popover */}
        {showDatePicker && (
          <Popover
            open={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            anchorReference="anchorPosition"
            anchorPosition={{ top: 200, left: 400 }}
            PaperProps={{ sx: { p: 2, borderRadius: 1.5 } }}
          >
            <input
              type="date"
              defaultValue={startDate.toISOString().slice(0, 10)}
              onChange={(e) => {
                if (e.target.value && onDateChange) {
                  onDateChange(new Date(e.target.value));
                  setShowDatePicker(false);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
              }}
            />
          </Popover>
        )}

        {/* Filtres Villes + Toutes */}
        <Box component="button" sx={{
          all: 'unset', cursor: 'pointer', height: 30, px: 1.375, borderRadius: 1,
          bgcolor: T.bg1, border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600,
          color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 0.75,
          '&:hover': { borderColor: T.borderStrong },
        }}>
          🏘 Villes <Box component="span" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 9.5, bgcolor: T.bg3, color: T.text3,
            px: 0.625, borderRadius: 999, fontWeight: 700,
          }}>{byCity.length}</Box> ▾
        </Box>

        <Box component="button" sx={{
          all: 'unset', cursor: 'pointer', height: 30, px: 1.375, borderRadius: 1,
          bgcolor: T.bg1, border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600,
          color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 0.75,
          '&:hover': { borderColor: T.borderStrong },
        }}>
          🏠 Toutes <Box component="span" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 9.5, bgcolor: T.bg3, color: T.text3,
            px: 0.625, borderRadius: 999, fontWeight: 700,
          }}>{listings.length}</Box> ▾
        </Box>

        {isReservations ? (
          <Stack direction="row" gap={0.625} flexWrap="wrap" sx={{ ml: 'auto' }}>
            <FilterTogglePill
              label="Confirmées"
              active={statusFilters.has('confirmed')}
              onClick={() => toggleStatus('confirmed')}
              color={T.success}
            />
            <FilterTogglePill
              label="En attente"
              active={statusFilters.has('pending')}
              onClick={() => toggleStatus('pending')}
              color={T.warning}
            />
            <ChannelLegendPill label="Airbnb" color={T.airbnb} />
            <ChannelLegendPill label="Booking" color={T.booking} />
            <ChannelLegendPill label="Vrbo" color={T.vrbo} />
            <ChannelLegendPill label="Direct" color={T.primary} />
          </Stack>
        ) : (
          <Stack direction="row" gap={0.625} flexWrap="wrap" sx={{ ml: 'auto' }}>
            <LegendPill icon="🏠" label="Arrivée" />
            <LegendPill icon="🚪" label="Départ" />
            <LegendPill icon="🧹" label="Ménage" />
            <LegendPill icon="📝" label="Enreg." />
            <LegendPill icon="🛎" label="Concierge" />
          </Stack>
        )}
      </Box>

      {/* Mini-map */}
      <MiniMap
        days={minimapDays}
        listings={displayListings}
        visibleStart={0}
        visibleEnd={VISIBLE_DAYS}
        mode={isReservations ? 'reservations' : 'tasks'}
      />

      {/* Grid */}
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
        overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        {/* Header */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: `${STAY.STICKY_W}px repeat(${VISIBLE_DAYS}, ${STAY.CELL_W}px)`,
          bgcolor: T.bg2, borderBottom: `1px solid ${T.borderStrong}`,
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <Box sx={{
            p: '12px 14px', fontSize: 10.5, fontWeight: 700, color: T.text3,
            letterSpacing: '0.08em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`,
          }}>Propriétés</Box>
          {days.map(d => <DayHeader key={d.iso} day={d} width={STAY.CELL_W} />)}
        </Box>

        {/* Rows par ville */}
        {byCity.map(([city, lists]) => (
          <React.Fragment key={city}>
            <Box sx={{
              p: '8px 14px', display: 'flex', alignItems: 'center', gap: 1,
              background: `linear-gradient(90deg, ${T.bg3}, ${T.bg1})`,
              borderBottom: `1px solid ${T.border}`,
              fontSize: 10.5, fontWeight: 700, color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Box component="span" sx={{ fontSize: 13 }}>📍</Box>
              {city}
              <Box component="span" sx={{
                ml: 'auto', bgcolor: T.bg2, color: T.text2,
                px: 0.875, borderRadius: 999, fontSize: 9.5, letterSpacing: '0.04em',
              }}>{lists.length} propriétés</Box>
            </Box>
            {lists.map(l => (
              <ListingRowComp key={l.listingId} listing={l} days={days}
                showTaskChips={!isReservations}
                onTaskClick={onTaskClick} onReservationClick={onReservationClick} />
            ))}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}

/* ─── Listing row ─── */
function ListingRowComp({ listing, days, showTaskChips = true, onTaskClick, onReservationClick }: {
  listing: ListingRow; days: ReturnType<typeof genDays>;
  showTaskChips?: boolean;
  onTaskClick?: (i: TimelineItem) => void; onReservationClick?: (id: string) => void;
}) {
  const numTasks = listing.reservations.reduce((n, r) => n + (r.timeline?.length || 0), 0);

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: `${STAY.STICKY_W}px repeat(${days.length}, ${STAY.CELL_W}px)`,
      borderBottom: `1px solid ${T.border}`, height: STAY.ROW_H, position: 'relative',
    }}>
      {/* Sticky left */}
      <Stack sx={{
        p: '10px 14px', borderRight: `1px solid ${T.border}`, bgcolor: T.bg1,
        justifyContent: 'center', gap: 0.375,
      }}>
        <Stack direction="row" alignItems="center" gap={0.875}>
          <Box sx={{ width: 22, height: 22, borderRadius: 0.75,
            background: 'linear-gradient(135deg,#fde68a,#d97706)', flexShrink: 0 }} />
          <Typography sx={{
            fontSize: 12.5, fontWeight: 700, lineHeight: 1.1, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{listing.listingName}</Typography>
        </Stack>
        <CleanlinessBadge status={listing.cleanlinessStatus_v2} />
        <Typography sx={{
          fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em',
        }}>
          {days.length}j · <b style={{ color: T.text2, fontWeight: 700 }}>{listing.reservations.length} séj.</b>
          {showTaskChips && (
            <> · <b style={{ color: T.text2, fontWeight: 700 }}>{numTasks} tâch.</b></>
          )}
        </Typography>
      </Stack>

      {/* Day cells */}
      {days.map(d => {
        const tasks = showTaskChips
          ? (listing.reservations || []).flatMap(r =>
              (r.timeline || []).filter(t => (t.scheduledFor || '').slice(0, 10) === d.iso)
            )
          : [];
        return <DayCell key={d.iso} day={d} tasks={tasks} onTaskClick={onTaskClick} />;
      })}

      {/* Gantt bars overlay */}
      <Box sx={{
        position: 'absolute', top: 0, left: STAY.STICKY_W,
        width: days.length * STAY.CELL_W, height: STAY.ROW_H, pointerEvents: 'none', zIndex: 3,
      }}>
        {(() => {
          const arrivalSlotCount = new Map<number, number>();
          const visibleReservations = listing.reservations
            .map(r => {
              const arr = new Date(r.arrivalDate);
              const dep = new Date(r.departureDate);
              const firstDay = days[0].date;
              const arrIdx = Math.floor((+arr - +firstDay) / 86400000);
              const depIdx = Math.floor((+dep - +firstDay) / 86400000);
              if (depIdx < 0 || arrIdx > days.length - 1) return null;
              const startIdx = Math.max(0, arrIdx);
              const slot = arrivalSlotCount.get(startIdx) ?? 0;
              arrivalSlotCount.set(startIdx, slot + 1);
              return { r, startIdx, endIdx: Math.min(days.length - 1, depIdx), sameDaySlot: slot };
            })
            .filter(Boolean) as Array<{
              r: (typeof listing.reservations)[0];
              startIdx: number;
              endIdx: number;
              sameDaySlot: number;
            }>;

          return visibleReservations.map(({ r, startIdx, endIdx, sameDaySlot }) => {
          const { leftPct, widthPct } = computeReservationBarLayout(
            startIdx,
            endIdx,
            days.length,
            sameDaySlot,
          );
          const channel = channelFromName(r.channelName);
          return (
            <Box key={r.reservationId} onClick={() => onReservationClick?.(r.reservationNumber || r.reservationId)}
              sx={{ pointerEvents: 'auto' }}>
              <GanttBar
                channel={channel}
                guestName={r.guestName}
                reservationNumber={r.reservationNumber}
                confirmed={r.status === 'confirmed'}
                leftPct={leftPct} widthPct={widthPct}
              />
            </Box>
          );
          });
        })()}
      </Box>
    </Box>
  );
}

/* ─── Day cell with chip overflow popover ─── */
function DayCell({ day, tasks, onTaskClick }: {
  day: ReturnType<typeof genDays>[0]; tasks: TimelineItem[]; onTaskClick?: (i: TimelineItem) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = tasks.slice(0, STAY.MAX_CHIPS);
  const overflow = tasks.length - STAY.MAX_CHIPS;

  return (
    <Box sx={{
      borderRight: `1px solid ${T.border}`, position: 'relative',
      bgcolor: day.isToday ? 'rgba(184,133,26,0.04)' : day.isWeekend ? T.bg2 : T.bg1,
    }}>
      {tasks.length > 0 && (
        <Stack sx={{
          position: 'absolute', bottom: 5, left: 3, right: 3,
          flexDirection: 'column', gap: 0.25, zIndex: 1,
        }}>
          {visible.map((t, i) => (
            <Box key={i} onClick={() => onTaskClick?.(t)} sx={{ cursor: 'pointer' }}>
              <TaskChip item={t} />
            </Box>
          ))}
          {overflow > 0 && (
            <>
              <Box
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                  bgcolor: T.bg3, color: T.text2, fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace', fontSize: 9,
                  textAlign: 'center', py: '2px', borderRadius: 0.75, cursor: 'pointer',
                  letterSpacing: '0.04em', border: `1px solid ${T.border}`,
                  '&:hover': { bgcolor: T.primaryTint, color: T.primaryDeep, borderColor: T.primary },
                }}>+{overflow} autres</Box>
              <Popover
                open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                PaperProps={{ sx: { p: 1.25, borderRadius: 1.5, minWidth: 220, boxShadow: '0 12px 32px rgba(20,17,10,0.18)' } }}
              >
                <Typography sx={{
                  fontSize: 10, fontWeight: 700, color: T.text3, fontFamily: '"Geist Mono", monospace',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  pb: 0.75, mb: 1, borderBottom: `1px solid ${T.border}`,
                }}>{tasks.length} tâches · {day.iso}</Typography>
                <Stack gap={0.5}>
                  {tasks.map((t, i) => (
                    <Box key={i} onClick={() => { onTaskClick?.(t); setAnchor(null); }} sx={{ cursor: 'pointer' }}>
                      <TaskChip item={t} />
                    </Box>
                  ))}
                </Stack>
              </Popover>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}

/* ─── MiniMap 30j ─── */
function MiniMap({ days, listings, visibleStart, visibleEnd, mode = 'tasks' }: {
  days: ReturnType<typeof genDays>; listings: ListingRow[];
  visibleStart: number; visibleEnd: number;
  mode?: 'tasks' | 'reservations';
}) {
  const load = useMemo(() => {
    const map = new Map<string, number>();
    if (mode === 'reservations') {
      listings.forEach(l => l.reservations.forEach(r => {
        const arr = (r.arrivalDate || '').slice(0, 10);
        const dep = (r.departureDate || '').slice(0, 10);
        days.forEach(d => {
          if (d.iso >= arr && d.iso < dep) {
            map.set(d.iso, (map.get(d.iso) || 0) + 1);
          }
        });
      }));
      return map;
    }
    listings.forEach(l => l.reservations.forEach(r => r.timeline?.forEach(t => {
      const iso = (t.scheduledFor || '').slice(0, 10);
      map.set(iso, (map.get(iso) || 0) + 1);
    })));
    return map;
  }, [listings, days, mode]);

  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
      p: '10px 14px', mb: 1.25, display: 'flex', alignItems: 'center', gap: 1.75,
      fontSize: 11, color: T.text3, boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, flexShrink: 0,
      }}>{days.length}j</Typography>
      <Box sx={{
        flex: 1, display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        gap: '1.5px', height: 18, position: 'relative',
      }}>
        {days.map(d => {
          const n = load.get(d.iso) || 0;
          const cls = n >= 3 ? 'busy' : n > 0 ? 'has-task' : 'empty';
          const bg = cls === 'busy' ? T.primary : cls === 'has-task' ? 'rgba(184,133,26,0.30)' : T.bg3;
          return (
            <Box key={d.iso} sx={{
              bgcolor: bg, borderRadius: '2px', height: '100%',
              ...(d.isToday ? { bgcolor: T.error, boxShadow: `0 0 0 1.5px ${T.bg1}, 0 0 0 2.5px ${T.error}` } : {}),
            }} />
          );
        })}
        <Box sx={{
          position: 'absolute', top: -2, bottom: -2,
          left: `${(visibleStart / days.length) * 100}%`,
          width: `${((visibleEnd - visibleStart) / days.length) * 100}%`,
          bgcolor: 'rgba(184,133,26,0.15)',
          border: `1.5px solid ${T.primary}`, borderRadius: '3px', pointerEvents: 'none',
        }} />
      </Box>
    </Box>
  );
}

/* ─── Legend Pill ─── */
function LegendPill({ icon, label }: { icon: string; label: string }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      px: 1, py: '3px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
      color: T.text2, bgcolor: T.bg2,
    }}>
      <span style={{ fontSize: 11 }}>{icon}</span>{label}
    </Box>
  );
}

function FilterTogglePill({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      px: 1, py: '3px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
      color: active ? color : T.text3,
      bgcolor: active ? `${color}18` : T.bg2,
      border: `1px solid ${active ? color : T.border}`,
    }}>
      {label}
    </Box>
  );
}

function ChannelLegendPill({ label, color }: { label: string; color: string }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: '3px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
      color: T.text2, bgcolor: T.bg2,
    }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      {label}
    </Box>
  );
}
