// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations List Page
// Vue liste des réservations (Check-in / Check-out)
// ════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import reservationsService from '../services/reservationsService';
import type {
  ReservationListItem,
  ReservationFilter,
  ReservationCounts,
} from '../types/reservations.types';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader } from '../components/dashboard/DashboardV2.components';

// ═══════════════════ AURORA SOFT LIGHT TOKENS ═══════════════════
const t = {
  primary: '#e6b022',
  primaryLight: '#f4d483',
  primaryDark: '#c79815',
  bg1: '#ffffff',
  bg2: '#fafbfc',
  bg3: '#f5f5f5',
  text1: '#1a1a1a',
  text2: '#4a4a4a',
  text3: '#7a7a7a',
  border: '#e0e0e0',
  purple: '#8b5cf6',
  purpleLight: '#c4b5fd',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// ═══════════════════ FILTER CONFIGS ═══════════════════
const FILTER_CONFIGS: {
  key: ReservationFilter;
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
}[] = [
  { key: 'CHECKIN_TODAY', label: "Check-in aujourd'hui", color: 'success' },
  { key: 'CHECKIN_TOMORROW', label: 'Check-in demain', color: 'info' },
  { key: 'CHECKIN_7DAYS', label: 'Check-in 7 jours', color: 'primary' },
  { key: 'CHECKOUT_TODAY', label: "Check-out aujourd'hui", color: 'warning' },
  { key: 'CHECKOUT_TOMORROW', label: 'Check-out demain', color: 'secondary' },
  { key: 'CHECKOUT_7DAYS', label: 'Check-out 7 jours', color: 'primary' },
];

// ═══════════════════ STATUS COLORS ═══════════════════
function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'confirmed') {
    return { bg: t.success + '22', color: t.success, label: 'Confirmé' };
  }
  if (normalized === 'pending') {
    return { bg: t.warning + '22', color: t.warning, label: 'En attente' };
  }
  if (
    normalized.includes('cancelled') ||
    normalized.includes('canceled')
  ) {
    return { bg: t.error + '22', color: t.error, label: 'Annulé' };
  }
  if (normalized === 'completed') {
    return { bg: t.info + '22', color: t.info, label: 'Terminé' };
  }
  return { bg: t.text3 + '22', color: t.text3, label: status };
}

// ═══════════════════ COMPONENT ═══════════════════
export default function ReservationsListPage() {
  // ─────────────── STATE ───────────────
  const [selectedFilter, setSelectedFilter] = useState<ReservationFilter>('CHECKIN_TODAY');
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [counts, setCounts] = useState<ReservationCounts | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────── FETCH COUNTS ───────────────
  const fetchCounts = async () => {
    setIsLoadingCounts(true);
    setError(null);

    try {
      const response = await reservationsService.getCounts();
      setCounts(response);
    } catch (err: any) {
      console.error('Error fetching counts:', err);
      setError(err.message || 'Erreur lors du chargement des counts');
      toast.error('Erreur lors du chargement des counts');
    } finally {
      setIsLoadingCounts(false);
    }
  };

  // ─────────────── FETCH LIST ───────────────
  const fetchReservations = async (filter: ReservationFilter) => {
    setIsLoadingList(true);
    setError(null);

    try {
      const response = await reservationsService.getList({ filter, limit: 100 });
      setReservations(response.data as unknown as ReservationListItem[]);
      toast.success(`${response.count} réservation(s) chargée(s)`);
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      setError(err.message || 'Erreur lors du chargement des réservations');
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setIsLoadingList(false);
    }
  };

  // ─────────────── EFFECTS ───────────────
  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchReservations(selectedFilter);
  }, [selectedFilter]);

  // ─────────────── HANDLERS ───────────────
  const handleFilterChange = (filter: ReservationFilter) => {
    setSelectedFilter(filter);
  };

  const handleViewDetails = (reservation: ReservationListItem) => {
    // TODO: Ouvrir modal ou naviguer vers détails
    console.log('View details:', reservation);
    toast.info(`Détails: ${reservation.guest_name}`);
  };

  const handleCallGuest = (reservation: ReservationListItem) => {
    // TODO: Intégrer appel téléphonique
    console.log('Call guest:', reservation);
    toast.info('Fonction appel en cours de développement');
  };

  const handleEmailGuest = (reservation: ReservationListItem) => {
    // TODO: Ouvrir modal email
    console.log('Email guest:', reservation);
    toast.info('Fonction email en cours de développement');
  };

  // ─────────────── FORMAT HELPERS ───────────────
  const formatDate = (dateStr: Date | string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  };

  // ─────────────── RENDER ───────────────
  return (
    <DashboardWrapper>
      <Box sx={{ p: 3 }}>
        {/* HEADER */}
        <PageHeader
          title="Réservations"
          subtitle="Gestion des check-in et check-out"
          icon={<CalendarIcon sx={{ fontSize: 40, color: t.primary }} />}
        />

        {/* FILTERS BUTTONS */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          {FILTER_CONFIGS.map((filter) => {
            const count = counts?.[filter.key] || 0;
            const isActive = selectedFilter === filter.key;

            return (
              <Button
                key={filter.key}
                variant={isActive ? 'contained' : 'outlined'}
                color={filter.color}
                onClick={() => handleFilterChange(filter.key)}
                startIcon={
                  isActive ? (
                    <CheckCircleIcon />
                  ) : filter.key.startsWith('CHECKIN') ? (
                    <HomeIcon />
                  ) : (
                    <CancelIcon />
                  )
                }
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: isActive ? 700 : 500,
                  px: 2,
                  py: 1,
                  position: 'relative',
                }}
              >
                {filter.label}
                <Chip
                  label={count}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: isActive ? 'rgba(255,255,255,0.3)' : t.bg3,
                    color: isActive ? t.bg1 : t.text2,
                  }}
                />
              </Button>
            );
          })}
        </Stack>

        {/* LOADING COUNTS */}
        {isLoadingCounts && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography sx={{ color: t.text3, fontSize: 14 }}>
              Chargement des statistiques...
            </Typography>
          </Box>
        )}

        {/* ERROR ALERT */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* LOADING LIST */}
        {isLoadingList && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ color: t.primary }} />
          </Box>
        )}

        {/* TABLE */}
        {!isLoadingList && reservations.length > 0 && (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${t.border}`,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: t.bg2 }}>
                  <TableCell sx={{ fontWeight: 700, color: t.text2 }}>
                    Propriété & OTA
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.text2 }}>
                    Guest
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.text2 }}>
                    Check-in
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.text2 }}>
                    Check-out
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.text2 }}>
                    Status
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.text2 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => {
                  const statusStyle = getStatusColor(reservation.status);

                  return (
                    <TableRow
                      key={reservation.id}
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: t.bg2,
                          cursor: 'pointer',
                        },
                      }}
                    >
                      {/* Propriété & OTA */}
                      <TableCell>
                        <Typography
                          sx={{ fontSize: 14, fontWeight: 600, color: t.text1 }}
                        >
                          {reservation.listing_name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>
                          {reservation.title.split('•')[1]?.trim() || 'N/A'}
                        </Typography>
                      </TableCell>

                      {/* Guest */}
                      <TableCell>
                        <Typography
                          sx={{ fontSize: 14, fontWeight: 500, color: t.text1 }}
                        >
                          {reservation.guest_name}
                        </Typography>
                      </TableCell>

                      {/* Check-in */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon
                            sx={{ fontSize: 16, color: t.success }}
                          />
                          <Typography sx={{ fontSize: 14, color: t.text2 }}>
                            {formatDate(reservation.arrival_date)}
                          </Typography>
                        </Box>
                        {reservation.actual_arrival_time && (
                          <Chip
                            label="Déclaré"
                            size="small"
                            sx={{
                              mt: 0.5,
                              height: 18,
                              fontSize: 11,
                              bgcolor: t.success + '22',
                              color: t.success,
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Check-out */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon
                            sx={{ fontSize: 16, color: t.warning }}
                          />
                          <Typography sx={{ fontSize: 14, color: t.text2 }}>
                            {formatDate(reservation.departure_date)}
                          </Typography>
                        </Box>
                        {reservation.actual_departure_time && (
                          <Chip
                            label="Déclaré"
                            size="small"
                            sx={{
                              mt: 0.5,
                              height: 18,
                              fontSize: 11,
                              bgcolor: t.warning + '22',
                              color: t.warning,
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={statusStyle.label}
                          size="small"
                          sx={{
                            bgcolor: statusStyle.bg,
                            color: statusStyle.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <ButtonGroup size="small" variant="outlined">
                          <Tooltip title="Voir détails">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(reservation)}
                              sx={{
                                color: t.primary,
                                '&:hover': { bgcolor: t.primaryLight + '22' },
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Appeler">
                            <IconButton
                              size="small"
                              onClick={() => handleCallGuest(reservation)}
                              sx={{
                                color: t.success,
                                '&:hover': { bgcolor: t.success + '22' },
                              }}
                            >
                              <PhoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Envoyer email">
                            <IconButton
                              size="small"
                              onClick={() => handleEmailGuest(reservation)}
                              sx={{
                                color: t.info,
                                '&:hover': { bgcolor: t.info + '22' },
                              }}
                            >
                              <EmailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* EMPTY STATE */}
        {!isLoadingList && reservations.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: t.bg2,
              borderRadius: 2,
              border: `1px solid ${t.border}`,
            }}
          >
            <PendingIcon sx={{ fontSize: 80, color: t.text3, mb: 2 }} />
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: t.text2 }}>
              Aucune réservation trouvée
            </Typography>
            <Typography sx={{ fontSize: 14, color: t.text3, mt: 1 }}>
              Essayez de sélectionner un autre filtre
            </Typography>
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
