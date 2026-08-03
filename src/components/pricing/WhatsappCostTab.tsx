/**
 * Onglet Cost — WhatsApp : coûts Meta (pricing_analytics) + volume free/billable
 * par owner. Source de vérité mensuelle = Meta ; attribution owner via webhooks
 * de livraison (pricing.type / category) + grille PMP si $ absent du webhook.
 */
import { useCallback, useEffect, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import {
  fetchWhatsappMetaPricing,
  fetchWhatsappUsageByOwnerDay,
  type WhatsappMetaPricingCategory,
  type WhatsappMetaPricingDay,
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

function costSourceLabel(source: string | undefined, available: boolean): string {
  if (source === 'meta' && available) return 'Meta pricing_analytics';
  if (source === 'mixed') return 'Meta + grille tarifaire';
  if (source === 'rate_card') return 'Grille Meta (COST indisponible — credit line partenaire ?)';
  return 'Meta';
}

export function WhatsappCostTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WhatsappUsageByOwnerDayItem[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [totalFreeSent, setTotalFreeSent] = useState(0);
  const [totalBillableSent, setTotalBillableSent] = useState(0);
  const [ownerCostUsd, setOwnerCostUsd] = useState(0);
  const [costEstimated, setCostEstimated] = useState(false);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const [metaCostUsd, setMetaCostUsd] = useState(0);
  const [metaFreeVolume, setMetaFreeVolume] = useState(0);
  const [metaBillableVolume, setMetaBillableVolume] = useState(0);
  const [metaByDay, setMetaByDay] = useState<WhatsappMetaPricingDay[]>([]);
  const [metaByCategory, setMetaByCategory] = useState<WhatsappMetaPricingCategory[]>([]);
  const [costSource, setCostSource] = useState<string>('meta');
  const [costAvailable, setCostAvailable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageRes, metaRes] = await Promise.all([
        fetchWhatsappUsageByOwnerDay({ hours: 720 }),
        fetchWhatsappMetaPricing({ hours: 720 }),
      ]);

      const errors: Record<string, string> = {};

      if (usageRes.data.success) {
        const rows = usageRes.data.data.byOwnerDay || [];
        setItems(rows);
        setTotalReceived(usageRes.data.data.totalReceived || 0);
        setTotalSent(usageRes.data.data.totalSent || 0);
        setTotalFreeSent(usageRes.data.data.totalFreeSent || 0);
        setTotalBillableSent(usageRes.data.data.totalBillableSent || 0);
        setOwnerCostUsd(usageRes.data.data.totalCostUsd || 0);
        setCostEstimated(Boolean(usageRes.data.data.costEstimated));
        Object.assign(errors, usageRes.data.data.serviceErrors || {});
        const ownerIds = Array.from(new Set(rows.map((r) => r.ownerId).filter(Boolean)));
        if (ownerIds.length > 0) {
          try {
            const namesRes = await resolveChannelsOwnerNames(ownerIds);
            const map =
              (namesRes as { data?: { data?: { owners?: Record<string, string> } } })?.data?.data
                ?.owners || {};
            setOwnerNames(map);
          } catch {
            // best-effort
          }
        }
      } else {
        errors.usage = 'Échec volume WhatsApp';
      }

      if (metaRes.data.success) {
        const d = metaRes.data.data;
        setMetaCostUsd(d.totalCostUsd || 0);
        setMetaFreeVolume(d.freeVolume || 0);
        setMetaBillableVolume(d.billableVolume || 0);
        setMetaByDay(d.byDay || []);
        setMetaByCategory(d.byCategory || []);
        setCostSource(d.costSource || 'meta');
        setCostAvailable(Boolean(d.costAvailable));
        Object.assign(errors, d.serviceErrors || {});
      } else {
        errors.meta = 'Échec Meta pricing_analytics';
      }

      setServiceErrors(errors);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && items.length === 0 && metaByDay.length === 0) {
    return <MonitorLoading label="Chargement des coûts WhatsApp…" />;
  }

  const errorEntries = Object.entries(serviceErrors);
  const ownersCount = new Set(items.map((i) => i.ownerId)).size;

  const categoryColumns = [
    {
      key: 'category',
      label: 'Catégorie',
      render: (row: WhatsappMetaPricingCategory) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text, textTransform: 'capitalize' }}>
          {row.category.replace(/_/g, ' ')}
        </Typography>
      ),
    },
    {
      key: 'free',
      label: 'Gratuits',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingCategory) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.freeVolume}</Typography>
      ),
    },
    {
      key: 'billable',
      label: 'Facturés',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingCategory) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.billableVolume}</Typography>
      ),
    },
    {
      key: 'volume',
      label: 'Volume',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingCategory) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{row.volume}</Typography>
      ),
    },
    {
      key: 'cost',
      label: 'Coût',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingCategory) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.success }}>
          ${row.cost.toFixed(4)}
        </Typography>
      ),
    },
  ];

  const dayColumns = [
    {
      key: 'day',
      label: 'Jour',
      render: (row: WhatsappMetaPricingDay) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.day}</Typography>
      ),
    },
    {
      key: 'free',
      label: 'Gratuits',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingDay) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.freeVolume}</Typography>
      ),
    },
    {
      key: 'billable',
      label: 'Facturés',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingDay) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.billableVolume}</Typography>
      ),
    },
    {
      key: 'cost',
      label: 'Coût',
      align: 'right' as const,
      render: (row: WhatsappMetaPricingDay) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.success }}>
          ${row.cost.toFixed(4)}
          {!row.costFromMeta ? (
            <Typography component="span" sx={{ fontSize: 10, color: t.text3, ml: 0.5 }}>
              (grille)
            </Typography>
          ) : null}
        </Typography>
      ),
    },
  ];

  const ownerColumns = [
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
      key: 'freeSent',
      label: 'Gratuits',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.freeSent || 0}</Typography>
      ),
    },
    {
      key: 'billableSent',
      label: 'Facturés',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.billableSent || 0}</Typography>
      ),
    },
    {
      key: 'costUsd',
      label: 'Coût',
      align: 'right' as const,
      render: (row: WhatsappUsageByOwnerDayItem) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.success }}>
            ${(row.costUsd || 0).toFixed(4)}
          </Typography>
          {row.costEstimated ? (
            <Chip label="estimé" size="small" sx={{ height: 18, fontSize: 10 }} />
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      {error ? <MonitorError message={error} onRetry={() => void fetchData()} /> : null}
      {errorEntries.length > 0 && !error ? (
        <MonitorError
          message={`Données partielles — ${errorEntries.map(([s, m]) => `${s}: ${m}`).join(' · ')}`}
          onRetry={() => void fetchData()}
        />
      ) : null}

      <StatsRow>
        <StatCard
          icon="💰"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={`$${metaCostUsd.toFixed(2)}`}
          label={`Coût WhatsApp — 30 j (${costSourceLabel(costSource, costAvailable)})`}
        />
        <StatCard
          icon="🆓"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={String(metaFreeVolume || totalFreeSent)}
          label="Messages gratuits (Meta)"
        />
        <StatCard
          icon="💳"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(metaBillableVolume || totalBillableSent)}
          label="Messages facturés (Meta)"
        />
        <StatCard
          icon="💬"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={String(totalReceived + totalSent)}
          label="Messages DB (guest + staff)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(ownersCount)}
          label="Owners avec activité"
        />
      </StatsRow>

      <MonitorSection title="Répartition par catégorie (Meta pricing_analytics)">
        {metaByCategory.length === 0 ? (
          <MonitorEmpty message="Aucune donnée Meta pricing_analytics sur la période." />
        ) : (
          <DataTable
            columns={categoryColumns}
            rows={metaByCategory.map((c) => ({ id: c.category, ...c }))}
          />
        )}
      </MonitorSection>

      <MonitorSection title="Coût Meta par jour (30 derniers jours)">
        {metaByDay.length === 0 ? (
          <MonitorEmpty message="Aucun point journalier Meta." />
        ) : (
          <DataTable columns={dayColumns} rows={metaByDay.map((d) => ({ id: d.day, ...d }))} />
        )}
      </MonitorSection>

      <MonitorSection title="Volume par owner et par jour (guest + staff)">
        {items.length === 0 ? (
          <MonitorEmpty message="Aucun message WhatsApp attribuable à un owner sur la période." />
        ) : (
          <DataTable
            columns={ownerColumns}
            rows={items.map((i) => ({ id: `${i.ownerId}|${i.day}`, ...i }))}
          />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        Coût plateforme ({`$${metaCostUsd.toFixed(2)}`} / 30 j) issu de Meta{' '}
        <code>pricing_analytics</code> (WABA guest + staff). Les messages gratuits sont les
        réponses hors template (et utility dans la fenêtre 24h) —{' '}
        <code>free_customer_service</code> / <code>free_entry_point</code>. Les templates
        marketing / utility / auth hors fenêtre sont facturés. Attribution owner : webhooks de
        livraison (<code>status.pricing</code>) + grille PMP Meta (Rest of Africa / Maroc) quand
        le $ n&apos;est pas dans le webhook
        {costEstimated
          ? ` · certaines lignes owner portent encore un badge « estimé » (messages avant capture webhook). Attribution owner ≈ $${ownerCostUsd.toFixed(2)}.`
          : `.`}
      </Typography>
    </Stack>
  );
}

export default WhatsappCostTab;
