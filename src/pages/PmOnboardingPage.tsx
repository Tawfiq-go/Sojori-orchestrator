import { Navigate } from 'react-router-dom';
import { PM_ONBOARDING_WIZARD_PATH } from '../features/onboarding/wizardNavigation';

/** Ancienne URL — redirige vers Équipe & Rôles → On-boarding */
export function PmOnboardingPage() {
  return <Navigate to={PM_ONBOARDING_WIZARD_PATH} replace />;
}
