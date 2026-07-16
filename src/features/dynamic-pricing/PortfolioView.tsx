// ════════════════════════════════════════════════════════════════════
// PortfolioView.tsx — portefeuille compact : villes → tableau (carte si ville)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import type { PilotPricingConfigDto } from '../../services/dynamicPricingApi';
import DynamicPriceScopeModal from './bien/DynamicPriceScopeModal';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { T, KEYFRAMES, fmtMADCompact } from './_tokens';
import type { Listing, PortfolioRow, PortfolioMacro } from './_tokens';
import MarketCityBand from './MarketCityBand';
import MarketCharts from './bien/MarketCharts';
import PortfolioMap from './PortfolioMap';
import type { PortfolioMapPin } from './PortfolioMap';
import type { SeasonalityPoint, PacingPoint, SupplyGrowthPoint, MarketKpis } from './bien/MarketCharts';
import {
  AIRROI_RAW_COLUMNS,
  AIRROI_RAW_TABLE_INTRO,
  formatAirroiRawValue,
  getOperationalSnapshotColumns,
  type AirroiColumnDef,
} from './airroiRawColumns';
import PortfolioCityScopeBar from './PortfolioCityScopeBar';
import {
  buildCityScopeOptions,
  computeCityScopeStats,
  listingMatchesCityScope,
  marketBandAppliesToCityScope,
} from './cityScope';
import {
  DATA_GAP_LABELS,
  getDataGapReason,
  isExploitableListing,
  rowMatchesTableTab,
  type DataGapReason,
} from './listingFilters';

export type PortfolioTableTab = 'operational' | 'audit' | 'todo';

/* ─── Types exported (utilisés par MarketCityBand + PortfolioMap) ─── */

/** KPIs marché ville (Marrakech) — ligne séparée sous les 4 macros portefeuille */
export interface MarketCityKpis {
  cityName: string;
  occupancyAvg24m: number;          // 0-1
  adrMedianCity: number;            // MAD
  pacingCurrent: { monthLabel: string; fillRate: number };
  pacingNext:    { monthLabel: string; fillRate: number };
  supplyGrowthPct: number;
  supplyGrowthMonths: number;
  bookingLeadTimeDays?: number;
  avgStayNightsCity?: number;
  activeListingsCount?: number;
}

/** Stats par zone — clé = zoneId */
export interface PortfolioZoneStats {
  zoneId: string;
  zoneName: string;
  airroiListings: number;
  adrMedian: number;
  occupancyAvg: number;             // 0-1
  myListingsCount: number;
}

/* ─── Props ─── */
export type BulkAction =
  | 'activate-ai' | 'deactivate-ai'
  | { type: 'set-mode'; mode: 'prudent' | 'equilibre' | 'agressif' }
  | { type: 'set-bounds-default' }
  | 'apply-to-calendar' | 'export-csv';

interface Props {
  macro: PortfolioMacro;
  /** NOUVEAU : bande MARCHÉ MARRAKECH (rangée 2 sous les 4 macros) */
  cityKpis: MarketCityKpis;
  /** Dernier refresh marché Marrakech (si cache Mongo) */
  marketFromCache?: boolean;
  marketFetchedAt?: string | null;
  /** Graphiques ville (saisonnalité / pacing / offre) — affichés si filtre ville */
  marketCharts?: {
    seasonality: SeasonalityPoint[];
    pacing: PacingPoint[];
    supplyGrowth: SupplyGrowthPoint[];
    hasCharts?: boolean;
  };
  /** NOUVEAU : KPIs par zone pour le tooltip carte au hover */
  zoneStats: Record<string, PortfolioZoneStats>;
  /** Pins biens pré-mappés (taille = potentiel, couleur = perf vs potentiel) */
  mapPins: PortfolioMapPin[];
  rows: PortfolioRow[];
  /** Ville active (clé canonique) · null = tous */
  cityScope?: string | null;
  onCityScopeChange?: (scope: string | null) => void;
  loading?: boolean;
  onDrillDown: (listingId: string) => void;
  onBulkAction: (action: BulkAction, selectedIds: string[]) => void;
  /** Sauvegarde inline config pilote (même schéma que fiche bien) */
  onPatchPilotConfig?: (listingId: string, partial: Partial<PilotPricingConfigDto>) => Promise<void>;
}

export default function PortfolioView({
  macro, cityKpis, zoneStats, mapPins, rows, loading, onDrillDown, onBulkAction,
  onPatchPilotConfig,
  cityScope = null,
  onCityScopeChange,
  marketFromCache = false,
  marketFetchedAt = null,
  marketCharts,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exploitableOnly, setExploitableOnly] = useState(true);
  const [tableTab, setTableTab] = useState<PortfolioTableTab>('operational');
  const [airbnbOnly, setAirbnbOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeModal, setScopeModal] = useState<{
    listingId: string;
    listingName: string;
    applyPrice: boolean;
    applyMinStay: boolean;
  } | null>(null);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeSaveError, setScopeSaveError] = useState<string | null>(null);

  const patchWithScopeGate = useCallback(
    async (listingId: string, partial: Partial<PilotPricingConfigDto>) => {
      if (!onPatchPilotConfig) return;
      if (partial.enabled === true && partial.applyPrice === undefined) {
        const row = rows.find((r) => r.listing._id === listingId);
        setScopeModal({
          listingId,
          listingName: row?.listing.name ?? listingId,
          applyPrice: row?.pilotConfig?.applyPrice !== false,
          applyMinStay: row?.pilotConfig?.applyMinStay !== false,
        });
        return;
      }
      await onPatchPilotConfig(listingId, partial);
    },
    [onPatchPilotConfig, rows],
  );

  const scopedRows = useMemo(
    () => rows.filter(r => listingMatchesCityScope(r.listing.city, cityScope)),
    [rows, cityScope],
  );
  const cityScopeOptions = useMemo(() => buildCityScopeOptions(rows), [rows]);
  const scopedPins = useMemo(
    () => mapPins.filter(p => {
      const row = rows.find(r => r.listing._id === p.id);
      return row ? listingMatchesCityScope(row.listing.city, cityScope) : !cityScope;
    }),
    [mapPins, rows, cityScope],
  );
  const showMarketBand = marketBandAppliesToCityScope(cityScope);

  useEffect(() => {
    if (!cityScope) setSelectedIds([]);
  }, [cityScope]);

  const displayRows = useMemo(() => {
    let list = scopedRows.filter((r) => r.listingActive !== false);
    if (exploitableOnly) list = list.filter((r) => isExploitableListing(r.listing.name));
    return list;
  }, [scopedRows, exploitableOnly]);
  const displayStats = useMemo(() => computeCityScopeStats(displayRows), [displayRows]);

  const todoRowsCount = useMemo(
    () => displayRows.filter((r) => rowMatchesTableTab(r, 'todo')).length,
    [displayRows],
  );

  const toggleRow = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const airbnbConnectedCount = useMemo(
    () => displayRows.filter((r) => r.listing.airbnbConnected && r.listing.airbnbListingId).length,
    [displayRows],
  );

  const filtered = useMemo(() => displayRows.filter(r => {
    if (!rowMatchesTableTab(r, tableTab)) return false;
    if (airbnbOnly && !(r.listing.airbnbConnected && r.listing.airbnbListingId)) return false;
    if (search && !r.listing.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [displayRows, tableTab, airbnbOnly, search]);

  return (
    <Box>
      <style>{KEYFRAMES}</style>

      <PortfolioCityScopeBar
        options={cityScopeOptions}
        activeScope={cityScope}
        onScopeChange={onCityScopeChange ?? (() => undefined)}
        stats={displayStats}
        globalTotal={rows.length}
        loading={loading}
        todoCount={todoRowsCount}
      />

      {showMarketBand ? (
        <Box sx={{ mb: 2 }}>
          <MarketCityBand city={cityKpis} hasData={marketFromCache} fetchedAt={marketFetchedAt} />
          {(marketCharts?.hasCharts || marketFromCache) ? (
            <Box sx={{ mt: 1.75 }}>
              <MarketCharts
                variant="city"
                cityName={cityScope ?? cityKpis.cityName}
                kpis={{
                  occupancyAvg: cityKpis.occupancyAvg24m,
                  adrMedianDistrict: cityKpis.adrMedianCity,
                  adrMedianCity: cityKpis.adrMedianCity,
                  supplyGrowthPct: cityKpis.supplyGrowthPct,
                  leadTimeDays: cityKpis.bookingLeadTimeDays ?? 0,
                  avgStayNights: cityKpis.avgStayNightsCity ?? 0,
                  activeListings: cityKpis.activeListingsCount,
                } satisfies MarketKpis}
                seasonality={marketCharts?.seasonality ?? []}
                pacing={marketCharts?.pacing ?? []}
                supplyGrowth={marketCharts?.supplyGrowth ?? []}
                hasData={marketFromCache}
                hasCharts={Boolean(marketCharts?.hasCharts)}
              />
            </Box>
          ) : null}
        </Box>
      ) : null}

      {cityScope && scopedPins.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <PortfolioMap
            pins={scopedPins}
            zoneStats={zoneStats}
            cityLabel={cityScope}
            onPinClick={onDrillDown}
          />
          {selectedIds.length > 0 ? (
            <Box sx={{ mt: 1.25 }}>
              <BulkActionsPanel
                selectedCount={selectedIds.length}
                aiOpportunityMad={macro.aiOpportunityMad}
                aiOffCount={macro.totalListings - macro.aiEnabledCount}
                showAiHint={false}
                onAction={(a) => onBulkAction(a, selectedIds)}
              />
            </Box>
          ) : null}
        </Box>
      ) : null}

      {!loading && displayRows.length > 0 && filtered.length === 0 ? (
        <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 1.25, bgcolor: T.warningTint, border: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 12, color: T.text2 }}>
            Aucun bien pour ces filtres — élargissez la recherche ou l’onglet.
          </Typography>
        </Box>
      ) : null}

      <PortfolioTable
        rows={filtered}
        totalCount={displayRows.length}
        portfolioTotal={rows.length}
        cityScope={cityScope}
        tableTab={tableTab}
        onTableTabChange={setTableTab}
        todoTabCount={todoRowsCount}
        exploitableOnly={exploitableOnly}
        onExploitableOnlyChange={setExploitableOnly}
        stagingHiddenCount={scopedRows.length - displayRows.length}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onDrillDown={onDrillDown}
        search={search} onSearch={setSearch}
        airbnbOnly={airbnbOnly}
        onAirbnbOnlyChange={setAirbnbOnly}
        airbnbConnectedCount={airbnbConnectedCount}
        onPatchPilotConfig={patchWithScopeGate}
      />

      <DynamicPriceScopeModal
        open={Boolean(scopeModal)}
        saving={scopeSaving}
        errorMessage={scopeSaveError}
        listingName={scopeModal?.listingName}
        initialApplyPrice={scopeModal?.applyPrice}
        initialApplyMinStay={scopeModal?.applyMinStay}
        onClose={() => {
          if (scopeSaving) return;
          setScopeModal(null);
          setScopeSaveError(null);
        }}
        onConfirm={async (choice) => {
          if (!scopeModal || !onPatchPilotConfig) return;
          setScopeSaving(true);
          setScopeSaveError(null);
          try {
            await onPatchPilotConfig(scopeModal.listingId, {
              enabled: true,
              applyPrice: choice.applyPrice,
              applyMinStay: choice.applyMinStay,
            });
            setScopeModal(null);
          } catch (e) {
            setScopeSaveError(e instanceof Error ? e.message : 'Activation impossible');
          } finally {
            setScopeSaving(false);
          }
        }}
      />
    </Box>
  );
}

/* ════════════════════════ BulkActionsPanel ════════════════════════ */
function BulkActionsPanel({ selectedCount, aiOpportunityMad, aiOffCount, showAiHint, onAction }: {
  selectedCount: number; aiOpportunityMad: number; aiOffCount: number;
  showAiHint?: boolean;
  onAction: (a: BulkAction) => void;
}) {
  return (
    <Box sx={{
      background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, 
        p: 1.5, borderBottom: `1px solid ${T.border}`, background: T.bg2,
      }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>⚙ Actions groupées</Typography>
        <Box sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 800,
          color: T.goldDeep, background: T.goldTint, px: 1.125, py: 0.375,
          borderRadius: 999, letterSpacing: '0.04em',
        }}>{selectedCount} sélectionné{selectedCount !== 1 ? 's' : ''}</Box>
      </Stack>

      <Stack sx={{ gap: 1.5,  p: 1.75, flex: 1 }}>
        {showAiHint ? (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.125, 
            p: '10px 12px',
            background: `linear-gradient(135deg, ${T.aiTint}, transparent 70%)`,
            border: `1px solid rgba(124,58,237,0.25)`, borderRadius: 1.25,
          }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1, background: `linear-gradient(135deg, #9669f7, ${T.ai})`,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, flexShrink: 0,
            }}>✨</Box>
            <Typography sx={{ flex: 1, fontSize: 11.5, color: T.text2, lineHeight: 1.4 }}>
              <b style={{ color: T.text }}>Sojori AI</b> · {aiOffCount} biens sans pricing dynamique
              {aiOpportunityMad > 0 && (
                <>
                  {' '}· <b style={{ color: T.goldDeep, fontFamily: '"Geist Mono", monospace' }}>
                    +{fmtMADCompact(aiOpportunityMad)}/an
                  </b>
                </>
              )}
            </Typography>
          </Stack>
        ) : null}

        <BulkSection label="⚡ ACTIVATION">
          <BulkBtn prim emoji="✨" onClick={() => onAction('activate-ai')}>
            Activer AI sur {selectedCount} bien{selectedCount > 1 ? 's' : ''}
          </BulkBtn>
          <BulkBtn emoji="⊘" onClick={() => onAction('deactivate-ai')}>Désactiver AI</BulkBtn>
        </BulkSection>

        <BulkSection label="🎯 APPLIQUER UN MODE">
          <BulkBtn emoji="🛡" onClick={() => onAction({ type: 'set-mode', mode: 'prudent' })}>Prudent</BulkBtn>
          <BulkBtn emoji="⚖" onClick={() => onAction({ type: 'set-mode', mode: 'equilibre' })}>Équilibré</BulkBtn>
          <BulkBtn emoji="🚀" onClick={() => onAction({ type: 'set-mode', mode: 'agressif' })}>Agressif</BulkBtn>
        </BulkSection>

        <BulkSection label="💰 BORNES PAR DÉFAUT">
          <BulkBtn emoji="📍" onClick={() => onAction({ type: 'set-bounds-default' })}>Reco par zone (P25→P75)</BulkBtn>
          <BulkBtn emoji="✏" onClick={() => {}}>Bornes custom…</BulkBtn>
        </BulkSection>

        <BulkSection label="📤 EXPORT">
          <BulkBtn emoji="📅" onClick={() => onAction('apply-to-calendar')}>Appliquer prix au calendrier ops</BulkBtn>
          <BulkBtn emoji="📊" onClick={() => onAction('export-csv')}>Export CSV</BulkBtn>
        </BulkSection>
      </Stack>
    </Box>
  );
}

function BulkSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 1.5, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.25 }}>
      <Typography sx={{
        fontSize: 10, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
        color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1,
      }}>{label}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>{children}</Box>
    </Box>
  );
}

function BulkBtn({ emoji, prim, onClick, children }: {
  emoji: string; prim?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer',
      px: 1.375, py: 0.875, borderRadius: 1, fontSize: 11.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      ...(prim
        ? { background: `linear-gradient(180deg, #f9dc7a, ${T.gold})`, color: T.text,
            border: `1px solid ${T.goldDeep}`, boxShadow: '0 2px 6px rgba(244,207,94,0.30)',
            '&:hover': { transform: 'translateY(-1px)' } }
        : { background: T.bg1, color: T.text2, border: `1px solid ${T.border}`,
            '&:hover': { borderColor: T.gold, background: T.goldTint, color: T.goldDeep } }),
    }}>
      <Box component="span" sx={{ fontSize: 13 }}>{emoji}</Box>{children}
    </Box>
  );
}

const TABLE_TABS: { id: PortfolioTableTab; label: string }[] = [
  { id: 'operational', label: 'Opérationnel' },
  { id: 'todo', label: 'À traiter' },
  { id: 'audit', label: 'Audit données' },
];

/* ════════════════════════ PortfolioTable ════════════════════════ */
function PortfolioTable({
  rows, totalCount, portfolioTotal, cityScope, tableTab, onTableTabChange, todoTabCount,
  exploitableOnly, onExploitableOnlyChange, stagingHiddenCount,
  selectedIds, onToggleRow, onDrillDown,
  search, onSearch,
  airbnbOnly, onAirbnbOnlyChange, airbnbConnectedCount,
  onPatchPilotConfig,
}: {
  rows: PortfolioRow[]; totalCount: number;
  portfolioTotal?: number;
  cityScope?: string | null;
  tableTab: PortfolioTableTab;
  onTableTabChange: (t: PortfolioTableTab) => void;
  todoTabCount: number;
  exploitableOnly: boolean;
  onExploitableOnlyChange: (v: boolean) => void;
  stagingHiddenCount: number;
  selectedIds: string[]; onToggleRow: (id: string) => void;
  onDrillDown: (id: string) => void;
  search: string; onSearch: (v: string) => void;
  airbnbOnly: boolean;
  onAirbnbOnlyChange: (v: boolean) => void;
  airbnbConnectedCount: number;
  onPatchPilotConfig?: (listingId: string, partial: Partial<PilotPricingConfigDto>) => Promise<void>;
}) {
  const bulkSelectEnabled = Boolean(cityScope);
  const [showAllSnapshotKpis, setShowAllSnapshotKpis] = useState(false);
  const snapshotCols = useMemo(
    () => getOperationalSnapshotColumns(showAllSnapshotKpis),
    [showAllSnapshotKpis],
  );
  const tabNote =
    tableTab === 'audit'
      ? 'Colonnes brutes estimation marché'
      : tableTab === 'todo'
        ? 'Annonce ou estimation manquante'
        : 'Statut par bien';

  return (
    <Box sx={{
      background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      animation: 'sj-fadeIn 0.6s 0.10s both',
    }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.5,
          p: '14px 18px',
          borderBottom: `1px solid ${T.border}`,
          background: T.bg2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
            🏠 {totalCount} bien{totalCount !== 1 ? 's' : ''}
            {cityScope ? ` · ${cityScope}` : ''}
          </Typography>
          {tableTab === 'audit' ? (
            <HeaderInfoIcon title="Portefeuille · données brutes" body={AIRROI_RAW_TABLE_INTRO} />
          ) : null}
        </Stack>
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
          {TABLE_TABS.map((t) => (
            <Box
              key={t.id}
              component="button"
              type="button"
              onClick={() => onTableTabChange(t.id)}
              sx={{
                all: 'unset', cursor: 'pointer',
                px: 1.25, py: 0.625, borderRadius: 0.875,
                fontSize: 11.5, fontWeight: tableTab === t.id ? 800 : 600,
                bgcolor: tableTab === t.id ? T.goldTint : T.bg1,
                border: `1px solid ${tableTab === t.id ? T.goldDeep : T.border}`,
                color: tableTab === t.id ? T.goldDeep : T.text2,
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
              }}
            >
              {t.label}
              {t.id === 'todo' && todoTabCount > 0 ? (
                <Box component="span" sx={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 9, fontWeight: 800,
                  px: 0.5, borderRadius: 999, bgcolor: T.warningTint, color: T.warning,
                }}>
                  {todoTabCount}
                </Box>
              ) : null}
            </Box>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 0.75, ml: { md: 'auto' }, flexWrap: 'wrap' }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.875,
            px: 1.375, py: 0.75, background: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 0.875, fontSize: 11.5,
          }}>
            <span>🔍</span>
            <input value={search} onChange={e => onSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{ border: 0, outline: 0, font: 'inherit', background: 'transparent',
                width: 140, color: T.text }} />
          </Box>
          <FilterChip on={exploitableOnly} onClick={() => onExploitableOnlyChange(!exploitableOnly)}>
            Exploitables
            {stagingHiddenCount > 0 && exploitableOnly ? (
              <Box component="span" sx={{
                fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 800,
                color: T.text3,
              }}>
                −{stagingHiddenCount}
              </Box>
            ) : null}
          </FilterChip>
          {tableTab === 'operational' ? (
            <FilterChip
              on={showAllSnapshotKpis}
              onClick={() => setShowAllSnapshotKpis((v) => !v)}
              activeVariant="gold"
            >
              Plus de colonnes
            </FilterChip>
          ) : null}
          <FilterChip
            on={airbnbOnly}
            onClick={() => onAirbnbOnlyChange(!airbnbOnly)}
            activeVariant="success"
          >
            <Box component="span" sx={{
              width: 6, height: 6, borderRadius: '50%',
              bgcolor: airbnbOnly ? T.success : T.text4,
            }} />
            Annonces connectées
            <Box component="span" sx={{
              fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 800,
              px: 0.625, py: 0.125, borderRadius: 999,
              bgcolor: airbnbOnly ? 'rgba(10,143,94,0.15)' : T.bg3,
              color: airbnbOnly ? T.success : T.text3,
            }}>
              {airbnbConnectedCount}
            </Box>
          </FilterChip>
        </Stack>
      </Stack>

      <Box sx={{ px: '18px', py: 0.75, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>{tabNote}</Typography>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        {tableTab === 'audit' ? (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <Box component="thead">
              <Box component="tr">
                {AIRROI_RAW_COLUMNS.filter((col) => bulkSelectEnabled || col.id !== 'check').map((col) => {
                  if (col.id === 'action') return null;
                  if (col.hintTitle && col.hintBody) {
                    return (
                      <SnapshotHeaderCell
                        key={col.id}
                        label={col.label}
                        hintTitle={col.hintTitle}
                        hintBody={col.hintBody}
                        gold={col.kind === 'airroi'}
                      />
                    );
                  }
                  return (
                    <Box component="th" key={col.id} sx={tableHeadSx(col.kind === 'airroi' ? T.goldDeep : T.text3)}>
                      {col.label}
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map(r => (
                <PortfolioRowComp key={r.listing._id} row={r}
                  bulkSelectEnabled={bulkSelectEnabled}
                  selected={selectedIds.includes(r.listing._id)}
                  onToggle={() => onToggleRow(r.listing._id)}
                  onDrillDown={() => onDrillDown(r.listing._id)} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <Box component="thead">
              <Box component="tr">
                {bulkSelectEnabled ? (
                  <Box component="th" sx={tableHeadSx(T.text3)} />
                ) : null}
                <Box component="th" sx={tableHeadSx(T.text3)}>Bien</Box>
                <Box component="th" sx={tableHeadSx(T.text3)}>Statut</Box>
                <Box component="th" sx={tableHeadSx(T.text3)}>Canal</Box>
                <SnapshotHeaderCell
                  label="Estimation"
                  hintTitle="Estimation prix de marché"
                  hintBody="Date de la dernière estimation prix de marché pour ce bien."
                />
                <SnapshotHeaderCell
                  label="Calendrier"
                  hintTitle="Calendrier · mise à jour"
                  hintBody="Dernière application des prix au calendrier Sojori (manuelle ou nocturne)."
                />
                <SnapshotHeaderCell
                  label="Publié OTA"
                  hintTitle="Canaux · publication"
                  hintBody="Dernier envoi réussi du calendrier vers les canaux (Airbnb, Booking…)."
                />
                {snapshotCols.map((col) => (
                  <SnapshotHeaderCell
                    key={col.id}
                    label={col.label}
                    hintTitle={col.hintTitle ?? col.label}
                    hintBody={col.hintBody ?? 'Champ brut du snapshot marché (USD sauf occupation en %).'}
                    gold
                  />
                ))}
                <SnapshotHeaderCell
                  label="Prix min"
                  hintTitle="Prix plancher pilote"
                  hintBody="floorNormal · même champ que §03 fiche bien. Éditable ici."
                  gold
                />
                <SnapshotHeaderCell
                  label="Prix max"
                  hintTitle="Prix plafond pilote"
                  hintBody="ceiling · envoyé au mixEngine et au calendrier après Apply."
                  gold
                />
                <SnapshotHeaderCell
                  label="Min stay"
                  hintTitle="Séjour minimum"
                  hintBody="minStayPlancher (+ delta en fiche). Base marché par jour non désactivable."
                  gold
                />
                <SnapshotHeaderCell
                  label="Sojori AI"
                  hintTitle="Sync automatique"
                  hintBody="ON = cron + refresh snapshot marché. OFF = tout reste visible, pas de sync auto."
                />
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map(r => (
                <PortfolioOperationalRow key={r.listing._id} row={r}
                  bulkSelectEnabled={bulkSelectEnabled}
                  snapshotCols={snapshotCols}
                  selected={selectedIds.includes(r.listing._id)}
                  onToggle={() => onToggleRow(r.listing._id)}
                  onDrillDown={() => onDrillDown(r.listing._id)}
                  onPatchPilotConfig={onPatchPilotConfig}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.5,
          p: '10px 18px',
          borderTop: `1px solid ${T.border}`,
          background: T.bg2,
          fontSize: 11,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <b style={{ color: T.text }}>{rows.length} / {totalCount}</b> affichés
          {portfolioTotal != null && portfolioTotal !== totalCount
            ? ` · ${portfolioTotal} au catalogue`
            : ''}
          {bulkSelectEnabled ? (
            <>
              {' · '}{selectedIds.length} sélectionné{selectedIds.length !== 1 ? 's' : ''}
            </>
          ) : null}
        </span>
      </Stack>
    </Box>
  );
}

const tableCellSx = {
  p: '10px',
  borderBottom: `1px solid ${T.border}`,
} as const;

/** Typo alignée colonnes snapshot (ADR, TTM, Tarifs/j) */
const rawMonoCellSx = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
} as const;

function tableHeadSx(color: string) {
  return {
    p: '11px 10px',
    textAlign: 'left' as const,
    fontSize: 9,
    fontFamily: '"Geist Mono", monospace',
    fontWeight: 800,
    color,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    borderBottom: `1px solid ${T.border}`,
    background: T.bg2,
    position: 'sticky' as const,
    top: 0,
    whiteSpace: 'nowrap' as const,
  };
}

function SnapshotHeaderCell({
  label,
  hintTitle,
  hintBody,
  gold,
}: {
  label: string;
  hintTitle: string;
  hintBody: string;
  gold?: boolean;
}) {
  return (
    <Box component="th" sx={tableHeadSx(gold ? T.goldDeep : T.text3)}>
      <Tooltip
        title={
          <Box sx={{ maxWidth: 280 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.5 }}>{hintTitle}</Typography>
            <Typography sx={{ fontSize: 10.5, lineHeight: 1.45 }}>{hintBody}</Typography>
          </Box>
        }
        arrow
        placement="top"
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.375,  cursor: 'help', width: 'fit-content' }}>
          <span>{label}</span>
          <InfoOutlinedIcon sx={{ fontSize: 11, color: gold ? T.goldDeep : T.text4, opacity: 0.85 }} />
        </Stack>
      </Tooltip>
    </Box>
  );
}

function ListingNameLink({
  name,
  sub,
  onNavigate,
}: {
  name: string;
  sub: string;
  onNavigate: () => void;
}) {
  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={onNavigate}
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          fontWeight: 800,
          fontSize: 12.5,
          color: T.text,
          letterSpacing: '-0.01em',
          textAlign: 'left',
          maxWidth: '100%',
          '&:hover': { color: T.goldDeep, textDecoration: 'underline' },
        }}
      >
        {name}
      </Box>
      <Box sx={{ fontSize: 9.5, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
        {sub}
      </Box>
    </Box>
  );
}

function RowCheckbox({ selected, onToggle }: { selected: boolean; onToggle: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{
        width: 18, height: 18, borderRadius: 0.625,
        border: `1.5px solid ${selected ? T.goldDeep : T.borderStrong}`,
        background: selected ? T.gold : T.bg1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected ? (
          <Box sx={{
            width: 5, height: 9, borderRight: `2px solid ${T.text}`,
            borderBottom: `2px solid ${T.text}`,
            transform: 'rotate(45deg) translate(-1px,-1px)', mt: '-2px',
          }} />
        ) : null}
      </Box>
    </Box>
  );
}

function GapStatusBadge({ reason }: { reason: DataGapReason }) {
  const colors: Record<DataGapReason, { bg: string; color: string }> = {
    ok: { bg: T.successTint, color: T.success },
    no_airbnb: { bg: T.warningTint, color: T.warning },
    no_snapshot: { bg: T.goldTint, color: T.goldDeep },
    staging: { bg: T.bg3, color: T.text3 },
  };
  const c = colors[reason];
  return (
    <Box sx={{
      display: 'inline-block', fontSize: 10, fontWeight: 800, px: 0.875, py: 0.25,
      borderRadius: 999, bgcolor: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {DATA_GAP_LABELS[reason]}
    </Box>
  );
}

function PortfolioOperationalRow({
  row,
  bulkSelectEnabled = true,
  snapshotCols,
  selected,
  onToggle,
  onDrillDown,
  onPatchPilotConfig,
}: {
  row: PortfolioRow;
  bulkSelectEnabled?: boolean;
  snapshotCols: AirroiColumnDef[];
  selected: boolean;
  onToggle: () => void;
  onDrillDown: () => void;
  onPatchPilotConfig?: (listingId: string, partial: Partial<PilotPricingConfigDto>) => Promise<void>;
}) {
  const gap = getDataGapReason(row);
  const fmtPipelineDate = (v?: string | null) =>
    v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const snapLabel = fmtPipelineDate(row.airroiSnapshotAt);
  // Fraîcheur pipeline : une étape plus vieille que la précédente = à re-propager
  const snapT = row.airroiSnapshotAt ? new Date(row.airroiSnapshotAt).getTime() : 0;
  const calT = row.calendarAppliedAt ? new Date(row.calendarAppliedAt).getTime() : 0;
  const otaT = row.otaPushedAt ? new Date(row.otaPushedAt).getTime() : 0;
  const calStale = snapT > 0 && calT > 0 && calT < snapT;
  // OTA « en retard » seulement si le dernier apply a réellement modifié des jours :
  // un apply à 0 changement ne publie rien (rien à envoyer), OTA reste en phase.
  const otaStale =
    calT > 0 && otaT > 0 && otaT < calT && (row.lastApplyDaysChanged ?? 1) > 0;

  return (
    <Box component="tr" sx={{
      ...(selected ? { background: T.goldTint } : {}),
      '&:hover td': { background: selected ? T.goldTint : T.bg2 },
    }}>
      {bulkSelectEnabled ? (
        <Box component="td" sx={tableCellSx}>
          <RowCheckbox selected={selected} onToggle={onToggle} />
        </Box>
      ) : null}
      <Box component="td" sx={{ ...tableCellSx, minWidth: 160 }}>
        <ListingNameLink
          name={row.listing.name}
          sub={row.listing._id.slice(-8)}
          onNavigate={onDrillDown}
        />
      </Box>
      <Box component="td" sx={tableCellSx}>
        <GapStatusBadge reason={gap} />
      </Box>
      <Box component="td" sx={tableCellSx}>
        <AirbnbConnectCell listing={row.listing} />
      </Box>
      <RawCell value={snapLabel} muted={!row.hasAirroiSnapshot} />
      <RawCell
        value={fmtPipelineDate(row.calendarAppliedAt) + (calStale ? ' ⚠' : '')}
        muted={!row.calendarAppliedAt}
      />
      <RawCell
        value={fmtPipelineDate(row.otaPushedAt) + (otaStale ? ' ⚠' : '')}
        muted={!row.otaPushedAt}
      />
      {snapshotCols.map((col) => {
        if (!col.field) return null;
        const v = formatAirroiRawValue(col.field, row.airroiRaw);
        return (
          <RawCell key={col.id} value={v} highlight={!row.hasAirroiSnapshot} />
        );
      })}
      <PilotNumberCell
        listingId={row.listing._id}
        value={row.pilotConfig?.floorNormal ?? row.bounds?.floor ?? 900}
        disabled={!onPatchPilotConfig}
        onCommit={(v) => onPatchPilotConfig?.(row.listing._id, { floorNormal: v })}
      />
      <PilotNumberCell
        listingId={row.listing._id}
        value={row.pilotConfig?.ceiling ?? row.bounds?.ceiling ?? 2800}
        disabled={!onPatchPilotConfig}
        onCommit={(v) => onPatchPilotConfig?.(row.listing._id, { ceiling: v })}
      />
      <PilotNumberCell
        listingId={row.listing._id}
        value={row.pilotConfig?.minStayPlancher ?? 1}
        disabled={!onPatchPilotConfig}
        min={1}
        max={14}
        compact
        inactive={row.aiEnabled && row.pilotConfig?.applyMinStay === false}
        inactiveHint="Min stay non sync"
        onCommit={(v) => onPatchPilotConfig?.(row.listing._id, { minStayPlancher: v })}
      />
      <Box component="td" sx={rawCellTdSx()}>
        <AiSyncToggle
          enabled={row.aiEnabled}
          disabled={!onPatchPilotConfig}
          applyMinStay={row.pilotConfig?.applyMinStay !== false}
          onToggle={(v) => void onPatchPilotConfig?.(row.listing._id, { enabled: v })}
        />
      </Box>
    </Box>
  );
}

function rawCellTdSx() {
  return {
    p: '10px',
    borderBottom: `1px solid ${T.border}`,
    ...rawMonoCellSx,
    color: T.text,
  };
}

function formatPilotDisplay(value: number, compact?: boolean): string {
  if (!Number.isFinite(value)) return '—';
  return compact ? String(value) : value.toLocaleString('fr-FR');
}

function PilotNumberCell({
  listingId,
  value,
  onCommit,
  disabled,
  min = 100,
  max = 20000,
  compact,
  inactive,
  inactiveHint,
}: {
  listingId: string;
  value: number;
  onCommit: (v: number) => void | Promise<void>;
  disabled?: boolean;
  min?: number;
  max?: number;
  /** Min stay : entier sans séparateur milliers */
  compact?: boolean;
  inactive?: boolean;
  inactiveHint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
    setEditing(false);
  }, [value, listingId]);

  const commit = () => {
    const n = Math.round(Number(local));
    if (!Number.isFinite(n) || n < min || n > max) {
      setLocal(String(value));
      setEditing(false);
      return;
    }
    setEditing(false);
    if (n !== value) void onCommit(n);
  };

  const tdSx = {
    ...rawCellTdSx(),
    ...(inactive
      ? { color: '#c62828', bgcolor: 'rgba(211,47,47,0.06)' }
      : {}),
  };

  if (editing && !disabled) {
    return (
      <Box component="td" sx={tdSx}>
        <Box
          component="input"
          type="number"
          autoFocus
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setLocal(String(value));
              setEditing(false);
            }
          }}
          sx={{
            width: compact ? 28 : 52,
            maxWidth: '100%',
            border: 'none',
            outline: 'none',
            bgcolor: 'transparent',
            ...rawMonoCellSx,
            color: T.goldDeep,
            borderBottom: `1px solid ${T.goldTint2}`,
            p: 0,
            m: 0,
          }}
        />
      </Box>
    );
  }

  return (
    <Box component="td" sx={tdSx}>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        title={
          inactive
            ? inactiveHint ?? 'Non synchronisé au calendrier'
            : disabled
              ? undefined
              : 'Cliquer pour modifier'
        }
        onClick={() => {
          if (disabled) return;
          setLocal(String(value));
          setEditing(true);
        }}
        sx={{
          all: 'unset',
          cursor: disabled ? 'default' : 'pointer',
          color: inactive ? '#c62828' : undefined,
          display: 'inline',
          ...rawMonoCellSx,
          color: T.text,
          opacity: disabled ? 0.45 : 1,
          '&:hover': disabled ? {} : { color: T.goldDeep },
        }}
      >
        {formatPilotDisplay(value, compact)}
      </Box>
    </Box>
  );
}

function AiSyncToggle({
  enabled,
  disabled,
  applyMinStay = true,
  onToggle,
}: {
  enabled: boolean;
  disabled?: boolean;
  applyMinStay?: boolean;
  onToggle: (v: boolean) => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        if (disabled || pending) return;
        setPending(true);
        void Promise.resolve(onToggle(!enabled)).finally(() => setPending(false));
      }}
      title={
        enabled
          ? applyMinStay
            ? 'Sync prix + min stay'
            : 'Sync prix seul (min stay OFF)'
          : 'Sync auto OFF — affichage inchangé'
      }
      sx={{
        all: 'unset',
        cursor: disabled || pending ? 'default' : 'pointer',
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: '"Geist Mono", monospace',
        color: pending ? T.text3 : enabled ? T.success : T.text3,
        letterSpacing: '0.02em',
        opacity: disabled ? 0.5 : pending ? 0.65 : 1,
        '&:hover': disabled || pending ? {} : { textDecoration: 'underline' },
      }}
    >
      {pending ? '…' : enabled ? (applyMinStay ? 'ON' : 'PRIX') : 'OFF'}
    </Box>
  );
}

function PortfolioRowComp({ row, bulkSelectEnabled = true, selected, onToggle, onDrillDown }: {
  row: PortfolioRow; bulkSelectEnabled?: boolean; selected: boolean;
  onToggle: () => void; onDrillDown: () => void;
}) {
  const snapLabel = row.airroiSnapshotAt
    ? new Date(row.airroiSnapshotAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <Box component="tr" sx={{
      ...(selected ? { background: T.goldTint } : {}),
      '&:hover td': { background: selected ? T.goldTint : T.bg2 },
    }}>
      {AIRROI_RAW_COLUMNS.filter((col) => bulkSelectEnabled || col.id !== 'check').map(col => {
        if (col.id === 'check') {
          return (
            <Box key={col.id} component="td" sx={tableCellSx}>
              <RowCheckbox selected={selected} onToggle={onToggle} />
            </Box>
          );
        }
        if (col.id === 'bien') {
          return (
            <Box key={col.id} component="td" sx={{ ...tableCellSx, minWidth: 160 }}>
              <ListingNameLink
                name={row.listing.name}
                sub={row.listing._id.slice(-8)}
                onNavigate={onDrillDown}
              />
            </Box>
          );
        }
        if (col.id === 'airbnb') {
          return (
            <Box key={col.id} component="td" sx={tableCellSx}>
              <AirbnbConnectCell listing={row.listing} />
            </Box>
          );
        }
        if (col.id === 'snapshot') {
          return (
            <RawCell key={col.id} value={snapLabel} muted />
          );
        }
        if (col.id === 'action') {
          return null;
        }
        if (col.field) {
          const v = formatAirroiRawValue(col.field, row.airroiRaw);
          return <RawCell key={col.id} value={v} highlight={!row.hasAirroiSnapshot} />;
        }
        return null;
      })}
    </Box>
  );
}

function RawCell({ value, muted, highlight }: { value: string; muted?: boolean; highlight?: boolean }) {
  return (
    <Box component="td" sx={{
      ...rawCellTdSx(),
      color: highlight ? T.text4 : muted ? T.text3 : T.text,
    }}>{value}</Box>
  );
}

function AirbnbConnectCell({ listing }: { listing: Listing }) {
  const connected = Boolean(listing.airbnbConnected && listing.airbnbListingId);
  const url = listing.airbnbPublicUrl;
  const status = listing.airbnbStatus;
  const markup = listing.airbnbMarkup;
  return (
    <Stack sx={{ gap: 0.375, minWidth: 88 }}>
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        fontSize: 11, fontWeight: 800,
        color: connected ? T.success : T.text4,
      }}>
        <Box component="span" sx={{
          width: 7, height: 7, borderRadius: '50%',
          bgcolor: connected ? T.success : T.text4,
        }} />
        {connected ? 'Connecté' : 'Non connecté'}
      </Box>
      {connected && listing.airbnbListingId && (
        <Box sx={{ fontSize: 9.5, fontFamily: '"Geist Mono", monospace', color: T.text3, fontWeight: 600 }}>
          {listing.airbnbListingId}
        </Box>
      )}
      {connected && status && (
        <Box sx={{ fontSize: 9.5, color: T.text3 }}>{status}{markup != null ? ` · ${markup}%` : ''}</Box>
      )}
      {connected && url && (
        <Box component="a" href={url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          sx={{
            fontSize: 10, fontWeight: 700, color: T.info, textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}>
          Ouvrir l’annonce
        </Box>
      )}
      {!connected && listing.otaVerifiedAt && (
        <Box sx={{ fontSize: 9, color: T.text4 }} title="Vérifier les canaux sur le dashboard legacy">
          Canal vérifié — identifiant manquant
        </Box>
      )}
    </Stack>
  );
}

function AirroiSnapshotHint({ row }: { row: PortfolioRow }) {
  if (!row.hasAirroiSnapshot || !row.airroiSnapshotAt) return null;
  const d = new Date(row.airroiSnapshotAt);
  const label = Number.isNaN(d.getTime())
    ? row.airroiSnapshotAt
    : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <Box sx={{ fontSize: 9, color: T.success, fontWeight: 700 }} title="Données marché snapshot (pas d’appel API au chargement)">
      Snapshot · {label}
    </Box>
  );
}

function HeaderInfoIcon({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 320, p: 0.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5 }}>{title}</Typography>
          <Typography sx={{ fontSize: 11, lineHeight: 1.45 }}>{body}</Typography>
        </Box>
      }
      arrow
      placement="bottom-start"
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.text3,
          cursor: 'help',
          '&:hover': { color: T.goldDeep },
        }}
        onClick={e => e.stopPropagation()}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </Box>
    </Tooltip>
  );
}

function ColumnHeaderLabel({
  label,
  sortMark,
  title,
  body,
  periodHint,
}: {
  label: string;
  sortMark?: boolean;
  title: string;
  body: string;
  periodHint?: 'period';
}) {
  if (!label && !title) return null;
  const fullBody =
    body +
    (periodHint
      ? `\n\nPériode conservée en historique : TTM = ${TTM_MONTHS} mois avant la date du snapshot ; série mensuelle = ${METRICS_HISTORY_MONTHS} mois (metrics/all).`
      : '');
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375 }}>
      <span>{label}{sortMark ? ' ↓' : ''}</span>
      {title && body && <HeaderInfoIcon title={title} body={fullBody} />}
    </Box>
  );
}

function NumCell({
  value,
  gold,
  ok,
  warn,
  hint,
}: {
  value: string;
  gold?: boolean;
  ok?: boolean;
  warn?: boolean;
  hint?: string;
}) {
  const cell = (
    <Box component="td" sx={{
      p: '12px 14px', borderBottom: `1px solid ${T.border}`,
      fontFamily: '"Geist Mono", monospace', fontWeight: 700, letterSpacing: '-0.005em',
      color: gold ? T.goldDeep : ok ? T.success : warn ? T.error : T.text,
    }}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375 }}>
        {value}
        {hint && (
          <HeaderInfoIcon title="Période · ce bien" body={hint} />
        )}
      </Box>
    </Box>
  );
  return cell;
}

function ModeChip({ kind, children }: { kind: 'pr' | 'eq' | 'ag' | 'off'; children: React.ReactNode }) {
  const styles = {
    pr: { bg: T.infoTint, c: T.info },
    eq: { bg: T.goldTint, c: T.goldDeep },
    ag: { bg: T.errorTint, c: T.error },
    off:{ bg: T.bg3, c: T.text3 },
  }[kind];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: 0.25, borderRadius: 0.625,
      fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 800,
      letterSpacing: '0.04em', background: styles.bg, color: styles.c,
    }}>{children}</Box>
  );
}

function ScoreBar({ score }: { score: number }) {
  const status = perfStatus(score);
  const grads = {
    over: `linear-gradient(90deg, ${T.success}, #0d6a47)`,
    par:  `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`,
    under:`linear-gradient(90deg, #fca5a5, ${T.error})`,
  };
  const colors = { over: T.success, par: T.text, under: T.error };
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1,  maxWidth: 120 }}>
      <Box sx={{ flex: 1, height: 6, background: T.bg3, borderRadius: 999, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${score}%`, background: grads[status], borderRadius: 999 }} />
      </Box>
      <Box sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 11, fontWeight: 800,
        color: colors[status], minWidth: 30,
      }}>{Math.round(score)}</Box>
    </Stack>
  );
}

function FilterChip({
  on,
  onClick,
  children,
  activeVariant = 'gold',
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeVariant?: 'gold' | 'success';
}) {
  const activeStyle =
    activeVariant === 'success'
      ? { background: T.successTint, border: `1px solid ${T.success}`, color: T.success }
      : { background: T.goldTint, border: `1px solid ${T.gold}`, color: T.goldDeep };
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      px: 1.25, py: 0.75, borderRadius: 0.875, fontSize: 11, fontWeight: 700,
      transition: 'border-color 0.15s, background 0.15s',
      ...(on
        ? activeStyle
        : { background: T.bg1, border: `1px solid ${T.border}`, color: T.text2,
            '&:hover': { borderColor: T.borderStrong, bgcolor: T.bg2 } }),
    }}>{children}</Box>
  );
}
