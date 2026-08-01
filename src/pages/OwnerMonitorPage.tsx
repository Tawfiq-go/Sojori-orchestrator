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
import {
  PageFullscreenEnterBtn,
  PageFullscreenLayer,
  pageTreeFullscreenSx,
  usePageFullscreen,
} from '../components/page-fullscreen';
import { PageHeader, tokens as t } from '../components/dashboard/DashboardV2.components';
import {
  fetchOwnerMonitorActivity,
  fetchOwnerMonitorHabits,
  type OwnerMonitorActivityItem,
  type OwnerMonitorHabitItem,
} from '../services/ownerMonitorApi';

function num(n: number | undefined) {
  return Number.isFinite(n) ? String(n) : '0';
}

const HABIT_PERIODS = [7, 30, 90] as const;

function formatLastActivity(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  return `il y a ${diffDays} j`;
}

/** Habitudes clients — actions calendrier + réactivité messages sur période. */
function HabitsSection() {
  const [days, setDays] = useState<number>(30);
  const [items, setItems] = useState<OwnerMonitorHabitItem[]>([]);
  const [habitsAvailable, setHabitsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchOwnerMonitorHabits(days)
      .then((res) => {
        const body = res.data;
        if (!body?.success) {
          setItems([]);
          setError(body?.error || 'Chargement impossible');
          return;
        }
        setItems(Array.isArray(body.data?.items) ? body.data.items : []);
        setHabitsAvailable(body.data?.habitsAvailable !== false);
      })
      .catch((err: unknown) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Erreur réseau');
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
          Habitudes clients
        </Typography>
        {HABIT_PERIODS.map((p) => (
          <Button
            key={p}
            size="small"
            variant={days === p ? 'contained' : 'outlined'}
            onClick={() => setDays(p)}
            sx={{ textTransform: 'none', minWidth: 64 }}
          >
            {p} jours
          </Button>
        ))}
        <Button size="small" variant="outlined" onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>
          Rafraîchir
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Modifs calendrier, audits, imports : événements tracés depuis la mise en place du suivi —
        l'historique se remplit au fil de l'eau. Messages et résas : période complète.
      </Typography>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {!habitsAvailable && !error ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          srv-event-store indisponible — colonnes calendrier vides (messages/résas OK).
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'auto', bgcolor: t.bg1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Owner</TableCell>
                <TableCell align="right" title="Nombre d'enregistrements du calendrier (prix, dispo, stop sell…)">
                  Modifs calendrier
                </TableCell>
                <TableCell align="right" title="Jours du calendrier touchés par ces modifications">
                  Jours modifiés
                </TableCell>
                <TableCell align="right">Audits lancés</TableCell>
                <TableCell align="right" title="Imports calendrier activés / terminés">
                  Imports
                </TableCell>
                <TableCell align="right" title="Jours distincts avec au moins une action calendrier">
                  Jours actifs
                </TableCell>
                <TableCell align="right">Msg reçus</TableCell>
                <TableCell align="right" title="Réponses manuelles (dashboard + WhatsApp staff)">
                  Réponses
                </TableCell>
                <TableCell align="right">Résas créées</TableCell>
                <TableCell align="right">Dernière action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Aucune habitude tracée sur {days} jours — les événements calendrier
                      s'accumulent depuis le déploiement du suivi.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.ownerId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.ownerName || '—'}
                        {row.actorType === 'admin' ? ' (admin)' : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {row.ownerEmail || row.ownerId}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{num(row.calendarUpdates)}</TableCell>
                    <TableCell align="right">{num(row.daysModified)}</TableCell>
                    <TableCell align="right">{num(row.auditsLaunched)}</TableCell>
                    <TableCell align="right">
                      {num(row.importsActivated)} / {num(row.importsFinished)}
                    </TableCell>
                    <TableCell align="right">{num(row.activeDaysCount)}</TableCell>
                    <TableCell align="right">{num(row.messagesReceived)}</TableCell>
                    <TableCell align="right">
                      {num((row.manualRepliesDashboard || 0) + (row.manualRepliesWhatsapp || 0))}
                    </TableCell>
                    <TableCell align="right">{num(row.reservationsCreated)}</TableCell>
                    <TableCell align="right">{formatLastActivity(row.lastActivityAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

export function OwnerMonitorPage() {
  const pageFs = usePageFullscreen();
  const pageFullscreen = pageFs.fullscreen;
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

  const monitorPage = (
    <Box sx={{ width: '100%', ...pageTreeFullscreenSx(pageFullscreen) }}>
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
        {!pageFullscreen && (
          <PageFullscreenEnterBtn
            onClick={pageFs.enter}
            disabled={loading || items.length === 0}
            label="Monitor plein écran"
          />
        )}
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

      <HabitsSection />
    </Box>
  );

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Monitor']} disableScopeGate>
      {!pageFullscreen && monitorPage}
      <PageFullscreenLayer
        open={pageFullscreen}
        onClose={pageFs.exit}
        label="Monitor plein écran"
      >
        {monitorPage}
      </PageFullscreenLayer>
    </DashboardWrapper>
  );
}

export default OwnerMonitorPage;
