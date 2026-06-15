import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  useNodes,
  usePods,
  useOverview,
  useBusinessMetrics,
  useSecurityMetrics,
  useChatbotMetrics,
  useTimeSeries,
  useRabbitMQMetrics,
} from '../../features/monitoring/metrics/hooks/usePrometheusData';
import { monitoringDelete } from '../../utils/monitoringApi';
import {
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorTimeRange,
} from '../../features/monitoring/shared/MonitorDesign';

// Type definitions
interface PrometheusResult {
  metric: Record<string, any>;
  value: [number, string];
  values?: Array<[number, string]>;
}

interface PrometheusResponse {
  result?: PrometheusResult[];
}

interface NodeData {
  instance: string;
  name: string;
  cpu: string;
  memory: string;
  networkRx: string;
  networkTx: string;
  disk: string;
  cpuCount: number;
  podsCount: number;
}

interface PodData {
  name: string;
  serviceName: string;
  status: string;
  cpu: string;
  memory: string;
  cpuPercent: string;
  memoryPercent: string;
  restarts: number;
  image: string | null;
  uptime: string | null;
}

interface NodesData {
  cpu?: PrometheusResponse;
  memory?: PrometheusResponse;
  disk?: PrometheusResponse;
  cpu_count?: PrometheusResponse;
  pods_per_node?: PrometheusResponse;
  network_rx?: PrometheusResponse;
  network_tx?: PrometheusResponse;
  node_info?: PrometheusResponse;
}

interface PodsData {
  status?: PrometheusResponse;
  cpu?: PrometheusResponse;
  memory?: PrometheusResponse;
  restarts?: PrometheusResponse;
  metadata?: Record<string, { image?: string; uptime?: string }>;
}

interface OverviewData {
  network_ingress?: PrometheusResponse;
  network_egress?: PrometheusResponse;
}

interface BusinessData {
  http_request_duration_p95?: PrometheusResponse;
}

interface RabbitMQData {
  cluster_running_nodes?: PrometheusResponse;
  cluster_nodes?: PrometheusResponse;
  total_messages?: PrometheusResponse;
  messages_ready?: PrometheusResponse;
  messages_unacked?: PrometheusResponse;
  total_queues?: PrometheusResponse;
  message_publish_rate?: PrometheusResponse;
  message_consume_rate?: PrometheusResponse;
  total_connections?: PrometheusResponse;
  total_channels?: PrometheusResponse;
  total_consumers?: PrometheusResponse;
  memory_used?: PrometheusResponse;
  disk_free?: PrometheusResponse;
}

interface TimeSeriesDataPoint {
  time: string;
  value: number;
}

const STATUS_PRIORITY_PODS: Record<string, number> = {
  Failed: 0,
  CrashLoopBackOff: 1,
  Pending: 2,
  Unknown: 3,
  Succeeded: 4,
  Running: 5
};

function podHasProblem(pod: PodData): boolean {
  const isBadPhase = pod.status !== 'Running' && pod.status !== 'Succeeded';
  const hasRestarts = pod.restarts > 0;
  const isHighCPU = parseFloat(pod.cpu) > 500;
  const isHighMemory = parseFloat(pod.memory) > 400;
  return isBadPhase || hasRestarts || isHighCPU || isHighMemory;
}

function comparePodsForSort(a: PodData, b: PodData, sortPodsBy: string): number {
  if (sortPodsBy === 'status') {
    const priorityDiff = (STATUS_PRIORITY_PODS[a.status] ?? 5) - (STATUS_PRIORITY_PODS[b.status] ?? 5);
    if (priorityDiff !== 0) return priorityDiff;
    return parseFloat(b.cpu) - parseFloat(a.cpu);
  }
  if (sortPodsBy === 'cpu') return parseFloat(b.cpu) - parseFloat(a.cpu);
  if (sortPodsBy === 'memory') return parseFloat(b.memory) - parseFloat(a.memory);
  if (sortPodsBy === 'service') return a.serviceName.localeCompare(b.serviceName);
  return 0;
}

function sortPodsList(arr: PodData[], sortPodsBy: string): PodData[] {
  return [...arr].sort((a, b) => comparePodsForSort(a, b, sortPodsBy));
}

const MetricsPageUltra: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [deletingPod, setDeletingPod] = useState<string | null>(null);
  const [showOnlyProblems, setShowOnlyProblems] = useState<boolean>(false);
  const [sortNodesBy, setSortNodesBy] = useState<string>('cpu');
  const [sortPodsBy, setSortPodsBy] = useState<string>('status');

  const { data: nodesData, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useNodes();
  const { data: podsData, loading: podsLoading, error: podsError, refetch: refetchPods } = usePods();
  const { data: overviewData, refetch: refetchOverview } = useOverview(timeRange);
  const { data: businessData, refetch: refetchBusiness } = useBusinessMetrics(timeRange);
  const { data: securityData, refetch: refetchSecurity } = useSecurityMetrics(timeRange);
  const { data: chatbotData, refetch: refetchChatbot } = useChatbotMetrics(timeRange);
  const { data: rabbitmqData, refetch: refetchRabbitmq } = useRabbitMQMetrics();
  const { data: cpuTimeSeries, refetch: refetchCpuTs } = useTimeSeries(
    'sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m]))',
    timeRange,
    '1m',
  );
  const { data: memoryTimeSeries, refetch: refetchMemoryTs } = useTimeSeries(
    'sum(container_memory_working_set_bytes{namespace="production"})',
    timeRange,
    '1m',
  );
  const { data: requestsTimeSeries, refetch: refetchRequestsTs } = useTimeSeries(
    'sum(rate(http_requests_total{namespace="production"}[5m]))',
    timeRange,
    '1m',
  );
  const { data: podsTimeSeries, refetch: refetchPodsTs } = useTimeSeries(
    'count(kube_pod_status_phase{namespace="production",phase="Running"})',
    timeRange,
    '1m',
  );

  // Auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchNodes();
      refetchPods();
      refetchOverview();
      refetchBusiness();
      refetchSecurity();
      refetchChatbot();
      refetchRabbitmq();
      refetchCpuTs();
      refetchMemoryTs();
      refetchRequestsTs();
      refetchPodsTs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Delete pod function
  const handleDeletePod = async (podName: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le pod ${podName} ?`)) return;

    setDeletingPod(podName);
    try {
      const response = await monitoringDelete<{ success?: boolean; error?: string }>(
        `/pods/${encodeURIComponent(podName)}`,
      );

      if (response.data.success) {
        alert(`Pod ${podName} supprimé avec succès`);
        refetchPods();
      } else {
        alert(`Erreur lors de la suppression: ${response.data.error || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Erreur: ${errorMsg}`);
    } finally {
      setDeletingPod(null);
    }
  };

  // Process pods data with CPU and Memory
  const processedPods = React.useMemo<PodData[]>(() => {
    const podsRaw = podsData as PodsData | null | undefined;
    if (!podsRaw?.status) return [];
    const podsDataTyped = podsRaw;
    const pods = new Map<string, PodData>();

    // Get status
    podsDataTyped.status?.result?.forEach((item) => {
      const podName = item.metric.pod;
      const phase = item.metric.phase;
      if (parseFloat(item.value[1]) === 1) {
        const serviceMatch = podName.match(/^(srv-[a-z-]+)/);
        const serviceName = serviceMatch ? serviceMatch[1] : podName.split('-')[0];

        pods.set(podName, {
          name: podName,
          serviceName: serviceName,
          status: phase,
          cpu: '0',
          memory: '0',
          cpuPercent: '0',
          memoryPercent: '0',
          restarts: 0,
          image: null,
          uptime: null
        });
      }
    });

    // Add CPU usage (in millicores)
    podsDataTyped.cpu?.result?.forEach((item) => {
      const podName = item.metric.pod;
      if (pods.has(podName)) {
        const cpuCores = parseFloat(item.value[1]);
        const pod = pods.get(podName)!;
        pod.cpu = (cpuCores * 1000).toFixed(0);
        pod.cpuPercent = (cpuCores * 100).toFixed(1);
      }
    });

    // Add Memory usage (in MB)
    podsDataTyped.memory?.result?.forEach((item) => {
      const podName = item.metric.pod;
      if (pods.has(podName)) {
        const memoryBytes = parseFloat(item.value[1]);
        const pod = pods.get(podName)!;
        pod.memory = (memoryBytes / 1024 / 1024).toFixed(0);
        pod.memoryPercent = ((memoryBytes / 1024 / 1024 / 512) * 100).toFixed(1);
      }
    });

    // Add restart count
    podsDataTyped.restarts?.result?.forEach((item) => {
      const podName = item.metric.pod;
      if (pods.has(podName)) {
        pods.get(podName)!.restarts = parseInt(item.value[1]) || 0;
      }
    });

    // Add image and uptime from Kubernetes metadata
    const metadata = podsDataTyped.metadata || {};
    pods.forEach((pod, podName) => {
      const meta = metadata[podName];
      if (meta) {
        pod.image = meta.image || null;
        pod.uptime = meta.uptime || null;
      }
    });

    const podsArray = Array.from(pods.values());
    return sortPodsList(podsArray, sortPodsBy);
  }, [podsData, sortPodsBy]);

  const podsWithProblems = React.useMemo(() => processedPods.filter(podHasProblem), [processedPods]);

  const displayedPods = React.useMemo(() => {
    if (showOnlyProblems) {
      return sortPodsList(
        processedPods.filter(podHasProblem),
        sortPodsBy
      );
    }
    const problems = processedPods.filter((p) => podHasProblem(p));
    const healthy = processedPods.filter((p) => !podHasProblem(p));
    return [...sortPodsList(problems, sortPodsBy), ...sortPodsList(healthy, sortPodsBy)];
  }, [processedPods, showOnlyProblems, sortPodsBy]);

  // Process nodes with ALL metrics + real names
  const processedNodes = React.useMemo<NodeData[]>(() => {
    const nodesRaw = nodesData as NodesData | null | undefined;
    if (!nodesRaw?.cpu || !nodesRaw?.memory) return [];
    const nodes = new Map<string, NodeData>();

    // Build instance → node name mapping from kube_node_info
    const instanceToNode = new Map<string, string>();
    nodesRaw.node_info?.result?.forEach((item) => {
      const instance = item.metric.instance;
      const nodeName = item.metric.node || instance.split(':')[0];
      instanceToNode.set(instance, nodeName);
    });

    // CPU
    nodesRaw.cpu?.result?.forEach((item) => {
      const instance = item.metric.instance;
      const nodeName = instanceToNode.get(instance) || instance.split(':')[0];
      nodes.set(instance, {
        instance,
        name: nodeName,
        cpu: (parseFloat(item.value[1]) * 100).toFixed(1),
        memory: '0',
        networkRx: '0',
        networkTx: '0',
        disk: '0',
        cpuCount: 0,
        podsCount: 0
      });
    });

    // Memory
    nodesRaw.memory?.result?.forEach((item) => {
      const instance = item.metric.instance;
      if (nodes.has(instance)) {
        nodes.get(instance)!.memory = (parseFloat(item.value[1]) * 100).toFixed(1);
      }
    });

    // Disk usage
    nodesRaw.disk?.result?.forEach((item) => {
      const instance = item.metric.instance;
      if (nodes.has(instance)) {
        nodes.get(instance)!.disk = (parseFloat(item.value[1]) * 100).toFixed(1);
      }
    });

    // CPU count
    nodesRaw.cpu_count?.result?.forEach((item) => {
      const instance = item.metric.instance;
      if (nodes.has(instance)) {
        nodes.get(instance)!.cpuCount = parseInt(item.value[1]) || 0;
      }
    });

    // Pods per node
    nodesRaw.pods_per_node?.result?.forEach((item) => {
      const nodeName = item.metric.node;
      nodes.forEach((nodeData) => {
        if (nodeData.name === nodeName) {
          nodeData.podsCount = parseInt(item.value[1]) || 0;
        }
      });
    });

    // Network RX (bytes/sec)
    nodesRaw.network_rx?.result?.forEach((item) => {
      const instance = item.metric.instance;
      if (nodes.has(instance)) {
        const bytesPerSec = parseFloat(item.value[1]);
        nodes.get(instance)!.networkRx = (bytesPerSec / 1024).toFixed(0);
      }
    });

    // Network TX (bytes/sec)
    nodesRaw.network_tx?.result?.forEach((item) => {
      const instance = item.metric.instance;
      if (nodes.has(instance)) {
        const bytesPerSec = parseFloat(item.value[1]);
        nodes.get(instance)!.networkTx = (bytesPerSec / 1024).toFixed(0);
      }
    });

    // Sort nodes based on sortNodesBy
    const nodesArray = Array.from(nodes.values());
    if (sortNodesBy === 'cpu') {
      nodesArray.sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu));
    } else if (sortNodesBy === 'memory') {
      nodesArray.sort((a, b) => parseFloat(b.memory) - parseFloat(a.memory));
    } else if (sortNodesBy === 'disk') {
      nodesArray.sort((a, b) => parseFloat(b.disk) - parseFloat(a.disk));
    } else if (sortNodesBy === 'name') {
      nodesArray.sort((a, b) => a.name.localeCompare(b.name));
    }
    return nodesArray;
  }, [nodesData, sortNodesBy]);

  // Calculate averages
  const avgCPU =
    processedNodes.length > 0
      ? (processedNodes.reduce((s, n) => s + parseFloat(n.cpu), 0) / processedNodes.length).toFixed(1)
      : '0';
  const avgMemory =
    processedNodes.length > 0
      ? (processedNodes.reduce((s, n) => s + parseFloat(n.memory), 0) / processedNodes.length).toFixed(1)
      : '0';

  // Convert Prometheus time series to chart data
  const formatTimeSeriesData = (tsData: unknown): TimeSeriesDataPoint[] => {
    const ts = tsData as PrometheusResponse | null | undefined;
    if (!ts?.result?.[0]?.values) return [];
    return ts.result[0].values.map(([timestamp, value]) => ({
      time: new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: parseFloat(value)
    }));
  };

  const cpuChartData = formatTimeSeriesData(cpuTimeSeries);
  const memoryChartData = formatTimeSeriesData(memoryTimeSeries);
  const requestsChartData = formatTimeSeriesData(requestsTimeSeries);
  const podsChartData = formatTimeSeriesData(podsTimeSeries);

  const overview = overviewData as OverviewData | null | undefined;
  const business = businessData as BusinessData | null | undefined;
  const rabbitmq = rabbitmqData as RabbitMQData | null | undefined;

  const statusColors: Record<string, string> = {
    Running: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    CrashLoopBackOff: 'bg-red-100 text-red-700',
    Unknown: 'bg-gray-100 text-gray-700',
  };

  const metricsLoadError = nodesError || podsError;

  const refreshAll = () => {
    refetchNodes();
    refetchPods();
    refetchOverview();
    refetchBusiness();
    refetchSecurity();
    refetchChatbot();
    refetchRabbitmq();
    refetchCpuTs();
    refetchMemoryTs();
    refetchRequestsTs();
    refetchPodsTs();
  };

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="metrics"
        title="Métriques Prometheus"
        subtitle={`${processedNodes.length} nœuds · ${processedPods.length} pods · CPU moy. ${avgCPU}% · RAM moy. ${avgMemory}%`}
        count={timeRange}
        live={autoRefresh}
        onToggleLive={() => setAutoRefresh((v) => !v)}
        onRefresh={refreshAll}
        loading={nodesLoading || podsLoading}
      />

      <MonitorTimeRange
        ranges={[
          { value: '1h', label: '1 h' },
          { value: '6h', label: '6 h' },
          { value: '24h', label: '24 h' },
          { value: '7d', label: '7 j' },
        ]}
        value={timeRange}
        onChange={setTimeRange}
      />

      {(nodesLoading || podsLoading) && (
        <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          Chargement Prometheus (nodes / pods)…
        </div>
      )}
      {metricsLoadError && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          Erreur métriques : {metricsLoadError} — vérifie le proxy Vite et l’auth (JWT / X-Dev-Token).
        </div>
      )}

      {/* Ultra-Compact Grid Layout - NO SCROLL */}
      <div className="p-2 grid grid-cols-12 gap-2 animate-fade-in">
        {/* Row 1: Compact KPIs with Sparklines */}
        <div className="col-span-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[10px] opacity-90">CLUSTER CPU</div>
              <div className="text-2xl font-black">{avgCPU}%</div>
            </div>
            <div className="text-xl">💻</div>
          </div>
          <ResponsiveContainer width="100%" height={30}>
            <AreaChart data={cpuChartData.length > 0 ? cpuChartData : [{ value: parseFloat(avgCPU) }]}>
              <Area type="monotone" dataKey="value" stroke="none" fill="rgba(255,255,255,0.3)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[10px] opacity-90">MEMORY</div>
              <div className="text-2xl font-black">{avgMemory}%</div>
            </div>
            <div className="text-xl">🧠</div>
          </div>
          <ResponsiveContainer width="100%" height={30}>
            <AreaChart data={memoryChartData.length > 0 ? memoryChartData : [{ value: parseFloat(avgMemory) }]}>
              <Area type="monotone" dataKey="value" stroke="none" fill="rgba(255,255,255,0.3)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[10px] opacity-90">PODS STATUS</div>
              <div className="text-2xl font-black">
                {processedPods.filter((p) => p.status === 'Running').length}/{processedPods.length}
              </div>
            </div>
            <div className="text-xl">📦</div>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {processedPods.slice(0, 15).map((pod, i) => (
              <div
                key={i}
                className={`w-1.5 h-6 rounded ${pod.status === 'Running' ? 'bg-white/30' : 'bg-red-400/70'}`}
                title={`${pod.serviceName}: ${pod.status}`}
              ></div>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-2 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[10px] opacity-90">REQ/SEC</div>
              <div className="text-2xl font-black">
                {requestsChartData.length > 0 ? requestsChartData[requestsChartData.length - 1]?.value?.toFixed(0) || 0 : 0}
              </div>
            </div>
            <div className="text-xl">📈</div>
          </div>
          <ResponsiveContainer width="100%" height={30}>
            <LineChart data={requestsChartData.length > 0 ? requestsChartData : [{ value: 0 }]}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Row 2: Nodes Table */}
        <div className="col-span-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 py-1 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900">🖥️ NODES ({processedNodes.length})</h3>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-600 mr-1">Trier:</span>
              {(
                [
                  { value: 'cpu', label: 'CPU' },
                  { value: 'memory', label: 'RAM' },
                  { value: 'disk', label: 'Disk' },
                  { value: 'name', label: 'Nom' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortNodesBy(value)}
                  className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-all ${
                    sortNodesBy === value
                      ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <table className="w-full text-[10px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">NODE</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">CPU</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">RAM</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">💾</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-700">📦</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-700">NET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedNodes.map((node, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-2 py-1 font-semibold text-gray-900 text-[10px]" title={`${node.name} (${node.cpuCount} cores)`}>
                      {node.name.substring(0, 18)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${node.cpu}%` }} />
                        </div>
                        <span className="font-bold text-gray-900 text-[9px] w-7">{node.cpu}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full">
                          <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: `${node.memory}%` }} />
                        </div>
                        <span className="font-bold text-gray-900 text-[9px] w-7">{node.memory}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <span className={`font-bold text-[9px] ${parseFloat(node.disk) > 80 ? 'text-red-600' : 'text-gray-900'}`}>
                        {node.disk}%
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <span className="font-bold text-green-600 text-[9px]">{node.podsCount}</span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <span className="font-bold text-blue-600 text-[9px]">
                        ↓{node.networkRx} ↑{node.networkTx}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-1 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-6 gap-2 text-center">
              <div>
                <div className="text-[9px] text-gray-600">Total CPU</div>
                <div className="text-[10px] font-bold text-blue-600">
                  {processedNodes.reduce((sum, n) => sum + (n.cpuCount || 0), 0)} cores
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-600">Avg CPU</div>
                <div className="text-[10px] font-bold">{avgCPU}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-600">Avg RAM</div>
                <div className="text-[10px] font-bold">{avgMemory}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-600">Avg Disk</div>
                <div className="text-[10px] font-bold">{processedNodes.length > 0 ? (processedNodes.reduce((sum, n) => sum + parseFloat(n.disk || '0'), 0) / processedNodes.length).toFixed(1) : 0}%</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-600">Total Pods</div>
                <div className="text-[10px] font-bold text-green-600">{processedPods.length}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-600">Network</div>
                <div className="text-[10px] font-bold text-blue-600">
                  ↓{processedNodes.reduce((sum, n) => sum + parseFloat(n.networkRx || '0'), 0).toFixed(0)}K ↑
                  {processedNodes.reduce((sum, n) => sum + parseFloat(n.networkTx || '0'), 0).toFixed(0)}K
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Pods Table */}
        <div className="col-span-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 py-1 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900">
              📦 PODS ({displayedPods.length}/{processedPods.length})
              {podsWithProblems.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">
                  {podsWithProblems.length} problème{podsWithProblems.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 mr-1">Trier:</span>
                {(
                  [
                    { value: 'status', label: 'Status' },
                    { value: 'cpu', label: 'CPU' },
                    { value: 'memory', label: 'RAM' },
                    { value: 'service', label: 'Service' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortPodsBy(value)}
                    className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-all ${
                      sortPodsBy === value
                        ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowOnlyProblems(!showOnlyProblems)}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                  showOnlyProblems
                    ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {showOnlyProblems ? '⚠️ Problèmes' : '📋 Tous'}
              </button>
            </div>
          </div>
          <div>
            <table className="w-full text-[10px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">SERVICE</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">STATUS</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">CPU</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">RAM</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">IMAGE</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-700">UPTIME</th>
                  <th className="px-2 py-1 text-center font-bold text-gray-700 w-6">⚠️</th>
                  <th className="px-2 py-1 text-center font-bold text-gray-700 w-12">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedPods.slice(0, 20).map((pod, i) => {
                  const isHighCPU = parseFloat(pod.cpu) > 500;
                  const isHighMemory = parseFloat(pod.memory) > 400;
                  const hasRestarts = pod.restarts > 0;
                  const isUnhealthyPhase = pod.status !== 'Running' && pod.status !== 'Succeeded';
                  const flagged = podHasProblem(pod);
                  const rowTone = isUnhealthyPhase
                    ? 'bg-red-50 hover:bg-red-100'
                    : flagged
                      ? 'bg-amber-50 hover:bg-amber-100'
                      : 'hover:bg-blue-50';

                  return (
                    <tr key={pod.name || i} className={`transition-colors ${rowTone}`}>
                      <td className="px-2 py-1">
                        <div className="font-semibold text-gray-900 truncate max-w-[90px] text-[10px]" title={pod.name}>
                          {pod.serviceName}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${statusColors[pod.status] || 'bg-gray-100 text-gray-700'}`}>
                          {pod.status}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div
                              className={`h-full ${isHighCPU ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`}
                              style={{ width: `${Math.min(parseFloat(pod.cpuPercent), 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold text-[10px] w-9 ${isHighCPU ? 'text-red-600' : 'text-gray-900'}`}>{pod.cpu}m</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div
                              className={`h-full ${isHighMemory ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                              style={{ width: `${Math.min(parseFloat(pod.memoryPercent), 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold text-[10px] w-9 ${isHighMemory ? 'text-orange-600' : 'text-gray-900'}`}>{pod.memory}M</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="text-[9px] text-gray-700 truncate max-w-[120px]" title={pod.image || 'N/A'}>
                          {pod.image || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="text-[9px] text-gray-700 font-medium">{pod.uptime || '-'}</div>
                      </td>
                      <td className="px-2 py-1 text-center">
                        {flagged && (
                          <span className="text-red-500 font-bold text-[10px]">
                            {hasRestarts ? `🔄${pod.restarts}` : '⚠️'}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeletePod(pod.name)}
                          disabled={deletingPod === pod.name}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            deletingPod === pod.name
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={`Supprimer ${pod.name}`}
                        >
                          {deletingPod === pod.name ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {displayedPods.length === 0 && !podsLoading && (
              <p className="p-4 text-center text-xs text-slate-500">Aucun pod (Prometheus ou filtre vide).</p>
            )}
          </div>
        </div>

        {/* RabbitMQ cluster strip */}
        <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
            🐰 RABBITMQ CLUSTER
            <span
              className={`px-2 py-0.5 rounded text-[9px] ${
                Number(rabbitmq?.cluster_running_nodes?.result?.[0]?.value?.[1] ?? 0) >= 3
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {rabbitmq?.cluster_running_nodes?.result?.[0]?.value?.[1] || 0}/
              {rabbitmq?.cluster_nodes?.result?.[0]?.value?.[1] || 0} nodes
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            <div className="bg-purple-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Messages</div>
              <div className="text-sm font-bold text-purple-700">{rabbitmq?.total_messages?.result?.[0]?.value?.[1] || 0}</div>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Queues</div>
              <div className="text-sm font-bold text-blue-700">{rabbitmq?.total_queues?.result?.[0]?.value?.[1] || 0}</div>
            </div>
            <div className="bg-green-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Publish Rate</div>
              <div className="text-sm font-bold text-green-700">
                {rabbitmq?.message_publish_rate?.result?.[0]?.value?.[1]
                  ? parseFloat(String(rabbitmq.message_publish_rate.result[0].value[1])).toFixed(1)
                  : 0}
                /s
              </div>
            </div>
            <div className="bg-orange-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Connections</div>
              <div className="text-sm font-bold text-orange-700">{rabbitmq?.total_connections?.result?.[0]?.value?.[1] || 0}</div>
            </div>
            <div className="bg-pink-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Consumers</div>
              <div className="text-sm font-bold text-pink-700">{rabbitmq?.total_consumers?.result?.[0]?.value?.[1] || 0}</div>
            </div>
            <div className="bg-red-50 rounded p-2">
              <div className="text-[9px] text-gray-600 mb-1">Memory</div>
              <div className="text-sm font-bold text-red-700">
                {rabbitmq?.memory_used?.result?.[0]?.value?.[1]
                  ? (parseFloat(String(rabbitmq.memory_used.result[0].value[1])) / 1024 / 1024 / 1024).toFixed(1)
                  : 0}
                GB
              </div>
            </div>
          </div>
        </div>

        {/* Cluster overview strip */}
        <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="grid grid-cols-7 gap-2 text-center">
            <div className="border-r border-gray-200">
              <div className="text-[10px] font-bold text-gray-700">🌐 NETWORK NAT</div>
              <div className="text-xs font-bold text-blue-600">
                ↓{' '}
                {overview?.network_ingress?.result?.[0]?.value?.[1]
                  ? (parseFloat(String(overview.network_ingress.result[0].value[1])) / 1024).toFixed(0)
                  : 0}
                K/s | ↑{' '}
                {overview?.network_egress?.result?.[0]?.value?.[1]
                  ? (parseFloat(String(overview.network_egress.result[0].value[1])) / 1024).toFixed(0)
                  : 0}
                K/s
              </div>
            </div>
            <div className="border-r border-gray-200 col-span-6">
              <div className="text-[10px] font-bold text-gray-700">⏱️ SLOWEST API (p95)</div>
              <div className="text-xs font-bold text-red-600">
                {business?.http_request_duration_p95?.result?.[0]?.metric?.endpoint || 'N/A'} (
                {business?.http_request_duration_p95?.result?.[0]?.value?.[1]
                  ? (parseFloat(String(business.http_request_duration_p95.result[0].value[1])) * 1000).toFixed(0)
                  : 0}
                ms)
              </div>
            </div>
          </div>
        </div>
      </div>
    </MonitorPageFrame>
  );
};

export default MetricsPageUltra;
