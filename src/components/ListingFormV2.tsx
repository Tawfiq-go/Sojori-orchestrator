// ════════════════════════════════════════════════════════════════════
// Sojori — Listing Form V2 · React + Material-UI components
// Adapted from delivered components
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Box, Stack, Typography, Button, Avatar, Divider,
} from '@mui/material';

// ─── Design tokens ──────────────────────────────────────────────
export const tokens = {
  primary: '#e6b022',
  primaryDeep: '#b8881a',
  primarySoft: '#f4cf5e',
  primaryTint: 'rgba(230,176,34,0.08)',
  ai: '#8b5cf6',
  aiTint: 'rgba(139,92,246,0.08)',
  success: '#10b981',
  successTint: 'rgba(16,185,129,0.08)',
  warning: '#f59e0b',
  error: '#ef4444',
  bg0: '#fbfaf6',
  bg1: '#ffffff',
  bg2: '#f5f3ec',
  bg3: '#ebe7da',
  text: '#1a1408',
  text2: '#4a4234',
  text3: '#8a8170',
  text4: '#b8b09b',
  border: 'rgba(26,20,8,0.08)',
  borderStrong: 'rgba(26,20,8,0.14)',
  sidebarW: 264,
  railW: 264,
  asideW: 320,
  topbarH: 60,
};

// ════════════════════════════════════════════════════════════════════
// Tab Groups Configuration
// ════════════════════════════════════════════════════════════════════

export const TAB_GROUPS = [
  { id: 'property', label: 'Propriété', tabs: [
    { id: 'basic',     label: 'Informations de base', icon: '🏠' },
    { id: 'address',   label: 'Adresse', icon: '📍' },
    { id: 'media',     label: 'Médias', icon: '📸' },
    { id: 'amenities', label: 'Équipements', icon: '✨' },
    { id: 'price',     label: 'Tarification', icon: '💰' },
    { id: 'add-info',  label: 'Infos supplémentaires', icon: 'ℹ️' },
  ]},
  { id: 'distribution', label: 'Distribution', tabs: [
    { id: 'channels',  label: 'Channel Manager', icon: '🔗' },
    { id: 'license',   label: 'Licences', icon: '📄' },
  ]},
  { id: 'guest', label: 'Guest experience', tabs: [
    { id: 'message',   label: 'Messages auto', icon: '💬' },
    { id: 'wa-menu',   label: 'Menu WhatsApp', icon: '📱' },
    { id: 'concierge', label: 'Conciergerie', icon: '🛎️' },
    { id: 'services',  label: 'Services', icon: '🎯' },
    { id: 'support',   label: 'Support', icon: '🆘' },
  ]},
  { id: 'ops', label: 'Opérations', tabs: [
    { id: 'cleaning',  label: 'Ménage', icon: '🧹' },
    { id: 'task',      label: 'Tâches auto', icon: '✅' },
    { id: 'rooms',     label: 'Types de chambres', icon: '🛏️' },
    { id: 'deposit',   label: 'Caution', icon: '💵' },
  ]},
  { id: 'rules', label: 'Règles & sécurité', tabs: [
    { id: 'rules',     label: 'Règles & sécurité', icon: '📜' },
    { id: 'info',      label: 'Règles & informations', icon: '🎛️' },
  ]},
  { id: 'access', label: 'Accès & IoT', tabs: [
    { id: 'access',    label: 'Configuration accès', icon: '🔐' },
    { id: 'wifi',      label: 'WiFi', icon: '🌐' },
    { id: 'iot',       label: 'Appareils IoT', icon: '🔌' },
  ]},
];

function getTabLabel(id: string): string {
  for (const g of TAB_GROUPS) {
    const t = g.tabs.find(x => x.id === id);
    if (t) return t.label;
  }
  return '';
}

// ════════════════════════════════════════════════════════════════════
// ListingFormLayout
// ════════════════════════════════════════════════════════════════════

interface ListingFormLayoutProps {
  listingName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabsCompletion?: Record<string, number>;
  aiFilledTabs?: string[];
  completionPct?: number;
  onSave?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  onAiAssist?: () => void;
  children: React.ReactNode;
}

export function ListingFormLayout({
  listingName,
  activeTab,
  onTabChange,
  tabsCompletion = {},
  aiFilledTabs = [],
  completionPct = 0,
  onSave, onPreview, onPublish, onAiAssist,
  children,
}: ListingFormLayoutProps) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: `${tokens.railW}px 1fr`, xl: `${tokens.railW}px 1fr ${tokens.asideW}px` },
      height: '100vh',
      bgcolor: tokens.bg0,
      color: tokens.text,
      fontFamily: 'Geist, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Topbar */}
      <ListingTopbar
        listingName={listingName}
        activeTabLabel={getTabLabel(activeTab)}
        completionPct={completionPct}
        onSave={onSave}
        onPreview={onPreview}
        onPublish={onPublish}
        onAiAssist={onAiAssist}
      />

      {/* Tabs Rail */}
      <ListingTabsRail
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabsCompletion={tabsCompletion}
        aiFilledTabs={aiFilledTabs}
      />

      {/* Content Area */}
      <Box sx={{
        overflowY: 'auto',
        p: { xs: 2, md: '28px 36px 80px' },
        bgcolor: tokens.bg0,
        backgroundImage: `
          radial-gradient(50% 40% at 100% 0%, rgba(230,176,34,0.05), transparent 60%),
          radial-gradient(40% 30% at 0% 100%, rgba(139,92,246,0.04), transparent 70%)
        `,
      }}>
        {children}
      </Box>

      {/* Aside */}
      <ListingAside />
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// ListingTopbar
// ════════════════════════════════════════════════════════════════════

interface ListingTopbarProps {
  listingName?: string;
  activeTabLabel?: string;
  completionPct?: number;
  onSave?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  onAiAssist?: () => void;
}

function ListingTopbar({ listingName, activeTabLabel, completionPct = 0, onSave, onPreview, onPublish, onAiAssist }: ListingTopbarProps) {
  return (
    <Box sx={{
      gridColumn: { xs: '1', md: '1 / -1' },
      bgcolor: 'rgba(251,250,246,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${tokens.border}`,
      display: 'flex', alignItems: 'center', gap: 2,
      px: 3.5, position: 'sticky', top: 0, zIndex: 30,
      height: `${tokens.topbarH}px`,
    }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, fontSize: 13, color: tokens.text2 }}>
        <Typography sx={{ fontSize: 13 }}>Listings</Typography>
        <Box sx={{ color: tokens.text4 }}>›</Box>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          py: 0.5, pr: 1.25, pl: 0.5,
          bgcolor: tokens.bg2, borderRadius: '99px', fontSize: 12, color: tokens.text,
        }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: 9, fontWeight: 700, bgcolor: '#d97706' }}>
            {listingName?.split(' ').map(w => w[0]).slice(0, 2).join('') || 'VB'}
          </Avatar>
          {listingName || 'Villa Belvédère'}
        </Box>
        <Box sx={{ color: tokens.text4 }}>›</Box>
        <Typography sx={{ color: tokens.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeTabLabel || 'Informations de base'}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: 'auto' }}>
        <Typography sx={{ fontSize: 11, color: tokens.text3, fontFamily: 'Geist Mono', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tokens.success, boxShadow: `0 0 8px ${tokens.success}` }} />
          Saved 2s ago
        </Typography>
        <CompletionRing pct={completionPct} size={22} showLabel />
        <Button onClick={onPreview} sx={btnGhostSx}>Preview</Button>
        <Button onClick={onAiAssist} sx={btnAiSx}>✨ AI assist</Button>
        <Button onClick={onPublish} sx={btnPrimarySx}>Publish →</Button>
      </Stack>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// ListingTabsRail
// ════════════════════════════════════════════════════════════════════

interface ListingTabsRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabsCompletion?: Record<string, number>;
  aiFilledTabs?: string[];
}

export function ListingTabsRail({ activeTab, onTabChange, tabsCompletion = {}, aiFilledTabs = [] }: ListingTabsRailProps) {
  return (
    <Box sx={{
      display: { xs: 'none', md: 'block' },
      bgcolor: tokens.bg1,
      borderRight: `1px solid ${tokens.border}`,
      overflowY: 'auto',
      py: 2,
    }}>
      {/* Search */}
      <Box sx={{
        mx: 1.75, mb: 1.5, py: 1, px: 1.5,
        bgcolor: tokens.bg2, border: `1px solid ${tokens.border}`,
        borderRadius: '9px', display: 'flex', alignItems: 'center', gap: 1,
        fontSize: 12, color: tokens.text3,
      }}>
        <span>🔍</span>
        <span>Rechercher un onglet…</span>
      </Box>

      {TAB_GROUPS.map(group => {
        const total = group.tabs.length;
        const done = group.tabs.filter(t => (tabsCompletion[t.id] || 0) >= 100).length;
        return (
          <Box key={group.id} sx={{ px: 1, mb: 2.25 }}>
            <Stack direction="row" alignItems="center" sx={{
              px: 1.25, pt: 0.75, pb: 1,
              fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 600,
              color: tokens.text4, letterSpacing: 1.4, textTransform: 'uppercase',
            }}>
              <span>{group.label}</span>
              <span style={{ marginLeft: 'auto', color: tokens.text3 }}>{done}/{total}</span>
            </Stack>
            <Stack spacing={0.25}>
              {group.tabs.map(t => (
                <RailTab
                  key={t.id}
                  tab={t}
                  active={activeTab === t.id}
                  completion={tabsCompletion[t.id] || 0}
                  aiFilled={aiFilledTabs.includes(t.id)}
                  onClick={() => onTabChange(t.id)}
                />
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

interface RailTabProps {
  tab: { id: string; label: string; icon: string };
  active: boolean;
  completion: number;
  aiFilled: boolean;
  onClick: () => void;
}

function RailTab({ tab, active, completion, aiFilled, onClick }: RailTabProps) {
  const status = aiFilled ? 'ai-filled'
    : completion >= 100 ? 'complete'
    : completion > 0 ? 'partial'
    : 'empty';
  const dot = {
    complete: tokens.success,
    partial:  tokens.warning,
    empty:    tokens.bg3,
    'ai-filled': tokens.ai,
  }[status];
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer', width: '100%',
      display: 'flex', alignItems: 'center', gap: 1.25,
      px: 1.25, py: 1, borderRadius: '8px',
      fontSize: 13, fontWeight: active ? 600 : 500,
      color: active ? tokens.text : tokens.text2,
      bgcolor: active ? tokens.primaryTint : 'transparent',
      transition: 'background 0.12s',
      '&:hover': { bgcolor: active ? tokens.primaryTint : tokens.bg2, color: tokens.text },
    }}>
      <Box sx={{ width: 14, opacity: 0.8, flexShrink: 0 }}>{tab.icon}</Box>
      <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
        {tab.label}
      </Box>
      <Box sx={{
        width: 6, height: 6, borderRadius: '50%',
        bgcolor: dot,
        boxShadow: status === 'ai-filled' ? `0 0 0 2px ${tokens.aiTint}` : 'none',
        flexShrink: 0,
      }} />
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// ListingAside
// ════════════════════════════════════════════════════════════════════

const defaultAiChat = [
  { from: 'ai',   text: 'Je viens de scanner votre listing Airbnb et 14 photos. <strong>8 champs ont été pré-remplis</strong>. Souhaitez-vous que je rédige aussi la description longue en anglais ?' },
  { from: 'user', text: 'Oui, et en italien aussi.' },
  { from: 'ai',   text: 'Parfait, je m\'en occupe. <strong>~25s</strong>. Je vous notifierai dans l\'onglet Description.' },
];

const defaultCompletion = [
  { label: 'Informations de base', pct: 100 },
  { label: 'Adresse',              pct: 100 },
  { label: 'Médias',               pct: 88 },
  { label: 'Équipements',          pct: 62 },
  { label: 'Tarification',         pct: 45 },
  { label: 'Channel Manager',      pct: 100 },
  { label: 'Menu WhatsApp',        pct: 75 },
  { label: 'Caution',              pct: 0 },
  { label: 'Types de chambres',    pct: 0 },
  { label: 'IoT',                  pct: 0 },
];

const defaultActivity = [
  { kind: 'user', who: 'Vous',  what: 'description longue mise à jour',      ago: 'il y a 2s' },
  { kind: 'ai',   who: 'AI',    what: '8 légendes photos générées',           ago: 'il y a 5 min' },
  { kind: 'user', who: 'Sync',  what: 'Airbnb + Booking ✓',                   ago: 'il y a 12 min' },
  { kind: 'ai',   who: 'AI',    what: 'import depuis Airbnb',                 ago: 'il y a 18 min' },
];

export function ListingAside({ aiChat = defaultAiChat, completion = defaultCompletion, activity = defaultActivity }: any) {
  return (
    <Box sx={{
      display: { xs: 'none', xl: 'block' },
      bgcolor: tokens.bg1,
      borderLeft: `1px solid ${tokens.border}`,
      overflowY: 'auto',
      p: 2.5,
    }}>
      <AsideTitle>Assistant IA</AsideTitle>
      <AsideCard variant="ai">
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>✨ Sojori AI</Typography>
          <Typography sx={{ ml: 'auto', fontFamily: 'Geist Mono', fontSize: 9, color: tokens.text3, fontWeight: 500 }}>
            GPT-4 · v2.4
          </Typography>
        </Stack>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {aiChat.map((m: any, i: number) => <AiMsg key={i} {...m} />)}
        </Stack>
        <AiInput />
      </AsideCard>

      <AsideTitle>Complétion par onglet</AsideTitle>
      <AsideCard>
        <Stack spacing={0.75}>
          {completion.map((c: any) => (
            <Stack key={c.label} direction="row" alignItems="center" spacing={1.25}
              sx={{ px: 0.5, py: 0.75, fontSize: 12 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                bgcolor: c.pct >= 100 ? tokens.success : c.pct > 0 ? tokens.warning : tokens.bg3,
                border: c.pct === 0 ? `1.5px solid ${tokens.borderStrong}` : 'none',
              }}/>
              <Box sx={{ flex: 1, color: tokens.text2 }}>{c.label}</Box>
              <Box sx={{ fontFamily: 'Geist Mono', fontSize: 10.5, color: tokens.text3 }}>{c.pct}%</Box>
            </Stack>
          ))}
        </Stack>
      </AsideCard>

      <AsideTitle>Activité récente</AsideTitle>
      <AsideCard sx={{ p: 1.75 }}>
        <Stack spacing={1.25} sx={{ fontSize: 12, color: tokens.text2 }}>
          {activity.map((a: any, i: number) => (
            <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
              <Box sx={{ color: a.kind === 'ai' ? tokens.ai : tokens.success }}>
                {a.kind === 'ai' ? '✨' : '●'}
              </Box>
              <Box>
                <Box><strong>{a.who}</strong> · {a.what}</Box>
                <Box sx={{ fontSize: 10, color: tokens.text3, fontFamily: 'Geist Mono' }}>{a.ago}</Box>
              </Box>
            </Stack>
          ))}
        </Stack>
      </AsideCard>

      <AsideTitle>Aide contextuelle</AsideTitle>
      <AsideCard>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.75 }}>💡 Tip · Score complétion</Typography>
        <Typography sx={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5 }}>
          Les listings à <b>≥80%</b> reçoivent <b>2.4× plus</b> de réservations. Complétez les Équipements et la Tarification pour un boost immédiat.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button sx={btnMiniSx}>Voir le guide</Button>
        </Stack>
      </AsideCard>
    </Box>
  );
}

const AsideTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{
    fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 600,
    color: tokens.text4, letterSpacing: 1.4, textTransform: 'uppercase', mb: 1.5,
  }}>{children}</Typography>
);

const AsideCard = ({ children, variant, sx }: any) => (
  <Box sx={{
    bgcolor: variant === 'ai' ? `linear-gradient(135deg, ${tokens.aiTint}, ${tokens.bg1})` : tokens.bg2,
    background: variant === 'ai' ? `linear-gradient(135deg, ${tokens.aiTint}, ${tokens.bg1})` : tokens.bg2,
    border: `1px solid ${variant === 'ai' ? 'rgba(139,92,246,0.20)' : tokens.border}`,
    borderRadius: '12px', p: 2, mb: 2, ...sx,
  }}>{children}</Box>
);

const AiMsg = ({ from, text }: any) => (
  <Box sx={{
    maxWidth: '95%',
    alignSelf: from === 'user' ? 'flex-end' : 'flex-start',
    p: '10px 12px', borderRadius: '12px',
    fontSize: 12.5, lineHeight: 1.5,
    bgcolor: from === 'user' ? tokens.primaryTint : tokens.bg1,
    border: `1px solid ${from === 'user' ? 'rgba(230,176,34,0.25)' : tokens.border}`,
    ml: from === 'user' ? 'auto' : 0,
  }}>
    {from !== 'user' && (
      <Box sx={{
        fontSize: 9.5, fontWeight: 700, color: tokens.ai, letterSpacing: 0.6,
        fontFamily: 'Geist Mono', textTransform: 'uppercase', mb: 0.5,
      }}>SOJORI</Box>
    )}
    <Box dangerouslySetInnerHTML={{ __html: text }} />
  </Box>
);

const AiInput = () => (
  <Box sx={{
    p: '10px 12px', borderRadius: '10px',
    bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`,
    display: 'flex', alignItems: 'center', gap: 1,
  }}>
    <Box sx={{ opacity: 0.6 }}>💬</Box>
    <Box component="input" placeholder="Demandez à l'IA…" sx={{
      flex: 1, border: 0, background: 'transparent', outline: 0,
      fontSize: 12.5, fontFamily: 'inherit',
    }}/>
    <Box component="button" sx={{
      px: 1.25, py: 0.625, bgcolor: tokens.ai, color: '#fff',
      borderRadius: '6px', fontSize: 11, fontWeight: 700,
      border: 0, cursor: 'pointer',
    }}>→</Box>
  </Box>
);

// ════════════════════════════════════════════════════════════════════
// CompletionRing
// ════════════════════════════════════════════════════════════════════

export function CompletionRing({ pct = 0, size = 22, showLabel }: { pct: number; size?: number; showLabel?: boolean }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 1.25,
      p: '6px 12px 6px 8px', borderRadius: '99px',
      bgcolor: tokens.bg2, border: `1px solid ${tokens.border}`,
    }}>
      <Box sx={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(${tokens.primary} ${pct}%, ${tokens.bg3} 0)`,
        position: 'relative', flexShrink: 0,
        '&::after': {
          content: '""', position: 'absolute', inset: '3px',
          bgcolor: tokens.bg1, borderRadius: '50%',
        },
      }}/>
      {showLabel && (
        <Box sx={{ lineHeight: 1.1 }}>
          <Box sx={{ fontFamily: 'Geist Mono', fontSize: 11, fontWeight: 700, color: tokens.text }}>{pct}%</Box>
          <Box sx={{ fontSize: 11, color: tokens.text3, fontFamily: 'Geist Mono', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Completion
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// Reusable button sx props
// ════════════════════════════════════════════════════════════════════

export const btnPrimarySx = {
  px: 1.75, py: 1, borderRadius: '9px',
  fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', textTransform: 'none',
  background: `linear-gradient(180deg, ${tokens.primarySoft} 0%, ${tokens.primary} 100%)`,
  color: tokens.text,
  boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 4px 12px rgba(230,176,34,0.30), 0 0 0 1px rgba(184,136,26,0.20)',
  '&:hover': {
    transform: 'translateY(-1px)',
    background: `linear-gradient(180deg, ${tokens.primarySoft} 0%, ${tokens.primary} 100%)`,
    boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 8px 24px rgba(230,176,34,0.40)',
  },
};

export const btnGhostSx = {
  px: 1.75, py: 1, borderRadius: '9px',
  fontSize: 13, fontWeight: 600, textTransform: 'none',
  bgcolor: tokens.bg1, color: tokens.text, border: `1px solid ${tokens.border}`,
  '&:hover': { bgcolor: tokens.bg2, borderColor: tokens.borderStrong },
};

export const btnAiSx = {
  px: 1.75, py: 1, borderRadius: '9px',
  fontSize: 13, fontWeight: 600, textTransform: 'none',
  background: `linear-gradient(180deg, #a78bfa 0%, ${tokens.ai} 100%)`,
  color: '#fff',
  boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset, 0 4px 12px rgba(139,92,246,0.30)',
  '&:hover': {
    transform: 'translateY(-1px)',
    background: `linear-gradient(180deg, #a78bfa 0%, ${tokens.ai} 100%)`,
  },
};

export const btnMiniSx = {
  px: 1.25, py: 0.75, borderRadius: '7px',
  fontSize: 11.5, fontWeight: 600, textTransform: 'none',
  bgcolor: tokens.bg1, color: tokens.text,
  border: `1px solid ${tokens.border}`,
};

// ════════════════════════════════════════════════════════════════════
// Export additional helper components
// ════════════════════════════════════════════════════════════════════

export { SectionCard, AIField, AIBanner, SaveBar, FormPager } from './ListingFormHelpers';
