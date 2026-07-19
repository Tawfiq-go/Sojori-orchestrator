import { useEffect, useRef, useState, type RefObject } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { useNotificationScope } from './NotificationProvider';
import { useUnreadCount } from './useNotifications';
import { NotificationPanel } from './NotificationPanel';
import type { NotificationBellTier } from './types';

const iconBtnSx = {
  width: 36,
  height: 36,
  borderRadius: '9px',
  color: t.text2,
  transition: 'background-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
  '&:hover': { bgcolor: t.bg2, color: t.text, transform: 'translateY(-1px)' },
  position: 'relative' as const,
};

function BellButton({
  tier,
  badgeCount,
  isUrgent,
  open,
  ringing,
  enabled,
  onToggle,
  buttonRef,
}: {
  tier: NotificationBellTier;
  badgeCount: number;
  isUrgent: boolean;
  open: boolean;
  ringing: boolean;
  enabled: boolean;
  onToggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const important = tier === 'important';
  const label = important ? 'Notifications prioritaires' : 'Notifications secondaires';
  const tooltip = !enabled
    ? 'Sélectionnez un propriétaire pour voir les notifications'
    : badgeCount > 0
      ? important
        ? `${badgeCount} prioritaire${badgeCount > 1 ? 's' : ''}`
        : `${badgeCount} secondaire${badgeCount > 1 ? 's' : ''}`
      : label;
  const display = badgeCount > 99 ? '99+' : String(badgeCount);
  const Icon = important ? NotificationsActiveOutlined : NotificationsNoneOutlined;

  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          ref={buttonRef}
          sx={{
            ...iconBtnSx,
            animation: ringing && important ? 'notifBellRing 0.85s ease' : 'none',
            '@keyframes notifBellRing': {
              '0%,100%': { transform: 'rotate(0deg)' },
              '15%': { transform: 'rotate(14deg)' },
              '30%': { transform: 'rotate(-12deg)' },
              '45%': { transform: 'rotate(8deg)' },
              '60%': { transform: 'rotate(-6deg)' },
              '75%': { transform: 'rotate(3deg)' },
            },
            ...(open ? { bgcolor: t.primaryTint, color: t.primaryDeep } : {}),
            ...(!enabled ? { opacity: 0.5 } : {}),
          }}
          aria-label={label}
          aria-expanded={open}
          onClick={onToggle}
          disabled={!enabled}
        >
          <Icon sx={{ fontSize: 20, color: important && badgeCount > 0 ? t.error : undefined }} />
          {badgeCount > 0 ? (
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
              {display}
            </Box>
          ) : null}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** Deux cloches : priorité 1 (urgente) + priorité 2 (secondaire). */
export function NotificationBell() {
  const importantRef = useRef<HTMLButtonElement>(null);
  const secondaryRef = useRef<HTMLButtonElement>(null);
  const { enabled, panelTier, setPanelTier, livePulse } = useNotificationScope();
  const { data: unread } = useUnreadCount();
  const [ringing, setRinging] = useState(false);

  const importantCount =
    unread?.importantActiveCount ?? unread?.actionRequired ?? 0;
  const secondaryCount =
    unread?.secondaryActiveCount ??
    Math.max(0, (unread?.activeCount ?? unread?.total ?? 0) - importantCount);

  useEffect(() => {
    if (!livePulse) return;
    setRinging(true);
    const tmr = window.setTimeout(() => setRinging(false), 850);
    return () => window.clearTimeout(tmr);
  }, [livePulse]);

  const toggle = (tier: NotificationBellTier) => {
    if (!enabled) return;
    setPanelTier(panelTier === tier ? null : tier);
  };

  const anchorEl =
    panelTier === 'important'
      ? importantRef.current
      : panelTier === 'secondary'
        ? secondaryRef.current
        : null;

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <BellButton
          tier="important"
          badgeCount={importantCount}
          isUrgent={importantCount > 0}
          open={panelTier === 'important'}
          ringing={ringing}
          enabled={enabled}
          onToggle={() => toggle('important')}
          buttonRef={importantRef}
        />
        <BellButton
          tier="secondary"
          badgeCount={secondaryCount}
          isUrgent={false}
          open={panelTier === 'secondary'}
          ringing={false}
          enabled={enabled}
          onToggle={() => toggle('secondary')}
          buttonRef={secondaryRef}
        />
      </Box>

      <NotificationPanel
        anchorEl={anchorEl}
        tier={panelTier}
        onClose={() => setPanelTier(null)}
      />
    </>
  );
}
