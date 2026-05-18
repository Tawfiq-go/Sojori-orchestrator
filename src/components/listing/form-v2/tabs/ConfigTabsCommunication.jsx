// ════════════════════════════════════════════════════════════════════
// ConfigTabsCommunication.jsx — Access · WhatsApp · Concierge · Support · Rules
// Aligné sur CONFIG_TABS_SPEC.md (Claude Code · 16 mai 2026)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box } from '@mui/material';
import ChatbotMenuConfig from '../components/ChatbotMenuConfig';
import ListingConciergeConfigPanel from '../components/config/ListingConciergeConfigPanel';
import ListingSupportConfigPanel from '../components/config/ListingSupportConfigPanel';
import ListingRulesConfigPanel from '../components/config/ListingRulesConfigPanel';
import ListingAccessConfigPanel from '../components/config/ListingAccessConfigPanel';

/* ════════════════════ Access ════════════════════ */
export function AccessTab({ listingId, listingName }) {
  return <ListingAccessConfigPanel listingId={listingId} listingName={listingName} />;
}

/* ════════════════════ WhatsApp ════════════════════ */
export function WhatsAppTab({ values = {}, listingId, listingName }) {
  return (
    <Box sx={{ mt: -1 }}>
      <ChatbotMenuConfig listingId={listingId} listingName={listingName || values.name} embedded />
    </Box>
  );
}

/* ════════════════════ Concierge ════════════════════ */
export function ConciergeTab({ listingId, listingName }) {
  return <ListingConciergeConfigPanel listingId={listingId} listingName={listingName} />;
}

/* ════════════════════ Support ════════════════════ */
export function SupportTab({ listingId, listingName }) {
  return <ListingSupportConfigPanel listingId={listingId} listingName={listingName} />;
}

/* ════════════════════ Rules ════════════════════ */
export function RulesTab({ listingId, listingName }) {
  return <ListingRulesConfigPanel listingId={listingId} listingName={listingName} />;
}
