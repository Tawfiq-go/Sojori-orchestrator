import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  PageHeader,
  Panel,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { listingsService } from '../services/listingsService';
import type { ListingChannelsSnapshot, ListingSummary } from '../types/listings.types';

export function ChannelsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('listingId') || '');
  const [snapshot, setSnapshot] = useState<ListingChannelsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
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

  const loadChannels = async (listingId: string, listing?: ListingSummary) => {
    try {
      setMappingLoading(true);
      const result = await listingsService.getChannels(listingId, listing);
      setSnapshot(result.data);
      setSource(result.source);
      setWarning(result.warning || null);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Erreur mapping channels';
      setError(message);
      setSnapshot(null);
    } finally {
      setMappingLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadChannels(selectedId, selectedListing || undefined);
  }, [selectedId, selectedListing]);

  const connectedCount = listings.filter((listing) => listing.channelManager && listing.channelManager !== 'direct').length;

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Canaux']}>
      <PageHeader title="Channels" count={`${connectedCount}/${listings.length} connectés`}>
        <Button sx={btnGhostSx} onClick={() => void loadListings()}>
          Actualiser
        </Button>
        {selectedListing && (
          <Button sx={btnPrimarySx} onClick={() => navigate(`/catalogue/listings/${selectedListing.id}`)}>
            Voir listing
          </Button>
        )}
      </PageHeader>

      {source === 'mock' && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.text2 }}>
            Affichage fallback local des canaux. Le mapping Channex réel n&apos;est pas accessible pour le moment.
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
        <Panel title="Listings" desc={loading ? 'Chargement...' : `${listings.length} entrée(s)`}>
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
                    {listing.city || 'Ville N/A'} · {listing.channelManager || 'direct'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Panel>

        <Panel
          title={selectedListing ? `Mapping - ${selectedListing.name}` : 'Mapping channels'}
          desc={mappingLoading ? 'Chargement du mapping...' : snapshot ? `${snapshot.roomTypes.length} room types` : 'Sélectionner un listing'}
        >
          {!selectedListing ? (
            <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
              Sélectionne un listing pour inspecter ses canaux.
            </Typography>
          ) : mappingLoading ? (
            <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
              Chargement du mapping Channex...
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <ChannelInfo label="Manager" value={snapshot?.channelManager || selectedListing.channelManager || 'N/A'} />
                <ChannelInfo label="Channex ID" value={snapshot?.channexListingId || selectedListing.channexListingId || 'N/A'} />
                <ChannelInfo label="RU IDs" value={selectedListing.rentalUnitedIds.length > 0 ? selectedListing.rentalUnitedIds.join(', ') : 'Aucun'} />
              </Box>

              {snapshot?.roomTypes.length ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {snapshot.roomTypes.map((roomType) => (
                    <Box
                      key={roomType.id}
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        border: `1px solid ${t.border}`,
                        background: t.bg2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{roomType.name}</Typography>
                        <Badge variant={roomType.channexRoomTypeId ? 'success' : 'warning'}>
                          {roomType.channexRoomTypeId ? 'mappé' : 'à vérifier'}
                        </Badge>
                      </Box>
                      <Typography sx={{ mt: 0.75, fontSize: 12, color: t.text3 }}>
                        Channex room type: {roomType.channexRoomTypeId || 'N/A'}
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3 }}>
                        Rate plans: {roomType.ratePlans.length > 0 ? roomType.ratePlans.join(', ') : 'Aucun'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                  Aucun détail de mapping remonté pour ce listing.
                </Typography>
              )}
            </Box>
          )}
        </Panel>
      </Box>
    </DashboardWrapper>
  );
}

function ChannelInfo({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg2 }}>
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: t.text }}>{value}</Typography>
    </Box>
  );
}

export default ChannelsPage;
