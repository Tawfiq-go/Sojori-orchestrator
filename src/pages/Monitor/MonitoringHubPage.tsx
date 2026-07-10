import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { ViewToggle, monitorTokens as t } from '../../features/monitoring/shared/MonitorDesign';
import UnifiedMonitoringPage from './UnifiedMonitoringPage';
import LogsPage from './LogsPage';
import MetricsPageUltra from './MetricsPageUltra';
import RabbitMQPage from './RabbitMQPage';
import WhatsAppMonitoringPage from './WhatsAppMonitoringPage';
import AIMonitoringPage from './AIMonitoringPage';
import InfrastructureMonitoringPage from './InfrastructureMonitoringPage';
import PodsMonitoringPage from './PodsMonitoringPage';
import ReservationSyncMonitorTab from './ReservationSyncMonitorTab';
import SocketMonitoringPage from './SocketMonitoringPage';
import APIMonitoringPage from './APIMonitoringPage';
import CronMonitoringPage from './CronMonitoringPage';
import PricingMonitoringPage from './PricingMonitoringPage';

const TAB_OPTIONS = [
  { value: 'Summary', label: '📊 Summary' },
  { value: 'Logs', label: '📝 Logs' },
  { value: 'Metrics', label: '📈 Metrics' },
  { value: 'RabbitMQ', label: '🐰 RabbitMQ' },
  { value: 'WhatsApp', label: '💬 WhatsApp' },
  { value: 'Sockets', label: '🔌 Sockets' },
  { value: 'API', label: '🌐 API' },
  { value: 'AI', label: '🤖 IA' },
  { value: 'Infrastructure', label: '🏗️ Infra' },
  { value: 'Pods', label: '🧩 Pods' },
  { value: 'ReservationSync', label: '🔄 Sync résa' },
  { value: 'Cron', label: '⏱️ Cron' },
  { value: 'Pricing', label: '💰 Pricing' },
] as const;

type MonitorTab = (typeof TAB_OPTIONS)[number]['value'];

const VALID = new Set<string>(TAB_OPTIONS.map((o) => o.value));
const LEGACY_TAB = new Set(['Unified', 'Alertes', 'RU', 'Security']);

const TAB_BY_LOWER: Record<string, MonitorTab> = {
  summary: 'Summary',
  logs: 'Logs',
  metrics: 'Metrics',
  rabbitmq: 'RabbitMQ',
  whatsapp: 'WhatsApp',
  sockets: 'Sockets',
  api: 'API',
  ai: 'AI',
  infrastructure: 'Infrastructure',
  pods: 'Pods',
  'reservation-sync': 'ReservationSync',
  cron: 'Cron',
  pricing: 'Pricing',
};

function canonicalTab(tabParam: string | null): MonitorTab {
  if (!tabParam) return 'Summary';
  const lo = tabParam.trim().toLowerCase();
  return TAB_BY_LOWER[lo] || (tabParam as MonitorTab);
}

export default function MonitoringHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const raw = useMemo(() => canonicalTab(tabParam), [tabParam]);
  const tab = useMemo(() => (VALID.has(raw) ? raw : 'Summary'), [raw]) as MonitorTab;

  useEffect(() => {
    if (tabParam && LEGACY_TAB.has(tabParam)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'Summary');
      setSearchParams(next, { replace: true });
      return;
    }
    if (tabParam && TAB_BY_LOWER[tabParam.trim().toLowerCase()] && TAB_BY_LOWER[tabParam.trim().toLowerCase()] !== tabParam) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', TAB_BY_LOWER[tabParam.trim().toLowerCase()]);
      setSearchParams(next, { replace: true });
      return;
    }
    if (!tabParam || !VALID.has(canonicalTab(tabParam))) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'Summary');
      setSearchParams(next, { replace: true });
    }
  }, [tabParam, searchParams, setSearchParams]);

  return (
    <DashboardWrapper breadcrumb={['Monitor', tab]}>
      <Box className="sojori-main-enter" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            mb: 2.5,
            pb: 2,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <ViewToggle
            options={TAB_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={tab}
            onChange={(v) => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', v);
              setSearchParams(next);
            }}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {tab === 'Summary' && <UnifiedMonitoringPage />}
          {tab === 'Logs' && <LogsPage />}
          {tab === 'Metrics' && <MetricsPageUltra />}
          {tab === 'RabbitMQ' && <RabbitMQPage />}
          {tab === 'WhatsApp' && <WhatsAppMonitoringPage />}
          {tab === 'Sockets' && <SocketMonitoringPage />}
          {tab === 'API' && <APIMonitoringPage />}
          {tab === 'AI' && <AIMonitoringPage />}
          {tab === 'Infrastructure' && <InfrastructureMonitoringPage />}
          {tab === 'Pods' && <PodsMonitoringPage />}
          {tab === 'ReservationSync' && <ReservationSyncMonitorTab />}
          {tab === 'Cron' && <CronMonitoringPage />}
          {tab === 'Pricing' && <PricingMonitoringPage />}
        </Box>
      </Box>
    </DashboardWrapper>
  );
}
