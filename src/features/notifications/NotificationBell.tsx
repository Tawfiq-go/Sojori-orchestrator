import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { useNotificationScope } from './NotificationProvider';
import { useUnreadCount } from './useNotifications';
import { NotificationPanel } from './NotificationPanel';

const iconBtnSx = {
  width: 36,
  height: 36,
  borderRadius: '9px',
  color: t.text2,
  transition: 'background-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
  '&:hover': { bgcolor: t.bg2, color: t.text, transform: 'translateY(-1px)' },
  position: 'relative' as const,
};

export function NotificationBell() {
  const bellRef = useRef<HTMLButtonElement>(null);
  const { enabled, panelOpen, setPanelOpen, livePulse } = useNotificationScope();
  const { data: unread } = useUnreadCount();
  const [ringing, setRinging] = useState(false);

  const actionRequired = unread?.actionRequired ?? 0;
  const activeCount = unread?.activeCount ?? unread?.total ?? 0;
  const badgeCount = activeCount > 99 ? '99+' : String(activeCount);
  const isUrgent = actionRequired > 0;

  useEffect(() => {
    if (!livePulse) return;
    setRinging(true);
    const tmr = window.setTimeout(() => setRinging(false), 850);
    return () => window.clearTimeout(tmr);
  }, [livePulse]);

  const handleToggle = () => {
    if (!enabled) return;
    setPanelOpen(!panelOpen);
  };

  const tooltipTitle = !enabled
    ? 'Sélectionnez un propriétaire pour voir les notifications'
    : activeCount > 0
      ? isUrgent
        ? `${activeCount} en cours (${actionRequired} urgente${actionRequired > 1 ? 's' : ''})`
        : `${activeCount} notification${activeCount > 1 ? 's' : ''} en cours`
      : 'Notifications';

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <span>
          <IconButton
            ref={bellRef}
            sx={{
              ...iconBtnSx,
              animation: ringing ? 'notifBellRing 0.85s ease' : 'none',
              '@keyframes notifBellRing': {
                '0%,100%': { transform: 'rotate(0deg)' },
                '15%': { transform: 'rotate(14deg)' },
                '30%': { transform: 'rotate(-12deg)' },
                '45%': { transform: 'rotate(8deg)' },
                '60%': { transform: 'rotate(-6deg)' },
                '75%': { transform: 'rotate(3deg)' },
              },
              ...(panelOpen ? { bgcolor: t.primaryTint, color: t.primaryDeep } : {}),
              ...(!enabled ? { opacity: 0.5 } : {}),
            }}
            aria-label="Notifications"
            aria-expanded={panelOpen}
            onClick={handleToggle}
            disabled={!enabled}
          >
            <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
            {activeCount > 0 ? (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  px: 0.375,
                  borderRadius: '999px',
                  bgcolor: isUrgent ? t.error : t.primary,
                  color: isUrgent ? '#fff' : t.primaryOnGold,
                  fontSize: 9.5,
                  fontWeight: 800,
                  lineHeight: '16px',
                  textAlign: 'center',
                  border: `2px solid ${t.bg1}`,
                }}
              >
                {badgeCount}
              </Box>
            ) : null}
          </IconButton>
        </span>
      </Tooltip>

      <NotificationPanel anchorEl={bellRef.current} onClose={() => setPanelOpen(false)} />
    </>
  );
}
