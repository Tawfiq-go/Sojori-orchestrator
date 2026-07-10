import { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/dashboardTokens';
import { NotificationsSectionTabs } from '../features/notifications/NotificationsSectionTabs';
import { NotificationsHistoryPanel } from '../features/notifications/NotificationsHistoryPanel';
import { NotificationPreferencesSection } from '../features/notifications/NotificationPreferencesSection';

export type NotificationsHubTab = 'historique' | 'config';

export function NotificationsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: NotificationsHubTab = rawTab === 'config' ? 'config' : 'historique';

  useEffect(() => {
    if (!rawTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'historique');
      setSearchParams(next, { replace: true });
    }
  }, [rawTab, searchParams, setSearchParams]);

  const sectionLabel = tab === 'config' ? 'Configuration' : 'Historique';

  return (
    <DashboardWrapper breadcrumb={['Équipe', 'Notifications', sectionLabel]}>
      <Box sx={{ py: 2.5, maxWidth: tab === 'config' ? 920 : 720 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: t.text, mb: 0.75 }}>
          Notifications
        </Typography>
        <Typography sx={{ fontSize: 13, color: t.text3, mb: 2, maxWidth: 720, lineHeight: 1.5 }}>
          Alertes de la cloche dashboard — historique archivé et configuration des événements.
        </Typography>

        <NotificationsSectionTabs activeTab={tab} />

        {tab === 'historique' ? (
          <NotificationsHistoryPanel />
        ) : (
          <Box>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 2, maxWidth: 720 }}>
              Choisissez quels événements déclenchent une alerte dans la cloche. Chaque worker a sa
              propre configuration dans <b>Équipe → Workers → Modifier</b>.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                p: 1.5,
                mb: 2.5,
                borderRadius: '12px',
                bgcolor: t.infoTint,
                border: `1px solid ${t.border}`,
              }}
            >
              <InfoOutlined sx={{ fontSize: 20, color: t.info, mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text, mb: 0.5 }}>
                  Distinct de l’admin WhatsApp staff
                </Typography>
                <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>
                  Les messages WhatsApp pour les admins terrain se configurent dans{' '}
                  <b>Task → Équipe → Admin WhatsApp</b>. Cette page ne gère que la{' '}
                  <b>cloche dashboard</b>.
                </Typography>
              </Box>
            </Box>
            <NotificationPreferencesSection />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}

export default NotificationsHubPage;
