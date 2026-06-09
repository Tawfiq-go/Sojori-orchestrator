import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';

const TABS = [
  { id: 'listings', label: 'Listings', path: '/listings' },
  { id: 'template', label: 'Template orchestration', path: '/catalogue/listing-orchestration' },
  { id: 'orch-v3', label: 'Orchestration listing', path: '/catalogue/listing-orchestration-v3' },
] as const;

export function CatalogueAnnoncesTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith('/catalogue/listing-orchestration-v3') ||
    pathname.startsWith('/catalogue/listing-orchestration-v2')
    ? 'orch-v3'
    : pathname.startsWith('/catalogue/listing-orchestration')
      ? 'template'
      : 'listings';

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={active}
        onChange={(_, v) => {
          const tab = TABS.find(t => t.id === v);
          if (tab) navigate(tab.path);
        }}
      >
        {TABS.map(t => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>
    </Box>
  );
}

export default CatalogueAnnoncesTabs;
