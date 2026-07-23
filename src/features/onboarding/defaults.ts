import type {
  WizardCapabilities,
  WizardConditions,
  WizardDashboardGuest,
  WizardDraft,
  WizardJxSettings,
  WizardMenuAccess,
  WizardPanel0,
  WizardPanel1,
  WizardOrchestrationQuickConfig,
  WizardStaffRow,
} from './types';
import {
  DEFAULT_WA_MENU_PERMISSIONS,
  defaultWaNotifCategories,
  defaultWizardWaPushNotifications,
} from './wizardAdminWhatsapp';
import { STAFF_TASK_PILLS } from '../taskHub/staff-design/staffDesignConstants';
import { applyWizardDashboardAdmin } from './wizardDashboardAccess';
import { applyJxPreset, normalizeJxSettings } from './wizardGuestAccess';
import {
  defaultOrchestrationQuickConfig,
  normalizeOrchestrationQuickConfig,
} from './onboardingOrchestrationDashboard';
import { normalizeWizardStaffRow } from './staffNormalize';
import { emptyWizardScope } from './wizardScope';
import { defaultDeadlines as buildDefaultDeadlines, normalizeWizardDeadlines } from './wizardStaffDeadlines';

export const defaultDeadlines = buildDefaultDeadlines;

const defaultStaffTaskTypes = () => STAFF_TASK_PILLS.map((pill) => pill.key);

export const defaultStaffRow = (): WizardStaffRow => ({
  id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  advancedDefaultsApplied: true,
  firstName: '',
  lastName: '',
  whatsapp: '',
  email: '',
  roles: {
    taskStaff: true,
    adminWhatsapp: true,
    dashboardEmail: true,
  },
  taskStaff: {
    contractType: 'employee',
    allowedTaskTypes: defaultStaffTaskTypes(),
    isOpsAdmin: true,
    maxTasksPerDay: 5,
    ...emptyWizardScope(),
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    timeStart: '09:00',
    timeEnd: '18:00',
  },
  adminWhatsapp: {
    language: 'French',
    banned: false,
    menuPermissions: { ...DEFAULT_WA_MENU_PERMISSIONS },
    notifCategories: defaultWaNotifCategories(),
    pushNotifications: defaultWizardWaPushNotifications(),
    ...emptyWizardScope(),
  },
  dashboard: {
    isAdmin: true,
    ...emptyWizardScope(),
    featureGrants: applyWizardDashboardAdmin(true, []),
  },
});

export const ownerFullMenuAccess = (): WizardMenuAccess => ({
  dashboard: true,
  calendar: true,
  reservations: true,
  listings: true,
  dynamicPricing: true,
  orchestration: true,
  tasks: true,
  inboxClients: true,
  inboxStaff: true,
  finances: true,
  analytics: true,
});

export const defaultMenuAccess = (): WizardMenuAccess => ({
  dashboard: true,
  calendar: true,
  reservations: true,
  listings: true,
  dynamicPricing: false,
  orchestration: true,
  tasks: true,
  inboxClients: true,
  inboxStaff: false,
  finances: true,
  analytics: false,
});

/** Brouillon neuf = pack standard activé (l'utilisateur ajuste ensuite).
 * Valeurs inlinées (import de wizardCapabilitiesToActivations = cycle → ReferenceError). */
export const defaultCapabilities = (): WizardCapabilities => ({
  welcome: true,
  registration: true,
  support: true,
  serviceClient: true,
  arrivalChoose: true,
  departureChoose: true,
  arrivalDeclare: false,
  departureDeclare: false,
  receiveArrival: false,
  receiveDeparture: false,
  transport: true,
  groceries: false,
  concierge: false,
  cleaningFree: true,
  cleaningPaid: true,
  cleaningSojori: false,
  accessCodes: true,
  wifi: true,
  rules: true,
});

export const defaultJx = (): WizardJxSettings => applyJxPreset('standard');

export const defaultConditions = (): WizardConditions => ({
  registrationBeforeArrival: true,
  arrivalBeforeCodes: true,
  registrationBeforeStaff: true,
  arrivalBeforeStaff: true,
  preset: 'secure',
});

export { normalizeWizardDeadlines };

export const defaultPanel0 = (): WizardPanel0 => ({
  hasAirbnb: true,
  cities: ['Marrakech'],
  expectedListings: 10,
});

export const defaultPanel1 = (): WizardPanel1 => ({
  staff: [],
  staffApplyMode: 'additive',
});

export const defaultPanel2 = (): { guests: WizardDashboardGuest[]; menuAccess: WizardMenuAccess } => ({
  guests: [],
  menuAccess: ownerFullMenuAccess(),
});

export function createDefaultWizardDraft(path: 'A' | 'B' = 'A'): WizardDraft {
  const p2 = defaultPanel2();
  return {
    version: 1,
    currentPanel: 0,
    path,
    panelsValidated: [],
    panels: {
      '0': defaultPanel0(),
      '1': defaultPanel1(),
      '2': p2,
      '3': {
        capabilities: defaultCapabilities(),
        jx: defaultJx(),
        quickConfig: defaultOrchestrationQuickConfig(['Marrakech']),
        pack: 'standard',
        orchestrationApplyMode: 'replace',
        orchestrationEnabled: true,
      },
      '4': { jx: defaultJx() },
      '5': { conditions: defaultConditions() },
      '6': { deadlines: defaultDeadlines() },
      '7': { importSubtab: 'selection' },
    },
  };
}

function normalizePanel1Staff(panel1: WizardPanel1 | undefined): WizardPanel1 {
  const base = defaultPanel1();
  if (!panel1) return base;
  const staff = (panel1.staff ?? []).map((row) =>
    normalizeWizardStaffRow(row as Partial<WizardStaffRow> & Record<string, unknown>),
  );
  return {
    staffApplyMode: 'additive',
    staff: staff.length ? staff : base.staff,
  };
}

export function mergeWizardDraftFromServer(
  local: WizardDraft,
  remote: Partial<WizardDraft> | null | undefined,
): WizardDraft {
  if (!remote) return local;
  const panels = { ...local.panels };
  if (remote.panels) {
    for (const key of Object.keys(remote.panels) as Array<keyof typeof panels>) {
      panels[key] = { ...(panels[key] as object), ...(remote.panels[key] as object) } as never;
    }
  }
  if (panels['1']) {
    panels['1'] = normalizePanel1Staff(panels['1'] as WizardPanel1);
  }
  if (panels['3']) {
    const p0 = panels['0'] as WizardPanel0 | undefined;
    const cities = p0?.cities?.length ? p0.cities : ['Marrakech'];
    const p3 = panels['3'] as {
      capabilities?: WizardCapabilities;
      jx?: Partial<WizardJxSettings>;
      quickConfig?: Partial<WizardOrchestrationQuickConfig>;
      pack?: 'essential' | 'standard' | 'complete' | 'premium';
      orchestrationEnabled?: boolean;
    };
    const p4 = panels['4'] as { jx?: Partial<WizardJxSettings> } | undefined;
    panels['3'] = {
      ...p3,
      capabilities: { ...defaultCapabilities(), ...(p3.capabilities ?? {}) },
      jx: normalizeJxSettings(p3.jx ?? p4?.jx),
      quickConfig: normalizeOrchestrationQuickConfig(p3.quickConfig, cities, {
        ...defaultCapabilities(),
        ...(p3.capabilities ?? {}),
      }),
      pack: p3.pack ?? 'standard',
      orchestrationApplyMode: 'replace',
      orchestrationEnabled: p3.orchestrationEnabled !== false,
    } as never;
  }
  if (panels['4']) {
    const p4 = panels['4'] as { jx?: Partial<WizardJxSettings> };
    panels['4'] = {
      ...p4,
      jx: normalizeJxSettings(p4.jx),
    } as never;
  }
  if (panels['6']) {
    const p6 = panels['6'] as { deadlines?: Parameters<typeof normalizeWizardDeadlines>[0] };
    panels['6'] = {
      ...p6,
      deadlines: normalizeWizardDeadlines(p6.deadlines),
    } as never;
  }
  return {
    ...local,
    ...remote,
    panels,
    panelsValidated: remote.panelsValidated ?? local.panelsValidated,
    currentPanel: remote.currentPanel ?? local.currentPanel,
    path: remote.path ?? local.path,
  };
}

export function wizardProgressPercent(draft: WizardDraft): number {
  const validated = draft.panelsValidated?.length ?? 0;
  return Math.min(100, Math.round((validated / 9) * 100));
}
