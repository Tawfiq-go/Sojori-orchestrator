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
import type { PricingMode, PricingEvent, PricingSuggestion } from './bien/PricingControls';
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
  calendarAirroiError?: string | null;
  potentialHint?: string;
  hasCompsProd: boolean;
  performance: BienDetailPerformance;
  market: MarketData;
  comps: CompListing[];

  aiEnabled: boolean;
  floor: number;
  ceiling: number;
  mode: PricingMode;
  events: PricingEvent[];
  suggestions: PricingSuggestion[];

  calendarYear: number;
  calendarDays: CalendarDay[];
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
  onFloorChange: (v: number) => void;
  onCeilingChange: (v: number) => void;
  onApplyRecoBounds: () => void;
  onModeChange: (m: PricingMode) => void;
  onAddEvent: () => void;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onYearChange?: (year: number) => void;
  onApplyToOps: () => void | Promise<void>;
  onExpandDay: (date: string) => Promise<{ factors: PriceFactor[]; finalPrice: number; competitorsDay: CompListing[] }>;
  pilotPreviewLoading?: boolean;
  pilotApplyLoading?: boolean;
  pilotApplySummary?: string | null;
  pilotApplyError?: string | null;
}

export default function BienView(props: BienViewProps) {
  const {
    listing, provenance, hasTtm, hasL90d, hasPotentialProd, hasMarketProd, hasCalendarProd,
    calendarFromAirroi, calendarFromCache, calendarAirroiError, potentialHint, hasCompsProd,
    performance, market, aiEnabled,
    floor, ceiling, mode, events, suggestions,
    calendarYear, calendarDays, calendarYearOptions,
    compsMarketStats, selfVsComps, hasCompsMarket,
    seasonality, pacing, supplyGrowth,
    compMapPins, bienMapPosition, compRows,
    estimatedRevenueMad, estimatedRevenueLiftPct,
    onToggleAi, onFloorChange, onCeilingChange, onApplyRecoBounds,
    onModeChange, onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    onYearChange, onApplyToOps, onExpandDay,
    pilotPreviewLoading, pilotApplyLoading, pilotApplySummary, pilotApplyError,
  } = props;

  const cityLabel = normalizeCityKey(listing.city);

  /* ─── Modal G7 state ─── */
  const [g7Day, setG7Day] = useState<CalendarDay | null>(null);
  const [g7Factors, setG7Factors] = useState<PriceFactor[]>([]);
  const [g7CompsDay, setG7CompsDay] = useState<CompListing[]>([]);
  const [g7Loading, setG7Loading] = useState(false);

  const handleDayClick = async (d: CalendarDay) => {
    setG7Day(d);
    setG7Loading(true);
    try {
      const result = await onExpandDay(d.date);
      setG7Factors(result.factors);
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
            alignItems="center"
            gap={0.75}
            sx={{ fontSize: 12, color: T.text3, mt: 0.25, flexWrap: 'wrap' }}
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
          <Stack direction="row" gap={1.5} sx={{
            mt: 0.625, fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
          }}>
            <span>🛏 {listing.bedrooms} chambres</span>
            <span>👥 {listing.maxGuests} voyageurs</span>
            {listing.amenities.slice(0, 3).map((a, i) => <span key={i}>{a}</span>)}
          </Stack>
        </Box>
        <Button onClick={() => onToggleAi(!aiEnabled)} sx={{
          flex: '0 0 auto',
          display: 'flex', alignItems: 'center', gap: 1.5, p: '8px 14px',
          background: aiEnabled
            ? `linear-gradient(135deg, ${T.goldTint}, ${T.bg1})`
            : T.bg2,
          border: `1px solid ${aiEnabled ? T.gold : T.border}`,
          borderRadius: 1.5, textTransform: 'none',
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
            }}>{aiEnabled ? 'Pricing dynamique actif' : 'Désactivé'}</Typography>
          </Box>
        </Button>
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

      {/* ── Section 3 ── */}
      {aiEnabled && (
        <Section
          num="03"
          title="Configurez votre pricing"
          sub="Bornes, mode d'agressivité, événements"
          sources={[
            { kind: floor > 0 ? 'prod' : 'empty', label: 'Bornes' },
            { kind: 'empty', label: 'Événements VIDE' },
          ]}
        >
          <PricingControls
            floor={floor} ceiling={ceiling}
            floorRange={[500, 3000]} ceilingRange={[1500, 8000]}
            recoFloor={market.recoBounds?.floor ?? 0} recoCeiling={market.recoBounds?.ceiling ?? 0}
            mode={mode}
            events={events} suggestions={suggestions}
            hasBoundsProd={floor > 0 && ceiling > 0}
            estimatedRevenue={estimatedRevenueMad}
            estimatedRevenueLiftPct={estimatedRevenueLiftPct}
            onFloorChange={onFloorChange} onCeilingChange={onCeilingChange}
            onApplyRecoBounds={onApplyRecoBounds} onModeChange={onModeChange}
            onAddEvent={onAddEvent} onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent} onAcceptSuggestion={onAcceptSuggestion}
          />
        </Section>
      )}

      {/* ── Section 4 ── */}
      {aiEnabled && (
        <Section
          num="04"
          title={
            calendarFromAirroi
              ? 'Suggestion de prix marché'
              : 'Calendrier de recommandations'
          }
          sub={
            pilotPreviewLoading
              ? 'Simulation pilote v2…'
              : calendarFromCache || !calendarFromAirroi
                ? `Prix/jour · pilote Sojori (mixEngine v2 + audit G7)${pilotApplySummary ? ` · ${pilotApplySummary}` : ''}`
                : calendarFromAirroi
                  ? `${calendarDays.length} jours suggérés · ajustez §03 pour preview Sojori`
                  : '365 jours · snapshot marché requis'
          }
          sources={[
            !calendarFromAirroi
              ? { kind: 'prod', label: 'Pilote v2', tooltip: 'POST preview / apply' }
              : calendarFromAirroi
                ? { kind: 'prod', label: 'Prix/jour', tooltip: 'Tarifs journaliers (API)' }
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
            compactHeader
            pricingSource={calendarFromAirroi ? 'airroi' : 'sojori'}
            applyLoading={pilotApplyLoading}
            windowMode={(calendarFromAirroi ? 'rolling365' : 'calendarYear') as CalendarWindowMode}
            year={calendarYear}
            yearOptions={calendarFromCache ? calendarYearOptions : undefined}
            sourceHint={
              calendarFromAirroi
                ? 'Tarifs journaliers suggérés · 1 prix/jour (USD→MAD ×10) · couleurs bas/moyen/haut = tertiles Sojori'
                : calendarFromCache
                  ? 'Tarifs Sojori mixEngine — vue par année civile'
                  : undefined
            }
            emptyHint={
              calendarAirroiError
                ? `Les tarifs journaliers n’ont pas été renvoyés : ${calendarAirroiError}. Relancez ⟳ ou contactez le support si l’erreur persiste (HTTP 400 connu sur certaines annonces).`
                : undefined
            }
            onYearChange={calendarFromCache ? onYearChange : undefined}
            onDayClick={handleDayClick} onApplyToOps={onApplyToOps}
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
        sub="Comps premium · drill-down"
        sources={[
          hasCompsProd || compRows.length > 0
            ? { kind: 'prod', label: 'Ligne bien (snapshot)' }
            : { kind: 'empty', label: 'VIDE' },
        ]}
      >
        <CompsTable rows={compRows} />
      </Section>

      {/* ── Modale G7 ── */}
      <JustificationModalG7
        open={!!g7Day}
        date={g7Day?.date || ''}
        factors={g7Factors}
        comps={g7CompsDay}
        total={g7Day?.recommendedPrice || 0}
        onClose={() => setG7Day(null)}
        onApply={() => setG7Day(null)}
        onEditManual={() => setG7Day(null)}
      />
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
      <Stack gap={1} sx={{ mb: 2, maxWidth: 1380, mx: 'auto', width: '100%' }}>
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
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
