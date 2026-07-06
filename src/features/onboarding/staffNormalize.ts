import type { WizardStaffRow } from './types';
import { defaultStaffRow } from './defaults';
import { normalizeWizardScope } from './wizardScope';

export function staffDisplayName(row: Pick<WizardStaffRow, 'firstName' | 'lastName'>): string {
  return `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
}

function splitLegacyName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Compat brouillons v1 (fullName, name, cityScope racine, days Lun–Ven). */
export function normalizeWizardStaffRow(raw: Partial<WizardStaffRow> & Record<string, unknown>): WizardStaffRow {
  const base = defaultStaffRow();
  if (!raw || typeof raw !== 'object') return base;
  const advancedDefaultsApplied = raw.advancedDefaultsApplied === true;

  const legacyName =
    (typeof raw.fullName === 'string' && raw.fullName) ||
    (typeof raw.name === 'string' ? raw.name : '');
  const fromLegacy = splitLegacyName(legacyName);
  const firstName =
    typeof raw.firstName === 'string' && raw.firstName ? raw.firstName : fromLegacy.firstName;
  const lastName =
    typeof raw.lastName === 'string' && raw.lastName ? raw.lastName : fromLegacy.lastName;

  const legacyDashboardEmail =
    typeof (raw.dashboard as { email?: string } | undefined)?.email === 'string'
      ? (raw.dashboard as { email: string }).email
      : '';
  const email =
    typeof raw.email === 'string' && raw.email ? raw.email : legacyDashboardEmail;

  const legacyCityScope = raw.cityScope as 'all' | 'selected' | undefined;
  const legacyCities = Array.isArray(raw.cities) ? (raw.cities as string[]) : undefined;
  const legacyDays = Array.isArray(raw.days) ? (raw.days as string[]) : undefined;
  const dayMap: Record<string, number> = {
    Lun: 0,
    Mar: 1,
    Mer: 2,
    Jeu: 3,
    Ven: 4,
    Sam: 5,
    Dim: 6,
  };

  const roles = advancedDefaultsApplied && raw.roles ? raw.roles : {
    taskStaff: Boolean(legacyName || raw.whatsapp) || base.roles.taskStaff,
    adminWhatsapp: base.roles.adminWhatsapp,
    dashboardEmail: Boolean(email) || base.roles.dashboardEmail,
  };

  const taskStaffRaw = (raw.taskStaff as Record<string, unknown>) ?? {};
  const taskScope = normalizeWizardScope({
    ...taskStaffRaw,
    cities: (taskStaffRaw.cities as string[]) ?? legacyCities,
    cityScope: (taskStaffRaw.cityScope as 'all' | 'selected') ?? legacyCityScope,
  });
  const taskStaff = {
    ...base.taskStaff,
    ...taskStaffRaw,
    ...taskScope,
    allowedTaskTypes: Array.isArray(taskStaffRaw.allowedTaskTypes)
      ? (taskStaffRaw.allowedTaskTypes as string[])
      : base.taskStaff.allowedTaskTypes,
    ...(!advancedDefaultsApplied &&
    Array.isArray(taskStaffRaw.allowedTaskTypes) &&
    taskStaffRaw.allowedTaskTypes.length === 0
      ? { allowedTaskTypes: base.taskStaff.allowedTaskTypes }
      : {}),
    ...(!advancedDefaultsApplied ? { isOpsAdmin: base.taskStaff.isOpsAdmin } : {}),
    ...(legacyDays
      ? {
          daysOfWeek: legacyDays
            .map((d) => dayMap[d])
            .filter((n): n is number => typeof n === 'number'),
        }
      : {}),
  };

  const rawAdmin = (raw.adminWhatsapp as Record<string, unknown>) ?? {};
  const legacyAlerts = rawAdmin as {
    alertReservation?: boolean;
    alertTasks?: boolean;
    alertMessages?: boolean;
    alertReviews?: boolean;
  };
  const rawPush = (rawAdmin.pushNotifications as Record<string, boolean> | undefined) ?? {};
  const rawNotifCategories =
    (rawAdmin.notifCategories as Record<string, boolean> | undefined) ?? {};
  const rawMenus = (rawAdmin.menuPermissions as Record<string, string> | undefined) ?? {};
  const allPushOff = Object.keys(rawPush).length > 0 && Object.values(rawPush).every((v) => v === false);
  const allNotifCategoriesOff =
    Object.keys(rawNotifCategories).length > 0 && Object.values(rawNotifCategories).every((v) => v === false);
  const allMenusOff = Object.keys(rawMenus).length > 0 && Object.values(rawMenus).every((v) => v === 'none');
  const pushNotifications = {
    ...base.adminWhatsapp.pushNotifications,
    ...(!advancedDefaultsApplied && allPushOff ? {} : rawPush),
  };
  const notifCategories = {
    ...base.adminWhatsapp.notifCategories,
    ...(!advancedDefaultsApplied && allNotifCategoriesOff ? {} : rawNotifCategories),
  };
  if (
    !rawAdmin.notifCategories &&
    (legacyAlerts.alertReservation !== undefined || legacyAlerts.alertTasks !== undefined)
  ) {
    notifCategories.reservation = legacyAlerts.alertReservation ?? true;
    notifCategories.inboxOta = legacyAlerts.alertMessages ?? true;
    notifCategories.tasksCreated = legacyAlerts.alertTasks ?? true;
    notifCategories.tasksCancelled = legacyAlerts.alertTasks ?? true;
  }

  const adminScope = normalizeWizardScope(rawAdmin as Parameters<typeof normalizeWizardScope>[0]);
  const adminWhatsapp = {
    ...base.adminWhatsapp,
    ...rawAdmin,
    ...adminScope,
    notifCategories,
    pushNotifications,
    menuPermissions: {
      ...base.adminWhatsapp.menuPermissions,
      ...(!advancedDefaultsApplied && allMenusOff ? {} : rawMenus),
    },
  };

  const rawDash = (raw.dashboard as Record<string, unknown>) ?? {};
  const dashScope = normalizeWizardScope(rawDash as Parameters<typeof normalizeWizardScope>[0]);
  const legacyPreset = rawDash.preset as string | undefined;
  const dashboard = {
    ...base.dashboard,
    ...rawDash,
    ...dashScope,
    isAdmin:
      !advancedDefaultsApplied
        ? base.dashboard.isAdmin
        : typeof rawDash.isAdmin === 'boolean'
          ? rawDash.isAdmin
          : legacyPreset === 'exploitation',
    featureGrants: Array.isArray(rawDash.featureGrants)
      ? (!advancedDefaultsApplied && rawDash.featureGrants.length === 0
          ? base.dashboard.featureGrants
          : (rawDash.featureGrants as typeof base.dashboard.featureGrants))
      : base.dashboard.featureGrants,
  };

  return {
    ...base,
    id: typeof raw.id === 'string' ? raw.id : base.id,
    advancedDefaultsApplied: true,
    firstName,
    lastName,
    whatsapp: typeof raw.whatsapp === 'string' ? raw.whatsapp : base.whatsapp,
    email,
    roles: {
      taskStaff: roles.taskStaff ?? false,
      adminWhatsapp: roles.adminWhatsapp ?? false,
      dashboardEmail: roles.dashboardEmail ?? false,
    },
    taskStaff,
    adminWhatsapp,
    dashboard,
  };
}
