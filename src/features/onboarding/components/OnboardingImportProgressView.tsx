import ImportProgressTimeline from '../../../components/listing/import-airbnb/ImportProgressTimeline';
import { KEYFRAMES, type ImportProgress } from '../../../components/listing/import-airbnb/_tokens';
import OnboardingImportProgressFeed from './OnboardingImportProgressFeed';

export type OnboardingImportProgressMode = 'owner' | 'admin';

export interface OnboardingImportProgressViewProps {
  progress: ImportProgress;
  /** owner = une étape à la fois · admin = timeline 12 étapes (audit) */
  mode: OnboardingImportProgressMode;
}

/** Import suite onboarding — affichage selon le rôle connecté. */
export default function OnboardingImportProgressView({
  progress,
  mode,
}: OnboardingImportProgressViewProps) {
  if (mode === 'admin') {
    return (
      <div className="ob-suite-import-timeline ob-suite-import-timeline--audit">
        <style>{KEYFRAMES}</style>
        <ImportProgressTimeline progress={progress} />
      </div>
    );
  }

  return <OnboardingImportProgressFeed progress={progress} />;
}
