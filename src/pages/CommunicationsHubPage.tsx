import { useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import WhatsAppTabV2 from '../components/communications/WhatsAppTabV2';
import StaffWhatsAppTabV2 from '../components/communications/StaffWhatsAppTabV2';
import MessagesOTATabV2 from '../components/communications/MessagesOTATabV2';
import LeadsTab from '../components/communications/LeadsTab';
import ReviewsTab from '../components/communications/ReviewsTab';

/**
 * Communications Hub - Page principale avec navigation par onglets
 * Route: /communications
 *
 * Onglets:
 * - Unified: Recherche multi-canaux par numéro réservation
 * - WhatsApp: Conversations WhatsApp guests (avec réservations)
 * - Staff WhatsApp: Conversations équipe (sans réservations)
 * - WA Templates (QA): Templates WhatsApp pour QA
 * - Messages OTA: Messages Airbnb/Booking confirmés
 * - Demande: Leads pré-réservation
 * - Avis: Reviews clients post-stay
 *
 * Basé sur: sojori-dashboard/src/features/communications/pages/CommunicationsHubPage.jsx
 */
export default function CommunicationsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab actif (sync avec URL ?tab=...)
  const activeTab = searchParams.get('tab') || 'whatsapp';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSearchParams({ tab: newValue });
  };

  // Liste des tabs - Aligné avec orchestrator backend
  const tabs = [
    { value: 'whatsapp', label: '💬 Guest WhatsApp', icon: '💬' },
    { value: 'staff', label: '👷 Staff WhatsApp', icon: '👷' },
    { value: 'ota', label: '📨 Messages OTA', icon: '📨' },
    { value: 'leads', label: '🎯 Demandes', icon: '🎯' },
    { value: 'reviews', label: '⭐ Avis', icon: '⭐' },
  ];

  return (
    <DashboardWrapper breadcrumb={['Communications', 'Hub']}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 } }}>
        {/* Tabs Navigation */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: t.border,
            mb: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 600,
                minHeight: 48,
                color: t.text3,
                '&.Mui-selected': {
                  color: t.primary,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: t.primary,
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box>
          {activeTab === 'whatsapp' && <WhatsAppTabV2 />}
          {activeTab === 'staff' && <StaffWhatsAppTabV2 />}
          {activeTab === 'ota' && <MessagesOTATabV2 />}
          {activeTab === 'leads' && <LeadsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
        </Box>
      </Box>
    </DashboardWrapper>
  );
}
