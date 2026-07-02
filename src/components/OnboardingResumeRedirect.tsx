import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getWizardDraft } from '../services/crmService';
import { resolveOwnerId, isOwnerRole } from '../features/onboarding/resolveOwnerId';
import { PM_ONBOARDING_WIZARD_PATH } from '../features/onboarding/wizardNavigation';

const SKIP_PATHS = [
  '/tasks/team',
  '/admin/equipe',
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
];

/**
 * Redirige un owner vers l'on-boarding s'il a déjà commencé le wizard (reprise).
 * ⚠️ Volontairement NON monté dans App — pas de redirection forcée à la connexion.
 */
export function OnboardingResumeRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checked = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (!isOwnerRole(user)) return;
    if (SKIP_PATHS.some((p) => location.pathname.startsWith(p))) return;
    if (checked.current) return;

    const ownerId = resolveOwnerId(user);
    if (!ownerId) return;

    checked.current = true;
    void (async () => {
      try {
        const res = await getWizardDraft(ownerId);
        const ob = res.data.onboarding;
        if (ob?.status === 'completed') return;

        const draft = res.data.wizardDraft;
        const hasProgress =
          (draft?.panelsValidated?.length ?? 0) > 0 ||
          (draft?.currentPanel ?? 0) > 0 ||
          Boolean(draft?.lastSavedAt);

        if (hasProgress && location.pathname === '/dashboard') {
          navigate(PM_ONBOARDING_WIZARD_PATH, { replace: true });
        }
      } catch {
        /* ignore — CRM indisponible */
      }
    })();
  }, [loading, isAuthenticated, user, location.pathname, navigate]);

  return null;
}
