import { Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GUEST_HUB_TABS,
  STAFF_HUB_TABS,
  type CommsHubTab,
  type CommsSection,
} from '../communications/commsHubConfig';
import { useCommsHubChrome } from '../communications/CommsHubChromeContext';
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

/**
 * Barre hub Communications (1 ligne) :
 * - gauche : filtres WA (si injectés) OU titre Guest/Staff + meta
 * - droite : onglets WhatsApp / OTA / …
 * → max de hauteur pour la liste messages.
 */
export default function InboxHubTabs({
  section,
  counts = {},
  unreadCount = 0,
  metaExtra,
  compact = false,
}: InboxHubTabsProps) {
  const { user } = useAuth();
  const { leading, subBar, fullscreenActive } = useCommsHubChrome();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const active = (searchParams.get('tab') || (section === 'staff' ? 'staff' : 'whatsapp')) as CommsHubTab;
  const hubTabs =
    section === 'staff'
      ? STAFF_HUB_TABS.filter((tab) => (tab.id === 'booking' ? isPlatformAdminRole(user?.role) : true))
      : GUEST_HUB_TABS;
  const sectionLabel = section === 'staff' ? 'Staff' : 'Guest';

  const total = hubTabs.reduce((s, tab) => s + (counts[tab.id] || 0), 0);
  // En FS, leading/subBar sont montés dans InboxFullscreenLayer (un seul arbre).
  const hasLeading = Boolean(leading) && !fullscreenActive;
  const visibleSubBar = fullscreenActive ? null : subBar;

  const goTab = (tabId: string) => {
    const next = new URLSearchParams();
    next.set('section', section);
    next.set('tab', tabId);
    // Conserver le contexte résa entre onglets Guest (évite de « perdre » le fil OTA)
    const reservation = searchParams.get('reservation') || searchParams.get('res');
    if (reservation) next.set('reservation', reservation);
    if (tabId === 'whatsapp') {
      const phone = searchParams.get('phone');
      if (phone) next.set('phone', phone);
    }
    if (tabId === 'ota') {
      const thread = searchParams.get('thread');
      if (thread) next.set('thread', thread);
    }
    navigate(`/communications?${next.toString()}`);
  };

  return (
    <Box sx={{ mb: compact ? 0.35 : 0.75, flexShrink: 0, minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: hasLeading ? 'stretch' : 'center',
          gap: compact ? 0.75 : 1.25,
          minWidth: 0,
        }}
      >
        {/* Gauche — filtres WA / barre Demandes, sinon titre Guest */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {hasLeading ? (
            leading
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: compact ? 0.75 : 1.25,
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: compact ? 14 : 18,
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: T.text,
                  flexShrink: 0,
                  lineHeight: 1.1,
                }}
              >
                {sectionLabel}
              </Typography>
              <Typography
                sx={{
                  fontSize: compact ? 10 : 11.5,
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
          )}
        </Box>

        {/* Droite — onglets canal */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '2px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: compact ? '8px' : '10px',
            p: '3px',
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            maxWidth: { xs: '42%', md: 'none' },
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
                type="button"
                title={tab.label}
                onClick={() => goTab(tab.id)}
                sx={{
                  px: compact ? 0.75 : 1.125,
                  py: compact ? 0.35 : 0.55,
                  borderRadius: '7px',
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: compact ? 10 : 11.5,
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
                  gap: 0.4,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  lineHeight: 1.1,
                  '&:hover': { color: T.text },
                }}
              >
                <span style={{ fontSize: compact ? 11 : 13, lineHeight: 1 }}>{tab.emoji}</span>
                <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>
                  {tab.label}
                </Box>
                {(counts[tab.id] ?? 0) > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 8.5,
                      fontWeight: 700,
                      px: 0.45,
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

      {/* Sous-barre compacte (chips Demandes, etc.) — juste après les blocs hub */}
      {visibleSubBar ? <Box sx={{ mt: 0.4, minWidth: 0 }}>{visibleSubBar}</Box> : null}
    </Box>
  );
}
