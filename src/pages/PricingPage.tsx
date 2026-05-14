import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import PricingRulesEditor, { type PricingRules } from '../components/pricing/PricingRulesEditor';
import {
  getStoredListings,
  getStoredPricingProfiles,
  saveStoredPricingProfiles,
  type PricingEventRule,
  type PricingProfile,
} from '../data/catalogueMock';
import {
  Badge,
  DataTable,
  FilterBar,
  FilterChip,
  Panel,
  PageHeader,
  StatCard,
  StatsRow,
  btnAiSx,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

interface PricingDay {
  date: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  currentPrice: number;
  suggestedPrice: number;
  competitor1Price: number;
  competitor2Price: number;
  occupancyForecast: number;
  appliedRules: string[];
  isEvent: boolean;
  eventName?: string;
}

const monthLabels = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const formatMoney = (value: number) => `€${Math.round(value).toLocaleString('fr-FR')}`;
const toSignedModifier = (mode: 'increase' | 'decrease', value: number) =>
  mode === 'increase' ? value : -value;
const toDiscountModifier = (mode: 'increase' | 'decrease', value: number) =>
  mode === 'decrease' ? value : -value;
const fromSignedModifier = (value: number) => ({
  mode: value >= 0 ? ('increase' as const) : ('decrease' as const),
  modifierPct: Math.abs(value),
});
const fromDiscountModifier = (value: number) => ({
  mode: value >= 0 ? ('decrease' as const) : ('increase' as const),
  modifierPct: Math.abs(value),
});

const profileToEditorRules = (profile: PricingProfile): PricingRules => ({
  monthly: profile.monthRules.map((rule, month) => ({
    month,
    pct: rule.value,
    active: rule.enabled,
  })),
  weekday: profile.weekdayRules.map((rule, day) => ({
    day,
    pct: rule.value,
    active: rule.enabled,
  })),
  events: profile.events.map((rule) => ({
    id: rule.id,
    name: rule.name,
    from: rule.startDate,
    to: rule.endDate,
    pct: toSignedModifier(rule.mode, rule.modifierPct),
    minStay: rule.minStay,
    active: rule.enabled,
  })),
  occupancy: profile.occupancyRules.map((rule) => ({
    minPct: rule.minOccupancy,
    maxPct: rule.maxOccupancy,
    adjustment: toSignedModifier(rule.mode, rule.modifierPct),
    active: rule.enabled,
  })),
  longStay: profile.longStayRules.map((rule) => ({
    minNights: rule.minNights,
    discount: toDiscountModifier(rule.mode, rule.modifierPct),
    active: rule.enabled,
  })),
  lastMinute: profile.lastMinuteRules.map((rule) => ({
    daysBefore: rule.minDaysBefore,
    discount: toDiscountModifier(rule.mode, rule.modifierPct),
    active: rule.enabled,
  })),
});

const mergeEditorRulesIntoProfile = (profile: PricingProfile, rules: PricingRules): PricingProfile => ({
  ...profile,
  monthRules: rules.monthly.map((rule, index) => ({
    key: profile.monthRules[index]?.key || `month-${index}`,
    label: profile.monthRules[index]?.label || monthLabels[index],
    value: rule.pct,
    enabled: rule.active,
  })),
  weekdayRules: rules.weekday.map((rule, index) => ({
    key: profile.weekdayRules[index]?.key || `weekday-${index}`,
    label: profile.weekdayRules[index]?.label || weekdayLabels[index],
    value: rule.pct,
    enabled: rule.active,
  })),
  events: rules.events.map((rule, index) => ({
    id: profile.events[index]?.id || rule.id || `event-${index}`,
    name: rule.name,
    startDate: rule.from,
    endDate: rule.to,
    minStay: rule.minStay,
    enabled: rule.active,
    ...fromSignedModifier(rule.pct),
  })),
  occupancyRules: rules.occupancy.map((rule, index) => ({
    id: profile.occupancyRules[index]?.id || `occupancy-${index}`,
    minOccupancy: rule.minPct,
    maxOccupancy: rule.maxPct,
    enabled: rule.active,
    ...fromSignedModifier(rule.adjustment),
  })),
  longStayRules: rules.longStay.map((rule, index) => ({
    id: profile.longStayRules[index]?.id || `long-stay-${index}`,
    minNights: rule.minNights,
    maxNights: profile.longStayRules[index]?.maxNights || Math.max(rule.minNights, rule.minNights + 30),
    enabled: rule.active,
    ...fromDiscountModifier(rule.discount),
  })),
  lastMinuteRules: rules.lastMinute.map((rule, index) => ({
    id: profile.lastMinuteRules[index]?.id || `last-minute-${index}`,
    minDaysBefore: rule.daysBefore,
    maxDaysBefore: profile.lastMinuteRules[index]?.maxDaysBefore || rule.daysBefore,
    enabled: rule.active,
    ...fromDiscountModifier(rule.discount),
  })),
});

const matchesEventRule = (date: Date, rule: PricingEventRule) => {
  const current = date.toISOString().slice(0, 10);
  return rule.enabled && current >= rule.startDate && current <= rule.endDate;
};

function generatePricingCalendar(
  year: number,
  month: number,
  basePrice: number,
  profile: PricingProfile,
  overrides: Record<string, number>,
): PricingDay[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    const date = new Date(year, month, dayNumber);
    const weekday = (date.getDay() + 6) % 7;
    const inMonth = dayNumber >= 1 && dayNumber <= last.getDate();
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

    const monthRule = profile.monthRules[month];
    const weekdayRule = profile.weekdayRules[weekday];
    const occupancyForecast = inMonth ? 45 + ((dayNumber * 11 + month * 7) % 50) : 0;
    const matchedEvent = profile.events.find((rule) => matchesEventRule(date, rule));
    const occupancyRule = profile.occupancyRules.find(
      (rule) =>
        rule.enabled &&
        occupancyForecast >= rule.minOccupancy &&
        occupancyForecast <= rule.maxOccupancy,
    );
    const bookingWindow = profile.lastMinuteRules.find(
      (rule) => rule.enabled && dayNumber >= rule.minDaysBefore && dayNumber <= rule.maxDaysBefore,
    );

    let currentPrice = basePrice;
    const appliedRules: string[] = [];

    if (monthRule?.enabled && monthRule.value !== 0) {
      currentPrice *= 1 + monthRule.value / 100;
      appliedRules.push(`Mois ${monthRule.label}`);
    }
    if (weekdayRule?.enabled && weekdayRule.value !== 0) {
      currentPrice *= 1 + weekdayRule.value / 100;
      appliedRules.push(`Jour ${weekdayRule.label}`);
    }

    let suggestedPrice = currentPrice;

    if (profile.dynamicPricingEnabled && matchedEvent) {
      suggestedPrice *= 1 + (matchedEvent.mode === 'increase' ? matchedEvent.modifierPct : -matchedEvent.modifierPct) / 100;
      appliedRules.push(matchedEvent.name);
    }
    if (profile.dynamicPricingEnabled && occupancyRule) {
      suggestedPrice *= 1 + (occupancyRule.mode === 'increase' ? occupancyRule.modifierPct : -occupancyRule.modifierPct) / 100;
      appliedRules.push(`Occupation ${occupancyRule.minOccupancy}-${occupancyRule.maxOccupancy}%`);
    }
    if (profile.dynamicPricingEnabled && bookingWindow) {
      suggestedPrice *= 1 + (bookingWindow.mode === 'increase' ? bookingWindow.modifierPct : -bookingWindow.modifierPct) / 100;
      appliedRules.push('Booking window');
    }

    const competitor1Price = Math.round(currentPrice * (0.94 + ((dayNumber % 7) * 0.015)));
    const competitor2Price = Math.round(currentPrice * (0.9 + ((dayNumber % 5) * 0.02)));
    const finalCurrentPrice = overrides[dateKey] ?? Math.round(currentPrice);

    return {
      date: dateKey,
      day: dayNumber,
      weekday,
      inMonth,
      currentPrice: finalCurrentPrice,
      suggestedPrice: Math.round(suggestedPrice),
      competitor1Price,
      competitor2Price,
      occupancyForecast,
      appliedRules,
      isEvent: Boolean(matchedEvent),
      eventName: matchedEvent?.name,
    };
  });
}

function PricingDayCell({
  day,
  showCompetitors,
  onClick,
}: {
  day: PricingDay;
  showCompetitors: boolean;
  onClick: () => void;
}) {
  const delta = day.suggestedPrice - day.currentPrice;
  return (
    <Box
      onClick={day.inMonth ? onClick : undefined}
      sx={{
        minHeight: showCompetitors ? 132 : 112,
        p: 1,
        borderRadius: '8px',
        border: `1px solid ${day.isEvent ? t.warning : t.border}`,
        borderLeft: `3px solid ${delta >= 0 ? t.success : t.error}`,
        bgcolor: day.inMonth ? t.bg0 : 'transparent',
        opacity: day.inMonth ? 1 : 0.28,
        cursor: day.inMonth ? 'pointer' : 'default',
        '&:hover': day.inMonth ? { boxShadow: '0 6px 16px rgba(26,20,8,0.08)' } : {},
      }}
    >
      <Stack direction="row" sx={{ mb: 0.5, justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{day.day}</Typography>
        {day.isEvent && <Typography sx={{ fontSize: 11 }}>🎉</Typography>}
      </Stack>
      {day.inMonth && (
        <>
          <Typography sx={{ fontSize: 9, color: t.text3, fontFamily: 'Geist Mono' }}>ACTUEL</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono' }}>
            €{day.currentPrice}
          </Typography>
          <Typography sx={{ fontSize: 9, color: t.ai, fontFamily: 'Geist Mono', mt: 0.5 }}>
            SUGGÉRÉ
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: delta >= 0 ? t.success : t.error }}>
              €{day.suggestedPrice}
            </Typography>
            <Typography sx={{ fontSize: 10, color: delta >= 0 ? t.success : t.error }}>
              {delta >= 0 ? '+' : ''}
              {delta}
            </Typography>
          </Stack>
          {showCompetitors && (
            <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
              Airbnb {day.competitor1Price} · Booking {day.competitor2Price}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

function DayDetailsDialog({
  day,
  onClose,
  onApply,
}: {
  day: PricingDay;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <DialogTitle>Détail pricing du {day.date}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>Prix actuel</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800 }}>{formatMoney(day.currentPrice)}</Typography>
            </Panel>
            <Panel sx={{ p: 2, bgcolor: t.aiTint }}>
              <Typography sx={{ fontSize: 11, color: t.ai }}>Prix suggéré</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800 }}>{formatMoney(day.suggestedPrice)}</Typography>
            </Panel>
          </Box>
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Règles appliquées</Typography>
            <Stack spacing={0.75}>
              {day.appliedRules.length > 0 ? (
                day.appliedRules.map((rule) => (
                  <Typography key={rule} sx={{ fontSize: 12, color: t.text2 }}>
                    • {rule}
                  </Typography>
                ))
              ) : (
                <Typography sx={{ fontSize: 12, color: t.text3 }}>Aucune règle active.</Typography>
              )}
            </Stack>
          </Panel>
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Concurrence</Typography>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              Airbnb {formatMoney(day.competitor1Price)} · Booking {formatMoney(day.competitor2Price)}
            </Typography>
          </Panel>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button sx={btnGhostSx} onClick={onClose}>
          Fermer
        </Button>
        <Button sx={btnPrimarySx} onClick={onApply}>
          Appliquer suggestion
        </Button>
      </DialogActions>
    </>
  );
}

export function PricingPage() {
  const today = new Date();
  const { toast, showToast, hideToast } = useActionToast();
  const listings = useMemo(() => getStoredListings().filter((listing) => listing.status !== 'draft'), []);
  const [profiles, setProfiles] = useState(() => getStoredPricingProfiles());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState<PricingDay | null>(null);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState(0);
  const [acceptedOverrides, setAcceptedOverrides] = useState<Record<string, number>>({});

  const listing = listings.find((item) => item.id === listingId) || listings[0];
  const profile = profiles.find((item) => item.listingId === listing.id) as PricingProfile;
  const editorRules = useMemo(() => profileToEditorRules(profile), [profile]);
  const days = useMemo(
    () => generatePricingCalendar(year, month, listing.adr, profile, acceptedOverrides),
    [acceptedOverrides, listing.adr, month, profile, year],
  );

  const inMonthDays = days.filter((day) => day.inMonth);
  const stats = useMemo(() => {
    const currentRevenue = inMonthDays.reduce((sum, day) => sum + day.currentPrice, 0);
    const suggestedRevenue = inMonthDays.reduce((sum, day) => sum + day.suggestedPrice, 0);
    const potentialGain = suggestedRevenue - currentRevenue;
    const avgMarketPrice = Math.round(
      inMonthDays.reduce((sum, day) => sum + (day.competitor1Price + day.competitor2Price) / 2, 0) /
        inMonthDays.length,
    );
    return {
      currentRevenue,
      suggestedRevenue,
      potentialGain,
      potentialGainPct: currentRevenue > 0 ? Math.round((potentialGain / currentRevenue) * 100) : 0,
      daysWithHigherSuggestion: inMonthDays.filter((day) => day.suggestedPrice > day.currentPrice).length,
      avgMarketPrice,
      priceVsMarket: Math.round(((listing.adr - avgMarketPrice) / avgMarketPrice) * 100),
    };
  }, [inMonthDays, listing.adr]);

  const allActiveRules =
    profile.monthRules.filter((rule) => rule.enabled).length +
    profile.weekdayRules.filter((rule) => rule.enabled).length +
    profile.events.filter((rule) => rule.enabled).length +
    profile.occupancyRules.filter((rule) => rule.enabled).length +
    profile.longStayRules.filter((rule) => rule.enabled).length +
    profile.lastMinuteRules.filter((rule) => rule.enabled).length;

  const updateProfile = (nextProfile: PricingProfile) => {
    setProfiles((prev) =>
      prev.map((item) => (item.listingId === nextProfile.listingId ? nextProfile : item)),
    );
  };

  const handleEditorChange = (nextRules: PricingRules) => {
    updateProfile(mergeEditorRulesIntoProfile(profile, nextRules));
  };

  const persistProfiles = (message: string) => {
    saveStoredPricingProfiles(profiles);
    showToast(message);
  };

  const applySuggestionToDay = (day: PricingDay) => {
    setAcceptedOverrides((prev) => ({ ...prev, [day.date]: day.suggestedPrice }));
    showToast(`Suggestion appliquée pour le ${day.date}`);
    setSelectedDay(null);
  };

  const applyAllSuggestions = () => {
    const next = { ...acceptedOverrides };
    inMonthDays.forEach((day) => {
      if (day.suggestedPrice !== day.currentPrice) {
        next[day.date] = day.suggestedPrice;
      }
    });
    setAcceptedOverrides(next);
    showToast(`${stats.daysWithHigherSuggestion} jours mis à jour avec les suggestions AI`);
  };

  const navMonth = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Tarification']}>
      <Box sx={{ p: { xs: 2, md: 0 }, maxWidth: 1600, mx: 'auto' }}>
        <PageHeader title="Tarification Dynamique" count={profile.dynamicPricingEnabled ? 'Mode actif' : 'Mode pause'}>
          <Select
            size="small"
            value={listing.id}
            onChange={(event) => setListingId(event.target.value)}
            sx={{ minWidth: 240 }}
          >
            {listings.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name} · {item.city}
              </MenuItem>
            ))}
          </Select>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <IconButton size="small" onClick={() => navMonth(-1)}>
              ‹
            </IconButton>
            <Typography sx={{ minWidth: 140, textAlign: 'center', fontWeight: 700 }}>
              {monthLabels[month]} {year}
            </Typography>
            <IconButton size="small" onClick={() => navMonth(1)}>
              ›
            </IconButton>
          </Stack>
          <Button
            sx={btnGhostSx}
            onClick={() => {
              setEditorInitialTab(0);
              setEditorOpen(true);
            }}
          >
            ⚙️ Règles
          </Button>
          <Button
            sx={btnGhostSx}
            onClick={() => {
              setEditorInitialTab(2);
              setEditorOpen(true);
            }}
          >
            📅 Événements
          </Button>
          <Button sx={btnAiSx} onClick={applyAllSuggestions}>
            ✨ Appliquer suggestions
          </Button>
        </PageHeader>

        <StatsRow sx={{ mb: 3 }}>
          <StatCard icon="💰" iconBg={t.infoTint} iconColor={t.info} value={formatMoney(stats.currentRevenue)} label="Revenu actuel (mois)" />
          <StatCard icon="✨" iconBg={t.aiTint} iconColor={t.ai} value={formatMoney(stats.suggestedRevenue)} label="Revenu avec AI" trend={`+${stats.potentialGainPct}%`} trendUp />
          <StatCard icon="📈" iconBg={t.successTint} iconColor={t.success} value={formatMoney(stats.potentialGain)} label="Gain potentiel" />
          <StatCard icon="🎯" iconBg={stats.priceVsMarket >= 0 ? t.successTint : t.errorTint} iconColor={stats.priceVsMarket >= 0 ? t.success : t.error} value={`${stats.priceVsMarket > 0 ? '+' : ''}${stats.priceVsMarket}%`} label="vs Marché" />
        </StatsRow>

        {stats.potentialGain > 0 && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: '12px',
              bgcolor: t.aiTint,
              border: '1px solid rgba(139,92,246,0.24)',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 28 }}>✨</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.ai }}>
                  {stats.daysWithHigherSuggestion} jours avec opportunité de pricing
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: t.text2 }}>
                  En appliquant les suggestions AI, vous pouvez générer {formatMoney(stats.potentialGain)} ce mois.
                </Typography>
              </Box>
              <Button sx={btnAiSx} onClick={applyAllSuggestions}>
                ✨ Appliquer tout
              </Button>
            </Stack>
          </Box>
        )}

        <FilterBar>
          <FilterChip
            label="🏆 Concurrence"
            active={showCompetitors}
            onClick={() => setShowCompetitors((prev) => !prev)}
          />
          <FilterChip
            label={`⚙️ ${allActiveRules} règles actives`}
            active={false}
            onClick={() => {
              setEditorInitialTab(0);
              setEditorOpen(true);
            }}
          />
          <Stack direction="row" spacing={1} sx={{ ml: 'auto', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 12, color: t.text3 }}>Dynamic pricing</Typography>
            <Switch
              size="small"
              checked={profile.dynamicPricingEnabled}
              onChange={(event) => {
                updateProfile({ ...profile, dynamicPricingEnabled: event.target.checked });
                showToast(
                  event.target.checked
                    ? 'Dynamic pricing activé'
                    : 'Dynamic pricing désactivé',
                  'info',
                );
              }}
            />
          </Stack>
        </FilterBar>

        <Panel>
          <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              {listing.name} · {listing.city} · Prix base {formatMoney(listing.adr)}
            </Typography>
            <Button sx={btnPrimarySx} onClick={() => persistProfiles('Règles de pricing sauvegardées')}>
              Sauvegarder
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
            {weekdayLabels.map((label) => (
              <Typography
                key={label}
                sx={{
                  fontSize: 10.5,
                  fontFamily: 'Geist Mono',
                  fontWeight: 700,
                  color: t.text3,
                  textAlign: 'center',
                }}
              >
                {label}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {days.map((day) => (
              <PricingDayCell
                key={day.date}
                day={day}
                showCompetitors={showCompetitors}
                onClick={() => setSelectedDay(day)}
              />
            ))}
          </Box>
        </Panel>

        <Panel title="Résumé des règles" desc={`${allActiveRules} règles actives`} sx={{ mt: 2.5 }}>
          <DataTable
            columns={[
              { key: 'name', label: 'Nom' },
              {
                key: 'type',
                label: 'Type',
                render: (row: any) => <Badge variant="info">{row.type}</Badge>,
              },
              { key: 'modifier', label: 'Modifier', render: (row: any) => `${row.modifier}` },
              { key: 'conditions', label: 'Conditions' },
              { key: 'status', label: 'Statut', render: (row: any) => <Switch size="small" checked={row.status === 'Actif'} /> },
            ]}
            rows={[
              ...profile.monthRules.filter((rule) => rule.enabled).slice(0, 3).map((rule) => ({
                name: `Month ${rule.label}`,
                type: 'month',
                modifier: `${rule.value > 0 ? '+' : ''}${rule.value}%`,
                conditions: `Mois ${rule.label}`,
                status: 'Actif',
              })),
              ...profile.events.filter((rule) => rule.enabled).map((rule) => ({
                name: rule.name,
                type: 'event',
                modifier: `${rule.mode === 'increase' ? '+' : '-'}${rule.modifierPct}%`,
                conditions: `${rule.startDate} → ${rule.endDate}`,
                status: 'Actif',
              })),
            ]}
          />
        </Panel>

        {showCompetitors && (
          <Panel title="Analyse Concurrence" desc="Airbnb et Booking.com" sx={{ mt: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: t.text3 }}>Votre ADR</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{formatMoney(listing.adr)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: t.text3 }}>Marché moyen</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.info }}>
                  {formatMoney(stats.avgMarketPrice)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: t.text3 }}>Écart</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: stats.priceVsMarket >= 0 ? t.success : t.error }}>
                  {stats.priceVsMarket > 0 ? '+' : ''}
                  {stats.priceVsMarket}%
                </Typography>
              </Box>
            </Stack>
          </Panel>
        )}

        <Dialog open={!!selectedDay} onClose={() => setSelectedDay(null)} maxWidth="sm" fullWidth>
          {selectedDay && (
            <DayDetailsDialog
              day={selectedDay}
              onClose={() => setSelectedDay(null)}
              onApply={() => applySuggestionToDay(selectedDay)}
            />
          )}
        </Dialog>

        <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Pricing Rules Editor</DialogTitle>
          <DialogContent>
            <PricingRulesEditor
              rules={editorRules}
              initialTab={editorInitialTab}
              onChange={handleEditorChange}
            />
          </DialogContent>
          <DialogActions>
            <Button sx={btnGhostSx} onClick={() => setEditorOpen(false)}>
              Fermer
            </Button>
            <Button
              sx={btnPrimarySx}
              onClick={() => {
                persistProfiles('Pricing rules sauvegardées');
                setEditorOpen(false);
              }}
            >
              Sauvegarder
            </Button>
          </DialogActions>
        </Dialog>

        <ActionToast
          open={toast.open}
          message={toast.message}
          severity={toast.severity}
          onClose={hideToast}
        />
      </Box>
    </DashboardWrapper>
  );
}
