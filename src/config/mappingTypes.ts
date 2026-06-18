/**
 * Types partagés — hubs Mapping (listings RU vs admin global).
 */

import { legacyDashboardUrl } from '../utils/legacyDashboardUrl';

export type MappingLinkTarget = 'legacy' | 'orchestrator';

/** Base Mongo / microservice qui persiste ce référentiel */
export type MappingDatabase =
  | 'srv-listing'
  | 'srv-admin'
  | 'srv-channels'
  | 'srv-calendar';

export type MappingEntry = {
  id: string;
  label: string;
  description: string;
  path: string;
  target: MappingLinkTarget;
  legacyTabHint?: string;
  tags?: string[];
  apiHint?: string;
  database: MappingDatabase;
};

export type MappingGroup = {
  id: string;
  label: string;
  description: string;
  items: MappingEntry[];
};

export function resolveMappingHref(entry: MappingEntry): string {
  if (entry.target === 'orchestrator') return entry.path;
  return legacyDashboardUrl(entry.path);
}

export function flattenMappingGroups(groups: MappingGroup[]): MappingEntry[] {
  return groups.flatMap((g) => g.items);
}
