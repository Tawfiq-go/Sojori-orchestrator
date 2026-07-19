import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { useNotificationScope } from './NotificationProvider';
import { useNotificationList, useUnreadCount, useMarkAllRead } from './useNotifications';
import { NotificationFacetChips } from './NotificationFacetChips';
import { NotificationRow } from './NotificationRow';
import type { NotificationBellTier } from './types';

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  tier: NotificationBellTier | null;
  onClose: () => void;
}

function PanelBody({
  onClose,
  tier,
}: {
  onClose: () => void;
  tier: NotificationBellTier;
}) {
  const navigate = useNavigate();
  const [facet, setFacet] = useState('');
  const [eventKey, setEventKey] = useState('');
  const { data: unread } = useUnreadCount();
  const { data: listData, isLoading, isFetching } = useNotificationList(
    facet,
    eventKey,
    'all',
    tier,
  );
  const markAllRead = useMarkAllRead();

  const items = listData?.items ?? [];
  const uc = unread ?? { total: 0, activeCount: 0, actionRequired: 0, byFacet: {}, byEventKey: {} };
  const important = tier === 'important';
  const title = important ? 'Prioritaires' : 'Secondaires';
  const badgeHint = important
    ? 'Réservations, messages OTA/WhatsApp, deadlines…'
    : 'Tâches, parcours guest, infos…';

  const handleMarkAll = () => {
    void markAllRead
      .mutateAsync({
        facet: facet || undefined,
        eventKey: eventKey || undefined,
      })
      .catch(() => {});
  };

  const handlePrefs = () => {
    onClose();
    navigate('/admin/equipe/notifications?tab=config');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        maxHeight: 'inherit',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.bg1,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            pt: 1.25,
            pb: 0.75,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: t.text, flex: 1 }}>
            {title}
            {items.length > 0 ? (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: '999px',
                  px: 0.75,
                  py: 0.125,
                  bgcolor: important ? t.errorTint : t.bg3,
                  color: important ? t.error : t.text3,
                  verticalAlign: 'middle',
                }}
              >
                {items.length}
              </Box>
            ) : null}
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={handleMarkAll}
            sx={{
              border: 'none',
              cursor: 'pointer',
              bgcolor: 'transparent',
              color: t.primaryDeep,
              fontWeight: 700,
              fontSize: 10.5,
              px: 0.75,
              py: 0.35,
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: t.primaryTint },
            }}
          >
            ✓ Tout marquer lu
          </Box>
          <IconButton
            size="small"
            onClick={handlePrefs}
            aria-label="Préférences"
            sx={{ color: t.text2, p: 0.5 }}
          >
            <SettingsOutlined sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        <Typography sx={{ px: 1.25, pb: 0.75, fontSize: 10, color: t.text3, lineHeight: 1.4 }}>
          {badgeHint} Configurez la priorité de chaque alerte dans <b>Préférences</b>.
        </Typography>

        <NotificationFacetChips
          selectedFacet={facet}
          selectedEventKey={eventKey}
          onSelectFacet={setFacet}
          onSelectEventKey={setEventKey}
          byFacet={uc.byFacet}
          byEventKey={uc.byEventKey}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoading || isFetching ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState important={important} />
        ) : (
          items.map((n) => <NotificationRow key={n._id} notification={n} />)
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: 1.25,
          py: 0.75,
          borderTop: `1px solid ${t.border}`,
          bgcolor: t.bg1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => {
            onClose();
            navigate('/admin/equipe/notifications?tab=historique');
          }}
          sx={{
            border: 'none',
            cursor: 'pointer',
            bgcolor: 'transparent',
            color: t.primaryDeep,
            fontWeight: 700,
            fontSize: 12,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Voir l'historique complet →
        </Box>
        <Box
          component="button"
          type="button"
          onClick={handlePrefs}
          sx={{
            border: 'none',
            cursor: 'pointer',
            bgcolor: 'transparent',
            color: t.text3,
            fontWeight: 600,
            fontSize: 11,
            '&:hover': { color: t.primaryDeep },
          }}
        >
          Gérer les préférences
        </Box>
      </Box>
    </Box>
  );
}

function SkeletonList() {
  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3].map((i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: t.bg2 }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ height: 12, width: '70%', bgcolor: t.bg2, borderRadius: 1, mb: 0.75 }} />
            <Box sx={{ height: 10, width: '45%', bgcolor: t.bg2, borderRadius: 1, mb: 0.75 }} />
            <Box sx={{ height: 11, width: '90%', bgcolor: t.bg2, borderRadius: 1 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function EmptyState({ important }: { important: boolean }) {
  return (
    <Box sx={{ py: 5, px: 2, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 32, mb: 1 }}>{important ? '🔔' : '✅'}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
        Aucune notification {important ? 'prioritaire' : 'secondaire'}
      </Typography>
      <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
        Terminées ou ignorées → page Historique.
      </Typography>
    </Box>
  );
}

export function NotificationPanel({ anchorEl, tier, onClose }: NotificationPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setPanelTier } = useNotificationScope();
  const open = tier != null && Boolean(anchorEl);

  const handleClose = () => {
    setPanelTier(null);
    onClose();
  };

  if (!tier) return null;

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: 'min(100vw, 400px)',
              bgcolor: t.bg1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <PanelBody onClose={handleClose} tier={tier} />
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 400,
            height: 'min(70vh, 520px)',
            maxHeight: '70vh',
            mt: 1,
            borderRadius: '14px',
            border: `1px solid ${t.border}`,
            boxShadow: '0 16px 48px rgba(20,17,10,0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <PanelBody onClose={handleClose} tier={tier} />
    </Popover>
  );
}
