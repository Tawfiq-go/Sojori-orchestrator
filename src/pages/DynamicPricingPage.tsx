import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import {
  BienView,
  DynamicPricingAirroiModal,
  DynamicPricingShell,
  PortfolioView,
  T,
} from '../features/dynamic-pricing';
import { useBienDetail } from '../features/dynamic-pricing/hooks/useBienDetail';
import BienExpressBar from '../features/dynamic-pricing/bien/BienExpressBar';
import { usePortfolio } from '../features/dynamic-pricing/hooks/usePortfolio';
import DynamicPricingBreadcrumb, {
  bienHref,
  portfolioHref,
} from '../features/dynamic-pricing/DynamicPricingBreadcrumb';
import { buildListingDataCoverage } from '../features/dynamic-pricing/bienDataCoverage';
import { listingMatchesCityScope, normalizeCityKey } from '../features/dynamic-pricing/cityScope';
import { applyPilotPricing, type PilotPricingConfigDto } from '../services/dynamicPricingApi';

/**
 * Dynamic Pricing — portefeuille (tableau brut) + fiche bien (dashboard design Claude).
 */
export function DynamicPricingPage() {
  const { listingId } = useParams<{ listingId?: string }>();
  const navigate = useNavigate();
  const portfolioPath = '/dynamic-pricing/portefeuille';
  const [searchParams, setSearchParams] = useSearchParams();

  const cityScope = useMemo(() => {
    const p = searchParams.get('city');
    if (!p || p === 'all') return null;
    return decodeURIComponent(p);
  }, [searchParams]);

  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  const portfolio = usePortfolio(requestOwnerId || undefined, cityScope, {
    enabled: scopeFetchReady,
  });
  const bienDetail = useBienDetail(listingId);
  // Express d'abord : l'étude de marché complète est repliée par défaut.
  const [bienAdvancedOpen, setBienAdvancedOpen] = useState<boolean>(
    () => localStorage.getItem('dp-bien-advanced') === '1',
  );
  const toggleBienAdvanced = () => {
    setBienAdvancedOpen((v) => {
      localStorage.setItem('dp-bien-advanced', v ? '0' : '1');
      return !v;
    });
  };

  const scopedModalStats = useMemo(() => {
    const scoped = portfolio.rows.filter((r) =>
      listingMatchesCityScope(r.listing.city, cityScope),
    );
    let withAirbnb = 0;
    let withSnapshot = 0;
    for (const r of scoped) {
      if (r.listing.airbnbConnected && r.listing.airbnbListingId) withAirbnb += 1;
      if (r.hasAirroiSnapshot) withSnapshot += 1;
    }
    return { total: scoped.length, withAirbnb, withSnapshot };
  }, [portfolio.rows, cityScope]);

  const marketCacheHint = useMemo(() => {
    if (!portfolio.marketCache?.fetchedAt) return null;
    const city = portfolio.marketCache?.city ?? 'Marrakech';
    const d = new Date(portfolio.marketCache.fetchedAt).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return `cache marché ${city} · ${d}`;
  }, [portfolio.marketCache]);

  const bienCityLabel = useMemo(() => {
    if (bienDetail?.row?.listing.city) return normalizeCityKey(bienDetail.row.listing.city);
    return cityScope;
  }, [bienDetail?.row?.listing.city, cityScope]);

  /** Fiche bien : URL et portefeuille alignés sur la ville du listing */
  useEffect(() => {
    if (!listingId || !bienDetail?.row?.listing.city) return;
    const key = normalizeCityKey(bienDetail.row.listing.city);
    if (key === '—' || key === cityScope) return;
    const next = new URLSearchParams(searchParams);
    next.set('city', encodeURIComponent(key));
    setSearchParams(next, { replace: true });
  }, [listingId, bienDetail?.row?.listing.city, cityScope, searchParams, setSearchParams]);

  const setCityScope = (scope: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!scope) next.delete('city');
    else next.set('city', encodeURIComponent(scope));
    setSearchParams(next, { replace: true });
  };

  const isBienPage = Boolean(listingId);

  const patchPilotConfig = portfolio.patchListingPilot;

  const listingCanEstimate = Boolean(
    bienDetail?.listingEstimateInputs &&
      ((bienDetail.listingEstimateInputs.lat != null &&
        bienDetail.listingEstimateInputs.lng != null) ||
        bienDetail.listingEstimateInputs.addressLine) &&
      bienDetail.listingEstimateInputs.bedrooms > 0 &&
      bienDetail.listingEstimateInputs.baths > 0 &&
      bienDetail.listingEstimateInputs.guests > 0,
  );

  const listingFieldCoverage =
    isBienPage && bienDetail
      ? buildListingDataCoverage({
          listingHasAirbnb: bienDetail.listingHasAirbnb,
          hasAirroiSnapshot: Boolean(bienDetail.row?.hasAirroiSnapshot),
          hasRevenueEstimate: Boolean(bienDetail.view?.provenance.hasRevenueEstimate),
          hasTtm: bienDetail.hasTtm ?? false,
          hasL90d: bienDetail.hasL90d ?? false,
          hasMarketProd: bienDetail.hasMarketProd ?? false,
          hasCalendarProd: bienDetail.view?.hasCalendarProd ?? false,
          airroiCompsCount:
            bienDetail.row?.airroiCompsCount ?? bienDetail.row?.airroiComps?.length ?? 0,
          airroiCalendarDaysCount:
            bienDetail.row?.airroiCalendarDaysCount ?? bienDetail.row?.airroiCalendarDays?.length ?? 0,
          marketCityLabel: bienCityLabel,
        })
      : undefined;

  const portfolioAirroiModal = (
    <DynamicPricingAirroiModal
      scope="portfolio"
      activeCityScope={cityScope}
      sojoriListingsCount={scopedModalStats.total}
      withAirbnbCount={scopedModalStats.withAirbnb}
      withAirroiSnapshotCount={scopedModalStats.withSnapshot}
      marketCacheLabel={marketCacheHint}
      loadingPortfolio={portfolio.loading}
      onReloadPortfolio={() => portfolio.refetch()}
      onRefreshAirroiMarket={(city) => portfolio.refreshMarket(city)}
      onRefreshListingPerformance={(city) => portfolio.refreshListingPerformance(city)}
    />
  );

  const bienAirroiModal = bienDetail ? (
    <DynamicPricingAirroiModal
      scope="listing"
      activeCityScope={bienCityLabel}
      listingName={
        bienDetail.view?.listing.name ?? bienDetail.row?.listing.name ?? 'Ce bien'
      }
      listingHasAirbnb={bienDetail.listingHasAirbnb}
      listingCanEstimate={listingCanEstimate}
      hasRevenueEstimate={Boolean(bienDetail.view?.provenance.hasRevenueEstimate)}
      estimatePayloadHint={
        bienDetail.listingEstimateInputs
          ? {
              locationLabel:
                bienDetail.listingEstimateInputs.lat != null &&
                bienDetail.listingEstimateInputs.lng != null
                  ? `${bienDetail.listingEstimateInputs.lat.toFixed(5)}, ${bienDetail.listingEstimateInputs.lng.toFixed(5)}`
                  : (bienDetail.listingEstimateInputs.addressLine ?? '—'),
              bedrooms: bienDetail.listingEstimateInputs.bedrooms,
              baths: bienDetail.listingEstimateInputs.baths,
              guests: bienDetail.listingEstimateInputs.guests,
              usesGps:
                bienDetail.listingEstimateInputs.lat != null &&
                bienDetail.listingEstimateInputs.lng != null,
            }
          : null
      }
      estimateSummaryHint={
        bienDetail.row?.estimateSummary?.adrP50Mad
          ? {
              adrP50Mad: bienDetail.row.estimateSummary.adrP50Mad,
              revenueP50Mad: bienDetail.row.estimateSummary.revenueP50Mad,
              occupancyP50: bienDetail.row.estimateSummary.occupancyP50,
            }
          : null
      }
      sojoriListingsCount={1}
      withAirbnbCount={bienDetail.listingHasAirbnb ? 1 : 0}
      withAirroiSnapshotCount={bienDetail.row?.hasAirroiSnapshot ? 1 : 0}
      marketCacheLabel={
        bienDetail.marketFetchedAt && bienCityLabel
          ? `cache marché ${bienCityLabel} · ${new Date(bienDetail.marketFetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
          : null
      }
      fieldCoverage={listingFieldCoverage}
      airroiCompsCount={
        bienDetail.row?.airroiCompsCount ?? bienDetail.row?.airroiComps?.length ?? 0
      }
      loadingPortfolio={bienDetail.loading}
      onReloadPortfolio={() => bienDetail.refetch()}
      onRefreshListingPerformance={async () => undefined}
      onRefreshThisListingPerformance={() => bienDetail.refreshAirroi()}
      onRefreshListingEstimate={() => bienDetail.refreshAirroiPart('estimate')}
      onRefreshAirroiMarket={(city) => portfolio.refreshMarket(city)}
      onRecomputePricing={() => bienDetail.applyToOps()}
    />
  ) : null;

  return (
    <DashboardWrapper breadcrumb={[]} hidePageHeader>
      <Box
        sx={{
          bgcolor: T.bg0,
          minHeight: 'calc(100vh - 64px)',
          width: '100%',
          minWidth: 0,
        }}
      >
        <DynamicPricingShell
          hideTitle
          dataActions={isBienPage ? bienAirroiModal : portfolioAirroiModal}
        >
          {listingId && bienDetail?.error && !bienDetail.loading ? (
            <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
              <Typography sx={{ color: T.error, fontWeight: 700, mb: 1 }}>
                {bienDetail.error}
              </Typography>
              <Button sx={{ mr: 1 }} onClick={() => navigate(portfolioHref(cityScope))}>
                Retour au portefeuille
              </Button>
              <Button variant="outlined" onClick={() => navigate(portfolioPath)}>
                Portefeuille
              </Button>
            </Box>
          ) : listingId && bienDetail?.loading && !bienDetail?.view ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: T.text2 }}>Chargement du bien…</Typography>
            </Box>
          ) : listingId && bienDetail?.view ? (
            <>
              <DynamicPricingBreadcrumb
                crumbs={[
                  { label: 'Pricing', onClick: () => navigate(portfolioHref(cityScope)) },
                  ...(bienCityLabel
                    ? [{
                        label: bienCityLabel,
                        onClick: () => navigate(portfolioHref(bienCityLabel)),
                      }]
                    : []),
                  { label: bienDetail.view.listing.name },
                ]}
              />
              <BienExpressBar
                view={bienDetail.view}
                hasMarketData={Boolean(
                  bienDetail.row?.hasRevenueEstimate || bienDetail.row?.hasAirroiSnapshot,
                )}
                snapshotAt={bienDetail.row?.airroiSnapshotAt ?? null}
                onFetchMarket={() => bienDetail.refreshAirroiPart('estimate')}
                advancedOpen={bienAdvancedOpen}
                onToggleAdvanced={toggleBienAdvanced}
              />
              {bienAdvancedOpen ? <BienView {...bienDetail.view} /> : null}
            </>
          ) : portfolio.fetchFailed && !portfolio.loading ? (
            <Box sx={{ px: { xs: 2, md: 3 }, py: 4, maxWidth: 720, mx: 'auto' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.error, mb: 1 }}>
                Impossible de charger le portefeuille
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: T.text2,
                  fontFamily: '"Geist Mono", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {portfolio.error}
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
                onClick={() => void portfolio.refetch()}
              >
                Réessayer
              </Button>
            </Box>
          ) : (
            <>
              {portfolio.error && !portfolio.fetchFailed ? (
                <Box
                  sx={{
                    mx: 2,
                    mt: 1,
                    mb: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${T.warning}`,
                    bgcolor: T.warningTint,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                    {portfolio.error}
                  </Typography>
                </Box>
              ) : null}
              <PortfolioView
                macro={portfolio.macro}
                cityKpis={portfolio.cityKpis}
                zoneStats={portfolio.zoneStats}
                mapPins={portfolio.mapPins}
                rows={portfolio.rows}
                cityScope={cityScope}
                onCityScopeChange={setCityScope}
                loading={portfolio.loading}
                marketFromCache={Boolean(portfolio.marketCache?.hasCity)}
                marketFetchedAt={portfolio.marketCache?.fetchedAt ?? null}
                marketCharts={portfolio.marketCharts}
                onDrillDown={(id) => navigate(bienHref(id, cityScope))}
                onPatchPilotConfig={patchPilotConfig}
                onBulkAction={async (action, ids) => {
                  if (action === 'apply-to-calendar') {
                    await Promise.all(
                      ids.map((id) =>
                        applyPilotPricing(id, { triggerSource: 'portfolio-bulk' }).catch(
                          () => undefined,
                        ),
                      ),
                    );
                    portfolio.refetch();
                  }
                }}
              />
            </>
          )}
        </DynamicPricingShell>
      </Box>
    </DashboardWrapper>
  );
}
