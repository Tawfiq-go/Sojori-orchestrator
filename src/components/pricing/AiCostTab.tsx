/**
 * Onglet Pricing — journal des appels IA par owner et par jour (30 derniers jours).
 * Fusionne srv-fullchatbot (chatbot, OCR passeport) et srv-reservations (traduction,
 * météo). Provider/modèle et coût par ligne — voir aiPricing.ts pour la grille de prix.
 */
import { useCallback, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchAiUsageByOwnerDay,
  type AiUsageByOwnerDayItem,
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

export function AiCostTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiUsageByOwnerDayItem[]>([]);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAiUsageByOwnerDay({ hours: 720 });
      if (res.data.success) {
        const rows = res.data.data.byOwnerDay || [];
        setItems(rows);
        setTotalCostUsd(res.data.data.totalCostUsd || 0);
        setTotalCalls(res.data.data.totalCalls || 0);
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
    return <MonitorLoading label="Chargement de la consommation IA…" />;
  }

  const errorEntries = Object.entries(serviceErrors);
  const ownersCount = new Set(items.map((i) => i.ownerId)).size;

  const columns = [
    {
      key: 'owner',
      label: 'Owner',
      render: (row: AiUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          {ownerNames[row.ownerId] || row.ownerId}
        </Typography>
      ),
    },
    {
      key: 'day',
      label: 'Jour',
      render: (row: AiUsageByOwnerDayItem) => <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.day}</Typography>,
    },
    {
      key: 'calls',
      label: 'Appels',
      align: 'right' as const,
      render: (row: AiUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{row.calls}</Typography>
      ),
    },
    {
      key: 'successCount',
      label: 'Réussis',
      align: 'right' as const,
      render: (row: AiUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.successCount}</Typography>
      ),
    },
    {
      key: 'tokens',
      label: 'Tokens',
      align: 'right' as const,
      render: (row: AiUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace' }}>
          {(row.promptTokens + row.completionTokens).toLocaleString('fr-FR')}
        </Typography>
      ),
    },
    {
      key: 'costUsd',
      label: 'Coût',
      align: 'right' as const,
      render: (row: AiUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          ${row.costUsd.toFixed(4)}
        </Typography>
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
          icon="🤖"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={`$${totalCostUsd.toFixed(2)}`}
          label="Coût IA total — 30 derniers jours"
        />
        <StatCard
          icon="📞"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(totalCalls)}
          label="Appels IA (30j, tous providers)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={String(ownersCount)}
          label="Owners consommant de l'IA"
        />
      </StatsRow>

      <MonitorSection title="Consommation IA par owner et par jour (30 derniers jours)">
        {items.length === 0 ? (
          <MonitorEmpty message="Aucun appel IA enregistré sur la période." />
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        Chaque appel LLM (Claude, Gemini, OpenAI — succès et échec) est loggé individuellement
        avec son coût calculé par la grille de prix par modèle. Couvre le chatbot invité
        (srv-fullchatbot) et la traduction/météo (srv-reservations) ; l'OCR passeport n'est
        pas encore instrumenté.
      </Typography>
    </Stack>
  );
}

export default AiCostTab;
