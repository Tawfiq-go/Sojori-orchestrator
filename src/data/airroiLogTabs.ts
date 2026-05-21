/** Catalogue des 22 endpoints AirROI — aligné srv-channels/airroiLogEndpoints.ts */

export const SOJORI_LOG_TAB_ALL = 'all';

export type AirroiLogTabGroup = 'priority' | 'markets' | 'listings' | 'search' | 'calculator';

export type AirroiLogTabDef = {
  id: string;
  shortLabel: string;
  group: AirroiLogTabGroup;
};

export const AIRROI_LOG_GROUP_LABELS: Record<AirroiLogTabGroup, string> = {
  priority: 'Priorité · pricing',
  markets: 'Marchés',
  listings: 'Listings',
  search: 'Recherche',
  calculator: 'Calculateur',
};

export const AIRROI_LOG_GROUP_ORDER: AirroiLogTabGroup[] = [
  'priority',
  'markets',
  'listings',
  'search',
  'calculator',
];

/** 6 endpoints prioritaires (affichés en premier). */
const PRIORITY_IDS = [
  'GET /markets/lookup',
  'POST /markets/summary',
  'POST /markets/metrics/occupancy',
  'POST /markets/metrics/average-daily-rate',
  'GET /listings/comparables',
  'GET /listings/future/rates',
] as const;

/** Catalogue complet (22 endpoints). */
export const AIRROI_LOG_CATALOG: AirroiLogTabDef[] = [
  { id: 'GET /calculator/estimate', shortLabel: 'Calculateur · estimation', group: 'calculator' },
  { id: 'GET /listings', shortLabel: 'Listing · détail', group: 'listings' },
  { id: 'GET /listings/comparables', shortLabel: 'Listing · comparables', group: 'listings' },
  { id: 'POST /listings/batch', shortLabel: 'Listings · batch', group: 'listings' },
  { id: 'GET /listings/metrics/all', shortLabel: 'Listing · métriques', group: 'listings' },
  { id: 'GET /listings/future/rates', shortLabel: 'Listing · prix futurs', group: 'listings' },
  { id: 'POST /listings/search/market', shortLabel: 'Recherche · marché', group: 'search' },
  { id: 'POST /listings/search/radius', shortLabel: 'Recherche · rayon', group: 'search' },
  { id: 'POST /listings/search/polygon', shortLabel: 'Recherche · polygone', group: 'search' },
  { id: 'GET /markets/lookup', shortLabel: 'Marchés · lookup GPS', group: 'markets' },
  { id: 'GET /markets/search', shortLabel: 'Marchés · recherche', group: 'markets' },
  { id: 'POST /markets/summary', shortLabel: 'Marché · résumé', group: 'markets' },
  { id: 'POST /markets/metrics/all', shortLabel: 'Marché · toutes métriques', group: 'markets' },
  { id: 'POST /markets/metrics/occupancy', shortLabel: 'Marché · occupation', group: 'markets' },
  { id: 'POST /markets/metrics/average-daily-rate', shortLabel: 'Marché · ADR', group: 'markets' },
  { id: 'POST /markets/metrics/revpar', shortLabel: 'Marché · RevPAR', group: 'markets' },
  { id: 'POST /markets/metrics/revenue', shortLabel: 'Marché · revenus', group: 'markets' },
  { id: 'POST /markets/metrics/booking-lead-time', shortLabel: 'Marché · lead time', group: 'markets' },
  { id: 'POST /markets/metrics/length-of-stay', shortLabel: 'Marché · durée séjour', group: 'markets' },
  { id: 'POST /markets/metrics/min-nights', shortLabel: 'Marché · min nights', group: 'markets' },
  { id: 'POST /markets/metrics/active-listings', shortLabel: 'Marché · annonces actives', group: 'markets' },
  { id: 'POST /markets/metrics/future/pacing', shortLabel: 'Marché · pacing futur', group: 'markets' },
];

const PRIORITY_SET = new Set<string>(PRIORITY_IDS);

export type SojoriLogTabView = {
  id: string;
  shortLabel: string;
  group: AirroiLogTabGroup | 'all';
  /** Affichage : (GET /path) Libellé */
  displayLabel: string;
};

export function formatAirroiTabLabel(id: string, shortLabel: string): string {
  if (id === SOJORI_LOG_TAB_ALL) return 'Tout';
  return `(${id}) ${shortLabel}`;
}

function catalogEntry(id: string, fallbackLabel?: string): AirroiLogTabDef | null {
  const found = AIRROI_LOG_CATALOG.find((t) => t.id === id);
  if (found) return found;
  if (!id || id === SOJORI_LOG_TAB_ALL) return null;
  return {
    id,
    shortLabel: fallbackLabel || id,
    group: 'markets',
  };
}

/** Fusionne catalogue + endpoints renvoyés par l’API (sans doublons). */
export function buildSojoriLogTabs(
  extraFromApi: Array<{ endpoint?: string; id?: string; label?: string }> = [],
): SojoriLogTabView[] {
  const byId = new Map<string, AirroiLogTabDef>();

  for (const t of AIRROI_LOG_CATALOG) {
    byId.set(t.id, {
      ...t,
      group: PRIORITY_SET.has(t.id) ? 'priority' : t.group,
    });
  }

  for (const ep of extraFromApi) {
    const id = ep.endpoint || ep.id;
    if (!id || id === SOJORI_LOG_TAB_ALL || byId.has(id)) continue;
    const entry = catalogEntry(id, ep.label);
    if (entry) byId.set(id, entry);
  }

  const all: SojoriLogTabView[] = [
    {
      id: SOJORI_LOG_TAB_ALL,
      shortLabel: 'Tout',
      group: 'all',
      displayLabel: 'Tout',
    },
  ];

  const rest = [...byId.values()].sort((a, b) => {
    const ga = AIRROI_LOG_GROUP_ORDER.indexOf(a.group);
    const gb = AIRROI_LOG_GROUP_ORDER.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.shortLabel.localeCompare(b.shortLabel, 'fr');
  });

  for (const t of rest) {
    all.push({
      id: t.id,
      shortLabel: t.shortLabel,
      group: t.group,
      displayLabel: formatAirroiTabLabel(t.id, t.shortLabel),
    });
  }

  return all;
}

export function filterSojoriLogTabs(tabs: SojoriLogTabView[], query: string): SojoriLogTabView[] {
  const q = query.trim().toLowerCase();
  if (!q) return tabs;
  return tabs.filter((t) => {
    if (t.id === SOJORI_LOG_TAB_ALL) return true;
    return (
      t.id.toLowerCase().includes(q) ||
      t.shortLabel.toLowerCase().includes(q) ||
      t.displayLabel.toLowerCase().includes(q) ||
      AIRROI_LOG_GROUP_LABELS[t.group as AirroiLogTabGroup]?.toLowerCase().includes(q)
    );
  });
}

export function groupFilteredTabs(
  tabs: SojoriLogTabView[],
): Array<{ group: AirroiLogTabGroup | 'all'; label: string; items: SojoriLogTabView[] }> {
  const tout = tabs.filter((t) => t.id === SOJORI_LOG_TAB_ALL);
  const sections: Array<{ group: AirroiLogTabGroup | 'all'; label: string; items: SojoriLogTabView[] }> = [];

  if (tout.length) {
    sections.push({ group: 'all', label: 'Vue globale', items: tout });
  }

  for (const g of AIRROI_LOG_GROUP_ORDER) {
    const items = tabs.filter((t) => t.group === g);
    if (items.length === 0) continue;
    sections.push({ group: g, label: AIRROI_LOG_GROUP_LABELS[g], items });
  }

  return sections;
}
