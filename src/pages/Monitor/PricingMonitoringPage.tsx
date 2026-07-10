/**
 * Pricing / Consommation — vue admin-only : coût des services externes réparti par owner,
 * pour comparer consommation réelle et coût payé. Implémenté : RU ($700/200 listings,
 * estimation proportionnelle), AirROI (coût réel par appel, dynamic pricing). WhatsApp et
 * IA à venir. Suit le pattern CronMonitoringPage.tsx.
 */

import { useCallback, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { getPersistedUser } from '../../data/mockAuth';
import { hasAdminAccess } from '../../utils/rbac.utils';
import {
  fetchRuListingsByOwner,
  fetchAirroiCostByOwner,
  type RuListingsByOwnerItem,
  type AirroiCostByOwnerItem,
} from '../../services/pricingDashboardApi';
import { resolveChannelsOwnerNames } from '../../services/channelsDashboardApi';
import {
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  StatCard,
  StatsRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

/** RU facture Sojori $700/mois pour un quota de 200 listings — coût implicite par listing. */
const RU_MONTHLY_COST_USD = 700;
const RU_LISTING_QUOTA = 200;
const RU_COST_PER_LISTING = RU_MONTHLY_COST_USD / RU_LISTING_QUOTA;

function resolveCanManagePricing(userRole: string | undefined): boolean {
  if (hasAdminAccess(userRole)) return true;
  const persisted = getPersistedUser();
  if (hasAdminAccess(persisted?.role)) return true;
  return false;
}

export default function PricingMonitoringPage() {
  const { user } = useAuth();
  const canView = resolveCanManagePricing(user?.role);

  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RuListingsByOwnerItem[]>([]);
  const [totalRuListings, setTotalRuListings] = useState(0);
  const [airroiItems, setAirroiItems] = useState<AirroiCostByOwnerItem[]>([]);
  const [airroiTotalCostUsd, setAirroiTotalCostUsd] = useState(0);
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
      setItems(ruRows);
      setTotalRuListings(ruRes.data.success ? ruRes.data.data.totalRuListings || 0 : 0);

      const airroiRows = airroiRes.data.success ? airroiRes.data.data.items || [] : [];
      setAirroiItems(airroiRows);
      setAirroiTotalCostUsd(airroiRes.data.success ? airroiRes.data.data.totalCostUsd || 0 : 0);

      const ownerIds = Array.from(
        new Set([...ruRows.map((r) => r.ownerId), ...airroiRows.map((r) => r.ownerId)].filter(Boolean)),
      );
      if (ownerIds.length > 0) {
        try {
          const namesRes = await resolveChannelsOwnerNames(ownerIds);
          const map = (namesRes as { data?: { data?: Record<string, string> } })?.data?.data || {};
          setOwnerNames(map);
        } catch {
          // Résolution des noms best-effort — les IDs bruts restent affichables.
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [isLive, fetchData]);

  if (!canView) {
    return (
      <MonitorPageFrame>
        <MonitorPageHeader
          accent="default"
          title="Pricing / Consommation"
          subtitle="Réservé aux administrateurs"
        />
        <MonitorEmpty message="Accès réservé aux rôles Admin / SuperAdmin." />
      </MonitorPageFrame>
    );
  }

  if (loading && items.length === 0) {
    return (
      <MonitorPageFrame>
        <MonitorLoading label="Chargement de la consommation…" />
      </MonitorPageFrame>
    );
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

  const airroiColumns = [
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
      label: 'Coût réel (30j)',
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

  const airroiRows = airroiItems.map((i) => ({ id: i.ownerId, ...i }));

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="default"
        title="💰 Pricing / Consommation"
        subtitle="Consommation par owner des services facturés à Sojori — RU et AirROI (implémentés), WhatsApp et IA à venir"
        live={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        onRefresh={() => void fetchData()}
        loading={loading}
      />

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

      <Stack sx={{ mt: 2, mb: 1 }}>
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          Le coût RU (${RU_MONTHLY_COST_USD}/mois pour {RU_LISTING_QUOTA} listings) est un forfait facturé
          globalement par Rentals United — la répartition par owner ci-dessus est une estimation
          proportionnelle au nombre de listings synchronisés, pas une facture RU réelle par owner.
        </Typography>
      </Stack>

      <StatsRow>
        <StatCard
          icon="🌍"
          iconBg="rgba(13,148,136,0.12)"
          iconColor="#0D9488"
          value={`$${airroiTotalCostUsd.toFixed(2)}`}
          label="Coût AirROI réel — 30 derniers jours"
        />
        <StatCard
          icon="📈"
          iconBg="rgba(184,133,26,0.12)"
          iconColor={t.primaryDeep}
          value={String(airroiItems.reduce((sum, i) => sum + i.totalCalls, 0))}
          label="Appels AirROI (30j, dynamic pricing)"
        />
        <StatCard
          icon="👥"
          iconBg="rgba(124,58,237,0.12)"
          iconColor={t.ai}
          value={String(airroiItems.length)}
          label="Owners consommant AirROI"
        />
      </StatsRow>

      <MonitorSection title="Coût AirROI par owner (dynamic pricing — 30 derniers jours)">
        {airroiItems.length === 0 ? (
          <MonitorEmpty message="Aucun appel AirROI enregistré sur la période." />
        ) : (
          <DataTable columns={airroiColumns} rows={airroiRows} />
        )}
      </MonitorSection>

      <Stack sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          Contrairement à RU, le coût AirROI ci-dessus est le montant réel facturé par appel
          (AirroiApiCall.costUsd), pas une estimation — chaque appel au connecteur AirROI (marché,
          comparables) est tarifé et tracké individuellement par owner.
        </Typography>
      </Stack>
    </MonitorPageFrame>
  );
}
