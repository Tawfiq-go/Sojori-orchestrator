/**
 * Pure helpers for listing form level/tab URL sync.
 * Keeps ListingFormShell local state aligned with search params.
 */

export type ListingFormNavLevel = 'detail' | 'orchestration-v3' | 'config';

export type ListingFormNav = {
  level: ListingFormNavLevel;
  tab?: string;
};

export function normalizeListingFormNavLevel(
  raw: string | null | undefined,
): ListingFormNavLevel {
  if (raw === 'orchestration-v3' || raw === 'config-new' || raw === 'config') {
    return raw === 'config' ? 'config' : 'orchestration-v3';
  }
  return 'detail';
}

export function resolveListingFormNavFromSearch(params: {
  get: (key: string) => string | null;
}): ListingFormNav {
  const level = normalizeListingFormNavLevel(params.get('level'));
  const tabRaw = params.get('tab');
  const tabParam =
    tabRaw === 'city-tax-config'
      ? 'messages-config'
      : tabRaw === 'channels' || tabRaw === 'distribution'
        ? 'ota'
        : tabRaw === 'direct' || tabRaw === 'direct-booking'
          ? 'direct-booking'
          : tabRaw === 'rules' || tabRaw === 'rules-guest'
            ? 'availability'
            : tabRaw;
  const legacyConfigTab =
    Boolean(tabParam?.endsWith('-config')) ||
    tabParam === 'orchestration-config' ||
    tabParam === 'whatsapp-config';
  if (level === 'orchestration-v3' || legacyConfigTab) {
    return { level: level === 'orchestration-v3' ? 'orchestration-v3' : level, tab: undefined };
  }
  return { level, tab: tabParam || undefined };
}

export function listingFormNavToSearchParams(
  current: URLSearchParams,
  next: ListingFormNav,
): URLSearchParams {
  const out = new URLSearchParams(current);
  out.set('level', next.level);
  if (next.level === 'orchestration-v3') {
    out.delete('tab');
  } else if (next.tab) {
    out.set('tab', next.tab);
  } else {
    out.delete('tab');
  }
  return out;
}

/** True when URL already requests the Documents detail tab. */
export function isDocumentsDetailNav(nav: ListingFormNav): boolean {
  return nav.level === 'detail' && nav.tab === 'documents';
}
