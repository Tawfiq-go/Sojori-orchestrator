import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropertyList from '../../../components/listing/import-airbnb/PropertyList';
import type { RuProperty } from '../../../components/listing/import-airbnb/_tokens';
import { fetchRuOwnerProperties, resolveRuImportCities } from '../../../services/channelsDashboardApi';
import type { WizardPanel7 } from '../types';

type Props = {
  ownerId: string;
  panel: WizardPanel7;
  onChange: (patch: Partial<WizardPanel7>) => void;
  onSkipLater: () => void;
};

type PreviewRow = NonNullable<WizardPanel7['selectedRuPreview']>[number];

function deriveGlobalCity(preview: PreviewRow[]): Pick<WizardPanel7, 'selectedCityId' | 'selectedCityName'> {
  const withCity = preview.filter((p) => p.cityId);
  const ids = new Set(withCity.map((p) => p.cityId));
  if (ids.size !== 1) return { selectedCityId: undefined, selectedCityName: undefined };
  const row = withCity[0];
  return { selectedCityId: row.cityId, selectedCityName: row.cityName };
}

export default function OnboardingStepImport({ ownerId, panel, onChange, onSkipLater }: Props) {
  const [properties, setProperties] = useState<RuProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingCities, setResolvingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveAttemptKey = useRef('');

  const selectedIds = useMemo(
    () => (panel.selectedRuIds ?? []).map(String),
    [panel.selectedRuIds],
  );

  const previewByRu = useMemo(
    () => new Map((panel.selectedRuPreview ?? []).map((p) => [p.ruPropertyId, p])),
    [panel.selectedRuPreview],
  );

  const displayProperties = useMemo(
    () =>
      properties.map((p) => {
        const saved = previewByRu.get(p.ruPropertyId);
        return {
          ...p,
          city: saved?.ruCity ?? p.city,
          suggestedCityId: saved?.cityId ?? p.suggestedCityId,
          suggestedCityName: saved?.cityName ?? p.suggestedCityName,
        };
      }),
    [properties, previewByRu],
  );

  const loadProperties = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRuOwnerProperties(ownerId);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Impossible de charger les annonces RU');
      }
      const list = (res.data.properties ?? []).map(
        (p: {
          ruPropertyId: number;
          name?: string;
          city?: string;
          isActive?: boolean;
          isArchived?: boolean;
          alreadyImported?: boolean;
          importable?: boolean;
        }) => ({
          ruPropertyId: String(p.ruPropertyId),
          name: p.name || `Annonce #${p.ruPropertyId}`,
          city: p.city,
          isActive: p.isActive === true,
          isArchived: p.isArchived === true,
          alreadyImported: Boolean(p.alreadyImported),
          importable: p.importable === true,
          photoGradient: ((p.ruPropertyId % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        }),
      );
      setProperties(list);
    } catch (e) {
      const ax = e as { response?: { status?: number; data?: { error?: string; ruAuthHint?: unknown } }; message?: string };
      const status = ax.response?.status;
      let msg = ax.response?.data?.error || ax.message || 'Erreur réseau';
      if (status === 405) {
        msg =
          'API inaccessible (405) — le front doit appeler dev.sojori.com, pas app.sojori.com. Rechargez après déploiement Vercel ou utilisez http://127.0.0.1:3001 en local.';
      } else if (status === 403) {
        msg = 'Accès refusé (403) — vérifiez votre session admin et le PM sélectionné dans le filtre owner.';
      }
      setError(msg);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const resolveAndSavePreview = useCallback(
    async (ids: string[], baseProps: RuProperty[]) => {
      const basePreview: PreviewRow[] = baseProps
        .filter((p) => ids.includes(p.ruPropertyId))
        .map((p) => {
          const saved = previewByRu.get(p.ruPropertyId);
          return {
            ruPropertyId: p.ruPropertyId,
            name: p.name,
            ruCity: saved?.ruCity ?? p.city,
            cityId: saved?.cityId,
            cityName: saved?.cityName,
          };
        });

      if (ids.length === 0) {
        onChange({
          selectedRuIds: [],
          selectedRuPreview: [],
          selectedCityId: undefined,
          selectedCityName: undefined,
          importSkippedLater: false,
          importSubtab: 'selection',
        });
        return;
      }

      const needsResolve = basePreview.some((row) => !row.cityId);
      let preview = basePreview;

      if (needsResolve && ownerId) {
        setResolvingCities(true);
        try {
          const res = await resolveRuImportCities({
            ownerId,
            ruPropertyIds: ids.map(Number).filter((n) => Number.isFinite(n)),
          });
          const map = (res.data?.cities ?? {}) as Record<
            string,
            { cityId?: string; cityName?: string; ruCityName?: string }
          >;
          preview = basePreview.map((row) => {
            const hit = map[row.ruPropertyId];
            if (!hit?.cityId) return row;
            return {
              ...row,
              cityId: String(hit.cityId),
              cityName: hit.cityName || row.cityName,
              ruCity: row.ruCity || hit.ruCityName,
            };
          });
        } catch {
          /* garde le preview sans mapping Sojori — résolu à l'import batch */
        } finally {
          setResolvingCities(false);
        }
      }

      onChange({
        selectedRuIds: ids.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
        selectedRuPreview: preview,
        ...deriveGlobalCity(preview),
        importSkippedLater: false,
        importSubtab: 'selection',
      });
    },
    [onChange, ownerId, previewByRu],
  );

  /** Reprise brouillon : enrichir villes Sojori si manquantes */
  useEffect(() => {
    if (loading || !ownerId || selectedIds.length === 0) return;
    const key = [...selectedIds].sort().join(',');
    const missing = selectedIds.some((id) => !previewByRu.get(id)?.cityId);
    if (!missing || resolveAttemptKey.current === key) return;
    resolveAttemptKey.current = key;
    void resolveAndSavePreview(selectedIds, properties);
  }, [loading, ownerId, selectedIds, properties, previewByRu, resolveAndSavePreview]);

  const handleToggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    void resolveAndSavePreview(next, properties);
  };

  const handleSelectAll = () => {
    const importable = properties.filter((p) => p.importable);
    const all = importable.map((p) => p.ruPropertyId);
    const next = selectedIds.length === all.length ? [] : all;
    void resolveAndSavePreview(next, properties);
  };

  const citySummary = useMemo(() => {
    const rows = (panel.selectedRuPreview ?? []).filter((p) => selectedIds.includes(p.ruPropertyId));
    const names = [...new Set(rows.map((r) => r.cityName).filter(Boolean))];
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    return `${names.length} villes Sojori`;
  }, [panel.selectedRuPreview, selectedIds]);

  return (
    <div className="ob-import-inline">
      <div className="ob-cfg-banner" style={{ marginBottom: 16 }}>
        Sélectionnez les annonces à importer — l&apos;import réel se lancera après le récapitulatif, comme
        depuis Annonces. La ville Sojori est détectée <strong>par annonce</strong> depuis RU (affichée sous
        chaque ligne).
      </div>

      {error && (
        <div className="ob-import-error" role="alert">
          {error}
          <button type="button" className="ob-btn-ghost" style={{ marginLeft: 12 }} onClick={() => void loadProperties()}>
            Réessayer
          </button>
        </div>
      )}

      <div className="ob-import-list-wrap">
        <PropertyList
          properties={displayProperties}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          loading={loading || resolvingCities}
        />
      </div>

      {panel.importSkippedLater && (
        <p className="ob-track-note" style={{ marginTop: 16 }}>
          Import reporté — vous pourrez lancer l&apos;import depuis <strong>Annonces → Import Airbnb</strong> ou
          l&apos;étape «&nbsp;Suite&nbsp;» après le récapitulatif.
        </p>
      )}

      <div className="ob-import-footer-hint">
        {selectedIds.length > 0 ? (
          <span>
            <strong>{selectedIds.length}</strong> annonce{selectedIds.length > 1 ? 's' : ''} sélectionnée
            {selectedIds.length > 1 ? 's' : ''}
            {resolvingCities
              ? ' · détection des villes…'
              : citySummary
                ? ` · ${citySummary}`
                : ' · villes résolues à l\'import si besoin'}
            {' — '}
            cliquez <strong>Continuer</strong> pour enregistrer sans importer.
          </span>
        ) : (
          <span>
            Aucune sélection — utilisez <strong>Passer</strong> ou sélectionnez des annonces puis{' '}
            <strong>Continuer</strong>.
          </span>
        )}
        <button type="button" className="ob-btn-ghost ob-import-skip" onClick={onSkipLater}>
          Passer — importer plus tard
        </button>
      </div>
    </div>
  );
}
