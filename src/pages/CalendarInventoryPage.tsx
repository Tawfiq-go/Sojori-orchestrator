import React, { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Select, MenuItem, Drawer, IconButton, TextField, Switch,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge, ViewToggle,
  btnGhostSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { MultiPropertyInventory, type PropertyRow } from '../components/MultiPropertyInventory';

// ════════════════════════════════════════════════════════════════════
// Sojori — Calendrier · Inventaire & Prix
// Vue mensuelle par propriété avec prix, dispo, dynamic pricing, sync canaux,
// drag-select bulk + panel latéral édition.
// ════════════════════════════════════════════════════════════════════

type DayStatus = 'available' | 'booked' | 'closed' | 'pending';

interface DayCell {
  date: string;            // YYYY-MM-DD
  day: number;
  weekday: number;         // 0=Sun … 6=Sat
  inMonth: boolean;
  status: DayStatus;
  price: number;
  suggestedPrice?: number; // AI suggestion
  minNights?: number;
  checkInAllowed?: boolean;
  checkOutAllowed?: boolean;
  bookedBy?: { initials: string; name: string; source: 'airbnb' | 'booking' | 'direct' };
  channels?: { airbnb: 'ok' | 'pending' | 'error'; booking: 'ok' | 'pending' | 'error'; direct: 'ok' };
  isToday?: boolean;
}

const PROPERTIES = [
  { id: 'p1', name: 'Villa Belvédère',  city: 'Nice',        color: '#d97706' },
  { id: 'p2', name: 'Dar Sojori',       city: 'Marrakech',   color: '#0e7490' },
  { id: 'p3', name: 'Villa Atlas',      city: 'Marrakech',   color: '#7c3aed' },
  { id: 'p4', name: 'Atlas Loft',       city: 'Marrakech',   color: '#16a34a' },
  { id: 'p5', name: 'Médina House',     city: 'Marrakech',   color: '#ec4899' },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// Generate mock days for a given month
function generateDays(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Monday=0
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells: DayCell[] = [];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const d = new Date(year, month, dayNum);
    const wd = (d.getDay() + 6) % 7;
    const weekend = wd >= 5;
    const basePrice = weekend ? 210 : 180;
    const variance = Math.sin(dayNum * 0.7) * 15;
    const price = Math.round(basePrice + variance);
    const suggested = wd >= 4 ? price + Math.round(5 + Math.random() * 15) : undefined;
    // Mock bookings
    let status: DayStatus = 'available';
    let bookedBy;
    if (inMonth && (dayNum === 4 || dayNum === 5 || dayNum === 11 || dayNum === 12 || dayNum === 18 || dayNum === 19 || dayNum === 25)) {
      status = 'booked';
      bookedBy = { initials: ['SJ','MR','AK','JP','LN'][dayNum % 5], name: 'Sarah Johnson', source: 'airbnb' as const };
    }
    if (inMonth && (dayNum === 22 || dayNum === 23)) status = 'closed';

    cells.push({
      date: `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`,
      day: dayNum, weekday: wd, inMonth, status, price,
      suggestedPrice: suggested, minNights: weekend ? 2 : 1,
      checkInAllowed: true, checkOutAllowed: true,
      bookedBy,
      channels: { airbnb: 'ok', booking: dayNum % 7 === 0 ? 'pending' : 'ok', direct: 'ok' },
      isToday: isCurrentMonth && today.getDate() === dayNum && inMonth,
    });
  }
  return cells;
}

const STATUS_COLORS: Record<DayStatus, { bg: string; border: string; text: string; emoji: string }> = {
  available: { bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.20)', text: '#047857', emoji: '🟢' },
  booked:    { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.25)',  text: '#b91c1c', emoji: '🔴' },
  closed:    { bg: 'rgba(0,0,0,0.04)',        border: t.borderStrong,           text: t.text3,   emoji: '🔒' },
  pending:   { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.25)', text: '#b45309', emoji: '⏳' },
};

export function CalendarInventoryPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [view, setView] = useState<'single' | 'multi'>('multi');

  // Mock data for multi-property view
  const multiProperties: PropertyRow[] = [
    { id: 'p1', name: 'Villa Belvédère', city: 'Nice', photoColor: 'gold', occupancyPct: 87, monthRevenue: '€8,420', bookedRanges: [[3,9],[16,22]], closedDays: [25,26] },
    { id: 'p2', name: 'Dar Sojori', city: 'Marrakech', photoColor: 'blue', occupancyPct: 92, monthRevenue: '€6,200', bookedRanges: [[0,5],[10,14],[20,28]] },
    { id: 'p3', name: 'Villa Atlas', city: 'Marrakech', photoColor: 'purple', occupancyPct: 78, monthRevenue: '€5,890', bookedRanges: [[7,12],[18,24]] },
    { id: 'p4', name: 'Atlas Loft', city: 'Marrakech', photoColor: 'green', occupancyPct: 85, monthRevenue: '€4,320', bookedRanges: [[2,8],[15,21]] },
    { id: 'p5', name: 'Médina House', city: 'Marrakech', photoColor: 'pink', occupancyPct: 90, monthRevenue: '€7,150', bookedRanges: [[1,6],[13,19],[22,27]] },
  ];

  const property = PROPERTIES.find(p => p.id === propertyId)!;
  const days = useMemo(() => generateDays(year, month), [year, month]);
  const selectedCell = selectedDate ? days.find(d => d.date === selectedDate) : null;

  // Inventory stats
  const stats = useMemo(() => {
    const inMonth = days.filter(d => d.inMonth);
    return {
      available: inMonth.filter(d => d.status === 'available').length,
      booked:    inMonth.filter(d => d.status === 'booked').length,
      closed:    inMonth.filter(d => d.status === 'closed').length,
      occupancy: Math.round(inMonth.filter(d => d.status === 'booked').length / inMonth.length * 100),
      revenue:   inMonth.filter(d => d.status === 'booked').reduce((s, d) => s + d.price, 0),
      aiOpportunity: inMonth.filter(d => d.suggestedPrice && d.suggestedPrice > d.price).reduce((s, d) => s + (d.suggestedPrice! - d.price), 0),
    };
  }, [days]);

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const onDayMouseDown = (date: string) => { setDragStart(date); setSelection([date]); };
  const onDayMouseEnter = (date: string) => {
    if (!dragStart) return;
    const allDates = days.map(d => d.date);
    const a = allDates.indexOf(dragStart), b = allDates.indexOf(date);
    const [from, to] = a < b ? [a, b] : [b, a];
    setSelection(allDates.slice(from, to + 1));
  };
  const onDayMouseUp = () => setDragStart(null);
  const onDayClick = (date: string) => {
    if (selection.length <= 1) setSelectedDate(date);
  };

  return (
    <DashboardWrapper breadcrumb={['Calendrier']}>
      <Box sx={{ p: { xs: 2, md: '0' }, maxWidth: 1500, mx: 'auto' }} onMouseUp={onDayMouseUp}>
      <PageHeader title="Calendrier · Inventaire & Prix">
        <ViewToggle
          options={[
            { value: 'single', label: '📅 Une propriété' },
            { value: 'multi', label: '📊 Vue multi' }
          ]}
          value={view}
          onChange={(v) => setView(v as 'single' | 'multi')}
        />
        {view === 'single' && (
          <Select size="small" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} sx={{ fontSize: 13, minWidth: 220 }}>
            {PROPERTIES.map(p => (
              <MenuItem key={p.id} value={p.id} sx={{ fontSize: 13 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                  <span>{p.name}</span>
                  <span style={{ color: t.text3, fontSize: 11 }}>· {p.city}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        )}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '8px', p: 0.375 }}>
          <IconButton size="small" onClick={() => navMonth(-1)} sx={{ width: 28, height: 28 }}>‹</IconButton>
          <Typography sx={{ px: 1.5, fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</Typography>
          <IconButton size="small" onClick={() => navMonth(1)} sx={{ width: 28, height: 28 }}>›</IconButton>
        </Stack>
        <Button sx={btnGhostSx}>🔄 Sync canaux</Button>
        <Button sx={btnPrimarySx}>💾 Sauvegarder</Button>
      </PageHeader>

      {/* Stats row */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1.5 }}>
        <StatPill color={t.success} label="Disponibles" value={`${stats.available}j`} />
        <StatPill color={t.error}   label="Réservés"    value={`${stats.booked}j`} />
        <StatPill color={t.text3}   label="Fermés"      value={`${stats.closed}j`} />
        <StatPill color={t.primary} label="Occupation"  value={`${stats.occupancy}%`} />
        <StatPill color={t.text}    label="Revenu"      value={`€${stats.revenue.toLocaleString('fr')}`} />
        <StatPill color={t.ai}      label="✨ Manque-à-gagner AI" value={`+€${stats.aiOpportunity}`} highlight />
      </Stack>

      {/* Calendar */}
      {view === 'multi' ? (
        <MultiPropertyInventory
          properties={multiProperties}
          startDate={new Date(year, month, 1)}
          days={30}
          onCellClick={(propertyId, dayIdx) => {
            // TODO: Open drawer for specific property + day
            console.log('Clicked:', propertyId, dayIdx);
          }}
        />
      ) : (
        <Panel title={`${property.name} · ${property.city}`} desc={`${MONTHS[month]} ${year}`}>
        {/* Weekday header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
          {WEEKDAYS.map(w => (
            <Typography key={w} sx={{
              fontSize: 10.5, fontFamily: 'Geist Mono', fontWeight: 700,
              color: t.text3, letterSpacing: 1, textTransform: 'uppercase',
              textAlign: 'center', py: 0.5,
            }}>{w}</Typography>
          ))}
        </Box>
        {/* Days grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map(d => (
            <DayCellView
              key={d.date} cell={d}
              selected={selection.includes(d.date)}
              onMouseDown={() => onDayMouseDown(d.date)}
              onMouseEnter={() => onDayMouseEnter(d.date)}
              onClick={() => onDayClick(d.date)}
            />
          ))}
        </Box>

        {/* Legend */}
        <Stack direction="row" spacing={2.5} sx={{ mt: 2.5, pt: 2, borderTop: `1px dashed ${t.border}`, flexWrap: 'wrap', rowGap: 1 }}>
          <LegendItem emoji="🟢" label="Disponible" />
          <LegendItem emoji="🔴" label="Réservé" />
          <LegendItem emoji="🔒" label="Fermé" />
          <LegendItem dot={t.primary} label="✨ Prix AI différent" />
          <Box sx={{ ml: 'auto', fontSize: 11, color: t.text3, fontFamily: 'Geist Mono' }}>
            Glissez pour sélectionner plusieurs jours
          </Box>
        </Stack>
      </Panel>
      )}

      {/* Bulk actions */}
      {selection.length > 1 && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          bgcolor: t.text, color: '#fff', px: 2, py: 1.25, borderRadius: '12px',
          display: 'flex', gap: 1.5, alignItems: 'center', zIndex: 1200,
          boxShadow: '0 16px 40px rgba(0,0,0,0.30)',
        }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{selection.length} jours sélectionnés</Typography>
          <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 11.5 }}>💰 Modifier prix</Button>
          <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 11.5 }}>🔒 Fermer dates</Button>
          <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 11.5 }}>⏱ Restrictions</Button>
          <IconButton size="small" onClick={() => setSelection([])} sx={{ color: '#fff' }}>✕</IconButton>
        </Box>
      )}

      {/* Side drawer */}
      <Drawer anchor="right" open={!!selectedCell} onClose={() => setSelectedDate(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 2.5 } }}>
        {selectedCell && <DayDetailPanel cell={selectedCell} onClose={() => setSelectedDate(null)} />}
      </Drawer>
      </Box>
    </DashboardWrapper>
  );
}

// ─── Day cell ───────────────────────────────────────────────────
function DayCellView({ cell, selected, onMouseDown, onMouseEnter, onClick }: {
  cell: DayCell;
  selected: boolean;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const sty = STATUS_COLORS[cell.status];
  const aiHigher = cell.suggestedPrice && cell.suggestedPrice > cell.price;
  const aiLower = cell.suggestedPrice && cell.suggestedPrice < cell.price;
  const aiDiff = cell.suggestedPrice ? cell.suggestedPrice - cell.price : 0;

  return (
    <Box
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      sx={{
        position: 'relative',
        minHeight: 92, p: 1, borderRadius: '8px',
        border: '1px solid', borderColor: sty.border,
        bgcolor: cell.inMonth ? sty.bg : 'transparent',
        opacity: cell.inMonth ? 1 : 0.25,
        borderLeft: cell.suggestedPrice ? `3px solid ${t.primary}` : `1px solid ${sty.border}`,
        cursor: cell.inMonth ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
        outline: selected ? `2px solid ${t.primary}` : 'none',
        outlineOffset: -1,
        ...(cell.isToday && {
          bgcolor: t.primaryTint,
          borderColor: t.primary,
          boxShadow: `0 0 0 1px ${t.primary}`,
        }),
        '&:hover': cell.inMonth ? {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(26,20,8,0.08)',
          zIndex: 2,
        } : {},
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{
          fontSize: 12, fontWeight: cell.isToday ? 800 : 600,
          color: cell.isToday ? t.primaryDeep : t.text,
          fontFamily: 'Geist Mono',
        }}>{cell.day}</Typography>
        {cell.inMonth && <Box sx={{ fontSize: 11 }}>{sty.emoji}</Box>}
      </Stack>

      {cell.inMonth && (
        <>
          {cell.status === 'booked' && cell.bookedBy ? (
            <Stack spacing={0.5}>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                bgcolor: '#fff', border: `1px solid ${sty.border}`, borderRadius: '4px',
                p: '1px 5px', alignSelf: 'flex-start',
              }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: t.error, color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cell.bookedBy.initials}</Box>
                <Typography sx={{ fontSize: 9, color: sty.text, fontWeight: 600 }}>{cell.bookedBy.source}</Typography>
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono', color: t.text2 }}>€{cell.price}</Typography>
            </Stack>
          ) : cell.status === 'available' ? (
            <Stack spacing={0.25}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono', color: t.text, lineHeight: 1.1 }}>€{cell.price}</Typography>
              {cell.suggestedPrice && (
                <Typography sx={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'Geist Mono',
                  color: aiHigher ? '#047857' : aiLower ? '#b91c1c' : t.primary,
                  display: 'flex', alignItems: 'center', gap: 0.25,
                }}>
                  {aiHigher ? '⬆' : aiLower ? '⬇' : ''} {aiHigher ? '+' : ''}€{Math.abs(aiDiff)}
                </Typography>
              )}
              {cell.minNights && cell.minNights > 1 && (
                <Typography sx={{ fontSize: 9, color: t.text3, fontFamily: 'Geist Mono', mt: 0.25 }}>
                  min {cell.minNights}n
                </Typography>
              )}
            </Stack>
          ) : cell.status === 'closed' ? (
            <Typography sx={{ fontSize: 10, color: t.text3, fontStyle: 'italic' }}>Fermé</Typography>
          ) : null}

          {/* Sync dots */}
          {cell.status !== 'closed' && cell.channels && (
            <Stack direction="row" spacing={0.375} sx={{ position: 'absolute', bottom: 6, right: 6 }}>
              {(['airbnb','booking','direct'] as const).map(ch => {
                const st = cell.channels![ch];
                return <Box key={ch} sx={{
                  width: 5, height: 5, borderRadius: '50%',
                  bgcolor: st === 'ok' ? t.success : st === 'pending' ? t.warning : t.error,
                }} />;
              })}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

// ─── Day detail drawer ──────────────────────────────────────────
function DayDetailPanel({ cell, onClose }: { cell: DayCell; onClose: () => void }) {
  const sty = STATUS_COLORS[cell.status];
  const aiHigher = cell.suggestedPrice && cell.suggestedPrice > cell.price;
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 1, textTransform: 'uppercase' }}>{cell.date}</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, mt: 0.25 }}>
            {cell.day} {MONTHS[Number(cell.date.split('-')[1]) - 1]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">✕</IconButton>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Badge variant={cell.status === 'available' ? 'success' : cell.status === 'booked' ? 'error' : 'neutral'} dot>
          {cell.status === 'available' ? 'Disponible' : cell.status === 'booked' ? 'Réservé' : 'Fermé'}
        </Badge>
        {cell.isToday && <Badge variant="gold" dot>Aujourd'hui</Badge>}
      </Stack>

      {/* Price */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>Prix</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: 'Geist Mono' }}>€{cell.price}</Typography>
          <Typography sx={{ fontSize: 12, color: t.text3 }}>/nuit</Typography>
        </Stack>
        {cell.suggestedPrice && (
          <Box sx={{
            mt: 1.25, p: 1.25, borderRadius: '8px',
            bgcolor: t.aiTint, border: '1px solid rgba(139,92,246,0.20)',
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Box sx={{ fontSize: 13 }}>✨</Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.ai, fontFamily: 'Geist Mono', letterSpacing: 0.5 }}>SOJORI AI · suggestion</Typography>
            </Stack>
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, fontFamily: 'Geist Mono', color: t.ai }}>€{cell.suggestedPrice}</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono', color: aiHigher ? '#047857' : '#b91c1c', fontWeight: 700 }}>
                {aiHigher ? '+' : ''}€{cell.suggestedPrice - cell.price} ({Math.round(((cell.suggestedPrice - cell.price) / cell.price) * 100)}%)
              </Typography>
            </Stack>
            <Button size="small" sx={{ ...btnPrimarySx, mt: 1, width: '100%', justifyContent: 'center' }}>
              Appliquer €{cell.suggestedPrice}
            </Button>
          </Box>
        )}
        <Box sx={{ mt: 1.25 }}>
          <TextField size="small" label="Modifier le prix" defaultValue={cell.price} fullWidth InputProps={{ startAdornment: <Box sx={{ pr: 0.5, color: t.text3 }}>€</Box> }} />
        </Box>
      </Panel>

      {/* Restrictions */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>Restrictions</Typography>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 12.5 }}>Min nuits</Typography>
            <TextField size="small" defaultValue={cell.minNights || 1} sx={{ width: 70 }} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 12.5 }}>Check-in autorisé</Typography>
            <Switch size="small" defaultChecked={cell.checkInAllowed} color="success" />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 12.5 }}>Check-out autorisé</Typography>
            <Switch size="small" defaultChecked={cell.checkOutAllowed} color="success" />
          </Stack>
        </Stack>
      </Panel>

      {/* Channels sync */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>Canaux</Typography>
        <Stack spacing={1}>
          {(['airbnb','booking','direct'] as const).map(ch => {
            const st = cell.channels?.[ch] || 'ok';
            return (
              <Stack key={ch} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: st === 'ok' ? t.success : st === 'pending' ? t.warning : t.error }} />
                <Typography sx={{ fontSize: 12.5, textTransform: 'capitalize', flex: 1 }}>{ch}</Typography>
                <Typography sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono' }}>
                  {st === 'ok' ? 'Synced · il y a 2h' : st === 'pending' ? 'Sync en cours' : 'Erreur'}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Panel>

      {/* Actions */}
      <Stack direction="row" spacing={1}>
        <Button sx={{ ...btnGhostSx, flex: 1 }}>🔒 Fermer date</Button>
        <Button sx={{ ...btnGhostSx, flex: 1 }}>🚫 Bloquer</Button>
      </Stack>
      <Button sx={btnPrimarySx} fullWidth>💾 Sauvegarder modifications</Button>
    </Stack>
  );
}

function StatPill({ color, label, value, highlight }: { color: string; label: string; value: string; highlight?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{
      px: 1.5, py: 1, bgcolor: t.bg1,
      border: `1px solid ${highlight ? 'rgba(139,92,246,0.30)' : t.border}`,
      borderRadius: '10px',
      boxShadow: highlight ? '0 4px 12px rgba(139,92,246,0.12)' : 'none',
    }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Box>
        <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Geist Mono', color: highlight ? t.ai : t.text }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

function LegendItem({ emoji, dot, label }: { emoji?: string; dot?: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 11, color: t.text3 }}>
      {emoji ? <Box sx={{ fontSize: 11 }}>{emoji}</Box> : <Box sx={{ width: 10, height: 3, bgcolor: dot, borderRadius: '99px' }} />}
      <span>{label}</span>
    </Stack>
  );
}
