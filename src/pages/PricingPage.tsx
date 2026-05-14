import React, { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, Chip, IconButton, Slider,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge, StatCard, StatsRow, DataTable, FilterBar, FilterChip,
  btnGhostSx, btnPrimarySx, btnAiSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

// ════════════════════════════════════════════════════════════════════
// Sojori — Tarification Dynamique
// Calendrier avec prix actuels vs suggérés, règles de pricing, concurrence
// Mode MOCK avec données factices réalistes
// ════════════════════════════════════════════════════════════════════

interface ListingOption {
  id: string;
  name: string;
  city: string;
  basePrice: number;
  color: string;
}

interface PricingDay {
  date: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  currentPrice: number;
  suggestedPrice: number;
  competitor1Price?: number; // Airbnb average
  competitor2Price?: number; // Booking average
  occupancyForecast: number; // 0-100
  appliedRules: string[];
  isWeekend: boolean;
  isEvent: boolean;
  eventName?: string;
  isToday?: boolean;
}

interface PricingRule {
  id: string;
  name: string;
  type: 'weekend' | 'event' | 'season' | 'lastminute' | 'earlybird' | 'custom';
  enabled: boolean;
  modifier: number; // Percentage (+30, -15, etc.)
  conditions: string;
  priority: number;
}

interface LocalEvent {
  id: string;
  name: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
  priceModifier: number;
}

// ─── Mock Data ─────────────────────────────────────────────────
const LISTINGS: ListingOption[] = [
  { id: 'L001', name: 'Villa Belvédère', city: 'Nice', basePrice: 350, color: '#d97706' },
  { id: 'L002', name: 'Dar Sojori', city: 'Marrakech', basePrice: 280, color: '#0e7490' },
  { id: 'L003', name: 'Villa Atlas', city: 'Marrakech', basePrice: 220, color: '#7c3aed' },
  { id: 'L004', name: 'Atlas Loft', city: 'Marrakech', basePrice: 180, color: '#16a34a' },
];

const PRICING_RULES: PricingRule[] = [
  { id: 'R1', name: 'Weekend Premium', type: 'weekend', enabled: true, modifier: 25, conditions: 'Ven-Dim', priority: 1 },
  { id: 'R2', name: 'Haute Saison (Juillet-Août)', type: 'season', enabled: true, modifier: 40, conditions: 'Juillet-Août', priority: 2 },
  { id: 'R3', name: 'Basse Saison (Nov-Fév)', type: 'season', enabled: true, modifier: -15, conditions: 'Nov-Fév', priority: 3 },
  { id: 'R4', name: 'Dernière Minute (J-7)', type: 'lastminute', enabled: true, modifier: -20, conditions: 'Si inoccupé J-7', priority: 4 },
  { id: 'R5', name: 'Early Bird (+60j)', type: 'earlybird', enabled: false, modifier: -10, conditions: 'Réservation +60j', priority: 5 },
  { id: 'R6', name: 'Festival Jazz (Nice)', type: 'event', enabled: true, modifier: 60, conditions: '15-22 Juillet', priority: 1 },
  { id: 'R7', name: 'Marathon Marrakech', type: 'event', enabled: true, modifier: 45, conditions: '25-27 Janvier', priority: 1 },
  { id: 'R8', name: 'Prolongation 7+ nuits', type: 'custom', enabled: true, modifier: -12, conditions: 'Séjour 7+ nuits', priority: 6 },
  { id: 'R9', name: 'Midweek Discount', type: 'custom', enabled: false, modifier: -8, conditions: 'Mar-Jeu', priority: 7 },
  { id: 'R10', name: 'Nouvel An', type: 'event', enabled: true, modifier: 80, conditions: '31 Déc - 2 Jan', priority: 1 },
];

const LOCAL_EVENTS: LocalEvent[] = [
  { id: 'E1', name: 'Festival de Cannes', date: '2026-05-16', impact: 'high', priceModifier: 70 },
  { id: 'E2', name: 'Marathon Marrakech', date: '2026-01-26', impact: 'medium', priceModifier: 45 },
  { id: 'E3', name: 'Grand Prix Monaco', date: '2026-05-24', impact: 'high', priceModifier: 85 },
  { id: 'E4', name: 'Festival Gnaoua', date: '2026-06-20', impact: 'medium', priceModifier: 50 },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// Generate pricing calendar data
function generatePricingDays(year: number, month: number, listing: ListingOption): PricingDay[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells: PricingDay[] = [];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const { basePrice } = listing;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const d = new Date(year, month, dayNum);
    const wd = (d.getDay() + 6) % 7;
    const isWeekend = wd >= 5;

    // Apply pricing rules
    let currentPrice = basePrice;
    let suggestedPrice = basePrice;
    const appliedRules: string[] = [];

    // Weekend boost
    if (isWeekend && inMonth) {
      currentPrice = Math.round(currentPrice * 1.20);
      suggestedPrice = Math.round(suggestedPrice * 1.25);
      appliedRules.push('Weekend Premium');
    }

    // High season (July-Aug for Nice, Dec-Mar for Marrakech)
    const isHighSeason = (
      (listing.city === 'Nice' && (month === 6 || month === 7)) ||
      (listing.city === 'Marrakech' && (month === 11 || month === 0 || month === 1 || month === 2))
    );
    if (isHighSeason && inMonth) {
      currentPrice = Math.round(currentPrice * 1.30);
      suggestedPrice = Math.round(suggestedPrice * 1.40);
      appliedRules.push('Haute Saison');
    }

    // Low season (Nov-Feb for Nice, Jun-Aug for Marrakech)
    const isLowSeason = (
      (listing.city === 'Nice' && (month === 10 || month === 11 || month === 0 || month === 1)) ||
      (listing.city === 'Marrakech' && (month === 5 || month === 6 || month === 7))
    );
    if (isLowSeason && inMonth) {
      currentPrice = Math.round(currentPrice * 0.85);
      suggestedPrice = Math.round(suggestedPrice * 0.90);
      appliedRules.push('Basse Saison');
    }

    // Event pricing (mock)
    let isEvent = false;
    let eventName = '';
    if (inMonth && (dayNum === 16 || dayNum === 17)) {
      isEvent = true;
      eventName = listing.city === 'Nice' ? 'Festival de Cannes' : 'Marathon Marrakech';
      currentPrice = Math.round(currentPrice * 1.50);
      suggestedPrice = Math.round(suggestedPrice * 1.70);
      appliedRules.push(eventName);
    }

    // AI optimization (add variance)
    const aiVariance = Math.sin(dayNum * 0.8) * 15;
    suggestedPrice = Math.round(suggestedPrice + aiVariance);

    // Competitor prices (mockup)
    const competitor1Price = inMonth ? Math.round(currentPrice * (0.95 + Math.random() * 0.15)) : undefined;
    const competitor2Price = inMonth ? Math.round(currentPrice * (0.92 + Math.random() * 0.18)) : undefined;

    // Occupancy forecast (mockup)
    const occupancyForecast = inMonth ? Math.round(60 + Math.random() * 35) : 0;

    cells.push({
      date: `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`,
      day: dayNum,
      weekday: wd,
      inMonth,
      currentPrice,
      suggestedPrice,
      competitor1Price,
      competitor2Price,
      occupancyForecast,
      appliedRules,
      isWeekend,
      isEvent,
      eventName,
      isToday: isCurrentMonth && today.getDate() === dayNum && inMonth,
    });
  }
  return cells;
}

export function PricingPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [listingId, setListingId] = useState(LISTINGS[0].id);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<PricingDay | null>(null);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [autoApply, setAutoApply] = useState(false);

  const listing = LISTINGS.find(l => l.id === listingId)!;
  const days = useMemo(() => generatePricingDays(year, month, listing), [year, month, listing]);

  // Stats calculation
  const stats = useMemo(() => {
    const inMonth = days.filter(d => d.inMonth);
    const currentRevenue = inMonth.reduce((s, d) => s + d.currentPrice, 0);
    const suggestedRevenue = inMonth.reduce((s, d) => s + d.suggestedPrice, 0);
    const potentialGain = suggestedRevenue - currentRevenue;
    const avgCurrentPrice = Math.round(currentRevenue / inMonth.length);
    const avgSuggestedPrice = Math.round(suggestedRevenue / inMonth.length);
    const daysWithHigherSuggestion = inMonth.filter(d => d.suggestedPrice > d.currentPrice).length;
    const avgMarketPrice = Math.round(
      inMonth.reduce((s, d) => s + ((d.competitor1Price || 0) + (d.competitor2Price || 0)) / 2, 0) / inMonth.length
    );

    return {
      currentRevenue,
      suggestedRevenue,
      potentialGain,
      potentialGainPct: Math.round((potentialGain / currentRevenue) * 100),
      avgCurrentPrice,
      avgSuggestedPrice,
      daysWithHigherSuggestion,
      avgMarketPrice,
      priceVsMarket: Math.round(((avgCurrentPrice - avgMarketPrice) / avgMarketPrice) * 100),
    };
  }, [days]);

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const applyAllSuggestions = () => {
    // TODO: Apply all AI suggestions
    alert(`${stats.daysWithHigherSuggestion} jours mis à jour avec les prix suggérés\nGain potentiel: +€${stats.potentialGain}`);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Tarification']}>
      <Box sx={{ p: { xs: 2, md: 0 }, maxWidth: 1600, mx: 'auto' }}>
        <PageHeader title="Tarification Dynamique" count="">
          <Select
            size="small"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            sx={{ fontSize: 13, minWidth: 240 }}
          >
            {LISTINGS.map(l => (
              <MenuItem key={l.id} value={l.id} sx={{ fontSize: 13 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                  <span>{l.name}</span>
                  <span style={{ color: t.text3, fontSize: 11 }}>· {l.city}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '8px', p: 0.375 }}>
            <IconButton size="small" onClick={() => navMonth(-1)} sx={{ width: 28, height: 28 }}>‹</IconButton>
            <Typography sx={{ px: 1.5, fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </Typography>
            <IconButton size="small" onClick={() => navMonth(1)} sx={{ width: 28, height: 28 }}>›</IconButton>
          </Stack>
          <Button sx={btnGhostSx} onClick={() => setRuleDialogOpen(true)}>⚙️ Règles</Button>
          <Button sx={btnGhostSx} onClick={() => setEventDialogOpen(true)}>📅 Événements</Button>
          <Button sx={btnAiSx} onClick={applyAllSuggestions}>✨ Appliquer suggestions</Button>
        </PageHeader>

        {/* Stats Row */}
        <StatsRow sx={{ mb: 3 }}>
          <StatCard
            icon="💰"
            iconBg={t.infoTint}
            iconColor={t.info}
            value={`€${stats.currentRevenue.toLocaleString('fr')}`}
            label="Revenu actuel (mois)"
          />
          <StatCard
            icon="✨"
            iconBg={t.aiTint}
            iconColor={t.ai}
            value={`€${stats.suggestedRevenue.toLocaleString('fr')}`}
            label="Revenu avec AI"
            trend={`+${stats.potentialGainPct}%`}
            trendUp
          />
          <StatCard
            icon="📈"
            iconBg={t.successTint}
            iconColor={t.success}
            value={`+€${stats.potentialGain.toLocaleString('fr')}`}
            label="Gain potentiel"
          />
          <StatCard
            icon="🎯"
            iconBg={stats.priceVsMarket >= 0 ? t.successTint : t.errorTint}
            iconColor={stats.priceVsMarket >= 0 ? t.success : t.error}
            value={`${stats.priceVsMarket > 0 ? '+' : ''}${stats.priceVsMarket}%`}
            label="vs Marché"
          />
        </StatsRow>

        {/* AI Banner */}
        {stats.potentialGain > 0 && (
          <Box sx={{
            mb: 2.5,
            p: 2,
            borderRadius: '12px',
            bgcolor: t.aiTint,
            border: '1px solid rgba(139,92,246,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <Box sx={{ fontSize: 32 }}>✨</Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.ai, mb: 0.5 }}>
                {stats.daysWithHigherSuggestion} jours avec opportunité de pricing
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: t.text2 }}>
                En appliquant les suggestions AI, vous pouvez générer <strong>+€{stats.potentialGain}</strong> de revenu ce mois (+{stats.potentialGainPct}%)
              </Typography>
            </Box>
            <Button sx={btnAiSx} onClick={applyAllSuggestions}>
              ✨ Appliquer tout
            </Button>
          </Box>
        )}

        {/* Filters */}
        <FilterBar>
          <FilterChip
            label="🏆 Concurrence"
            active={showCompetitors}
            onClick={() => setShowCompetitors(!showCompetitors)}
          />
          <FilterChip
            label={`⚙️ ${PRICING_RULES.filter(r => r.enabled).length} règles actives`}
            active={false}
            onClick={() => setRuleDialogOpen(true)}
          />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
            <Typography sx={{ fontSize: 12, color: t.text3 }}>Auto-apply suggestions</Typography>
            <Switch size="small" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
          </Stack>
        </FilterBar>

        {/* Calendar Grid */}
        <Panel>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              {listing.name} · {listing.city} · Prix base: €{listing.basePrice}/nuit
            </Typography>
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
            {days.map(d => (
              <PricingDayCell
                key={d.date}
                day={d}
                showCompetitors={showCompetitors}
                onClick={() => setSelectedDay(d)}
              />
            ))}
          </Box>

          {/* Legend */}
          <Stack direction="row" spacing={2.5} sx={{ mt: 2.5, pt: 2, borderTop: `1px dashed ${t.border}`, flexWrap: 'wrap', rowGap: 1 }}>
            <LegendItem color={t.success} label="Prix AI > Actuel" />
            <LegendItem color={t.error} label="Prix AI < Actuel" />
            <LegendItem color={t.warning} label="Événement local" />
            <Box sx={{ ml: 'auto', fontSize: 11, color: t.text3 }}>
              Cliquez sur un jour pour voir les détails
            </Box>
          </Stack>
        </Panel>

        {/* Pricing Rules Table */}
        <Panel title="Règles de Tarification" desc={`${PRICING_RULES.filter(r => r.enabled).length}/${PRICING_RULES.length} actives`} sx={{ mt: 2.5 }}>
          <DataTable
            columns={[
              { key: 'name', label: 'Nom de la règle' },
              { key: 'type', label: 'Type', render: (row: PricingRule) => (
                <Badge variant={
                  row.type === 'event' ? 'warning' :
                  row.type === 'season' ? 'info' :
                  row.type === 'weekend' ? 'gold' : 'neutral'
                }>
                  {row.type}
                </Badge>
              )},
              { key: 'modifier', label: 'Modifier', render: (row: PricingRule) => (
                <Typography sx={{
                  fontFamily: 'Geist Mono',
                  fontWeight: 700,
                  color: row.modifier > 0 ? t.success : t.error,
                }}>
                  {row.modifier > 0 ? '+' : ''}{row.modifier}%
                </Typography>
              )},
              { key: 'conditions', label: 'Conditions' },
              { key: 'enabled', label: 'Statut', render: (row: PricingRule) => (
                <Switch size="small" checked={row.enabled} />
              )},
            ]}
            rows={PRICING_RULES}
          />
          <Button sx={{ ...btnGhostSx, mt: 2 }} onClick={() => setRuleDialogOpen(true)}>
            + Ajouter une règle
          </Button>
        </Panel>

        {/* Competitor Comparison (if enabled) */}
        {showCompetitors && (
          <Panel title="Analyse Concurrence" desc="Prix moyens sur les mêmes dates" sx={{ mt: 2.5 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>Votre prix moyen</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, fontFamily: 'Geist Mono' }}>
                    €{stats.avgCurrentPrice}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>Marché moyen</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, fontFamily: 'Geist Mono', color: t.info }}>
                    €{stats.avgMarketPrice}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>Écart</Typography>
                  <Typography sx={{
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'Geist Mono',
                    color: stats.priceVsMarket >= 0 ? t.success : t.error,
                  }}>
                    {stats.priceVsMarket > 0 ? '+' : ''}{stats.priceVsMarket}%
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{ fontSize: 11, color: t.text3, fontStyle: 'italic' }}>
                Note: Données mockup basées sur Airbnb et Booking.com pour {listing.city}
              </Typography>
            </Stack>
          </Panel>
        )}

        {/* Day Detail Dialog */}
        <Dialog
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          maxWidth="sm"
          fullWidth
        >
          {selectedDay && <DayPricingDetail day={selectedDay} onClose={() => setSelectedDay(null)} />}
        </Dialog>

        {/* Rules Dialog */}
        <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Gestion des Règles de Tarification</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: t.text2, mb: 2 }}>
              Créez et gérez vos règles de pricing dynamique. Les règles sont appliquées par ordre de priorité.
            </Typography>
            <DataTable
              columns={[
                { key: 'name', label: 'Nom' },
                { key: 'modifier', label: 'Modifier', render: (row: PricingRule) => `${row.modifier > 0 ? '+' : ''}${row.modifier}%` },
                { key: 'enabled', label: 'Active', render: (row: PricingRule) => (
                  <Switch size="small" checked={row.enabled} />
                )},
              ]}
              rows={PRICING_RULES}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRuleDialogOpen(false)} sx={btnGhostSx}>Fermer</Button>
            <Button sx={btnPrimarySx}>+ Nouvelle règle</Button>
          </DialogActions>
        </Dialog>

        {/* Events Dialog */}
        <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Événements Locaux</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: t.text2, mb: 2 }}>
              Gérez les événements locaux qui impactent votre tarification.
            </Typography>
            <Stack spacing={2}>
              {LOCAL_EVENTS.map(evt => (
                <Box key={evt.id} sx={{
                  p: 2,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  bgcolor: t.bg0,
                }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{evt.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.25 }}>{evt.date}</Typography>
                    </Box>
                    <Badge variant={evt.impact === 'high' ? 'error' : evt.impact === 'medium' ? 'warning' : 'info'}>
                      {evt.impact} impact
                    </Badge>
                    <Typography sx={{ fontFamily: 'Geist Mono', fontWeight: 700, color: t.success }}>
                      +{evt.priceModifier}%
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEventDialogOpen(false)} sx={btnGhostSx}>Fermer</Button>
            <Button sx={btnPrimarySx}>+ Ajouter événement</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardWrapper>
  );
}

// ─── Pricing Day Cell ───────────────────────────────────────────
function PricingDayCell({ day, showCompetitors, onClick }: {
  day: PricingDay;
  showCompetitors: boolean;
  onClick: () => void;
}) {
  const priceDiff = day.suggestedPrice - day.currentPrice;
  const isHigher = priceDiff > 0;
  const isLower = priceDiff < 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        minHeight: showCompetitors ? 130 : 110,
        p: 1,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: day.isEvent ? t.warning : t.border,
        bgcolor: day.inMonth ? (day.isEvent ? 'rgba(245,158,11,0.05)' : t.bg0) : 'transparent',
        opacity: day.inMonth ? 1 : 0.25,
        borderLeft: isHigher ? `3px solid ${t.success}` : isLower ? `3px solid ${t.error}` : `1px solid ${t.border}`,
        cursor: day.inMonth ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
        ...(day.isToday && {
          bgcolor: t.primaryTint,
          borderColor: t.primary,
          boxShadow: `0 0 0 1px ${t.primary}`,
        }),
        '&:hover': day.inMonth ? {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(26,20,8,0.08)',
          zIndex: 2,
        } : {},
      }}
    >
      {/* Day number */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{
          fontSize: 12,
          fontWeight: day.isToday ? 800 : 600,
          color: day.isToday ? t.primaryDeep : t.text,
          fontFamily: 'Geist Mono',
        }}>{day.day}</Typography>
        {day.isEvent && <Box sx={{ fontSize: 10 }}>🎉</Box>}
      </Stack>

      {day.inMonth && (
        <>
          {/* Current price */}
          <Stack spacing={0.25} sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: 9, color: t.text3, fontFamily: 'Geist Mono', textTransform: 'uppercase' }}>
              Actuel
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono', color: t.text2, lineHeight: 1 }}>
              €{day.currentPrice}
            </Typography>
          </Stack>

          {/* Suggested price */}
          <Stack spacing={0.25} sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: 9, color: t.ai, fontFamily: 'Geist Mono', textTransform: 'uppercase' }}>
              ✨ Suggéré
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography sx={{
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'Geist Mono',
                color: isHigher ? t.success : isLower ? t.error : t.text,
                lineHeight: 1,
              }}>
                €{day.suggestedPrice}
              </Typography>
              {priceDiff !== 0 && (
                <Typography sx={{
                  fontSize: 9,
                  fontFamily: 'Geist Mono',
                  fontWeight: 700,
                  color: isHigher ? t.success : t.error,
                }}>
                  {isHigher ? '↑' : '↓'}{Math.abs(priceDiff)}
                </Typography>
              )}
            </Stack>
          </Stack>

          {/* Competitors (if enabled) */}
          {showCompetitors && (
            <Stack spacing={0.25} sx={{ fontSize: 9, color: t.text3, fontFamily: 'Geist Mono' }}>
              <Box>Airbnb: €{day.competitor1Price}</Box>
              <Box>Booking: €{day.competitor2Price}</Box>
            </Stack>
          )}

          {/* Occupancy indicator */}
          <Box sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor:
              day.occupancyForecast >= 80 ? t.error :
              day.occupancyForecast >= 60 ? t.warning : t.success,
          }} />
        </>
      )}
    </Box>
  );
}

// ─── Day Pricing Detail ─────────────────────────────────────────
function DayPricingDetail({ day, onClose }: { day: PricingDay; onClose: () => void }) {
  const priceDiff = day.suggestedPrice - day.currentPrice;
  const priceDiffPct = Math.round((priceDiff / day.currentPrice) * 100);

  return (
    <>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 1, textTransform: 'uppercase' }}>
              {day.date}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, mt: 0.25 }}>
              {day.day} {MONTHS[Number(day.date.split('-')[1]) - 1]} {day.date.split('-')[0]}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          {/* Event badge */}
          {day.isEvent && (
            <Box sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: t.warningTint,
              border: `1px solid ${t.warning}`,
            }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ fontSize: 20 }}>🎉</Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.warning }}>Événement local</Typography>
                  <Typography sx={{ fontSize: 12, color: t.text2 }}>{day.eventName}</Typography>
                </Box>
              </Stack>
            </Box>
          )}

          {/* Price comparison */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                Prix actuel
              </Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: 'Geist Mono' }}>
                €{day.currentPrice}
              </Typography>
            </Panel>
            <Panel sx={{ p: 2, bgcolor: t.aiTint, border: '1px solid rgba(139,92,246,0.20)' }}>
              <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700, color: t.ai, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                ✨ Prix suggéré
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, fontFamily: 'Geist Mono', color: t.ai }}>
                  €{day.suggestedPrice}
                </Typography>
                <Typography sx={{
                  fontSize: 13,
                  fontFamily: 'Geist Mono',
                  fontWeight: 700,
                  color: priceDiff > 0 ? t.success : t.error,
                }}>
                  {priceDiff > 0 ? '+' : ''}{priceDiffPct}%
                </Typography>
              </Stack>
            </Panel>
          </Box>

          {/* Applied rules */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Règles appliquées</Typography>
            <Stack spacing={0.75}>
              {day.appliedRules.length > 0 ? day.appliedRules.map((rule, i) => (
                <Box key={i} sx={{
                  p: 1,
                  borderRadius: '6px',
                  bgcolor: t.bg2,
                  fontSize: 12,
                  color: t.text2,
                }}>
                  ✓ {rule}
                </Box>
              )) : (
                <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic' }}>
                  Prix de base (aucune règle appliquée)
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Occupancy forecast */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Prévision d'occupation</Typography>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{
                  height: 8,
                  borderRadius: '99px',
                  bgcolor: t.bg2,
                  overflow: 'hidden',
                }}>
                  <Box sx={{
                    width: `${day.occupancyForecast}%`,
                    height: '100%',
                    bgcolor:
                      day.occupancyForecast >= 80 ? t.error :
                      day.occupancyForecast >= 60 ? t.warning : t.success,
                    transition: 'width 0.3s',
                  }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono', minWidth: 50 }}>
                {day.occupancyForecast}%
              </Typography>
            </Stack>
          </Box>

          {/* Competitor prices */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Concurrence (mockup)</Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 12.5 }}>Airbnb (moyenne)</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono' }}>
                  €{day.competitor1Price}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 12.5 }}>Booking.com (moyenne)</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono' }}>
                  €{day.competitor2Price}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={btnGhostSx}>Fermer</Button>
        {priceDiff > 0 && (
          <Button sx={btnAiSx} onClick={() => {
            alert(`Prix mis à jour à €${day.suggestedPrice} pour le ${day.date}`);
            onClose();
          }}>
            ✨ Appliquer €{day.suggestedPrice}
          </Button>
        )}
      </DialogActions>
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 11, color: t.text3 }}>
      <Box sx={{ width: 10, height: 3, bgcolor: color, borderRadius: '99px' }} />
      <span>{label}</span>
    </Stack>
  );
}
