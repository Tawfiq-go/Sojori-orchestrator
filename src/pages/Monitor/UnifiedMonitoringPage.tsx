/**
 * UnifiedMonitoringPage - Ultra-Modern Compact Monitoring Dashboard
 *
 * Inspired by Claude Code, Linear, Sentry - Single unified view for ALL monitoring data
 * - Logs, Metrics, RabbitMQ, Alerts in ONE timeline
 * - Single API call to /api/monitoring/unified-overview
 * - Real-time auto-refresh
 * - Compact, high-density design
 * - Powerful filtering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Rabbit, RefreshCw, TrendingUp, XCircle, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { monitoringGet } from '../../utils/monitoringApi';
import {
  Badge,
  FilterChip,
  FilterBar,
  MonitorKpiStrip,
  MonitorPageFrame,
  MonitorToolbarRow,
  Panel,
  btnGhostSx,
} from '../../features/monitoring/shared/MonitorDesign';
import { Button } from '@mui/material';

// Type definitions
interface TypeConfigItem {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
  label: string;
}

interface SeverityConfigItem {
  color: string;
  bg: string;
  dot: string;
  label: string;
}

interface EventData {
  message?: string;
  level?: string;
  context?: any;
  metric_name?: string;
  value?: number;
  threshold_exceeded?: boolean;
  queue_name?: string;
  messages_ready?: number;
  consumers?: number;
  incident_type?: string;
  messages_unacked?: number;
  alert_name?: string;
  status?: string;
  annotations?: any;
}

interface Event {
  _id: string;
  type: 'log' | 'metric' | 'rabbitmq' | 'alert';
  severity: 'critical' | 'error' | 'warning' | 'info';
  service: string;
  timestamp: string;
  data: EventData;
  labels?: Record<string, any>;
}

interface Stats {
  total: number;
  byType: {
    log: number;
    metric: number;
    rabbitmq: number;
    alert: number;
  };
  bySeverity: {
    critical: number;
    error?: number;
    warning: number;
    info: number;
  };
}

interface TimeRange {
  range: string;
  start: string;
  end: string;
}

interface MonitoringData {
  items: Event[];
  stats: Stats;
  timeRange: TimeRange;
}

interface Bucket {
  time: string;
  critical: number;
  error: number;
  warning: number;
  info: number;
}

interface TimelineStats {
  buckets: Bucket[];
}

interface Filters {
  timeRange: string;
  types: string[];
  service: string;
  categories: string[];
  severities: string[];
  limit: number;
}

interface ChartDataPoint extends Bucket {
  timeLabel: string;
}

// Type icons and colors
const TYPE_CONFIG: Record<string, TypeConfigItem> = {
  log: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Log'
  },
  metric: {
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    label: 'Metric'
  },
  rabbitmq: {
    icon: Rabbit,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'RabbitMQ'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Alert'
  }
};

// Severity colors
const SEVERITY_CONFIG: Record<string, SeverityConfigItem> = {
  critical: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    dot: 'bg-red-500',
    label: 'Critical'
  },
  warning: {
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    dot: 'bg-orange-500',
    label: 'Warning'
  },
  info: {
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    dot: 'bg-blue-500',
    label: 'Info'
  },
  error: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    dot: 'bg-red-500',
    label: 'Error'
  }
};

// Helper function for date formatting (simplified - adapt to your needs)
const formatCasablancaDate = (date: Date | string, format: string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'HH:mm:ss') {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (format === 'HH:mm') {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (format === 'DD/MM') {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
  return d.toLocaleString('fr-FR');
};

// Event Item Component (Compact)
interface EventItemProps {
  event: Event;
  expanded: boolean;
  onToggle: () => void;
}

function EventItem({ event, expanded, onToggle }: EventItemProps) {
  const typeConfig = TYPE_CONFIG[event.type] || TYPE_CONFIG.log;
  const severityConfig = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
  const TypeIcon = typeConfig.icon;

  // Get main display info based on type
  const getDisplayInfo = () => {
    switch (event.type) {
      case 'log':
        return {
          title: event.data.message || 'No message',
          subtitle: `Level: ${event.data.level || 'unknown'}`,
          details: event.data.context
        };
      case 'metric':
        return {
          title: event.data.metric_name || 'Unknown metric',
          subtitle: `Value: ${event.data.value?.toFixed(2) || 'N/A'}`,
          details: {
            threshold_exceeded: event.data.threshold_exceeded
          }
        };
      case 'rabbitmq':
        return {
          title: `Queue: ${event.data.queue_name || 'unknown'}`,
          subtitle: `${event.data.messages_ready || 0} ready, ${event.data.consumers || 0} consumers`,
          details: {
            incident_type: event.data.incident_type,
            messages_unacked: event.data.messages_unacked
          }
        };
      case 'alert':
        return {
          title: event.data.alert_name || 'Unknown alert',
          subtitle: `Status: ${event.data.status || 'unknown'}`,
          details: event.data.annotations
        };
      default:
        return {
          title: 'Unknown event',
          subtitle: '',
          details: {}
        };
    }
  };

  const { title, subtitle, details } = getDisplayInfo();

  return (
    <div
      className={`group relative border-l-4 ${typeConfig.border} ${typeConfig.bg} hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2 p-2">
        {/* Type Icon */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${typeConfig.bg} ${typeConfig.color} flex items-center justify-center border ${typeConfig.border}`}>
          <TypeIcon size={14} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
              {/* Severity Dot */}
              <span className={`w-1.5 h-1.5 rounded-full ${severityConfig.dot} flex-shrink-0`} />

              {/* Service Badge */}
              <span className="text-[10px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {event.service}
              </span>

              {/* Type Badge */}
              <span className={`text-[10px] font-medium ${typeConfig.color} px-1 py-0.5 rounded ${typeConfig.bg}`}>
                {typeConfig.label}
              </span>

              {/* Severity Badge */}
              <span className={`text-[10px] font-medium ${severityConfig.color} ${severityConfig.bg} px-1 py-0.5 rounded`}>
                {severityConfig.label}
              </span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-slate-500 font-mono">
                {formatCasablancaDate(event.timestamp, 'HH:mm:ss')}
              </span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
          </div>

          {/* Title */}
          <div className="text-xs font-medium text-slate-900 mb-0.5 line-clamp-1">
            {title}
          </div>

          {/* Subtitle */}
          <div className="text-[11px] text-slate-600 line-clamp-1">
            {subtitle}
          </div>

          {/* Expanded Details */}
          {expanded && details && Object.keys(details).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 max-h-40 overflow-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Labels (if any) */}
          {expanded && event.labels && Object.keys(event.labels).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(event.labels).slice(0, 5).map(([key, value]) => (
                <span key={key} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stats Summary — replaced by MonitorKpiStrip in render
function buildStatsKpiItems(stats: Stats) {
  return [
    { label: 'Total', value: stats.total || 0, tone: 'neutral' as const },
    { label: 'Logs', value: stats.byType.log || 0, tone: 'info' as const },
    { label: 'Metrics', value: stats.byType.metric || 0, tone: 'neutral' as const },
    { label: 'RabbitMQ', value: stats.byType.rabbitmq || 0, tone: 'warning' as const },
    { label: 'Alerts', value: stats.byType.alert || 0, tone: 'error' as const },
    {
      label: 'Critical',
      value: stats.bySeverity.critical || 0,
      tone: (stats.bySeverity.critical || 0) > 0 ? ('error' as const) : ('neutral' as const),
    },
    {
      label: 'Error',
      value: stats.bySeverity.error ?? 0,
      tone: (stats.bySeverity.error ?? 0) > 0 ? ('error' as const) : ('neutral' as const),
    },
    {
      label: 'Warning',
      value: stats.bySeverity.warning || 0,
      tone: (stats.bySeverity.warning || 0) > 0 ? ('warning' as const) : ('neutral' as const),
    },
    { label: 'Info', value: stats.bySeverity.info || 0, tone: 'info' as const },
  ];
}

// Main Component
export default function UnifiedMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [timelineStats, setTimelineStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Filters - checkbox-based multi-select
  const [filters, setFilters] = useState<Filters>({
    timeRange: 'today',
    types: ['log', 'metric', 'rabbitmq', 'alert'],
    service: '',
    categories: [],
    severities: ['critical', 'error', 'warning', 'info'],
    limit: 200
  });

  // Fetch data (events list + timeline stats in parallel)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query: Record<string, string | number | undefined> = {
        timeRange: filters.timeRange,
        limit: filters.limit,
      };
      if (filters.types.length > 0 && filters.types.length < 4) {
        query.type = filters.types.join(',');
      }
      if (filters.service) query.service = filters.service;
      if (filters.categories.length === 1) {
        query.category = filters.categories[0];
      }
      const allSeverities = ['critical', 'error', 'warning', 'info'];
      if (filters.severities.length > 0 && filters.severities.length < allSeverities.length) {
        query.severity = filters.severities.join(',');
      }

      const [overviewResponse, statsResponse] = await Promise.all([
        monitoringGet<{ success?: boolean; data?: MonitoringData }>('/unified-overview', query),
        monitoringGet<{ success?: boolean; data?: TimelineStats }>('/unified-timeline-stats', query),
      ]);

      if (overviewResponse.data?.success) {
        setData(overviewResponse.data.data);
      } else {
        setError('Failed to load monitoring data');
      }

      if (statsResponse.data?.success) {
        setTimelineStats(statsResponse.data.data);
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Toggle event expansion
  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Get unique services for filter
  const uniqueServices = data?.items ? [...new Set(data.items.map((item) => item.service))].sort() : [];

  // Transform timeline stats data for chart (from API aggregation)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!timelineStats?.buckets || timelineStats.buckets.length === 0) return [];

    return timelineStats.buckets.map((bucket) => {
      let timeLabel: string;
      if (filters.timeRange === '7d') {
        timeLabel = formatCasablancaDate(new Date(bucket.time), 'DD/MM');
      } else if (filters.timeRange === 'yesterday' || filters.timeRange === 'today') {
        timeLabel = formatCasablancaDate(new Date(bucket.time), 'HH:mm');
      } else {
        timeLabel = formatCasablancaDate(new Date(bucket.time), 'HH:mm');
      }

      return {
        ...bucket,
        timeLabel
      };
    });
  }, [timelineStats, filters.timeRange]);

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <Badge variant="neutral">
            MAJ {formatCasablancaDate(lastRefresh, 'HH:mm:ss')}
          </Badge>
        }
        right={
          <>
            <Button sx={btnGhostSx} onClick={() => setAutoRefresh(!autoRefresh)}>
              <Badge variant={autoRefresh ? 'success' : 'neutral'} dot>
                {autoRefresh ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button sx={btnGhostSx} onClick={() => void fetchData()} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      {data?.stats ? <MonitorKpiStrip items={buildStatsKpiItems(data.stats)} /> : null}

      <div className="space-y-2">

        <Panel sx={{ p: 2 }}>
          <FilterBar>
            {[
              { value: '1h', label: '1 h' },
              { value: 'today', label: "Aujourd'hui" },
              { value: 'yesterday', label: 'Hier' },
              { value: '7d', label: '7 j' },
            ].map(({ value, label }) => (
              <FilterChip
                key={value}
                label={label}
                active={filters.timeRange === value}
                onClick={() => setFilters({ ...filters, timeRange: value })}
              />
            ))}
          </FilterBar>
          <div className="flex flex-wrap items-start gap-3 mt-2">

            {/* Category Checkboxes */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'api', label: 'API', icon: '🔌' },
                  { value: 'database', label: 'DB', icon: '🗄️' },
                  { value: 'ai', label: 'AI', icon: '🤖' },
                  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                  { value: 'rabbitmq', label: 'RabbitMQ', icon: '🐰' },
                  { value: 'ingress', label: 'Ingress', icon: '🌐' },
                  { value: 'alerts', label: 'Alerts', icon: '🚨' },
                  { value: 'metrics', label: 'Metrics', icon: '📊' }
                ].map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(value)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, value]
                          : filters.categories.filter((c) => c !== value);
                        setFilters({ ...filters, categories: newCategories });
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022] focus:ring-[#E6B022] focus:ring-1"
                    />
                    <span className="text-[10px] font-medium text-slate-700 group-hover:text-slate-900">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-300" />

            {/* Type Checkboxes */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Types</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'log', label: 'Logs', icon: '📝' },
                  { value: 'metric', label: 'Metrics', icon: '📊' },
                  { value: 'rabbitmq', label: 'RMQ', icon: '🐰' },
                  { value: 'alert', label: 'Alerts', icon: '⚠️' }
                ].map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(value)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...filters.types, value]
                          : filters.types.filter((t) => t !== value);
                        setFilters({ ...filters, types: newTypes });
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022] focus:ring-[#E6B022] focus:ring-1"
                    />
                    <span className="text-[10px] font-medium text-slate-700 group-hover:text-slate-900">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-300" />

            {/* Severity Checkboxes */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Severity</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'critical', label: 'Critical', icon: '🔴' },
                  { value: 'error', label: 'Error', icon: '🟤' },
                  { value: 'warning', label: 'Warning', icon: '🟠' },
                  { value: 'info', label: 'Info', icon: '🔵' }
                ].map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.severities.includes(value)}
                      onChange={(e) => {
                        const newSeverities = e.target.checked
                          ? [...filters.severities, value]
                          : filters.severities.filter((s) => s !== value);
                        setFilters({ ...filters, severities: newSeverities });
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022] focus:ring-[#E6B022] focus:ring-1"
                    />
                    <span className="text-[10px] font-medium text-slate-700 group-hover:text-slate-900">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-300" />

            {/* Service Select */}
            {uniqueServices.length > 0 && (
              <>
                <div className="w-px h-4 bg-slate-300" />
                <select
                  value={filters.service}
                  onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                  className={`text-[10px] font-semibold rounded-md px-2 py-1 border transition-all ${
                    filters.service
                      ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white border-[#E6B022]'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <option value="">All Services</option>
                  {uniqueServices.map((service) => (
                    <option key={service} value={service} className="bg-white text-slate-900">
                      {service}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="w-px h-4 bg-slate-300" />

            {/* Limit Chips */}
            <div className="flex items-center gap-1">
              {[100, 200, 500, 1000].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setFilters({ ...filters, limit })}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${
                    filters.limit === limit
                      ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {limit}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            {(filters.types.length < 4 ||
              filters.severities.length < 4 ||
              filters.service ||
              filters.categories.length > 0 ||
              filters.timeRange !== 'today' ||
              filters.limit !== 200) && (
              <>
                <div className="w-px h-4 bg-slate-300" />
                <button
                  onClick={() =>
                    setFilters({
                      timeRange: 'today',
                      types: ['log', 'metric', 'rabbitmq', 'alert'],
                      service: '',
                      categories: [],
                      severities: ['critical', 'error', 'warning', 'info'],
                      limit: 200
                    })
                  }
                  className="text-[10px] font-semibold px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                >
                  ✕ Reset
                </button>
              </>
            )}
          </div>
        </Panel>

        {/* Timeline Chart - Full Width */}
        {!loading && timelineStats?.buckets && chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-violet-600" />
                <span className="text-sm font-semibold text-slate-700">Timeline by Severity</span>
              </div>
              <span className="text-xs text-slate-500">
                {timelineStats?.buckets?.reduce((sum, b) => sum + b.critical + b.error + b.warning + b.info, 0) || 0}{' '}
                events over {filters.timeRange}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="square" />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                <Bar dataKey="error" stackId="a" fill="#ea580c" name="Error" />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                <Bar dataKey="info" stackId="a" fill="#3b82f6" name="Info" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm font-medium text-red-900">Failed to load monitoring data</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
                <button onClick={fetchData} className="mt-2 text-xs text-red-700 underline hover:text-red-900">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <RefreshCw className="text-violet-600 animate-spin" size={32} />
              <p className="text-sm text-slate-600">Loading monitoring data...</p>
            </div>
          </div>
        )}

        {/* Events Timeline - Compact */}
        {!loading && data?.items && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-600" />
                <span className="text-[11px] font-semibold text-slate-700">Events ({data.items.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {data.timeRange.range} • {formatCasablancaDate(data.timeRange.start, 'HH:mm')} -{' '}
                {formatCasablancaDate(data.timeRange.end, 'HH:mm')}
              </span>
            </div>

            {data.items.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
                <p className="text-xs font-medium">No events found</p>
                <p className="text-[10px] mt-1">System is healthy or try adjusting filters</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                {data.items.map((event) => (
                  <EventItem
                    key={event._id}
                    event={event}
                    expanded={expandedEvents.has(event._id)}
                    onToggle={() => toggleEvent(event._id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MonitorPageFrame>
  );
}
