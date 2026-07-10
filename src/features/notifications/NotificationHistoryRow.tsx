import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { NOTIF_FACETS, NOTIF_PRIORITY } from './constants';
import type { NotificationItem } from './types';
import { resolveNotificationNavigatePath } from './notificationNavigation';
import { useSetStatus } from './useNotifications';

function plainBody(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  done: { label: 'Terminée', color: t.success },
  handled: { label: 'Lue', color: t.info },
  dismissed: { label: 'Ignorée', color: t.text3 },
  expired: { label: 'Expirée', color: t.text4 },
};

interface NotificationHistoryRowProps {
  notification: NotificationItem;
  /** Sur l’onglet Ignorées : permet de repasser en Terminée */
  allowTerminate?: boolean;
}

export function NotificationHistoryRow({
  notification,
  allowTerminate = false,
}: NotificationHistoryRowProps) {
  const navigate = useNavigate();
  const setStatus = useSetStatus();
  const facet = NOTIF_FACETS[notification.facet];
  const prio = NOTIF_PRIORITY[notification.priority];
  const statusMeta = STATUS_LABEL[notification.status] ?? { label: notification.status, color: t.text3 };
  const bodyText = plainBody(notification.body || '');

  const relTime = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })
    : '';

  const handleOpen = () => {
    const path = resolveNotificationNavigatePath(notification.linkPath, notification);
    if (path) navigate(path);
  };

  const handleTerminate = () => {
    void setStatus.mutateAsync({ id: notification._id, status: 'done' });
  };

  return (
    <Box sx={{ borderBottom: `1px solid ${t.border}`, bgcolor: 'transparent' }}>
      <Box
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        sx={{
          display: 'flex',
          gap: 1.25,
          px: 1.5,
          pt: 1.25,
          pb: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: t.bg2 },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            bgcolor: `${facet.color}1a`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
            flexShrink: 0,
            opacity: 0.85,
          }}
        >
          {facet.icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
              {notification.title}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: t.text4, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {relTime}
            </Typography>
          </Box>

          {bodyText ? (
            <Typography
              sx={{
                fontSize: 12,
                color: t.text2,
                mt: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bodyText}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          px: 1.5,
          py: 0.75,
          borderTop: `1px solid ${t.border}`,
          bgcolor: t.bg2,
        }}
      >
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: 0.2,
            borderRadius: '6px',
            bgcolor: prio.tint,
            color: prio.color,
          }}
        >
          {prio.label}
        </Box>
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: 0.2,
            borderRadius: '6px',
            bgcolor: t.bg1,
            color: statusMeta.color,
            border: `1px solid ${t.border}`,
          }}
        >
          {statusMeta.label}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75, ml: 'auto', flexWrap: 'wrap' }}>
          <Box
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
              bgcolor: t.bg1,
              color: t.primaryDeep,
              fontWeight: 700,
              fontSize: 11,
              px: 1,
              py: 0.45,
              borderRadius: '7px',
              minHeight: 28,
              '&:hover': { bgcolor: t.primaryTint, borderColor: t.primary },
            }}
          >
            <OpenInNewOutlined sx={{ fontSize: 12 }} />
            Ouvrir
          </Box>

          {allowTerminate ? (
            <Box
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTerminate();
              }}
              sx={{
                border: `1px solid ${t.primary}`,
                cursor: 'pointer',
                bgcolor: t.primaryTint,
                color: t.primaryDeep,
                fontWeight: 700,
                fontSize: 11,
                px: 1.25,
                py: 0.45,
                borderRadius: '7px',
                minHeight: 28,
                '&:hover': { bgcolor: t.primary, color: t.primaryOnGold },
              }}
            >
              Terminer
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
