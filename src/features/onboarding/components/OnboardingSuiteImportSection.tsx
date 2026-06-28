import { useMemo, useState } from 'react';
import OnboardingImportProgressView, {
  type OnboardingImportProgressMode,
} from './OnboardingImportProgressView';
import ImportResultRecap from '../../../components/listing/import-airbnb/ImportResultRecap';
import type { RuImportPropertyMeta } from '../apply/runRuBatchImport';
import { useRuBatchImport } from '../hooks/useRuBatchImport';
import { PM_ONBOARDING_WIZARD_PATH } from '../wizardNavigation';
import type { WizardPanel7 } from '../types';

type Props = {
  ownerId: string;
  panel: WizardPanel7;
  importProgressMode?: OnboardingImportProgressMode;
  onImportComplete: (importedRuIds: number[]) => void;
};

export default function OnboardingSuiteImportSection({
  ownerId,
  panel,
  importProgressMode = 'owner',
  onImportComplete,
}: Props) {
  const [saving, setSaving] = useState(false);
  const propertyMeta = useMemo(
    () =>
      new Map<string, RuImportPropertyMeta>(
        (panel.selectedRuPreview ?? []).map((p) => [
          String(p.ruPropertyId),
          {
            name: p.name,
            city: p.cityName || p.ruCity,
            cityId: p.cityId,
          },
        ]),
      ),
    [panel.selectedRuPreview],
  );
  const { runImport, importProgress, importResults, isImporting, reset } = useRuBatchImport(propertyMeta);

  const selectedIds = panel.selectedRuIds ?? [];
  const alreadyImported = new Set((panel.importedRuIds ?? []).map(Number));
  const pendingIds = selectedIds.filter((id) => !alreadyImported.has(id));
  const canLaunch = pendingIds.length > 0 && !isImporting;

  const handleLaunch = async () => {
    if (!ownerId || pendingIds.length === 0) return;
    setSaving(true);
    try {
      const results = await runImport({
        ownerId,
        ruPropertyIds: pendingIds,
      });
      const succeeded = results.filter((r) => r.success).map((r) => Number(r.ruPropertyId));
      const merged = [...new Set([...(panel.importedRuIds ?? []), ...succeeded])];
      onImportComplete(merged);
    } finally {
      setSaving(false);
    }
  };

  if (panel.importSkippedLater && selectedIds.length === 0) {
    return (
      <p className="ob-suite-panel-note">
        Import reporté dans le wizard — utilisez <strong>Annonces → Import Airbnb</strong> ou rouvrez
        l&apos;étape Import du wizard pour sélectionner des annonces.
      </p>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <p className="ob-suite-panel-note">
        Aucune annonce sélectionnée dans le wizard.{' '}
        <a href={PM_ONBOARDING_WIZARD_PATH} className="ob-suite-inline-link">
          Retour étape Import
        </a>
      </p>
    );
  }

  return (
    <div className="ob-suite-panel">
      <div className="ob-suite-selected-list">
        {(panel.selectedRuPreview ?? []).map((row) => {
          const done = alreadyImported.has(Number(row.ruPropertyId));
          return (
            <span key={row.ruPropertyId} className={`ob-recap-chip${done ? ' done' : ''}`}>
              {done ? '✓ ' : ''}
              {row.name}
              {(row.cityName || row.ruCity) && (
                <span className="ob-recap-chip-city"> · {row.cityName || row.ruCity}</span>
              )}
            </span>
          );
        })}
      </div>
      <p className="ob-suite-panel-meta">
        Import <strong>séquentiel</strong> — une annonce à la fois, villes déjà résolues dans le wizard.
      </p>

      {importProgress && isImporting && (
        <OnboardingImportProgressView progress={importProgress} mode={importProgressMode} />
      )}

      {importResults && !isImporting && (
        <div style={{ marginTop: 16 }}>
          <ImportResultRecap results={importResults} />
          <button type="button" className="ob-btn-ghost" style={{ marginTop: 12 }} onClick={reset}>
            Masquer le détail
          </button>
        </div>
      )}

      {!importResults && !isImporting && (
        <div className="ob-suite-panel-actions">
          <button
            type="button"
            className="ob-btn-primary"
            disabled={!canLaunch || saving}
            onClick={() => void handleLaunch()}
          >
            {saving
              ? 'Import en cours…'
              : pendingIds.length === selectedIds.length
                ? `Lancer l'import (${pendingIds.length})`
                : `Importer le reste (${pendingIds.length}/${selectedIds.length})`}
          </button>
          {alreadyImported.size > 0 && (
            <span className="ob-suite-panel-meta">
              {alreadyImported.size} déjà importée{alreadyImported.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
