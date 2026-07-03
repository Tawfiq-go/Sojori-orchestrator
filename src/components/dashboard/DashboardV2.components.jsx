// ════════════════════════════════════════════════════════════════════
// Sojori Dashboard V2 — React + Material-UI components (Owner focus)
// Drop-in code for sojori-dashboard or new Vite + React project.
//
// Components exported:
//   Layout      → DashboardLayout, AppSidebar, TopBar
//   Data        → DataTable, StatCard, StatsRow, Badge, SourcePill
//   Timeline    → OrchestrationTimeline, TLEvent, TLDayLabel
//   Calendar    → CalendarGantt, CalBooking
//   Kanban      → KanbanBoard, KanbanColumn, TaskCard
//   Chat        → ChatLayout, ConversationList, ChatThread, ChatAside
//   Listings    → ListingsGrid, ListingCard
//   Filters     → FilterBar, FilterChip, ViewToggle
//   AI          → AIBanner, AIChip, AICard
//   Buttons     → btnPrimarySx, btnGhostSx, btnAiSx, btnSmSx
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_DEFAULT_COLLAPSED } from '../../config/navConfig';
import { useSidebarNav } from '../../hooks/useSidebarNav';
import { usePmSimulation } from '../../context/PmSimulationContext';
import { PmSimulationBanner } from '../simulation/PmSimulationBanner';
import { AdminBusinessScopeTopFilter } from '../AdminOwnerScope/AdminBusinessScopeTopFilter';
import { AdminSessionTopBarButton } from './AdminSessionTopBarButton';
import { SidebarUserProfileMenu } from './SidebarUserProfileMenu';
import { LISTING_LAYOUT } from '../../constants/listingLayout';
import { DASHBOARD_PAGE } from '../../constants/dashboardLayout';
import { IconColored } from './IconColored';
import { SojoriBrandLockup } from '../brand/SojoriBrandLogo';
import {
  Box, Stack, Typography, Button, IconButton, Avatar, Chip, Switch,
  TextField, InputAdornment, Divider, Tooltip, Drawer,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import AutoGraphOutlined from '@mui/icons-material/AutoGraphOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import VillaOutlined from '@mui/icons-material/VillaOutlined';
import { tokens, pageMetaChipSx as pageMetaChipSxBase } from './dashboardTokens';
export { tokens } from './dashboardTokens';

const t = tokens;

// ════════════════════════════════════════════════════════════════════
// 1. DashboardLayout — root grid: sidebar + topbar + main
// ════════════════════════════════════════════════════════════════════

export function DashboardLayout({
  user,
  activePath,
  onNavigate,
  onLogout,
  children,
  breadcrumb = [],
  compactMain = false,
  mainRef,
  persistent = false,
  adminScopeInTopBar = false,
}) {
  const { isActive: simulationActive } = usePmSimulation();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const gridRows = simulationActive ? `auto ${t.topbarH}px 1fr` : `${t.topbarH}px 1fr`;
  const gridAreas = simulationActive
    ? {
        xs: `"banner" "topbar" "main"`,
        md: `"banner banner" "sidebar topbar" "sidebar main"`,
      }
    : { xs: `"topbar" "main"`, md: `"sidebar topbar" "sidebar main"` };

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  const handleNavigate = React.useCallback(
    (id) => {
      onNavigate?.(id);
      setMobileNavOpen(false);
    },
    [onNavigate],
  );

  return (
    <Box
      className="sojori-dashboard-root"
      sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: `${t.sidebarW}px 1fr` },
      gridTemplateRows: gridRows,
      gridTemplateAreas: gridAreas,
      height: '100vh',
      fontFamily: 'Geist, system-ui, sans-serif',
      color: t.text, bgcolor: t.bg0,
    }}>
      {simulationActive ? (
        <Box sx={{ gridArea: 'banner' }}>
          <PmSimulationBanner />
        </Box>
      ) : null}
      <AppSidebar
        user={user}
        activePath={activePath}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        simulationActive={simulationActive}
        sidebarRowSpan={simulationActive ? 2 : 1}
        variant="rail"
      />
      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: t.sidebarW,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        <AppSidebar
          user={user}
          activePath={activePath}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          simulationActive={simulationActive}
          variant="drawer"
        />
      </Drawer>
      <TopBar
        breadcrumb={breadcrumb}
        compact={compactMain}
        simulationActive={simulationActive}
        adminScopeInTopBar={adminScopeInTopBar}
        onMenuClick={() => setMobileNavOpen(true)}
      />
      <Box
        ref={mainRef}
        className={[
          persistent ? undefined : 'sojori-main-enter',
          simulationActive ? 'sojori-main-sim' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        sx={{
          gridArea: 'main',
          overflow: 'auto',
          display: compactMain ? 'flex' : 'block',
          flexDirection: 'column',
          minHeight: 0,
          backgroundImage: compactMain
            ? 'none'
            : `
          radial-gradient(50% 42% at 100% 0%, rgba(230,176,34,0.07), transparent 58%),
          radial-gradient(38% 28% at 0% 100%, rgba(139,92,246,0.05), transparent 72%)
        `,
          pt: compactMain ? LISTING_LAYOUT.mainPadTop : { xs: 2, md: '24px' },
          pb: compactMain ? LISTING_LAYOUT.mainPadBottom : { xs: 2, md: '48px' },
          px: compactMain ? LISTING_LAYOUT.mainPadX : DASHBOARD_PAGE.padX,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 2. AppSidebar
// ════════════════════════════════════════════════════════════════════

/** Icônes MUI alignées brief Claude Design (modules) — emoji en secours si id absent */
const NAV_ICON_BY_ID = {
  dashboard: DashboardOutlined,
  analytics: AnalyticsOutlined,
  reports: DescriptionOutlined,
  orchestration: AutoAwesomeOutlined,
  orchestrator: AutoAwesomeOutlined,
  calendar: CalendarMonthOutlined,
  'reservations/list': ConfirmationNumberOutlined,
  'reservations/planning': TodayOutlined,
  payments: ShowChartOutlined,
  'tasks/list': AssignmentTurnedInOutlined,
  'tasks/planning': TodayOutlined,
  'tasks/kanban': DashboardOutlined,
  'tasks/team': GroupsOutlined,
  'tasks/orchestration': HubOutlined,
  'tasks/plans': AutoAwesomeOutlined,
  'tasks/orchestration-config': SettingsOutlined,
  'tasks/whatsapp-messages': ForumOutlined,
  chatbot: SmartToyOutlined,
  'chatbot/whitelist': ForumOutlined,
  'chatbot/listing': HomeWorkOutlined,
  inbox: InboxOutlined,
  'comms': ForumOutlined,
  'comms/guests': ForumOutlined,
  'orch/plans': AutoAwesomeOutlined,
  'orch/ops': TodayOutlined,
  'orch/workflows': SettingsOutlined,
  'listings/list': HomeWorkOutlined,
  'listings/mapping': HubOutlined,
  'listings/orchestration-model': HubOutlined,
  'pricing/portfolio': InsightsOutlined,
  'pricing/audit': HistoryOutlined,
  staff: GroupsOutlined,
  'equipe/onboarding': AssignmentOutlined,
  'my-tasks': AssignmentTurnedInOutlined,
  'my-sched': TodayOutlined,
  revenue: ShowChartOutlined,
  statements: DescriptionOutlined,
  'comms/staff': SupportAgentOutlined,
  'comms/ota': MailOutlined,
  'comms/leads': PersonSearchOutlined,
  'comms/reviews': StarBorderOutlined,
  crm: InboxOutlined,
  requests: InboxOutlined,
  reviews: StarBorderOutlined,
  listings: HomeWorkOutlined,
  'dynamic-pricing': AutoGraphOutlined,
  'dynamic-pricing/portefeuille': InsightsOutlined,
  'dynamic-pricing/audit': HistoryOutlined,
  pricing: ShowChartOutlined,
  channels: HubOutlined,
  clients: PeopleOutlined,
  'temp/booking-clients': ShoppingBagOutlined,
  crm: PersonSearchOutlined,
  'crm/requests': InboxOutlined,
  'crm/leads': PersonSearchOutlined,
  'crm/support': SupportAgentOutlined,
  'crm/onboarding': AssignmentOutlined,
    'admin/monitor': AnalyticsOutlined,
    'admin/monitor/summary': DashboardOutlined,
    'admin/monitor/logs': DescriptionOutlined,
    'admin/monitor/metrics': ShowChartOutlined,
    'admin/monitor/rabbitmq': HubOutlined,
    'admin/monitor/whatsapp': ForumOutlined,
    'admin/monitor/ai': AutoAwesomeOutlined,
    'admin/monitor/infrastructure': PublicOutlined,
    'admin/sojori-logs': DescriptionOutlined,
    'admin/channels': HubOutlined,
    'admin/ChannelManager/channel-manager': HubOutlined,
    'admin/ChannelManager/distribution': ShowChartOutlined,
    'admin/equipe/owners': BusinessOutlined,
    'admin/equipe/staff': GroupsOutlined,
    'admin/equipe/whatsapp': ForumOutlined,
    'admin/equipe/roles': AdminPanelSettingsOutlined,
    'admin/equipe/groups': GroupsOutlined,
    'admin/settings/template': DescriptionOutlined,
    'admin/settings/host-profile': BusinessOutlined,
    'admin/settings/admin-config': PublicOutlined,
    'admin/setting/currency': ShowChartOutlined,
};

function NavItemIcon({ item, active, sub }) {
  if (sub) {
    return (
      <ChevronRight
        sx={{
          width: 16,
          height: 16,
          flexShrink: 0,
          opacity: active ? 0.85 : 0.4,
          color: 'inherit',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          transform: active ? 'translateX(1px)' : 'none',
        }}
      />
    );
  }

  // Priority 1: use iconType with colored SVG if available
  if (item.iconType) {
    return (
      <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconColored type={item.iconType} color={item.iconColor || '#666666'} size={18} />
      </Box>
    );
  }

  // Priority 2: fallback to MUI icon
  const Cmp = NAV_ICON_BY_ID[item.id];
  if (Cmp) {
    return (
      <Cmp
        sx={{
          width: 18,
          height: 18,
          flexShrink: 0,
          opacity: active ? 1 : 0.72,
          color: 'inherit',
          transition: 'opacity 0.18s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          transform: active ? 'scale(1.04)' : 'scale(1)',
        }}
      />
    );
  }

  // Priority 3: last fallback to emoji
  return (
    <Box sx={{ width: 18, display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.75, fontSize: 13 }}>
      {item.icon}
    </Box>
  );
}

function navItemMatchesPath(item, activePath) {
  if (activePath === item.id || activePath.startsWith(`${item.id}/`)) return true;
  if (item.sub?.some((s) => activePath === s.id || activePath.startsWith(`${s.id}/`))) return true;
  return false;
}

const SIDEBAR_SCROLL_KEY = 'sojori-sidebar-scroll';

export function AppSidebar({
  user,
  activePath = 'dashboard',
  onNavigate,
  onLogout,
  simulationActive = false,
  sidebarRowSpan = 1,
  variant = 'rail',
}) {
  const navGroups = useSidebarNav(user);
  const navScrollRef = React.useRef(null);

  React.useEffect(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'worker' && role !== 'staff') return;
    const itemCount = navGroups.reduce((n, g) => n + (g.items?.length || 0), 0);
    console.info('[worker-nav]', {
      role: user?.role,
      ownerAccess: user?.ownerAccess,
      grants: user?.featureGrants?.length ?? 0,
      navGroups: navGroups.length,
      items: itemCount,
    });
  }, [user?.role, user?.ownerAccess, user?.featureGrants, navGroups]);

  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sojori-sidebar-collapsed');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...NAV_DEFAULT_COLLAPSED, ...parsed };
      }
    } catch (error) {
      console.warn('Erreur chargement état sidebar:', error);
    }
    return { ...NAV_DEFAULT_COLLAPSED };
  });

  // Sauvegarder dans localStorage quand collapsed change
  React.useEffect(() => {
    try {
      localStorage.setItem('sojori-sidebar-collapsed', JSON.stringify(collapsed));
    } catch (error) {
      console.warn('Erreur sauvegarde état sidebar:', error);
    }
  }, [collapsed]);

  React.useLayoutEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
      if (saved != null) {
        const top = Number.parseInt(saved, 10);
        if (!Number.isNaN(top)) el.scrollTop = top;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistSidebarScroll = React.useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop));
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-ouvrir le groupe qui contient l'item actif
  React.useEffect(() => {
    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => navItemMatchesPath(item, activePath)),
    );
    if (activeGroup) {
      setCollapsed((prev) => ({ ...prev, [activeGroup.group]: false }));
    }
  }, [activePath, navGroups]);

  const toggleGroup = (groupName) => {
    setCollapsed(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <Box
      className={simulationActive ? 'sojori-sidebar-sim' : undefined}
      sx={{
      gridArea: variant === 'rail' ? 'sidebar' : undefined,
      display: variant === 'drawer' ? 'flex' : { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      bgcolor: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      borderRight: variant === 'drawer' ? 'none' : `1px solid rgba(23,19,13,0.08)`,
      position: variant === 'drawer' ? 'relative' : 'sticky',
      top: variant === 'drawer' ? undefined : 0,
      height: variant === 'drawer' ? '100%' : '100vh',
      overflow: 'hidden',
      boxShadow: '4px 0 24px rgba(0,0,0,0.03)',
      // Gradient overlay subtil
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(230,176,34,0.02) 0%, transparent 50%, rgba(139,92,246,0.02) 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      },
      '& > *': {
        position: 'relative',
        zIndex: 1,
      },
    }}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: 'center',
        p: '16px 20px',
        borderBottom: `1px solid ${t.border}`,
        minHeight: `${t.topbarH}px`,
        flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))',
        backdropFilter: 'blur(10px)',
      }}>
        <SojoriBrandLockup
          subtitleColor={t.text3}
          roleLabel={user?.role === 'Worker' ? 'Équipe terrain' : 'Orchestration logicielle'}
          iconSize={34}
        />
      </Stack>

      <Stack
        ref={navScrollRef}
        onScroll={persistSidebarScroll}
        spacing={0.5}
        sx={{
        p: '16px 14px',
        overflowY: 'auto',
        overflowX: 'hidden',
        flex: 1,
        minHeight: 0,
        // Smooth scrolling avec momentum (comme Claude Desktop)
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        // Performance GPU
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        // Scrollbar ultra-moderne
        '&::-webkit-scrollbar': {
          width: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
          m: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'linear-gradient(180deg, rgba(230,176,34,0.3), rgba(230,176,34,0.2))',
          borderRadius: '10px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            background: 'linear-gradient(180deg, rgba(230,176,34,0.5), rgba(230,176,34,0.3))',
            borderRadius: '10px',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
        },
      }}>
        {navGroups.map((group) => {
          const isCollapsed = collapsed[group.group] ?? true;
          const isCore = Boolean(group.core);
          return (
            <React.Fragment key={group.group}>
              <Box
                onClick={() => toggleGroup(group.group)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 700,
                  color: isCore ? t.ai : t.text2,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  p: '14px 12px 8px',
                  mx: '-2px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderRadius: '10px',
                  background: isCollapsed
                    ? 'transparent'
                    : isCore
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))'
                      : 'linear-gradient(135deg, rgba(230,176,34,0.04), rgba(230,176,34,0.01))',
                  borderLeft: isCollapsed ? 'none' : isCore ? `2px solid rgba(139,92,246,0.35)` : `2px solid rgba(230,176,34,0.3)`,
                  pl: isCollapsed ? '12px' : '14px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    color: t.text,
                    bgcolor: isCore ? 'rgba(139,92,246,0.06)' : 'rgba(230,176,34,0.06)',
                    borderLeft: isCore ? `2px solid rgba(139,92,246,0.5)` : `2px solid rgba(230,176,34,0.5)`,
                    pl: '14px',
                  },
                }}
              >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <span>{group.group}</span>
                  {isCore ? (
                    <Chip label="CORE" size="small" sx={{ height: 16, fontSize: 9, fontWeight: 800, bgcolor: t.aiTint, color: t.ai }} />
                  ) : null}
                </Stack>
                <ExpandMore
                  sx={{
                    fontSize: 19,
                    color: 'currentColor',
                    opacity: 0.6,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}
                />
              </Box>
              {!isCollapsed && group.items.map((item) => (
                <React.Fragment key={item.id}>
                  <SideLink
                    item={item}
                    active={navItemMatchesPath(item, activePath)}
                    disabled={Boolean(item.navDisabled && item.sub?.length)}
                    onClick={() => {
                      if (item.navDisabled && item.sub?.length) return;
                      onNavigate?.(item.id);
                    }}
                  />
                  {item.sub?.map((s) => (
                    <SideLink
                      key={s.id}
                      item={s}
                      sub
                      active={activePath === s.id}
                      onClick={() => onNavigate?.(s.id)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </Stack>

      {user ? <SidebarUserProfileMenu user={user} onLogout={onLogout} /> : null}
    </Box>
  );
}

function SideLink({ item, active, sub, disabled, onClick }) {
  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
  };

  return (
    <Box component="button" onClick={handleClick} disabled={disabled} sx={{
      all: 'unset', cursor: disabled ? 'default' : 'pointer', width: '100%', textAlign: 'left',
      opacity: disabled ? 0.92 : 1,
      display: 'flex', alignItems: 'center', gap: sub ? 1.2 : 1.3,
      p: sub ? '7px 12px 7px 16px' : '9px 12px',
      ml: sub ? 1.5 : 0,
      borderRadius: '10px',
      fontSize: sub ? 12.5 : 13,
      color: active ? t.text : (sub ? t.text3 : t.text2),
      fontWeight: active ? 600 : (sub ? 500 : 550),
      bgcolor: active ? 'linear-gradient(135deg, rgba(230,176,34,0.12), rgba(230,176,34,0.08))' : 'transparent',
      border: active ? `1px solid rgba(230,176,34,0.25)` : '1px solid transparent',
      boxShadow: active ? '0 2px 8px rgba(230,176,34,0.15), inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
      transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      '&:hover': {
        bgcolor: active ? 'linear-gradient(135deg, rgba(230,176,34,0.15), rgba(230,176,34,0.1))' : 'rgba(23,19,13,0.04)',
        color: t.text,
        transform: sub ? 'translateX(2px)' : 'translateX(1px)',
        border: `1px solid ${active ? 'rgba(230,176,34,0.3)' : 'rgba(23,19,13,0.08)'}`,
        boxShadow: active ? '0 4px 12px rgba(230,176,34,0.2), inset 0 1px 0 rgba(255,255,255,0.5)' : '0 2px 6px rgba(0,0,0,0.04)',
      },
      '&:active': { transform: 'scale(0.98)' },
      '&::before': active && !sub ? {
        content: '""',
        position: 'absolute',
        left: -10,
        width: 3,
        height: 20,
        bgcolor: t.primary,
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px rgba(230,176,34,0.4)',
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: sub ? 20 : 22, flexShrink: 0 }}>
        <NavItemIcon item={item} active={active} sub={sub} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, letterSpacing: '-0.1px' }}>{item.label}</Box>
      {item.badge && (
        <Box sx={{
          fontFamily: 'Geist Mono, monospace', fontSize: 9.5, fontWeight: 700,
          p: '2px 7px', borderRadius: '12px',
          bgcolor: item.badgeRed ? 'linear-gradient(135deg, #ef4444, #dc2626)' : (active ? 'rgba(255,255,255,0.9)' : 'rgba(23,19,13,0.06)'),
          color: item.badgeRed ? '#fff' : (active ? t.primaryDeep : t.text3),
          border: item.badgeRed ? 'none' : `1px solid ${active ? 'rgba(230,176,34,0.2)' : 'rgba(23,19,13,0.08)'}`,
          boxShadow: item.badgeRed ? '0 2px 6px rgba(239,68,68,0.3)' : (active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'),
        }}>{item.badge}</Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 3. TopBar
// ════════════════════════════════════════════════════════════════════

export function TopBar({
  breadcrumb = [],
  compact = false,
  simulationActive = false,
  adminScopeInTopBar = false,
  onMenuClick,
}) {
  return (
    <Box
      className={simulationActive ? 'sojori-topbar-sim' : undefined}
      sx={{
      gridArea: 'topbar',
      bgcolor: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(16px) saturate(1.2)',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center', gap: 1.5, px: compact ? LISTING_LAYOUT.topBarPadX : 3,
      position: 'sticky', top: 0, zIndex: 30,
      flexWrap: { xs: 'wrap', lg: 'nowrap' },
      minHeight: t.topbarH,
      py: { xs: 0.75, lg: 0 },
    }}>
      {onMenuClick ? (
        <IconButton
          onClick={onMenuClick}
          aria-label="Ouvrir le menu de navigation"
          sx={{ ...iconBtnSx, display: { xs: 'inline-flex', md: 'none' }, flexShrink: 0 }}
        >
          <MenuIcon sx={{ fontSize: 22 }} />
        </IconButton>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, fontSize: 12.5, color: t.text2, flexShrink: 0 }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={`breadcrumb-${i}-${b}`}>
            <Typography sx={{
              fontSize: 12.5,
              color: i === breadcrumb.length - 1 ? t.text : t.text2,
              fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
            }}>{b}</Typography>
            {i < breadcrumb.length - 1 && <Box sx={{ color: t.text4 }}>›</Box>}
          </React.Fragment>
        ))}
      </Stack>

      {adminScopeInTopBar ? <AdminBusinessScopeTopFilter /> : null}

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 'auto' }}>
        <AdminSessionTopBarButton />
        <Tooltip title="Notifications">
          <IconButton sx={iconBtnSx} aria-label="Notifications">
            <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
            <Box sx={{
              position: 'absolute', top: 7, right: 8,
              width: 7, height: 7, borderRadius: '50%',
              bgcolor: t.error, border: `2px solid ${t.bg1}`,
            }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Aide">
          <IconButton sx={iconBtnSx} aria-label="Aide">
            <HelpOutlineOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Paramètres">
          <IconButton sx={iconBtnSx} aria-label="Paramètres">
            <SettingsOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

const iconBtnSx = {
  width: 36, height: 36, borderRadius: '9px',
  color: t.text2,
  transition: 'background-color 0.18s ease, color 0.18s ease, transform 0.18s ease',
  '&:hover': { bgcolor: t.bg2, color: t.text, transform: 'translateY(-1px)' },
  position: 'relative',
};

// ════════════════════════════════════════════════════════════════════
// 4. PageHeader & buttons
// ════════════════════════════════════════════════════════════════════

export const pageMetaChipSx = pageMetaChipSxBase;

export function PageMetaChip({ children }) {
  return <Box component="span" sx={pageMetaChipSx}>{children}</Box>;
}

export function PageMetaRow({ children, sx }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        flexWrap: 'wrap',
        rowGap: 0.75,
        columnGap: 1,
        mb: 1.5,
        mt: -0.5,
        ...sx,
      }}
    >
      {children}
    </Stack>
  );
}

export function PageHeader({ title, count, children }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        mb: 3,
        pb: 2,
        borderBottom: `1px solid ${t.border}`,
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          component="h1"
          sx={{
            fontSize: { xs: '1.2rem', sm: '1.45rem' },
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: t.text,
            lineHeight: 1.2,
            m: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {title}
          {count && (
            <Box component="span" sx={pageMetaChipSx}>{count}</Box>
          )}
        </Box>
      </Box>
      {children ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexShrink: 0,
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 1,
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {children}
        </Stack>
      ) : null}
    </Stack>
  );
}

export const btnPrimarySx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: 1.25,
  px: 1.75,
  py: 0.875,
  minHeight: 36,
  background: 'linear-gradient(180deg, #cb9b2c 0%, #b8851a 100%)',
  color: '#1a1408',
  boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
  transition: 'background 140ms ease, box-shadow 140ms ease, transform 100ms ease',
  '&:hover': {
    background: 'linear-gradient(180deg, #d4a432 0%, #b8851a 100%)',
    boxShadow: '0 2px 6px rgba(135,97,25,0.36), inset 0 1px 0 rgba(255,255,255,0.30)',
  },
  '&:active': { transform: 'translateY(0.5px)' },
  '&:focus-visible': {
    outline: '2px solid rgba(184,133,26,0.55)',
    outlineOffset: 2,
  },
};
export const btnGhostSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: 1.25,
  px: 1.75,
  py: 0.875,
  minHeight: 36,
  border: '1px solid rgba(20,17,10,0.14)',
  bgcolor: '#ffffff',
  color: '#14110a',
  transition: 'background 140ms ease, border-color 140ms ease',
  '&:hover': {
    bgcolor: '#fafaf7',
    borderColor: 'rgba(20,17,10,0.22)',
  },
};
export const btnAiSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: 1.25,
  px: 1.75,
  py: 0.875,
  minHeight: 36,
  background: 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)',
  color: '#ffffff',
  boxShadow: '0 1px 2px rgba(76,29,149,0.25), inset 0 1px 0 rgba(255,255,255,0.20)',
  transition: 'background 140ms ease, box-shadow 140ms ease, transform 100ms ease',
  '&:hover': {
    background: 'linear-gradient(180deg, #9669f7 0%, #7c3aed 100%)',
    boxShadow: '0 2px 6px rgba(76,29,149,0.32), inset 0 1px 0 rgba(255,255,255,0.20)',
  },
  '&:active': { transform: 'translateY(0.5px)' },
};
export const btnSmSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.75rem',
  borderRadius: 1,
  px: 1.25,
  py: 0.5,
  minHeight: 28,
};

// ════════════════════════════════════════════════════════════════════
// 5. Stat cards
// ════════════════════════════════════════════════════════════════════

export function StatsRow({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.75, mb: 2.75 }}>
      {children}
    </Box>
  );
}

export function StatCard({ icon, iconBg, iconColor, value, label, trend, trendUp = true }) {
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '10px', p: 2.25,
      transition: 'box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      '&:hover': {
        boxShadow: '0 10px 28px rgba(23,19,13,0.08)',
        borderColor: t.borderStrong,
        transform: 'translateY(-2px)',
      },
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '7px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, bgcolor: iconBg, color: iconColor,
        }}>{icon}</Box>
        {trend && (
          <Box sx={{
            fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono',
            p: '2px 7px', borderRadius: '5px',
            bgcolor: trendUp ? t.successTint : t.errorTint,
            color: trendUp ? t.success : t.error,
          }}>{trendUp ? '↑' : '↓'} {trend}</Box>
        )}
      </Stack>
      <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, color: t.text3, mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 6. Badge / SourcePill / ViewToggle / FilterChip / FilterBar
// ════════════════════════════════════════════════════════════════════

const badgeColors = {
  success: { bg: t.successTint, color: '#047857' },
  warning: { bg: t.warningTint, color: '#b45309' },
  error:   { bg: t.errorTint,   color: '#b91c1c' },
  info:    { bg: t.infoTint,    color: '#0e7490' },
  ai:      { bg: t.aiTint,      color: t.ai },
  gold:    { bg: t.primaryTint, color: t.primaryDeep },
  neutral: { bg: t.bg2,         color: t.text3 },
};

export function Badge({ variant = 'neutral', dot, children }) {
  const c = badgeColors[variant];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      p: '3px 9px', borderRadius: '99px',
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
      bgcolor: c.bg, color: c.color,
    }}>
      {dot && <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />}
      {children}
    </Box>
  );
}

const OTA = {
  airbnb:  { bg: '#FF5A5F', logo: 'A' },
  booking: { bg: '#003580', logo: 'B' },
  vrbo:    { bg: '#0E64A4', logo: 'V' },
  direct:  { bg: t.success, logo: 'D' },
};
export function SourcePill({ source }) {
  const s = OTA[source] || OTA.airbnb;
  const label = source.charAt(0).toUpperCase() + source.slice(1);
  return (
    <Stack direction="row" spacing={0.625} sx={{
      display: 'inline-flex', p: '2px 8px', borderRadius: '99px',
      bgcolor: t.bg2, border: `1px solid ${t.border}`,
      fontSize: 11, color: t.text2, fontWeight: 500, alignItems: 'center',
    }}>
      <Box sx={{
        width: 14, height: 14, borderRadius: '3px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 800, color: '#fff', bgcolor: s.bg,
      }}>{s.logo}</Box>
      {label}
    </Stack>
  );
}

export function ViewToggle({ options, value, onChange }) {
  return (
    <Box sx={{
      display: 'inline-flex', gap: 0.25, p: 0.375,
      bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '9px',
    }}>
      {options.map(o => (
        <Button key={o.value} onClick={() => onChange?.(o.value)} sx={{
          px: 1.375, py: 0.625, borderRadius: '7px',
          fontSize: 11.5, fontWeight: 600, textTransform: 'none', minWidth: 0,
          color: value === o.value ? t.text : t.text2,
          bgcolor: value === o.value ? t.bg1 : 'transparent',
          boxShadow: value === o.value ? '0 1px 2px rgba(26,20,8,0.06)' : 'none',
          '&:hover': { bgcolor: value === o.value ? t.bg1 : 'transparent' },
        }}>{o.label}</Button>
      ))}
    </Box>
  );
}

export function FilterChip({ label, active, dropdown, onClick }) {
  return (
    <Button onClick={onClick} sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75,
      px: 1.375, py: 0.75, borderRadius: '7px',
      bgcolor: active ? t.primaryTint : t.bg1,
      border: '1px solid', borderColor: active ? 'rgba(230,176,34,0.35)' : t.border,
      fontSize: 12, color: active ? t.text : t.text2, fontWeight: active ? 600 : 500,
      textTransform: 'none', minWidth: 0,
      '&:hover': { bgcolor: t.bg2, borderColor: t.borderStrong },
    }}>
      {label}
      {dropdown && <Box sx={{ fontSize: 9, opacity: 0.5, ml: 0.25 }}>▼</Box>}
    </Button>
  );
}

export function FilterBar({ children }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.75, rowGap: 1 }}>
      {children}
    </Stack>
  );
}

// ════════════════════════════════════════════════════════════════════
// 7. DataTable (CORE — sortable, selectable, with row actions)
// ════════════════════════════════════════════════════════════════════

export function DataTable({
  columns,
  rows,
  selectable,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  footer,
  /** Masque la colonne vide avec icônes (pour tables larges type liste tâches partners). */
  hideRowActions = false,
  /** Largeur minimale du tableau (ex. 2000) pour scroll horizontal avec colonnes fixes. */
  tableMinWidth,
  /** Colonnes serrées, layout fixed, sans scroll horizontal forcé (liste tâches). */
  compact = false,
  /** Lignes ultra-denses (liste tâches / réservations). */
  ultraCompact = false,
  /** Style des en-têtes (partners = titres mixtes, pas tout en majuscules). */
  headerTextTransform = 'uppercase',
}) {
  const toggleRow = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onSelectionChange?.(next);
  };

  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
    }}>
      <Box sx={{ overflowX: tableMinWidth ? 'auto' : compact ? 'hidden' : 'visible', width: '100%' }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          minWidth: tableMinWidth || '100%',
          borderCollapse: 'collapse',
          fontSize: ultraCompact ? 11 : compact ? 12 : 12.5,
          tableLayout: (tableMinWidth || compact) ? 'fixed' : 'auto',
        }}
      >
        <Box component="thead" sx={ultraCompact ? { position: 'sticky', top: 0, zIndex: 2 } : undefined}>
          <Box component="tr">
            {selectable && <Box component="th" sx={thSx} style={{ width: 36 }}><Checkbox /></Box>}
            {columns.map(col => (
              <Box
                component="th"
                key={col.key}
                sx={{
                  ...thSx,
                  ...(ultraCompact ? ultraCompactThSx : compact ? compactThSx : null),
                  textAlign: col.align || 'left',
                  width: col.width,
                  maxWidth: col.width,
                  textTransform: col.headerTextTransform ?? headerTextTransform,
                  ...(ultraCompact ? { bgcolor: t.bg2 } : {}),
                }}
              >
                {col.label} {col.sortable && <Box component="span" sx={{ opacity: 0.4, ml: 0.5, fontSize: 9 }}>↕</Box>}
              </Box>
            ))}
            {!hideRowActions && <Box component="th" sx={thSx} style={{ width: 60 }} />}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map(row => {
            const selected = selectedIds.includes(row.id);
            return (
              <Box component="tr" key={row.id} onClick={() => onRowClick?.(row)} sx={{
                transition: 'background 0.12s',
                bgcolor: selected ? t.primaryTint : 'transparent',
                '&:hover': { bgcolor: selected ? t.primaryTint : t.bg2 },
                '&:hover .row-actions': { opacity: 1 },
                cursor: onRowClick ? 'pointer' : 'default',
              }}>
                {selectable && (
                  <Box component="td" sx={{
                    ...tdSx,
                    boxShadow: selected ? `inset 3px 0 0 ${t.primary}` : 'none',
                  }}>
                    <Checkbox checked={selected} onChange={() => toggleRow(row.id)} />
                  </Box>
                )}
                {columns.map(col => (
                  <Box component="td" key={col.key} sx={{ ...tdSx, ...(ultraCompact ? ultraCompactTdSx : compact ? compactTdSx : null), textAlign: col.align || 'left', maxWidth: col.width, overflow: (compact || ultraCompact) ? 'hidden' : undefined }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </Box>
                ))}
                {!hideRowActions && (
                  <Box component="td" sx={tdSx}>
                    <Stack direction="row" spacing={0.25} className="row-actions" sx={{
                      justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.15s',
                    }}>
                      <IconButton size="small" sx={rowActionSx}>💬</IconButton>
                      <IconButton size="small" sx={rowActionSx}>⋮</IconButton>
                    </Stack>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
      </Box>
      {footer && (
        <Stack direction="row" sx={{
          alignItems: 'center', justifyContent: 'space-between',
          p: '11px 16px', borderTop: `1px solid ${t.border}`,
          fontSize: 12, color: t.text3, bgcolor: t.bg2,
        }}>{footer}</Stack>
      )}
    </Box>
  );
}

const thSx = {
  p: '11px 14px', bgcolor: t.bg2,
  fontSize: 11, fontWeight: 600, color: t.text3,
  letterSpacing: 0.4, textTransform: 'uppercase',
  borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap',
};
const compactThSx = { p: '8px 6px', fontSize: 10, letterSpacing: 0.2 };
const ultraCompactThSx = { p: '3px 5px', fontSize: 9, letterSpacing: 0.12, lineHeight: 1.1 };
const tdSx = { p: '12px 14px', borderBottom: `1px solid ${t.border}`, verticalAlign: 'middle' };
const compactTdSx = { p: '8px 6px' };
const ultraCompactTdSx = { p: '2px 5px', fontSize: 10.5, lineHeight: 1.15 };
const rowActionSx = {
  width: 26, height: 26, borderRadius: '6px',
  color: t.text3, fontSize: 14,
  '&:hover': { bgcolor: t.bg3, color: t.text },
};

export function Checkbox({ checked, onChange }) {
  return (
    <Box onClick={onChange} sx={{
      width: 16, height: 16, borderRadius: '4px',
      border: `1.5px solid ${t.borderStrong}`,
      bgcolor: checked ? t.primary : t.bg1,
      borderColor: checked ? t.primaryDeep : t.borderStrong,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.15s',
      fontSize: 11, fontWeight: 800,
      color: t.text,
    }}>{checked ? '✓' : ''}</Box>
  );
}

// Pagination helper
export function Pagination({ page, totalPages, onChange }) {
  const pages = totalPages <= 4
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [1, 2, 3, '…', totalPages];
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
      <PaginationBtn onClick={() => onChange?.(Math.max(1, page - 1))}>‹</PaginationBtn>
      {pages.map((p, i) =>
        p === '…' ? <Box key={`ellipsis-${i}`} sx={{ color: t.text4, px: 0.5 }}>…</Box>
        : <PaginationBtn key={`page-${p}`} active={page === p} onClick={() => onChange?.(p)}>{p}</PaginationBtn>
      )}
      <PaginationBtn onClick={() => onChange?.(Math.min(totalPages, page + 1))}>›</PaginationBtn>
    </Stack>
  );
}
function PaginationBtn({ active, onClick, children }) {
  return (
    <Button onClick={onClick} sx={{
      minWidth: 28, height: 28, p: '0 8px', borderRadius: '6px',
      fontSize: 12, fontWeight: 600, textTransform: 'none',
      bgcolor: active ? t.text : 'transparent',
      color: active ? '#fff' : t.text2,
      '&:hover': { bgcolor: active ? t.text : t.bg3, color: active ? '#fff' : t.text },
    }}>{children}</Button>
  );
}

// ════════════════════════════════════════════════════════════════════
// 8. GuestCell / ListingCell helpers (for DataTable columns)
// ════════════════════════════════════════════════════════════════════

const avaColors = {
  violet: 'linear-gradient(135deg,#c4b5fd,#8b5cf6)',
  cyan:   'linear-gradient(135deg,#67e8f9,#06b6d4)',
  pink:   'linear-gradient(135deg,#f9a8d4,#ec4899)',
  green:  'linear-gradient(135deg,#86efac,#16a34a)',
  gold:   'linear-gradient(135deg,#fde68a,#d97706)',
};
const thumbColors = {
  gold:   'linear-gradient(135deg,#fde68a,#d97706)',
  blue:   'linear-gradient(135deg,#a5f3fc,#0e7490)',
  purple: 'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  green:  'linear-gradient(135deg,#86efac,#16a34a)',
  pink:   'linear-gradient(135deg,#fda4af,#ec4899)',
};

export function GuestCell({ name, initials, meta, color = 'gold' }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Avatar sx={{ width: 28, height: 28, fontSize: 10.5, fontWeight: 700,
        background: avaColors[color], color: '#fff' }}>{initials}</Avatar>
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 12.5, color: t.text }}>{name}</Typography>
        <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.125 }}>{meta}</Typography>
      </Box>
    </Stack>
  );
}

export function ListingCell({ name, color = 'gold' }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '6px', flexShrink: 0,
        background: thumbColors[color],
      }} />
      <Typography sx={{ fontSize: 12.5 }}>{name}</Typography>
    </Stack>
  );
}

export function Revenue({ amount, small }) {
  return (
    <Box>
      <Box sx={{ fontFamily: 'Geist Mono', fontWeight: 700, fontSize: 12.5, letterSpacing: '-0.2px' }}>{amount}</Box>
      {small && <Box sx={{ color: t.text3, fontWeight: 500, fontSize: 10.5, fontFamily: 'Geist Mono' }}>{small}</Box>}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 9. OrchestrationTimeline
// ════════════════════════════════════════════════════════════════════

export function OrchestrationTimeline({ children }) {
  return (
    <Box sx={{
      position: 'relative', pl: 3,
      '&::before': {
        content: '""', position: 'absolute',
        left: 7, top: 8, bottom: 8, width: 2,
        background: `linear-gradient(180deg, ${t.success}, ${t.success} 60%, ${t.borderStrong})`,
      },
    }}>{children}</Box>
  );
}

export function TLDayLabel({ children }) {
  return (
    <Typography sx={{
      fontFamily: 'Geist Mono', fontSize: 10, color: t.text3,
      letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700,
      p: '16px 0 8px 4px',
    }}>━━ {children} ━━</Typography>
  );
}

export function TLEvent({
  time,
  future,
  critical,
  icon,
  iconBg,
  iconColor,
  title,
  badge,
  meta,
  quote,
  children,
  onClick,
}) {
  const interactive = typeof onClick === 'function';

  return (
    <Box sx={{
      position: 'relative', mb: 2.5, pl: 0.5,
      '&:last-child': { mb: 0 },
      '&::before': {
        content: '""', position: 'absolute', left: -22, top: 5,
        width: 12, height: 12, borderRadius: '50%',
        bgcolor: future ? t.bg1 : (critical ? t.error : t.success),
        border: future ? `2px dashed ${t.borderStrong}` : `2px solid ${t.bg1}`,
        boxShadow: future ? 'none' : `0 0 0 ${critical ? '4px' : '2px'} ${critical ? t.errorTint : t.successTint}`,
      },
      opacity: future ? 0.65 : 1,
    }}>
      <Typography sx={{
        fontFamily: 'Geist Mono', fontSize: 11, color: t.text3,
        letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600, mb: 0.5,
      }}>{time}</Typography>
      <Box
        onClick={onClick}
        onKeyDown={(event) => {
          if (!interactive) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        sx={{
          bgcolor: t.bg1,
          border: '1px solid',
          borderColor: t.border,
          borderStyle: future ? 'dashed' : 'solid',
          borderRadius: '9px',
          p: '12px 14px',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
          '&:hover': interactive
            ? {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(26,20,8,0.08)',
                borderColor: t.borderStrong,
              }
            : undefined,
          '&:focus-visible': interactive
            ? {
                outline: `2px solid ${t.primary}`,
                outlineOffset: 2,
              }
            : undefined,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Box sx={{
            width: 22, height: 22, borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, bgcolor: iconBg, color: iconColor, flexShrink: 0,
          }}>{icon}</Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{title}</Typography>
          {badge}
        </Stack>
        {meta && <Typography sx={{ fontSize: 11.5, color: t.text3 }} dangerouslySetInnerHTML={{ __html: meta }} />}
        {quote && (
          <Box sx={{
            mt: 0.75, p: '8px 10px', bgcolor: t.bg2, borderRadius: '6px',
            fontSize: 12, color: t.text2, fontStyle: 'italic',
            borderLeft: `2px solid ${t.borderStrong}`,
          }}>{quote}</Box>
        )}
        {children}
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 10. CalendarGantt (multi-property)
// ════════════════════════════════════════════════════════════════════

export function CalendarGantt({ days = 21, properties = [], bookings = [], todayIdx = 4 }) {
  const dayCells = Array.from({ length: days }, (_, i) => {
    const d = new Date(2026, 4, 12 + i);
    return {
      n: d.getDate(),
      dow: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()],
      weekend: d.getDay() === 0 || d.getDay() === 6,
      today: i === todayIdx,
    };
  });

  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
    }}>
      {/* Head */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr',
        borderBottom: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
        <Box sx={{
          p: '10px 14px', fontSize: 11, fontFamily: 'Geist Mono', fontWeight: 600,
          color: t.text3, letterSpacing: 0.6, textTransform: 'uppercase',
          borderRight: `1px solid ${t.border}`, alignSelf: 'center',
        }}>Listing</Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)` }}>
          {dayCells.map((d, i) => (
            <Box key={`header-day-${i}-${d.n}`} sx={{
              p: '7px 0', textAlign: 'center',
              borderLeft: `1px solid ${t.border}`,
              fontSize: 10.5, fontFamily: 'Geist Mono',
              color: d.today ? t.primaryDeep : t.text3,
              fontWeight: d.today ? 700 : 400,
              bgcolor: d.today ? t.primaryTint : d.weekend ? 'rgba(26,20,8,0.02)' : 'transparent',
            }}>
              {d.dow}
              <Box sx={{
                fontSize: 13, fontWeight: 700,
                color: d.today ? t.primaryDeep : t.text,
              }}>{d.n}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Rows */}
      {properties.map((p, pi) => (
        <Box key={`property-${pi}-${p.name}`} sx={{
          display: 'grid', gridTemplateColumns: '160px 1fr',
          borderBottom: pi < properties.length - 1 ? `1px solid ${t.border}` : 0,
          minHeight: 56,
        }}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: 'center',
            p: '10px 14px', borderRight: `1px solid ${t.border}`, bgcolor: t.bg1,
          }}>
            <Box sx={{ width: 26, height: 26, borderRadius: '6px', flexShrink: 0,
              background: thumbColors[p.color] || thumbColors.gold }} />
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1 }}>{p.name}</Typography>
              <Typography sx={{ fontSize: 10.5, color: t.text3, mt: 0.25, fontFamily: 'Geist Mono' }}>{p.city}</Typography>
            </Box>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)`, position: 'relative', alignItems: 'center' }}>
            {dayCells.map((d, i) => (
              <Box key={`cell-${pi}-${i}-${d.n}`} sx={{
                borderLeft: `1px solid ${t.border}`, height: '100%',
                bgcolor: d.today ? 'rgba(230,176,34,0.05)' : d.weekend ? 'rgba(26,20,8,0.02)' : 'transparent',
              }} />
            ))}
            {bookings.filter(b => b.prop === pi).map((b, i) => (
              <CalBooking key={`booking-${pi}-${b.start}-${i}`} {...b} totalDays={days} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function CalBooking({ start, length, status, label, price, totalDays }) {
  const colors = {
    confirmed: 'linear-gradient(135deg,#10b981,#047857)',
    pending:   'linear-gradient(135deg,#f59e0b,#b45309)',
    blocked:   'repeating-linear-gradient(45deg,#d1d5db,#d1d5db 4px,#e5e7eb 4px,#e5e7eb 8px)',
  };
  return (
    <Box sx={{
      position: 'absolute', top: 9, height: 38,
      left: `calc(${(start / totalDays) * 100}% + 4px)`,
      width: `calc(${(length / totalDays) * 100}% - 8px)`,
      borderRadius: '7px',
      display: 'flex', alignItems: 'center', gap: 1,
      px: 1.25, fontSize: 11.5, fontWeight: 600,
      color: status === 'blocked' ? t.text2 : '#fff',
      background: colors[status],
      boxShadow: '0 2px 6px rgba(26,20,8,0.10)',
      cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(26,20,8,0.15)' },
    }}>
      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</Box>
      {price && <Box sx={{ fontFamily: 'Geist Mono', fontSize: 10.5, opacity: 0.85 }}>{price}</Box>}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 11. KanbanBoard (Tasks)
// ════════════════════════════════════════════════════════════════════

export function KanbanBoard({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.75 }}>
      {children}
    </Box>
  );
}

const colDotColors = { todo: '#94a3b8', doing: t.info, review: t.warning, done: t.success };

export function KanbanColumn({ status, label, count, children, addable }) {
  return (
    <Box sx={{
      bgcolor: t.bg2, border: `1px solid ${t.border}`,
      borderRadius: '11px', p: 1.75, minHeight: 400,
    }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colDotColors[status] }} />
        <Typography sx={{
          fontSize: 11, fontWeight: 700, fontFamily: 'Geist Mono',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>{label}</Typography>
        <Typography sx={{ fontFamily: 'Geist Mono', fontSize: 10.5, color: t.text3 }}>{count}</Typography>
        {addable && (
          <IconButton sx={{
            ml: 'auto', width: 22, height: 22, borderRadius: '5px',
            color: t.text3, fontSize: 14,
            '&:hover': { bgcolor: t.bg3, color: t.text },
          }}>＋</IconButton>
        )}
      </Stack>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

export function TaskCard({ priority = 'low', type, title, listing, assignee, deadline, urgent, completed }) {
  const priorityColor = { high: t.error, med: t.warning, low: t.info }[priority];
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '9px', p: '11px 12px', mb: 0,
      cursor: 'grab', transition: 'all 0.15s',
      borderLeft: `3px solid ${priorityColor}`,
      opacity: completed ? 0.72 : 1,
      '&:hover': { boxShadow: '0 4px 10px rgba(26,20,8,0.08)', borderColor: t.borderStrong, borderLeftColor: priorityColor },
    }}>
      <Stack direction="row" spacing={0.75} sx={{
        mb: 0.875, fontSize: 10.5, color: t.text3,
        fontFamily: 'Geist Mono', letterSpacing: 0.3, alignItems: 'center',
      }}>
        <Box sx={{ fontSize: 11 }}>{type?.icon}</Box>
        <Box>{type?.label}</Box>
      </Stack>
      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, mb: 1 }}>{title}</Typography>
      {listing && (
        <Typography sx={{ fontSize: 11, color: t.text3, mb: 1.25,
          display: 'flex', alignItems: 'center', gap: 0.625,
        }}>📍 {listing}</Typography>
      )}
      <Stack direction="row" spacing={0.75} sx={{
        alignItems: 'center', fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono',
      }}>
        {assignee && (
          <>
            <Avatar sx={{ width: 20, height: 20, fontSize: 8.5, fontWeight: 700,
              background: avaColors[assignee.color] || avaColors.gold }}>{assignee.initials}</Avatar>
            <Box>{assignee.name}</Box>
          </>
        )}
        {deadline && (
          <Box sx={{
            ml: 'auto !important', p: '2px 6px', borderRadius: '4px',
            bgcolor: completed ? t.successTint : urgent ? t.errorTint : t.bg2,
            color: completed ? t.success : urgent ? t.error : t.text3,
            letterSpacing: 0.3,
          }}>{deadline}</Box>
        )}
      </Stack>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 12. ChatLayout (Communications WhatsApp)
// ════════════════════════════════════════════════════════════════════

export const ChatLayout = React.memo(function ChatLayout({ children, mobileView = 'both' }) {
  // mobileView: 'list' | 'chat' | 'both'
  // Sur desktop: toujours 'both' (3 colonnes)
  // Sur mobile: 'list' (liste seule) ou 'chat' (messages seuls)

  console.log('📱 ChatLayout render:', {
    mobileView,
    childrenCount: React.Children.count(children)
  });

  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px',
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',  // Mobile: 1 colonne
        md: '300px 1fr 280px',  // Desktop: 3 colonnes
        lg: '320px 1fr 300px'  // Large: 3 colonnes plus larges
      },
      height: 'calc(100vh - 200px)',  // ✅ Hauteur dynamique
      minHeight: 660,                 // ✅ Minimum
      maxHeight: 'calc(100vh - 180px)', // ✅ Maximum
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
      // Sur mobile, gérer quelle colonne est visible
      '& > *': {
        display: {
          xs: 'none',  // Par défaut caché sur mobile
          md: 'block'  // Tout visible sur desktop
        },
        height: '100%',
        minHeight: 0,  // ← FIX FLEX CRITIQUE: permet overflow
        minWidth: 0,   // ← Pour ellipsis dans la liste
        overflow: 'hidden',  // ← Chaque colonne contient son scroll
      },
      // Sur mobile, afficher selon mobileView
      '& > *:nth-of-type(1)': {  // ConversationList
        display: {
          xs: mobileView === 'list' || mobileView === 'both' ? 'block' : 'none',
          md: 'block'
        }
      },
      '& > *:nth-of-type(2)': {  // ChatThread
        display: {
          xs: mobileView === 'chat' ? 'block' : 'none',
          md: 'flex'
        }
      },
      '& > *:nth-of-type(3)': {  // ChatAside
        display: {
          xs: 'none',  // Toujours caché sur mobile
          md: 'block'
        }
      },
    }}>{children}</Box>
  );
});

export function ConversationList({ conversations, activeId, onSelect }) {
  console.log('🔍 ConversationList render:', {
    conversationsCount: conversations?.length || 0,
    activeId,
    hasOnSelect: !!onSelect
  });

  return (
    <Box sx={{
      height: '100%',
      minHeight: 0,  // ← FIX FLEX
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid ${t.border}`
    }}>
      {/* Header fixe - ne scroll jamais */}
      <Box sx={{
        p: '14px 16px',
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.bg2,
        flexShrink: 0  // Ne shrink jamais, reste toujours visible
      }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: 'center',
          bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '7px',
          py: 0.75, px: 1.25, fontSize: 12, color: t.text3,
        }}>
          🔍<Box>Rechercher conversation…</Box>
        </Stack>
      </Box>

      {/* Liste scrollable - prend le reste de l'espace */}
      <Box sx={{
        flex: 1,
        minHeight: 0,  // ← FIX FLEX OBLIGATOIRE
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',  // ← Empêche cascade au parent
      }}>
        {conversations.map(c => (
          <ConversationItem key={c.id} conv={c} active={activeId === c.id} onClick={() => onSelect?.(c.id)} />
        ))}
      </Box>
    </Box>
  );
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <Box onClick={onClick} sx={{
      p: '12px 16px', pl: active ? '13px' : '16px',
      borderBottom: `1px solid ${t.border}`,
      cursor: 'pointer', transition: 'background 0.12s',
      display: 'flex', gap: 1.25,
      bgcolor: active ? t.primaryTint : 'transparent',
      borderLeft: active ? `3px solid ${t.primary}` : 'none',
      '&:hover': { bgcolor: active ? t.primaryTint : t.bg2 },
    }}>
      <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700,
        background: avaColors[conv.color] || avaColors.gold }}>{conv.initials}</Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.375 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.name}</Typography>
          <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'Geist Mono' }}>{conv.when}</Typography>
        </Stack>
        <Typography sx={{
          fontSize: 11.5,
          color: conv.unread ? t.text : t.text3,
          fontWeight: conv.unread ? 500 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{conv.preview}</Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.375 }}>
          <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'Geist Mono',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>📍 {conv.listing}</Typography>
          {conv.unreadCount > 0 && (
            <Box sx={{
              bgcolor: t.primary, color: t.text,
              fontFamily: 'Geist Mono', fontSize: 10, fontWeight: 800,
              p: '1px 6px', borderRadius: '99px',
            }}>{conv.unreadCount}</Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export function ChatThread({ conv, messages, aiSuggestions = [], onSend, onAISuggestion, loading, onBack }) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);  // ← Changé: ref sur container, pas sur div vide

  console.log('💬 ChatThread render:', {
    conv: conv?.name,
    messagesCount: messages?.length || 0,
    loading
  });

  // Helper pour formater le timestamp si nécessaire
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ✅ RÈGLE 2: Messages récents EN BAS (WhatsApp style) - Scroll intelligent
  const previousMessageCountRef = React.useRef(0);
  const isFirstLoadRef = React.useRef(true);

  // useLayoutEffect = avant paint, pas de flicker
  React.useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) {
      console.log('📜 [ChatThread] Scroll: pas de ref');
      return;
    }

    console.log('📜 [ChatThread] Scroll check:', {
      messagesCount: messages?.length || 0,
      previousCount: previousMessageCountRef.current,
      isFirstLoad: isFirstLoadRef.current,
    });

    // Premier chargement → scroll en bas IMMÉDIATEMENT
    if (isFirstLoadRef.current && messages?.length > 0) {
      console.log('📜 [ChatThread] ✅ PREMIER CHARGEMENT → Scroll en bas');
      el.scrollTop = el.scrollHeight;
      isFirstLoadRef.current = false;
      previousMessageCountRef.current = messages.length;
      return;
    }

    // Nouveau message ajouté → scroll seulement si on était déjà en bas
    if (messages?.length > previousMessageCountRef.current) {
      const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      console.log('📜 [ChatThread] Nouveau message:', { wasAtBottom });
      if (wasAtBottom) {
        console.log('📜 [ChatThread] ✅ Scroll en bas (était déjà en bas)');
        el.scrollTop = el.scrollHeight;
      }
    }

    previousMessageCountRef.current = messages?.length || 0;
  }, [messages?.length]);  // ← Dépendance sur length, pas messages (évite re-renders)

  // Reset isFirstLoad quand on change de conversation
  React.useLayoutEffect(() => {
    console.log('📜 [ChatThread] Nouvelle conversation:', conv?.name);
    isFirstLoadRef.current = true;
    previousMessageCountRef.current = 0;
  }, [conv?.name]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSend?.(inputValue);
      setInputValue('');
    }
  };

  return (
    <Box sx={{
      height: '100%',
      minHeight: 0,  // ← FIX FLEX
      display: 'flex',
      flexDirection: 'column',
      bgcolor: t.bg2
    }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: 'center',
        p: '12px 18px', borderBottom: `1px solid ${t.border}`, bgcolor: t.bg1,
        flexShrink: 0  // Header ne shrink jamais
      }}>
        {/* Bouton retour (mobile only) */}
        {onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              ...iconBtnSx,
              display: { xs: 'flex', md: 'none' },
              mr: 0.5,
            }}
          >
            ←
          </IconButton>
        )}
        <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700,
          background: avaColors[conv.color] || avaColors.gold }}>{conv.initials}</Avatar>
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{conv.name}</Typography>
          <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono', mt: 0.125 }}>{conv.meta}</Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ ml: 'auto' }}>
          <IconButton sx={iconBtnSx}>📞</IconButton>
          <IconButton sx={iconBtnSx}>⋮</IconButton>
        </Stack>
      </Stack>

      <Box
        ref={messagesContainerRef}  // ← FIX: Ref sur le container scrollable
        sx={{
          flex: 1,
          minHeight: 0,  // ← FIX FLEX OBLIGATOIRE
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',  // ← Empêche cascade
          p: 2.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {messages.length === 0 && !loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>Aucun message</Typography>
          </Box>
        ) : (
          <>
            {messages.map((m, i) =>
              m.type === 'day'
                ? <DayLabel key={`day-${i}-${m.text}`}>{m.text}</DayLabel>
                : <Message
                    key={`msg-${i}-${m.timestamp || i}`}
                    from={m.from || m.sender}
                    text={m.text || m.content}
                    when={m.when || formatTime(m.timestamp)}
                    status={m.status}
                    readAt={m.readAt}
                  />
            )}
            {loading && messages.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Typography sx={{ fontSize: 11, color: t.text4 }}>Chargement...</Typography>
              </Box>
            )}
            {/* Plus besoin de div avec ref - le scroll est direct sur le container */}
          </>
        )}
      </Box>

      <Box sx={{
        p: '12px 18px',
        borderTop: `1px solid ${t.border}`,
        bgcolor: t.bg1,
        flexShrink: 0  // Zone d'input ne shrink jamais
      }}>
        {aiSuggestions.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mb: 1, rowGap: 0.75 }}>
            {aiSuggestions.map((s, i) => <AIChip key={`ai-suggest-${i}-${s.slice(0, 10)}`}>{s}</AIChip>)}
          </Stack>
        )}
        {/* ✅ RÈGLE 3: Input bar uniforme - [✨ AI] [📎 Upload] [Input] [→ Send] */}
        <Stack direction="row" spacing={1} sx={{
          alignItems: 'center',
          p: '8px 10px', bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '9px',
        }}>
          {/* ✨ AI Suggestion - À GAUCHE */}
          {onAISuggestion && (
            <IconButton
              onClick={onAISuggestion}
              sx={{
                ...inputIconSx,
                color: t.primary,
                '&:hover': { bgcolor: t.primaryTint, color: t.primary },
              }}
              title="Suggestion IA"
            >
              ✨
            </IconButton>
          )}
          {/* 📎 Upload - Après AI (placeholder) */}
          <IconButton sx={inputIconSx} title="Joindre un fichier">📎</IconButton>
          {/* Input texte */}
          <Box
            component="input"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Écrire un message…"
            sx={{
              flex: 1, background: 'transparent', border: 0, outline: 0,
              font: 'inherit', fontSize: 12.5, color: t.text,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                handleSend();
              }
            }}
          />
          {/* → Send - À DROITE */}
          <Box
            component="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            sx={{
              width: 30, height: 30, borderRadius: '7px',
              bgcolor: inputValue.trim() ? t.primary : t.bg3,
              color: inputValue.trim() ? t.text : t.text4,
              fontWeight: 800, fontSize: 13,
              border: 0, cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            →
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

const inputIconSx = { width: 26, height: 26, borderRadius: '5px', color: t.text3, fontSize: 14, '&:hover': { bgcolor: t.bg1, color: t.text } };

function DayLabel({ children }) {
  return (
    <Box sx={{
      alignSelf: 'center', p: '3px 10px', borderRadius: '99px',
      bgcolor: 'rgba(26,20,8,0.10)', color: t.text2,
      fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 600,
      letterSpacing: 0.5, textTransform: 'uppercase', my: 0.75,
    }}>{children}</Box>
  );
}

function Message({ from, text, when, status, readAt }) {
  const you = from === 'you' || from === 'host';

  return (
    <Box sx={{
      maxWidth: '70%', p: '8px 12px',
      borderRadius: '12px',
      borderBottomLeftRadius: you ? '12px' : '4px',
      borderBottomRightRadius: you ? '4px' : '12px',
      fontSize: 12.5, lineHeight: 1.5,
      alignSelf: you ? 'flex-end' : 'flex-start',
      bgcolor: you ? 'linear-gradient(135deg,#fef9e7,#fdf3ce)' : t.bg1,
      background: you ? 'linear-gradient(135deg,#fef9e7,#fdf3ce)' : t.bg1,
      border: '1px solid', borderColor: you ? 'rgba(230,176,34,0.25)' : t.border,
    }}>
      {text}
      {/* ✅ Status indicators + timestamp */}
      <Box sx={{
        fontSize: 9.5,
        color: t.text4,
        mt: 0.5,
        fontFamily: 'Geist Mono',
        letterSpacing: 0.3,
        textAlign: you ? 'right' : 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: you ? 'flex-end' : 'flex-start',
        gap: 0.5,
      }}>
        <span>{when}</span>
        {/* Status icons - SEULEMENT pour messages sortants (you/host) */}
        {you && (
          <>
            {/* Legacy: readAt (timestamp) */}
            {readAt ? (
              <span style={{ fontSize: '14px', color: '#7DD3FC' }}>✓✓</span>
            ) : status === 'read' ? (
              <span style={{ fontSize: '14px', color: '#7DD3FC' }}>✓✓</span>
            ) : status === 'delivered' ? (
              <span style={{ fontSize: '14px', color: t.text3 }}>✓✓</span>
            ) : status === 'sent' ? (
              <span style={{ fontSize: '14px', color: t.text3 }}>✓</span>
            ) : (
              <span style={{ fontSize: '14px', color: '#9CA3AF' }}>✓</span>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export function ChatAside({ children }) {
  return (
    <Box sx={{
      display: { xs: 'none', lg: 'block' },
      borderLeft: `1px solid ${t.border}`, p: '18px 16px',
      overflowY: 'auto', bgcolor: t.bg1,
    }}>{children}</Box>
  );
}

export function AsideSection({ title, children }) {
  return (
    <Box sx={{ mb: 2.25 }}>
      <Typography sx={{
        fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 700,
        color: t.text4, letterSpacing: 1.4, textTransform: 'uppercase', mb: 1.25,
      }}>{title}</Typography>
      {children}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 13. ListingsGrid + ListingCard
// ════════════════════════════════════════════════════════════════════

export function ListingsGrid({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
      {children}
    </Box>
  );
}

export function ListingCard({ photoColor = 'gold', name, place, rating, occupancy, adr, monthlyRev, channels = [], draft, draftAction }) {
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', overflow: 'hidden',
      transition: 'all 0.15s', cursor: 'pointer',
      '&:hover': { boxShadow: '0 8px 24px rgba(26,20,8,0.10)', transform: 'translateY(-2px)', borderColor: t.borderStrong },
    }}>
      <Box sx={{
        aspectRatio: '4/3', position: 'relative', overflow: 'hidden',
        background: thumbColors[photoColor],
        '&::after': {
          content: '""', position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))',
        },
      }}>
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
          <Badge variant={draft ? 'warning' : 'success'} dot>{draft ? 'Brouillon' : 'Active'}</Badge>
        </Box>
        {rating && (
          <Box sx={{
            position: 'absolute', bottom: 10, left: 10, zIndex: 2,
            color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 0.5,
          }}>★ {rating}</Box>
        )}
      </Box>
      <Box sx={{ p: '14px 16px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', mb: 0.25 }}>{name}</Typography>
        <Typography sx={{ fontSize: 11.5, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 0.3 }}>{place}</Typography>
        <Stack direction="row" sx={{
          my: 1.5, py: 1.25,
          justifyContent: 'space-between',
          borderTop: `1px dashed ${t.border}`,
          borderBottom: `1px dashed ${t.border}`,
        }}>
          <StatMini num={occupancy || '—'} label="OCC" />
          <StatMini num={adr || '—'} label="ADR" />
          <StatMini num={monthlyRev || '—'} label="RV/MO" />
        </Stack>
        {draft ? (
          <Button sx={{ ...btnAiSx, width: '100%', justifyContent: 'center' }} onClick={draftAction?.onClick}>
            ✨ Finaliser avec AI
          </Button>
        ) : (
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
            <Stack direction="row" spacing={0.375}>
              {channels.map((c, ci) => <ChannelDot key={`channel-${ci}-${c}`} source={c} />)}
            </Stack>
            <Typography sx={{ color: t.text3, fontSize: 11.5 }}>{channels.length} canaux</Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function StatMini({ num, label }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono', letterSpacing: '-0.2px' }}>{num}</Typography>
      <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.25, fontFamily: 'Geist Mono', letterSpacing: 0.3 }}>{label}</Typography>
    </Box>
  );
}

function ChannelDot({ source }) {
  const s = OTA[source] || OTA.airbnb;
  return (
    <Box sx={{
      width: 16, height: 16, borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 800, color: '#fff', bgcolor: s.bg,
    }}>{s.logo}</Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 14. AI components
// ════════════════════════════════════════════════════════════════════

export function AIChip({ children, onClick }) {
  return (
    <Box onClick={onClick} sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      p: '4px 9px', borderRadius: '99px',
      bgcolor: t.aiTint, border: '1px solid rgba(139,92,246,0.25)',
      fontSize: 11, color: t.ai, fontWeight: 600,
      cursor: 'pointer', transition: 'all 0.12s',
      '&:hover': { bgcolor: 'rgba(139,92,246,0.15)' },
    }}>{children}</Box>
  );
}

export function AICard({ title, children, footer }) {
  return (
    <Box sx={{
      bgcolor: t.bg1,
      background: `linear-gradient(135deg, ${t.aiTint}, ${t.bg1})`,
      border: '1px solid rgba(139,92,246,0.20)',
      borderRadius: '12px', p: 2.5, mb: 1.75,
    }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '6px',
          background: `linear-gradient(135deg, #a78bfa, ${t.ai})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12,
        }}>✨</Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Typography>
        <Typography sx={{ ml: 'auto', fontFamily: 'Geist Mono', fontSize: 9.5, color: t.text3 }}>GPT-4</Typography>
      </Stack>
      {children}
      {footer && <Box sx={{ mt: 1.5 }}>{footer}</Box>}
    </Box>
  );
}

export function AIBanner({ icon = '✨', title, description, actions }) {
  return (
    <Stack direction="row" spacing={1.75} sx={{
      p: '14px 16px', mb: 3,
      alignItems: 'center',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(244,207,94,0.04))',
      border: '1px solid rgba(139,92,246,0.20)', borderRadius: '12px',
    }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        background: `linear-gradient(135deg, #a78bfa, ${t.ai})`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, boxShadow: '0 4px 12px rgba(139,92,246,0.30)', flexShrink: 0,
      }}>{icon}</Box>
      <Box sx={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: t.text2 }}>
        <Box component="strong" sx={{ color: t.text }}>{title}</Box>{' '}
        <Box component="span" sx={{ color: t.text3 }}>{description}</Box>
      </Box>
      <Stack direction="row" spacing={1}>{actions}</Stack>
    </Stack>
  );
}

// ════════════════════════════════════════════════════════════════════
// 15. Panel — generic content card with head
// ════════════════════════════════════════════════════════════════════

export function Panel({ title, desc, headRight, children, sx }) {
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', p: 2.5,
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
      minWidth: 0,
      ...sx,
    }}>
      {title && (
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: 'baseline',
          mb: 2, pb: 1.5, borderBottom: `1px dashed ${t.border}`,
        }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</Typography>
          {desc && <Typography sx={{ ml: 'auto !important', fontSize: 12, color: t.text3 }}>{desc}</Typography>}
          {headRight}
        </Stack>
      )}
      {children}
    </Box>
  );
}

export function StableChart({ height = 320, sx, children }) {
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.floor(rect.width));
      const nextHeight = Math.max(0, Math.floor(rect.height));
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateSize();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateSize())
      : null;

    observer?.observe(node);
    window.addEventListener('resize', updateSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height,
        minWidth: 0,
        minHeight: height,
        display: 'block',
        ...sx,
      }}
    >
      {size.width > 0 && size.height > 0
        ? typeof children === 'function'
          ? children({
              width: Math.max(10, size.width),
              height: Math.max(10, size.height),
            })
          : children
        : null}
    </Box>
  );
}
