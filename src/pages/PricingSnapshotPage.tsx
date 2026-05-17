import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  Panel,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { listingsService } from '../services/listingsService';
import type { ListingDetail, ListingSummary } from '../types/listings.types';

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return 'N/A';
  const suffix = currency || 'EUR';
  return `${Math.round(value).toLocaleString('fr-FR')} ${suffix}`;
}

export function PricingSnapshotPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('listingId') || '');
  const [selectedDetail, setSelectedDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'mock'>('api');

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedId) || null,
    [listings, selectedId],
  );

  const loadListings = async () => {
    try {
      setLoading(true);
      const result = await listingsService.getListings();
      setListings(result.data.items);
      setSource(result.source);
      setWarning(result.warning || null);
      setError(null);

      if (!selectedId && result.data.items[0]) {
        const nextId = result.data.items[0].id;
        setSelectedId(nextId);
        setSearchParams({ listingId: nextId });
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Erreur de chargement';
      setError(message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (listingId: string) => {
    try {
      setDetailLoading(true);
      const result = await listingsService.getListingById(listingId);
      setSelectedDetail(result.data);
      setSource(result.source);
      setWarning(result.warning || null);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Erreur pricing';
      setError(message);
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  const dynamicPricingEnabled = listings.filter((listing) => listing.raw.useDynamicPrice === true).length;

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Pricing']}>
      <PageHeader title="Pricing" count={`${dynamicPricingEnabled}/${listings.length} dynamiques`}>
        <Button sx={btnGhostSx} onClick={() => void loadListings()}>
          Actualiser
        </Button>
        {selectedListing && (
          <Button sx={btnPrimarySx} onClick={() => navigate(`/catalogue/listings/${selectedListing.id}`)}>
            Voir listing
          </Button>
        )}
      </PageHeader>

      <StatsRow>
        <StatCard icon="💶" iconBg="rgba(230,176,34,0.12)" iconColor={t.primaryDeep} value={String(listings.length)} label="Listings chargés" />
        <StatCard icon="📈" iconBg="rgba(16,185,129,0.10)" iconColor={t.success} value={String(dynamicPricingEnabled)} label="Dynamic pricing" />
        <StatCard icon="🏷" iconBg="rgba(56,189,248,0.12)" iconColor="#0e7490" value={selectedDetail?.pricing.currency || 'N/A'} label="Devise active" />
        <StatCard icon="🛏" iconBg="rgba(139,92,246,0.10)" iconColor={t.ai} value={selectedDetail ? String(selectedDetail.roomTypes.length) : '0'} label="Room types" />
      </StatsRow>

      {source === 'mock' && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.text2 }}>
            Vue pricing en mode hybride. Les valeurs viennent du fallback local si `srv-listing` ne répond pas.
          </Typography>
          {warning && (
            <Typography sx={{ mt: 0.75, fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
              Détail: {warning}
            </Typography>
          )}
        </Panel>
      )}

      {error && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.error }}>{error}</Typography>
        </Panel>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2 }}>
        <Panel title="Sélection listing" desc={loading ? 'Chargement...' : `${listings.length} entrée(s)`}>
          {loading ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: t.text3 }}>Chargement...</Typography>
          ) : listings.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: t.text3 }}>
              Aucun listing disponible.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {listings.map((listing) => (
                <Box
                  key={listing.id}
                  onClick={() => {
                    setSelectedId(listing.id);
                    setSearchParams({ listingId: listing.id });
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    border: `1px solid ${selectedId === listing.id ? t.primary : t.border}`,
                    background: selectedId === listing.id ? t.primaryTint : t.bg2,
                    cursor: 'pointer',
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{listing.name}</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 11.5, color: t.text3 }}>
                    {listing.city || 'Ville N/A'} · {listing.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Panel>

        <Panel
          title={selectedListing ? `Snapshot pricing - ${selectedListing.name}` : 'Snapshot pricing'}
          desc={detailLoading ? 'Chargement...' : selectedDetail?.pricing.useDynamicPrice ? 'Mode dynamique' : 'Mode standard'}
        >
          {!selectedListing ? (
            <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
              Sélectionne un listing pour voir sa configuration tarifaire.
            </Typography>
          ) : detailLoading ? (
            <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
              Chargement du pricing...
            </Typography>
          ) : !selectedDetail ? (
            <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
              Aucun détail pricing trouvé.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <PricingInfo label="Prix de base" value={formatMoney(selectedDetail.pricing.basePrice, selectedDetail.pricing.currency)} />
                <PricingInfo label="Frais ménage" value={formatMoney(selectedDetail.pricing.cleaningFee, selectedDetail.pricing.currency)} />
                <PricingInfo label="Weekend multiplier" value={selectedDetail.pricing.weekendMultiplier === null ? 'N/A' : String(selectedDetail.pricing.weekendMultiplier)} />
                <PricingInfo label="Min nights" value={selectedDetail.pricing.minNights === null ? 'N/A' : String(selectedDetail.pricing.minNights)} />
                <PricingInfo label="Max nights" value={selectedDetail.pricing.maxNights === null ? 'N/A' : String(selectedDetail.pricing.maxNights)} />
                <PricingInfo
                  label="Dynamic pricing"
                  value={
                    selectedDetail.pricing.useDynamicPrice === null
                      ? 'N/A'
                      : selectedDetail.pricing.useDynamicPrice
                        ? 'Activé'
                        : 'Désactivé'
                  }
                />
              </Box>

              <Panel title="Lecture métier" sx={{ background: t.bg2 }}>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <InsightRow label="Base API" value="La page lit les champs pricing directement depuis `GET /listings/by-id/:id`." />
                  <InsightRow label="Édition" value="L’édition détaillée reste déléguée au formulaire listing avancé existant." />
                  <InsightRow
                    label="Room types"
                    value={
                      selectedDetail.roomTypes.length > 0
                        ? `${selectedDetail.roomTypes.length} room type(s) exposés pour ce listing.`
                        : 'Aucun room type détaillé exposé sur cette fiche.'
                    }
                  />
                </Box>
              </Panel>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button sx={btnPrimarySx} onClick={() => navigate(`/listings/${selectedDetail.id}`)}>
                  Ouvrir formulaire avancé
                </Button>
                <Button sx={btnGhostSx} onClick={() => navigate(`/catalogue/channels?listingId=${selectedDetail.id}`)}>
                  Vérifier canaux
                </Button>
              </Box>
            </Box>
          )}
        </Panel>
      </Box>
    </DashboardWrapper>
  );
}

function PricingInfo({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg2 }}>
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: t.text }}>{value}</Typography>
    </Box>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: t.text3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, color: t.text2 }}>{value}</Typography>
    </Box>
  );
}

export default PricingSnapshotPage;
