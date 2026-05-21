import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T } from './_tokens';
import { getCityMapCatalog, MARKET_REFRESH_CITIES, type MapCityKey } from './cityMapCatalog';
import { normalizeCityKey } from './cityScope';
import {
  AIRROI_COMPS_FAQ,
  type ListingFieldCoverage,
} from './bienDataCoverage';

/** Coûts marché tier Standard (USD / appel) — aligné srv-channels pricing */
const COST = {
  listing: 0.1,
  listingMetrics: 0.1,
  listingFutureRates: 0.1,
  listingComparables: 0.1,
  marketSummary: 0.1,
  marketMetricsAll: 0.5,
  marketPacing: 0.2,
} as const;

const PER_LISTING_CALLS = 4;
const PER_LISTING_USD =
  COST.listing +
  COST.listingMetrics +
  COST.listingFutureRates +
  COST.listingComparables;

export type DynamicPricingAirroiModalProps = {
  /** Portefeuille (défaut) ou fiche d’un seul bien */
  scope?: 'portfolio' | 'listing';
  listingName?: string;
  listingHasAirbnb?: boolean;
  sojoriListingsCount: number;
  withAirbnbCount: number;
  withAirroiSnapshotCount: number;
  marketCacheLabel?: string | null;
  /** Ville active (filtre portefeuille) — pilote libellés refresh marché */
  activeCityScope?: string | null;
  loadingPortfolio?: boolean;
  onReloadPortfolio: () => void | Promise<void>;
  onRefreshListingPerformance: (city?: string | null) => void | Promise<{
    refreshed: number;
    failed: number;
    totalCostUsd: number;
  } | void>;
  /** Un seul bien (scope listing) */
  onRefreshThisListingPerformance?: () => void | Promise<{ costUsd?: number } | void>;
  /** Ville cible du refresh marché (Marrakech | Casablanca) */
  onRefreshAirroiMarket: (city: string) => void | Promise<void>;
  /** Fiche bien : tableau section ↔ API */
  fieldCoverage?: ListingFieldCoverage[];
  airroiCompsCount?: number;
  onRecomputePricing?: () => void | Promise<void>;
};

type RunKind = 'portfolio' | 'listingPerf' | 'listingOne' | 'market' | 'recompute' | null;

export default function DynamicPricingAirroiModal({
  scope = 'portfolio',
  listingName,
  listingHasAirbnb = true,
  sojoriListingsCount,
  withAirbnbCount,
  withAirroiSnapshotCount,
  marketCacheLabel,
  activeCityScope = null,
  loadingPortfolio,
  onReloadPortfolio,
  onRefreshListingPerformance,
  onRefreshThisListingPerformance,
  onRefreshAirroiMarket,
  fieldCoverage,
  airroiCompsCount = 0,
  onRecomputePricing,
}: DynamicPricingAirroiModalProps) {
  const isListing = scope === 'listing';
  const defaultMarketCity: MapCityKey =
    activeCityScope && MARKET_REFRESH_CITIES.includes(normalizeCityKey(activeCityScope) as MapCityKey)
      ? (normalizeCityKey(activeCityScope) as MapCityKey)
      : 'Marrakech';
  const [marketRefreshCity, setMarketRefreshCity] = useState<MapCityKey>(defaultMarketCity);
  const marketCatalog = getCityMapCatalog(marketRefreshCity);
  const marketRefreshEnabled = marketCatalog?.marketRefreshAvailable ?? true;
  const perfCityLabel = activeCityScope ? normalizeCityKey(activeCityScope) : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !isListing) {
      setMarketRefreshCity(defaultMarketCity);
    }
  }, [open, isListing, defaultMarketCity]);
  const [running, setRunning] = useState<RunKind>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [showFieldTable, setShowFieldTable] = useState(false);

  /** Ville + ~7 quartiers × (summary + metrics + pacing) — ordre de grandeur */
  const marketEstMinUsd = 1.5;
  const marketEstMaxUsd = 6;

  const run = async (kind: RunKind, fn: () => void | Promise<unknown>) => {
    setRunning(kind);
    setLastMsg(null);
    try {
      const res = await fn();
      if (kind === 'listingOne') {
        const r = res as { costUsd?: number } | void;
        const cost = r?.costUsd ?? PER_LISTING_USD;
        setLastMsg(
          `Snapshot enregistré pour ${listingName ?? 'ce bien'} · coût estimé ~$${cost.toFixed(2)} USD`,
        );
      } else if (kind === 'listingPerf') {
        const r = res as { refreshed?: number; failed?: number; totalCostUsd?: number } | void;
        const n = r?.refreshed ?? withAirbnbCount;
        const cost = r?.totalCostUsd;
        setLastMsg(
          cost != null
            ? `Perf enregistrées · ${n} bien${n !== 1 ? 's' : ''} · coût estimé ~$${cost.toFixed(2)} USD`
            : `Perf enregistrées pour ${n} bien${n !== 1 ? 's' : ''} avec ID Airbnb.`,
        );
      } else if (kind === 'market') {
        setLastMsg(`Cache marché ${marketRefreshCity} mis à jour.`);
      } else if (kind === 'recompute') {
        setLastMsg('Calendrier prix Sojori recalculé (RecommendedPriceCache).');
      } else {
        setLastMsg('Portefeuille rechargé depuis Sojori (sans appel API payant).');
      }
    } catch {
      setLastMsg('Échec — voir la console ou réessayer.');
    } finally {
      setRunning(null);
    }
  };

  const triggerLabel = isListing ? 'Récupérer · ce bien' : 'Actualisation des données';
  const perfListingUsd = Math.round(withAirbnbCount * PER_LISTING_USD * 100) / 100;

  return (
    <>
      <Button
        size="small"
        variant="contained"
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          fontWeight: 800,
          fontSize: 12,
          borderRadius: 1,
          bgcolor: T.goldDeep,
          color: T.text,
          boxShadow: '0 1px 2px rgba(20,17,10,0.08)',
          gap: 0.75,
          '&:hover': { bgcolor: T.gold },
        }}
      >
        <span aria-hidden>⟳</span>
        {triggerLabel}
        {(withAirbnbCount > 0 || withAirroiSnapshotCount > 0) && (
          <Box
            component="span"
            sx={{
              fontSize: 10,
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 800,
              px: 0.625,
              py: 0.125,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.2)',
            }}
          >
            {withAirroiSnapshotCount}/{withAirbnbCount}
          </Box>
        )}
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (!running) {
            setOpen(false);
            setShowFieldTable(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: `1px solid ${T.border}`,
            boxShadow: '0 12px 40px rgba(20,17,10,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            pb: 1,
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          <Box>
            {isListing ? `Données marché — ${listingName ?? 'Bien'}` : 'Actualisation des données'}
            <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: T.text3, mt: 0.5 }}>
              {isListing
                ? 'Cette fiche lit le snapshot en base — aucun appel API au chargement.'
                : 'Le portefeuille lit toujours les snapshots en base — jamais d’appel API au chargement de la page.'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            disabled={!!running}
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 0, pb: 2, maxHeight: 'min(78vh, 720px)', overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5 }}>
            {isListing ? (
              <>
                <strong>Fiche bien</strong>
                {' · '}
                {listingHasAirbnb ? 'ID Airbnb présent' : 'Pas d’ID Airbnb — refresh indisponible'}
                {withAirroiSnapshotCount > 0 ? ' · snapshot en base' : ' · pas encore de snapshot'}
              </>
            ) : (
              <>
                {perfCityLabel ? (
                  <>
                    <strong>Vue {perfCityLabel}</strong>
                    {' · '}
                  </>
                ) : (
                  <strong>Toutes villes</strong>
                )}
                {' · '}
                {sojoriListingsCount} bien{sojoriListingsCount !== 1 ? 's' : ''} Sojori ·{' '}
                {withAirbnbCount} avec ID Airbnb
                {withAirroiSnapshotCount > 0
                  ? ` · ${withAirroiSnapshotCount} snapshot${withAirroiSnapshotCount !== 1 ? 's' : ''}`
                  : ''}
                {marketCacheLabel ? ` · ${marketCacheLabel}` : ''}
              </>
            )}
          </Typography>

          {isListing ? (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 1.5,
                border: `2px solid ${T.goldDeep}`,
                bgcolor: T.goldTint,
                boxShadow: '0 2px 8px rgba(199,155,34,0.15)',
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.75 }}>
                Récupération données marché · ce bien
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.5, mb: 1.5 }}>
                Envoie 4 appels API, enregistre le snapshot (TTM, L90D, comparables §07).
                Coût estimé ~${PER_LISTING_USD.toFixed(2)} USD.
              </Typography>
              <Button
                fullWidth
                size="large"
                variant="contained"
                disabled={
                  !!running ||
                  !listingHasAirbnb ||
                  !onRefreshThisListingPerformance ||
                  loadingPortfolio
                }
                onClick={() =>
                  void run(
                    'listingOne',
                    onRefreshThisListingPerformance ?? (async () => undefined),
                  )
                }
                sx={{
                  py: 1.35,
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                  bgcolor: T.goldDeep,
                  color: T.text,
                  '&:hover': { bgcolor: T.gold },
                  '&.Mui-disabled': { bgcolor: T.bg3, color: T.text3 },
                }}
              >
                {running === 'listingOne' ? (
                  <CircularProgress size={22} sx={{ color: T.text }} />
                ) : (
                  'Envoyer · récupérer les données'
                )}
              </Button>
              {!listingHasAirbnb ? (
                <Typography sx={{ fontSize: 11, color: T.warning, mt: 1, fontWeight: 600 }}>
                  Connectez l’ID Airbnb sur le dashboard legacy avant d’envoyer.
                </Typography>
              ) : null}
            </Box>
          ) : null}

          {lastMsg && (
            <Box
              sx={{
                mb: 2,
                p: 1.25,
                borderRadius: 1,
                bgcolor: T.goldTint,
                border: `1px solid ${T.gold}`,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {lastMsg}
            </Box>
          )}

          <Stack spacing={1.5}>
            {!isListing ? (
              <ActionCard
                title="Récupérer les performances par bien"
                description={
                  perfCityLabel
                    ? `Pour chaque annonce avec ID Airbnb dans ${perfCityLabel} (${withAirbnbCount} bien${withAirbnbCount !== 1 ? 's' : ''}), 4 appels/bien dont comparables.`
                    : `Pour chaque annonce avec ID Airbnb (${withAirbnbCount} bien${withAirbnbCount !== 1 ? 's' : ''}, toutes villes), 4 appels/bien dont comparables.`
                }
                costLines={[
                  { label: 'GET /listings (fiche + perf TTM)', usd: COST.listing },
                  { label: 'GET /listings/metrics/all (24 mois)', usd: COST.listingMetrics },
                  { label: 'GET /listings/future/rates (pacing)', usd: COST.listingFutureRates },
                  { label: 'GET /listings/comparables', usd: COST.listingComparables },
                ]}
                totalLabel={`${withAirbnbCount} listing${withAirbnbCount !== 1 ? 's' : ''} × ${PER_LISTING_CALLS} appels`}
                totalUsd={perfListingUsd}
                example={
                  withAirbnbCount > 0
                    ? `Ex. ${withAirbnbCount} listing${withAirbnbCount !== 1 ? 's' : ''} → ~$${perfListingUsd.toFixed(2)} USD`
                    : 'Aucun ID Airbnb — connectez les canaux sur le dashboard legacy.'
                }
                onRun={() => run('listingPerf', () => onRefreshListingPerformance(activeCityScope))}
                running={running === 'listingPerf'}
                disabled={!!running || withAirbnbCount === 0}
                buttonLabel={
                  withAirbnbCount > 0
                    ? `Envoyer · ${withAirbnbCount} bien${withAirbnbCount !== 1 ? 's' : ''}`
                    : 'Indisponible'
                }
              />
            ) : null}

            {isListing && onRecomputePricing ? (
              <ActionCard
                title="Recalculer le calendrier prix (Sojori)"
                description="POST recompute → RecommendedPriceCache. Remplit la section 04 (moteur Sojori)."
                free
                onRun={() => run('recompute', onRecomputePricing)}
                running={running === 'recompute'}
                disabled={!!running}
                buttonLabel="Recalculer 365 j"
                variant="outlined"
              />
            ) : null}

            <ActionCard
              title={isListing ? 'Recharger cette fiche' : 'Recharger le portefeuille'}
              free
              description={
                isListing
                  ? 'Relit le snapshot déjà enregistré pour ce bien. Aucun appel API payant.'
                  : 'Relit la liste Sojori et les snapshots déjà enregistrés. Aucun appel API payant.'
              }
              onRun={() => run('portfolio', onReloadPortfolio)}
              running={running === 'portfolio'}
              disabled={!!running || loadingPortfolio}
              buttonLabel="Recharger"
              variant="outlined"
            />

            {!isListing ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.25,
                  border: `1px solid ${T.border}`,
                  bgcolor: T.bg2,
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>
                  Actualiser le marché · choisir la ville
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, mb: 1 }}>
                  KPIs ville + quartiers (occupation, ADR, pacing). Alimente la bande « MARCHÉ » et les
                  tooltips carte pour la ville sélectionnée (indépendant de l’onglet portefeuille).
                </Typography>

                <Stack direction="row" sx={{ gap: 0.75,  flexWrap: 'wrap', mb: 1.25 }}>
                  {MARKET_REFRESH_CITIES.map((city) => {
                    const active = marketRefreshCity === city;
                    return (
                      <Box
                        key={city}
                        component="button"
                        type="button"
                        disabled={!!running}
                        onClick={() => setMarketRefreshCity(city)}
                        sx={{
                          all: 'unset',
                          cursor: running ? 'wait' : 'pointer',
                          px: 1.5,
                          py: 0.875,
                          borderRadius: 1,
                          border: `1px solid ${active ? T.goldDeep : T.border}`,
                          bgcolor: active ? T.goldTint : T.bg1,
                          fontSize: 12,
                          fontWeight: active ? 800 : 600,
                          color: active ? T.goldDeep : T.text2,
                        }}
                      >
                        {city}
                      </Box>
                    );
                  })}
                </Stack>

                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    fontSize: 10.5,
                    fontFamily: '"Geist Mono", monospace',
                    color: T.text3,
                    mb: 1,
                    borderCollapse: 'collapse',
                  }}
                >
                  <tbody>
                    {[
                      { label: 'POST /markets/summary (par zone)', usd: COST.marketSummary },
                      { label: 'POST /markets/metrics/all', usd: COST.marketMetricsAll },
                      { label: 'POST /markets/metrics/future/pacing', usd: COST.marketPacing },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td style={{ padding: '3px 0' }}>{row.label}</td>
                        <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          ${row.usd.toFixed(2)} / appel
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        style={{
                          paddingTop: 6,
                          fontWeight: 800,
                          color: T.text,
                          borderTop: `1px solid ${T.border}`,
                        }}
                      >
                        Ville + quartiers Sojori ({marketRefreshCity})
                      </td>
                      <td
                        style={{
                          paddingTop: 6,
                          textAlign: 'right',
                          fontWeight: 800,
                          color: T.goldDeep,
                          borderTop: `1px solid ${T.border}`,
                        }}
                      >
                        —
                      </td>
                    </tr>
                  </tbody>
                </Box>

                <Typography sx={{ fontSize: 10.5, color: T.text3, fontStyle: 'italic', mb: 1 }}>
                  Estimation ~${marketEstMinUsd}–${marketEstMaxUsd} USD selon le nombre de zones reconnues par
                  données marché.
                </Typography>

                <Button
                  size="small"
                  variant="contained"
                  disabled={!!running || !marketRefreshEnabled}
                  onClick={() => void run('market', () => onRefreshAirroiMarket(marketRefreshCity))}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    bgcolor: T.ai,
                    '&:hover': { bgcolor: '#6d28d9' },
                  }}
                >
                  {running === 'market' ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    `Envoyer · marché ${marketRefreshCity}`
                  )}
                </Button>
              </Box>
            ) : null}

            {isListing && MARKET_REFRESH_CITIES.includes(marketRefreshCity) ? (
              <ActionCard
                title={`Actualiser le marché · ${marketRefreshCity}`}
                description={`Sections 05–06 (graphiques / KPIs ville ${marketRefreshCity}).`}
                costLines={[
                  { label: 'POST /markets/summary', usd: COST.marketSummary },
                  { label: 'POST /markets/metrics/all', usd: COST.marketMetricsAll },
                  { label: 'POST /markets/metrics/future/pacing', usd: COST.marketPacing },
                ]}
                totalLabel="Marché ville"
                totalUsd={null}
                example={`Estimation ~$${marketEstMinUsd}–$${marketEstMaxUsd} USD`}
                onRun={() => run('market', () => onRefreshAirroiMarket(marketRefreshCity))}
                running={running === 'market'}
                disabled={!!running || !marketRefreshEnabled}
                buttonLabel={`Envoyer · marché ${marketRefreshCity}`}
                variant="ai"
              />
            ) : null}
          </Stack>

          {isListing && fieldCoverage && fieldCoverage.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setShowFieldTable((v) => !v)}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11, color: T.text3, mb: 1, px: 0 }}
              >
                {showFieldTable ? '▾ Masquer' : '▸ Voir'} le détail champs · source API
              </Button>
              {showFieldTable ? (
                <>
                  <Box sx={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 1 }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                      <Box component="thead">
                        <Box component="tr" sx={{ bgcolor: T.bg2 }}>
                          {['Section', 'Statut', 'API', 'Remplit'].map((h) => (
                            <Box component="th" key={h} sx={{ p: '8px 10px', textAlign: 'left', fontWeight: 800, color: T.text3 }}>
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {fieldCoverage.map((row) => (
                          <Box component="tr" key={row.section}>
                            <Box component="td" sx={{ p: '8px 10px', borderTop: `1px solid ${T.border}`, fontWeight: 700 }}>
                              {row.section}
                            </Box>
                            <Box component="td" sx={{ p: '8px 10px', borderTop: `1px solid ${T.border}` }}>
                              <CoveragePill status={row.status} />
                            </Box>
                            <Box component="td" sx={{ p: '8px 10px', borderTop: `1px solid ${T.border}`, fontFamily: '"Geist Mono", monospace', color: T.text3 }}>
                              {row.api}
                            </Box>
                            <Box component="td" sx={{ p: '8px 10px', borderTop: `1px solid ${T.border}`, color: T.text2 }}>
                              {row.fills}
                              <Box component="span" sx={{ display: 'block', fontSize: 10, color: T.text3, mt: 0.25 }}>
                                {row.note}
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                    {AIRROI_COMPS_FAQ.map((line) => (
                      <Typography key={line} sx={{ fontSize: 10.5, color: T.text3, lineHeight: 1.45 }}>
                        · {line}
                      </Typography>
                    ))}
                    {airroiCompsCount > 0 ? (
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.success }}>
                        Dernier snapshot : {airroiCompsCount} comparable{airroiCompsCount !== 1 ? 's' : ''} en base.
                      </Typography>
                    ) : null}
                  </Stack>
                </>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CoveragePill({ status }: { status: 'prod' | 'empty' | 'partial' }) {
  const cfg =
    status === 'prod'
      ? { label: 'PROD', bg: T.successTint, color: T.success }
      : status === 'partial'
        ? { label: 'PARTIEL', bg: T.goldTint, color: T.goldDeep }
        : { label: 'VIDE', bg: T.bg3, color: T.text3 };
  return (
    <Box
      component="span"
      sx={{
        fontSize: 9,
        fontWeight: 800,
        px: 0.75,
        py: 0.2,
        borderRadius: 999,
        bgcolor: cfg.bg,
        color: cfg.color,
        fontFamily: '"Geist Mono", monospace',
      }}
    >
      {cfg.label}
    </Box>
  );
}

function ActionCard({
  title,
  description,
  costLines,
  totalLabel,
  totalUsd,
  example,
  free,
  onRun,
  running,
  disabled,
  buttonLabel,
  variant = 'gold',
}: {
  title: string;
  description: string;
  costLines?: Array<{ label: string; usd: number }>;
  totalLabel?: string;
  totalUsd: number | null;
  example?: string;
  free?: boolean;
  onRun: () => void;
  running: boolean;
  disabled: boolean;
  buttonLabel: string;
  variant?: 'gold' | 'ai' | 'outlined';
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg2,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, mb: 1 }}>{description}</Typography>

      {free ? (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.success, mb: 1 }}>
          Gratuit · pas d’appel API payant
        </Typography>
      ) : (
        costLines && (
          <Box
            component="table"
            sx={{
              width: '100%',
              fontSize: 10.5,
              fontFamily: '"Geist Mono", monospace',
              color: T.text3,
              mb: 1,
              borderCollapse: 'collapse',
            }}
          >
            <tbody>
              {costLines.map((row) => (
                <tr key={row.label}>
                  <td style={{ padding: '3px 0' }}>{row.label}</td>
                  <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    ${row.usd.toFixed(2)} / appel
                  </td>
                </tr>
              ))}
              {totalLabel && (
                <tr>
                  <td
                    style={{
                      paddingTop: 6,
                      fontWeight: 800,
                      color: T.text,
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    {totalLabel}
                  </td>
                  <td
                    style={{
                      paddingTop: 6,
                      textAlign: 'right',
                      fontWeight: 800,
                      color: T.goldDeep,
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    {totalUsd != null ? `~$${totalUsd.toFixed(2)}` : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </Box>
        )
      )}

      {example && (
        <Typography sx={{ fontSize: 10.5, color: T.text3, fontStyle: 'italic', mb: 1 }}>
          {example}
        </Typography>
      )}

      <Button
        size="small"
        variant={variant === 'outlined' ? 'outlined' : 'contained'}
        disabled={disabled || running}
        onClick={() => void onRun()}
        sx={{
          textTransform: 'none',
          fontWeight: 800,
          fontSize: 12,
          ...(variant === 'gold'
            ? { bgcolor: T.goldDeep, color: T.text, '&:hover': { bgcolor: T.gold } }
            : variant === 'ai'
              ? { bgcolor: T.ai, '&:hover': { bgcolor: '#6d28d9' } }
              : { borderColor: T.border }),
        }}
      >
        {running ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : buttonLabel}
      </Button>
    </Box>
  );
}
