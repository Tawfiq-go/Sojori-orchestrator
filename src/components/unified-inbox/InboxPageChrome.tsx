import { Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { T } from './_tokens';

interface InboxPageChromeProps {
  waCount?: number;
  otaCount?: number;
  unreadCount?: number;
  activeTasks?: number;
}

/**
 * En-tête Inbox V4 — topbar + mode-tabs (design Claude Sojori 30)
 */
export default function InboxPageChrome({
  waCount = 0,
  otaCount = 0,
  unreadCount = 0,
  activeTasks = 0,
}: InboxPageChromeProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'whatsapp';
  const isWa = tab === 'whatsapp';
  const isOta = tab === 'ota';

  const setMode = (mode: 'whatsapp' | 'ota') => {
    navigate(`/communications?tab=${mode}`);
  };

  const total = waCount + otaCount;

  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.75, mb: 1.75 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: T.text }}>
          Inbox
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {total} conversations · {unreadCount} non lues
          {activeTasks > 0 ? ` · ${activeTasks} tâches actives` : ''}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'inline-flex',
          bgcolor: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: '11px',
          p: 0.5,
          gap: '3px',
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}
      >
        <ModeTab
          active={isWa}
          tone="wa"
          emoji="💬"
          label="WhatsApp"
          count={waCount}
          onClick={() => setMode('whatsapp')}
        />
        <ModeTab
          active={isOta}
          tone="ota"
          emoji="🏨"
          label="Messages OTA"
          count={otaCount}
          onClick={() => setMode('ota')}
        />
      </Box>
    </Box>
  );
}

function ModeTab({
  active,
  tone,
  emoji,
  label,
  count,
  onClick,
}: {
  active: boolean;
  tone: 'wa' | 'ota';
  emoji: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const wa = tone === 'wa';
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        px: 1.75,
        py: 1,
        borderRadius: '8px',
        border: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 700,
        color: active ? (wa ? '#0e8c4d' : '#c0353a') : T.text3,
        bgcolor: active ? T.bg2 : 'transparent',
        boxShadow: active
          ? wa
            ? 'inset 0 0 0 1px rgba(37,211,102,0.30)'
            : 'inset 0 0 0 1px rgba(255,90,95,0.30)'
          : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.875,
        transition: 'all 0.15s',
        '&:hover': { color: T.text },
      }}
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
      {label}
      <Box
        component="span"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 10,
          fontWeight: 700,
          px: 0.875,
          py: '1px',
          borderRadius: 999,
          bgcolor: active ? (wa ? T.green : T.airbnb) : T.bg3,
          color: active ? '#fff' : T.text3,
        }}
      >
        {count}
      </Box>
    </Box>
  );
}
