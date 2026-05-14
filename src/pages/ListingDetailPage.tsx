import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  PageHeader,
  Panel,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { listingsService } from '../services/listingsService';
import type { ListingChannelsSnapshot, ListingDetail, ListingStatus } from '../types/listings.types';

function getStatusVariant(status: ListingStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'draft') return 'warning';
  return 'neutral';
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) return 'N/A';
  return `${value}${suffix}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date indisponible';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR');
}

export function ListingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [channels, setChannels] = useState<ListingChannelsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'mock'>('api');

  const loadData = async () => {
    if (!id) {
      setError('Identifiant listing manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const listingResult = await listingsService.getListingById(id);
      const listingData = listingResult.data;

      if (!listingData) {
        setListing(null);
        setChannels(null);
        setError('Listing introuvable');
        return;
      }

      const channelsResult = await listingsService.getChannels(id, listingResult.data || undefined);
      setListing(listingData);
      setChannels(channelsResult.data);
      setSource(listingResult.source === 'mock' || channelsResult.source === 'mock' ? 'mock' : 'api');
      setWarning(listingResult.warning || channelsResult.warning || null);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Erreur de chargement';
      setError(message);
      setListing(null);
      setChannels(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleSync = async () => {
    if (!listing) return;

    try {
      setSyncing(true);
      await listingsService.syncListing(listing.id);
      await loadData();
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Erreur pendant la synchronisation';
      setWarning(message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Chargement']}>
        <Panel>
          <Typography sx={{ py: 5, textAlign: 'center', color: t.text3 }}>
            Chargement de la fiche annonce...
          </Typography>
        </Panel>
      </DashboardWrapper>
    );
  }

  if (!listing) {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Introuvable']}>
        <Panel>
          <Typography sx={{ fontSize: 14, color: t.error }}>
            {error || 'Listing non trouvé'}
          </Typography>
        </Panel>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', listing.name]}>
      <PageHeader title={listing.name} count={listing.city || listing.country}>
        <Button sx={btnGhostSx} onClick={() => navigate('/catalogue/channels')}>
          Voir canaux
        </Button>
        <Button sx={btnGhostSx} onClick={() => navigate(`/listings/${listing.id}`)}>
          Formulaire avancé
        </Button>
        <Button sx={btnPrimarySx} onClick={() => void handleSync()} disabled={syncing}>
          {syncing ? 'Sync...' : 'Sync RU'}
        </Button>
      </PageHeader>

      {source === 'mock' && (
        <Panel sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, color: t.text2 }}>
            La fiche est affichée en fallback local. Le backend listing n&apos;est pas pleinement joignable.
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

      <StatsRow>
        <StatCard
          icon="🧭"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={listing.propertyUnit || 'N/A'}
          label="Type de bien"
        />
        <StatCard
          icon="💶"
          iconBg="rgba(16,185,129,0.10)"
          iconColor={t.success}
          value={formatNumber(listing.pricing.basePrice, listing.pricing.currency ? ` ${listing.pricing.currency}` : '')}
          label="Prix de base"
        />
        <StatCard
          icon="🧼"
          iconBg="rgba(56,189,248,0.12)"
          iconColor="#0e7490"
          value={formatNumber(listing.pricing.cleaningFee, listing.pricing.currency ? ` ${listing.pricing.currency}` : '')}
          label="Frais ménage"
        />
        <StatCard
          icon="🔁"
          iconBg="rgba(139,92,246,0.10)"
          iconColor={t.ai}
          value={listing.pricing.useDynamicPrice === null ? 'N/A' : listing.pricing.useDynamicPrice ? 'Oui' : 'Non'}
          label="Dynamic pricing"
        />
      </StatsRow>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' }, gap: 2 }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Panel title="Résumé">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              <MetadataItem label="Statut">
                <Badge variant={getStatusVariant(listing.status)}>{listing.status}</Badge>
              </MetadataItem>
              <MetadataItem label="Owner">{listing.ownerName}</MetadataItem>
              <MetadataItem label="Adresse">{listing.address || 'N/A'}</MetadataItem>
              <MetadataItem label="Coordonnées">
                {listing.lat !== null && listing.lng !== null ? `${listing.lat}, ${listing.lng}` : 'N/A'}
              </MetadataItem>
              <MetadataItem label="Dernière mise à jour">{formatDate(listing.updatedAt)}</MetadataItem>
              <MetadataItem label="Listing ID">{listing.id}</MetadataItem>
            </Box>
          </Panel>

          <Panel title="Description">
            <Typography sx={{ fontSize: 13.5, color: t.text2, lineHeight: 1.7 }}>
              {listing.description || 'Aucune description exposée par l’API listing.'}
            </Typography>
          </Panel>

          <Panel title="Photos" desc={`${listing.listingImages.length} image(s)`}>
            {listing.listingImages.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                Aucune image remontée par l’API.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                {listing.listingImages.map((image) => (
                  <Box
                    key={`${image.url}-${image.sortOrder}`}
                    sx={{
                      aspectRatio: '4/3',
                      borderRadius: '12px',
                      border: `1px solid ${t.border}`,
                      background: `linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.18)), url(${image.url}) center/cover`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Panel>

          <Panel title="Room types" desc={`${listing.roomTypes.length} type(s)`}>
            {listing.roomTypes.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                Aucun room type exposé.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {listing.roomTypes.map((roomType) => (
                  <Box
                    key={roomType.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.6fr 0.6fr' },
                      gap: 1,
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${t.border}`,
                      background: t.bg2,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{roomType.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: t.text2 }}>
                      Chambres: {roomType.roomCount}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: t.text2 }}>
                      Base: {formatNumber(roomType.basePrice)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Box>

        <Box sx={{ display: 'grid', gap: 2 }}>
          <Panel title="Distribution">
            <MetadataItem label="Channel manager">{listing.channelManager || 'N/A'}</MetadataItem>
            <MetadataItem label="Channex property ID">{listing.channexListingId || 'N/A'}</MetadataItem>
            <MetadataItem label="RU listing IDs">
              {listing.rentalUnitedIds.length > 0 ? listing.rentalUnitedIds.join(', ') : 'Aucun'}
            </MetadataItem>
            <MetadataItem label="Room types mappés">
              {channels ? String(channels.roomTypes.length) : '0'}
            </MetadataItem>
          </Panel>

          <Panel title="Pricing snapshot">
            <MetadataItem label="Prix de base">{formatNumber(listing.pricing.basePrice)}</MetadataItem>
            <MetadataItem label="Frais ménage">{formatNumber(listing.pricing.cleaningFee)}</MetadataItem>
            <MetadataItem label="Weekend multiplier">
              {formatNumber(listing.pricing.weekendMultiplier)}
            </MetadataItem>
            <MetadataItem label="Min nights">{formatNumber(listing.pricing.minNights)}</MetadataItem>
            <MetadataItem label="Max nights">{formatNumber(listing.pricing.maxNights)}</MetadataItem>
            <MetadataItem label="Currency">{listing.pricing.currency || 'N/A'}</MetadataItem>
          </Panel>

          <Panel title="Canaux connectés">
            {!channels || channels.roomTypes.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                Aucun mapping détaillé disponible.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {channels.roomTypes.map((roomType) => (
                  <Box
                    key={roomType.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${t.border}`,
                      background: t.bg2,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{roomType.name}</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3 }}>
                      Channex room type: {roomType.channexRoomTypeId || 'N/A'}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3 }}>
                      Rate plans: {roomType.ratePlans.length > 0 ? roomType.ratePlans.join(', ') : 'Aucun'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Box>
      </Box>
    </DashboardWrapper>
  );
}

function MetadataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg2 }}>
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: t.text, wordBreak: 'break-word' }}>{children}</Typography>
    </Box>
  );
}

export default ListingDetailPage;
