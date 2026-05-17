// ════════════════════════════════════════════════════════════════════
// Sojori — TravelersSection (Section voyageurs d'une réservation)
// Tabs Adultes / Enfants / Infants · Cards avec passeport, nationalité, statut
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Box, Stack, Typography, Tabs, Tab, Avatar, Button, Chip,
  Card, CardContent, CardActions, Divider,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.08)',
  success: '#10b981', successTint: 'rgba(16,185,129,0.10)',
  warning: '#f59e0b', warningTint: 'rgba(245,158,11,0.10)',
  error: '#ef4444',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

type Group = 'adults' | 'children' | 'infants';
type RegStatus = 'complete' | 'draft' | 'not_registered';

export interface Traveler {
  id: string;
  group: Group;
  firstName: string;
  lastName: string;
  nationality: string; // ISO emoji "🇫🇷"
  passport?: string;
  passportPhoto?: string;
  birthDate?: string;
  status: RegStatus;
}

const MOCK_TRAVELERS: Traveler[] = [
  { id: 'a1', group: 'adults', firstName: 'Sarah',  lastName: 'Johnson', nationality: '🇺🇸 USA', passport: 'X12345678', birthDate: '1985-04-12', status: 'complete' },
  { id: 'a2', group: 'adults', firstName: 'Mark',   lastName: 'Davis',   nationality: '🇺🇸 USA', birthDate: '1983-09-22', status: 'draft' },
  { id: 'c1', group: 'children', firstName: 'Emma', lastName: 'Johnson', nationality: '🇺🇸 USA', birthDate: '2015-06-18', status: 'not_registered' },
  { id: 'i1', group: 'infants',  firstName: 'Liam', lastName: 'Johnson', nationality: '🇺🇸 USA', birthDate: '2024-02-04', status: 'complete' },
];

const STATUS_META: Record<RegStatus, { label: string; bg: string; color: string }> = {
  complete:        { label: '✓ Complet',         bg: T.successTint, color: '#047857' },
  draft:           { label: '⚠ Brouillon',       bg: T.warningTint, color: '#b45309' },
  not_registered:  { label: '○ Non enregistré',  bg: 'rgba(0,0,0,0.04)', color: T.text3 },
};

interface Props {
  reservationId?: string;
  travelers?: Traveler[];
  onAdd?: (group: Group) => void;
  onEdit?: (t: Traveler) => void;
  onDelete?: (id: string) => void;
}

export default function TravelersSection({ travelers = MOCK_TRAVELERS, onAdd, onEdit, onDelete }: Props) {
  const [tab, setTab] = useState<Group>('adults');
  const filtered = travelers.filter(t => t.group === tab);
  const counts = {
    adults: travelers.filter(t => t.group === 'adults').length,
    children: travelers.filter(t => t.group === 'children').length,
    infants: travelers.filter(t => t.group === 'infants').length,
  };

  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
      <Box sx={{ px: 2.5, pt: 2, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.2px' }}>
            Voyageurs ({travelers.length})
          </Typography>
          <Button size="small" variant="contained" onClick={() => onAdd?.(tab)}
            sx={{
              textTransform: 'none', fontWeight: 600,
              background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
              color: T.text, boxShadow: `0 4px 12px rgba(230,176,34,0.30)`,
              '&:hover': { background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
            }}
          >+ Ajouter voyageur</Button>
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 40 } }}>
          <Tab value="adults"   label={`👤 Adultes (${counts.adults})`} />
          <Tab value="children" label={`🧒 Enfants (${counts.children})`} />
          <Tab value="infants"  label={`👶 Infants (${counts.infants})`} />
        </Tabs>
      </Box>

      <Box sx={{ p: 2 }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: T.text3 }}>
            <Typography variant="h2" sx={{ mb: 1 }}>👥</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Aucun voyageur dans cette catégorie.</Typography>
            <Button variant="outlined" onClick={() => onAdd?.(tab)} sx={{ textTransform: 'none' }}>+ Ajouter le premier</Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {filtered.map(t => <TravelerCard key={t.id} traveler={t} onEdit={onEdit} onDelete={onDelete} />)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function TravelerCard({ traveler, onEdit, onDelete }: { traveler: Traveler; onEdit?: (t: Traveler) => void; onDelete?: (id: string) => void }) {
  const sm = STATUS_META[traveler.status];
  return (
    <Card variant="outlined" sx={{
      borderColor: T.border, borderRadius: 1.5,
      transition: 'all 0.15s',
      '&:hover': { borderColor: T.primary, boxShadow: '0 4px 12px rgba(26,20,8,0.06)' },
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Avatar sx={{ width: 44, height: 44, bgcolor: T.bg2, color: T.text2, fontSize: 14, fontWeight: 700 }}>
            {traveler.firstName[0]}{traveler.lastName[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>
              {traveler.firstName} {traveler.lastName}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>
              {traveler.nationality} {traveler.birthDate && `· né(e) ${new Date(traveler.birthDate).toLocaleDateString('fr-FR')}`}
            </Typography>
            <Chip size="small" label={sm.label} sx={{ mt: 1, bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
          </Box>
        </Stack>
        {traveler.passport && (
          <Box sx={{ mt: 1.5, p: 1, bgcolor: T.bg2, borderRadius: 1, fontSize: 11.5, color: T.text2 }}>
            <strong style={{ color: T.text }}>Passeport</strong> · {traveler.passport}
            {traveler.passportPhoto && <Chip size="small" label="📷 Photo" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
          </Box>
        )}
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end', px: 1, py: 0.5 }}>
        <Button size="small" onClick={() => onEdit?.(traveler)} sx={{ textTransform: 'none', color: T.text2 }}>Modifier</Button>
        <Button size="small" color="error" onClick={() => onDelete?.(traveler.id)} sx={{ textTransform: 'none' }}>Supprimer</Button>
      </CardActions>
    </Card>
  );
}
