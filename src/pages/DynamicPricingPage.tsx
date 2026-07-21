import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import { useAuth } from '../hooks/useAuth';
import { usePmSimulation } from '../context/PmSimulationContext';
import { hasAdminAccess } from '../utils/rbac.utils';
import {
  BienView,
  DynamicPricingAirroiModal,
  DynamicPricingShell,
  PortfolioView,
  T,
} from '../features/dynamic-pricing';
import { useBienDetail } from '../features/dynamic-pricing/hooks/useBienDetail';
import BienExpressBar from '../features/dynamic-pricing/bien/BienExpressBar';
import BienPageStickyFilters from '../features/dynamic-pricing/bien/BienPageStickyFilters';
import { PricePreviewSelectionProvider } from '../features/dynamic-pricing/bien/pricePreviewSelectionContext';
import { usePortfolio } from '../features/dynamic-pricing/hooks/usePortfolio';
import { bienHref, portfolioHref } from '../features/dynamic-pricing/DynamicPricingBreadcrumb';
import { listingMatchesCityScope, normalizeCityKey } from '../features/dynamic-pricing/cityScope';
import { applyPilotPricing } from '../services/dynamicPricingApi';

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
  const { user } = useAuth();
  const { isActive: simulationActive } = usePmSimulation();
  const isPlatformAdmin = hasAdminAccess(user?.role) && !simulationActive;

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

  /** Fiche bien : pas de synchro auto ville URL — filtre manuel (Toutes villes / ville). */

  const setCityScope = (scope: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!scope) next.delete('city');
    else next.set('city', encodeURIComponent(scope));
    setSearchParams(next, { replace: true });
  };

  const isBienPage = Boolean(listingId);

  const patchPilotConfig = portfolio.patchListingPilot;

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
          dataActions={isBienPage ? null : portfolioAirroiModal}
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
            <PricePreviewSelectionProvider>
              <BienPageStickyFilters
                rows={portfolio.rows}
                cityScope={cityScope}
                onCityScopeChange={setCityScope}
                currentListingId={listingId}
                loading={portfolio.loading}
                onSelectListing={(id) => navigate(bienHref(id, cityScope))}
                onNavigatePortfolio={() => navigate(portfolioHref(cityScope))}
                onNavigateCityPortfolio={(city) => navigate(portfolioHref(city))}
                bienCityLabel={bienCityLabel}
              />
              <BienExpressBar
                view={bienDetail.view}
                isPlatformAdmin={isPlatformAdmin}
                hasMarketData={Boolean(
                  bienDetail.row?.hasRevenueEstimate || bienDetail.row?.hasAirroiSnapshot,
                )}
                listingHasAirbnb={bienDetail.listingHasAirbnb}
                snapshotAt={bienDetail.row?.airroiSnapshotAt ?? null}
                onFetchMarket={() => bienDetail.refreshAirroiPart('estimate')}
                onFetchComps={() => bienDetail.refreshAirroiPart('comparables')}
                onFetchPerformance={
                  isPlatformAdmin ? () => bienDetail.refreshAirroi() : undefined
                }
                advancedOpen={bienAdvancedOpen}
                onToggleAdvanced={toggleBienAdvanced}
              />
              {bienAdvancedOpen ? (
                <BienView {...bienDetail.view} isPlatformAdmin={isPlatformAdmin} />
              ) : null}
            </PricePreviewSelectionProvider>
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
