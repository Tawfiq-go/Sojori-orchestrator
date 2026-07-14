/**
 * Onglet Pricing — coût AirROI estimé par owner (dynamic pricing), 30 derniers jours.
 */
import { useCallback, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchAirroiCostByOwner,
  type AirroiCostByOwnerItem,
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

export function AirroiCostTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AirroiCostByOwnerItem[]>([]);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAirroiCostByOwner({ hours: 720 });
      if (res.data.success) {
        const rows = res.data.data.items || [];
        setItems(rows);
        setTotalCostUsd(res.data.data.totalCostUsd || 0);
        const ownerIds = rows.map((r) => r.ownerId).filter(Boolean);
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
    return <MonitorLoading label="Chargement du coût AirROI…" />;
  }

  const columns = [
    {
      key: 'owner',
      label: 'Owner',
      render: (row: AirroiCostByOwnerItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          {ownerNames[row.ownerId] || row.ownerId}
        </Typography>
      ),
    },
    {
      key: 'totalCalls',
      label: 'Appels AirROI',
      align: 'right' as const,
      render: (row: AirroiCostByOwnerItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{row.totalCalls}</Typography>
      ),
    },
    {
      key: 'successCount',
      label: 'Réussis',
      align: 'right' as const,
      render: (row: AirroiCostByOwnerItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.successCount}</Typography>
      ),
    },
    {
      key: 'totalCostUsd',
      label: 'Coût estimé (30j)',
      align: 'right' as const,
      render: (row: AirroiCostByOwnerItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          ${row.totalCostUsd.toFixed(4)}
        </Typography>
      ),
    },
    {
      key: 'lastCallAt',
      label: 'Dernier appel',
      align: 'right' as const,
      render: (row: AirroiCostByOwnerItem) => (
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          {row.lastCallAt ? new Date(row.lastCallAt).toLocaleString('fr-FR') : '—'}
        </Typography>
      ),
    },
  ];

  const rows = items.map((i) => ({ id: i.ownerId, ...i }));

  return (
    <Stack spacing={2}>
      {error ? <MonitorError message={error} onRetry={() => void fetchData()} /> : null}

      <StatsRow>
        <StatCard
          icon="🌍"
          iconBg="rgba(13,148,136,0.12)"
          iconColor="#0D9488"
          value={`$${totalCostUsd.toFixed(2)}`}
          label="Coût AirROI estimé — 30 derniers jours"
        />
        <StatCard
          icon="📈"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(items.reduce((sum, i) => sum + i.totalCalls, 0))}
          label="Appels AirROI (30j, dynamic pricing)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(items.length)}
          label="Owners consommant AirROI"
        />
      </StatsRow>

      <MonitorSection title="Coût AirROI par owner (dynamic pricing — 30 derniers jours)">
        {items.length === 0 ? (
          <MonitorEmpty message="Aucun appel AirROI enregistré sur la période." />
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        Le coût AirROI ci-dessus est calculé par appel avec la grille tarifaire configurée
        (AirroiApiCall.costUsd). Il s&apos;agit d&apos;une estimation interne : la facture AirROI reste
        la source de vérité à rapprocher en fin de période.
      </Typography>
    </Stack>
  );
}

export default AirroiCostTab;
