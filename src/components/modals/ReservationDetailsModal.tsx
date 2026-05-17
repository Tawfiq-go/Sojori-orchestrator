// ════════════════════════════════════════════════════════════════════
// Sojori — ReservationDetailsModal 🟡 UTILE
// Détail complet avec 5 tabs : Infos · Voyageurs · Finances · Communication · Historique
// Réutilise TravelersSection et FinancialSection
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, Button, IconButton, Tabs, Tab, Chip,
  List, ListItem, ListItemText, Avatar,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export interface ReservationDetails {
  id: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'in-progress';
  channel: 'airbnb' | 'booking' | 'direct' | 'vrbo';
  guestName: string;
  guestEmail?: string; guestPhone?: string;
  checkIn: string; checkOut: string; nights: number;
  travelers: number;
  property: { id: string; name: string; address: string };
  totalAmount: number; paidAmount: number;
  notes?: string;
  createdAt: string;
}

export interface ReservationDetailsModalProps {
  open: boolean; onClose: () => void;
  reservation: ReservationDetails;
  onEdit?: () => void;
  onCancel?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onMessage?: () => void;
  /** Slots optional — injecte tes propres composants TravelersSection / FinancialSection */
  travelersSlot?: React.ReactNode;
  financialSlot?: React.ReactNode;
}

const STATUS_META = {
  confirmed:    { label: 'Confirmée',    color: T.success },
  pending:      { label: 'En attente',   color: T.warning },
  cancelled:    { label: 'Annulée',      color: T.error },
  completed:    { label: 'Terminée',     color: T.info },
  'in-progress':{ label: 'En cours',     color: T.primary },
} as const;

const CHANNEL_META = {
  airbnb:  { label: 'Airbnb',  color: '#FF5A5F', icon: 'A' },
  booking: { label: 'Booking', color: '#003580', icon: 'B' },
  vrbo:    { label: 'Vrbo',    color: '#0E64A4', icon: 'V' },
  direct:  { label: 'Direct',  color: T.success,  icon: 'D' },
} as const;

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  open, onClose, reservation, onEdit, onCancel, onCheckIn, onCheckOut, onMessage,
  travelersSlot, financialSlot,
}) => {
  const [tab, setTab] = useState(0);
  const statusMeta = STATUS_META[reservation.status];
  const channelMeta = CHANNEL_META[reservation.channel];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: T.bg1, minHeight: 600 } } }}>
      <DialogTitle sx={{ pb: 0, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" sx={{ pb: 1.5, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20, color: T.text }}>
                Réservation {reservation.id}
              </Typography>
              <Chip size="small" label={statusMeta.label}
                sx={{ bgcolor: `${statusMeta.color}22`, color: statusMeta.color, fontWeight: 700, fontSize: 11 }} />
              <Chip size="small" label={`${channelMeta.icon} ${channelMeta.label}`}
                sx={{ bgcolor: channelMeta.color, color: '#fff', fontWeight: 700, fontSize: 11 }} />
            </Stack>
            <Typography sx={{ fontSize: 13, color: T.text3 }}>
              {reservation.guestName} · {reservation.travelers} voyageur(s) · {reservation.nights} nuits
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {onMessage && <Button size="small" variant="outlined" onClick={onMessage}
              sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>💬 Message</Button>}
            {onEdit && <Button size="small" variant="outlined" onClick={onEdit}
              sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>✏️ Modifier</Button>}
            {onCheckIn && reservation.status === 'confirmed' && (
              <Button size="small" variant="contained" onClick={onCheckIn}
                sx={{ textTransform: 'none', bgcolor: T.success, '&:hover': { bgcolor: '#0c8d63' } }}>🛬 Check-in</Button>
            )}
            {onCheckOut && reservation.status === 'in-progress' && (
              <Button size="small" variant="contained" onClick={onCheckOut}
                sx={{ textTransform: 'none', bgcolor: T.info, '&:hover': { bgcolor: '#0099b3' } }}>🛫 Check-out</Button>
            )}
            {onCancel && reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
              <Button size="small" variant="outlined" onClick={onCancel}
                sx={{ textTransform: 'none', borderColor: T.error, color: T.error }}>✕ Annuler</Button>
            )}
            <IconButton size="small" onClick={onClose}>✕</IconButton>
          </Stack>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable"
          sx={{ minHeight: 40, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 40 } }}>
          <Tab label="ℹ️ Infos" />
          <Tab label={`👥 Voyageurs (${reservation.travelers})`} />
          <Tab label="💰 Finances" />
          <Tab label="💬 Communication" />
          <Tab label="📜 Historique" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {tab === 0 && <InfosTab r={reservation} />}
        {tab === 1 && (travelersSlot || <PlaceholderTab title="Voyageurs" hint="Injecte <TravelersSection /> via la prop `travelersSlot`." />)}
        {tab === 2 && (financialSlot || <PlaceholderTab title="Finances" hint="Injecte <FinancialSection /> via la prop `financialSlot`." />)}
        {tab === 3 && <CommunicationTab />}
        {tab === 4 && <HistoryTab r={reservation} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${T.border}` }}>
        <Typography sx={{ flex: 1, fontSize: 11, color: T.text3, fontFamily: 'Geist Mono' }}>
          Créée le {new Date(reservation.createdAt).toLocaleString('fr-FR')}
        </Typography>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2 }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

const InfosTab: React.FC<{ r: ReservationDetails }> = ({ r }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
    <Section title="Voyageur">
      <Row label="Nom"      value={r.guestName} />
      {r.guestEmail && <Row label="Email"    value={r.guestEmail} />}
      {r.guestPhone && <Row label="Téléphone" value={r.guestPhone} />}
    </Section>
    <Section title="Séjour">
      <Row label="Arrivée" value={new Date(r.checkIn).toLocaleDateString('fr-FR')} />
      <Row label="Départ"  value={new Date(r.checkOut).toLocaleDateString('fr-FR')} />
      <Row label="Durée"   value={`${r.nights} nuits`} />
      <Row label="Voyageurs" value={String(r.travelers)} />
    </Section>
    <Section title="Logement">
      <Row label="Nom"     value={r.property.name} />
      <Row label="Adresse" value={r.property.address} />
    </Section>
    <Section title="Tarification">
      <Row label="Total"  value={`${r.totalAmount.toLocaleString('fr-FR')} €`} emphasize />
      <Row label="Payé"   value={`${r.paidAmount.toLocaleString('fr-FR')} €`} />
      <Row label="Restant à payer" value={`${(r.totalAmount - r.paidAmount).toLocaleString('fr-FR')} €`}
        emphasize={r.paidAmount < r.totalAmount} />
    </Section>
    {r.notes && (
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <Section title="Notes internes">
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.notes}</Typography>
        </Section>
      </Box>
    )}
  </Box>
);

const CommunicationTab: React.FC = () => (
  <Box>
    <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Derniers messages</Typography>
    <List dense sx={{ bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
      {[
        { from: 'guest', t: 'Hier 18:42', msg: 'Bonjour, est-il possible d\'arriver à 14h plutôt que 16h ?', channel: 'WhatsApp' },
        { from: 'host',  t: 'Hier 19:01', msg: 'Bonjour ! Oui sans problème, à demain 14h 👋', channel: 'WhatsApp' },
        { from: 'guest', t: 'Aujourd\'hui 09:12', msg: 'Parfait merci !', channel: 'WhatsApp' },
      ].map((m, i) => (
        <ListItem key={i} sx={{ borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
          <Avatar sx={{ bgcolor: m.from === 'guest' ? T.info : T.primary, width: 32, height: 32, fontSize: 13, mr: 1.5 }}>
            {m.from === 'guest' ? 'G' : 'H'}
          </Avatar>
          <ListItemText
            primary={<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{m.msg}</Typography>}
            secondary={<Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25 }}>{m.t} · {m.channel}</Typography>} />
        </ListItem>
      ))}
    </List>
  </Box>
);

const HistoryTab: React.FC<{ r: ReservationDetails }> = ({ r }) => (
  <Stack spacing={1}>
    {[
      { t: 'Aujourd\'hui 14:23', label: '💰 Paiement reçu', desc: '500 €' },
      { t: 'Hier 18:42',         label: '💬 Message reçu', desc: 'WhatsApp' },
      { t: 'Il y a 3 jours',     label: '🛬 Check-in prévu modifié', desc: '14h au lieu de 16h' },
      { t: 'Il y a 7 jours',     label: '✅ Réservation confirmée', desc: 'Channel Airbnb' },
      { t: new Date(r.createdAt).toLocaleString('fr-FR'), label: '➕ Réservation créée', desc: 'Source: Airbnb' },
    ].map((e, i) => (
      <Box key={i} sx={{ p: 1.5, borderLeft: `3px solid ${T.primary}`, bgcolor: T.bg2, borderRadius: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.label}</Typography>
          <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: 'Geist Mono' }}>{e.t}</Typography>
        </Stack>
        <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>{e.desc}</Typography>
      </Box>
    ))}
  </Stack>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box>
    <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Typography>
    <Box sx={{ p: 2, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
      <Stack spacing={0.75}>{children}</Stack>
    </Box>
  </Box>
);

const Row: React.FC<{ label: string; value: string; emphasize?: boolean }> = ({ label, value, emphasize }) => (
  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography sx={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, color: emphasize ? T.primary : T.text, fontWeight: emphasize ? 800 : 600, fontFamily: emphasize ? 'Geist Mono' : 'inherit' }}>{value}</Typography>
  </Stack>
);

const PlaceholderTab: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
  <Box sx={{ textAlign: 'center', py: 6 }}>
    <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.text2, mb: 1 }}>Slot {title}</Typography>
    <Typography sx={{ fontSize: 12, color: T.text3 }}>{hint}</Typography>
  </Box>
);

export default ReservationDetailsModal;
