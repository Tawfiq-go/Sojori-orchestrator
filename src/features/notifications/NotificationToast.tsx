import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { NOTIF_FACETS, NOTIF_PRIORITY } from './constants';
import type { NotificationItem } from './types';
import { useMarkRead } from './useNotifications';
import { resolveNotificationNavigatePath } from './notificationNavigation';

interface NotificationToastStackProps {
  toasts: NotificationItem[];
  onDismiss: (id: string) => void;
}

function NotificationToastItem({
  notification,
  onDismiss,
}: {
  notification: NotificationItem;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const facet = NOTIF_FACETS[notification.facet];
  const prio = NOTIF_PRIORITY[notification.priority];

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const handleSee = () => {
    onDismiss();
    void markRead.mutateAsync(notification._id).catch(() => {});
    const path = resolveNotificationNavigatePath(notification.linkPath, notification);
    if (path) navigate(path);
  };

  return (
    <Box
      sx={{
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        bgcolor: t.bg1,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(20,17,10,0.14)',
        overflow: 'hidden',
        borderLeft: `4px solid ${prio.color}`,
        animation: 'notifToastIn 0.28s ease',
        '@keyframes notifToastIn': {
          from: { opacity: 0, transform: 'translateX(40px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Box sx={{ display: 'flex', p: 1.5, gap: 1.25, position: 'relative' }}>
        <IconButton
          size="small"
          onClick={onDismiss}
          aria-label="Fermer"
          sx={{ position: 'absolute', top: 4, right: 4, color: t.text3 }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '9px',
            bgcolor: `${facet.color}1a`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {facet.icon}
        </Box>
        <Box sx={{ minWidth: 0, pr: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
            {notification.title}
          </Typography>
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
            {notification.body}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Box
              component="button"
              type="button"
              onClick={handleSee}
              sx={{
                border: 'none',
                cursor: 'pointer',
                bgcolor: t.primaryTint,
                color: t.primaryDeep,
                fontWeight: 700,
                fontSize: 11.5,
                px: 1.25,
                py: 0.5,
                borderRadius: '6px',
              }}
            >
              Voir
            </Box>
            <Box
              component="button"
              type="button"
              onClick={onDismiss}
              sx={{
                border: 'none',
                cursor: 'pointer',
                bgcolor: 'transparent',
                color: t.text3,
                fontWeight: 600,
                fontSize: 11.5,
                px: 1,
                py: 0.5,
              }}
            >
              Plus tard
            </Box>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          height: 3,
          bgcolor: t.bg2,
          '&::after': {
            content: '""',
            display: 'block',
            height: '100%',
            width: '100%',
            bgcolor: prio.color,
            animation: 'notifToastProg 6s linear forwards',
          },
          '@keyframes notifToastProg': {
            from: { width: '100%' },
            to: { width: '0%' },
          },
        }}
      />
    </Box>
  );
}

export function NotificationToastStack({ toasts, onDismiss }: NotificationToastStackProps) {
  if (!toasts.length) return null;
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      {toasts.map((n) => (
        <NotificationToastItem
          key={n._id}
          notification={n}
          onDismiss={() => onDismiss(n._id)}
        />
      ))}
    </Box>
  );
}
