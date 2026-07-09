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
import {
  useNotificationList,
  useUnreadCount,
  useMarkAllRead,
} from './useNotifications';
import type { NotificationPanelTab } from './types';
import { NotificationFacetChips } from './NotificationFacetChips';
import { NotificationRow } from './NotificationRow';

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<NotificationPanelTab>('action');
  const [facet, setFacet] = useState('');
  const { data: unread } = useUnreadCount();
  const { data: listData, isLoading, isFetching } = useNotificationList(facet, tab);
  const markAllRead = useMarkAllRead();

  const items = listData?.items ?? [];
  const uc = unread ?? { total: 0, actionRequired: 0, byFacet: {} };

  const handleMarkAll = () => {
    void markAllRead.mutateAsync(facet || undefined).catch(() => {});
  };

  const handlePrefs = () => {
    onClose();
    navigate('/admin/equipe/notifications');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        maxHeight: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* En-tête + filtres — toujours visibles, ne scrollent pas */}
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: `1px solid ${t.border}`,
          bgcolor: t.bg1,
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
            Notifications
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

        <Box sx={{ display: 'flex', gap: 0.5, px: 1.25, pb: 0.75 }}>
          <TabButton
            active={tab === 'action'}
            onClick={() => setTab('action')}
            label="Action requise"
            count={uc.actionRequired}
            highlight
          />
          <TabButton
            active={tab === 'all'}
            onClick={() => setTab('all')}
            label="Tout"
            count={uc.total}
          />
        </Box>

        <NotificationFacetChips
          selectedFacet={facet}
          onSelectFacet={setFacet}
          byFacet={uc.byFacet}
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
          <EmptyState tab={tab} />
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
          textAlign: 'center',
          bgcolor: t.bg1,
        }}
      >
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
            fontSize: 12,
            '&:hover': { color: t.primaryDeep },
          }}
        >
          Gérer les préférences →
        </Box>
      </Box>
    </Box>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        border: 'none',
        cursor: 'pointer',
        bgcolor: active ? t.bg1 : t.bg2,
        color: active ? t.text : t.text2,
        fontWeight: active ? 700 : 600,
        fontSize: 11,
        py: 0.5,
        borderRadius: '7px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        boxShadow: active ? `inset 0 -2px 0 ${t.primary}` : 'none',
      }}
    >
      {label}
      {count > 0 ? (
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            borderRadius: '999px',
            px: 0.75,
            py: 0.125,
            bgcolor: highlight && active ? t.warning : t.bg3,
            color: highlight && active ? '#fff' : t.text3,
          }}
        >
          {count}
        </Box>
      ) : null}
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

function EmptyState({ tab }: { tab: NotificationPanelTab }) {
  return (
    <Box sx={{ py: 5, px: 2, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 32, mb: 1 }}>{tab === 'action' ? '✅' : '🔔'}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
        {tab === 'action' ? 'Rien à traiter' : 'Rien à signaler'}
      </Typography>
      <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
        {tab === 'action'
          ? 'Aucune action requise pour le moment.'
          : 'Vous êtes à jour.'}
      </Typography>
    </Box>
  );
}

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { panelOpen, setPanelOpen } = useNotificationScope();
  const open = panelOpen && Boolean(anchorEl);

  const handleClose = () => {
    setPanelOpen(false);
    onClose();
  };

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 'min(100vw, 400px)',
            bgcolor: t.bg1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <PanelBody onClose={handleClose} />
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
      <PanelBody onClose={handleClose} />
    </Popover>
  );
}
