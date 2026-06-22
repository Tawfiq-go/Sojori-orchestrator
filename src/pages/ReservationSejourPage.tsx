// ════════════════════════════════════════════════════════════════════
// Sojori — Reservation Sejour Page · édition « Atelier 2026 »
// Wrapper de page avec header sticky, infobar, 4 onglets.
// Tous les onglets injectés via slots — pas de logique métier ici.
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Box, Stack, Typography, Tabs, Tab, IconButton, Button, Chip, Tooltip, useTheme, useMediaQuery, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
import { ArrowBack, Edit, CalendarToday, Person, Email, Save, Close, Warning } from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import reservationsService from '../services/reservationsService';
import { getCachedReservationDetail } from '../utils/reservationDetailCache';
import { buildReservationUpdatePayload } from '../utils/reservationEditPayload';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { GuestInfoTab } from '../components/reservation/GuestInfoTab';
import { FinancierTab } from '../components/reservation/FinancierTab';
import { SejourTab } from '../components/reservation/SejourTab';

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
};

const TAB_NAMES = ['guest-info', 'sejour', 'messages', 'financier'];

export function ReservationSejourPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Initialize tab from URL query param
  const initialTab = TAB_NAMES.indexOf(searchParams.get('tab') || 'guest-info');
  const [tab, setTab] = useState(initialTab >= 0 ? initialTab : 0);
  const [isEditMode, setIsEditMode] = useState(false);
  const cachedShell = id ? getCachedReservationDetail(id) : null;
  const [reservationDetails, setReservationDetails] = useState<any | null>(cachedShell);
  const [isLoading, setIsLoading] = useState(!cachedShell);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRequestIdRef = useRef(0);

  // Modal confirmation annulation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Edited data for save
  const [editedData, setEditedData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const enterEditMode = () => {
    if (reservationDetails) {
      setEditedData({ ...reservationDetails });
    }
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditedData({});
  };

  useEffect(() => {
    if (!id) {
      setError('ID de réservation manquant');
      setIsLoading(false);
      return;
    }

    const requestId = ++fetchRequestIdRef.current;
    const hasCache = Boolean(getCachedReservationDetail(id));
    if (!hasCache) {
      setIsLoading(true);
      setReservationDetails(null);
    } else {
      setReservationDetails(getCachedReservationDetail(id));
      setIsRefreshing(true);
    }
    setError(null);

    void (async () => {
      const startTime = performance.now();
      try {
        const response = await reservationsService.getByRouteParam(id, {
          skipCache: hasCache,
        });
        if (requestId !== fetchRequestIdRef.current) return;
        setReservationDetails(response);
        if (import.meta.env.DEV) {
          console.log(`[ReservationSejourPage] ✅ loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        }
      } catch (err: any) {
        if (requestId !== fetchRequestIdRef.current) return;
        if (!hasCache) {
          setError(err.message || 'Erreur lors du chargement de la réservation');
          toast.error('Erreur lors du chargement de la réservation');
        }
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();
  }, [id]);

  // Handler: Annuler la réservation
  const handleCancelReservation = async () => {
    const cancelId =
      reservationDetails?._id ||
      reservationDetails?.id ||
      id;
    if (!cancelId) return;

    setIsCancelling(true);
    try {
      const result = await reservationsService.cancel(String(cancelId));

      if (result.success) {
        toast.success('Réservation annulée avec succès');
        setShowCancelModal(false);
        // Rediriger vers la liste des réservations
        navigate('/reservations');
      } else {
        toast.error(result.message || 'Erreur lors de l\'annulation');
      }
    } catch (err: any) {
      console.error('Error cancelling reservation:', err);
      toast.error(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handler: Sauvegarder les modifications
  const handleSaveReservation = async () => {
    const effectiveId =
      reservationDetails?._id || reservationDetails?.id || id;
    if (!effectiveId || !reservationDetails) {
      toast.error('Identifiant réservation manquant');
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildReservationUpdatePayload(
        reservationDetails as Record<string, unknown>,
        editedData as Record<string, unknown>,
      );
      const result = await reservationsService.update(String(effectiveId), payload);

      if (result.success) {
        toast.success('Réservation mise à jour avec succès');
        exitEditMode();
        const response = await reservationsService.getByRouteParam(String(id), { skipCache: true });
        setReservationDetails(response);
      } else {
        toast.error(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      console.error('Error updating reservation:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = reservationDetails?.status === 'Confirmed' ? {
    bg: 'rgba(10,143,94,0.12)', color: T.success, label: 'Confirmé',
  } : { bg: 'rgba(196,101,6,0.12)', color: T.warning, label: reservationDetails?.status || 'En attente' };

  // Loading state
  if (isLoading) {
    return (
      <DashboardWrapper breadcrumb={['Activité', 'Réservations', '...']}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress size={60} sx={{ color: T.primary }} />
        </Box>
      </DashboardWrapper>
    );
  }

  // Error state
  if (error || !reservationDetails) {
    return (
      <DashboardWrapper breadcrumb={['Activité', 'Réservations', id || '']}>
        <Alert severity="error" sx={{ m: 3 }}>
          {error || 'Réservation non trouvée'}
        </Alert>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations', reservationDetails.reservationNumber || id || '']}>
      {isRefreshing && (
        <Box
          sx={{
            position: 'fixed',
            top: 72,
            right: 16,
            zIndex: 1200,
            bgcolor: 'rgba(184,133,26,0.92)',
            color: '#fff',
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={14} sx={{ color: '#fff' }} />
          Mise à jour…
        </Box>
      )}
      {/* ─── Header sticky ────────────────────────────────────── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 10,
        bgcolor: T.bg1, borderBottom: `1px solid ${T.border}`,
        px: { xs: 2, md: 3 }, py: 1.5,
      }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => navigate('/reservations')} sx={{ color: T.text2 }}>
              <ArrowBack sx={{ fontSize: 20 }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Détail réservation
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: '"Geist Mono", monospace' }}>
                {reservationDetails.reservationNumber || '—'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
            {/* Icon actions */}
            <Stack direction="row" sx={{ gap: 0, mr: 1, borderRight: `1px solid ${T.border}`, pr: 1 }}>
              <Tooltip title={isEditMode ? 'Mode édition actif' : 'Modifier'}>
                <IconButton
                  size="small"
                  onClick={() => (isEditMode ? exitEditMode() : enterEditMode())}
                  sx={{ color: isEditMode ? T.primary : T.text2 }}
                >
                  <Edit sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Calendrier">
                <IconButton size="small" sx={{ color: T.text2 }}>
                  <CalendarToday sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Profil voyageur">
                <IconButton size="small" sx={{ color: T.text2 }}>
                  <Person sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Email voyageur">
                <IconButton size="small" sx={{ color: T.text2 }}>
                  <Email sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Action buttons */}
            {isEditMode ? (
              <Stack direction="row" sx={{ gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<Close sx={{ fontSize: 16 }} />}
                  onClick={exitEditMode}
                  disabled={isSaving}
                  sx={{
                    textTransform: 'none', fontWeight: 600, color: T.text2,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  Annuler
                </Button>
                <Button
                  size="small"
                  startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <Save sx={{ fontSize: 16 }} />}
                  variant="contained"
                  onClick={handleSaveReservation}
                  disabled={isSaving}
                  sx={{
                    textTransform: 'none', fontWeight: 600,
                    background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
                    color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
                    '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
                  }}
                >
                  Sauvegarder
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" sx={{ gap: 0.75 }}>
                <Button
                  size="small"
                  onClick={() => setShowCancelModal(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, color: T.error, '&:hover': { bgcolor: 'rgba(200,30,30,0.06)' } }}
                >
                  Annuler
                </Button>
                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderColor: T.border, color: T.text2 }}>Rejeter</Button>
                <Button size="small" variant="contained" sx={{
                  textTransform: 'none', fontWeight: 600,
                  background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
                  color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
                  '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
                }}>Accepter</Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ─── Info bar ─────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: T.bg2, borderBottom: `1px solid ${T.border}`,
        px: { xs: 2, md: 3 }, py: 1.5,
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Reservation Details
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: T.text, mt: 0.25 }}>
              {reservationDetails?.guestName || 'Voyageur'} · {reservationDetails?.arrivalDate ? new Date(reservationDetails.arrivalDate).toLocaleDateString('fr-FR') : '—'}
            </Typography>
          </Box>
          <Chip label={statusBadge.label} sx={{ bgcolor: statusBadge.bg, color: statusBadge.color, fontWeight: 700, fontSize: 12 }} />
          {isEditMode && (
            <Chip label="✏ Mode édition" sx={{ bgcolor: T.primaryTint, color: T.primaryDeep, fontWeight: 700, fontSize: 12 }} />
          )}
        </Stack>
      </Box>

      {/* ─── Tabs ─────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.bg1, borderBottom: `1px solid ${T.border}`, px: { xs: 1, md: 2 } }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setSearchParams({ tab: TAB_NAMES[v] });
          }}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{
            minHeight: 42,
            '& .MuiTab-root': {
              textTransform: 'none', fontWeight: 600, fontSize: 13,
              minHeight: 42, letterSpacing: '0.005em',
              color: T.text2,
              '&.Mui-selected': { color: T.text },
            },
            '& .MuiTabs-indicator': { backgroundColor: T.primary, height: 2.5, borderRadius: 1 },
          }}
        >
          <Tab label="Guest Info" />
          <Tab label="Séjour" />
          <Tab label="Messages" />
          <Tab label="Financier" />
        </Tabs>
      </Box>

      {/* ─── Content ──────────────────────────────────────────── */}
      <Box sx={{ bgcolor: T.bg0 }}>
        {tab === 0 && (
          <GuestInfoTab
            reservationDetails={reservationDetails}
            isEditMode={isEditMode}
            editedData={editedData}
            onEditedDataChange={setEditedData}
            reservationId={reservationDetails?._id}
            onRefresh={() => {
              if (!id) return;
              reservationsService
                .getByRouteParam(id, { skipCache: true })
                .then(setReservationDetails)
                .catch(() => undefined);
            }}
          />
        )}
        {tab === 1 && <SejourTab reservationDetails={reservationDetails} />}
        {tab === 2 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ p: 6, textAlign: 'center', bgcolor: T.bg1, border: `1px dashed ${T.borderStrong || 'rgba(20,17,10,0.14)'}`, borderRadius: 1.5 }}>
              <Typography sx={{ fontSize: 32, mb: 1 }}>💬</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.text2 }}>Messages · WhatsApp / Chat / Reviews / Templates</Typography>
              <Typography sx={{ fontSize: 12.5, color: T.text3, mt: 0.5 }}>À brancher : composant MessagesTab</Typography>
            </Box>
          </Box>
        )}
        {tab === 3 && (
          <FinancierTab
            reservationDetails={reservationDetails}
            isEditMode={isEditMode}
            editedData={editedData}
            onEditedDataChange={setEditedData}
          />
        )}
      </Box>

      {/* Modal de confirmation d'annulation */}
      <Dialog
        open={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(20,17,10,0.12)',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          fontSize: 18,
          fontWeight: 700,
          color: T.text,
          pb: 1,
        }}>
          <Warning sx={{ color: T.warning, fontSize: 28 }} />
          Confirmer l'annulation
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: T.text2, fontSize: 14, lineHeight: 1.6 }}>
            Êtes-vous sûr de vouloir annuler cette réservation ?
            <br />
            <strong>Réservation : {reservationDetails?.reservationNumber || id}</strong>
            <br />
            <br />
            Cette action changera le statut de la réservation à <strong>"Annulée par Admin"</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setShowCancelModal(false)}
            disabled={isCancelling}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: T.text2,
              '&:hover': { bgcolor: 'rgba(20,17,10,0.05)' },
            }}
          >
            Non, garder
          </Button>
          <Button
            onClick={handleCancelReservation}
            disabled={isCancelling}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: T.error,
              color: '#fff',
              '&:hover': { bgcolor: '#a81717' },
              '&:disabled': { bgcolor: 'rgba(200,30,30,0.4)' },
            }}
          >
            {isCancelling ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Oui, annuler'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardWrapper>
  );
}

export default ReservationSejourPage;
