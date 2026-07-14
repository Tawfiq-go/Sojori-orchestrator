import { Typography } from '@mui/material';
import { formatCasablancaDate } from '../../../../utils/dateFormatting.js';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorLoading,
  severityBadgeVariant,
  monitorTokens as t,
} from '../../shared/MonitorDesign';
import type { LogEntry } from '../hooks/useLogs';

interface LogsTableProps {
  logs: LogEntry[];
  loading: boolean;
  onLogClick: (log: LogEntry) => void;
}

function rowSeverity(log: LogEntry): string {
  return String(log.severity || log.level || 'info').toLowerCase();
}

function rowMessage(log: LogEntry): string {
  const msg = log.message ?? log.msg;
  if (typeof msg === 'string') return msg;
  return JSON.stringify(log).slice(0, 240);
}

export function LogsTable({ logs, loading, onLogClick }: LogsTableProps) {
  if (loading && logs.length === 0) {
    return <MonitorLoading label="Chargement des logs…" />;
  }

  if (!loading && logs.length === 0) {
    return <MonitorEmpty message="Aucun log sur ces filtres." />;
  }

  const rows = logs.map((log, idx) => ({
    ...log,
    id: log.logId || `log-${idx}`,
  }));

  return (
    <DataTable
      hideRowActions
      onRowClick={(row) => onLogClick(row as LogEntry)}
      columns={[
        {
          key: 'timestamp',
          label: 'Date',
          width: '150px',
          render: (row) => (
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              {formatCasablancaDate(row.timestamp as string | Date)}
            </Typography>
          ),
        },
        {
          key: 'service',
          label: 'Service',
          width: '130px',
          render: (row) => (
            <Badge variant="info">{String(row.service || '—')}</Badge>
          ),
        },
        {
          key: 'severity',
          label: 'Niveau',
          width: '110px',
          render: (row) => (
            <Badge variant={severityBadgeVariant(rowSeverity(row as LogEntry))} dot>
              {rowSeverity(row as LogEntry)}
            </Badge>
          ),
        },
        {
          key: 'message',
          label: 'Message',
          render: (row) => (
            <Typography
              sx={{
                fontSize: 12,
                color: t.text,
                fontFamily: '"Geist Mono", monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 640,
              }}
              title={rowMessage(row as LogEntry)}
            >
              {rowMessage(row as LogEntry)}
            </Typography>
          ),
        },
      ]}
      rows={rows}
    />
  );
}
