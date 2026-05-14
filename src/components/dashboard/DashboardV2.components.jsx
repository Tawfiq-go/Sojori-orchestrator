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

// ─── Design tokens ──────────────────────────────────────────────
export const tokens = {
  primary: '#e6b022', primaryDeep: '#b8881a', primarySoft: '#f4cf5e',
  primaryTint: 'rgba(230,176,34,0.08)',
  ai: '#8b5cf6', aiTint: 'rgba(139,92,246,0.08)',
  success: '#10b981', successTint: 'rgba(16,185,129,0.08)',
  warning: '#f59e0b', warningTint: 'rgba(245,158,11,0.08)',
  error:   '#ef4444', errorTint:   'rgba(239,68,68,0.08)',
  info:    '#06b6d4', infoTint:    'rgba(6,182,212,0.08)',
  bg0: '#fbfaf6', bg1: '#ffffff', bg2: '#f5f3ec', bg3: '#ebe7da',
  text:  '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  border: 'rgba(26,20,8,0.08)', borderStrong: 'rgba(26,20,8,0.14)',
  sidebarW: 248, topbarH: 56,
};

const t = tokens;

// ════════════════════════════════════════════════════════════════════
// 1. DashboardLayout — root grid: sidebar + topbar + main
// ════════════════════════════════════════════════════════════════════

export function DashboardLayout({ user, activePath, onNavigate, onLogout, children, breadcrumb = [] }) {
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
      <Box sx={{
        gridArea: 'main',
        overflowY: 'auto',
        backgroundImage: `
          radial-gradient(50% 40% at 100% 0%, rgba(230,176,34,0.04), transparent 60%),
          radial-gradient(40% 30% at 0% 100%, rgba(139,92,246,0.03), transparent 70%)
        `,
        pt: { xs: 2, md: '24px' },
        pb: { xs: 2, md: '48px' },
      }}>
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
    { id: 'orchestration', label: 'Orchestration', icon: '✨', badge: 'AI', sub: [
      { id: 'orchestration/timeline', label: '› Chronologie' },
      { id: 'orchestration/events',   label: '› Événements' },
      { id: 'orchestration/config',   label: '› Configuration' },
    ]},
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
    { id: 'reservations/detail', label: 'Séjour', icon: '📋',
      description: 'Détail réservation' },
  ]},

  // ═══════════════════════════════════════════════════════
  // TÂCHES & OPÉRATIONS
  // ═══════════════════════════════════════════════════════
  { group: 'Tâches & Opérations', items: [
    { id: 'tasks/list', label: 'Liste', icon: '✅', badge: '7' },
    { id: 'tasks/team', label: 'Équipe', icon: '👥' },
    { id: 'tasks/planning', label: 'Planning', icon: '📆' },
    { id: 'tasks/staff-wa', label: 'Staff WhatsApp', icon: '💬' },
  ]},

  // ═══════════════════════════════════════════════════════
  // COMMUNICATIONS HUB
  // ═══════════════════════════════════════════════════════
  { group: 'Communications', items: [
    { id: 'comms/guests', label: 'WhatsApp Guests', icon: '💬', badge: '3', badgeRed: true },
    { id: 'comms/staff', label: 'WhatsApp Staff', icon: '👷' },
    { id: 'comms/ota', label: 'Messages OTA', icon: '📨' },
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
];

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

      <Stack spacing={0.25} sx={{ p: 1.25, overflowY: 'auto', flex: 1, minHeight: 0 }}>
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
                  fontFamily: 'Geist Mono',
                  fontWeight: 600,
                  color: t.text4,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  p: '12px 10px 6px',
                  cursor: 'pointer',
                  '&:hover': { color: t.text3 },
                }}
              >
                <span>{group.group}</span>
                <span style={{ fontSize: 10 }}>{isCollapsed ? '›' : '⌄'}</span>
              </Box>
              {!isCollapsed && group.items.map(item => (
                <React.Fragment key={item.id}>
                  <SideLink item={item} active={activePath === item.id} onClick={() => onNavigate?.(item.id)} />
                  {item.sub?.map(s => (
                    <SideLink key={s.id} item={s} sub active={activePath === s.id} onClick={() => onNavigate?.(s.id)} />
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </Stack>

      {/* AI shortcut */}
      <Box sx={{
        m: '12px 10px 14px', p: 1.5,
        background: `linear-gradient(135deg, ${t.aiTint}, rgba(244,207,94,0.04))`,
        border: `1px solid rgba(139,92,246,0.20)`, borderRadius: '10px',
      }}>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, color: t.ai,
          letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Geist Mono', mb: 0.75,
        }}>✨ Sojori AI</Typography>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: 'center',
          bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '8px',
          py: 0.875, px: 1.25, fontSize: 11.5, color: t.text3,
        }}>
          <Box sx={{ color: t.ai }}>💬</Box>
          <Box>Demander à l'IA…</Box>
          <Box sx={{
            ml: 'auto', fontFamily: 'Geist Mono', fontSize: 10,
            bgcolor: t.bg2, p: '1px 5px', borderRadius: 0.5,
            border: `1px solid ${t.border}`,
          }}>⌘K</Box>
        </Stack>
      </Box>

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
      display: 'flex', alignItems: 'center', gap: 1.25,
      p: sub ? '5px 10px 5px 36px' : '6.5px 10px',
      borderRadius: '7px',
      fontSize: sub ? 12 : 12.5,
      color: active ? t.text : (sub ? t.text3 : t.text2),
      fontWeight: active ? 600 : 500,
      bgcolor: active ? t.primaryTint : 'transparent',
      transition: 'background 0.12s',
      '&:hover': { bgcolor: active ? t.primaryTint : t.bg2, color: t.text },
      '&::before': active && !sub ? {
        content: '""', width: 3, height: 16, bgcolor: t.primary, borderRadius: 1,
        ml: -1.25, mr: 0.875,
      } : {},
    }}>
      {!sub && <Box sx={{ width: 14, opacity: 0.75 }}>{item.icon}</Box>}
      <Box sx={{ flex: 1 }}>{item.label}</Box>
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
      bgcolor: 'rgba(251,250,246,0.85)', backdropFilter: 'blur(20px)',
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
        bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '9px',
        py: 0.875, px: 1.5,
        display: 'flex', alignItems: 'center', gap: 1,
        fontSize: 12.5, color: t.text3, cursor: 'pointer',
      }} onClick={onSearch}>
        <Box>🔍</Box>
        <Box>Rechercher voyageur, listing, réservation…</Box>
        <Box sx={{
          ml: 'auto', fontFamily: 'Geist Mono', fontSize: 10,
          p: '1px 6px', bgcolor: t.bg1, border: `1px solid ${t.border}`,
          borderRadius: 0.5, color: t.text2,
        }}>⌘K</Box>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 'auto' }}>
        <IconButton sx={iconBtnSx}>
          🔔
          <Box sx={{
            position: 'absolute', top: 7, right: 8,
            width: 7, height: 7, borderRadius: '50%',
            bgcolor: t.error, border: `2px solid ${t.bg0}`,
          }} />
        </IconButton>
        <IconButton sx={iconBtnSx}>?</IconButton>
        <IconButton sx={iconBtnSx}>⚙</IconButton>
      </Stack>
    </Box>
  );
}

const iconBtnSx = {
  width: 34, height: 34, borderRadius: '8px',
  color: t.text2, fontSize: 14,
  '&:hover': { bgcolor: t.bg2, color: t.text },
  position: 'relative',
};

// ════════════════════════════════════════════════════════════════════
// 4. PageHeader & buttons
// ════════════════════════════════════════════════════════════════════

export function PageHeader({ title, count, children }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2.5 }}>
      <Typography component="div" sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        {title}
        {count && (
          <Box component="span" sx={{
            fontFamily: 'Geist Mono', fontSize: 13, color: t.text3, fontWeight: 500,
            bgcolor: t.bg2, p: '3px 9px', borderRadius: '99px',
            border: `1px solid ${t.border}`, letterSpacing: 0.4,
          }}>{count}</Box>
        )}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
        {children}
      </Stack>
    </Stack>
  );
}

export const btnPrimarySx = {
  px: 1.75, py: 0.875, borderRadius: '8px',
  fontSize: 12.5, fontWeight: 600, textTransform: 'none', letterSpacing: '-0.01em',
  background: `linear-gradient(180deg, ${t.primarySoft} 0%, ${t.primary} 100%)`,
  color: t.text,
  boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 4px 12px rgba(230,176,34,0.30), 0 0 0 1px rgba(184,136,26,0.20)',
  '&:hover': {
    transform: 'translateY(-1px)',
    background: `linear-gradient(180deg, ${t.primarySoft} 0%, ${t.primary} 100%)`,
  },
};
export const btnGhostSx = {
  px: 1.75, py: 0.875, borderRadius: '8px',
  fontSize: 12.5, fontWeight: 600, textTransform: 'none',
  bgcolor: t.bg1, color: t.text, border: `1px solid ${t.border}`,
  '&:hover': { bgcolor: t.bg2, borderColor: t.borderStrong },
};
export const btnAiSx = {
  px: 1.75, py: 0.875, borderRadius: '8px',
  fontSize: 12.5, fontWeight: 600, textTransform: 'none',
  background: `linear-gradient(180deg, #a78bfa 0%, ${t.ai} 100%)`,
  color: '#fff',
  boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset, 0 4px 12px rgba(139,92,246,0.30)',
  '&:hover': { transform: 'translateY(-1px)', background: `linear-gradient(180deg, #a78bfa 0%, ${t.ai} 100%)` },
};
export const btnSmSx = { fontSize: 11.5, py: 0.625, px: 1.25 };

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
      borderRadius: '11px', p: 2,
      transition: 'all 0.15s',
      '&:hover': { boxShadow: '0 4px 12px rgba(26,20,8,0.06)', borderColor: t.borderStrong },
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

export function DataTable({ columns, rows, selectable, selectedIds = [], onSelectionChange, onRowClick, footer }) {
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
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <Box component="thead">
          <Box component="tr">
            {selectable && <Box component="th" sx={thSx} style={{ width: 36 }}><Checkbox /></Box>}
            {columns.map(col => (
              <Box component="th" key={col.key} sx={{ ...thSx, textAlign: col.align || 'left', width: col.width }}>
                {col.label} {col.sortable && <Box component="span" sx={{ opacity: 0.4, ml: 0.5, fontSize: 9 }}>↕</Box>}
              </Box>
            ))}
            <Box component="th" sx={thSx} style={{ width: 60 }} />
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
                <Box component="td" sx={tdSx}>
                  <Stack direction="row" spacing={0.25} className="row-actions" sx={{
                    justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.15s',
                  }}>
                    <IconButton size="small" sx={rowActionSx}>💬</IconButton>
                    <IconButton size="small" sx={rowActionSx}>⋮</IconButton>
                  </Stack>
                </Box>
              </Box>
            );
          })}
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

export function TLEvent({ time, future, critical, icon, iconBg, iconColor, title, badge, meta, quote, children }) {
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
      <Box sx={{
        bgcolor: t.bg1, border: '1px solid', borderColor: t.border,
        borderStyle: future ? 'dashed' : 'solid',
        borderRadius: '9px', p: '12px 14px',
      }}>
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

export function ChatLayout({ children }) {
  return (
    <Box sx={{
      bgcolor: t.bg1, border: `1px solid ${t.border}`,
      borderRadius: '12px', overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '300px 1fr 280px', lg: '300px 1fr 280px' },
      height: 660,
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
    }}>{children}</Box>
  );
}

export function ConversationList({ conversations, activeId, onSelect }) {
  return (
    <Box sx={{ borderRight: `1px solid ${t.border}`, overflowY: 'auto' }}>
      <Box sx={{ p: '14px 16px', borderBottom: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: 'center',
          bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '7px',
          py: 0.75, px: 1.25, fontSize: 12, color: t.text3,
        }}>
          🔍<Box>Rechercher conversation…</Box>
        </Stack>
      </Box>
      {conversations.map(c => (
        <ConversationItem key={c.id} conv={c} active={activeId === c.id} onClick={() => onSelect?.(c.id)} />
      ))}
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

export function ChatThread({ conv, messages, aiSuggestions = [], onSend }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: t.bg2 }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: 'center',
        p: '12px 18px', borderBottom: `1px solid ${t.border}`, bgcolor: t.bg1,
      }}>
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

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25,
        display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.map((m, i) =>
          m.type === 'day'
            ? <DayLabel key={i}>{m.text}</DayLabel>
            : <Message key={i} from={m.from} text={m.text} when={m.when} />
        )}
      </Box>

      <Box sx={{ p: '12px 18px', borderTop: `1px solid ${t.border}`, bgcolor: t.bg1 }}>
        {aiSuggestions.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mb: 1, rowGap: 0.75 }}>
            {aiSuggestions.map((s, i) => <AIChip key={i}>{s}</AIChip>)}
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{
          alignItems: 'center',
          p: '8px 10px', bgcolor: t.bg2, border: `1px solid ${t.border}`, borderRadius: '9px',
        }}>
          <IconButton sx={inputIconSx}>📎</IconButton>
          <IconButton sx={inputIconSx}>😊</IconButton>
          <Box component="input" placeholder="Écrire un message…" sx={{
            flex: 1, background: 'transparent', border: 0, outline: 0,
            font: 'inherit', fontSize: 12.5, color: t.text,
          }} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { onSend?.(e.target.value); e.target.value = ''; } }} />
          <IconButton sx={inputIconSx}>🎤</IconButton>
          <Box component="button" sx={{
            width: 30, height: 30, borderRadius: '7px',
            bgcolor: t.primary, color: t.text, fontWeight: 800, fontSize: 13,
            border: 0, cursor: 'pointer',
          }}>→</Box>
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
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)', ...sx,
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
