// ════════════════════════════════════════════════════════════════════
// Sojori · Listing Form — Atelier 2026
// ListingFormShell.jsx — coquille 2-niveaux (Detail OTA / Config Orch.)
//
// • Toggle Detail (11) ↔ Orchestration V3
// • Tabs rail à gauche, content scrollable à droite
// • Header listing résumé + save bar sticky
// • Slot `renderTab(tabKey)` à brancher sur tes composants existants
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { LISTING_LAYOUT } from '../../../constants/listingLayout';
import { V3 } from '../../../features/orchestrationListingV3/theme';

const V3_ORCH_MIN_H = V3.embedViewportH;

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

/* ─── Onglets ──────────────────────────────────────────────── */
export const DETAIL_TABS = [
  { group: 'Identité', items: [
    { id: 'general',      icon: '🏠', label: 'General Information' },
    { id: 'location',     icon: '📍', label: 'Location & Address' },
    { id: 'photos',       icon: '📸', label: 'Photos & Media' },
    { id: 'amenities',    icon: '✨', label: 'Équipements' },
  ]},
  { group: 'Commercial', items: [
    { id: 'pricing',      icon: '💰', label: 'Pricing' },
    { id: 'availability', icon: '📅', label: 'Availability' },
    { id: 'fees',         icon: '💳', label: 'Fees & Deposits' },
  ]},
  { group: 'Distribution', items: [
    { id: 'channels',     icon: '🔗', label: 'Channel Management' },
    { id: 'direct',       icon: '🌐', label: 'Direct Booking' },
  ]},
  { group: 'Inventaire', items: [
    { id: 'rooms',        icon: '🛏️', label: 'Rooms & Beds' },
    { id: 'license',      icon: '📄', label: 'License' },
  ]},
];

/** Onglets Config orchestration (ex-« Config Orch. NEW »). */
export const CONFIG_NEW_TABS = [
  { group: 'Services', items: [
    { id: 'access-config',            icon: '🔐', label: 'Accès' },
    { id: 'support-config',           icon: '🆘', label: 'Support' },
    { id: 'concierge-config',         icon: '🛎️', label: 'Conciergerie' },
    { id: 'cleaning-config',          icon: '🧹', label: 'Ménage' },
    { id: 'timeslots-config',         icon: '🛬', label: 'Créneaux A/D' },
    { id: 'transport-config',         icon: '🚗', label: 'Transport' },
    { id: 'grocery-config',           icon: '🛒', label: 'Courses' },
    { id: 'messages-config',          icon: '🚪', label: 'Instructions départ' },
    { id: 'rules-config',             icon: '📋', label: 'Règles propriété' },
  ]},
  { group: 'Communication', items: [
    { id: 'service-client-config', icon: '💌', label: 'Service Client' },
  ]},
  { group: 'Orchestration', items: [] },
];

/** Onglets masqués (ex. transport absent du template Admin global). */
export function filterConfigTabs(tabs, hiddenIds = []) {
  const hidden = new Set(hiddenIds);
  if (!hidden.size) return tabs;
  return tabs
    .map(g => ({ ...g, items: g.items.filter(t => !hidden.has(t.id)) }))
    .filter(g => g.items.length > 0);
}

/** Nombre d’onglets Config orchestration visibles. */
export function visibleConfigTabCount(tabs) {
  return tabs.reduce((n, g) => n + g.items.length, 0);
}

/** Nombre d’onglets Config orchestration (pill toggle + vérif rail). */
export const CONFIG_NEW_TAB_COUNT = CONFIG_NEW_TABS.reduce((n, g) => n + g.items.length, 0);

const CONFIG_TAB_IDS = new Set(
  CONFIG_NEW_TABS.flatMap(g => g.items.map(t => t.id)),
);

/** Legacy `config` / `config-new` → Orchestration V3 (sauf embed template propriétaire). */
export function normalizeListingFormLevel(level, { forceConfig = false } = {}) {
  if (level === 'orchestration-v3') return 'orchestration-v3';
  if (level === 'config-new' || level === 'config') {
    return forceConfig ? 'config' : 'orchestration-v3';
  }
  return level === 'detail' ? 'detail' : 'detail';
}

/* ─── Helpers UI ───────────────────────────────────────────── */
function StatusChip({ tone, label, dot = true }) {
  const map = {
    success: { bg: T.successTint, color: T.success, dotBg: T.success },
    warning: { bg: T.warningTint, color: T.warning, dotBg: T.warning },
    info:    { bg: T.infoTint,    color: T.info,    dotBg: T.info },
    neutral: { bg: T.bg3,         color: T.text3,   dotBg: T.text4 },
  };
  const s = map[tone] || map.neutral;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.625,
      px: 1.125, py: '2px', borderRadius: '99px',
      bgcolor: s.bg, color: s.color,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {dot && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.dotBg }} />}
      {label}
    </Box>
  );
}

function TabButton({ tab, active, statusBadge, onClick }) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer', width: '100%',
      display: 'flex', alignItems: 'center', gap: 1,
      px: 1.5, py: 1, borderRadius: '7px',
      fontSize: 12.5, fontWeight: active ? 600 : 500,
      color: active ? T.text : T.text2,
      bgcolor: active ? T.bg1 : 'transparent',
      boxShadow: active ? '0 1px 2px rgba(20,17,10,0.04)' : 'none',
      position: 'relative', mb: 0.25,
      '&:hover': { bgcolor: active ? T.bg1 : T.bg2, color: T.text },
      '&::before': active ? {
        content: '""', position: 'absolute', left: 0, top: 8, bottom: 8,
        width: 2, borderRadius: 1, bgcolor: T.primary,
      } : {},
    }}>
      <Box sx={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{tab.icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{tab.label}</Box>
      {statusBadge && (
        <Box sx={{
          flexShrink: 0,
          fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
          bgcolor: statusBadge.tone === 'warning' ? T.warningTint :
                   statusBadge.tone === 'success' ? T.successTint : T.bg3,
          color:   statusBadge.tone === 'warning' ? T.warning :
                   statusBadge.tone === 'success' ? T.success : T.text3,
          px: 0.75, py: '1px', borderRadius: '99px',
        }}>{statusBadge.label}</Box>
      )}
    </Box>
  );
}

/* ─── Composant principal ─────────────────────────────────── */
export default function ListingFormShell({
  listing,                    // { id, name, photoColor, bedrooms, bathrooms, guests, location, completionPct }
  tabsStatus = {},            // { [tabKey]: { tone, label } } — pour les badges
  defaultLevel = 'detail',    // 'detail' | 'orchestration-v3' (legacy config → V3)
  defaultTab = 'photos',
  lockLevel,                  // masque le toggle et fige le niveau (ex. embed chatbot)
  embedded = false,           // rendu dans un panneau (pas pleine page)
  configNewBadgeLabel = '',   // badge optionnel (ex. « Template » sur page catalogue)
  hiddenConfigTabIds = [],    // ex. ['transport-config'] sur template Admin global
  onSave,
  onPublish,
  onPreview,
  onAiAssist,
  renderTab,                  // (tabKey, level) => ReactNode — branche tes vrais composants ici
}) {
  const resolvedLockLevel = lockLevel
    ? normalizeListingFormLevel(lockLevel, { forceConfig: lockLevel === 'config' || lockLevel === 'config-new' })
    : null;
  const resolvedDefaultLevel = normalizeListingFormLevel(defaultLevel, {
    forceConfig: resolvedLockLevel === 'config',
  });
  const [level, setLevel] = useState(resolvedLockLevel || resolvedDefaultLevel);
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setLevel(resolvedLockLevel || resolvedDefaultLevel);
  }, [resolvedDefaultLevel, resolvedLockLevel]);

  useEffect(() => {
    if (!defaultTab) return;
    if (resolvedDefaultLevel === 'orchestration-v3') {
      setActiveTab('orchestration-v3');
      return;
    }
    if (resolvedDefaultLevel === 'config' && !CONFIG_TAB_IDS.has(defaultTab)) return;
    setActiveTab(defaultTab);
  }, [defaultTab, resolvedDefaultLevel]);

  const configTabsFiltered = level === 'config' ? filterConfigTabs(CONFIG_NEW_TABS, hiddenConfigTabIds) : CONFIG_NEW_TABS;
  const configTabCount = visibleConfigTabCount(configTabsFiltered);

  useEffect(() => {
    if (level !== 'config' || !hiddenConfigTabIds?.length) return;
    const visibleIds = new Set(configTabsFiltered.flatMap(g => g.items.map(t => t.id)));
    if (!visibleIds.has(activeTab)) {
      const first = configTabsFiltered[0]?.items[0]?.id;
      if (first) setActiveTab(first);
    }
  }, [level, hiddenConfigTabIds, configTabsFiltered, activeTab]);

  useEffect(() => {
    if (resolvedLockLevel !== 'config' || !hiddenConfigTabIds?.length) return;
    const visibleIds = new Set(configTabsFiltered.flatMap(g => g.items.map(t => t.id)));
    if (!visibleIds.has(activeTab)) {
      const first = configTabsFiltered[0]?.items[0]?.id;
      if (first) setActiveTab(first);
    }
  }, [resolvedLockLevel, hiddenConfigTabIds, configTabsFiltered, activeTab]);

  const isOrchV3 = level === 'orchestration-v3';
  const tabsConfig = level === 'detail' ? DETAIL_TABS : isOrchV3 ? [] : configTabsFiltered;
  const activeTabMeta = isOrchV3
    ? { id: 'orchestration-v3', icon: '🎯', label: 'Orchestration' }
    : tabsConfig.flatMap(g => g.items).find(t => t.id === activeTab) || tabsConfig[0]?.items?.[0] || { id: activeTab, icon: '·', label: activeTab };
  const listingDisplayName = (listing?.name && String(listing.name).trim()) || 'Listing sans nom';
  const locationLine = (listing?.location && String(listing.location).trim()) || '';
  const showListingTitle = Boolean(listing?.name && String(listing.name).trim());

  const lockedConfig = Boolean(resolvedLockLevel === 'config');

  return (
    <Box sx={{ bgcolor: T.bg0, minHeight: embedded ? 0 : '100vh' }}>
      <Box
        sx={{
          p: embedded ? { xs: 1, sm: 1.25 } : LISTING_LAYOUT.pagePad,
          maxWidth: LISTING_LAYOUT.formMaxWidth,
          width: '100%',
          mx: 0,
        }}
      >

        <Box
          sx={{
            position: isOrchV3 ? 'sticky' : 'static',
            top: 0,
            zIndex: isOrchV3 ? 35 : 'auto',
            bgcolor: isOrchV3 ? T.bg0 : 'transparent',
            pb: isOrchV3 ? 0.5 : 0,
          }}
        >
        {/* Toggle Détail/Config + nom listing sur une ligne (gain vertical) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.25, sm: 2 },
            mb: embedded ? 1.25 : 2,
            alignItems: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          {!lockLevel && (
          <Box
            sx={{
              display: 'inline-flex',
              flexShrink: 0,
              border: `1px solid ${T.border}`,
              borderRadius: 1.4,
              p: 0.375,
              bgcolor: T.bg2,
              gap: 0.25,
              alignSelf: { xs: 'flex-start', sm: 'flex-start' },
            }}
          >
            {[
              { id: 'detail', icon: '🏠', label: 'Détail listing', pillLabel: '11 onglets', accent: T.primary, tint: T.primaryTint, tintColor: T.primaryDeep },
              { id: 'orchestration-v3', icon: '🎯', label: 'Orchestration', pillLabel: 'Par service', accent: '#7c3aed', tint: 'rgba(124,58,237,0.10)', tintColor: '#7c3aed' },
            ].map(opt => {
              const active = level === opt.id;
              return (
                <Box
                  key={opt.id}
                  component="button"
                  onClick={() => {
                    setLevel(opt.id);
                    if (opt.id === 'orchestration-v3') {
                      setActiveTab('orchestration-v3');
                      return;
                    }
                    setActiveTab(DETAIL_TABS[0].items[0].id);
                  }}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.75,
                    py: 1,
                    borderRadius: 1,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: active ? T.text : T.text2,
                    bgcolor: active ? T.bg1 : 'transparent',
                    boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
                    transition: 'background 140ms ease',
                  }}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                  <Box
                    sx={{
                      bgcolor: active ? opt.tint : T.bg3,
                      color: active ? opt.tintColor : T.text3,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 10,
                      px: 0.75,
                      py: '1px',
                      borderRadius: '99px',
                      fontWeight: 700,
                    }}
                  >
                    {opt.pillLabel}
                  </Box>
                </Box>
              );
            })}
          </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0, pt: { xs: 0, sm: 0.25 } }}>
            {lockedConfig && configNewBadgeLabel ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(184,133,26,0.10)',
                  border: `1px solid ${T.primary}`,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.primaryDeep,
                }}
              >
                <span>✨</span>
                {configNewBadgeLabel}
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    px: 0.75,
                    py: '1px',
                    borderRadius: '99px',
                    bgcolor: T.bg1,
                    color: T.text3,
                  }}
                >
                  {configTabCount} onglets
                </Box>
              </Box>
            ) : null}
            {showListingTitle ? (
              <>
                <Typography
                  component="h1"
                  sx={{
                    fontSize: embedded ? { xs: 17, sm: 18 } : { xs: 20, sm: 22 },
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: T.text,
                    lineHeight: 1.15,
                    m: 0,
                  }}
                >
                  {listingDisplayName}
                </Typography>
                {locationLine ? (
                  <Typography sx={{ fontSize: 13, color: T.text2, fontWeight: 500, mt: 0.25 }}>
                    {locationLine}
                  </Typography>
                ) : null}
              </>
            ) : null}
          </Box>
        </Box>
        </Box>

        {/* Main frame */}
        <Box sx={{
          bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: isOrchV3 ? '1fr' : { xs: '1fr', md: `${LISTING_LAYOUT.tabsRailWidth}px 1fr` },
          minHeight: isOrchV3 ? (embedded ? V3_ORCH_MIN_H : V3_ORCH_MIN_H) : embedded ? 420 : 560,
          height: isOrchV3 ? V3_ORCH_MIN_H : undefined,
          maxHeight: isOrchV3 ? V3_ORCH_MIN_H : undefined,
        }}>
          {/* Tabs rail */}
          {!isOrchV3 && (
          <Stack sx={{
            borderRight: { md: `1px solid ${T.border}` },
            bgcolor: T.bg2, p: LISTING_LAYOUT.tabsRailPad, overflowY: 'auto',
            maxHeight: { md: embedded ? 'calc(100vh - 220px)' : '80vh' },
          }}>
            {tabsConfig.map(g => (
              <React.Fragment key={g.group}>
                <Typography sx={{
                  fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600,
                  color: T.text4, letterSpacing: '0.08em', textTransform: 'uppercase',
                  px: 1.5, pt: 1.25, pb: 0.75,
                }}>{g.group}</Typography>
                {g.items.map(t => (
                  <TabButton
                    key={t.id}
                    tab={t}
                    active={activeTab === t.id}
                    statusBadge={tabsStatus[t.id]}
                    onClick={() => setActiveTab(t.id)}
                  />
                ))}
              </React.Fragment>
            ))}
          </Stack>
          )}

          {/* Content */}
          <Box sx={{
            p: isOrchV3 ? 0 : LISTING_LAYOUT.contentPad,
            overflowY: isOrchV3 ? 'hidden' : 'auto',
            overflowX: 'hidden',
            maxHeight: isOrchV3 ? '100%' : embedded ? 'calc(100vh - 220px)' : '80vh',
            height: isOrchV3 ? '100%' : undefined,
            minHeight: isOrchV3 ? 0 : undefined,
            display: isOrchV3 ? 'flex' : 'block',
            flexDirection: 'column',
            position: 'relative',
          }}>
            {!isOrchV3 && (
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: activeTab === 'amenities' ? 1.25 : 1.5 }}>
              <Typography
                component="h2"
                sx={{
                  fontSize: activeTab === 'amenities' ? 16 : 18,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  m: 0,
                }}
              >
                {activeTabMeta.icon} {activeTabMeta.label}
              </Typography>
              {tabsStatus[activeTab] && <StatusChip {...tabsStatus[activeTab]} />}
            </Stack>
            )}

            <Box sx={{
              animation: isOrchV3 ? 'none' : 'sojori-fade-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
              flex: isOrchV3 ? 1 : undefined,
              minHeight: isOrchV3 ? 0 : undefined,
              height: isOrchV3 ? '100%' : undefined,
              display: isOrchV3 ? 'flex' : 'block',
              flexDirection: 'column',
              overflow: isOrchV3 ? 'hidden' : 'visible',
            }}>
              {renderTab ? renderTab(activeTab, level) : <PlaceholderTab tabId={activeTab} />}
            </Box>

            {/* Save bar sticky */}
            {!isOrchV3 && (
            <Stack
              direction="row"
              sx={{
                gap: 1.5,
                alignItems: 'center',
                position: 'sticky',
                bottom: 0,
                mt: 2.25,
                mx: { xs: -1.5, md: '-7px' },
                mb: { xs: -1.5, md: '-7px' },
                px: LISTING_LAYOUT.saveBarPadX,
                py: 1.5,
                bgcolor: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(20px)',
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <Stack
                direction="row"
                sx={{
                  gap: 0.75,
                  alignItems: 'center',
                  fontSize: 11,
                  color: T.text3,
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.success, boxShadow: `0 0 6px ${T.success}` }} />
                Sauvegarder pour enregistrer cet écran
              </Stack>
              <Box sx={{ flex: 1 }} />
              <Button onClick={onSave}    sx={btnGhost}>Sauvegarder</Button>
              <Button onClick={onPublish} sx={btnPrim}>Publier →</Button>
            </Stack>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function PlaceholderTab({ tabId }) {
  return (
    <Box sx={{
      p: 4, textAlign: 'center', bgcolor: T.bg2,
      border: `1px dashed ${T.borderStrong}`, borderRadius: 1.5,
      color: T.text3, fontSize: 13,
    }}>
      <Typography sx={{ fontSize: 32, mb: 1 }}>📋</Typography>
      <Typography sx={{ fontWeight: 700, color: T.text2 }}>Slot · onglet « {tabId} »</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 12 }}>
        Branche ton composant existant ici via la prop <code>renderTab</code>.
      </Typography>
    </Box>
  );
}

/* ─── Button sx ─────────────────────────────────────────── */
const btnPrim  = {
  textTransform: 'none', fontWeight: 600, fontSize: 12.5, px: 1.75, py: 0.875,
  background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
  color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
  '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
};
const btnGhost = {
  textTransform: 'none', fontWeight: 600, fontSize: 12.5, px: 1.75, py: 0.875,
  bgcolor: T.bg1, color: T.text, border: `1px solid ${T.border}`,
  '&:hover': { bgcolor: T.bg2 },
};
const btnAi    = {
  textTransform: 'none', fontWeight: 600, fontSize: 12.5, px: 1.75, py: 0.875,
  background: `linear-gradient(180deg, #9669f7 0%, ${T.ai} 100%)`, color: '#fff',
  boxShadow: '0 1px 2px rgba(124,58,237,0.30)',
  '&:hover': { background: `linear-gradient(180deg, #a07cf9 0%, ${T.ai} 100%)` },
};
