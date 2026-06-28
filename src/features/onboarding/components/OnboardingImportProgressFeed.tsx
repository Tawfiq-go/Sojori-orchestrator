import { useEffect, useMemo, useRef, useState } from 'react';
import type { ImportProgress } from '../../../components/listing/import-airbnb/_tokens';
import { STEPS_LABELS } from '../../../components/listing/import-airbnb/_tokens';
import {
  activeImportStepIndex,
  liveDetailForImportStep,
} from '../../../components/listing/import-airbnb/importStepDisplay';

export interface OnboardingImportProgressFeedProps {
  progress: ImportProgress;
}

/**
 * Une seule étape visible à la fois — la précédente disparaît, la suivante apparaît.
 * (Lecture fiche → tarifs → photos → …)
 */
export default function OnboardingImportProgressFeed({ progress }: OnboardingImportProgressFeedProps) {
  const steps = progress.steps;
  const activeIndex = useMemo(() => activeImportStepIndex(steps), [steps]);
  const current = steps[activeIndex];
  const meta = current ? STEPS_LABELS[current.key] : null;

  const [exiting, setExiting] = useState<{ index: number; label: string } | null>(null);
  const prevIndexRef = useRef(activeIndex);
  const feedKey = `${progress.currentBatchIndex}:${progress.currentPropertyName ?? ''}`;

  useEffect(() => {
    prevIndexRef.current = 0;
    setExiting(null);
  }, [feedKey]);

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (activeIndex > prev && prev >= 0) {
      const completed = steps[prev];
      const label = completed ? STEPS_LABELS[completed.key]?.label : '';
      if (label) {
        setExiting({ index: prev, label });
      }
    }
    prevIndexRef.current = activeIndex;
  }, [activeIndex, steps]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setExiting(null), 520);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  const batchLabel =
    progress.totalBatch > 1
      ? `Annonce ${progress.currentBatchIndex + 1} / ${progress.totalBatch}`
      : 'Import en cours';

  const detail = liveDetailForImportStep(current);
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const pct = Math.round((doneCount / Math.max(1, steps.length)) * 100);

  return (
    <div className="ob-import-feed" aria-live="polite" aria-busy={!progress.completed}>
      <div className="ob-import-feed-header">
        <span className="ob-import-feed-batch">{batchLabel}</span>
        <strong className="ob-import-feed-name">
          {progress.currentPropertyName || 'Annonce Airbnb'}
        </strong>
        <div className="ob-import-feed-meter" aria-hidden>
          <div className="ob-import-feed-meter-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ob-import-feed-meter-label">
          {doneCount} / {steps.length} étapes · {pct}%
        </span>
      </div>

      <div className="ob-import-feed-viewport">
        <div className="ob-import-feed-scroll">
          {exiting && (
            <div className="ob-import-feed-line ob-import-feed-line--done ob-import-feed-line--exit">
              <span className="ob-import-feed-check">✓</span>
              <span>{exiting.label}</span>
            </div>
          )}

          <div
            className={`ob-import-feed-line ob-import-feed-line--active${
              current?.status === 'error' ? ' ob-import-feed-line--error' : ''
            }`}
            key={`${feedKey}-step-${activeIndex}`}
          >
            <span className="ob-import-feed-step">{activeIndex + 1}</span>
            <div className="ob-import-feed-copy">
              <span className="ob-import-feed-label">{meta?.label ?? 'Préparation…'}</span>
              {meta?.sub && <span className="ob-import-feed-sub">{meta.sub}</span>}
              {detail && <span className="ob-import-feed-detail">{detail}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
