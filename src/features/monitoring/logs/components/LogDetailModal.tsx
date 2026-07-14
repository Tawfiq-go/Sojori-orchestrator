import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatCasablancaDate } from '../../../../utils/dateFormatting.js';
import { Badge, severityBadgeVariant, monitorTokens as t } from '../../shared/MonitorDesign';
import type { LogEntry } from '../hooks/useLogs';

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, minWidth: 120 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: t.text, wordBreak: 'break-word' }}>{value}</Typography>
    </Stack>
  );
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const severity = String(log.severity || log.level || 'info');

  return (
    <Dialog open={Boolean(log)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>Détail du log</Typography>
          <Badge variant={severityBadgeVariant(severity)} dot>
            {severity}
          </Badge>
        </Stack>
        <IconButton onClick={onClose} size="small" aria-label="Fermer">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <DetailRow label="Date" value={formatCasablancaDate(log.timestamp)} />
          <DetailRow label="Service" value={log.service} />
          <DetailRow label="Composant" value={log.component} />
          <DetailRow label="Trace ID" value={log.traceId} />
          <DetailRow label="Correlation" value={log.correlationId} />
          <DetailRow label="Réservation" value={log.reservationNumber} />
          <DetailRow label="Owner" value={log.ownerId} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, pt: 1 }}>
            Message
          </Typography>
          <Typography
            component="pre"
            sx={{
              fontSize: 12,
              fontFamily: '"Geist Mono", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
              p: 1.5,
              borderRadius: 1,
              bgcolor: t.bg2,
              border: `1px solid ${t.border}`,
            }}
          >
            {typeof log.message === 'string' ? log.message : JSON.stringify(log, null, 2)}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
