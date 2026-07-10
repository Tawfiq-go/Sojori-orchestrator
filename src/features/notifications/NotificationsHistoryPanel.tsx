import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { NotificationFacetChips } from './NotificationFacetChips';
import { NotificationHistoryRow } from './NotificationHistoryRow';
import { NotificationRow } from './NotificationRow';
import {
  useNotificationHistory,
  type NotificationHistoryTab,
} from './useNotifications';

function HistoryTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      {label}
      {count != null && count > 0 ? (
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            borderRadius: '999px',
            px: 0.6,
            py: 0.1,
            bgcolor: active ? t.primary : t.bg3,
            color: active ? t.primaryOnGold : t.text3,
          }}
        >
          {count}
        </Box>
      ) : null}
    </Box>
  );
}

const EMPTY_MESSAGES: Record<NotificationHistoryTab, string> = {
  active: 'Aucune notification en cours.',
  treated: 'Aucune notification traitée ou lue.',
  dismissed: 'Aucune notification ignorée.',
};

export function NotificationsHistoryPanel() {
  const [tab, setTab] = useState<NotificationHistoryTab>('active');
  const [facet, setFacet] = useState('');
  const { data: activeData } = useNotificationHistory('active', facet);
  const { data: dismissedData } = useNotificationHistory('dismissed', facet);
  const { data, isLoading } = useNotificationHistory(tab, facet);
  const items = data?.items ?? [];

  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: t.text3, mb: 2, maxWidth: 680, lineHeight: 1.5 }}>
        Toutes vos notifications : <b>en cours</b> (actives), <b>traitées / lues</b>, ou{' '}
        <b>ignorées</b>. Une notif ignorée peut encore être marquée <b>Terminée</b>.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <HistoryTabButton
          active={tab === 'active'}
          onClick={() => setTab('active')}
          label="En cours"
          count={activeData?.items?.length}
        />
        <HistoryTabButton
          active={tab === 'treated'}
          onClick={() => setTab('treated')}
          label="Traitées & lues"
        />
        <HistoryTabButton
          active={tab === 'dismissed'}
          onClick={() => setTab('dismissed')}
          label="Ignorées"
          count={dismissedData?.items?.length}
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
        <NotificationFacetChips selectedFacet={facet} onSelectFacet={setFacet} />
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
            {EMPTY_MESSAGES[tab]}
          </Typography>
        ) : tab === 'active' ? (
          items.map((n) => <NotificationRow key={n._id} notification={n} />)
        ) : (
          items.map((n) => (
            <NotificationHistoryRow
              key={n._id}
              notification={n}
              allowTerminate={tab === 'dismissed'}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
