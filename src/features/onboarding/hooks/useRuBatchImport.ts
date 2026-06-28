import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { adaptRuImportProgress } from '../../../components/listing/import-airbnb/adaptRuImportProgress';
import type { ImportProgress, ImportResultItem } from '../../../components/listing/import-airbnb/_tokens';
import { STEPS_ORDER } from '../../../components/listing/import-airbnb/_tokens';
import type { RuImportProgressData } from '../../../hooks/useRuImportProgress';
import { runRuBatchImport, type RuImportPropertyMeta } from '../apply/runRuBatchImport';

export function useRuBatchImport(
  propertyMeta: Map<string, RuImportPropertyMeta | { name: string; city?: string }>,
) {
  const [importResults, setImportResults] = useState<ImportResultItem[] | null>(null);
  const [progressData, setProgressData] = useState<RuImportProgressData | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const importProgress = useMemo((): ImportProgress | null => {
    const adapted = adaptRuImportProgress(progressData);
    if (adapted) return adapted;
    if (!isImporting) return null;
    return {
      currentBatchIndex: 0,
      totalBatch: 1,
      currentPropertyName: 'Initialisation…',
      steps: STEPS_ORDER.map((key) => ({ key, status: 'pending' as const })),
      completed: false,
      hasError: false,
    };
  }, [progressData, isImporting]);

  const runImport = useCallback(
    async (params: { ownerId: string; ruPropertyIds: number[]; cityId?: string }) => {
      setImportResults(null);
      setProgressData(null);
      const ids = params.ruPropertyIds.filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) throw new Error('Aucune annonce sélectionnée');

      setIsImporting(true);
      try {
        const enriched = await runRuBatchImport({
          ownerId: params.ownerId,
          ruPropertyIds: ids,
          cityId: params.cityId,
          nameMap: propertyMeta,
          onProgress: setProgressData,
        });
        setImportResults(enriched);
        const okCount = enriched.filter((r) => r.success).length;
        const failCount = enriched.length - okCount;
        if (okCount > 0 && failCount === 0) {
          toast.success(
            enriched.length === 1 ? 'Annonce importée' : `${okCount} annonce(s) importée(s)`,
          );
        } else if (okCount > 0) {
          toast.warn(`${okCount} importée(s) · ${failCount} échec(s)`);
        } else {
          toast.error("Échec de l'import");
        }
        return enriched;
      } finally {
        setIsImporting(false);
      }
    },
    [propertyMeta],
  );

  const reset = useCallback(() => {
    setProgressData(null);
    setImportResults(null);
    setIsImporting(false);
  }, []);

  return {
    runImport,
    importProgress,
    importResults,
    isImporting: isImporting || Boolean(importProgress && !importProgress.completed),
    reset,
  };
}
