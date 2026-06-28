import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { getWizardDraft } from '../../../services/crmService';
import {
  wizardVisibleProgressPercent,
  panelToStepIndex,
  WIZARD_STEP_COUNT,
  PM_ONBOARDING_WIZARD_PATH,
} from '../wizardNavigation';
import { resolveOwnerId, isOwnerRole } from '../resolveOwnerId';
import type { WizardDraft } from '../types';

/**
 * Bandeau dashboard — lien vers le wizard (démarrage, reprise, ou modification après terminé).
 */
export function OnboardingDashboardBanner() {
  const { user } = useAuth();
  const ownerId = resolveOwnerId(user);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isOwnerRole(user) || !ownerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getWizardDraft(ownerId);
        if (cancelled) return;
        setStatus(res.data.onboarding?.status ?? null);
        const remote = res.data.wizardDraft;
        if (remote) {
          setDraft({
            version: remote.version ?? 1,
            currentPanel: remote.currentPanel ?? 0,
            path: remote.path ?? 'A',
            panels: (remote.panels ?? {}) as WizardDraft['panels'],
            panelsValidated: remote.panelsValidated ?? [],
            lastSavedAt: remote.lastSavedAt,
          });
        }
      } catch {
        /* CRM KO */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, ownerId]);

  if (!isOwnerRole(user) || hidden || loading) return null;

  const completed = status === 'completed';
  const pct = draft ? wizardVisibleProgressPercent(draft) : 0;
  const step = draft ? panelToStepIndex(draft.currentPanel) + 1 : 1;
  const hasStarted = Boolean(draft?.lastSavedAt) || (draft?.panelsValidated?.length ?? 0) > 0;

  if (!hasStarted && !completed) return null;

  return (
    <Alert
      severity={completed ? 'success' : 'info'}
      sx={{
        mb: 2,
        borderRadius: 2,
        border: completed ? '1px solid rgba(10,143,94,0.35)' : '1px solid rgba(184,133,26,0.35)',
        bgcolor: completed ? 'rgba(10,143,94,0.06)' : 'rgba(184,133,26,0.08)',
        '& .MuiAlert-icon': { color: completed ? '#0a8f5e' : '#b8851a' },
      }}
      onClose={() => setHidden(true)}
    >
      <Stack spacing={1.25}>
        <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#14110a' }}>
          {completed
            ? 'Configuration enregistrée — modifiable à tout moment'
            : hasStarted
              ? 'Reprenez votre configuration Sojori'
              : 'Bienvenue — configurez votre compte'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#55504a' }}>
          {completed
            ? 'Équipe, parcours client, import : rouvrez le wizard pour ajuster une étape sans perdre le brouillon.'
            : 'Équipe, parcours client, import Airbnb : tout se fait dans le wizard. Enregistrez et continuez plus tard.'}
        </Typography>
        {hasStarted && !completed && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: 'rgba(20,17,10,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: '#b8851a', borderRadius: 99 },
              }}
            />
            <Typography sx={{ fontSize: 11, color: '#7a756c', mt: 0.5 }}>
              Étape {step}/{WIZARD_STEP_COUNT} · {pct}% validé
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            component={RouterLink}
            to={PM_ONBOARDING_WIZARD_PATH}
            variant="contained"
            sx={{
              bgcolor: completed ? '#0a8f5e' : '#b8851a',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: completed ? '#087a50' : '#876119' },
            }}
          >
            {completed ? 'Modifier la configuration initiale' : hasStarted ? 'Continuer la configuration' : 'Démarrer la configuration'}
          </Button>
          {completed && (
            <Button component={RouterLink} to="/onboarding/suite" sx={{ textTransform: 'none', fontWeight: 600 }}>
              Suite · prochaines étapes
            </Button>
          )}
        </Box>
      </Stack>
    </Alert>
  );
}
