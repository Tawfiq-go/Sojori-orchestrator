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
import {
  Box, Stack, Typography, Button, IconButton, Avatar, Chip, Switch,
  TextField, InputAdornment, Divider, Tooltip,
} from '@mui/material';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
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
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import Search from '@mui/icons-material/Search';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
export const tokens = {
  // ── Brand · ambre dignifié (WCAG AA contrast on bg0) ──
  primary:      '#b8851a',
  primaryDeep:  '#876119',
  primarySoft:  '#e6c46a',
  primaryTint:  'rgba(184,133,26,0.10)',

  // ── AI accent · violet ──
  ai:           '#7c3aed',
  aiTint:       'rgba(124,58,237,0.10)',

  // ── Sémantique ──
  success:      '#0a8f5e',  successTint: 'rgba(10,143,94,0.10)',
  warning:      '#c46506',  warningTint: 'rgba(196,101,6,0.10)',
  error:        '#c81e1e',  errorTint:   'rgba(200,30,30,0.10)',
  info:         '#0673b3',  infoTint:    'rgba(6,115,179,0.10)',

  // ── Surfaces · neutres chauds ──
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#f0eee8',
  bg3: '#e7e4dc',

  // ── Texte ──
  text:  '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',

  // ── Bordures ──
  border:        'rgba(20,17,10,0.07)',
  borderStrong:  'rgba(20,17,10,0.14)',

  sidebarW: 248,
  topbarH:  56,
};

const t = tokens;

// ════════════════════════════════════════════════════════════════════
// 1. DashboardLayout — root grid: sidebar + topbar + main
// ════════════════════════════════════════════════════════════════════

export function DashboardLayout({ user, activePath, onNavigate, onLogout, children, breadcrumb = [], compactMain = false }) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: `${t.sidebarW}px 1fr` },
      gridTemplateRows: `${t.topbarH}px 1fr`,
      gridTemplateAreas: { xs: `"topbar" "main"`, md: `"sidebar topbar" "sidebar main"` },
      height: '100vh',
      fontFamily: 'Geist, system-ui, sans-serif',
      color: t.text, bgcolor: t.bg0,
    }}>
      <AppSidebar user={user} activePath={activePath} onNavigate={onNavigate} onLogout={onLogout} />
      <TopBar breadcrumb={breadcrumb} />
      <Box
        className="sojori-main-enter"
        sx={{
          gridArea: 'main',
          overflow: compactMain ? 'hidden' : 'auto',
          display: compactMain ? 'flex' : 'block',
          flexDirection: 'column',
          minHeight: 0,
          backgroundImage: compactMain
            ? 'none'
            : `
          radial-gradient(50% 42% at 100% 0%, rgba(184,133,26,0.07), transparent 58%),
          radial-gradient(38% 28% at 0% 100%, rgba(124,58,237,0.05), transparent 72%)
        `,
          pt: compactMain ? 0 : { xs: 2, md: '24px' },
          pb: compactMain ? 0 : { xs: 2, md: '48px' },
          px: compactMain ? 0 : 0,
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

export const NAV = [
  // ═══════════════════════════════════════════════════════
  // PILOTAGE (Strategic)
  // ═══════════════════════════════════════════════════════
  { group: 'Pilotage', items: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: 'Live' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'reports', label: 'Reports', icon: '🧾' },
    { id: 'orchestrator', label: 'Orchestration', icon: '✨', badge: 'AI' },
  ]},

  // ═══════════════════════════════════════════════════════
  // CALENDRIER
  // ═══════════════════════════════════════════════════════
  { group: 'Calendrier', items: [
    { id: 'calendar', label: 'Vue multi-propriétés', icon: '📅',
      description: 'Gantt 21 jours' },
  ]},

  // ═══════════════════════════════════════════════════════
  // RÉSERVATIONS
  // ═══════════════════════════════════════════════════════
  { group: 'Réservations', items: [
    { id: 'reservations/list', label: 'Liste', icon: '🎫', badge: '23',
      description: 'Toutes les réservations' },
    { id: 'reservations/planning', label: 'Vue Planning', icon: '📆',
      description: 'Calendrier type Gantt' },
    // Note: "Séjour" est un onglet dans la page de détail, pas une page séparée
  ]},

  // ═══════════════════════════════════════════════════════
  // TÂCHES & OPÉRATIONS
  // ═══════════════════════════════════════════════════════
  { group: 'Tâches & Opérations', items: [
    { id: 'tasks/list', label: 'Liste', icon: '✅', badge: '7' },
    { id: 'tasks/team', label: 'Équipe', icon: '👥' },
    { id: 'tasks/planning', label: 'Vue Séjour', icon: '📆' },
    { id: 'tasks/staff-wa', label: 'Staff WhatsApp', icon: '💬' },
  ]},

  // ═══════════════════════════════════════════════════════
  // COMMUNICATIONS HUB
  // ═══════════════════════════════════════════════════════
  { group: 'Communications', items: [
    { id: 'comms', label: 'Communications Hub', icon: '📬', badge: '3', badgeRed: true, sub: [
      { id: 'comms/guests', label: 'WhatsApp' },
      { id: 'comms/staff', label: 'Staff WhatsApp' },
      { id: 'comms/templates', label: 'Templates (QA)' },
      { id: 'comms/ota', label: 'Messages OTA' },
      { id: 'comms/leads', label: 'Demande' },
      { id: 'comms/reviews', label: 'Avis' },
    ]},
  ]},

  // ═══════════════════════════════════════════════════════
  // SERVICE CLIENT
  // ═══════════════════════════════════════════════════════
  { group: 'Service Client', items: [
    { id: 'requests', label: 'Demandes', icon: '🎫' },
    { id: 'reviews', label: 'Avis', icon: '⭐' },
  ]},

  // ═══════════════════════════════════════════════════════
  // CATALOGUE
  // ═══════════════════════════════════════════════════════
  { group: 'Catalogue', items: [
    { id: 'listings', label: 'Annonces', icon: '🏠', badge: '42' },
    { id: 'pricing', label: 'Tarification', icon: '📈' },
    { id: 'channels', label: 'Canaux', icon: '🔗' },
    { id: 'clients', label: 'Clients', icon: '👤' },
  ]},

  // ═══════════════════════════════════════════════════════
  // CRM
  // ═══════════════════════════════════════════════════════
  { group: 'CRM', items: [
    { id: 'crm', label: 'Sojori CRM', icon: '🎯', sub: [
      { id: 'crm/requests', label: 'Demandes' },
      { id: 'crm/leads', label: 'Leads & fiches' },
      { id: 'crm/support', label: 'Équipe support' },
      { id: 'crm/onboarding', label: 'Onboarding' },
    ]},
  ]},
];

/** Icônes MUI alignées brief Claude Design (modules) — emoji en secours si id absent */
const NAV_ICON_BY_ID = {
  dashboard: DashboardOutlined,
  analytics: AnalyticsOutlined,
  reports: DescriptionOutlined,
  orchestration: AutoAwesomeOutlined,
  calendar: CalendarMonthOutlined,
  'reservations/list': ConfirmationNumberOutlined,
  'tasks/list': AssignmentTurnedInOutlined,
  'tasks/team': GroupsOutlined,
  'tasks/planning': TodayOutlined,
  'tasks/staff-wa': SupportAgentOutlined,
  'comms': ForumOutlined,
  'comms/guests': ForumOutlined,
  'comms/staff': SupportAgentOutlined,
  'comms/templates': DescriptionOutlined,
  'comms/ota': MailOutlined,
  'comms/leads': PersonSearchOutlined,
  'comms/reviews': StarBorderOutlined,
  requests: InboxOutlined,
  reviews: StarBorderOutlined,
  listings: HomeWorkOutlined,
  pricing: ShowChartOutlined,
  channels: HubOutlined,
  clients: PeopleOutlined,
  crm: PersonSearchOutlined,
  'crm/requests': InboxOutlined,
  'crm/leads': PersonSearchOutlined,
  'crm/support': SupportAgentOutlined,
  'crm/onboarding': AssignmentOutlined,
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
  return (
    <Box sx={{ width: 18, display: 'flex', justifyContent: 'center', opacity: active ? 1 : 0.75, fontSize: 13 }}>
      {item.icon}
    </Box>
  );
}

export function AppSidebar({ user, activePath = 'dashboard', onNavigate, onLogout }) {
  const [collapsed, setCollapsed] = React.useState({
    'Pilotage': false,
    'Calendrier': false,
    'Réservations': false,
    'Tâches & Opérations': true,
    'Communications': true,
    'Service Client': true,
    'Catalogue': true,
  });

  // Auto-ouvrir le groupe qui contient l'item actif
  React.useEffect(() => {
    // Trouver quel groupe contient l'activePath
    const activeGroup = NAV.find(group =>
      group.items.some(item => {
        // Check exact match ou parent path
        if (item.id === activePath) return true;
        // Check si activePath commence par item.id (ex: 'tasks/list' contient 'tasks')
        if (activePath.startsWith(item.id.split('/')[0])) return true;
        return false;
      })
    );

    if (activeGroup) {
      // Ouvrir ce groupe automatiquement
      setCollapsed(prev => ({ ...prev, [activeGroup.group]: false }));
    }
  }, [activePath]);

  const toggleGroup = (groupName) => {
    setCollapsed(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <Box sx={{
      gridArea: 'sidebar',
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      bgcolor: t.bg1,
      borderRight: `1px solid ${t.border}`,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: 'center',
        p: '14px 18px', borderBottom: `1px solid ${t.border}`,
        minHeight: `${t.topbarH}px`,
        flexShrink: 0,
      }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '8px',
          background: `linear-gradient(135deg, ${t.primarySoft}, ${t.primaryDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.text, fontWeight: 800, fontSize: 14,
          boxShadow: '0 4px 12px rgba(230,176,34,0.30)',
        }}>S</Box>
        <Box sx={{ lineHeight: 1.1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.3px' }}>Sojori</Typography>
          <Typography sx={{ color: t.text3, fontWeight: 500, fontSize: 10.5, mt: 0.1 }}>Property Owner</Typography>
        </Box>
      </Stack>

      <Stack spacing={0.25} sx={{
        p: 1.25,
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
        // Scrollbar discrète
        '&::-webkit-scrollbar': {
          width: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.1)',
          borderRadius: 10,
          '&:hover': {
            background: 'rgba(0,0,0,0.2)',
          },
        },
      }}>
        {NAV.map(group => {
          const isCollapsed = collapsed[group.group];
          return (
            <React.Fragment key={group.group}>
              <Box
                onClick={() => toggleGroup(group.group)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 9.5,
                  fontFamily: 'Geist Mono, monospace',
                  fontWeight: 600,
                  color: t.text4,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  p: '12px 10px 6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderRadius: '8px',
                  transition: 'color 0.18s ease, background-color 0.18s ease',
                  '&:hover': { color: t.text3, bgcolor: 'rgba(23,19,13,0.03)' },
                }}
              >
                <span>{group.group}</span>
                <ExpandMore
                  sx={{
                    fontSize: 18,
                    color: t.text4,
                    transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}
                />
              </Box>
              {!isCollapsed && group.items.map(item => (
                <React.Fragment key={item.id}>
                  <SideLink item={item} active={activePath === item.id} onClick={() => onNavigate?.(item.id)} />
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

      {user && (
        <Box sx={{ p: '12px 16px', borderTop: `1px solid ${t.border}` }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 28, height: 28, fontSize: 10.5, fontWeight: 700,
              background: 'linear-gradient(135deg,#c4b5fd,#8b5cf6)' }}>
              {user.initials}
            </Avatar>
            <Box sx={{ lineHeight: 1.1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{user.name}</Typography>
              <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'Geist Mono', mt: 0.1 }}>
                {user.role}
              </Typography>
            </Box>
          </Stack>
          {onLogout && (
            <Button onClick={onLogout} sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', mt: 1.25 }}>
              Se deconnecter
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

function SideLink({ item, active, sub, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer', width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 1.1,
      p: sub ? '6px 10px 6px 12px' : '7px 10px',
      borderRadius: '9px',
      fontSize: sub ? 12 : 12.5,
      color: active ? t.text : (sub ? t.text3 : t.text2),
      fontWeight: active ? 600 : 500,
      bgcolor: active ? t.primaryTint : 'transparent',
      transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
      '&:hover': {
        bgcolor: active ? t.primaryTint : t.bg2,
        color: t.text,
        transform: 'translateX(1px)',
      },
      '&:active': { transform: 'scale(0.99)' },
      '&::before': active && !sub ? {
        content: '""', width: 3, height: 18, bgcolor: t.primary, borderRadius: 1,
        ml: -1.1, mr: 0.75, flexShrink: 0,
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: sub ? 22 : 22, flexShrink: 0 }}>
        <NavItemIcon item={item} active={active} sub={sub} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{item.label}</Box>
      {item.badge && (
        <Box sx={{
          fontFamily: 'Geist Mono', fontSize: 9.5, fontWeight: 700,
          p: '1px 6px', borderRadius: '99px',
          bgcolor: item.badgeRed ? t.error : (active ? t.bg1 : t.bg2),
          color: item.badgeRed ? '#fff' : (active ? t.primaryDeep : t.text3),
        }}>{item.badge}</Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// 3. TopBar
// ════════════════════════════════════════════════════════════════════

export function TopBar({ breadcrumb = [], onSearch }) {
  return (
    <Box sx={{
      gridArea: 'topbar',
      bgcolor: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(16px) saturate(1.2)',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center', gap: 2, px: 3,
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, fontSize: 12.5, color: t.text2 }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            <Typography sx={{
              fontSize: 12.5,
              color: i === breadcrumb.length - 1 ? t.text : t.text2,
              fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
            }}>{b}</Typography>
            {i < breadcrumb.length - 1 && <Box sx={{ color: t.text4 }}>›</Box>}
          </React.Fragment>
        ))}
      </Stack>

      <Box sx={{
        flex: 1, maxWidth: 440, mx: 2,
        bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '10px',
        py: 0.875, px: 1.5,
        display: 'flex', alignItems: 'center', gap: 1,
        fontSize: 12.5, color: t.text3, cursor: 'pointer',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
        '&:hover': {
          borderColor: t.borderStrong,
          bgcolor: t.bg1,
          boxShadow: '0 2px 10px rgba(23,19,13,0.06)',
        },
      }} onClick={onSearch}>
        <Search sx={{ fontSize: 18, opacity: 0.55 }} />
        <Box>Rechercher voyageur, listing, réservation…</Box>
        <Box sx={{
          ml: 'auto', fontFamily: 'Geist Mono, monospace', fontSize: 10,
          px: 0.75, py: 0.25, bgcolor: t.bg1, border: `1px solid ${t.border}`,
          borderRadius: 1, color: t.text2,
        }}>⌘K</Box>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 'auto' }}>
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

export function PageHeader({ title, count, children }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        mb: 3,
        pb: 2,
        borderBottom: `1px solid ${t.border}`,
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          component="h1"
          variant="h5"
          sx={{
            fontSize: { xs: '1.2rem', sm: '1.45rem' },
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: t.text,
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {title}
          {count && (
            <Box component="span" sx={{
              fontFamily: 'Geist Mono, monospace', fontSize: 12, color: t.text3, fontWeight: 600,
              bgcolor: t.bg2, px: 1.25, py: 0.375, borderRadius: '999px',
              border: `1px solid ${t.border}`, letterSpacing: 0.02,
            }}>{count}</Box>
          )}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
        {children}
      </Stack>
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
      <Box sx={{ overflowX: tableMinWidth ? 'auto' : 'visible', width: '100%' }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          minWidth: tableMinWidth || '100%',
          borderCollapse: 'collapse',
          fontSize: 12.5,
          tableLayout: tableMinWidth ? 'fixed' : 'auto',
        }}
      >
        <Box component="thead">
          <Box component="tr">
            {selectable && <Box component="th" sx={thSx} style={{ width: 36 }}><Checkbox /></Box>}
            {columns.map(col => (
              <Box
                component="th"
                key={col.key}
                sx={{
                  ...thSx,
                  textAlign: col.align || 'left',
                  width: col.width,
                  textTransform: col.headerTextTransform ?? headerTextTransform,
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
                  <Box component="td" key={col.key} sx={{ ...tdSx, textAlign: col.align || 'left' }}>
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
const tdSx = { p: '12px 14px', borderBottom: `1px solid ${t.border}`, verticalAlign: 'middle' };
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
        : <PaginationBtn key={p} active={page === p} onClick={() => onChange?.(p)}>{p}</PaginationBtn>
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
            <Box key={i} sx={{
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
        <Box key={p.name} sx={{
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
              <Box key={i} sx={{
                borderLeft: `1px solid ${t.border}`, height: '100%',
                bgcolor: d.today ? 'rgba(230,176,34,0.05)' : d.weekend ? 'rgba(26,20,8,0.02)' : 'transparent',
              }} />
            ))}
            {bookings.filter(b => b.prop === pi).map((b, i) => (
              <CalBooking key={i} {...b} totalDays={days} />
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
      height: 660,
      maxHeight: 660,  // ← FIX: Ferme la cascade scroll
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

  // ✅ FIX SCROLL: scrollTop direct au lieu de scrollIntoView
  // useLayoutEffect = avant paint, pas de flicker
  React.useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    console.log('📜 Scroll direct (no cascade):', messages?.length);

    // Auto-scroll uniquement si déjà en bas (comme WhatsApp)
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (wasAtBottom || messages?.length === 1) {  // Ou si premier message
      el.scrollTop = el.scrollHeight;
      console.log('✅ Scrolled to bottom (no parent affected)');
    }
  }, [messages?.length]);  // ← Dépendance sur length, pas messages (évite re-renders)

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
                ? <DayLabel key={i}>{m.text}</DayLabel>
                : <Message key={i} from={m.from} text={m.text} when={m.when} />
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
            {aiSuggestions.map((s, i) => <AIChip key={i}>{s}</AIChip>)}
          </Stack>
        )}
        {onAISuggestion && (
          <Box sx={{ mb: 1 }}>
            <Box
              component="button"
              onClick={onAISuggestion}
              sx={{
                px: 1.5,
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                color: t.primary,
                bgcolor: 'transparent',
                border: `1px solid ${t.primary}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: t.primaryTint,
                },
              }}
            >
              💡 Suggestion IA
            </Box>
          </Box>
        )}
        <Stack direction="row" spacing={1} sx={{
          alignItems: 'center',
          p: '8px 10px', bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '9px',
        }}>
          <IconButton sx={inputIconSx}>📎</IconButton>
          <IconButton sx={inputIconSx}>😊</IconButton>
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
          <IconButton sx={inputIconSx}>🎤</IconButton>
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

function Message({ from, text, when }) {
  const you = from === 'you';
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
      <Box sx={{ fontSize: 9.5, color: t.text4, mt: 0.5, fontFamily: 'Geist Mono',
        letterSpacing: 0.3, textAlign: you ? 'right' : 'left' }}>{when}</Box>
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
              {channels.map(c => <ChannelDot key={c} source={c} />)}
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
