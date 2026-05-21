// ════════════════════════════════════════════════════════════════════
// BienView.tsx — Vue bien-par-bien (7 sections)
// Tous les composants sont importés depuis ./bien/*
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { T, KEYFRAMES } from './_tokens';
import type { Listing, BienDetailPerformance, MarketData, CompListing, PriceFactor } from './_tokens';

import StatsCards from './bien/StatsCards';
import PricingControls from './bien/PricingControls';
import type {
  PricingMode,
  PricingModeDef,
  PricingEvent,
  PricingSuggestion,
} from './bien/PricingControls';
import YearlyCalendar from './bien/YearlyCalendar';
import type { CalendarDay, CalendarWindowMode } from './bien/YearlyCalendar';
import MarketCharts from './bien/MarketCharts';
import type { SeasonalityPoint, PacingPoint, SupplyGrowthPoint } from './bien/MarketCharts';
import type { CompsMarketStats, SelfVsComps } from './utils/computeCompsMarketStats';
import MarrakechMap from './bien/MarrakechMap';
import type { CompMapPin } from './bien/MarrakechMap';
import CompsTable from './bien/CompsTable';
import type { CompRow } from './bien/CompsTable';
import JustificationModalG7 from './JustificationModalG7';
import EventEditorModal from './bien/EventEditorModal';
import DynamicPriceScopeModal from './bien/DynamicPriceScopeModal';
import { SectionSourceBar, type DataSourceItem } from './DataSourceBadges';
import DataEmptyPlaceholder from './DataEmptyPlaceholder';
import { normalizeCityKey } from './cityScope';

export type BienViewProvenance = {
  snapshotAt: string | null;
  ttmPeriodLabel?: string | null;
  calendarFromCache: boolean;
  hasAirroiSnapshot: boolean;
};

export interface BienViewProps {
  listing: Listing;
  provenance: BienViewProvenance;
  hasTtm: boolean;
  hasL90d: boolean;
  hasPotentialProd: boolean;
  hasMarketProd: boolean;
  hasCalendarProd: boolean;
  calendarFromAirroi?: boolean;
  calendarFromCache?: boolean;
  calendarUsesPilotPreview?: boolean;
  calendarHasEventOverlay?: boolean;
  calendarUsesRolling365?: boolean;
  eventsCount?: number;
  calendarAirroiError?: string | null;
  airroiCalendarDaysCount?: number;
  potentialHint?: string;
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
  minStayDelta: number;
  minStayPlancher: number;
  modeEnabled: boolean;
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

  estimatedRevenueMad?: number;
  estimatedRevenueLiftPct?: number;

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
  onMinStayDeltaChange: (v: number) => void;
  onMinStayPlancherChange: (v: number) => void;
  onModeEnabledChange: (enabled: boolean) => void;
  onAddEvent: () => void;
  onEventModalClose?: () => void;
  onEventSave?: (event: PricingEvent) => void | Promise<void>;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onYearChange?: (year: number) => void;
  onApplyToOps: () => void | Promise<void>;
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
}

export default function BienView(props: BienViewProps) {
  const {
    listing, provenance, hasTtm, hasL90d, hasPotentialProd, hasMarketProd, hasCalendarProd,
    calendarFromAirroi, calendarFromCache, calendarUsesPilotPreview, calendarHasEventOverlay,
    calendarUsesRolling365, eventsCount, calendarAirroiError, airroiCalendarDaysCount,
    potentialHint, hasCompsProd,
    performance, market, aiEnabled,
    floor, ceiling, mode, activeModeId, pricingModes, minStayDelta, minStayPlancher, modeEnabled,
    applyPrice, applyMinStay, scopeModalOpen, scopeModalEdit, scopeSaving, scopeSaveError,
    configSaveStatus, events, suggestions,
    eventModalOpen, editingEventId,
    calendarYear, calendarDays, calendarMarketDays, calendarYearOptions,
    compsMarketStats, selfVsComps, hasCompsMarket,
    seasonality, pacing, supplyGrowth,
    compMapPins, bienMapPosition, compRows,
    estimatedRevenueMad, estimatedRevenueLiftPct,
    onToggleAi, onScopeModalClose, onScopeModalConfirm, onEditSyncScope,
    onFloorChange, onCeilingChange, onApplyRecoBounds,
    onActiveModeChange, onModeToggle, onAddCustomMode, onUpdateCustomMode, onDeleteCustomMode,
    onMinStayDeltaChange, onMinStayPlancherChange, onModeEnabledChange,
    onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    onEventModalClose, onEventSave,
    onYearChange, onApplyToOps, onExpandDay,
    pilotPreviewLoading, pilotApplyLoading, pilotApplySummary, pilotApplyError,
  } = props;

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
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      <style>{KEYFRAMES}</style>
      {/* ── Bandeau sticky ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 30,
        bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: `1px solid ${T.border}`,
        px: { xs: 2, md: 3.5 },
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
          }}>
            <span>🛏 {listing.bedrooms} chambres</span>
            <span>👥 {listing.maxGuests} voyageurs</span>
            {listing.amenities.slice(0, 3).map((a, i) => <span key={i}>{a}</span>)}
          </Stack>
        </Box>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onToggleAi(!aiEnabled)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleAi(!aiEnabled);
            }
          }}
          sx={{
          flex: '0 0 auto',
          display: 'flex', alignItems: 'center', gap: 1.5, p: '8px 14px',
          cursor: 'pointer',
          background: aiEnabled
            ? `linear-gradient(135deg, ${T.goldTint}, ${T.bg1})`
            : T.bg2,
          border: `1px solid ${aiEnabled ? T.gold : T.border}`,
          borderRadius: 1.5,
          animation: aiEnabled ? 'sj-pulseGold 2.4s infinite' : undefined,
        }}>
          <Box sx={{
            width: 36, height: 20, bgcolor: aiEnabled ? T.gold : T.bg3,
            borderRadius: '99px', position: 'relative', flexShrink: 0,
            '&::after': {
              content: '""', position: 'absolute', top: 2,
              [aiEnabled ? 'right' : 'left']: 2,
              width: 16, height: 16, bgcolor: '#fff', borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.20)',
            },
          }} />
          <Box>
            <Typography sx={{
              fontSize: 14, fontWeight: 800, lineHeight: 1.1,
              color: aiEnabled ? T.goldDeep : T.text3,
            }}>Sojori AI</Typography>
            <Typography sx={{
              fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700,
            }}>{aiEnabled ? 'Sync auto ON (cron + snapshot)' : 'Sync auto OFF — écran inchangé'}</Typography>
            {aiEnabled ? (
              <Stack direction="row" sx={{ gap: 0.75,  mt: 0.5, flexWrap: 'wrap' }}>
                <SyncScopeChip label="Prix" active={applyPrice} />
                <SyncScopeChip label="Min stay" active={applyMinStay} inactiveColor="#d32f2f" />
                {onEditSyncScope ? (
                  <Typography
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSyncScope();
                    }}
                    sx={{
                      cursor: 'pointer',
                      fontSize: 10,
                      color: T.goldDeep,
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    Modifier
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </Box>
        </Box>
        <Box sx={{
          flex: '0 0 auto',
          fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          background: 'linear-gradient(135deg, #1a1408, #332b1c)', color: T.gold,
          px: 1.375, py: 0.625, borderRadius: '99px', letterSpacing: '0.04em',
        }}>★ SOJORI PRO</Box>
      </Box>
      <Box sx={{ px: { xs: 2, md: 3.5 }, pb: 1.5, maxWidth: 1440, mx: 'auto', width: '100%' }}>
        <SectionSourceBar
          compact
          items={[
            { kind: 'prod', label: 'PROD', tooltip: 'srv-listing + OTA' },
            {
              kind: provenance.hasAirroiSnapshot ? 'prod' : 'empty',
              label: provenance.hasAirroiSnapshot ? 'Zone OK' : 'VIDE',
            },
          ]}
          snapshotAt={provenance.snapshotAt}
          snapshotLabel="Snapshot marché"
        />
      </Box>

      {/* ── Section 2 ── */}
      <Section
        num="02"
        title="Le potentiel de votre bien"
        sub={`District · ${listing.district} · ${listing.city}`}
        sources={[
          { kind: hasTtm ? 'prod' : 'empty', label: hasTtm ? 'TTM PROD' : 'TTM VIDE' },
          { kind: hasL90d ? 'prod' : 'empty', label: hasL90d ? 'L90D PROD' : 'L90D VIDE' },
          {
            kind: hasPotentialProd ? 'prod' : 'empty',
            label: hasPotentialProd ? 'Potentiel comps' : 'Potentiel VIDE',
          },
        ]}
        snapshotAt={provenance.snapshotAt}
        snapshotLabel="Snapshot marché"
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
        />
      </Section>

      {/* ── Section 3 — toujours visible (AI OFF = pas de sync auto seulement) ── */}
      <Section
        num="03"
        title="Configurez votre pricing"
        sub={
          configSaveStatus === 'saving'
            ? 'Enregistrement automatique…'
            : configSaveStatus === 'saved'
              ? 'Modifications enregistrées (auto-save ~1s)'
              : configSaveStatus === 'error'
                ? 'Erreur enregistrement — réessayez ou activez Sojori AI'
                : 'Bornes, modes, min stay, events — sauvegarde auto après chaque réglage'
        }
        sources={[
          { kind: floor > 0 ? 'prod' : 'empty', label: 'Bornes' },
          { kind: events.length > 0 ? 'prod' : 'empty', label: events.length ? `${events.length} event(s)` : 'Événements' },
        ]}
      >
        <PricingControls
          floor={floor} ceiling={ceiling}
          floorRange={[500, 3000]} ceilingRange={[1500, 8000]}
          recoFloor={market.recoBounds?.floor ?? 0} recoCeiling={market.recoBounds?.ceiling ?? 0}
          pricingModes={pricingModes}
          activeModeId={activeModeId}
          modeEnabled={modeEnabled}
          minStaySyncActive={aiEnabled && applyMinStay}
          minStayDelta={minStayDelta}
          minStayPlancher={minStayPlancher}
          events={events} suggestions={suggestions}
          hasBoundsProd={floor > 0 && ceiling > 0}
          estimatedRevenue={estimatedRevenueMad}
          estimatedRevenueLiftPct={estimatedRevenueLiftPct}
          onFloorChange={onFloorChange} onCeilingChange={onCeilingChange}
          onMinStayDeltaChange={onMinStayDeltaChange}
          onMinStayPlancherChange={onMinStayPlancherChange}
          onModeEnabledChange={onModeEnabledChange}
          onApplyRecoBounds={onApplyRecoBounds}
          onActiveModeChange={onActiveModeChange}
          onModeToggle={onModeToggle}
          onAddCustomMode={onAddCustomMode}
          onUpdateCustomMode={onUpdateCustomMode}
          onDeleteCustomMode={onDeleteCustomMode}
          onAddEvent={onAddEvent} onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent} onAcceptSuggestion={onAcceptSuggestion}
        />
      </Section>

      {/* ── Section 4 — toujours visible si snapshot / calendrier (même AI OFF) ── */}
      {(hasCalendarProd || provenance.hasAirroiSnapshot || calendarDays.length > 0) && (
        <Section
          num="04"
          title={
            calendarUsesPilotPreview
              ? 'Calendrier pilote Sojori'
              : calendarHasEventOverlay
                ? 'Marché + events (aperçu)'
                : calendarFromAirroi
                  ? 'Suggestion de prix marché'
                  : 'Calendrier de recommandations'
          }
          sub={
            calendarUsesPilotPreview
              ? `${calendarDays.length} jours · pilote v2 (modes, bornes${(eventsCount ?? 0) > 0 ? ', events' : ''}) · courbe 365j`
              : calendarHasEventOverlay
                ? `${calendarDays.length} j · events en orange sur la courbe · preview pilote en cours…`
                : calendarFromAirroi
              ? `${calendarDays.length} jours · courbe + grille à partir du mois courant (365 j futurs)`
              : pilotPreviewLoading
                ? 'Simulation pilote v2…'
                : calendarFromCache
                  ? `Prix/jour · pilote Sojori (mixEngine v2 + audit G7)${pilotApplySummary ? ` · ${pilotApplySummary}` : ''}`
                  : aiEnabled
                    ? 'Activez le pilote §03 ou lancez ⟳ snapshot pour les tarifs/jour'
                    : '365 jours · snapshot marché requis (⟳ sur cette fiche)'
          }
          sources={[
            calendarUsesPilotPreview || calendarHasEventOverlay
              ? {
                  kind: 'prod',
                  label: (eventsCount ?? 0) > 0 ? 'Pilote + events' : 'Pilote v2',
                  tooltip: 'Preview mixEngine · jours event = prix forcé (orange)',
                }
              : calendarFromAirroi
              ? { kind: 'prod', label: 'Prix/jour', tooltip: 'future/rates snapshot · fenêtre glissante 365j' }
              : calendarFromCache || pilotPreviewLoading
                ? { kind: 'prod', label: 'Pilote v2', tooltip: 'POST preview / apply' }
                : { kind: 'empty', label: 'VIDE' },
          ]}
        >
          {pilotApplyError ? (
            <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600, mb: 1 }}>
              {pilotApplyError}
            </Typography>
          ) : null}
          <YearlyCalendar
            days={calendarDays}
            compareMarketDays={calendarMarketDays}
            compactHeader
            pricingSource={
              calendarUsesPilotPreview || calendarHasEventOverlay ? 'sojori' : calendarFromAirroi ? 'airroi' : 'sojori'
            }
            applyLoading={pilotApplyLoading}
            windowMode={
              (calendarUsesRolling365 ? 'rolling365' : 'calendarYear') as CalendarWindowMode
            }
            year={calendarYear}
            yearOptions={calendarFromCache && !calendarFromAirroi ? calendarYearOptions : undefined}
            showApplyButton={!calendarFromAirroi}
            priceSyncActive={aiEnabled && applyPrice}
            minStaySyncActive={aiEnabled && applyMinStay}
            sourceHint={(() => {
              const snap = provenance.snapshotAt
                ? new Date(provenance.snapshotAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : null;
              const snapDays = airroiCalendarDaysCount ?? 0;
              if (calendarUsesPilotPreview) {
                return [
                  'Deux courbes : bleu pointillé = AirROI brut (snapshot), or = pilote Sojori (preview live).',
                  snap ? `Snapshot du ${snap}.` : '',
                  snapDays ? `${snapDays} j avec tarif marché dans future/rates.` : '',
                  'Pilote = modes + bornes + events — non écrit au calendrier ops sans « Appliquer ».',
                ]
                  .filter(Boolean)
                  .join(' ');
              }
              if (calendarHasEventOverlay) {
                return `Snapshot marché${snap ? ` (${snap})` : ''} + events en orange (aperçu local, pas encore appliqué).`;
              }
              if (calendarFromAirroi) {
                return [
                  'Lecture seule du snapshot AirROI (future/rates) — pas le calendrier ops Sojori.',
                  snap ? `Dernier refresh : ${snap}.` : '',
                  'USD→MAD ×10 · couleurs = tertiles bas/moyen/haut sur la fenêtre affichée.',
                ]
                  .filter(Boolean)
                  .join(' ');
              }
              if (calendarFromCache) {
                return 'Tarifs Sojori mixEngine — vue par année civile · clic = Justification G7';
              }
              return undefined;
            })()}
            sourceLinkLabel={
              calendarUsesPilotPreview || (calendarHasEventOverlay && aiEnabled)
                ? 'Source pilote Sojori ⓘ'
                : calendarFromAirroi
                  ? 'Source marché (AirROI) ⓘ'
                  : undefined
            }
            emptyHint={
              calendarAirroiError
                ? `Les tarifs journaliers n’ont pas été renvoyés : ${calendarAirroiError}. Relancez ⟳ ou contactez le support si l’erreur persiste (HTTP 400 connu sur certaines annonces).`
                : provenance.hasAirroiSnapshot
                  ? 'Aucun jour future/rates dans le snapshot — relancez ⟳ Envoyer · récupérer'
                  : undefined
            }
            onYearChange={calendarFromCache && !calendarFromAirroi ? onYearChange : undefined}
            onDayClick={handleDayClick}
            onApplyToOps={onApplyToOps}
          />
        </Section>
      )}

      {/* ── Section 5 ── */}
      <Section
        num="05"
        title={`Étude marché · ${cityLabel}`}
        sub={`Deux cadres : concurrents directs + marché ${cityLabel} (graphiques)`}
        sources={[
          hasMarketProd ? { kind: 'prod', label: 'KPIs ville' } : { kind: 'empty', label: 'VIDE' },
          seasonality.length > 0 || pacing.length > 0
            ? { kind: 'prod', label: 'Graphiques PROD' }
            : {
                kind: 'empty',
                label: 'Graphiques VIDE',
                tooltip: `Modal ⟳ · Actualiser le marché · ${cityLabel}`,
              },
        ]}
      >
        <MarketCharts
          cityName={cityLabel}
          kpis={market.kpis}
          compsStats={compsMarketStats}
          selfVsComps={selfVsComps}
          seasonality={seasonality}
          pacing={pacing}
          supplyGrowth={supplyGrowth}
          hasData={hasMarketProd && Boolean(market.kpis)}
          hasCharts={seasonality.length > 0 || pacing.length > 0}
          hasCompsStats={hasCompsMarket}
        />
      </Section>

      {/* ── Section 6 ── */}
      <Section
        num="06"
        title={`Carte ${listing.city} · positionnement`}
        sub={`Votre bien · zones ADR · ${compMapPins.length} concurrents`}
        sources={[
          bienMapPosition
            ? { kind: 'prod', label: 'Carte OSM', tooltip: 'Leaflet · OpenStreetMap — pas de token' }
            : { kind: 'empty', label: 'VIDE', tooltip: 'GPS bien manquant (fiche listing)' },
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
                ? 'Comps en base mais GPS du bien manquant — vérifiez lat/lng sur la fiche listing (legacy).'
                : 'Carte — lancer ⟳ Envoyer · récupérer (comparables + lat/lng bien)'
            }
          />
        )}
      </Section>

      {/* ── Section 7 ── */}
      <Section
        num="07"
        title={`Vos ${compRows.length - 1} concurrents directs`}
        sub="Comparables snapshot · tri colonnes · lien Airbnb si ID connu · carte §06"
        sources={[
          hasCompsProd || compRows.length > 0
            ? { kind: 'prod', label: 'Ligne bien (snapshot)' }
            : { kind: 'empty', label: 'VIDE' },
        ]}
      >
        <CompsTable rows={compRows} />
      </Section>

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

      <JustificationModalG7
        open={!!g7Day}
        date={g7Day?.date || ''}
        factors={g7Factors}
        minStayFactors={g7MinStayFactors}
        finalMinStay={g7FinalMinStay}
        marketMinNights={g7MarketMinNights}
        loading={g7Loading}
        comps={g7CompsDay}
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
        px: { xs: 2, md: 3.5 },
        py: { xs: 3, md: 5 },
        animation: 'sj-fadeIn 0.5s both',
      }}
    >
      <Stack sx={{ gap: 1,  mb: 2, maxWidth: 1380, mx: 'auto', width: '100%' }}>
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
      <Box sx={{ maxWidth: 1380, mx: 'auto', width: '100%' }}>{children}</Box>
    </Box>
  );
}
