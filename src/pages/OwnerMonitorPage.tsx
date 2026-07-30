import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, tokens as t } from '../components/dashboard/DashboardV2.components';
import {
  fetchOwnerMonitorActivity,
  type OwnerMonitorActivityItem,
} from '../services/ownerMonitorApi';

function num(n: number | undefined) {
  return Number.isFinite(n) ? String(n) : '0';
}

export function OwnerMonitorPage() {
  const [items, setItems] = useState<OwnerMonitorActivityItem[]>([]);
  const [day, setDay] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOwnerMonitorActivity()
      .then((res) => {
        const body = res.data;
        if (!body?.success) {
          setItems([]);
          setError(body?.error || 'Chargement impossible');
          return;
        }
        setItems(Array.isArray(body.data?.items) ? body.data.items : []);
        setDay(body.data?.day || '');
        setGeneratedAt(body.data?.generatedAt || '');
      })
      .catch((err: unknown) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Erreur réseau');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, row) => {
        acc.current += row.reservationsCurrent || 0;
        acc.created += row.reservationsCreatedToday || 0;
        acc.msg += row.messagesReceivedToday || 0;
        acc.dash += row.manualRepliesDashboardToday || 0;
        acc.wa += row.manualRepliesWhatsappToday || 0;
        return acc;
      },
      { current: 0, created: 0, msg: 0, dash: 0, wa: 0 },
    );
  }, [items]);

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Monitor']} disableScopeGate>
      <PageHeader
        title="Monitor"
        subtitle={
          day
            ? `Activité owners · jour UTC ${day}${generatedAt ? ` · maj ${new Date(generatedAt).toLocaleTimeString('fr-FR')}` : ''}`
            : 'Activité owners — résas, messages, réponses manuelles'
        }
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" variant="outlined" onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>
          Rafraîchir
        </Button>
        <Typography variant="caption" color="text.secondary">
          Visible Admin / SuperAdmin uniquement · pas Mixpanel — données Mongo métier
        </Typography>
      </Box>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            overflow: 'auto',
            bgcolor: t.bg1,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Résas en cours</TableCell>
                <TableCell align="right">Résas créées (j)</TableCell>
                <TableCell align="right">Msg reçus (j)</TableCell>
                <TableCell align="right">Réponses admin (j)</TableCell>
                <TableCell align="right">Réponses WA staff (j)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  Total ({items.length} owners actifs)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {num(totals.current)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {num(totals.created)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {num(totals.msg)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {num(totals.dash)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {num(totals.wa)}
                </TableCell>
              </TableRow>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Aucune activité owner sur la fenêtre (résas en cours / messages du jour).
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.ownerId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.ownerName || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {row.ownerEmail || row.ownerId}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{num(row.reservationsCurrent)}</TableCell>
                    <TableCell align="right">{num(row.reservationsCreatedToday)}</TableCell>
                    <TableCell align="right">{num(row.messagesReceivedToday)}</TableCell>
                    <TableCell align="right">{num(row.manualRepliesDashboardToday)}</TableCell>
                    <TableCell align="right">{num(row.manualRepliesWhatsappToday)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </DashboardWrapper>
  );
}

export default OwnerMonitorPage;
