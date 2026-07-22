/**
 * Matrice routes Owner/PM (sidebar) → droits Worker (featureGrants).
 * On ne considère que OWNER_NAV_GROUPS — pas l'infra Admin.
 */
import { OWNER_NAV_GROUPS, PM_ROLES, type NavItemConfig } from '../config/navConfig';
import { NAV_TO_ROUTE } from '../config/navRoutes';
import { Roles } from '../constants/roles';

export type OwnerRouteRow = {
  featureKey: string;
  label: string;
  group: string;
  path: string;
};

export type FeatureGrant = {
  feature?: string;
  actions?: string[];
};

function roleIncludesOwner(roles?: string[]): boolean {
  if (!roles?.length) return true;
  return roles.some((r) => r === Roles.Owner || r === Roles.SuperAdmin || r === Roles.Admin);
}

function walkItems(
  items: NavItemConfig[],
  group: string,
  out: OwnerRouteRow[],
): void {
  for (const item of items) {
    if (!roleIncludesOwner(item.roles as string[] | undefined)) continue;
    if (item.sub?.length) {
      walkItems(item.sub, group, out);
      continue;
    }
    const path = NAV_TO_ROUTE[item.id] || `/${item.id}`;
    out.push({
      featureKey: item.id,
      label: item.label,
      group,
      path,
    });
  }
}

/** Routes visibles pour un Owner / PM (hors items Worker-only). */
export function buildOwnerRouteRows(): OwnerRouteRow[] {
  const rows: OwnerRouteRow[] = [];
  for (const g of OWNER_NAV_GROUPS) {
    if (!g.roles?.some((r) => PM_ROLES.includes(r))) continue;
    walkItems(g.items, g.group, rows);
  }
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.featureKey)) return false;
    seen.add(r.featureKey);
    return true;
  });
}

const ALL_ACTIONS = ['get', 'update', 'create', 'delete'] as const;

/** Lignes pour la matrice de permissions (création / édition worker). */
export function buildOwnerPermissionRows(): Array<{
  kind: 'section' | 'feature';
  label: string;
  featureKey?: string;
  key?: string;
  path?: string;
  allowedActions: string[];
  indent: boolean;
}> {
  const rows: Array<{
    kind: 'section' | 'feature';
    label: string;
    featureKey?: string;
    key?: string;
    path?: string;
    allowedActions: string[];
    indent: boolean;
  }> = [];
  for (const g of OWNER_NAV_GROUPS) {
    if (!g.roles?.some((r) => PM_ROLES.includes(r))) continue;
    const groupRoutes = buildOwnerRouteRows().filter((r) => r.group === g.group);
    if (!groupRoutes.length) continue;
    if (groupRoutes.length === 1) {
      const r = groupRoutes[0];
      rows.push({
        kind: 'feature',
        label: r.label,
        featureKey: r.featureKey,
        path: r.path,
        allowedActions: [...ALL_ACTIONS],
        indent: false,
      });
      continue;
    }
    rows.push({ kind: 'section', label: g.group, key: g.group, allowedActions: [], indent: false });
    for (const r of groupRoutes) {
      rows.push({
        kind: 'feature',
        label: r.label,
        featureKey: r.featureKey,
        path: r.path,
        allowedActions: [...ALL_ACTIONS],
        indent: true,
      });
    }
  }
  return rows;
}

export type OwnerPermissionGroup = {
  group: string;
  features: Array<{ featureKey: string; label: string }>;
};

/** Pages jamais assignables à un propriétaire immobilier (réservées au PM). */
export const LANDLORD_PM_ONLY_FEATURES = new Set(['finances/landlords']);

/** Droits par défaut à la création — Dashboard + Réservations + Finances (lecture seule). */
export const DEFAULT_LANDLORD_DASHBOARD_GRANTS: FeatureGrant[] = [
  { feature: 'dashboard', actions: ['get'] },
  { feature: 'reservations', actions: ['get'] },
  { feature: 'finances/ledger', actions: ['get'] },
  { feature: 'finances/reports', actions: ['get'] },
];

export const LANDLORD_READ_ALL_GRANTS: FeatureGrant[] = [{ feature: '*', actions: ['get'] }];

/** Toutes les sections Owner configurables par le PM (comme worker), hors pages PM-only. */
export function buildLandlordPermissionGroups(): OwnerPermissionGroup[] {
  return buildOwnerPermissionGroups()
    .map((g) => ({
      ...g,
      features: g.features.filter((f) => !LANDLORD_PM_ONLY_FEATURES.has(f.featureKey)),
    }))
    .filter((g) => g.features.length > 0);
}

export function isLandlordReadAllAccess(grants: FeatureGrant[] | undefined): boolean {
  if (!Array.isArray(grants)) return false;
  return grants.some(
    (g) =>
      g?.feature === '*' &&
      ((g?.actions || []).includes('get') || (g?.actions || []).includes('*')),
  );
}

export function landlordHasDashboardAccess(grants: FeatureGrant[] | undefined): boolean {
  if (!Array.isArray(grants) || grants.length === 0) return false;
  return grants.some((g) => g?.feature);
}

export function normalizeLandlordGrants(grants: FeatureGrant[]): FeatureGrant[] {
  if (!Array.isArray(grants) || grants.length === 0) return [];
  if (isLandlordReadAllAccess(grants)) {
    return [...LANDLORD_READ_ALL_GRANTS];
  }
  return grants
    .filter((g) => g?.feature && g.feature !== '*' && isWorkerPageGranted(grants, g.feature))
    .map((g) => ({ feature: g.feature!, actions: ['get'] as GrantAction[] }));
}

/** Une ligne par catégorie sidebar (Réservations, Task…) — édition worker. */
export function buildOwnerPermissionGroups(): OwnerPermissionGroup[] {
  const byGroup = new Map<string, OwnerPermissionGroup['features']>();
  for (const r of buildOwnerRouteRows()) {
    const list = byGroup.get(r.group) || [];
    list.push({ featureKey: r.featureKey, label: r.label });
    byGroup.set(r.group, list);
  }
  return Array.from(byGroup.entries()).map(([group, features]) => ({ group, features }));
}

export type GrantAction = 'get' | 'update' | 'create' | 'delete';

/** Droits complets sur une page sidebar (visible + actions CRUD). */
export const WORKER_PAGE_ACTIONS: GrantAction[] = ['get', 'update', 'create', 'delete'];

export function isWorkerPageGranted(
  grants: FeatureGrant[],
  featureKey: string,
  ownerAccess?: boolean,
): boolean {
  return workerGrantHasAction(grants, featureKey, 'get', ownerAccess);
}

/** État toggle catégorie sidebar (ex. Réservations → Liste, Planning, Paiements). */
export function categoryGrantState(
  grants: FeatureGrant[],
  featureKeys: string[],
  ownerAccess?: boolean,
): { all: boolean; some: boolean; none: boolean } {
  if (!featureKeys.length) return { all: false, some: false, none: true };
  const checks = featureKeys.map((fk) => isWorkerPageGranted(grants, fk, ownerAccess));
  const all = checks.every(Boolean);
  const some = checks.some(Boolean);
  return { all, some, none: !some };
}

export function setWorkerPageGrant(
  grants: FeatureGrant[],
  featureKey: string,
  enabled: boolean,
): FeatureGrant[] {
  return setWorkerGrantRowAll(grants, featureKey, enabled, [...WORKER_PAGE_ACTIONS]);
}

export function setCategoryPageGrants(
  grants: FeatureGrant[],
  featureKeys: string[],
  enabled: boolean,
): FeatureGrant[] {
  let next = grants;
  for (const fk of featureKeys) {
    next = setWorkerPageGrant(next, fk, enabled);
  }
  return next;
}

export function setWorkerGrantAction(
  grants: FeatureGrant[],
  feature: string,
  action: GrantAction,
  value: boolean,
): FeatureGrant[] {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex((g) => g.feature === feature);
  if (i === -1) {
    if (value) next.push({ feature, actions: [action] });
    return next;
  }
  const set = new Set(next[i].actions || []);
  if (value) set.add(action);
  else set.delete(action);
  const updated = Array.from(set);
  if (updated.length === 0) next.splice(i, 1);
  else next[i] = { feature, actions: updated };
  return next;
}

export function setWorkerGrantRowAll(
  grants: FeatureGrant[],
  feature: string,
  value: boolean,
  allowedKeys: GrantAction[],
): FeatureGrant[] {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex((g) => g.feature === feature);
  if (value) {
    const all = Array.from(new Set(allowedKeys));
    if (i === -1) next.push({ feature, actions: all });
    else next[i] = { feature, actions: all };
  } else if (i !== -1) {
    next.splice(i, 1);
  }
  return next;
}

export function setWorkerGroupGrantAction(
  grants: FeatureGrant[],
  featureKeys: string[],
  action: GrantAction,
  value: boolean,
): FeatureGrant[] {
  let next = grants;
  for (const fk of featureKeys) {
    next = setWorkerGrantAction(next, fk, action, value);
  }
  return next;
}

export function setWorkerGroupGrantRowAll(
  grants: FeatureGrant[],
  featureKeys: string[],
  value: boolean,
  allowedKeys: GrantAction[],
): FeatureGrant[] {
  let next = grants;
  for (const fk of featureKeys) {
    next = setWorkerGrantRowAll(next, fk, value, allowedKeys);
  }
  return next;
}

export function workerGrantHasAction(
  grants: FeatureGrant[],
  feature: string,
  action: GrantAction,
  ownerAccess?: boolean,
): boolean {
  if (ownerAccess) return true;
  return grantAllows(grants, feature, action, ownerAccess);
}

export function summarizeGroupGrant(
  grants: FeatureGrant[],
  featureKeys: string[],
  action: GrantAction,
  ownerAccess?: boolean,
): { all: boolean; some: boolean } {
  if (!featureKeys.length) return { all: false, some: false };
  const checks = featureKeys.map((fk) => workerGrantHasAction(grants, fk, action, ownerAccess));
  return { all: checks.every(Boolean), some: checks.some(Boolean) };
}

/** Droits hétérogènes dans une même catégorie sidebar (ex. Liste + Planning mais pas Paiements). */
export function workerHasPartialCategoryGrants(
  grants: FeatureGrant[],
  ownerAccess?: boolean,
): boolean {
  if (isWorkerAdminAccess(grants, ownerAccess)) return false;
  for (const g of buildOwnerPermissionGroups()) {
    const featureKeys = g.features.map((f) => f.featureKey);
    if (featureKeys.length <= 1) continue;

    const withGrant = featureKeys.filter((fk) =>
      grants.some((gr) => gr?.feature === fk && (gr.actions?.length ?? 0) > 0),
    );
    if (withGrant.length > 0 && withGrant.length < featureKeys.length) return true;

    for (const action of ALL_ACTIONS) {
      const { all, some } = summarizeGroupGrant(grants, featureKeys, action, ownerAccess);
      if (some && !all) return true;
    }
  }
  return false;
}

export function normalizeWorkerGrants(worker: {
  featureGrants?: FeatureGrant[];
  permissions?: Array<{ module?: string; actions?: string[] }>;
  ownerAccess?: boolean;
}): FeatureGrant[] {
  if (Array.isArray(worker.featureGrants) && worker.featureGrants.length) {
    return worker.featureGrants;
  }
  if (Array.isArray(worker.permissions)) {
    return worker.permissions.map((p) => ({
      feature: p.module,
      actions: p.actions || [],
    }));
  }
  return [];
}

export function isWorkerAdminAccess(
  grants: FeatureGrant[],
  ownerAccess?: boolean,
): boolean {
  if (ownerAccess) return true;
  // Uniquement actions:'*' = admin. `{ feature:'*', actions:['get'] }` = lecture globale, pas écriture.
  return grants.some((g) => (g?.actions || []).includes('*'));
}

export function grantAllows(
  grants: FeatureGrant[],
  featureKey: string,
  action: 'get' | 'update' | 'create' | 'delete',
  ownerAccess?: boolean,
): boolean {
  if (isWorkerAdminAccess(grants, ownerAccess)) return true;
  return grants.some(
    (g) =>
      (g?.feature === featureKey || g?.feature === '*') &&
      ((g?.actions || []).includes(action) || (g?.actions || []).includes('*')),
  );
}

export function summarizeWorkerRouteAccess(
  worker: {
    featureGrants?: FeatureGrant[];
    permissions?: Array<{ module?: string; actions?: string[] }>;
    ownerAccess?: boolean;
  },
  routes: OwnerRouteRow[] = buildOwnerRouteRows(),
): {
  grants: FeatureGrant[];
  adminAccess: boolean;
  rows: Array<
    OwnerRouteRow & {
      read: boolean;
      write: boolean;
    }
  >;
  readCount: number;
  writeCount: number;
  total: number;
} {
  const grants = normalizeWorkerGrants(worker);
  const adminAccess = isWorkerAdminAccess(grants, worker.ownerAccess);
  const rows = routes.map((r) => {
    const read = grantAllows(grants, r.featureKey, 'get', worker.ownerAccess);
    const write =
      grantAllows(grants, r.featureKey, 'update', worker.ownerAccess) ||
      grantAllows(grants, r.featureKey, 'create', worker.ownerAccess) ||
      grantAllows(grants, r.featureKey, 'delete', worker.ownerAccess);
    return { ...r, read, write };
  });
  return {
    grants,
    adminAccess,
    rows,
    readCount: adminAccess ? routes.length : rows.filter((r) => r.read).length,
    writeCount: adminAccess ? routes.length : rows.filter((r) => r.write).length,
    total: routes.length,
  };
}
