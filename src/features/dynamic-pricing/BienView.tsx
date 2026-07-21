// ════════════════════════════════════════════════════════════════════
// BienView.tsx — Vue bien-par-bien (7 sections)
// Tous les composants sont importés depuis ./bien/*
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { T, KEYFRAMES, DP_LAYOUT_SX } from './_tokens';
import { BIEN_STICKY_FILTER_TOP_OFFSET } from './bien/BienPageStickyFilters';
import type { Listing, BienDetailPerformance, MarketData, CompListing, PriceFactor } from './_tokens';

import StatsCards from './bien/StatsCards';
import PricingControls from './bien/PricingControls';
import type {
  PricingMode,
  PricingModeDef,
  PricingEvent,
  PricingSuggestion,
} from './bien/PricingControls';
import type { CalendarDay } from './bien/YearlyCalendar';
import MarketCharts from './bien/MarketCharts';
import type { SeasonalityPoint, PacingPoint, SupplyGrowthPoint } from './bien/MarketCharts';
import type { CompsMarketStats, SelfVsComps } from './utils/computeCompsMarketStats';
import MarrakechMap from './bien/MarrakechMap';
import type { CompMapPin } from './bien/MarrakechMap';
import CompsTable from './bien/CompsTable';
import type { CompRow } from './bien/CompsTable';
import CompCompareModal from './bien/CompCompareModal';
import MarketDataFetchExplain from './bien/MarketDataFetchExplain';
import JustificationModalG7 from './JustificationModalG7';
import EventEditorModal from './bien/EventEditorModal';
import DynamicPriceScopeModal from './bien/DynamicPriceScopeModal';
import CalendarUpdateModal from './bien/CalendarUpdateModal';
import type { PilotApplyReportDto } from '../../services/dynamicPricingApi';
import PeriodRulesCard from './bien/PeriodRulesCard';
import PricePreviewCard from './bien/PricePreviewCard';
import { usePricePreviewSelectionOptional } from './bien/pricePreviewSelectionContext';
import { SectionSourceBar, type DataSourceItem } from './DataSourceBadges';
import DataEmptyPlaceholder from './DataEmptyPlaceholder';
import { normalizeCityKey } from './cityScope';

export type BienViewProvenance = {
  snapshotAt: string | null;
  ttmPeriodLabel?: string | null;
  calendarFromCache: boolean;
  hasAirroiSnapshot: boolean;
  hasRevenueEstimate?: boolean;
  perfSource?: 'airroi_snapshot' | 'estimate' | null;
};

export interface BienViewProps {
  /** Admin plateforme : TTM Airbnb, calendrier brut, refresh complet. */
  isPlatformAdmin?: boolean;
  listing: Listing;
  provenance: BienViewProvenance;
  hasTtm: boolean;
  hasL90d: boolean;
  /** Performances réelles GET /listings (admin badge). */
  hasTtmAirbnb?: boolean;
  hasL90dAirbnb?: boolean;
  /** Projection ADR × occ. ville (cache marché). */
  hasTtmCityMarket?: boolean;
  hasPacingCityMarket?: boolean;
  hasPotentialProd: boolean;
  hasMarketProd: boolean;
  hasCalendarProd: boolean;
  calendarFromAirroi?: boolean;
  calendarFromCache?: boolean;
  calendarUsesPilotPreview?: boolean;
  calendarHasEventOverlay?: boolean;
  calendarWindowMode?: 'rolling12m' | 'rolling365' | 'calendarYear';
  calendarPricingSource?: 'estimate' | 'sojori' | 'airroi';
  eventsCount?: number;
  calendarAirroiError?: string | null;
  airroiCalendarDaysCount?: number;
  potentialHint?: string;
  ttmHint?: string;
  pacingHint?: string;
  hasCompsProd: boolean;
  performance: BienDetailPerformance;
  market: MarketData;
  comps: CompListing[];

  aiEnabled: boolean;
  floor: number;
  ceiling: number;
  mode: PricingMode;
  activeModeId: string;
  pricingModes: PricingModeDef[];
  gapBlockEnabled: boolean;
  gapBlockMinNights: number;
  modeEnabled: boolean;
  lastMinuteEnabled: boolean;
  lastMinuteFromDays: number;
  lastMinuteToDays: number;
  lastMinuteWindowDays: number;
  lastMinuteDiscountPct: number;
  occupancyBandsEnabled: boolean;
  occupancyLowMax: number;
  occupancyLowAdj: number;
  occupancyHighMin: number;
  occupancyHighAdj: number;
  pricingBaseSource: 'estimate' | 'manual_base';
  manualBasePriceMad: number;
  eventsEnabled: boolean;
  applyPrice: boolean;
  applyMinStay: boolean;
  scopeModalOpen?: boolean;
  scopeModalEdit?: boolean;
  scopeSaving?: boolean;
  scopeSaveError?: string | null;
  configSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  events: PricingEvent[];
  eventModalOpen?: boolean;
  editingEventId?: string | null;
  suggestions: PricingSuggestion[];

  calendarYear: number;
  calendarDays: CalendarDay[];
  /** Jours AirROI brut pour comparer à la courbe pilote (2 graphes) */
  calendarMarketDays?: CalendarDay[];
  calendarOpsDays?: CalendarDay[];
  calendarYearOptions?: number[];

  compsMarketStats: CompsMarketStats | null;
  selfVsComps: SelfVsComps;
  hasCompsMarket: boolean;
  seasonality: SeasonalityPoint[];
  pacing: PacingPoint[];
  supplyGrowth: SupplyGrowthPoint[];

  compMapPins: CompMapPin[];
  bienMapPosition: { lat: number; lng: number } | null;

  compRows: CompRow[];
  /** Profil enrichi pour comparaison 1:1 avec un comp. */
  selfCompareProfile?: CompRow | null;
  selfCompareHint?: string;

  estimatedRevenueMad?: number;
  estimatedRevenueLiftPct?: number;
  boundsContextHint?: string;
  compsMedianAdr?: number;
  estimateAdrMad?: number;

  // Callbacks
  onToggleAi: (enabled: boolean) => void;
  onScopeModalClose?: () => void;
  onScopeModalConfirm?: (choice: { applyPrice: boolean; applyMinStay: boolean }) => void;
  onEditSyncScope?: () => void;
  onFloorChange: (v: number) => void;
  onCeilingChange: (v: number) => void;
  onApplyRecoBounds: () => void;
  onActiveModeChange: (modeId: string) => void;
  onModeToggle: (modeId: string, enabled: boolean) => void;
  onAddCustomMode: () => void;
  onUpdateCustomMode: (modeId: string, patch: Partial<Pick<PricingModeDef, 'label' | 'multiplier'>>) => void;
  onDeleteCustomMode: (modeId: string) => void;
  onGapBlockEnabledChange: (on: boolean) => void;
  onGapBlockMinNightsChange: (v: number) => void;
  onModeEnabledChange: (enabled: boolean) => void;
  onLastMinuteEnabledChange: (on: boolean) => void;
  onLastMinuteFromDaysChange: (v: number) => void;
  onLastMinuteToDaysChange: (v: number) => void;
  onLastMinuteDiscountPctChange: (v: number) => void;
  onOccupancyBandsEnabledChange: (on: boolean) => void;
  onOccupancyLowMaxChange: (v: number) => void;
  onOccupancyLowAdjChange: (v: number) => void;
  onOccupancyHighMinChange: (v: number) => void;
  onOccupancyHighAdjChange: (v: number) => void;
  onPricingBaseSourceChange: (v: 'estimate' | 'manual_base') => void;
  onManualBasePriceMadChange: (v: number) => void;
  onEventsEnabledChange: (on: boolean) => void;
  onAddEvent: () => void;
  onEventModalClose?: () => void;
  onEventSave?: (event: PricingEvent) => void | Promise<void>;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onToggleEventEnabled?: (id: string, on: boolean) => void | Promise<void>;
  onDuplicateEvent?: (id: string) => void | Promise<void>;
  onCreateEvent?: (event: PricingEvent) => void | Promise<void>;
  onAcceptSuggestion: (id: string) => void;
  onYearChange?: (year: number) => void;
  onApplyToOps: () => void | Promise<void>;
  onRunCalendarUpdate?: () => Promise<PilotApplyReportDto>;
  activeModeLabel?: string;
  onExpandDay: (date: string) => Promise<{
    factors: PriceFactor[];
    finalPrice: number;
    finalMinStay: number;
    marketMinNights: number;
    minStayFactors: Array<{ key: string; label: string; sub?: string; nights: number; kind: string }>;
    competitorsDay: CompListing[];
  }>;
  pilotPreviewLoading?: boolean;
  pilotApplyLoading?: boolean;
  pilotApplySummary?: string | null;
  pilotApplyError?: string | null;
  previewDiffData?: import('../../services/dynamicPricingApi').ApplyPreviewDiffDto | null;
  previewDiffLoading?: boolean;
  previewDiffError?: string | null;
  previewDiffOnlyChanged?: boolean;
  onPreviewDiffOnlyChanged?: (v: boolean) => void;
  onPreviewDiffReload?: () => void;
  previewDiffData?: import('../../services/dynamicPricingApi').ApplyPreviewDiffDto | null;
  previewDiffLoading?: boolean;
  previewDiffError?: string | null;
  previewDiffOnlyChanged?: boolean;
  onPreviewDiffOnlyChanged?: (v: boolean) => void;
  onPreviewDiffReload?: () => void;
}

export default function BienView(props: BienViewProps) {
  const {
    isPlatformAdmin = false,
    listing, provenance, hasTtm, hasL90d, hasTtmAirbnb, hasL90dAirbnb,
    hasTtmCityMarket, hasPacingCityMarket,
    hasPotentialProd, hasMarketProd, hasCalendarProd,
    calendarFromAirroi, calendarFromCache, calendarUsesPilotPreview, calendarHasEventOverlay,
    calendarWindowMode, calendarPricingSource, eventsCount, calendarAirroiError, airroiCalendarDaysCount,
    potentialHint, ttmHint, pacingHint, hasCompsProd,
    performance, market, aiEnabled,
    floor, ceiling, mode, activeModeId, pricingModes, gapBlockEnabled, gapBlockMinNights, modeEnabled,
    lastMinuteEnabled, lastMinuteFromDays, lastMinuteToDays, lastMinuteDiscountPct,
    occupancyBandsEnabled, occupancyLowMax, occupancyLowAdj, occupancyHighMin, occupancyHighAdj,
    pricingBaseSource, manualBasePriceMad, eventsEnabled,
    applyPrice, applyMinStay, scopeModalOpen, scopeModalEdit, scopeSaving, scopeSaveError,
    configSaveStatus, events, suggestions,
    eventModalOpen, editingEventId,
    calendarYear, calendarDays, calendarMarketDays, calendarOpsDays, calendarYearOptions,
    compsMarketStats, selfVsComps, hasCompsMarket,
    seasonality, pacing, supplyGrowth,
    compMapPins, bienMapPosition, compRows,
    selfCompareProfile, selfCompareHint,
    estimatedRevenueMad, estimatedRevenueLiftPct, boundsContextHint, compsMedianAdr, estimateAdrMad,
    onToggleAi, onScopeModalClose, onScopeModalConfirm, onEditSyncScope,
    onFloorChange, onCeilingChange, onApplyRecoBounds,
    previewDiffData, previewDiffLoading, previewDiffError,
    previewDiffOnlyChanged = true, onPreviewDiffOnlyChanged, onPreviewDiffReload,
    onActiveModeChange, onModeToggle, onAddCustomMode, onUpdateCustomMode, onDeleteCustomMode,
    onGapBlockEnabledChange, onGapBlockMinNightsChange, onModeEnabledChange,
    onLastMinuteEnabledChange, onLastMinuteFromDaysChange, onLastMinuteToDaysChange, onLastMinuteDiscountPctChange,
    onOccupancyBandsEnabledChange, onOccupancyLowMaxChange, onOccupancyLowAdjChange,
    onOccupancyHighMinChange, onOccupancyHighAdjChange,
    onPricingBaseSourceChange, onManualBasePriceMadChange, onEventsEnabledChange,
    onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    onToggleEventEnabled, onDuplicateEvent, onCreateEvent,
    onEventModalClose, onEventSave,
    onYearChange, onApplyToOps, onRunCalendarUpdate, activeModeLabel, onExpandDay,
    pilotPreviewLoading, pilotApplyLoading, pilotApplySummary, pilotApplyError,
  } = props;

  const [calendarUpdateOpen, setCalendarUpdateOpen] = useState(false);
  const [compareComp, setCompareComp] = useState<CompRow | null>(null);
  const previewSelection = usePricePreviewSelectionOptional();
  // Onglets : réglages · concurrence (owner + admin)
  const [advTab, setAdvTab] = useState<'reglages' | 'bien'>('reglages');
  const modeLabel =
    activeModeLabel ??
    pricingModes.find((m) => m.id === activeModeId)?.label ??
    mode;

  useEffect(() => {
    if (!previewSelection) return;
    previewSelection.setListingId(listing._id);
    previewSelection.setOnPreviewReload(onPreviewDiffReload ?? null);
    return () => {
      previewSelection.setListingId(null);
      previewSelection.setOnPreviewReload(null);
    };
  }, [listing._id, onPreviewDiffReload, previewSelection]);

  const cityLabel = normalizeCityKey(listing.city);

  /* ─── Modal G7 state ─── */
  const [g7Day, setG7Day] = useState<CalendarDay | null>(null);
  const [g7Factors, setG7Factors] = useState<PriceFactor[]>([]);
  const [g7MinStayFactors, setG7MinStayFactors] = useState<
    Array<{ key: string; label: string; sub?: string; nights: number; kind: string }>
  >([]);
  const [g7FinalMinStay, setG7FinalMinStay] = useState(1);
  const [g7MarketMinNights, setG7MarketMinNights] = useState(1);
  const [g7CompsDay, setG7CompsDay] = useState<CompListing[]>([]);
  const [g7Loading, setG7Loading] = useState(false);

  const handleDayClick = async (d: CalendarDay) => {
    setG7Day(d);
    setG7Loading(true);
    try {
      const result = await onExpandDay(d.date);
      setG7Factors(result.factors);
      setG7MinStayFactors(result.minStayFactors);
      setG7FinalMinStay(result.finalMinStay);
      setG7MarketMinNights(result.marketMinNights);
      setG7CompsDay(result.competitorsDay);
    } finally {
      setG7Loading(false);
    }
  };

  return (
    <Box sx={{ ...DP_LAYOUT_SX }}>
      <style>{KEYFRAMES}</style>
      {isPlatformAdmin ? (
        <>
          {/* ── Bandeau sticky (admin) ── */}
          <Box sx={{
            position: 'sticky', top: BIEN_STICKY_FILTER_TOP_OFFSET, zIndex: 30,
            bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(180%)',
            borderBottom: `1px solid ${T.border}`,
            px: 0,
            py: 1.75,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: { xs: 1.5, md: 2 },
          }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 1.625,
              background: 'linear-gradient(135deg, #fde68a, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
              flexShrink: 0, boxShadow: '0 6px 16px rgba(217,119,6,0.25)',
            }}>🏠</Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: { xs: 16, md: 18 },
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                }}
              >
                {listing.name}
              </Typography>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', gap: 0.75,  fontSize: 12, color: T.text3, mt: 0.25, flexWrap: 'wrap' }}
              >
                📍{' '}
                {[listing.district, listing.city].filter((x) => x && x !== '—').join(', ') ||
                  listing.city ||
                  '—'}
                {listing.airroiZone && (
                  <Box component="span" sx={{
                    fontFamily: '"Geist Mono", monospace', bgcolor: T.bg2,
                    px: 0.875, py: 0.125, borderRadius: 0.625,
                    fontSize: 10.5, fontWeight: 600, color: T.text2,
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  }}>
                    Zone marché : {listing.airroiZone} <Box component="b" sx={{ color: T.success }}>✓</Box>
                  </Box>
                )}
              </Stack>
              <Stack direction="row" sx={{ gap: 1.5, 
                mt: 0.625, fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
                flexWrap: 'wrap',
              }}>
                <span>🛏 {listing.bedrooms} chambres</span>
                <span>👥 {listing.maxGuests} voyageurs max</span>
                {listing.personCapacityPricing != null &&
                listing.personCapacityPricing > 0 &&
                listing.personCapacityPricing !== listing.maxGuests ? (
                  <span title="Capacité tarifaire de base (hors estimation marché)">
                    (tarif base {listing.personCapacityPricing} pers.)
                  </span>
                ) : null}
                {listing.airroiApiProfile ? (
                  <Box
                    component="span"
                    title="Profil utilisé pour l’estimation Sojori et les comparables (sans adresse ni GPS)"
                    sx={{ color: T.text2, fontWeight: 600 }}
                  >
                    {listing.airroiApiProfile}
                  </Box>
                ) : null}
                {listing.amenities.slice(0, 3).map((a, i) => <span key={i}>{a}</span>)}
              </Stack>
            </Box>
            <Box sx={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 1, p: '6px 12px',
              border: `1px solid ${aiEnabled ? T.gold : T.border}`, borderRadius: 1.5,
              bgcolor: aiEnabled ? T.goldTint : T.bg2,
            }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: aiEnabled ? T.goldDeep : T.text3 }}>
                {aiEnabled ? 'Pilote actif' : 'Pilote inactif'}
              </Typography>
              <SyncScopeChip label="Prix" active={applyPrice} />
              <SyncScopeChip label="Min stay" active={applyMinStay} />
              {onEditSyncScope ? (
                <Typography
                  component="span"
                  onClick={() => onEditSyncScope()}
                  sx={{ cursor: 'pointer', fontSize: 10.5, color: T.goldDeep, fontWeight: 700, textDecoration: 'underline' }}
                >
                  Modifier
                </Typography>
              ) : null}
            </Box>
            <Box sx={{
              flex: '0 0 auto',
              fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
              background: 'linear-gradient(135deg, #1a1408, #332b1c)', color: T.gold,
              px: 1.375, py: 0.625, borderRadius: '99px', letterSpacing: '0.04em',
            }}>★ SOJORI PRO</Box>
          </Box>
          <Box sx={{ ...DP_LAYOUT_SX, pb: 1.5 }}>
            <SectionSourceBar
              compact
              items={[
                { kind: 'prod', label: 'PROD', tooltip: 'srv-listing + canaux' },
                {
                  kind: provenance.hasAirroiSnapshot ? 'prod' : 'empty',
                  label: provenance.hasAirroiSnapshot ? 'Zone OK' : 'VIDE',
                },
              ]}
              snapshotAt={provenance.snapshotAt}
              snapshotLabel={
                provenance.hasRevenueEstimate ? 'Estimation Sojori' : 'Données marché'
              }
            />
          </Box>
        </>
      ) : null}

      {/* ── Onglets vue avancée ── */}
      <Box sx={{ ...DP_LAYOUT_SX, pb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {([
            ['reglages', '⚙️ Réglages pricing'],
            ['bien', '📊 Concurrence'],
          ] as const).map(([key, label]) => (
            <Box
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => setAdvTab(key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAdvTab(key); } }}
              sx={{
                px: 1.75, py: 0.75, borderRadius: '99px', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 800, userSelect: 'none',
                border: `1.5px solid ${advTab === key ? T.gold : T.border}`,
                bgcolor: advTab === key ? T.goldTint : T.bg1,
                color: advTab === key ? T.goldDeep : T.text2,
                '&:hover': { borderColor: T.gold },
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── Réglages pricing (potentiel + réglages + aperçu prix) ── */}
      {advTab === 'reglages' ? (<>
      <Section
        num="02"
        title="Le potentiel de votre bien"
        sub={`District · ${listing.district} · ${listing.city}`}
        sources={[
          { kind: hasPotentialProd ? 'prod' : 'empty', label: hasPotentialProd ? 'Estimation Sojori' : 'Potentiel VIDE' },
          {
            kind: hasTtmAirbnb ? 'prod' : hasTtmCityMarket ? 'partial' : hasTtm ? 'partial' : 'empty',
            label: hasTtmAirbnb
              ? 'TTM Airbnb'
              : hasTtmCityMarket
                ? 'TTM ville'
                : hasTtm
                  ? 'TTM estim.'
                  : 'TTM VIDE',
          },
          {
            kind: hasPacingCityMarket ? 'partial' : hasL90dAirbnb ? 'prod' : hasL90d ? 'partial' : 'empty',
            label: hasPacingCityMarket
              ? 'Occ. ville'
              : hasL90dAirbnb
                ? 'L90D Airbnb'
                : hasL90d
                  ? 'Occ. projetée'
                  : 'Pacing VIDE',
          },
        ]}
        snapshotAt={provenance.snapshotAt}
        snapshotLabel={
          provenance.hasRevenueEstimate ? 'Estimation Sojori' : 'Données marché'
        }
        sourceNote={provenance.ttmPeriodLabel ?? undefined}
      >
        <StatsCards
          hasPotentialProd={hasPotentialProd}
          hasTtm={hasTtm}
          hasL90d={hasL90d}
          potentialAnnual={performance.potentialAnnual}
          potentialUsd={performance.potentialUsd}
          performance={performance.ttm}
          pacing={performance.pacing}
          potentialHint={potentialHint}
          ttmHint={ttmHint}
          pacingHint={pacingHint}
          ownerMode={!isPlatformAdmin}
        />
      </Section>
      <Box sx={{ position: 'relative' }}>
        {configSaveStatus !== 'idle' ? (
          <Typography
            sx={{
              position: 'absolute', top: -4, right: 0, zIndex: 1,
              fontSize: 11, fontWeight: 700, fontFamily: '"Geist Mono", monospace',
              color: configSaveStatus === 'error' ? T.error : configSaveStatus === 'saving' ? T.text3 : T.success,
            }}
          >
            {configSaveStatus === 'saving' ? 'Enregistrement…' : configSaveStatus === 'saved' ? '✓ Enregistré' : 'Erreur — réessayez'}
          </Typography>
        ) : null}
        <PricingControls
          compactGuide={!isPlatformAdmin}
          floor={floor} ceiling={ceiling}
          floorRange={[0, 20_000]} ceilingRange={[0, 20_000]}
          recoFloor={market.recoBounds?.floor ?? 0} recoCeiling={market.recoBounds?.ceiling ?? 0}
          pricingModes={pricingModes}
          activeModeId={activeModeId}
          modeEnabled={modeEnabled}
          gapBlockEnabled={gapBlockEnabled}
          gapBlockMinNights={gapBlockMinNights}
          lastMinuteEnabled={lastMinuteEnabled}
          lastMinuteFromDays={lastMinuteFromDays}
          lastMinuteToDays={lastMinuteToDays}
          lastMinuteWindowDays={lastMinuteToDays}
          lastMinuteDiscountPct={lastMinuteDiscountPct}
          occupancyBandsEnabled={occupancyBandsEnabled}
          occupancyLowMax={occupancyLowMax}
          occupancyLowAdj={occupancyLowAdj}
          occupancyHighMin={occupancyHighMin}
          occupancyHighAdj={occupancyHighAdj}
          pricingBaseSource={pricingBaseSource}
          manualBasePriceMad={manualBasePriceMad}
          eventsEnabled={eventsEnabled}
          events={events} suggestions={suggestions}
          hasBoundsProd={floor > 0 && ceiling > 0}
          estimatedRevenue={estimatedRevenueMad}
          estimatedRevenueLiftPct={estimatedRevenueLiftPct}
          onFloorChange={onFloorChange} onCeilingChange={onCeilingChange}
          onGapBlockEnabledChange={onGapBlockEnabledChange}
          onGapBlockMinNightsChange={onGapBlockMinNightsChange}
          onModeEnabledChange={onModeEnabledChange}
          onLastMinuteEnabledChange={onLastMinuteEnabledChange}
          onLastMinuteFromDaysChange={onLastMinuteFromDaysChange}
          onLastMinuteToDaysChange={onLastMinuteToDaysChange}
          onLastMinuteDiscountPctChange={onLastMinuteDiscountPctChange}
          onOccupancyBandsEnabledChange={onOccupancyBandsEnabledChange}
          onOccupancyLowMaxChange={onOccupancyLowMaxChange}
          onOccupancyLowAdjChange={onOccupancyLowAdjChange}
          onOccupancyHighMinChange={onOccupancyHighMinChange}
          onOccupancyHighAdjChange={onOccupancyHighAdjChange}
          onPricingBaseSourceChange={onPricingBaseSourceChange}
          onManualBasePriceMadChange={onManualBasePriceMadChange}
          onEventsEnabledChange={onEventsEnabledChange}
          onApplyRecoBounds={onApplyRecoBounds}
          onActiveModeChange={onActiveModeChange}
          onModeToggle={onModeToggle}
          onAddCustomMode={onAddCustomMode}
          onUpdateCustomMode={onUpdateCustomMode}
          onDeleteCustomMode={onDeleteCustomMode}
          onAddEvent={onAddEvent} onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}           onAcceptSuggestion={onAcceptSuggestion}
          boundsContextHint={boundsContextHint}
        />
      </Box>

      {/* ── Règles par période (style Hostaway) ── */}
      <Section
        num="04"
        title="Règles par période"
        sub="Une période, un effet — ex. GITEX +25 % vs marché · prioritaire sur tous les autres réglages"
      >
        <PeriodRulesCard
          events={events}
          eventsEnabled={eventsEnabled}
          onEventsEnabledChange={onEventsEnabledChange}
          onCreateEvent={onCreateEvent}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
          onToggleEventEnabled={onToggleEventEnabled}
          onDuplicateEvent={onDuplicateEvent}
        />
      </Section>

      {/* ── Aperçu des prix (super vue) ── */}
      <Section
        num="05"
        title="Aperçu des prix"
        sub="Estimé (marché) → Sojori (après réglages) → calendrier actuel · résas et blocages en couleurs"
      >
        <PricePreviewCard
          data={previewDiffData ?? null}
          loading={previewDiffLoading}
          error={previewDiffError}
          onReload={onPreviewDiffReload}
          events={events}
        />
      </Section>

      </>) : null}

      {/* ── Concurrence (owner + admin) ── */}
      {advTab === 'bien' ? (<>
      <MarketDataFetchExplain isPlatformAdmin={isPlatformAdmin} />
      {(hasCompsMarket || (selfVsComps && (selfVsComps.adrDeltaPct != null || selfVsComps.occDeltaPts != null))) ? (
      <Section
        num="01"
        title="Votre bien vs concurrents"
        sub="Médianes TTM des comparables de cette annonce"
        sources={[
          hasCompsMarket
            ? { kind: 'prod', label: 'Comps listing' }
            : { kind: 'empty', label: 'VIDE' },
        ]}
      >
        <MarketCharts
          variant="listing"
          cityName={cityLabel}
          compsStats={compsMarketStats}
          selfVsComps={selfVsComps}
          seasonality={[]}
          pacing={[]}
          supplyGrowth={[]}
          hasCompsStats={hasCompsMarket}
        />
      </Section>
      ) : null}

      {/* ── Carte ── */}
      <Section
        num="02"
        title={`Carte · positionnement`}
        sub={`GPS fiche listing · ${compMapPins.length} concurrents autour`}
        sources={[
          bienMapPosition
            ? { kind: 'prod', label: 'Carte OSM', tooltip: 'Leaflet · OpenStreetMap' }
            : { kind: 'empty', label: 'VIDE', tooltip: 'GPS bien manquant' },
        ]}
      >
        {bienMapPosition ? (
          <MarrakechMap
            compositions={compMapPins}
            bien={{ lat: bienMapPosition.lat, lng: bienMapPosition.lng, name: listing.name }}
          />
        ) : (
          <DataEmptyPlaceholder
            hint={
              compRows.length > 1
                ? 'Comps en base mais GPS du bien manquant — vérifiez lat/lng sur la fiche listing.'
                : 'Carte — actualiser les performances de l’annonce (comparables + GPS)'
            }
          />
        )}
      </Section>

      {/* ── Tableau concurrents ── */}
      <Section
        num="03"
        title={`Vos ${Math.max(0, compRows.length - 1)} concurrents directs`}
        sub="Comparables de l’annonce · tri colonnes"
        sources={[
          hasCompsProd || compRows.length > 0
            ? { kind: 'prod', label: 'Comps snapshot' }
            : { kind: 'empty', label: 'VIDE' },
        ]}
      >
        <CompsTable
          rows={compRows.filter((r) => isPlatformAdmin || !r.isSelf)}
          showFullDetail
          onCompare={selfCompareProfile ? (row) => setCompareComp(row) : undefined}
        />
      </Section>
      {provenance.hasRevenueEstimate && !hasCompsProd ? (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: T.warningTint,
            border: `1px solid ${T.warning}`,
            fontSize: 12,
            color: T.text2,
            lineHeight: 1.5,
          }}
        >
          {isPlatformAdmin ? (
            <>
              <b>Estimation OK</b> — pas encore de comparables sur ce listing (
              <code style={{ fontSize: 11 }}>{listing._id}</code>). Bandeau →{' '}
              <b>Actualiser concurrence</b> (~0,10 $, ~25 annonces voisines).
            </>
          ) : (
            <>
              <b>Estimation OK</b> — vos concurrents seront récupérés automatiquement (lun.) ou
              contactez Sojori pour un refresh immédiat.
            </>
          )}
        </Box>
      ) : null}
      </>) : null}

      <CompCompareModal
        open={Boolean(compareComp && selfCompareProfile)}
        self={selfCompareProfile ?? null}
        comp={compareComp}
        selfSourceHint={selfCompareHint}
        onClose={() => setCompareComp(null)}
      />

      {/* ── Modale G7 ── */}
      <EventEditorModal
        open={Boolean(eventModalOpen)}
        initial={editingEventId ? events.find((e) => e.id === editingEventId) ?? null : null}
        onClose={() => onEventModalClose?.()}
        onSave={(ev) => void onEventSave?.(ev)}
      />

      <DynamicPriceScopeModal
        open={Boolean(scopeModalOpen)}
        editMode={scopeModalEdit}
        saving={scopeSaving}
        errorMessage={scopeSaveError}
        listingName={listing.name}
        initialApplyPrice={applyPrice}
        initialApplyMinStay={applyMinStay}
        onClose={() => onScopeModalClose?.()}
        onConfirm={(c) => void onScopeModalConfirm?.(c)}
      />

      <CalendarUpdateModal
        open={calendarUpdateOpen && Boolean(onRunCalendarUpdate)}
        listingName={listing.name}
        hasEstimate={Boolean(provenance.hasRevenueEstimate)}
        estimateSnapshotAt={provenance.snapshotAt}
        applyPrice={applyPrice}
        applyMinStay={applyMinStay}
        floor={floor}
        ceiling={ceiling}
        gapBlockEnabled={gapBlockEnabled}
        gapBlockMinNights={gapBlockMinNights}
        eventsCount={eventsCount ?? events.length}
        activeModeLabel={modeLabel}
        modeEnabled={modeEnabled}
        occupancyBandsEnabled={occupancyBandsEnabled}
        occupancyLowMax={occupancyLowMax}
        occupancyLowAdj={occupancyLowAdj}
        occupancyHighMin={occupancyHighMin}
        occupancyHighAdj={occupancyHighAdj}
        lastMinuteEnabled={lastMinuteEnabled}
        lastMinuteFromDays={lastMinuteFromDays}
        lastMinuteToDays={lastMinuteToDays}
        lastMinuteWindowDays={lastMinuteToDays}
        lastMinuteDiscountPct={lastMinuteDiscountPct}
        onClose={() => setCalendarUpdateOpen(false)}
        onRun={onRunCalendarUpdate ?? (async () => {
          throw new Error('Mise à jour calendrier indisponible');
        })}
      />

      <JustificationModalG7
        open={!!g7Day}
        date={g7Day?.date || ''}
        factors={g7Factors}
        minStayFactors={g7MinStayFactors}
        finalMinStay={g7FinalMinStay}
        marketMinNights={g7MarketMinNights}
        loading={g7Loading}
        comps={isPlatformAdmin ? g7CompsDay : []}
        total={g7Day?.recommendedPrice || 0}
        onClose={() => setG7Day(null)}
        onApply={() => setG7Day(null)}
        onEditManual={() => setG7Day(null)}
      />
    </Box>
  );
}

function SyncScopeChip({
  label,
  active,
  inactiveColor = T.text3,
}: {
  label: string;
  active: boolean;
  inactiveColor?: string;
}) {
  return (
    <Box
      sx={{
        fontSize: 9.5,
        fontWeight: 800,
        fontFamily: '"Geist Mono", monospace',
        px: 0.625,
        py: 0.125,
        borderRadius: '99px',
        bgcolor: active ? 'rgba(46,125,50,0.12)' : 'rgba(211,47,47,0.10)',
        color: active ? T.success : inactiveColor,
        border: `1px solid ${active ? T.success : inactiveColor}`,
      }}
    >
      {label} {active ? '✓' : '✗'}
    </Box>
  );
}

function Section({
  num,
  title,
  sub,
  sources,
  snapshotAt,
  snapshotLabel,
  sourceNote,
  children,
}: {
  num: string;
  title: string;
  sub: string;
  sources?: DataSourceItem[];
  snapshotAt?: string | null;
  snapshotLabel?: string;
  sourceNote?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        px: 0,
        py: { xs: 3, md: 5 },
        animation: 'sj-fadeIn 0.5s both',
      }}
    >
      <Stack sx={{ gap: 1, mb: 2, ...DP_LAYOUT_SX }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25,  minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 0.875,
              bgcolor: T.bg3,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {num}
          </Box>
          <Typography
            sx={{
              fontSize: { xs: 18, md: 22 },
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              minWidth: 0,
            }}
          >
            {title}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: 13,
            color: T.text3,
            lineHeight: 1.45,
            pl: { xs: 0, sm: 4.75 },
            maxWidth: 900,
          }}
        >
          {sub}
        </Typography>
        {sources && sources.length > 0 && (
          <Box sx={{ pl: { xs: 0, sm: 4.75 }, width: '100%' }}>
            <SectionSourceBar
              items={sources}
              snapshotAt={snapshotAt}
              snapshotLabel={snapshotLabel}
              note={sourceNote}
            />
          </Box>
        )}
      </Stack>
      <Box sx={{ ...DP_LAYOUT_SX }}>{children}</Box>
    </Box>
  );
}
