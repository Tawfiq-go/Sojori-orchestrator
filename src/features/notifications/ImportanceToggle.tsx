import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import LockOutlined from '@mui/icons-material/LockOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import type { NotificationImportance } from './types';

export function ImportanceToggle({
  value,
  locked,
  disabled,
  onChange,
}: {
  value: NotificationImportance;
  locked?: boolean;
  disabled?: boolean;
  onChange: (next: NotificationImportance) => void;
}) {
  if (locked) {
    return (
      <Tooltip title="Toujours priorité 1 (alerte critique)">
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              bgcolor: t.errorTint,
              color: t.error,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <NotificationsActiveOutlined sx={{ fontSize: 16 }} />
          </Box>
          <LockOutlined sx={{ fontSize: 14, color: t.text3, alignSelf: 'center' }} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
      <Tooltip title="Priorité 1 — cloche urgente">
        <Box
          component="button"
          type="button"
          disabled={disabled}
          onClick={() => onChange(1)}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            border: `1px solid ${value === 1 ? t.error : t.border}`,
            bgcolor: value === 1 ? t.errorTint : t.bg1,
            color: value === 1 ? t.error : t.text3,
            cursor: disabled ? 'default' : 'pointer',
            display: 'grid',
            placeItems: 'center',
            p: 0,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <NotificationsActiveOutlined sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>
      <Tooltip title="Priorité 2 — cloche secondaire">
        <Box
          component="button"
          type="button"
          disabled={disabled}
          onClick={() => onChange(2)}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            border: `1px solid ${value === 2 ? t.primary : t.border}`,
            bgcolor: value === 2 ? t.primaryTint : t.bg1,
            color: value === 2 ? t.primaryDeep : t.text3,
            cursor: disabled ? 'default' : 'pointer',
            display: 'grid',
            placeItems: 'center',
            p: 0,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <NotificationsNoneOutlined sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
