import { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Select, MenuItem, Drawer, IconButton,
  TextField, Switch, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge, StatCard, StatsRow,
  btnGhostSx, btnPrimarySx, btnAiSx, FilterBar, FilterChip,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

// ════════════════════════════════════════════════════════════════════
// Sojori — Inventaire & Disponibilités
// Vue calendrier par listing avec disponibilités, prix, restrictions
// Mode MOCK avec données factices réalistes
// ════════════════════════════════════════════════════════════════════

type DayStatus = 'available' | 'booked' | 'blocked' | 'closed';
type FilterStatus = 'all' | 'available' | 'booked' | 'blocked' | 'closed';

interface ListingOption {
  id: string;
  name: string;
  city: string;
  bedrooms: number;
  color: string;
}

interface DayCell {
  date: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  status: DayStatus;
  basePrice: number;
  dynamicPrice?: number;
  minNights: number;
  checkInAllowed: boolean;
  checkOutAllowed: boolean;
  bookedBy?: { name: string; source: 'airbnb' | 'booking' | 'vrbo' | 'direct' };
  channels: { airbnb: 'ok' | 'pending' | 'error'; booking: 'ok' | 'pending' | 'error'; vrbo: 'ok' | 'pending' | 'error' };
  isToday?: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────
const LISTINGS: ListingOption[] = [
  { id: 'L001', name: 'Villa Belvédère', city: 'Nice', bedrooms: 4, color: '#d97706' },
  { id: 'L002', name: 'Dar Sojori', city: 'Marrakech', bedrooms: 5, color: '#0e7490' },
  { id: 'L003', name: 'Villa Atlas', city: 'Marrakech', bedrooms: 3, color: '#7c3aed' },
  { id: 'L004', name: 'Atlas Loft', city: 'Marrakech', bedrooms: 2, color: '#16a34a' },
  { id: 'L005', name: 'Médina House', city: 'Marrakech', bedrooms: 4, color: '#ec4899' },
  { id: 'L006', name: 'Riad Zahra', city: 'Marrakech', bedrooms: 6, color: '#f59e0b' },
  { id: 'L007', name: 'Côte d\'Azur Villa', city: 'Nice', bedrooms: 5, color: '#06b6d4' },
  { id: 'L008', name: 'Palais Bahia', city: 'Marrakech', bedrooms: 7, color: '#8b5cf6' },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// Generate realistic mock calendar data
function generateInventoryDays(year: number, month: number, listingId: string): DayCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells: DayCell[] = [];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Base price varies by listing
  const basePriceMap: Record<string, number> = {
    'L001': 350, 'L002': 280, 'L003': 220, 'L004': 180,
    'L005': 260, 'L006': 320, 'L007': 400, 'L008': 450,
  };
  const basePrice = basePriceMap[listingId] || 200;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const d = new Date(year, month, dayNum);
    const wd = (d.getDay() + 6) % 7;
    const weekend = wd >= 5;

    // Dynamic pricing logic
    const variance = Math.sin(dayNum * 0.5) * 20;
    const weekendBoost = weekend ? 50 : 0;
    const currentPrice = Math.round(basePrice + variance + weekendBoost);
    const dynamicSuggestion = weekend ? currentPrice + Math.round(Math.random() * 30) : undefined;

    // Mock bookings (realistic pattern)
    let status: DayStatus = 'available';
    let bookedBy;
    const bookedDays = [3,4,5,10,11,12,13,17,18,19,25,26,27];
    const blockedDays = [7,21];
    const closedDays = [28,29,30];

    if (inMonth && bookedDays.includes(dayNum)) {
      status = 'booked';
      const guests = [
        { name: 'Sarah Johnson', source: 'airbnb' as const },
        { name: 'Mohamed Alami', source: 'booking' as const },
        { name: 'Pierre Dubois', source: 'vrbo' as const },
        { name: 'Direct Guest', source: 'direct' as const },
      ];
      bookedBy = guests[dayNum % guests.length];
    } else if (inMonth && blockedDays.includes(dayNum)) {
      status = 'blocked';
    } else if (inMonth && closedDays.includes(dayNum)) {
      status = 'closed';
    }

    // Channel sync status (realistic)
    const hasError = dayNum % 17 === 0;
    const isPending = dayNum % 11 === 0;

    cells.push({
      date: `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`,
      day: dayNum,
      weekday: wd,
      inMonth,
      status,
      basePrice: currentPrice,
      dynamicPrice: dynamicSuggestion,
      minNights: weekend ? 2 : 1,
      checkInAllowed: wd !== 2, // No check-in on Tuesdays (example)
      checkOutAllowed: true,
      bookedBy,
      channels: {
        airbnb: hasError ? 'error' : isPending ? 'pending' : 'ok',
        booking: isPending ? 'pending' : 'ok',
        vrbo: hasError ? 'error' : 'ok',
      },
      isToday: isCurrentMonth && today.getDate() === dayNum && inMonth,
    });
  }
  return cells;
}

const STATUS_CONFIG: Record<DayStatus, { bg: string; border: string; text: string; emoji: string; label: string }> = {
  available: { bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.20)', text: '#047857', emoji: '🟢', label: 'Disponible' },
  booked:    { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.25)', text: '#b91c1c', emoji: '🔴', label: 'Réservé' },
  blocked:   { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)', text: '#b45309', emoji: '⏸', label: 'Bloqué' },
  closed:    { bg: 'rgba(0,0,0,0.04)', border: t.borderStrong, text: t.text3, emoji: '🔒', label: 'Fermé' },
};

export function InventoryPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [listingId, setListingId] = useState(LISTINGS[0].id);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [, setPriceEditMode] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState(false);

  const listing = LISTINGS.find(l => l.id === listingId)!;
  const days = useMemo(() => generateInventoryDays(year, month, listingId), [year, month, listingId]);

  const filteredDays = useMemo(() => {
    if (filterStatus === 'all') return days;
    return days.filter(d => d.inMonth && d.status === filterStatus);
  }, [days, filterStatus]);

  const selectedCell = selectedDate ? days.find(d => d.date === selectedDate) : null;

  // Stats calculation
  const stats = useMemo(() => {
    const inMonth = days.filter(d => d.inMonth);
    const available = inMonth.filter(d => d.status === 'available').length;
    const booked = inMonth.filter(d => d.status === 'booked').length;
    const blocked = inMonth.filter(d => d.status === 'blocked').length;
    const closed = inMonth.filter(d => d.status === 'closed').length;
    const totalNights = inMonth.length;
    const occupancy = Math.round((booked / (totalNights - closed)) * 100);
    const revenue = inMonth.filter(d => d.status === 'booked').reduce((s, d) => s + d.basePrice, 0);
    const avgNightPrice = booked > 0 ? Math.round(revenue / booked) : 0;
    const syncErrors = inMonth.filter(d =>
      d.channels.airbnb === 'error' || d.channels.booking === 'error' || d.channels.vrbo === 'error'
    ).length;

    return { available, booked, blocked, closed, occupancy, revenue, avgNightPrice, syncErrors };
  }, [days]);

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const onDayMouseDown = (date: string) => {
    setDragStart(date);
    setSelection([date]);
  };

  const onDayMouseEnter = (date: string) => {
    if (!dragStart) return;
    const allDates = days.map(d => d.date);
    const a = allDates.indexOf(dragStart);
    const b = allDates.indexOf(date);
    const [from, to] = a < b ? [a, b] : [b, a];
    setSelection(allDates.slice(from, to + 1));
  };

  const onDayMouseUp = () => setDragStart(null);

  const onDayClick = (date: string) => {
    if (selection.length <= 1) setSelectedDate(date);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Inventaire']}>
      <Box sx={{ width: '100%' }} onMouseUp={onDayMouseUp}>
        <PageHeader title="Inventaire & Disponibilités" count={`${stats.available}/${days.filter(d => d.inMonth).length} jours`}>
          <Select
            size="small"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            sx={{ fontSize: 13, minWidth: 260 }}
          >
            {LISTINGS.map(l => (
              <MenuItem key={l.id} value={l.id} sx={{ fontSize: 13 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                  <span>{l.name}</span>
                  <span style={{ color: t.text3, fontSize: 11 }}>· {l.city} · {l.bedrooms}ch</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center',  bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '8px', p: 0.375 }}>
            <IconButton size="small" onClick={() => navMonth(-1)} sx={{ width: 28, height: 28 }}>‹</IconButton>
            <Typography sx={{ px: 1.5, fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </Typography>
            <IconButton size="small" onClick={() => navMonth(1)} sx={{ width: 28, height: 28 }}>›</IconButton>
          </Stack>
          <Button sx={btnGhostSx} onClick={() => setExpandedColumns(!expandedColumns)}>
            {expandedColumns ? '📋 Vue simple' : '📊 Voir plus'}
          </Button>
          <Button sx={btnGhostSx}>🔄 Sync canaux</Button>
          <Button sx={btnPrimarySx}>💾 Sauvegarder</Button>
        </PageHeader>

        {/* Stats Row */}
        <StatsRow sx={{ mb: 3 }}>
          <StatCard
            icon="🟢"
            iconBg={t.successTint}
            iconColor={t.success}
            value={stats.available}
            label="Jours disponibles"
          />
          <StatCard
            icon="📊"
            iconBg={t.primaryTint}
            iconColor={t.primary}
            value={`${stats.occupancy}%`}
            label="Taux d'occupation"
            trend="+5%"
            trendUp
          />
          <StatCard
            icon="💰"
            iconBg={t.infoTint}
            iconColor={t.info}
            value={`€${stats.revenue.toLocaleString('fr')}`}
            label="Revenu prévisionnel"
          />
          <StatCard
            icon="💵"
            iconBg={t.warningTint}
            iconColor={t.warning}
            value={`€${stats.avgNightPrice}`}
            label="Prix moyen/nuit"
          />
        </StatsRow>

        {/* Filters */}
        <FilterBar>
          <FilterChip label="Tous" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
          <FilterChip label={`🟢 Disponibles (${stats.available})`} active={filterStatus === 'available'} onClick={() => setFilterStatus('available')} />
          <FilterChip label={`🔴 Réservés (${stats.booked})`} active={filterStatus === 'booked'} onClick={() => setFilterStatus('booked')} />
          <FilterChip label={`⏸ Bloqués (${stats.blocked})`} active={filterStatus === 'blocked'} onClick={() => setFilterStatus('blocked')} />
          <FilterChip label={`🔒 Fermés (${stats.closed})`} active={filterStatus === 'closed'} onClick={() => setFilterStatus('closed')} />
          {stats.syncErrors > 0 && (
            <Chip
              label={`⚠️ ${stats.syncErrors} erreurs sync`}
              size="small"
              sx={{ bgcolor: t.errorTint, color: t.error, fontWeight: 600, fontSize: 12 }}
            />
          )}
        </FilterBar>

        {/* Calendar View */}
        <Panel>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              {listing.name} · {listing.city}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono' }}>
                Glissez pour sélectionner plusieurs jours
              </Typography>
            </Stack>
          </Stack>

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
            {filteredDays.map(d => (
              <DayCellView
                key={d.date}
                cell={d}
                selected={selection.includes(d.date)}
                expanded={expandedColumns}
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
            <LegendItem emoji="⏸" label="Bloqué" />
            <LegendItem emoji="🔒" label="Fermé" />
            <LegendItem dot={t.primary} label="✨ Prix dynamique suggéré" />
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Box sx={{ fontSize: 10, color: t.success }}>● Sync OK</Box>
              <Box sx={{ fontSize: 10, color: t.warning }}>● Sync pending</Box>
              <Box sx={{ fontSize: 10, color: t.error }}>● Erreur sync</Box>
            </Box>
          </Stack>
        </Panel>

        {/* Bulk actions floating bar */}
        {selection.length > 1 && (
          <Box sx={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            bgcolor: t.text, color: '#fff', px: 2.5, py: 1.5, borderRadius: '12px',
            display: 'flex', gap: 1.5, alignItems: 'center', zIndex: 1200,
            boxShadow: '0 16px 40px rgba(0,0,0,0.30)',
          }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{selection.length} jours sélectionnés</Typography>
            <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 12 }} onClick={() => setPriceEditMode(true)}>
              💰 Modifier prix
            </Button>
            <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 12 }} onClick={() => setBlockModalOpen(true)}>
              🔒 Bloquer dates
            </Button>
            <Button size="small" sx={{ color: '#fff', textTransform: 'none', fontSize: 12 }}>
              ⏱ Restrictions
            </Button>
            <IconButton size="small" onClick={() => setSelection([])} sx={{ color: '#fff' }}>✕</IconButton>
          </Box>
        )}

        {/* Detail Drawer */}
        <Drawer
          anchor="right"
          open={!!selectedCell}
          onClose={() => setSelectedDate(null)}
          slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, p: 2.5 } } }}
        >
          {selectedCell && <DayDetailPanel cell={selectedCell} onClose={() => setSelectedDate(null)} />}
        </Drawer>

        {/* Block Modal */}
        <Dialog open={blockModalOpen} onClose={() => setBlockModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Bloquer {selection.length} jour(s)</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: t.text2, mb: 2 }}>
              Les dates sélectionnées seront marquées comme bloquées et ne seront pas disponibles à la réservation.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Raison du blocage (optionnel)"
              placeholder="Ex: Travaux, maintenance, réservation personnelle..."
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlockModalOpen(false)} sx={btnGhostSx}>Annuler</Button>
            <Button sx={btnPrimarySx} onClick={() => {
              // TODO: Apply block logic
              setBlockModalOpen(false);
              setSelection([]);
            }}>
              🔒 Bloquer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardWrapper>
  );
}

// ─── Day cell ───────────────────────────────────────────────────
function DayCellView({ cell, selected, expanded, onMouseDown, onMouseEnter, onClick }: {
  cell: DayCell;
  selected: boolean;
  expanded: boolean;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const sty = STATUS_CONFIG[cell.status];
  const hasDynamic = cell.dynamicPrice && cell.dynamicPrice > cell.basePrice;

  return (
    <Box
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      sx={{
        position: 'relative',
        minHeight: expanded ? 120 : 100,
        p: 1,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: sty.border,
        bgcolor: cell.inMonth ? sty.bg : 'transparent',
        opacity: cell.inMonth ? 1 : 0.25,
        borderLeft: hasDynamic ? `3px solid ${t.primary}` : `1px solid ${sty.border}`,
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
      {/* Day number & status */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 0.5 }}>
        <Typography sx={{
          fontSize: 12,
          fontWeight: cell.isToday ? 800 : 600,
          color: cell.isToday ? t.primaryDeep : t.text,
          fontFamily: 'Geist Mono',
        }}>{cell.day}</Typography>
        {cell.inMonth && <Box sx={{ fontSize: 11 }}>{sty.emoji}</Box>}
      </Stack>

      {cell.inMonth && (
        <>
          {/* Price info */}
          <Stack spacing={0.25} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono', color: t.text, lineHeight: 1.1 }}>
              €{cell.basePrice}
            </Typography>
            {cell.dynamicPrice && (
              <Typography sx={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'Geist Mono',
                color: t.primary,
              }}>
                ✨ €{cell.dynamicPrice}
              </Typography>
            )}
          </Stack>

          {/* Expanded info */}
          {expanded && (
            <Stack spacing={0.25} sx={{ fontSize: 9, color: t.text3, fontFamily: 'Geist Mono' }}>
              <Box>Min: {cell.minNights}n</Box>
              <Box>{cell.checkInAllowed ? '✓' : '✗'} Check-in</Box>
              <Box>{cell.checkOutAllowed ? '✓' : '✗'} Check-out</Box>
            </Stack>
          )}

          {/* Booked info */}
          {cell.status === 'booked' && cell.bookedBy && (
            <Typography sx={{ fontSize: 9, color: sty.text, fontWeight: 600, mt: 0.5 }}>
              {cell.bookedBy.source.toUpperCase()}
            </Typography>
          )}

          {/* Sync status dots */}
          <Stack direction="row" spacing={0.375} sx={{ position: 'absolute', bottom: 6, right: 6 }}>
            {(['airbnb', 'booking', 'vrbo'] as const).map(ch => {
              const st = cell.channels[ch];
              return (
                <Box key={ch} sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: st === 'ok' ? t.success : st === 'pending' ? t.warning : t.error,
                }} />
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}

// ─── Day detail drawer ──────────────────────────────────────────
function DayDetailPanel({ cell, onClose }: { cell: DayCell; onClose: () => void }) {
  const sty = STATUS_CONFIG[cell.status];

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 1, textTransform: 'uppercase' }}>
            {cell.date}
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, mt: 0.25 }}>
            {cell.day} {MONTHS[Number(cell.date.split('-')[1]) - 1]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">✕</IconButton>
      </Stack>

      {/* Status */}
      <Stack direction="row" spacing={1}>
        <Badge
          variant={
            cell.status === 'available' ? 'success' :
            cell.status === 'booked' ? 'error' :
            cell.status === 'blocked' ? 'warning' : 'neutral'
          }
          dot
        >
          {sty.label}
        </Badge>
        {cell.isToday && <Badge variant="gold" dot>Aujourd'hui</Badge>}
      </Stack>

      {/* Price */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>
          Prix
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: 'Geist Mono' }}>€{cell.basePrice}</Typography>
          <Typography sx={{ fontSize: 12, color: t.text3 }}>/nuit</Typography>
        </Stack>
        {cell.dynamicPrice && (
          <Box sx={{ mt: 1.25, p: 1.25, borderRadius: '8px', bgcolor: t.aiTint, border: '1px solid rgba(139,92,246,0.20)' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center',  mb: 0.5 }}>
              <Box sx={{ fontSize: 13 }}>✨</Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.ai, fontFamily: 'Geist Mono', letterSpacing: 0.5 }}>
                PRIX DYNAMIQUE · suggestion
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, fontFamily: 'Geist Mono', color: t.ai }}>
                €{cell.dynamicPrice}
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono', color: '#047857', fontWeight: 700 }}>
                +€{cell.dynamicPrice - cell.basePrice} ({Math.round(((cell.dynamicPrice - cell.basePrice) / cell.basePrice) * 100)}%)
              </Typography>
            </Stack>
            <Button size="small" sx={{ ...btnAiSx, mt: 1, width: '100%', justifyContent: 'center' }}>
              Appliquer €{cell.dynamicPrice}
            </Button>
          </Box>
        )}
        <Box sx={{ mt: 1.25 }}>
          <TextField
            size="small"
            label="Modifier le prix"
            defaultValue={cell.basePrice}
            fullWidth
            slotProps={{
              input: {
                startAdornment: <Box sx={{ pr: 0.5, color: t.text3 }}>€</Box>,
              },
            }}
          />
        </Box>
      </Panel>

      {/* Restrictions */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>
          Restrictions
        </Typography>
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12.5 }}>Nuits minimum</Typography>
            <TextField size="small" defaultValue={cell.minNights} sx={{ width: 70 }} />
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12.5 }}>Check-in autorisé</Typography>
            <Switch size="small" defaultChecked={cell.checkInAllowed} color="success" />
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12.5 }}>Check-out autorisé</Typography>
            <Switch size="small" defaultChecked={cell.checkOutAllowed} color="success" />
          </Stack>
        </Stack>
      </Panel>

      {/* Channels sync */}
      <Panel sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1.25 }}>
          Synchronisation canaux
        </Typography>
        <Stack spacing={1}>
          {(['airbnb', 'booking', 'vrbo'] as const).map(ch => {
            const st = cell.channels[ch];
            return (
              <Stack key={ch} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: st === 'ok' ? t.success : st === 'pending' ? t.warning : t.error }} />
                <Typography sx={{ fontSize: 12.5, textTransform: 'capitalize', flex: 1 }}>{ch}</Typography>
                <Typography sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono' }}>
                  {st === 'ok' ? 'Synced · il y a 2h' : st === 'pending' ? 'Sync en cours...' : 'Erreur · Réessayer'}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
        <Button size="small" sx={{ ...btnGhostSx, mt: 1.5, width: '100%' }}>🔄 Forcer la synchronisation</Button>
      </Panel>

      {/* Actions */}
      <Stack direction="row" spacing={1}>
        <Button sx={{ ...btnGhostSx, flex: 1 }}>🔒 Fermer</Button>
        <Button sx={{ ...btnGhostSx, flex: 1 }}>⏸ Bloquer</Button>
      </Stack>
      <Button sx={btnPrimarySx} fullWidth>💾 Sauvegarder modifications</Button>
    </Stack>
  );
}

function LegendItem({ emoji, dot, label }: { emoji?: string; dot?: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center',  fontSize: 11, color: t.text3 }}>
      {emoji ? <Box sx={{ fontSize: 11 }}>{emoji}</Box> : <Box sx={{ width: 10, height: 3, bgcolor: dot, borderRadius: '99px' }} />}
      <span>{label}</span>
    </Stack>
  );
}
