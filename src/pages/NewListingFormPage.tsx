import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Stack, TextField, Button, MenuItem, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, Panel, btnPrimarySx, btnGhostSx, tokens as t } from '../components/dashboard/DashboardV2.components';

// ─── Mock Data ─────────────────────────────────────────
const LISTING_DATA: Record<string, any> = {
  'villa-belvedere': {
    id: 'villa-belvedere',
    name: 'Villa Belvédère · Nice — Vue mer',
    type: 'Villa',
    status: 'active',
    completion: 72,
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    surface: 240,
    beds: 5,
    shortDescription: 'Villa vue mer avec piscine privée',
    longDescription: `Magnifique villa avec vue panoramique sur la mer Méditerranée.

Située dans un quartier résidentiel calme de Nice, cette propriété offre un cadre exceptionnel pour vos vacances. La villa dispose d'une piscine privée, d'une terrasse avec vue mer, et d'un jardin paysager.

Idéal pour les familles ou groupes d'amis recherchant le luxe et la tranquillité.`,
    amenities: ['Piscine privée', 'Climatisation', 'WiFi fibre', 'Parking', 'Vue mer', 'Jardin', 'BBQ', 'Terrasse'],
    images: 14,
    channels: [
      { name: 'Airbnb', status: 'synced', lastSync: '2h ago' },
      { name: 'Booking.com', status: 'synced', lastSync: '1h ago' },
      { name: 'Vrbo', status: 'pending', lastSync: '2d ago' },
    ],
    pricing: {
      base: 280,
      cleaning: 150,
      weekend: 364,
      minStay: 3,
    },
  },
  'dar-sojori': {
    id: 'dar-sojori',
    name: 'Dar Sojori · Marrakech — Médina',
    type: 'Riad',
    status: 'active',
    completion: 85,
    bedrooms: 5,
    bathrooms: 4,
    guests: 10,
    surface: 320,
    beds: 6,
    shortDescription: 'Riad traditionnel au cœur de la Médina',
    longDescription: `Riad authentique situé dans le quartier historique de la Médina de Marrakech.

Cette demeure traditionnelle a été entièrement restaurée avec des matériaux nobles et offre un havre de paix avec son patio central et sa terrasse sur le toit avec vue sur les montagnes de l'Atlas.

Architecture traditionnelle marocaine avec tout le confort moderne.`,
    amenities: ['Piscine', 'Climatisation', 'WiFi', 'Hammam', 'Terrasse', 'Vue Atlas', 'Staff', 'Parking'],
    images: 24,
    channels: [
      { name: 'Airbnb', status: 'synced', lastSync: '30min ago' },
      { name: 'Booking.com', status: 'synced', lastSync: '1h ago' },
    ],
    pricing: {
      base: 350,
      cleaning: 200,
      weekend: 455,
      minStay: 2,
    },
  },
  'villa-atlas': {
    id: 'villa-atlas',
    name: 'Villa Atlas · Marrakech — Palmeraie',
    type: 'Villa',
    status: 'active',
    completion: 68,
    bedrooms: 6,
    bathrooms: 5,
    guests: 12,
    surface: 450,
    beds: 8,
    shortDescription: 'Villa de luxe dans la Palmeraie',
    longDescription: `Villa d'exception située dans la prestigieuse Palmeraie de Marrakech.

Cette propriété moderne offre des prestations haut de gamme avec piscine chauffée, spa, salle de sport et terrain de tennis. Le design contemporain se marie parfaitement avec l'environnement naturel.

Parfait pour événements privés et séjours de luxe.`,
    amenities: ['Piscine chauffée', 'Climatisation', 'WiFi fibre', 'Spa', 'Salle sport', 'Tennis', 'Chef', 'Chauffeur'],
    images: 32,
    channels: [
      { name: 'Airbnb', status: 'synced', lastSync: '1h ago' },
      { name: 'Booking.com', status: 'disconnected', lastSync: '5d ago' },
      { name: 'Vrbo', status: 'synced', lastSync: '2h ago' },
    ],
    pricing: {
      base: 580,
      cleaning: 300,
      weekend: 754,
      minStay: 5,
    },
  },
};

// ─── Tabs Rail Component ─────────────────────────────────
interface Tab {
  key: string;
  icon: string;
  label: string;
  completion: number;
  group: string;
}

const TABS: Tab[] = [
  { key: 'basic', icon: '🏠', label: 'Informations de base', completion: 100, group: 'PROPRIÉTÉ' },
  { key: 'address', icon: '📍', label: 'Adresse', completion: 100, group: 'PROPRIÉTÉ' },
  { key: 'media', icon: '📸', label: 'Médias', completion: 88, group: 'PROPRIÉTÉ' },
  { key: 'equipment', icon: '✨', label: 'Équipements', completion: 62, group: 'PROPRIÉTÉ' },
  { key: 'pricing', icon: '💰', label: 'Tarification', completion: 45, group: 'PROPRIÉTÉ' },
  { key: 'extras', icon: 'ℹ️', label: 'Infos supplémentaires', completion: 100, group: 'PROPRIÉTÉ' },
  { key: 'channels', icon: '🔗', label: 'Channel Manager', completion: 100, group: 'DISTRIBUTION' },
  { key: 'licenses', icon: '📄', label: 'Licences', completion: 0, group: 'DISTRIBUTION' },
  { key: 'automsg', icon: '💬', label: 'Messages auto', completion: 100, group: 'GUEST EXPERIENCE' },
  { key: 'whatsapp', icon: '📱', label: 'Menu WhatsApp', completion: 75, group: 'GUEST EXPERIENCE' },
  { key: 'concierge', icon: '🛎️', label: 'Conciergerie', completion: 100, group: 'GUEST EXPERIENCE' },
  { key: 'services', icon: '🎯', label: 'Services', completion: 0, group: 'GUEST EXPERIENCE' },
  { key: 'support', icon: '🆘', label: 'Support', completion: 0, group: 'GUEST EXPERIENCE' },
  { key: 'cleaning', icon: '🧹', label: 'Ménage', completion: 100, group: 'OPÉRATIONS' },
  { key: 'autotasks', icon: '✅', label: 'Tâches auto', completion: 100, group: 'OPÉRATIONS' },
  { key: 'roomtypes', icon: '🛏️', label: 'Types de chambres', completion: 0, group: 'OPÉRATIONS' },
  { key: 'deposit', icon: '💵', label: 'Caution', completion: 0, group: 'OPÉRATIONS' },
  { key: 'rules', icon: '📜', label: 'Règles & sécurité', completion: 100, group: 'RÈGLES & SÉCURITÉ' },
  { key: 'houserules', icon: '🎛️', label: 'Règles & informations', completion: 100, group: 'RÈGLES & SÉCURITÉ' },
  { key: 'access', icon: '🔐', label: 'Configuration accès', completion: 100, group: 'ACCÈS & IOT' },
  { key: 'wifi', icon: '🌐', label: 'WiFi', completion: 100, group: 'ACCÈS & IOT' },
  { key: 'iot', icon: '🔌', label: 'Appareils IoT', completion: 0, group: 'ACCÈS & IOT' },
];

function TabsRail({ activeTab, onChange, completion }: { activeTab: string; onChange: (key: string) => void; completion: number }) {
  let currentGroup = '';

  return (
    <Box sx={{
      width: 264,
      bgcolor: t.bg1,
      borderRight: `1px solid ${t.border}`,
      overflow: 'auto',
      p: 2,
    }}>
      {/* Search */}
      <TextField
        placeholder="Rechercher un onglet..."
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      {/* Tabs grouped */}
      {TABS.map((tab) => {
        const showGroupHeader = tab.group !== currentGroup;
        currentGroup = tab.group;

        return (
          <Box key={tab.key}>
            {showGroupHeader && (
              <Typography sx={{
                fontSize: 10,
                fontWeight: 700,
                color: t.text3,
                letterSpacing: 1,
                textTransform: 'uppercase',
                mt: 2,
                mb: 1,
                px: 1.5,
              }}>
                {tab.group}
              </Typography>
            )}
            <Box
              onClick={() => onChange(tab.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: activeTab === tab.key ? t.primaryTint : 'transparent',
                borderLeft: activeTab === tab.key ? `3px solid ${t.primary}` : '3px solid transparent',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: activeTab === tab.key ? t.primaryTint : t.bg2,
                },
              }}
            >
              <Box sx={{ fontSize: 16 }}>{tab.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400 }}>
                  {tab.label}
                </Box>
              </Box>
              <Box sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: tab.completion === 100 ? t.success : tab.completion > 0 ? t.warning : t.text4,
              }} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Aside Component ─────────────────────────────────────
function ListingAside({ completion }: { completion: number }) {
  return (
    <Box sx={{
      width: 320,
      bgcolor: t.bg1,
      borderLeft: `1px solid ${t.border}`,
      p: 2,
      overflow: 'auto',
    }}>
      {/* AI Assistant */}
      <Panel sx={{ mb: 2, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ fontSize: 20 }}>✨</Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Sojori AI</Typography>
            <Box sx={{ fontSize: 10, color: t.ai, fontFamily: 'Geist Mono', bgcolor: t.aiTint, px: 1, py: 0.25, borderRadius: '4px' }}>
              GPT-4
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 12, color: t.text3 }}>
            Je viens de scanner votre listing Airbnb et 14 photos. <strong>8 champs ont été pré-remplis</strong>. Les champs en violet attendent votre validation.
          </Typography>
          <Button sx={{ ...btnGhostSx, fontSize: 12, justifyContent: 'flex-start' }}>
            Oui, et en italien aussi.
          </Button>
          <Typography sx={{ fontSize: 11, color: t.text3, fontStyle: 'italic' }}>
            Parfait, je m'en occupe. <strong>-25s</strong>. Je vous notifierai dans l'onglet Description.
          </Typography>
          <TextField
            placeholder="Demandez à l'IA..."
            size="small"
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </Panel>

      {/* Completion breakdown */}
      <Panel sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Complétion par onglet</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.primary }}>{completion}%</Typography>
          </Stack>
          {TABS.slice(0, 6).map(tab => (
            <Stack key={tab.key} direction="row" alignItems="center" spacing={1}>
              <Box sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: tab.completion === 100 ? t.success : tab.completion > 0 ? t.warning : t.text4,
              }} />
              <Typography sx={{ fontSize: 11, flex: 1, color: t.text2 }}>{tab.label}</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono', color: t.text3 }}>
                {tab.completion}%
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Panel>

      {/* VUE DÉMO */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: t.bg2, borderRadius: '8px' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text3, mb: 1 }}>VUE DÉMO</Typography>
        <Stack direction="row" spacing={1}>
          <Button sx={{ ...btnGhostSx, fontSize: 11, py: 0.5, bgcolor: t.primary, color: '#fff' }}>Basic</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 11, py: 0.5 }}>Media</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 11, py: 0.5 }}>Channels</Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ─── Media Tab Content ─────────────────────────────────────
function MediaTab({ listing }: { listing: any }) {
  return (
    <Box>
      <Panel sx={{ mb: 2, bgcolor: t.aiTint, borderLeft: `3px solid ${t.ai}`, p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ fontSize: 24 }}>✨</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ai }}>
              {listing.images} photos importées depuis Airbnb
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              L'IA a trié par pièce et généré des légendes. Vous pouvez réordonner par drag & drop.
            </Typography>
          </Box>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>+ Ajouter photos</Button>
        </Stack>
      </Panel>

      <Panel sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Photos principales · {listing.images} photos
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {Array.from({ length: Math.min(listing.images, 12) }).map((_, i) => (
            <Box key={i} sx={{
              aspectRatio: '4/3',
              bgcolor: i === 0 ? t.primaryTint : t.bg2,
              borderRadius: '8px',
              border: `2px solid ${i === 0 ? t.primary : t.border}`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': {
                borderColor: t.primary,
                transform: 'scale(1.02)',
              },
            }}>
              {i === 0 && (
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  bgcolor: t.primary,
                  color: '#fff',
                  px: 1,
                  py: 0.5,
                  borderRadius: '4px',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  COVER
                </Box>
              )}
              <Typography sx={{ fontSize: 32, opacity: 0.3 }}>📷</Typography>
              <Typography sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                fontSize: 11,
                color: t.text3,
                bgcolor: 'rgba(255,255,255,0.9)',
                p: 0.5,
                borderRadius: '4px',
              }}>
                Photo #{i + 1}
              </Typography>
            </Box>
          ))}
        </Box>
      </Panel>
    </Box>
  );
}

// ─── Equipment Tab Content ─────────────────────────────────────
function EquipmentTab({ listing }: { listing: any }) {
  return (
    <Box>
      <Panel sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Équipements & Services
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {listing.amenities.map((amenity: string, i: number) => (
            <Box key={i} sx={{
              p: 2,
              bgcolor: t.bg2,
              borderRadius: '8px',
              border: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}>
              <Box sx={{
                width: 40,
                height: 40,
                bgcolor: t.successTint,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                ✓
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{amenity}</Typography>
            </Box>
          ))}
        </Box>

        <Button sx={{ ...btnGhostSx, mt: 3 }}>+ Ajouter équipement</Button>
      </Panel>
    </Box>
  );
}

// ─── Pricing Tab Content ─────────────────────────────────────
function PricingTab({ listing }: { listing: any }) {
  return (
    <Box>
      <Panel sx={{ mb: 2, p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Tarification de base
        </Typography>

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Prix de base (nuit) <span style={{ color: t.error }}>*</span>
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.pricing.base}
                size="small"
                type="number"
                InputProps={{ startAdornment: '€' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Frais de ménage
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.pricing.cleaning}
                size="small"
                type="number"
                InputProps={{ startAdornment: '€' }}
              />
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Multiplicateur week-end
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.pricing.weekend / listing.pricing.base}
                size="small"
                type="number"
                InputProps={{ endAdornment: 'x' }}
              />
              <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.5 }}>
                Prix WE: €{listing.pricing.weekend}/nuit
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Séjour minimum
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.pricing.minStay}
                size="small"
                type="number"
                InputProps={{ endAdornment: 'nuits' }}
              />
            </Box>
          </Stack>
        </Stack>
      </Panel>

      <Panel sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Tarification saisonnière
        </Typography>
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          Aucune règle de tarification saisonnière définie
        </Typography>
        <Button sx={{ ...btnPrimarySx, mt: 2 }}>+ Ajouter saison</Button>
      </Panel>
    </Box>
  );
}

// ─── Channels Tab Content ─────────────────────────────────────
function ChannelsTab({ listing }: { listing: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return t.success;
      case 'pending': return t.warning;
      case 'disconnected': return t.error;
      default: return t.text3;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'synced': return t.successTint;
      case 'pending': return t.warningTint;
      case 'disconnected': return t.errorTint;
      default: return t.bg2;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'synced': return 'Synchronisé';
      case 'pending': return 'En attente';
      case 'disconnected': return 'Déconnecté';
      default: return 'Inconnu';
    }
  };

  return (
    <Box>
      <Panel sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Canaux de distribution (OTAs)
        </Typography>

        <Stack spacing={2}>
          {listing.channels.map((channel: any, i: number) => (
            <Box key={i} sx={{
              p: 2,
              bgcolor: t.bg2,
              borderRadius: '8px',
              border: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  bgcolor: t.bg1,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  border: `1px solid ${t.border}`,
                }}>
                  🏨
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{channel.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    Dernière sync: {channel.lastSync}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: '6px',
                  bgcolor: getStatusBg(channel.status),
                  color: getStatusColor(channel.status),
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {getStatusLabel(channel.status)}
                </Box>
                <Button sx={btnGhostSx}>⚙️ Config</Button>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Button sx={{ ...btnPrimarySx, mt: 3 }}>+ Connecter canal</Button>
      </Panel>
    </Box>
  );
}

// ─── Basic Info Tab Content ─────────────────────────────────
function BasicInfoTab({ listing }: { listing: any }) {
  return (
    <Box>
      {/* AI Banner */}
      <Panel sx={{ mb: 2, bgcolor: t.aiTint, borderLeft: `3px solid ${t.ai}`, p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ fontSize: 24 }}>✨</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ai }}>
              Importation depuis Airbnb détectée.
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              L'agent IA a peuplé 8 champs sur 12. Les champs en violet attendent votre validation.
            </Typography>
          </Box>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>Re-scanner</Button>
          <Button sx={{ ...btnPrimarySx, fontSize: 12 }}>Valider tout</Button>
        </Stack>
      </Panel>

      {/* Identification Section */}
      <Panel sx={{ mb: 2, p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Identification <span style={{ color: t.error }}>REQUIRED</span>
        </Typography>

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Nom de la propriété <span style={{ color: t.error }}>*</span>
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.name}
                size="small"
                helperText="3-50 caractères. Inclure ville et caractéristique distinctive."
              />
            </Box>
            <Box sx={{ width: 200 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Type de propriété <span style={{ color: t.error }}>*</span>
                <Box component="span" sx={{ ml: 1, fontSize: 16 }}>✨</Box>
              </Typography>
              <TextField
                select
                fullWidth
                defaultValue={listing.type}
                size="small"
                helperText="Détecté depuis les photos et l'adresse."
              >
                <MenuItem value="Villa">Villa</MenuItem>
                <MenuItem value="Riad">Riad</MenuItem>
                <MenuItem value="Apartment">Appartement</MenuItem>
              </TextField>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Chambres <span style={{ color: t.error }}>*</span>
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button sx={{ minWidth: 36, p: '6px' }}>−</Button>
                <TextField
                  value={listing.bedrooms}
                  size="small"
                  sx={{ width: 80, textAlign: 'center' }}
                />
                <Button sx={{ minWidth: 36, p: '6px' }}>+</Button>
              </Stack>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Salles de bain <span style={{ color: t.error }}>*</span>
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button sx={{ minWidth: 36, p: '6px' }}>−</Button>
                <TextField
                  value={listing.bathrooms}
                  size="small"
                  sx={{ width: 80, textAlign: 'center' }}
                />
                <Button sx={{ minWidth: 36, p: '6px' }}>+</Button>
              </Stack>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Capacité (guests) <span style={{ color: t.error }}>*</span>
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button sx={{ minWidth: 36, p: '6px' }}>−</Button>
                <TextField
                  value={listing.guests}
                  size="small"
                  sx={{ width: 80, textAlign: 'center' }}
                />
                <Button sx={{ minWidth: 36, p: '6px' }}>+</Button>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Surface (m²)
                <Box component="span" sx={{ ml: 1, fontSize: 16 }}>✨</Box>
              </Typography>
              <TextField
                fullWidth
                defaultValue={listing.surface}
                size="small"
                type="number"
                InputProps={{ endAdornment: 'm²' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>Lits</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button sx={{ minWidth: 36, p: '6px' }}>−</Button>
                <TextField
                  value={listing.beds}
                  size="small"
                  sx={{ width: 80, textAlign: 'center' }}
                />
                <Button sx={{ minWidth: 36, p: '6px' }}>+</Button>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Panel>

      {/* Description Section */}
      <Panel sx={{ mb: 2, p: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
          Description multilingue <span style={{ color: t.error }}>REQUIRED</span>
        </Typography>

        <Typography sx={{ fontSize: 11, color: t.text3, mb: 1.5 }}>
          Auto-traduit en EN/ES/IT après publication.
        </Typography>

        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
              Description courte (140 c. max)
            </Typography>
            <TextField
              fullWidth
              defaultValue={listing.shortDescription}
              size="small"
              multiline
              rows={2}
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
              Description longue
              <Box component="span" sx={{ ml: 1, fontSize: 16 }}>✨</Box>
            </Typography>
            <TextField
              fullWidth
              defaultValue={listing.longDescription}
              multiline
              rows={6}
              size="small"
            />
          </Box>
        </Stack>
      </Panel>

      {/* Save Bar */}
      <Box sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: t.bg1,
        borderTop: `1px solid ${t.border}`,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: t.success,
          }} />
          <Typography sx={{ fontSize: 12, fontFamily: 'Geist Mono', color: t.text3 }}>
            Auto-saved · 2s ago
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button sx={btnGhostSx}>Annuler</Button>
          <Button sx={{ ...btnPrimarySx }}>Sauvegarder & continuer →</Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ─── Main Component ─────────────────────────────────────
export function NewListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const listing = id ? LISTING_DATA[id] : null;
  const [activeTab, setActiveTab] = useState('basic');

  if (!listing) {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5">Listing non trouvé</Typography>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', listing.name]}>
      <Box sx={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', ml: -3, mr: -3, mt: -3 }}>
        {/* Tabs Rail */}
        <TabsRail activeTab={activeTab} onChange={setActiveTab} completion={listing.completion} />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          p: 2,
          bgcolor: t.bg1,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Listings
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>›</Typography>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: t.primaryTint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: t.primary,
            }}>
              V
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{listing.name}</Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>›</Typography>
            <Typography sx={{ fontSize: 13 }}>Informations de base</Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: `3px solid ${t.primary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: t.primary,
              }}>
                {listing.completion}%
              </Box>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>COMPLÉTION</Typography>
            </Stack>

            <Button sx={btnGhostSx}>Preview</Button>
            <Button sx={{ ...btnGhostSx, color: t.ai }}>+ AI assist</Button>
            <Button sx={btnPrimarySx}>Publish →</Button>
          </Stack>
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {activeTab === 'basic' && <BasicInfoTab listing={listing} />}
          {activeTab === 'media' && <MediaTab listing={listing} />}
          {activeTab === 'equipment' && <EquipmentTab listing={listing} />}
          {activeTab === 'pricing' && <PricingTab listing={listing} />}
          {activeTab === 'channels' && <ChannelsTab listing={listing} />}

          {/* Placeholder for other tabs */}
          {!['basic', 'media', 'equipment', 'pricing', 'channels'].includes(activeTab) && (
            <Panel sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1 }}>
                Onglet "{TABS.find(t => t.key === activeTab)?.label}"
              </Typography>
              <Typography sx={{ fontSize: 13, color: t.text3 }}>
                Contenu de cet onglet à implémenter
              </Typography>
            </Panel>
          )}
        </Box>
      </Box>

      {/* Aside */}
      <ListingAside completion={listing.completion} />
    </Box>
    </DashboardWrapper>
  );
}
