/**
 * Récap Pricing — une ligne par owner par mois : listings RU (snapshot courant, RU n'a pas
 * d'historique mensuel), coût RU implicite, coût AirROI réel, coût IA réel, volume WhatsApp
 * (pas de coût — grille Meta Cloud API pas encore construite). Les métriques agrégées par
 * jour côté backend (IA, WhatsApp) sont regroupées par mois ici pour rester à la même
 * granularité que la vue Summary.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchRuListingsByOwner,
  fetchAirroiCostByOwner,
  fetchAiUsageByOwnerDay,
  fetchWhatsappUsageByOwnerDay,
  type RuListingsByOwnerItem,
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

const RU_MONTHLY_COST_USD = 700;
const RU_LISTING_QUOTA = 200;
const RU_COST_PER_LISTING = RU_MONTHLY_COST_USD / RU_LISTING_QUOTA;

interface SummaryRow {
  ownerId: string;
  month: string;
  ruListingCount: number;
  ruCostUsd: number;
  airroiCostUsd: number;
  airroiCalls: number;
  aiCostUsd: number;
  aiCalls: number;
  whatsappTotal: number;
  totalCostUsd: number;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function dayToMonth(day: string): string {
  return day.slice(0, 7); // '2026-07-10' -> '2026-07'
}

export function PricingSummaryTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruItems, setRuItems] = useState<RuListingsByOwnerItem[]>([]);
  const [airroiByMonth, setAirroiByMonth] = useState<
    { ownerId: string; month: string; calls: number; costUsd: number }[]
  >([]);
  const [aiByMonth, setAiByMonth] = useState<{ ownerId: string; month: string; calls: number; costUsd: number }[]>(
    [],
  );
  const [whatsappByMonth, setWhatsappByMonth] = useState<{ ownerId: string; month: string; total: number }[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ruRes, airroiRes, aiRes, waRes] = await Promise.all([
        fetchRuListingsByOwner(),
        fetchAirroiCostByOwner({ hours: 720 }),
        fetchAiUsageByOwnerDay({ hours: 720 }),
        fetchWhatsappUsageByOwnerDay({ hours: 720 }),
      ]);

      const ruRows = ruRes.data.success ? ruRes.data.data.items || [] : [];
      setRuItems(ruRows);

      const airroiMonthRows = airroiRes.data.success ? airroiRes.data.data.byMonth || [] : [];
      setAirroiByMonth(airroiMonthRows);

      // IA/WhatsApp sont agrégés par jour côté backend — regroupe par mois ici.
      const aiRows = aiRes.data.success ? aiRes.data.data.byOwnerDay || [] : [];
      const aiMonthMap = new Map<string, { ownerId: string; month: string; calls: number; costUsd: number }>();
      for (const r of aiRows) {
        const month = dayToMonth(r.day);
        const key = `${r.ownerId}|${month}`;
        const existing = aiMonthMap.get(key);
        if (existing) {
          existing.calls += r.calls;
          existing.costUsd += r.costUsd;
        } else {
          aiMonthMap.set(key, { ownerId: r.ownerId, month, calls: r.calls, costUsd: r.costUsd });
        }
      }
      setAiByMonth(Array.from(aiMonthMap.values()));

      const waRows = waRes.data.success ? waRes.data.data.byOwnerDay || [] : [];
      const waMonthMap = new Map<string, { ownerId: string; month: string; total: number }>();
      for (const r of waRows) {
        const month = dayToMonth(r.day);
        const key = `${r.ownerId}|${month}`;
        const existing = waMonthMap.get(key);
        if (existing) existing.total += r.total;
        else waMonthMap.set(key, { ownerId: r.ownerId, month, total: r.total });
      }
      setWhatsappByMonth(Array.from(waMonthMap.values()));

      const ownerIds = Array.from(
        new Set(
          [...ruRows.map((r) => r.ownerId), ...airroiMonthRows.map((r) => r.ownerId), ...aiRows.map((r) => r.ownerId), ...waRows.map((r) => r.ownerId)].filter(
            Boolean,
          ),
        ),
      );
      if (ownerIds.length > 0) {
        try {
          const namesRes = await resolveChannelsOwnerNames(ownerIds);
          const map = (namesRes as { data?: { data?: { owners?: Record<string, string> } } })?.data?.data?.owners || {};
          setOwnerNames(map);
        } catch {
          // Résolution best-effort.
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

  const rows = useMemo<SummaryRow[]>(() => {
    const thisMonth = currentMonthKey();
    const ruByOwner = new Map(ruItems.map((r) => [r.ownerId, r]));
    const airroiByOwnerMonth = new Map(airroiByMonth.map((r) => [`${r.ownerId}|${r.month}`, r]));
    const aiByOwnerMonth = new Map(aiByMonth.map((r) => [`${r.ownerId}|${r.month}`, r]));
    const waByOwnerMonth = new Map(whatsappByMonth.map((r) => [`${r.ownerId}|${r.month}`, r]));

    const ownerMonthKeys = new Set<string>();
    for (const r of ruItems) ownerMonthKeys.add(`${r.ownerId}|${thisMonth}`);
    for (const r of airroiByMonth) ownerMonthKeys.add(`${r.ownerId}|${r.month}`);
    for (const r of aiByMonth) ownerMonthKeys.add(`${r.ownerId}|${r.month}`);
    for (const r of whatsappByMonth) ownerMonthKeys.add(`${r.ownerId}|${r.month}`);

    return Array.from(ownerMonthKeys)
      .map((key) => {
        const [ownerId, month] = key.split('|');
        const ru = ruByOwner.get(ownerId);
        const airroi = airroiByOwnerMonth.get(key);
        const ai = aiByOwnerMonth.get(key);
        const wa = waByOwnerMonth.get(key);
        const ruListingCount = month === thisMonth ? ru?.ruListingCount || 0 : 0;
        const ruCostUsd = ruListingCount * RU_COST_PER_LISTING;
        const airroiCostUsd = airroi?.costUsd || 0;
        const aiCostUsd = ai?.costUsd || 0;
        return {
          ownerId,
          month,
          ruListingCount,
          ruCostUsd,
          airroiCostUsd,
          airroiCalls: airroi?.calls || 0,
          aiCostUsd,
          aiCalls: ai?.calls || 0,
          whatsappTotal: wa?.total || 0,
          totalCostUsd: ruCostUsd + airroiCostUsd + aiCostUsd,
        };
      })
      .sort((a, b) => (a.month === b.month ? b.totalCostUsd - a.totalCostUsd : b.month.localeCompare(a.month)));
  }, [ruItems, airroiByMonth, aiByMonth, whatsappByMonth]);

  if (loading && ruItems.length === 0 && airroiByMonth.length === 0 && aiByMonth.length === 0) {
    return <MonitorLoading label="Chargement du récap consommation…" />;
  }

  const totalRuCostUsd = ruItems.reduce((sum, r) => sum + r.ruListingCount * RU_COST_PER_LISTING, 0);
  const thisMonth = currentMonthKey();
  const totalAirroiCostUsd = airroiByMonth.filter((r) => r.month === thisMonth).reduce((sum, r) => sum + r.costUsd, 0);
  const totalAiCostUsd = aiByMonth.filter((r) => r.month === thisMonth).reduce((sum, r) => sum + r.costUsd, 0);
  const totalWhatsapp = whatsappByMonth.filter((r) => r.month === thisMonth).reduce((sum, r) => sum + r.total, 0);
  const ownersCount = new Set(rows.map((r) => r.ownerId)).size;

  const columns = [
    {
      key: 'owner',
      label: 'Owner',
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          {ownerNames[row.ownerId] || row.ownerId}
        </Typography>
      ),
    },
    {
      key: 'month',
      label: 'Mois',
      render: (row: SummaryRow) => <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.month}</Typography>,
    },
    {
      key: 'ruListingCount',
      label: 'Listings RU',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12, color: t.text }}>
          {row.month === currentMonthKey() ? row.ruListingCount : '—'}
        </Typography>
      ),
    },
    {
      key: 'ruCostUsd',
      label: 'Coût RU',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          {row.month === currentMonthKey() ? `$${row.ruCostUsd.toFixed(2)}` : '—'}
        </Typography>
      ),
    },
    {
      key: 'whatsappTotal',
      label: 'WhatsApp (volume)',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.whatsappTotal || '—'}</Typography>
      ),
    },
    {
      key: 'aiCostUsd',
      label: 'Coût IA',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          {row.aiCostUsd > 0 ? (
            <>
              ${row.aiCostUsd.toFixed(4)}{' '}
              <Typography component="span" sx={{ fontSize: 10, color: t.text3 }}>
                ({row.aiCalls} appels)
              </Typography>
            </>
          ) : (
            '—'
          )}
        </Typography>
      ),
    },
    {
      key: 'airroiCostUsd',
      label: 'Coût AirROI',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          ${row.airroiCostUsd.toFixed(4)} <Typography component="span" sx={{ fontSize: 10, color: t.text3 }}>({row.airroiCalls} appels)</Typography>
        </Typography>
      ),
    },
    {
      key: 'totalCostUsd',
      label: 'Total connu',
      align: 'right' as const,
      render: (row: SummaryRow) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text, fontFamily: 'monospace' }}>
          ${row.totalCostUsd.toFixed(2)}
        </Typography>
      ),
    },
  ];

  const tableRows = rows.map((r) => ({ id: `${r.ownerId}|${r.month}`, ...r }));

  return (
    <Stack spacing={2}>
      {error ? <MonitorError message={error} onRetry={() => void fetchData()} /> : null}

      <StatsRow>
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(ownersCount)}
          label="Owners avec au moins une consommation trackée"
        />
        <StatCard
          icon="🏠"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={`$${totalRuCostUsd.toFixed(2)}`}
          label="Coût RU implicite total (ce mois)"
        />
        <StatCard
          icon="🤖"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={`$${totalAiCostUsd.toFixed(2)}`}
          label="Coût IA total (ce mois)"
        />
        <StatCard
          icon="🌍"
          iconBg="rgba(13,148,136,0.12)"
          iconColor="#0D9488"
          value={`$${totalAirroiCostUsd.toFixed(2)}`}
          label="Coût AirROI réel total (ce mois)"
        />
        <StatCard
          icon="💬"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={String(totalWhatsapp)}
          label="Messages WhatsApp (ce mois, volume)"
        />
        <StatCard
          icon="💰"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={`$${(totalRuCostUsd + totalAirroiCostUsd + totalAiCostUsd).toFixed(2)}`}
          label="Total connu ce mois (hors coût WhatsApp)"
        />
      </StatsRow>

      <MonitorSection title="Récap consommation par owner et par mois">
        {rows.length === 0 ? (
          <MonitorEmpty message="Aucune consommation trackée pour l'instant." />
        ) : (
          <DataTable columns={columns} rows={tableRows} />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        RU n'a pas d'historique mensuel (snapshot du nombre de listings actuel) — seul le mois en
        cours affiche un coût RU. AirROI et IA ont un vrai historique par mois avec coût réel.
        WhatsApp affiche un volume de messages, pas de coût — la tarification Meta Cloud API se
        fait par conversation (catégorie + pays), grille pas encore construite.
      </Typography>
    </Stack>
  );
}

export default PricingSummaryTab;
