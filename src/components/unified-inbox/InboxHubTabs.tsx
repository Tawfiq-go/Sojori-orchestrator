import { Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GUEST_HUB_TABS,
  STAFF_HUB_TABS,
  type CommsHubTab,
  type CommsSection,
} from '../communications/commsHubConfig';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import { T } from './_tokens';

export type { CommsHubTab, CommsSection } from '../communications/commsHubConfig';

export function isWaDesignTab(tab: string): boolean {
  return tab === 'whatsapp' || tab === 'booking' || tab === 'staff' || tab === 'admin';
}

export function isOtaDesignTab(tab: string): boolean {
  return tab === 'ota' || tab === 'leads' || tab === 'reviews';
}

interface InboxHubTabsProps {
  section: CommsSection;
  counts?: Partial<Record<CommsHubTab, number>>;
  unreadCount?: number;
  metaExtra?: string;
  compact?: boolean;
}

function isPlatformAdminRole(role: unknown): boolean {
  const r = String(role || '').trim();
  return r === Roles.Admin || r === Roles.SuperAdmin || r.toLowerCase() === 'admin' || r.toLowerCase() === 'superadmin';
}

export default function InboxHubTabs({
  section,
  counts = {},
  unreadCount = 0,
  metaExtra,
  compact = false,
}: InboxHubTabsProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const active = (searchParams.get('tab') || (section === 'staff' ? 'staff' : 'whatsapp')) as CommsHubTab;
  const hubTabs =
    section === 'staff'
      ? STAFF_HUB_TABS.filter((tab) => (tab.id === 'booking' ? isPlatformAdminRole(user?.role) : true))
      : GUEST_HUB_TABS;
  const sectionLabel = section === 'staff' ? 'Staff' : 'Guest';

  const total = hubTabs.reduce((s, tab) => s + (counts[tab.id] || 0), 0);

  const goTab = (tabId: string) => {
    navigate(`/communications?section=${section}&tab=${tabId}`);
  };

  return (
    <Box sx={{ mb: compact ? 0.75 : 1.75, flexShrink: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: compact ? 1 : 1.75,
          mb: compact ? 0.75 : 1.75,
          flexWrap: 'nowrap',
        }}
      >
        <Typography
          sx={{
            fontSize: compact ? 15 : 20,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: T.text,
            flexShrink: 0,
          }}
        >
          {sectionLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: compact ? 10.5 : 12,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {total} conv. · {unreadCount} NL{metaExtra ? ` · ${metaExtra}` : ''}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: '3px',
          bgcolor: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: compact ? '9px' : '11px',
          p: 0.5,
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {hubTabs.map((tab) => {
          const isActive = active === tab.id;
          const staffTab = section === 'staff';
          return (
            <Box
              key={tab.id}
              component="button"
              onClick={() => goTab(tab.id)}
              sx={{
                px: compact ? 1.125 : 1.5,
                py: compact ? 0.625 : 0.875,
                borderRadius: '8px',
                border: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: compact ? 11 : 12,
                fontWeight: 700,
                color: isActive ? (staffTab ? '#b45309' : '#0e8c4d') : T.text3,
                bgcolor: isActive ? T.bg2 : 'transparent',
                boxShadow: isActive
                  ? staffTab
                    ? 'inset 0 0 0 1px rgba(180,83,9,0.35)'
                    : 'inset 0 0 0 1px rgba(37,211,102,0.30)'
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
                    bgcolor: isActive ? (staffTab ? '#b45309' : T.green) : T.bg3,
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
