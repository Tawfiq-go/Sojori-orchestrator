// ════════════════════════════════════════════════════════════════════
// Sojori — ReservationModalCompact
// Vue rapide d'une réservation depuis le calendrier (quick view)
// ════════════════════════════════════════════════════════════════════
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Avatar,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const T = {
  primary: '#e6b022',
  primarySoft: '#f4cf5e',
  success: '#10b981',
  successTint: 'rgba(16,185,129,0.10)',
  warning: '#f59e0b',
  warningTint: 'rgba(245,158,11,0.10)',
  error: '#ef4444',
  errorTint: 'rgba(239,68,68,0.10)',
  text: '#1a1408',
  text2: '#4a4234',
  text3: '#8a8170',
  bg1: '#fff',
  bg2: '#f5f3ec',
  border: 'rgba(26,20,8,0.08)',
};

const SOURCE_LOGOS: Record<string, { bg: string; label: string }> = {
  airbnb: { bg: '#FF5A5F', label: 'Airbnb' },
  booking: { bg: '#003580', label: 'Booking' },
  vrbo: { bg: '#0E64A4', label: 'Vrbo' },
  direct: { bg: T.success, label: 'Direct' },
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  success: { bg: T.successTint, color: T.success, icon: '✅' },
  warning: { bg: T.warningTint, color: T.warning, icon: '⚠️' },
  error: { bg: T.errorTint, color: T.error, icon: '❌' },
};

export interface ReservationCompactData {
  id: string;
  reservationNumber: string;
  guestName: string;
  guestInitials: string;
  guestCountry?: string;
  guestPhone?: string;
  guestEmail?: string;
  listing: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  totalPrice: string;
  currency: string;
  status: 'success' | 'warning' | 'error';
  statusLabel: string;
  source: 'airbnb' | 'booking' | 'vrbo' | 'direct';
  otaCode?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: ReservationCompactData | null;
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function ReservationModalCompact({
  open,
  onClose,
  reservation,
  onViewDetails,
  onEdit,
  onCancel,
}: Props) {
  if (!reservation) return null;

  const statusConfig = STATUS_CONFIG[reservation.status];
  const sourceConfig = SOURCE_LOGOS[reservation.source];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(26,20,8,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: T.primary,
          color: T.text,
          fontWeight: 700,
          fontSize: 16,
          py: 1.5,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>📋 {reservation.reservationNumber}</span>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: T.text,
            '&:hover': { bgcolor: T.primarySoft },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Guest Info */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: T.primary,
              color: T.text,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {reservation.guestInitials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
              {reservation.guestName} {reservation.guestCountry}
            </Typography>
            {reservation.guestPhone && (
              <Typography sx={{ fontSize: 12, color: T.text3 }}>
                📞 {reservation.guestPhone}
              </Typography>
            )}
          </Box>
          <Chip
            label={`${statusConfig.icon} ${reservation.statusLabel}`}
            size="small"
            sx={{
              bgcolor: statusConfig.bg,
              color: statusConfig.color,
              fontWeight: 700,
              fontSize: 11,
              border: `1px solid ${statusConfig.color}`,
            }}
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Listing & Dates */}
        <Stack spacing={1.5}>
          <InfoRow label="🏠 Listing" value={`${reservation.listing} · ${reservation.location}`} />
          <InfoRow
            label="📅 Dates"
            value={`${reservation.checkIn} → ${reservation.checkOut}`}
            sub={`${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''}`}
          />
          <InfoRow
            label="👥 Voyageurs"
            value={`${reservation.adults} adulte${reservation.adults > 1 ? 's' : ''}${
              reservation.children > 0 ? `, ${reservation.children} enfant${reservation.children > 1 ? 's' : ''}` : ''
            }${
              reservation.infants > 0 ? `, ${reservation.infants} bébé${reservation.infants > 1 ? 's' : ''}` : ''
            }`}
          />
          <InfoRow
            label="💰 Prix"
            value={reservation.totalPrice}
            valueColor={T.success}
            valueBold
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Source */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: sourceConfig.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {sourceConfig.label[0]}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {sourceConfig.label}
            </Typography>
            {reservation.otaCode && (
              <Typography
                sx={{
                  fontSize: 11,
                  color: T.text3,
                  fontFamily: 'Geist Mono',
                }}
              >
                {reservation.otaCode}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 2,
          borderTop: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: T.text3,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Fermer
        </Button>
        <Box sx={{ flex: 1 }} />
        {onCancel && (
          <Button
            onClick={() => {
              onCancel(reservation.id);
              onClose();
            }}
            sx={{
              textTransform: 'none',
              color: T.error,
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { bgcolor: T.errorTint },
            }}
          >
            ❌ Annuler
          </Button>
        )}
        {onEdit && (
          <Button
            onClick={() => {
              onEdit(reservation.id);
              onClose();
            }}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderColor: T.border,
              color: T.text,
              fontWeight: 600,
              fontSize: 13,
              '&:hover': {
                borderColor: T.primary,
                bgcolor: T.bg2,
              },
            }}
          >
            ✏️ Modifier
          </Button>
        )}
        {onViewDetails && (
          <Button
            onClick={() => {
              onViewDetails(reservation.id);
              onClose();
            }}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: T.primary,
              color: T.text,
              fontWeight: 700,
              fontSize: 13,
              px: 2.5,
              '&:hover': { bgcolor: T.primarySoft },
            }}
          >
            👁️ Voir détails
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Helper component for info rows
function InfoRow({
  label,
  value,
  sub,
  valueColor,
  valueBold,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  valueBold?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: 13, color: T.text3 }}>{label}</Typography>
      <Box sx={{ textAlign: 'right' }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: valueBold ? 700 : 600,
            color: valueColor || T.text,
          }}
        >
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: 11, color: T.text3 }}>{sub}</Typography>
        )}
      </Box>
    </Stack>
  );
}
