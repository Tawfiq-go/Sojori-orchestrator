import { fetchRuOwnerProperties } from '../../../services/channelsDashboardApi';
import type { WizardPanel7 } from '../types';
import { formatImportApplyRecap, mergeImportRecap } from './suiteApplyRecap';

type RuPropertyRow = {
  ruPropertyId?: number;
  name?: string;
  alreadyImported?: boolean;
  sojoriListingId?: string | null;
};

function previewMatchesSelection(p7: WizardPanel7): boolean {
  const selected = new Set((p7.selectedRuIds ?? []).map(String));
  const previewIds = new Set((p7.selectedRuPreview ?? []).map((r) => String(r.ruPropertyId)));
  if (selected.size === 0) return true;
  if (selected.size !== previewIds.size) return false;
  for (const id of selected) {
    if (!previewIds.has(id)) return false;
  }
  return true;
}

/** Aligne selectedRuPreview sur le catalogue RU live (noms / villes à jour). */
export async function syncPanel7RuPreviewFromChannels(
  ownerId: string,
  p7: WizardPanel7,
): Promise<WizardPanel7> {
  const selected = p7.selectedRuIds ?? [];
  if (selected.length === 0) return p7;

  try {
    const res = await fetchRuOwnerProperties(ownerId);
    const payload = res.data as { properties?: RuPropertyRow[] };
    const byRu = new Map(
      (payload.properties ?? []).map((row) => [String(row.ruPropertyId), row]),
    );

    const cityByRu = new Map(
      (p7.selectedRuPreview ?? []).map((row) => [String(row.ruPropertyId), row]),
    );

    const selectedRuPreview = selected.map((ruPropertyId) => {
      const key = String(ruPropertyId);
      const live = byRu.get(key);
      const prev = cityByRu.get(key);
      return {
        ruPropertyId: key,
        name: live?.name?.trim() || prev?.name || `Annonce #${key}`,
        cityId: prev?.cityId,
        cityName: prev?.cityName || prev?.ruCity,
        ruCity: prev?.ruCity,
      };
    });

    return { ...p7, selectedRuPreview };
  } catch {
    return p7;
  }
}

/** Recap import PM à partir du preview (sans relancer l'import HTTP). */
export function importRecapFromPanel7(
  p7: WizardPanel7,
  listingsPropagated = 2,
): { headline: string; lines: string[] } {
  const results = (p7.selectedRuPreview ?? [])
    .filter((row) => (p7.selectedRuIds ?? []).map(String).includes(String(row.ruPropertyId)))
    .map((row) => ({
      ruPropertyId: String(row.ruPropertyId),
      propertyName: row.name,
      listingName: row.name,
      city: row.cityName || row.ruCity,
      success: true,
    }));

  const recap = formatImportApplyRecap(results, { audience: 'pm' });
  const alreadyDone = (p7.importedRuIds ?? []).length >= (p7.selectedRuIds ?? []).length;
  const headline = alreadyDone
    ? recap.headline.replace(/^(\d+) annonces importées/, '$1 annonces déjà importées')
    : recap.headline;

  return mergeImportRecap({ ...recap, headline }, listingsPropagated);
}

export async function reconcilePanel7WithChannels(
  ownerId: string,
  p7: WizardPanel7,
): Promise<{ panel: WizardPanel7; recapStale: boolean }> {
  const recapStale = !previewMatchesSelection(p7);
  const panel = recapStale ? await syncPanel7RuPreviewFromChannels(ownerId, p7) : p7;
  return { panel, recapStale };
}
