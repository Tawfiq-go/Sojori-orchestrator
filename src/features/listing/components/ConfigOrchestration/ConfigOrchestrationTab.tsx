import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import SupportConfigTabContainer from './SupportConfigTabContainer';
import ConciergeConfigTab from './ConciergeConfigTab';
import CleaningConfigTab from './CleaningConfigTab';
import TransportConfigTab from './TransportConfigTab';
import GroceryConfigTab from './GroceryConfigTab';
import ServiceClientConfigTab from './ServiceClientConfigTab';
import MessagesConfigTab from './MessagesConfigTab';
import OrchestrationConfigTab from './OrchestrationConfigTab';

interface ConfigOrchestrationTabProps {
  listingId: string;
  ownerId: string;
}

export default function ConfigOrchestrationTab({ listingId, ownerId }: ConfigOrchestrationTabProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="🆘 Support" />
          <Tab label="🛎️ Conciergerie" />
          <Tab label="🏠 Ménage" />
          <Tab label="🚗 Transport" />
          <Tab label="🛒 Courses" />
          <Tab label="💌 Service Client" />
          <Tab label="📜 Messages" />
          <Tab label="⚡ Orchestration" />
          <Tab label="📱 WhatsApp Config" />
        </Tabs>
      </Paper>

      <Box sx={{ p: 3 }}>
        {activeTab === 0 && <SupportConfigTabContainer listingId={listingId} ownerId={ownerId} />}
        {activeTab === 1 && <ConciergeConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 2 && <CleaningConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 3 && <TransportConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 4 && <GroceryConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 5 && <ServiceClientConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 6 && <MessagesConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 7 && <OrchestrationConfigTab listingId={listingId} ownerId={ownerId} />}
        {activeTab === 8 && (
          <Box>
            <Typography variant="h6" gutterBottom>📱 WhatsApp Config</Typography>
            <Typography color="text.secondary">
              Accessible depuis l'onglet "Config orchestration" (ancien) ou consultez directement le composant WhatsAppTab.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
