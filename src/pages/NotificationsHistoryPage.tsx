import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/dashboardTokens';
import { NotificationFacetChips } from '../features/notifications/NotificationFacetChips';
import { NotificationHistoryRow } from '../features/notifications/NotificationHistoryRow';
import { NotificationsSectionTabs } from '../features/notifications/NotificationsSectionTabs';
import {
  useNotificationHistory,
  type NotificationHistoryTab,
} from '../features/notifications/useNotifications';

function HistoryTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        border: `1px solid ${active ? t.primary : t.border}`,
        cursor: 'pointer',
        bgcolor: active ? t.primaryTint : t.bg2,
        color: active ? t.primaryDeep : t.text2,
        fontWeight: active ? 700 : 600,
        fontSize: 12,
        px: 1.5,
        py: 0.75,
        borderRadius: '8px',
      }}
    >
      {label}
    </Box>
  );
}

export function NotificationsHistoryPage() {
  const [tab, setTab] = useState<NotificationHistoryTab>('treated');
  const [facet, setFacet] = useState('');
  const { data, isLoading } = useNotificationHistory(tab, facet);
  const items = data?.items ?? [];

  return (
    <DashboardWrapper breadcrumb={['Équipe', 'Notifications', 'Historique']}>
      <Box sx={{ py: 2.5, maxWidth: 720 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: t.text, mb: 0.75 }}>
          Historique des notifications
        </Typography>

        <NotificationsSectionTabs />

        <Typography sx={{ fontSize: 13, color: t.text3, mb: 2, maxWidth: 640, lineHeight: 1.5 }}>
          Notifications <b>terminées</b>, <b>lues</b> ou <b>ignorées</b> depuis la cloche.
          La modale n’affiche que les alertes encore actives — retrouvez ici tout le reste.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <HistoryTabButton
            active={tab === 'treated'}
            onClick={() => setTab('treated')}
            label="Traitées & lues"
          />
          <HistoryTabButton
            active={tab === 'dismissed'}
            onClick={() => setTab('dismissed')}
            label="Ignorées"
          />
        </Box>

        <Box
          sx={{
            mb: 2,
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            bgcolor: t.bg1,
            overflow: 'hidden',
          }}
        >
          <NotificationFacetChips
            selectedFacet={facet}
            onSelectFacet={setFacet}
          />
        </Box>

        <Box
          sx={{
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            bgcolor: t.bg1,
            overflow: 'hidden',
            minHeight: 200,
          }}
        >
          {isLoading ? (
            <Typography sx={{ p: 3, fontSize: 13, color: t.text3 }}>Chargement…</Typography>
          ) : items.length === 0 ? (
            <Typography sx={{ p: 3, fontSize: 13, color: t.text3, textAlign: 'center' }}>
              {tab === 'dismissed'
                ? 'Aucune notification ignorée.'
                : 'Aucune notification traitée ou lue.'}
            </Typography>
          ) : (
            items.map((n) => <NotificationHistoryRow key={n._id} notification={n} />)
          )}
        </Box>

      </Box>
    </DashboardWrapper>
  );
}

export default NotificationsHistoryPage;
