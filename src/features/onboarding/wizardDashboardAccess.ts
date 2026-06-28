import {
  buildOwnerPermissionGroups,
  setWorkerGrantAction,
  setWorkerGroupGrantAction,
  setWorkerGroupGrantRowAll,
  summarizeGroupGrant,
  workerGrantHasAction,
  workerHasPartialCategoryGrants,
  type GrantAction,
} from '../../utils/ownerRoutePermissions';
import type { WizardFeatureGrant } from './types';

const ALL_ACTIONS: GrantAction[] = ['get', 'update', 'create', 'delete'];

export function isWizardDashboardAdmin(grants: WizardFeatureGrant[], isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return grants.some((g) => g?.feature === '*' || (g?.actions || []).includes('*'));
}

export function applyWizardDashboardAdmin(
  isAdmin: boolean,
  previousGrants: WizardFeatureGrant[],
): WizardFeatureGrant[] {
  if (isAdmin) return [{ feature: '*', actions: ['*'] }];
  const prev = previousGrants.filter((g) => g?.feature !== '*' && !(g?.actions || []).includes('*'));
  return prev.length ? prev : [];
}

export function isCategoryFullyOn(grants: WizardFeatureGrant[], featureKeys: string[]): boolean {
  if (!featureKeys.length) return false;
  return ALL_ACTIONS.every((action) =>
    featureKeys.every((fk) => workerGrantHasAction(grants, fk, action)),
  );
}

export function toggleDashboardCategory(
  grants: WizardFeatureGrant[],
  featureKeys: string[],
  on: boolean,
): WizardFeatureGrant[] {
  return setWorkerGroupGrantRowAll(grants, featureKeys, on, ALL_ACTIONS);
}

export function toggleDashboardPageAction(
  grants: WizardFeatureGrant[],
  featureKey: string,
  action: GrantAction,
  value: boolean,
): WizardFeatureGrant[] {
  return setWorkerGrantAction(grants, featureKey, action, value);
}

export function summarizeDashboardCategory(
  grants: WizardFeatureGrant[],
  featureKeys: string[],
  action: GrantAction,
) {
  return summarizeGroupGrant(grants, featureKeys, action);
}

export { buildOwnerPermissionGroups, workerHasPartialCategoryGrants, ALL_ACTIONS };
