/**
 * Onglet Pricing — volume WhatsApp par owner et par jour (30 derniers jours). Fusionne le
 * volet guest (srv-fullchatbot) et staff (srv-fulltask). Volumes uniquement pour l'instant
 * — pas de coût Meta calculé (grille de prix Cloud API pas encore construite).
 */
import { useCallback, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchWhatsappUsageByOwnerDay,
  type WhatsappUsageByOwnerDayItem,
} from '../../services/pricingDashboardApi';
import { resolveChannelsOwnerNames } from '../../services/channelsDashboardApi';
import {
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorSection,
  StatCard,
  StatsRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

export function WhatsappCostTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WhatsappUsageByOwnerDayItem[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWhatsappUsageByOwnerDay({ hours: 720 });
      if (res.data.success) {
        const rows = res.data.data.byOwnerDay || [];
        setItems(rows);
        setTotalReceived(res.data.data.totalReceived || 0);
        setTotalSent(res.data.data.totalSent || 0);
        setServiceErrors(res.data.data.serviceErrors || {});
        const ownerIds = Array.from(new Set(rows.map((r) => r.ownerId).filter(Boolean)));
        if (ownerIds.length > 0) {
          try {
            const namesRes = await resolveChannelsOwnerNames(ownerIds);
            const map = (namesRes as { data?: { data?: { owners?: Record<string, string> } } })?.data?.data?.owners || {};
            setOwnerNames(map);
          } catch {
            // Résolution best-effort.
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && items.length === 0) {
    return <MonitorLoading label="Chargement du volume WhatsApp…" />;
  }

  const errorEntries = Object.entries(serviceErrors);
  const ownersCount = new Set(items.map((i) => i.ownerId)).size;

  const columns = [
    {
      key: 'owner',
      label: 'Owner',
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          {ownerNames[row.ownerId] || row.ownerId}
        </Typography>
      ),
    },
    {
      key: 'day',
      label: 'Jour',
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.day}</Typography>
      ),
    },
    {
      key: 'received',
      label: 'Reçus',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.received}</Typography>
      ),
    },
    {
      key: 'sent',
      label: 'Envoyés',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.sent}</Typography>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{row.total}</Typography>
      ),
    },
  ];

  const rows = items.map((i) => ({ id: `${i.ownerId}|${i.day}`, ...i }));

  return (
    <Stack spacing={2}>
      {error ? <MonitorError message={error} onRetry={() => void fetchData()} /> : null}
      {errorEntries.length > 0 && !error ? (
        <MonitorError
          message={`Données partielles — services injoignables : ${errorEntries.map(([s]) => s).join(', ')}`}
          onRetry={() => void fetchData()}
        />
      ) : null}

      <StatsRow>
        <StatCard
          icon="💬"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={String(totalReceived + totalSent)}
          label="Messages WhatsApp — 30 derniers jours"
        />
        <StatCard
          icon="📥"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={String(totalReceived)}
          label="Reçus (guest + staff)"
        />
        <StatCard
          icon="📤"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(totalSent)}
          label="Envoyés (guest + staff)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(ownersCount)}
          label="Owners avec activité WhatsApp"
        />
      </StatsRow>

      <MonitorSection title="Volume WhatsApp par owner et par jour (30 derniers jours)">
        {items.length === 0 ? (
          <MonitorEmpty message="Aucun message WhatsApp attribuable à un owner sur la période." />
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        Fusionne les messages guest (ConversationMessage, srv-fullchatbot) et staff
        (StaffMessages, srv-fulltask). Pas de coût affiché — la tarification Meta Cloud API
        se fait par conversation (catégorie + pays), pas par message ; grille à construire.
      </Typography>
    </Stack>
  );
}

export default WhatsappCostTab;
