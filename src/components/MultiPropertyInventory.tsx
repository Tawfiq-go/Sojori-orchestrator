// ════════════════════════════════════════════════════════════════════
// Sojori — Multi-Property Inventory Gantt View
// Drop-in React + MUI component (extends CalendarPage.tsx)
//
// 1 line per listing × 30 columns (days) · horizontal scroll · sticky header & first column.
// Click a cell → open the single-day drawer (reuse from CalendarPage.tsx).
// ════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { Panel, btnGhostSx, btnPrimarySx, tokens as t } from './dashboard/DashboardV2.components';

type CellStatus = 'available' | 'booked' | 'closed';

export type PropertyRow = {
  id: string;
  name: string;
  city: string;
  photoColor: 'gold' | 'blue' | 'purple' | 'green' | 'pink';
  occupancyPct: number;
  monthRevenue: string;
  bookedRanges: [number, number][]; // [startDayIdx, endDayIdx] inclusive
  closedDays?: number[];
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
}: {
  startDate?: Date;
  days?: number;
  properties: PropertyRow[];
  onCellClick?: (propertyId: string, dayIdx: number) => void;
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
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: `230px repeat(${days}, minmax(64px, 1fr))`,
          minWidth: 'max-content',
        }}>
          {/* Header */}
          <Box sx={{
            position: 'sticky', left: 0, zIndex: 6,
            bgcolor: t.bg2, borderRight: `1px solid ${t.border}`,
            p: '12px 16px',
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
          {properties.map(p => (
            <PropertyRowView
              key={p.id}
              property={p}
              days={days}
              headers={headers}
              onCellClick={onCellClick}
            />
          ))}
        </Box>
      </Box>
    </Panel>
  );
}

function PropertyRowView({
  property, days, headers, onCellClick,
}: {
  property: PropertyRow;
  days: number;
  headers: DayHeader[];
  onCellClick?: (propertyId: string, dayIdx: number) => void;
}) {
  return (
    <>
      <Box sx={{
        position: 'sticky', left: 0, zIndex: 5,
        bgcolor: t.bg1, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
        p: '10px 14px', display: 'flex', alignItems: 'center', gap: 1.125,
      }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: PHOTO_GRAD[property.photoColor], flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {property.name}
          </Typography>
          <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 0.3, mt: 0.25 }}>
            {property.city.toUpperCase()}
          </Typography>
          <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', color: t.text3, mt: 0.375 }}>
            Occ <Box component="strong" sx={{ color: t.text2, fontWeight: 700 }}>{property.occupancyPct}%</Box> · <Box component="strong" sx={{ color: t.text2, fontWeight: 700 }}>{property.monthRevenue}</Box>
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
              minHeight: 64, p: '6px 4px',
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
            {aiDiff > 0 && status === 'available' && (
              <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: t.primary }} />
            )}
            {status === 'available' && (
              <>
                <Box sx={{ fontSize: 11, fontWeight: 700, color: t.text2, textAlign: 'center' }}>€{price}</Box>
                {aiDiff > 0 && (
                  <Box sx={{ fontSize: 9, fontWeight: 700, color: '#047857', textAlign: 'center', mt: 0.125 }}>
                    ⬆+€{aiDiff}
                  </Box>
                )}
              </>
            )}
            {status === 'booked' && (
              <>
                <Box sx={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', textAlign: 'center' }}>€{price}</Box>
                <Box sx={{ fontSize: 9, color: '#b91c1c', textAlign: 'center', fontWeight: 600, mt: 0.125 }}>{guestInitials}</Box>
              </>
            )}
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
