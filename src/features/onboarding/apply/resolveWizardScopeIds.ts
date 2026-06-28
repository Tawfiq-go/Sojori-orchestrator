import { getCities } from '../../../services/teamDashboardApi';
import type { WizardAccessScope } from '../wizardScope';

export type ResolvedScopeIds = {
  cityIds: (string | 'All')[];
  listingIds: (string | 'All')[];
  countryIds: ('All')[];
};

export async function resolveWizardScopeIds(scope: WizardAccessScope): Promise<ResolvedScopeIds> {
  if (scope.scopeAll) {
    return { cityIds: ['All'], listingIds: ['All'], countryIds: ['All'] };
  }

  const listingIds = scope.listingIds.length > 0 ? scope.listingIds.map(String) : (['All'] as const);

  if (!scope.cities.length) {
    return { cityIds: listingIds.length && listingIds[0] !== 'All' ? [] : ['All'], listingIds, countryIds: ['All'] };
  }

  const rows = (await getCities({ limit: 5000, paged: false })) as Array<{
    _id?: string;
    id?: string;
    name?: string;
  }>;
  const byName = new Map(
    rows.map((c) => [String(c.name || '').toLowerCase().trim(), String(c._id ?? c.id ?? '')]),
  );
  const cityIds = scope.cities
    .map((name) => byName.get(name.toLowerCase().trim()) || '')
    .filter(Boolean);
  return {
    cityIds: cityIds.length ? cityIds : ['All'],
    listingIds,
    countryIds: ['All'],
  };
}
