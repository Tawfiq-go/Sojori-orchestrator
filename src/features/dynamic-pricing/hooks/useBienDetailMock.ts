import { useCallback, useMemo, useState } from 'react';
import type { BienViewProps } from '../BienView';
import { DEFAULT_PRICING_MODES, type PricingMode } from '../bien/PricingControls';
import type { PriceFactor } from '../_tokens';
import {
  buildCompMapPins,
  buildCompRows,
  buildMajorelleListing,
  buildMajorellePerformance,
  buildMarketChartsData,
  defaultEvents,
  defaultSuggestions,
  generateYearlyMock,
  MAJORELLE_ID,
} from './mockData';
import {
  compareSelfToCompsMedian,
  computeCompsMarketStats,
} from '../utils/computeCompsMarketStats';

export function useBienDetailMock(listingId: string | undefined): BienViewProps | null {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [floor, setFloor] = useState(900);
  const [ceiling, setCeiling] = useState(2800);
  const [mode, setMode] = useState<PricingMode>('equilibre');
  const [activeModeId, setActiveModeId] = useState('equilibre');
  const [calendarYear, setCalendarYear] = useState(2026);

  const listing = useMemo(() => buildMajorelleListing(), []);
  const charts = useMemo(() => buildMarketChartsData(), []);
  const calendarDays = useMemo(() => generateYearlyMock(calendarYear), [calendarYear]);
  const compRows = useMemo(() => buildCompRows(listing.name), [listing.name]);
  const compMapPins = useMemo(() => buildCompMapPins(), []);
  const compsMarketStats = useMemo(() => computeCompsMarketStats(compRows), [compRows]);
  const selfVsComps = useMemo(
    () => compareSelfToCompsMedian(compRows.find((r) => r.isSelf) ?? null, compsMarketStats),
    [compRows, compsMarketStats],
  );

  const onExpandDay = useCallback(async (_date: string) => {
    const factors: PriceFactor[] = [
      { key: 'base', label: 'Prix de base marché Guéliz', sub: 'Médiane juin', value: 1620, kind: 'base' },
      { key: 'season', label: 'Saisonnalité Marrakech juin', sub: '×1.05', value: 81, kind: 'plus' },
      { key: 'amen', label: 'Bonus amenities premium', sub: 'Piscine + parking', value: 85, kind: 'plus' },
      { key: 'wknd', label: 'Bonus weekend (vendredi-samedi)', sub: '', value: 50, kind: 'plus' },
      { key: 'trust', label: 'Pénalité confiance', sub: '1 seul avis', value: -73, kind: 'minus' },
      { key: 'demand', label: 'Ajustement demande pacing', sub: 'Fill rate comps 42%', value: 87, kind: 'plus' },
      { key: 'mode', label: 'Mode équilibré', sub: '×1.00', value: 0, kind: 'neutral' },
    ];
    return {
      factors,
      finalPrice: 1850,
      finalMinStay: 2,
      marketMinNights: 2,
      minStayFactors: [],
      competitorsDay: [
        { _id: 'c1', name: 'Apartment with rooftop pool', distance: 400, rating: 4.89, reviews: 210, bedrooms: 2, adrTtm: 2100, occTtm: 0.63, revenueTtm: 480_000 },
        { _id: 'c2', name: 'Gueliz Medina Apt', distance: 520, rating: 4.91, reviews: 98, bedrooms: 2, adrTtm: 1750, occTtm: 0.27, revenueTtm: 172_000 },
        { _id: 'c3', name: 'Exclusive apt city center', distance: 680, rating: 4.85, reviews: 156, bedrooms: 2, adrTtm: 1900, occTtm: 0.39, revenueTtm: 270_000 },
      ],
    };
  }, []);

  if (!listingId) return null;

  const effectiveId = listingId === MAJORELLE_ID || listingId.startsWith('sj-') ? listingId : MAJORELLE_ID;

  return {
    listing: { ...listing, _id: effectiveId },
    provenance: {
      snapshotAt: null,
      ttmPeriodLabel: null,
      calendarFromCache: false,
      hasAirroiSnapshot: false,
    },
    performance: buildMajorellePerformance(),
    market: {
      district: { adrMedian: 1097, occMedian: 0.44, growth: 0.12 },
      city: { adrMedian: 1542, occMedian: 0.44, growth: 0.25 },
      pacingByMonth: [],
      seasonality: [],
      leadTimeDays: 18,
      avgStayNights: 3.2,
      recoBounds: { floor: 800, ceiling: 2400 },
      kpis: charts.kpis,
    },
    comps: [],
    aiEnabled,
    floor,
    ceiling,
    mode,
    activeModeId,
    pricingModes: DEFAULT_PRICING_MODES,
    gapBlockEnabled: true,
    gapBlockMinNights: 2,
    modeEnabled: true,
    lastMinuteEnabled: true,
    lastMinuteFromDays: 1,
    lastMinuteToDays: 10,
    lastMinuteWindowDays: 10,
    lastMinuteDiscountPct: -15,
    occupancyBandsEnabled: true,
    occupancyLowMax: 30,
    occupancyLowAdj: -10,
    occupancyHighMin: 70,
    occupancyHighAdj: 15,
    pricingBaseSource: 'estimate' as const,
    manualBasePriceMad: 1000,
    eventsEnabled: true,
    applyPrice: true,
    applyMinStay: true,
    scopeModalOpen: false,
    scopeModalEdit: false,
    events: defaultEvents(),
    suggestions: defaultSuggestions(),
    calendarYear,
    calendarDays,
    calendarYearOptions: [2026, 2027],
    compsMarketStats,
    selfVsComps,
    hasCompsMarket: Boolean(compsMarketStats?.count),
    seasonality: charts.seasonality,
    pacing: charts.pacing,
    supplyGrowth: charts.supplyGrowth,
    compMapPins,
    bienMapPosition: { lat: 31.6295, lng: -7.9811 },
    compRows,
    estimatedRevenueMad: 198_400,
    estimatedRevenueLiftPct: 12,
    onToggleAi: setAiEnabled,
    onScopeModalClose: () => {},
    onScopeModalConfirm: async () => {},
    onEditSyncScope: () => {},
    onFloorChange: setFloor,
    onCeilingChange: setCeiling,
    onApplyRecoBounds: () => {
      setFloor(800);
      setCeiling(2400);
    },
    onActiveModeChange: (id) => {
      setActiveModeId(id);
      if (['prudent', 'equilibre', 'agressif'].includes(id)) setMode(id as PricingMode);
    },
    onModeToggle: () => {},
    onAddCustomMode: () => {},
    onUpdateCustomMode: () => {},
    onDeleteCustomMode: () => {},
    onGapBlockEnabledChange: () => {},
    onGapBlockMinNightsChange: () => {},
    onModeEnabledChange: () => {},
    onLastMinuteEnabledChange: () => {},
    onLastMinuteFromDaysChange: () => {},
    onLastMinuteToDaysChange: () => {},
    onLastMinuteDiscountPctChange: () => {},
    onOccupancyBandsEnabledChange: () => {},
    onOccupancyLowMaxChange: () => {},
    onOccupancyLowAdjChange: () => {},
    onOccupancyHighMinChange: () => {},
    onOccupancyHighAdjChange: () => {},
    onPricingBaseSourceChange: () => {},
    onManualBasePriceMadChange: () => {},
    onEventsEnabledChange: () => {},
    onAddEvent: () => console.log('[dynamic-pricing mock] add event'),
    onEditEvent: (id) => console.log('[dynamic-pricing mock] edit event', id),
    onDeleteEvent: (id) => console.log('[dynamic-pricing mock] delete event', id),
    onAcceptSuggestion: (id) => console.log('[dynamic-pricing mock] accept suggestion', id),
    onYearChange: setCalendarYear,
    onApplyToOps: () => {
      window.alert('Recommandations appliquées au calendrier ops (mock)');
    },
    onExpandDay,
  };
}
