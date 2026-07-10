/**
 * Récap Pricing — une ligne par owner par mois : listings RU (snapshot courant, RU n'a pas
 * d'historique mensuel), coût RU implicite, coût AirROI réel du mois, coût WhatsApp/IA
 * (à venir). Les métriques non encore trackées apparaissent en "—" plutôt que d'être omises,
 * pour que la table garde sa forme finale dès maintenant.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchRuListingsByOwner,
  fetchAirroiCostByOwner,
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
  totalCostUsd: number;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function PricingSummaryTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruItems, setRuItems] = useState<RuListingsByOwnerItem[]>([]);
  const [airroiByMonth, setAirroiByMonth] = useState<
    { ownerId: string; month: string; calls: number; costUsd: number }[]
  >([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ruRes, airroiRes] = await Promise.all([
        fetchRuListingsByOwner(),
        fetchAirroiCostByOwner({ hours: 720 }),
      ]);

      const ruRows = ruRes.data.success ? ruRes.data.data.items || [] : [];
      setRuItems(ruRows);

      const airroiMonthRows = airroiRes.data.success ? airroiRes.data.data.byMonth || [] : [];
      setAirroiByMonth(airroiMonthRows);

      const ownerIds = Array.from(
        new Set([...ruRows.map((r) => r.ownerId), ...airroiMonthRows.map((r) => r.ownerId)].filter(Boolean)),
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

    // Un owner apparaît dans le récap s'il a des listings RU OU au moins un mois d'activité AirROI.
    const ownerMonthKeys = new Set<string>();
    for (const r of ruItems) ownerMonthKeys.add(`${r.ownerId}|${thisMonth}`);
    for (const r of airroiByMonth) ownerMonthKeys.add(`${r.ownerId}|${r.month}`);

    return Array.from(ownerMonthKeys)
      .map((key) => {
        const [ownerId, month] = key.split('|');
        const ru = ruByOwner.get(ownerId);
        const airroi = airroiByOwnerMonth.get(key);
        const ruListingCount = month === thisMonth ? ru?.ruListingCount || 0 : 0;
        const ruCostUsd = ruListingCount * RU_COST_PER_LISTING;
        const airroiCostUsd = airroi?.costUsd || 0;
        return {
          ownerId,
          month,
          ruListingCount,
          ruCostUsd,
          airroiCostUsd,
          airroiCalls: airroi?.calls || 0,
          totalCostUsd: ruCostUsd + airroiCostUsd,
        };
      })
      .sort((a, b) => (a.month === b.month ? b.totalCostUsd - a.totalCostUsd : b.month.localeCompare(a.month)));
  }, [ruItems, airroiByMonth]);

  if (loading && ruItems.length === 0 && airroiByMonth.length === 0) {
    return <MonitorLoading label="Chargement du récap consommation…" />;
  }

  const totalRuCostUsd = ruItems.reduce((sum, r) => sum + r.ruListingCount * RU_COST_PER_LISTING, 0);
  const totalAirroiCostUsd = airroiByMonth
    .filter((r) => r.month === currentMonthKey())
    .reduce((sum, r) => sum + r.costUsd, 0);
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
      key: 'whatsappCostUsd',
      label: 'Coût WhatsApp',
      align: 'right' as const,
      render: () => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic' }}>à venir</Typography>
      ),
    },
    {
      key: 'aiCostUsd',
      label: 'Coût IA',
      align: 'right' as const,
      render: () => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic' }}>à venir</Typography>
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
          icon="🌍"
          iconBg="rgba(13,148,136,0.12)"
          iconColor="#0D9488"
          value={`$${totalAirroiCostUsd.toFixed(2)}`}
          label="Coût AirROI réel total (ce mois)"
        />
        <StatCard
          icon="💰"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={`$${(totalRuCostUsd + totalAirroiCostUsd).toFixed(2)}`}
          label="Total connu ce mois (hors WhatsApp/IA)"
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
        cours affiche un coût RU. AirROI a un vrai historique par mois. WhatsApp et IA seront
        ajoutés aux colonnes correspondantes une fois leur tracking construit.
      </Typography>
    </Stack>
  );
}

export default PricingSummaryTab;
