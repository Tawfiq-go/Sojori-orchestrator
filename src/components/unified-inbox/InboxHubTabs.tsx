import { Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { T } from './_tokens';

export type CommsHubTab = 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';

const HUB_TABS: {
  id: CommsHubTab;
  label: string;
  emoji: string;
  tone: 'wa' | 'ota';
}[] = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬', tone: 'wa' },
  { id: 'staff', label: 'Staff WhatsApp', emoji: '👷', tone: 'wa' },
  { id: 'ota', label: 'Messages OTA', emoji: '🏨', tone: 'ota' },
  { id: 'leads', label: 'Demande', emoji: '🎯', tone: 'ota' },
  { id: 'reviews', label: 'Avis', emoji: '⭐', tone: 'ota' },
];

export function isWaDesignTab(tab: string): boolean {
  return tab === 'whatsapp' || tab === 'staff';
}

export function isOtaDesignTab(tab: string): boolean {
  return tab === 'ota' || tab === 'leads' || tab === 'reviews';
}

interface InboxHubTabsProps {
  counts?: Partial<Record<CommsHubTab, number>>;
  unreadCount?: number;
  metaExtra?: string;
}

export default function InboxHubTabs({ counts = {}, unreadCount = 0, metaExtra }: InboxHubTabsProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const active = (searchParams.get('tab') || 'whatsapp') as CommsHubTab;

  const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);

  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.75, mb: 1.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: T.text }}>
          Inbox
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {total} conversations · {unreadCount} non lues{metaExtra ? ` · ${metaExtra}` : ''}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          bgcolor: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: '11px',
          p: 0.5,
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}
      >
        {HUB_TABS.map((tab) => {
          const isActive = active === tab.id;
          const wa = tab.tone === 'wa';
          return (
            <Box
              key={tab.id}
              component="button"
              onClick={() => navigate(`/communications?tab=${tab.id}`)}
              sx={{
                px: 1.5,
                py: 0.875,
                borderRadius: '8px',
                border: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? (wa ? '#0e8c4d' : '#c0353a') : T.text3,
                bgcolor: isActive ? T.bg2 : 'transparent',
                boxShadow: isActive
                  ? wa
                    ? 'inset 0 0 0 1px rgba(37,211,102,0.30)'
                    : 'inset 0 0 0 1px rgba(255,90,95,0.30)'
                  : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                '&:hover': { color: T.text },
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.emoji}</span>
              {tab.label}
              {(counts[tab.id] ?? 0) > 0 && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    px: 0.625,
                    py: '1px',
                    borderRadius: 999,
                    bgcolor: isActive ? (wa ? T.green : T.airbnb) : T.bg3,
                    color: isActive ? '#fff' : T.text4,
                  }}
                >
                  {counts[tab.id]}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
