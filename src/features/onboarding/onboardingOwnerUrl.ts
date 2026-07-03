/** Query param pour reprendre le wizard onboarding du bon PM. */
export const ONBOARDING_OWNER_QUERY = 'ownerId';

export function formatOnboardingWizardError(
  e: unknown,
  action: 'load' | 'save' = 'load',
  opts?: { isOwnerSelfService?: boolean },
): string {
  const ax = e as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  };
  const status = ax.response?.status;
  const detail = ax.response?.data?.error || ax.response?.data?.message;
  if (status === 401) {
    return 'Session expirée — reconnectez-vous au dashboard.';
  }
  if (status === 403) {
    return opts?.isOwnerSelfService
      ? 'Accès refusé — reconnectez-vous avec votre compte Owner (PM).'
      : 'Accès refusé (403) — vérifiez que le PM est bien sélectionné dans le filtre propriétaire.';
  }
  if (status === 405) {
    return 'API CRM inaccessible (405) — le front doit appeler dev.sojori.com (pas app.sojori.com). Utilisez localhost:3001 ou attendez le redéploiement Vercel.';
  }
  if (status === 502 || status === 503) {
    return 'Service CRM indisponible — réessayez dans un instant.';
  }
  if (detail) return detail;
  if (ax.message?.includes('Network Error')) {
    return 'Réseau ou CORS — vérifiez la connexion et l’origine API (dev.sojori.com).';
  }
  return action === 'save'
    ? 'Impossible d’enregistrer la progression'
    : 'Impossible de charger la progression';
}

export function applyOwnerIdToSearchParams(
  params: URLSearchParams,
  ownerId: string | null | undefined,
  opts?: { keepTab?: boolean },
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (opts?.keepTab !== false) {
    next.set('tab', 'onboarding');
  }
  const id = ownerId?.trim();
  if (id) next.set(ONBOARDING_OWNER_QUERY, id);
  else next.delete(ONBOARDING_OWNER_QUERY);
  return next;
}
