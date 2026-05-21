// ════════════════════════════════════════════════════════════════════
// Sojori · Listing Form — Atelier 2026
// ListingFormShell.jsx — coquille 2-niveaux (Detail OTA / Config Orch.)
//
// • Toggle Detail (11 onglets) ↔ Config (7 onglets)
// • Tabs rail à gauche, content scrollable à droite
// • Header listing résumé + save bar sticky
// • Slot `renderTab(tabKey)` à brancher sur tes composants existants
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { LISTING_LAYOUT } from '../../../constants/listingLayout';
import { countSchemaGaps } from '../../../features/listing/components/ConfigOrchestration/pmConfigSchemaRegistry';

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

export const CONFIG_TABS = [
  { group: 'Workflow', items: [
    { id: 'orchestration', icon: '🔀', label: 'Orchestration' },
    { id: 'menage',        icon: '🧹', label: 'Ménage & Service' },
  ]},
  { group: 'Communication', items: [
    { id: 'access',     icon: '🔐', label: 'Accès' },
    { id: 'whatsapp',   icon: '📱', label: 'Menu WhatsApp' },
    { id: 'concierge',  icon: '🛎️', label: 'Conciergerie' },
    { id: 'support',    icon: '🎧', label: 'Support' },
  ]},
  { group: 'Métier', items: [
    { id: 'rules',      icon: '📋', label: 'Règles' },
  ]},
];

export const CONFIG_NEW_TABS = [
  { group: 'Services', items: [
    { id: 'support-config',        icon: '🆘', label: 'Support' },
    { id: 'concierge-config',      icon: '🛎️', label: 'Conciergerie' },
    { id: 'cleaning-config',       icon: '🏠', label: 'Ménage' },
    { id: 'transport-config',      icon: '🚗', label: 'Transport' },
    { id: 'grocery-config',        icon: '🛒', label: 'Courses' },
  ]},
  { group: 'Communication', items: [
    { id: 'service-client-config', icon: '💌', label: 'Service Client' },
    { id: 'messages-config',       icon: '📜', label: 'Messages' },
    { id: 'whatsapp-config',       icon: '📱', label: 'Menu WhatsApp' },
  ]},
  { group: 'Automation', items: [
    { id: 'orchestration-config',  icon: '🧼', label: 'Automatisations' },
  ]},
];

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
  defaultLevel = 'detail',    // 'detail' | 'config' | 'config-new'
  defaultTab = 'photos',
  onSave,
  onPublish,
  onPreview,
  onAiAssist,
  renderTab,                  // (tabKey, level) => ReactNode — branche tes vrais composants ici
}) {
  const [level, setLevel] = useState(defaultLevel);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabsConfig = level === 'detail' ? DETAIL_TABS : level === 'config' ? CONFIG_TABS : CONFIG_NEW_TABS;
  const activeTabMeta = tabsConfig.flatMap(g => g.items).find(t => t.id === activeTab) || tabsConfig[0].items[0];
  const schemaGaps = level === 'config-new' ? countSchemaGaps(activeTab) : null;
  const listingDisplayName = (listing?.name && String(listing.name).trim()) || 'Listing sans nom';
  const locationLine = (listing?.location && String(listing.location).trim()) || '';

  return (
    <Box sx={{ bgcolor: T.bg0, minHeight: '100vh' }}>
      <Box sx={{ p: LISTING_LAYOUT.pagePad, maxWidth: LISTING_LAYOUT.formMaxWidth, width: '100%', mx: 0 }}>

        {/* Toggle Détail/Config + nom listing sur une ligne (gain vertical) */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.25, sm: 2 }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          sx={{ mb: 2 }}
        >
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
              { id: 'config', icon: '⚙️', label: 'Config orchestration', pillLabel: '7 onglets', accent: T.ai, tint: T.aiTint, tintColor: T.ai },
              { id: 'config-new', icon: '✨', label: 'Config Orch. NEW', pillLabel: '9 onglets', accent: '#b8851a', tint: 'rgba(184,133,26,0.10)', tintColor: '#876119' },
            ].map(opt => {
              const active = level === opt.id;
              return (
                <Box
                  key={opt.id}
                  component="button"
                  onClick={() => {
                    setLevel(opt.id);
                    const tabs = opt.id === 'detail' ? DETAIL_TABS : opt.id === 'config' ? CONFIG_TABS : CONFIG_NEW_TABS;
                    setActiveTab(tabs[0].items[0].id);
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
          <Box sx={{ flex: 1, minWidth: 0, pt: { xs: 0, sm: 0.25 } }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 20, sm: 22 },
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
          </Box>
        </Stack>

        {/* Main frame */}
        <Box sx={{
          bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
          overflow: 'hidden',
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: `${LISTING_LAYOUT.tabsRailWidth}px 1fr` },
          minHeight: 560,
        }}>
          {/* Tabs rail */}
          <Stack sx={{
            borderRight: { md: `1px solid ${T.border}` },
            bgcolor: T.bg2, p: LISTING_LAYOUT.tabsRailPad, overflowY: 'auto',
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

          {/* Content */}
          <Box sx={{ p: LISTING_LAYOUT.contentPad, overflowY: 'auto', maxHeight: '80vh', position: 'relative' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: activeTab === 'amenities' ? 1.25 : 1.5 }}>
              {schemaGaps?.mockup > 0 && (
                <StatusChip tone="warning" label={`${schemaGaps.mockup} mockup`} dot />
              )}
              {schemaGaps?.inSchema > 0 && level === 'config-new' && (
                <StatusChip tone="success" label={`${schemaGaps.inSchema} schéma`} dot={false} />
              )}
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

            <Box sx={{ animation: 'sojori-fade-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
              {renderTab ? renderTab(activeTab, level) : <PlaceholderTab tabId={activeTab} />}
            </Box>

            {/* Save bar sticky */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
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
                spacing={0.75}
                sx={{
                  alignItems: 'center',
                  fontSize: 11,
                  color: T.text3,
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.success, boxShadow: `0 0 6px ${T.success}` }} />
                Sauvegardé · il y a 2 s
              </Stack>
              <Box sx={{ flex: 1 }} />
              <Button onClick={onSave}    sx={btnGhost}>Sauvegarder</Button>
              <Button onClick={onPublish} sx={btnPrim}>Publier →</Button>
            </Stack>
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
