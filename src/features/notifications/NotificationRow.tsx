import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
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

function plainBody(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function NotificationRow({ notification }: NotificationRowProps) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const setStatus = useSetStatus();
  const [removing, setRemoving] = useState(false);

  const facet = NOTIF_FACETS[notification.facet];
  const prio = NOTIF_PRIORITY[notification.priority];
  const unread = isUnread(notification);
  const bodyText = plainBody(notification.body || '');

  const ctxParts = [
    notification.payload?.reservationNumber,
    notification.payload?.listingName,
    notification.payload?.guestName,
  ].filter(Boolean);

  const relTime = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })
    : '';

  const handleOpen = () => {
    setRemoving(true);
    window.setTimeout(() => {
      void markRead.mutateAsync(notification._id).catch(() => setRemoving(false));
    }, 120);
    const path = resolveNotificationNavigatePath(notification.linkPath, notification);
    if (path) navigate(path);
  };

  const handleDone = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    window.setTimeout(() => {
      void setStatus.mutateAsync({ id: notification._id, status: 'done' }).catch(() => {
        setRemoving(false);
      });
    }, 120);
  };

  const handleDismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    window.setTimeout(() => {
      void setStatus.mutateAsync({ id: notification._id, status: 'dismissed' }).catch(() => {
        setRemoving(false);
      });
    }, 120);
  };

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${t.border}`,
        bgcolor: unread ? t.warningTint : 'transparent',
        borderLeft: unread ? `3px solid ${t.primary}` : '3px solid transparent',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        opacity: removing ? 0 : 1,
        transform: removing ? 'translateX(10px)' : 'none',
        pointerEvents: removing ? 'none' : 'auto',
      }}
    >
      {/* Zone message — seule zone cliquable pour ouvrir */}
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
          '&:hover': { bgcolor: unread ? 'rgba(230,176,34,0.14)' : t.bg2 },
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

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.35,
              mt: 0.75,
              fontSize: 10.5,
              fontWeight: 700,
              color: t.primaryDeep,
            }}
          >
            <OpenInNewOutlined sx={{ fontSize: 12 }} />
            Ouvrir
          </Box>
        </Box>
      </Box>

      {/* Barre actions — zone séparée, pas de navigation */}
      <Box
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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

        <Box sx={{ display: 'flex', gap: 0.75, ml: 'auto' }}>
          <Box
            component="button"
            type="button"
            onClick={handleDone}
            onMouseDown={(e) => e.stopPropagation()}
            sx={doneBtnSx}
            title="Marquer comme traité"
          >
            Terminer
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleDismiss}
            onMouseDown={(e) => e.stopPropagation()}
            sx={dismissBtnSx}
            title="Retirer sans ouvrir"
          >
            Ignorer
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const doneBtnSx = {
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
  lineHeight: 1,
  '&:hover': { bgcolor: t.primary, color: t.primaryOnGold },
};

const dismissBtnSx = {
  border: `1px solid ${t.border}`,
  cursor: 'pointer',
  bgcolor: t.bg1,
  color: t.text3,
  fontWeight: 700,
  fontSize: 11,
  px: 1.25,
  py: 0.45,
  borderRadius: '7px',
  minHeight: 28,
  lineHeight: 1,
  '&:hover': { bgcolor: t.bg0, color: t.text, borderColor: t.text4 },
};
