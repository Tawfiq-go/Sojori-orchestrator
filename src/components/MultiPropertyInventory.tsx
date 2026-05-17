// ════════════════════════════════════════════════════════════════════
// Sojori — Multi-Property Inventory Gantt View
// Drop-in React + MUI component (extends CalendarPage.tsx)
//
// 1 line per listing × 30 columns (days) · horizontal scroll · sticky header & first column.
// Click a cell → open the single-day drawer (reuse from CalendarPage.tsx).
// ════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Panel, tokens as t } from './dashboard/DashboardV2.components';

type CellStatus = 'available' | 'booked' | 'closed';

export type PropertyRow = {
  id: string;
  name: string;
  city: string;
  photoColor: 'gold' | 'blue' | 'purple' | 'green' | 'pink';
  occupancyPct?: number; // Calculé automatiquement depuis bookedRanges si absent
  monthRevenue: string;
  bookedRanges: [number, number][]; // [startDayIdx, endDayIdx] inclusive
  closedDays?: number[];
  reservations?: ReservationBlock[]; // Detailed reservation blocks
};

export type ReservationBlock = {
  id: string;
  guestName: string;
  guestFlag?: string; // emoji flag
  amount: string;
  startDay: number; // day index
  endDay: number; // day index (inclusive)
  status: 'confirmed' | 'pending';
};

interface DayHeader {
  date: Date;
  weekday: number;
  weekend: boolean;
  isToday: boolean;
}

const PHOTO_GRAD: Record<PropertyRow['photoColor'], string> = {
  gold:   'linear-gradient(135deg,#fde68a,#d97706)',
  blue:   'linear-gradient(135deg,#a5f3fc,#0e7490)',
  purple: 'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  green:  'linear-gradient(135deg,#86efac,#16a34a)',
  pink:   'linear-gradient(135deg,#fda4af,#ec4899)',
};

export function MultiPropertyInventory({
  startDate = new Date(),
  days = 30,
  properties,
  onCellClick,
  showPrices = true,
}: {
  startDate?: Date;
  days?: number;
  properties: PropertyRow[];
  onCellClick?: (propertyId: string, dayIdx: number) => void;
  showPrices?: boolean; // false pour Vue Séjour (reservations only), true pour Inventaire
}) {
  const headers: DayHeader[] = useMemo(() => {
    const out: DayHeader[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const wd = (d.getDay() + 6) % 7;
      out.push({
        date: d,
        weekday: wd,
        weekend: wd >= 5,
        isToday:
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate(),
      });
    }
    return out;
  }, [startDate, days]);

  return (
    <Panel sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto', position: 'relative' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: `180px repeat(${days}, minmax(64px, 1fr))`,
          minWidth: 'max-content',
          position: 'relative',
        }}>
          {/* Header */}
          <Box sx={{
            position: 'sticky', left: 0, zIndex: 6,
            bgcolor: t.bg2, borderRight: `1px solid ${t.border}`,
            p: '12px 14px',
            fontSize: 10.5, fontFamily: 'Geist Mono', fontWeight: 700,
            color: t.text3, letterSpacing: 0.6, textTransform: 'uppercase',
          }}>Listing · {days} jours</Box>
          {headers.map((h, i) => (
            <Box key={i} sx={{
              p: '6px 0', textAlign: 'center',
              borderLeft: `1px solid ${t.border}`,
              borderBottom: `1px solid ${t.border}`,
              fontFamily: 'Geist Mono',
              bgcolor: h.isToday ? t.primaryTint : h.weekend ? 'rgba(0,0,0,0.02)' : t.bg2,
            }}>
              <Box sx={{ fontSize: 9.5, color: t.text3 }}>
                {['L','M','M','J','V','S','D'][h.weekday]}
              </Box>
              <Box sx={{ fontSize: 13, fontWeight: 700, color: h.isToday ? t.primaryDeep : t.text, mt: 0.25 }}>
                {h.date.getDate()}
              </Box>
            </Box>
          ))}

          {/* Rows */}
          {properties.map((p, idx) => (
            <PropertyRowView
              key={p.id}
              property={p}
              days={days}
              headers={headers}
              onCellClick={onCellClick}
              rowIndex={idx}
              showPrices={showPrices}
            />
          ))}
        </Box>
      </Box>
    </Panel>
  );
}

function PropertyRowView({
  property, days, headers, onCellClick, rowIndex, showPrices = true,
}: {
  property: PropertyRow;
  days: number;
  headers: DayHeader[];
  onCellClick?: (propertyId: string, dayIdx: number) => void;
  rowIndex: number;
  showPrices?: boolean;
}) {
  const cellWidth = 64; // matches minmax(64px, 1fr)
  const headerHeight = 52; // height of header row
  const rowHeight = 48; // ✅ RÉDUIT: 64px → 48px pour voir plus de lignes

  // ✅ Calculer l'occupation réelle sur l'intervalle affiché
  const occupancyPct = useMemo(() => {
    if (property.occupancyPct !== undefined) return property.occupancyPct;

    // Compter les jours occupés
    const bookedDays = new Set<number>();
    property.bookedRanges.forEach(([start, end]) => {
      for (let d = start; d <= end; d++) {
        if (d >= 0 && d < days) {
          bookedDays.add(d);
        }
      }
    });

    return Math.round((bookedDays.size / days) * 100);
  }, [property.bookedRanges, property.occupancyPct, days]);

  return (
    <>
      <Box sx={{
        position: 'sticky', left: 0, zIndex: 5,
        bgcolor: t.bg1, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
        p: '8px 10px', display: 'flex', alignItems: 'center', gap: 0.875,
        minHeight: rowHeight,
      }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '6px', background: PHOTO_GRAD[property.photoColor], flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {property.name}
          </Typography>
          <Typography sx={{ fontSize: 9.5, fontFamily: 'Geist Mono', color: t.text3, mt: 0.25, lineHeight: 1.2 }}>
            <Box component="strong" sx={{ color: occupancyPct > 70 ? '#16a34a' : occupancyPct > 40 ? '#f59e0b' : t.text2, fontWeight: 700 }}>Occ {occupancyPct}%</Box>
            {' · '}
            {property.city.toUpperCase()}
          </Typography>
        </Box>
      </Box>

      {Array.from({ length: days }).map((_, i) => {
        const h = headers[i];
        const range = property.bookedRanges.find(([s, e]) => i >= s && i <= e);
        const status: CellStatus =
          property.closedDays?.includes(i) ? 'closed' :
          range ? 'booked' : 'available';
        const isStart = range && range[0] === i;
        const isEnd = range && range[1] === i;
        const basePrice = h.weekend ? 210 : 180;
        const price = Math.round(basePrice + Math.sin(i * 0.6) * 15);
        const aiDiff = h.weekend && status === 'available' ? Math.round(8 + Math.random() * 15) : 0;
        const guestInitials = status === 'booked' ? ['SJ','MR','AK','JP','LN'][(i * 3) % 5] : '';

        return (
          <Box
            key={i}
            onClick={() => onCellClick?.(property.id, i)}
            sx={{
              position: 'relative',
              borderLeft: `1px solid ${t.border}`,
              borderBottom: `1px solid ${t.border}`,
              minHeight: rowHeight, p: '5px 3px',
              fontFamily: 'Geist Mono', cursor: 'pointer',
              transition: 'all 0.12s',
              bgcolor:
                status === 'closed' ? 'repeating-linear-gradient(45deg,#e7e5e0,#e7e5e0 3px,#efece5 3px,#efece5 6px)' :
                status === 'booked' ? 'rgba(239,68,68,0.10)' :
                status === 'available' ? t.successTint :
                h.isToday ? 'rgba(230,176,34,0.04)' :
                h.weekend ? 'rgba(0,0,0,0.02)' : 'transparent',
              background:
                status === 'closed'
                  ? 'repeating-linear-gradient(45deg,#e7e5e0,#e7e5e0 3px,#efece5 3px,#efece5 6px)'
                  : undefined,
              '&:hover': { boxShadow: `inset 0 0 0 1.5px ${t.primary}` },
              ...(isStart && { boxShadow: `inset 3px 0 0 ${t.error}` }),
              ...(isEnd && { boxShadow: `inset -3px 0 0 ${t.error}` }),
            }}
          >
            {showPrices && (
              <>
                {aiDiff > 0 && status === 'available' && (
                  <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: t.primary }} />
                )}
                {status === 'available' && (
                  <>
                    <Box sx={{ fontSize: 10.5, fontWeight: 700, color: t.text2, textAlign: 'center' }}>€{price}</Box>
                    {aiDiff > 0 && (
                      <Box sx={{ fontSize: 8.5, fontWeight: 700, color: '#047857', textAlign: 'center', mt: 0.125 }}>
                        ⬆+€{aiDiff}
                      </Box>
                    )}
                  </>
                )}
                {status === 'booked' && (
                  <>
                    <Box sx={{ fontSize: 9.5, fontWeight: 700, color: '#b91c1c', textAlign: 'center' }}>€{price}</Box>
                    <Box sx={{ fontSize: 8.5, color: '#b91c1c', textAlign: 'center', fontWeight: 600, mt: 0.125 }}>{guestInitials}</Box>
                  </>
                )}
              </>
            )}
          </Box>
        );
      })}

      {/* Reservation blocks overlay - positioned absolutely over the grid */}
      {property.reservations?.map((reservation, resIdx) => {
        const blockWidth = (reservation.endDay - reservation.startDay + 1) * cellWidth - 8;
        const blockLeft = 180 + reservation.startDay * cellWidth + 4; // ✅ 230 → 180 (colonne réduite)

        // ✅ Position à mi-hauteur + offset vertical par réservation pour voir les limites
        const baseTop = headerHeight + rowIndex * rowHeight;
        const verticalOffset = (resIdx % 2) * 4; // Alterne légèrement
        const blockTop = baseTop + rowHeight / 2 - 16 + verticalOffset; // Centré à mi-hauteur

        const bgColor = reservation.status === 'confirmed' ? '#10b981' : '#f59e0b';

        return (
          <Box
            key={reservation.id}
            sx={{
              position: 'absolute',
              left: `${blockLeft}px`,
              top: `${blockTop}px`,
              width: `${blockWidth}px`,
              height: 32, // ✅ RÉDUIT: 44px → 32px
              bgcolor: bgColor,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              px: 1.25,
              gap: 0.625,
              color: '#fff',
              fontWeight: 600,
              fontSize: 11.5,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              zIndex: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid rgba(255,255,255,0.2)', // ✅ Bordure pour voir les limites
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              },
            }}
          >
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {reservation.guestName} {reservation.guestFlag}
            </Typography>
            <Box sx={{ ml: 'auto', fontSize: 11.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {reservation.amount}
            </Box>
          </Box>
        );
      })}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Example wiring with the existing CalendarPage:
//
//   const [view, setView] = useState<'single' | 'multi'>('single');
//
//   <ViewToggle
//     options={[
//       { value: 'single', label: '📅 Une propriété' },
//       { value: 'multi',  label: '📊 Vue multi' },
//     ]}
//     value={view}
//     onChange={(v) => setView(v as 'single' | 'multi')}
//   />
//
//   {view === 'multi' ? (
//     <MultiPropertyInventory
//       properties={[
//         { id: 'p1', name: 'Villa Belvédère', city: 'Nice', photoColor: 'gold', occupancyPct: 87, monthRevenue: '€8,420', bookedRanges: [[3,9],[16,22]] },
//         { id: 'p2', name: 'Dar Sojori', city: 'Marrakech', photoColor: 'blue', occupancyPct: 92, monthRevenue: '€6,200', bookedRanges: [[0,5],[10,14],[20,28]] },
//         // …
//       ]}
//       onCellClick={(propertyId, dayIdx) => openDrawer(propertyId, dayIdx)}
//     />
//   ) : (
//     <CalendarPage />
//   )}
// ════════════════════════════════════════════════════════════════════
