import { useParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, StatsRow, StatCard, btnGhostSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Stack, Typography, Button } from '@mui/material';

// Mock data - in production this would come from API based on params.id
const LISTINGS: Record<string, any> = {
  'villa-belvedere': {
    id: 'villa-belvedere',
    name: 'Villa Belvédère',
    photoColor: 'gold',
    place: 'NICE · CÔTE D\'AZUR · 4ch · 240m²',
    rating: '4.92 · 47 avis',
    occupancy: '87%',
    adr: '€280',
    monthlyRev: '€18k',
    channels: ['airbnb', 'booking', 'vrbo', 'direct'],
    description: 'Magnifique villa surplombant la baie des Anges avec vue panoramique sur la mer Méditerranée.',
    address: '42 Boulevard de la Colline, 06000 Nice',
    capacity: '8 voyageurs · 4 chambres · 3 salles de bain',
    amenities: ['Piscine privée', 'Climatisation', 'WiFi fibre', 'Parking 2 voitures', 'Vue mer panoramique', 'Cuisine équipée', 'Terrasse 80m²', 'Barbecue'],
    basePrice: 280,
    cleaningFee: 150,
    weekendMultiplier: 1.3,
  },
  'dar-sojori': {
    id: 'dar-sojori',
    name: 'Dar Sojori',
    photoColor: 'blue',
    place: 'MARRAKECH · MÉDINA · 6ch · riad',
    rating: '4.85 · 32 avis',
    occupancy: '92%',
    adr: '€180',
    monthlyRev: '€14k',
    channels: ['airbnb', 'booking'],
    description: 'Authentique riad marocain entièrement rénové au cœur de la médina de Marrakech.',
    address: 'Derb Sidi Ahmed Soussi, Médina, 40000 Marrakech',
    capacity: '12 voyageurs · 6 chambres · 6 salles de bain',
    amenities: ['Piscine intérieure', 'Hammam traditionnel', 'Toit-terrasse', 'Personnel sur place', 'Cuisine traditionnelle', 'Climatisation', 'WiFi'],
    basePrice: 180,
    cleaningFee: 80,
    weekendMultiplier: 1.15,
  },
  'villa-atlas': {
    id: 'villa-atlas',
    name: 'Villa Atlas',
    photoColor: 'purple',
    place: 'MARRAKECH · PALMERAIE · 5ch · 320m²',
    rating: '4.95 · 28 avis',
    occupancy: '91%',
    adr: '€420',
    monthlyRev: '€22k',
    channels: ['airbnb', 'booking', 'direct'],
    description: 'Villa de luxe moderne dans la Palmeraie avec vue sur l\'Atlas.',
    address: 'Circuit de la Palmeraie, 40000 Marrakech',
    capacity: '10 voyageurs · 5 chambres · 5 salles de bain',
    amenities: ['Piscine chauffée', 'Spa & Jacuzzi', 'Salle de sport', 'Cinema room', 'Chef sur demande', 'Majordome', 'Jardin 2000m²'],
    basePrice: 420,
    cleaningFee: 200,
    weekendMultiplier: 1.2,
  },
};

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listing = id ? LISTINGS[id] : null;

  if (!listing) {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Non trouvée']}>
        <Panel>
          <Typography>Listing non trouvée</Typography>
        </Panel>
      </DashboardWrapper>
    );
  }

  const thumbColors: Record<string, string> = {
    gold: 'linear-gradient(135deg, #fde68a, #d97706)',
    blue: 'linear-gradient(135deg, #a5f3fc, #0e7490)',
    purple: 'linear-gradient(135deg, #ddd6fe, #7c3aed)',
    green: 'linear-gradient(135deg, #86efac, #16a34a)',
    pink: 'linear-gradient(135deg, #fda4af, #ec4899)',
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', listing.name]}>
      <PageHeader title={listing.name} desc={listing.place}>
        <Button sx={btnGhostSx}>📊 Statistiques</Button>
        <Button sx={btnGhostSx}>📅 Calendrier</Button>
        <Button sx={btnPrimarySx}>✏️ Modifier</Button>
      </PageHeader>

      <StatsRow>
        <StatCard
          icon="📊"
          iconBg="rgba(16,185,129,0.10)"
          iconColor={t.success}
          value={listing.occupancy}
          label="Taux d'occupation"
          trend="5%"
          trendUp
        />
        <StatCard
          icon="€"
          iconBg="rgba(230,176,34,0.10)"
          iconColor={t.primaryDeep}
          value={listing.adr}
          label="ADR moyen"
          trend="12%"
          trendUp
        />
        <StatCard
          icon="💰"
          iconBg="rgba(6,182,212,0.10)"
          iconColor="#0e7490"
          value={listing.monthlyRev}
          label="Revenue mensuel"
          trend="8%"
          trendUp
        />
        <StatCard
          icon="⭐"
          iconBg="rgba(139,92,246,0.10)"
          iconColor={t.ai}
          value={listing.rating.split(' ·')[0]}
          label={`Note · ${listing.rating.split(' · ')[1]}`}
        />
      </StatsRow>

      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 2 }}>
        {/* Main Content */}
        <Stack spacing={2}>
          <Panel title="Photos">
            <Box
              sx={{
                aspectRatio: '16/9',
                borderRadius: '12px',
                background: thumbColors[listing.photoColor],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              {listing.name[0]}
            </Box>
          </Panel>

          <Panel title="Description">
            <Typography sx={{ mb: 2, lineHeight: 1.6 }}>{listing.description}</Typography>
            <Typography sx={{ fontSize: 13, color: t.text3, fontFamily: 'Geist Mono' }}>
              📍 {listing.address}
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3, fontFamily: 'Geist Mono', mt: 1 }}>
              👥 {listing.capacity}
            </Typography>
          </Panel>

          <Panel title="Équipements">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {listing.amenities.map((amenity: string) => (
                <Box
                  key={amenity}
                  sx={{
                    p: '10px 14px',
                    bgcolor: t.bg2,
                    borderRadius: '8px',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ✓ {amenity}
                </Box>
              ))}
            </Box>
          </Panel>
        </Stack>

        {/* Sidebar */}
        <Stack spacing={2}>
          <Panel title="Tarification">
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Prix de base / nuit</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: t.primaryDeep }}>
                €{listing.basePrice}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Frais de ménage</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>€{listing.cleaningFee}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Coefficient weekend</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>×{listing.weekendMultiplier}</Typography>
            </Box>
          </Panel>

          <Panel title="Canaux de distribution">
            <Stack spacing={1.5}>
              {listing.channels.map((channel: string) => (
                <Box
                  key={channel}
                  sx={{
                    p: '12px 16px',
                    bgcolor: t.bg2,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                    {channel}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: t.success,
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Panel>

          <Panel title="Actions rapides">
            <Stack spacing={1}>
              <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                📅 Voir calendrier
              </Button>
              <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                💰 Ajuster prix
              </Button>
              <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                📊 Rapport performance
              </Button>
            </Stack>
          </Panel>
        </Stack>
      </Box>
    </DashboardWrapper>
  );
}
