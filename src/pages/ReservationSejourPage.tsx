// ════════════════════════════════════════════════════════════════════
// Sojori — Reservation Sejour Page · édition « Atelier 2026 »
// Wrapper de page avec header sticky, infobar, 4 onglets.
// Tous les onglets injectés via slots — pas de logique métier ici.
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Stack, Typography, Tabs, Tab, IconButton, Button, Chip, Tooltip, useTheme, useMediaQuery, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
import { ArrowBack, Edit, CalendarToday, Person, Email, Save, Close, Warning } from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import reservationsService from '../services/reservationsService';
import { getCachedReservationDetail } from '../utils/reservationDetailCache';
import { buildReservationUpdatePayload } from '../utils/reservationEditPayload';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageFullscreenEnterBtn,
  PageFullscreenLayer,
  pageContentFullscreenSx,
  pageTreeFullscreenSx,
  usePageFullscreen,
} from '../components/page-fullscreen';
import { GuestInfoTab } from '../components/reservation/GuestInfoTab';
import { FinancierTab } from '../components/reservation/FinancierTab';
import { MessagesTab } from '../components/reservation/MessagesTab';
import { RegistrationTab } from '../components/reservation/RegistrationTab';
import { useEnregistrementStatus } from '../components/reservation/EnregistrementStatusBanner';
import { useWriteAccess } from '../hooks/useWriteAccess';
import { isMewsOrigin } from '../utils/reservationCreatedVia';
import { Roles } from '../constants/roles';

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
};

const TAB_NAMES = ['sejour', 'financier', 'messages', 'enregistrement'];

function formatStayRange(arrival?: string, departure?: string): string {
  if (!arrival) return '—';
  const a = new Date(arrival).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const d = departure
    ? new Date(departure).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '—';
  return `${a} → ${d}`;
}

export function ReservationSejourPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { canWrite, readOnly, user } = useWriteAccess('reservations');

  // Initialize tab from URL (?tab=guest-info legacy → séjour)
  const rawTab = searchParams.get('tab') || 'sejour';
  const tabKey = rawTab === 'guest-info' ? 'sejour' : rawTab;
  const initialTab = TAB_NAMES.indexOf(tabKey);
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
  const contentFs = usePageFullscreen();
  const contentFullscreen = contentFs.fullscreen;
  const enregistrement = useEnregistrementStatus(reservationDetails);

  // Sync tab when URL ?tab= changes (ex. lien depuis Séjour → Enregistrement)
  useEffect(() => {
    const raw = searchParams.get('tab') || 'sejour';
    const key = raw === 'guest-info' ? 'sejour' : raw;
    const idx = TAB_NAMES.indexOf(key);
    if (idx >= 0 && idx !== tab) setTab(idx);
  }, [searchParams, tab]);

  const refreshReservation = useCallback(() => {
    if (!id) return;
    reservationsService
      .getByRouteParam(id, { skipCache: true })
      .then(setReservationDetails)
      .catch(() => undefined);
  }, [id]);

  const enterEditMode = () => {
    if (readOnly) return;
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

  const statusBadge = reservationDetails?.status === 'Confirmed'
    ? { bg: 'rgba(10,143,94,0.14)', color: '#0A8F5E', label: 'Confirmé' }
    : reservationDetails?.status === 'Started'
      ? { bg: 'rgba(79,70,229,0.14)', color: '#4338CA', label: 'Séjour' }
      : String(reservationDetails?.status || '').toLowerCase().includes('cancel')
        ? { bg: 'rgba(200,30,30,0.12)', color: '#C81E1E', label: 'Annulé' }
        : String(reservationDetails?.status || '').toLowerCase() === 'completed'
          ? { bg: 'rgba(71,85,105,0.14)', color: '#475569', label: 'Terminé' }
          : { bg: 'rgba(196,101,6,0.14)', color: '#C46506', label: reservationDetails?.status || 'En attente' };

  const tabContent = useMemo(() => {
    if (!reservationDetails) return null;
    if (tab === 0) {
      return (
        <GuestInfoTab
          reservationDetails={reservationDetails}
          isEditMode={isEditMode && canWrite}
          editedData={editedData}
          onEditedDataChange={canWrite ? setEditedData : undefined}
          reservationId={reservationDetails?._id}
          onRefresh={refreshReservation}
        />
      );
    }
    if (tab === 1) {
      return (
        <FinancierTab
          reservationDetails={reservationDetails}
          isEditMode={isEditMode && canWrite}
          editedData={editedData}
          onEditedDataChange={canWrite ? setEditedData : undefined}
        />
      );
    }
    if (tab === 2) {
      return <MessagesTab reservationDetails={reservationDetails} />;
    }
    return (
      <RegistrationTab
        reservationDetails={reservationDetails}
        onRefresh={refreshReservation}
        readOnly={!canWrite}
        enregistrementStatus={enregistrement}
      />
    );
  }, [tab, reservationDetails, isEditMode, editedData, refreshReservation, canWrite, enregistrement]);

  const tabsBar = (
    <Tabs
      value={tab}
      onChange={(_, v) => {
        setTab(v);
        setSearchParams({ tab: TAB_NAMES[v] });
      }}
      variant={isMobile ? 'scrollable' : 'standard'}
      scrollButtons="auto"
      sx={{
        minHeight: 36,
        '& .MuiTab-root': {
          textTransform: 'none', fontWeight: 600, fontSize: 12,
          minHeight: 36, py: 0.5, letterSpacing: '0.005em',
          color: T.text2,
          '&.Mui-selected': { color: T.text },
        },
        '& .MuiTabs-indicator': { backgroundColor: T.primary, height: 2, borderRadius: 1 },
      }}
    >
      <Tab label="Séjour" />
      <Tab label="Financier" />
      <Tab label="Messages" />
      <Tab label="Enregistrement" />
    </Tabs>
  );

  // Résa née côté Mews (hôtel) : PM ne peut pas l'annuler depuis Sojori —
  // seul SuperAdmin (compte unique, tawfiq.gouach@sojori.com) le peut,
  // le temps que le push villa précise (AssignedResourceId) soit câblé côté
  // Mews. Cf. docs/mews/URGENT_ASSIGNED_RESOURCE_GAP.md.
  const mewsOrigin = isMewsOrigin({
    createdVia: reservationDetails?.createdVia,
    source: reservationDetails?.source,
    channelName: reservationDetails?.channelName,
  });
  const isSuperAdmin = user?.role === Roles.SuperAdmin;
  const cancelBlockedByMewsOrigin = mewsOrigin && !isSuperAdmin;

  const actionButtons = readOnly ? null : isEditMode ? (
    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }}>
      <Button
        size="small"
        startIcon={<Close sx={{ fontSize: 15 }} />}
        onClick={exitEditMode}
        disabled={isSaving}
        sx={{ textTransform: 'none', fontWeight: 600, color: T.text2, border: `1px solid ${T.border}`, minHeight: 28, fontSize: 11.5, px: 1 }}
      >
        Annuler
      </Button>
      <Button
        size="small"
        startIcon={isSaving ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: 15 }} />}
        variant="contained"
        onClick={handleSaveReservation}
        disabled={isSaving}
        sx={{
          textTransform: 'none', fontWeight: 600, minHeight: 28, fontSize: 11.5, px: 1,
          background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
          color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
          '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
        }}
      >
        Sauver
      </Button>
    </Stack>
  ) : (
    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0, display: { xs: 'none', md: 'flex' } }}>
      <Tooltip title={cancelBlockedByMewsOrigin ? 'Résa gérée depuis Mews — seul un super admin peut annuler ici' : ''}>
        <span>
          <Button
            size="small"
            onClick={() => setShowCancelModal(true)}
            disabled={cancelBlockedByMewsOrigin}
            sx={{ textTransform: 'none', fontWeight: 600, color: T.error, minHeight: 28, fontSize: 11.5, px: 1, '&:hover': { bgcolor: 'rgba(200,30,30,0.06)' } }}
          >
            Annuler
          </Button>
        </span>
      </Tooltip>
      <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderColor: T.border, color: T.text2, minHeight: 28, fontSize: 11.5, px: 1 }}>Rejeter</Button>
      <Button size="small" variant="contained" sx={{
        textTransform: 'none', fontWeight: 600, minHeight: 28, fontSize: 11.5, px: 1,
        background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
        color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
        '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
      }}>Accepter</Button>
    </Stack>
  );

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

  const compactHeader = (
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 10,
      bgcolor: T.bg1, borderBottom: `1px solid ${T.border}`,
      px: { xs: 1, md: 1.25 },
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, py: 0.75, flexWrap: 'nowrap' }}>
        <IconButton size="small" onClick={() => navigate('/reservations')} sx={{ color: T.text2, flexShrink: 0 }}>
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: '"Geist Mono", monospace', lineHeight: 1.2 }}>
              {reservationDetails.reservationNumber || '—'}
            </Typography>
            <Chip label={statusBadge.label} size="small" sx={{ height: 20, bgcolor: statusBadge.bg, color: statusBadge.color, fontWeight: 700, fontSize: 10 }} />
            {isEditMode && (
              <Chip label="Édition" size="small" sx={{ height: 20, bgcolor: T.primaryTint, color: T.primaryDeep, fontWeight: 700, fontSize: 10 }} />
            )}
            <Chip
              size="small"
              clickable
              onClick={() => {
                setTab(0);
                setSearchParams({ tab: 'sejour' });
              }}
              label={enregistrement.hourChosen && enregistrement.hour ? `Arrivée ${enregistrement.hour}` : 'Heure ?'}
              sx={{
                height: 20,
                fontWeight: 700,
                fontSize: 10,
                bgcolor: enregistrement.hourChosen ? 'rgba(10,143,94,0.12)' : T.primaryTint,
                color: enregistrement.hourChosen ? T.success : T.warning,
              }}
            />
            <Chip
              size="small"
              clickable
              onClick={() => {
                setTab(3);
                setSearchParams({ tab: 'enregistrement' });
              }}
              label={`Enreg. ${enregistrement.enregistrementDone}/${enregistrement.enregistrementNeeded}`}
              sx={{
                height: 20,
                fontWeight: 700,
                fontSize: 10,
                bgcolor: enregistrement.enregistrementComplete ? 'rgba(10,143,94,0.12)' : T.bg3,
                color: enregistrement.enregistrementComplete ? T.success : T.text2,
              }}
            />
          </Stack>
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.2, lineHeight: 1.2 }} noWrap title={`${reservationDetails.guestName || 'Voyageur'} · ${formatStayRange(reservationDetails.arrivalDate, reservationDetails.departureDate)}`}>
            {reservationDetails.guestName || 'Voyageur'} · {formatStayRange(reservationDetails.arrivalDate, reservationDetails.departureDate)}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25, flexShrink: 0, borderRight: `1px solid ${T.border}`, pr: 0.5, mr: 0.25 }}>
          <Tooltip title={readOnly ? 'Lecture seule' : isEditMode ? 'Quitter édition' : 'Modifier'}>
            <span>
            <IconButton size="small" onClick={() => (isEditMode ? exitEditMode() : enterEditMode())} disabled={readOnly} sx={{ color: isEditMode ? T.primary : T.text2, width: 28, height: 28 }}>
              <Edit sx={{ fontSize: 17 }} />
            </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Calendrier"><IconButton size="small" sx={{ color: T.text2, width: 28, height: 28 }}><CalendarToday sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          <Tooltip title="Profil voyageur"><IconButton size="small" sx={{ color: T.text2, width: 28, height: 28 }}><Person sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          <Tooltip title="Email"><IconButton size="small" sx={{ color: T.text2, width: 28, height: 28 }}><Email sx={{ fontSize: 17 }} /></IconButton></Tooltip>
        </Stack>
        {actionButtons}
        {!contentFullscreen && <PageFullscreenEnterBtn onClick={contentFs.enter} label="Plein écran" />}
      </Stack>
      <Box sx={{ borderTop: `1px solid ${T.border}` }}>{tabsBar}</Box>
    </Box>
  );

  // Même arbre page / plein écran — header (actions + tabs) + contenu.
  const detailPage = (
    <Box
      sx={{
        width: '100%',
        ...pageTreeFullscreenSx(contentFullscreen),
        ...(contentFullscreen ? { overflow: 'hidden', boxSizing: 'border-box' } : {}),
      }}
    >
      {compactHeader}
      <Box
        sx={{
          bgcolor: T.bg0,
          ...pageContentFullscreenSx(contentFullscreen),
          ...(!contentFullscreen
            ? { minHeight: { xs: 'calc(100dvh - 120px)', md: 'calc(100dvh - 128px)' } }
            : {}),
        }}
      >
        {tabContent}
      </Box>
    </Box>
  );

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations', reservationDetails.reservationNumber || id || '']}>
      {isRefreshing && !contentFullscreen && (
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

      {!contentFullscreen && detailPage}
      <PageFullscreenLayer
        open={contentFullscreen && Boolean(tabContent)}
        onClose={contentFs.exit}
        label="Détail réservation plein écran"
      >
        {detailPage}
      </PageFullscreenLayer>

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
