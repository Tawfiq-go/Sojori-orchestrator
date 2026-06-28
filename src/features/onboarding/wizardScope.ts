/** Périmètre annonces wizard — union villes + listings précis, ou tout. */
export type WizardAccessScope = {
  scopeAll: boolean;
  cities: string[];
  listingIds: string[];
};

export const emptyWizardScope = (): WizardAccessScope => ({
  scopeAll: false,
  cities: [],
  listingIds: [],
});

export function normalizeWizardScope(
  raw: Partial<WizardAccessScope> & {
    cityScope?: 'all' | 'selected';
    listingScope?: 'all' | 'selected';
  } | undefined,
): WizardAccessScope {
  const base = emptyWizardScope();
  if (!raw) return base;

  if (typeof raw.scopeAll === 'boolean') {
    return {
      scopeAll: raw.scopeAll,
      cities: Array.isArray(raw.cities) ? raw.cities.map(String) : [],
      listingIds: Array.isArray(raw.listingIds) ? raw.listingIds.map(String) : [],
    };
  }

  const legacyCityAll = raw.cityScope !== 'selected';
  const legacyListingAll = raw.listingScope !== 'selected';
  const cities = Array.isArray(raw.cities) ? raw.cities.map(String) : [];
  const listingIds = Array.isArray(raw.listingIds) ? raw.listingIds.map(String) : [];

  if (legacyCityAll && legacyListingAll && !cities.length && !listingIds.length) {
    return { scopeAll: true, cities: [], listingIds: [] };
  }

  return { scopeAll: false, cities, listingIds };
}

export function scopeHasSelection(scope: WizardAccessScope): boolean {
  if (scope.scopeAll) return true;
  return scope.cities.length > 0 || scope.listingIds.length > 0;
}
