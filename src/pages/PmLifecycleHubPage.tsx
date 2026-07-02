import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader } from '../components/dashboard/DashboardV2.components';
import { getOnboardings, type OwnerOnboarding } from '../services/crmService';

const STATUS_LABEL: Record<OwnerOnboarding['status'], string> = {
  not_started: 'Non démarré',
  in_progress: 'En cours',
  blocked: 'Bloqué',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export function PmLifecycleHubPage() {
  const [rows, setRows] = useState<OwnerOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOnboardings({ _limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Impossible de charger les onboardings.';
        setRows([]);
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Suivi onboarding PM']} disableScopeGate>
      <Box className="pm-lifecycle-page">
        <PageHeader title="Suivi onboarding PM" subtitle="Vue d’ensemble des parcours property managers" />

        {error ? <Alert severity="warning">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Alert severity="info">Aucun onboarding enregistré pour le moment.</Alert>
        ) : (
          <Box className="pm-lifecycle-grid">
            {rows.map((row) => (
              <Box key={row._id} className="pm-lifecycle-card">
                <Typography variant="subtitle1" fontWeight={700}>
                  {row.ownerName || row.ownerEmail || row.ownerId}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {row.ownerEmail || '—'}
                </Typography>
                <Chip
                  size="small"
                  label={STATUS_LABEL[row.status] || row.status}
                  sx={{ mb: 1.5 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Étape : {row.currentStep || '—'}
                </Typography>
                <Button
                  component={RouterLink}
                  to={`/admin/pm-lifecycle/${row.ownerId}`}
                  size="small"
                  variant="outlined"
                >
                  Voir le détail
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
