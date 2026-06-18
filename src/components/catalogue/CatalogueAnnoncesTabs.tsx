import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';

const TABS = [
  { id: 'listings', label: 'Listings', path: '/listings' },
  { id: 'mapping', label: 'Mapping RU', path: '/listings/mapping' },
  { id: 'orch-model', label: 'Modèle orchestration', path: '/listings/orchestration-model' },
] as const;

export function CatalogueAnnoncesTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith('/listings/mapping')
    ? 'mapping'
    : pathname.startsWith('/listings/orchestration-model')
      ? 'orch-model'
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
