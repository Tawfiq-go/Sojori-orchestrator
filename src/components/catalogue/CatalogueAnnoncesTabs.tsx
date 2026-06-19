import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import { Roles } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

const ALL_TABS = [
  { id: 'listings', label: 'Listings', path: '/listings' },
  { id: 'mapping', label: 'Mapping RU', path: '/listings/mapping', adminOnly: true },
  { id: 'orch-model', label: 'Modèle orchestration', path: '/listings/orchestration-model' },
  { id: 'chatbot', label: 'Listing chatbot', path: '/chatbot/listing' },
  {
    id: 'channel-manager',
    label: 'Channel Manager',
    path: '/admin/ChannelManager?tab=channel-manager',
  },
] as const;

function resolveActiveTab(pathname: string): string {
  if (pathname.startsWith('/listings/mapping')) return 'mapping';
  if (pathname.startsWith('/listings/orchestration-model')) return 'orch-model';
  if (pathname.startsWith('/chatbot/listing')) return 'chatbot';
  if (pathname.startsWith('/admin/ChannelManager')) return 'channel-manager';
  return 'listings';
}

export function CatalogueAnnoncesTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === Roles.SuperAdmin || user?.role === Roles.Admin;

  const tabs = useMemo(
    () => ALL_TABS.filter((t) => !('adminOnly' in t && t.adminOnly) || isAdmin),
    [isAdmin],
  );

  const active = resolveActiveTab(pathname);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={tabs.some((t) => t.id === active) ? active : 'listings'}
        onChange={(_, v) => {
          const tab = tabs.find((t) => t.id === v);
          if (tab) navigate(tab.path);
        }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40 }}
      >
        {tabs.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} sx={{ minHeight: 40, fontSize: 13 }} />
        ))}
      </Tabs>
    </Box>
  );
}

export default CatalogueAnnoncesTabs;
