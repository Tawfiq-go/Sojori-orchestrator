import Box from '@mui/material/Box';
import { tokens as t } from '../../components/dashboard/dashboardTokens';

interface SidebarNotificationBadgeProps {
  count: number;
}

export function SidebarNotificationBadge({ count }: SidebarNotificationBadgeProps) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  return (
    <Box
      component="span"
      sx={{
        fontFamily: 'Geist Mono, monospace',
        fontSize: 9.5,
        fontWeight: 700,
        bgcolor: t.warning,
        color: '#fff',
        minWidth: 16,
        height: 16,
        borderRadius: '99px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.5,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {label}
    </Box>
  );
}
