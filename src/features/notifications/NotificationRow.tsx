import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { NOTIF_FACETS, NOTIF_PRIORITY, isUnread } from './constants';
import type { NotificationItem } from './types';
import { useMarkRead, useSetStatus } from './useNotifications';
import { resolveNotificationNavigatePath } from './notificationNavigation';

interface NotificationRowProps {
  notification: NotificationItem;
}

export function NotificationRow({ notification }: NotificationRowProps) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const setStatus = useSetStatus();
  const [removing, setRemoving] = useState(false);

  const facet = NOTIF_FACETS[notification.facet];
  const prio = NOTIF_PRIORITY[notification.priority];
  const unread = isUnread(notification);
  const done = notification.status === 'done' || notification.status === 'handled';

  const ctxParts = [
    notification.payload?.reservationNumber,
    notification.payload?.listingName,
    notification.payload?.guestName,
  ].filter(Boolean);

  const relTime = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })
    : '';

  const handleOpen = () => {
    void markRead.mutateAsync(notification._id).catch(() => {});
    const path = resolveNotificationNavigatePath(notification.linkPath, notification);
    if (path) navigate(path);
  };

  const handleDone = (e: MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    window.setTimeout(() => {
      void setStatus.mutateAsync({ id: notification._id, status: 'done' }).catch(() => {
        setRemoving(false);
      });
    }, 200);
  };

  const handleDismiss = (e: MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    window.setTimeout(() => {
      void setStatus.mutateAsync({ id: notification._id, status: 'dismissed' }).catch(() => {
        setRemoving(false);
      });
    }, 200);
  };

  return (
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
        py: 1.25,
        cursor: 'pointer',
        borderBottom: `1px solid ${t.border}`,
        bgcolor: unread ? t.warningTint : 'transparent',
        borderLeft: unread ? `3px solid ${t.primary}` : '3px solid transparent',
        transition: 'opacity 0.28s ease, transform 0.28s ease, max-height 0.28s ease',
        opacity: removing ? 0 : 1,
        transform: removing ? 'translateX(12px)' : 'none',
        '&:hover': { bgcolor: unread ? t.warningTint : t.bg2 },
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            bgcolor: `${facet.color}1a`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
          }}
        >
          {facet.icon}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: prio.color,
            border: `2px solid ${t.bg1}`,
          }}
        />
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

        {ctxParts.length > 0 ? (
          <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.25 }}>
            {ctxParts.map((part, i) => (
              <Box component="span" key={String(part)} sx={{ fontWeight: i === 0 ? 700 : 400 }}>
                {i > 0 ? ' · ' : ''}
                {String(part)}
              </Box>
            ))}
          </Typography>
        ) : null}

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

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 10.5,
              fontWeight: 700,
              px: 0.75,
              py: 0.25,
              borderRadius: '6px',
              bgcolor: prio.tint,
              color: prio.color,
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: prio.color }} />
            {prio.label}
          </Box>

          {(notification.aggregatedCount ?? 0) > 1 ? (
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3 }}>
              ×{notification.aggregatedCount}
            </Typography>
          ) : null}

          {done ? (
            <Typography sx={{ fontSize: 11, color: t.success, fontWeight: 600 }}>
              ✓ {notification.status === 'done' ? 'Terminé' : 'Pris en charge'}
            </Typography>
          ) : null}

          <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
            {!done ? (
              <Box
                component="button"
                type="button"
                onClick={handleDone}
                sx={actionBtnSx}
              >
                Terminer
              </Box>
            ) : null}
            <Box
              component="button"
              type="button"
              onClick={handleDismiss}
              sx={{ ...actionBtnSx, color: t.text3 }}
            >
              Ignorer
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const actionBtnSx = {
  border: 'none',
  cursor: 'pointer',
  bgcolor: 'transparent',
  color: t.primaryDeep,
  fontWeight: 700,
  fontSize: 11,
  px: 0.75,
  py: 0.25,
  borderRadius: '4px',
  '&:hover': { bgcolor: t.bg2 },
};
