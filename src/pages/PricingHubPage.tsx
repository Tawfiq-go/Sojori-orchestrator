/**
 * Pricing / Cost — page admin-only indépendante (pas un onglet du hub Monitoring).
 * Route /admin/pricing?tab=X. Summary = récap par owner/mois toutes métriques ; les autres
 * onglets détaillent chaque métrique individuellement.
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAuth } from '../hooks/useAuth';
import { getPersistedUser } from '../data/mockAuth';
import { hasAdminAccess } from '../utils/rbac.utils';
import { ViewToggle, monitorTokens as t, MonitorEmpty, MonitorPageFrame } from '../features/monitoring/shared/MonitorDesign';
import { PricingSummaryTab } from '../components/pricing/PricingSummaryTab';
import { RuCostTab } from '../components/pricing/RuCostTab';
import { AirroiCostTab } from '../components/pricing/AirroiCostTab';
import { AiCostTab } from '../components/pricing/AiCostTab';
import { WhatsappCostTab } from '../components/pricing/WhatsappCostTab';

const TAB_OPTIONS = [
  { value: 'Summary', label: '📋 Summary' },
  { value: 'RU', label: '🏠 Listings RU' },
  { value: 'WhatsApp', label: '💬 WhatsApp' },
  { value: 'AI', label: '🤖 IA' },
  { value: 'AirROI', label: '🌍 AirROI' },
] as const;

type PricingTab = (typeof TAB_OPTIONS)[number]['value'];
const VALID = new Set<string>(TAB_OPTIONS.map((o) => o.value));

function resolveCanViewPricing(userRole: string | undefined): boolean {
  if (hasAdminAccess(userRole)) return true;
  const persisted = getPersistedUser();
  if (hasAdminAccess(persisted?.role)) return true;
  return false;
}

export default function PricingHubPage() {
  const { user } = useAuth();
  const canView = resolveCanViewPricing(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = useMemo(() => (VALID.has(tabParam || '') ? (tabParam as PricingTab) : 'Summary'), [tabParam]);

  useEffect(() => {
    if (!tabParam || !VALID.has(tabParam)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'Summary');
      setSearchParams(next, { replace: true });
    }
  }, [tabParam, searchParams, setSearchParams]);

  if (!canView) {
    return (
      <DashboardWrapper breadcrumb={['Cost']}>
        <MonitorPageFrame>
          <MonitorEmpty message="Accès réservé aux rôles Admin / SuperAdmin." />
        </MonitorPageFrame>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Cost', tab]}>
      <Box className="sojori-main-enter" sx={{ minWidth: 0 }}>
        <Box sx={{ mb: 2.5, pb: 2, borderBottom: `1px solid ${t.border}` }}>
          <ViewToggle
            options={TAB_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={tab}
            onChange={(v: string) => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', v);
              setSearchParams(next);
            }}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {tab === 'Summary' && <PricingSummaryTab />}
          {tab === 'RU' && <RuCostTab />}
          {tab === 'AirROI' && <AirroiCostTab />}
          {tab === 'WhatsApp' && <WhatsappCostTab />}
          {tab === 'AI' && <AiCostTab />}
        </Box>
      </Box>
    </DashboardWrapper>
  );
}
