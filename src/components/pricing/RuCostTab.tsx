/**
 * Onglet Pricing — Listings RU par owner vs coût $700/200 (estimation proportionnelle,
 * RU facture Sojori globalement, pas par owner).
 */
import { useCallback, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  fetchRuListingsByOwner,
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

export function RuCostTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RuListingsByOwnerItem[]>([]);
  const [totalRuListings, setTotalRuListings] = useState(0);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRuListingsByOwner();
      if (res.data.success) {
        const rows = res.data.data.items || [];
        setItems(rows);
        setTotalRuListings(res.data.data.totalRuListings || 0);
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
    return <MonitorLoading label="Chargement des listings RU…" />;
  }

  const totalCostUsd = totalRuListings * RU_COST_PER_LISTING;

  const columns = [
    {
      key: 'owner',
      label: 'Owner',
      render: (row: RuListingsByOwnerItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          {ownerNames[row.ownerId] || row.ownerId}
        </Typography>
      ),
    },
    {
      key: 'ruListingCount',
      label: 'Listings RU',
      align: 'right' as const,
      render: (row: RuListingsByOwnerItem) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{row.ruListingCount}</Typography>
      ),
    },
    {
      key: 'activeCount',
      label: 'Dont actifs',
      align: 'right' as const,
      render: (row: RuListingsByOwnerItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.activeCount}</Typography>
      ),
    },
    {
      key: 'costShare',
      label: 'Coût RU implicite',
      align: 'right' as const,
      render: (row: RuListingsByOwnerItem) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
          ${(row.ruListingCount * RU_COST_PER_LISTING).toFixed(2)}
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
          icon="🏠"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(totalRuListings)}
          label={`Listings RU synchronisés (sur quota ${RU_LISTING_QUOTA})`}
        />
        <StatCard
          icon="💵"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={`$${RU_MONTHLY_COST_USD}`}
          label="Coût mensuel RU (fixe)"
        />
        <StatCard
          icon="📊"
          iconBg="rgba(6,182,212,0.12)"
          iconColor="#0e7490"
          value={`$${totalCostUsd.toFixed(2)}`}
          label="Coût implicite réparti (owners actifs)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(items.length)}
          label="Owners avec au moins 1 listing RU"
        />
      </StatsRow>

      <MonitorSection title="Listings RU par owner">
        {items.length === 0 ? (
          <MonitorEmpty message="Aucun listing synchronisé RU trouvé." />
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </MonitorSection>

      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        Le coût RU (${RU_MONTHLY_COST_USD}/mois pour {RU_LISTING_QUOTA} listings) est un forfait facturé
        globalement par Rentals United — la répartition par owner ci-dessus est une estimation
        proportionnelle au nombre de listings synchronisés, pas une facture RU réelle par owner.
      </Typography>
    </Stack>
  );
}

export default RuCostTab;
