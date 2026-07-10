import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import type { NotificationsHubTab } from '../../pages/NotificationsHubPage';

const TABS: Array<{ id: NotificationsHubTab; label: string; to: string }> = [
  { id: 'historique', label: 'Historique', to: '/admin/equipe/notifications?tab=historique' },
  { id: 'config', label: 'Configuration', to: '/admin/equipe/notifications?tab=config' },
];

interface NotificationsSectionTabsProps {
  activeTab: NotificationsHubTab;
}

export function NotificationsSectionTabs({ activeTab }: NotificationsSectionTabsProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Box
            key={tab.id}
            component={RouterLink}
            to={tab.to}
            sx={{
              textDecoration: 'none',
              border: `1px solid ${isActive ? t.primary : t.border}`,
              bgcolor: isActive ? t.primaryTint : t.bg1,
              color: isActive ? t.primaryDeep : t.text2,
              fontWeight: isActive ? 700 : 600,
              fontSize: 12,
              px: 1.5,
              py: 0.75,
              borderRadius: '8px',
              '&:hover': { bgcolor: isActive ? t.primaryTint : t.bg2, color: t.text },
            }}
          >
            {tab.label}
          </Box>
        );
      })}
    </Box>
  );
}
