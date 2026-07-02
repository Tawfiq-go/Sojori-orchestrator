import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader } from '../components/dashboard/DashboardV2.components';
import { getOwnerLifecycle, type OwnerLifecycleData } from '../services/crmService';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch {
    return value;
  }
}

const MILESTONE_LABELS: Array<{ key: keyof OwnerLifecycleData['milestones']; label: string }> = [
  { key: 'accountCreatedAt', label: 'Compte créé' },
  { key: 'invitedAt', label: 'Invitation envoyée' },
  { key: 'dashboardPasswordAt', label: 'Mot de passe dashboard' },
  { key: 'firstLoginAt', label: 'Première connexion' },
  { key: 'ruAccountAt', label: 'Compte RU' },
  { key: 'ruCompanyAt', label: 'Fiche entreprise RU' },
  { key: 'wizardStartedAt', label: 'Wizard démarré' },
  { key: 'wizardCompletedAt', label: 'Wizard terminé' },
  { key: 'firstImportDoneAt', label: 'Premier import' },
  { key: 'firstListingAt', label: 'Première annonce' },
  { key: 'firstReservationAt', label: 'Première réservation' },
  { key: 'onboardingCompletedAt', label: 'Onboarding terminé' },
];

export function PmLifecycleDetailPage() {
  const { ownerId = '' } = useParams();
  const [data, setData] = useState<OwnerLifecycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    setLoading(true);
    getOwnerLifecycle(ownerId)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success || !res.data) {
          setData(null);
          setError(res?.error || 'Onboarding introuvable pour ce PM.');
          return;
        }
        setData(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Impossible de charger le suivi PM.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const title = useMemo(
    () => data?.ownerName || data?.ownerEmail || ownerId || 'PM',
    [data, ownerId],
  );

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Suivi onboarding PM', title]} disableScopeGate>
      <Box className="pm-lifecycle-page">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Button component={RouterLink} to="/admin/pm-lifecycle" size="small">
            ← Retour
          </Button>
        </Box>

        <PageHeader
          title={title}
          subtitle={data?.ownerEmail || 'Détail du parcours onboarding'}
          count={data ? `${data.progressPercent}%` : undefined}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="warning">{error}</Alert>
        ) : data ? (
          <>
            <Box className="pm-lifecycle-card">
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Jalons
              </Typography>
              <Box className="pm-lifecycle-milestones">
                {MILESTONE_LABELS.map(({ key, label }) => {
                  const value = data.milestones[key] as string | null | undefined;
                  const done = Boolean(value);
                  return (
                    <Box key={key} className={`pm-lifecycle-milestone${done ? ' done' : ''}`}>
                      <span>{label}</span>
                      <strong>{formatDate(value)}</strong>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box className="pm-lifecycle-card">
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Synthèse
              </Typography>
              <Typography variant="body2">Statut : {data.status}</Typography>
              <Typography variant="body2">Étape courante : {data.currentStep || '—'}</Typography>
              <Typography variant="body2">
                Listings : {data.milestones.listingsImported}/{data.milestones.listingsTotal}
              </Typography>
              <Typography variant="body2">Staff : {data.milestones.staffTotal}</Typography>
            </Box>
          </>
        ) : null}
      </Box>
    </DashboardWrapper>
  );
}
