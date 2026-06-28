import {
  inviteWorker,
  getWorkers,
  updateWorker,
  parseAccountInvite409,
  AccountInviteConflictError,
} from '../../../services/teamDashboardApi';
import { listLandlords } from '../../finances/landlordApi';
import {
  createStaff as createFulltaskStaff,
  createWhatsappAdmin as createFulltaskWhatsappAdmin,
  listStaff as listFulltaskStaff,
  listWhatsappAdmins as listFulltaskWhatsappAdmins,
} from '../../../services/fulltaskApi';
import { designStaffToApi } from '../../../utils/fulltaskMappers';
import {
  designWhatsappAdminToApi,
  type WhatsappAdminDesign,
  WA_ADMIN_TYPES,
} from '../../taskHub/staff-design/whatsappAdminTypes';
import { staffDisplayName, normalizeWizardStaffRow } from '../staffNormalize';
import type { WizardDraft, WizardStaffRow } from '../types';
import { resolveWizardScopeIds, type ResolvedScopeIds } from './resolveWizardScopeIds';
import { normalizePhone } from './wizardStaffMapping';

export type StaffApplyPhase = 'adminWhatsapp' | 'taskStaff' | 'dashboardEmail';

/** Ordre métier imposé : admin WA → staff OPS → dashboard. */
export const STAFF_APPLY_PHASE_ORDER: StaffApplyPhase[] = [
  'adminWhatsapp',
  'taskStaff',
  'dashboardEmail',
];

export const STAFF_PHASE_LABELS: Record<StaffApplyPhase, string> = {
  adminWhatsapp: 'Admin WhatsApp',
  taskStaff: 'Staff tâches',
  dashboardEmail: 'Dashboard',
};

export type StaffApplyRowResult = {
  name: string;
  email?: string;
  whatsapp?: string;
  roles: string[];
  created: string[];
  skipped: string[];
  ok: boolean;
  error?: string;
};

export type ApplyStaffResult = {
  phase?: StaffApplyPhase;
  results: StaffApplyRowResult[];
  succeeded: number;
  failed: number;
  skipped: number;
};

type ExistingKeys = {
  workerEmails: Set<string>;
  staffPhones: Set<string>;
  adminWaPhones: Set<string>;
};

type WorkerAccountRow = {
  _id?: string;
  email?: string;
  whatsapp?: string;
  deleted?: boolean;
  workerTypeOwner?: boolean;
};

function parseWorkersList(data: unknown): WorkerAccountRow[] {
  if (Array.isArray(data)) return data as WorkerAccountRow[];
  const obj = data as { data?: unknown[]; accounts?: unknown[] };
  if (Array.isArray(obj.data)) return obj.data as WorkerAccountRow[];
  if (Array.isArray(obj.accounts)) return obj.accounts as WorkerAccountRow[];
  return [];
}

function parseFulltaskStaffList(data: unknown): Array<{ email?: string; phone?: string }> {
  const obj = data as { data?: unknown[] };
  const rows = Array.isArray(obj.data) ? obj.data : Array.isArray(data) ? data : [];
  return rows as Array<{ email?: string; phone?: string }>;
}

function parseFulltaskAdminList(data: unknown): Array<{ whatsappPhone?: string }> {
  const obj = data as { data?: unknown[] };
  const rows = Array.isArray(obj.data) ? obj.data : Array.isArray(data) ? data : [];
  return rows as Array<{ whatsappPhone?: string }>;
}

/** Déduplication alignée sur /tasks/team (srv-fulltask), pas staff-simplified legacy. */
export async function loadExistingStaffKeys(ownerId: string): Promise<ExistingKeys> {
  const workerEmails = new Set<string>();
  const staffPhones = new Set<string>();
  const adminWaPhones = new Set<string>();

  try {
    const workers = await getWorkers({ ownerId, limit: 500, page: 0, workerTypeOwner: true });
    for (const w of parseWorkersList(workers)) {
      if (w.email) workerEmails.add(w.email.toLowerCase());
      if (w.whatsapp) staffPhones.add(normalizePhone(w.whatsapp));
    }
    const allWorkers = await getWorkers({ ownerId, limit: 500, page: 0, workerTypeOwner: false });
    for (const w of parseWorkersList(allWorkers)) {
      if (w.email) workerEmails.add(w.email.toLowerCase());
    }
  } catch {
    /* optional */
  }

  try {
    const landlords = await listLandlords('', ownerId);
    for (const l of landlords) {
      if (l.email) workerEmails.add(String(l.email).toLowerCase());
    }
  } catch {
    /* optional */
  }

  try {
    const staff = await listFulltaskStaff({ owner_id: ownerId, ownerId, limit: 500, paged: false });
    for (const s of parseFulltaskStaffList(staff)) {
      if (s.phone) staffPhones.add(normalizePhone(s.phone));
    }
  } catch {
    /* optional */
  }

  try {
    const admins = await listFulltaskWhatsappAdmins({ owner_id: ownerId, paged: false });
    for (const a of parseFulltaskAdminList(admins)) {
      if (a.whatsappPhone) adminWaPhones.add(normalizePhone(a.whatsappPhone));
    }
  } catch {
    /* optional */
  }

  return { workerEmails, staffPhones, adminWaPhones };
}

function scopeIdsForApi(scope: ResolvedScopeIds): { listingIds: string[]; cityIds: string[] } {
  return {
    listingIds: scope.listingIds.filter((id) => id !== 'All').map(String),
    cityIds: scope.cityIds.filter((id) => id !== 'All').map(String),
  };
}

function wizardLangToStaffLang(language?: string): 'fr' | 'en' | 'ar' {
  const l = String(language || '').toLowerCase();
  if (l.includes('english') || l === 'en') return 'en';
  if (l.includes('arab')) return 'ar';
  return 'fr';
}

function wizardRowToStaffDesign(row: WizardStaffRow, scope: ResolvedScopeIds): Record<string, unknown> {
  const ts = row.taskStaff;
  const { listingIds, cityIds } = scopeIdsForApi(scope);
  const days = ts.daysOfWeek?.length ? ts.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
  return {
    fullName: staffDisplayName(row),
    phoneE164: normalizePhone(row.whatsapp),
    whatsappE164: normalizePhone(row.whatsapp),
    email: row.email?.trim() || '',
    contractType: ts.contractType === 'freelance' ? 'freelance' : 'employee',
    allowedTaskTypes: ts.allowedTaskTypes,
    allowedListingIds: listingIds,
    allowedCityIds: cityIds,
    maxTasksPerDay: ts.maxTasksPerDay || 6,
    isAdmin: ts.isOpsAdmin,
    schedule: {
      daysOfWeek: days,
      timeWindows: [{ start: ts.timeStart || '09:00', end: ts.timeEnd || '18:00' }],
    },
    lang: wizardLangToStaffLang(row.adminWhatsapp.language),
  };
}

function wizardRowToWhatsappAdminDesign(row: WizardStaffRow, scope: ResolvedScopeIds): WhatsappAdminDesign {
  const { listingIds } = scopeIdsForApi(scope);
  const perms = row.adminWhatsapp.menuPermissions || {};
  const push = row.adminWhatsapp.pushNotifications || {};

  return {
    _id: '',
    username: staffDisplayName(row) || 'Admin WA',
    whatsappPhone: normalizePhone(row.whatsapp),
    language: row.adminWhatsapp.language || 'French',
    listingIds,
    banned: row.adminWhatsapp.banned,
    ownerId: undefined,
    permissions: WA_ADMIN_TYPES.map((t) => {
      const access = perms[t.type];
      const normalized =
        access === 'none' ? 'none' : access === 'read' ? 'read' : access === 'write' ? 'write' : 'write';
      return { type: t.type, access: normalized as 'read' | 'write' | 'none' };
    }),
    notifications: Object.fromEntries(
      Object.entries(push).filter(([, v]) => typeof v === 'boolean'),
    ) as Record<string, boolean>,
  };
}

async function applyTaskStaff(ownerId: string, row: WizardStaffRow): Promise<void> {
  const scope = await resolveWizardScopeIds(row.taskStaff);
  const design = wizardRowToStaffDesign(row, scope);
  const body = designStaffToApi(design, { isCreate: true, ownerId });
  await createFulltaskStaff(body);
}

async function applyAdminWhatsapp(ownerId: string, row: WizardStaffRow): Promise<void> {
  const scope = await resolveWizardScopeIds(row.adminWhatsapp);
  const design = wizardRowToWhatsappAdminDesign(row, scope);
  const body = designWhatsappAdminToApi(design, ownerId);
  await createFulltaskWhatsappAdmin(body);
}

async function findOwnerWorkerAccount(
  ownerId: string,
  email: string,
  options?: { includeDeleted?: boolean },
): Promise<WorkerAccountRow | null> {
  const normalized = email.trim().toLowerCase();
  const deletedFlags = options?.includeDeleted ? [false, true] : [false];
  for (const deleted of deletedFlags) {
    for (const workerTypeOwner of [true, false]) {
      try {
        const res = await getWorkers({
          ownerId,
          workerTypeOwner,
          deleted,
          search_text: email,
          limit: 50,
          page: 0,
        });
        const hit = parseWorkersList(res).find((w) => w.email?.trim().toLowerCase() === normalized);
        if (hit?._id) return hit;
      } catch {
        /* optional */
      }
    }
  }
  return null;
}

function buildDashboardWorkerBody(ownerId: string, row: WizardStaffRow, scope: ResolvedScopeIds) {
  const listingIds = scope.listingIds.filter((id) => id !== 'All');
  const listingCityIds = scope.cityIds.filter((id) => id !== 'All');
  const featureGrants = row.dashboard.featureGrants?.length
    ? row.dashboard.featureGrants
    : [{ feature: '*', actions: ['*'] }];

  return {
    email: row.email?.trim() || '',
    firstName: row.firstName || 'Membre',
    lastName: row.lastName || 'Équipe',
    phone: normalizePhone(row.whatsapp) || null,
    whatsapp: normalizePhone(row.whatsapp) || null,
    workerTypeOwner: true,
    ownerId,
    ownerAccess: row.dashboard.isAdmin,
    listingIds: row.dashboard.isAdmin ? [] : listingIds,
    listingCityIds: row.dashboard.isAdmin ? [] : listingCityIds,
    featureGrants,
  };
}

async function applyDashboardWorker(
  ownerId: string,
  row: WizardStaffRow,
): Promise<'created' | 'restored' | 'updated' | 'unchanged'> {
  const scope = await resolveWizardScopeIds(row.dashboard);
  const email = row.email?.trim();
  if (!email) throw new Error('Email requis pour accès dashboard');

  const body = buildDashboardWorkerBody(ownerId, row, scope);
  const existing = await findOwnerWorkerAccount(ownerId, email, { includeDeleted: true });

  if (existing?._id) {
    const needsRestore = existing.deleted === true;
    const needsOwnerFlag = existing.workerTypeOwner !== true;
    if (!needsRestore && !needsOwnerFlag) {
      return 'unchanged';
    }
    await updateWorker(String(existing._id), {
      deleted: false,
      workerTypeOwner: true,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      whatsapp: body.whatsapp,
      ownerAccess: body.ownerAccess,
      listingIds: body.listingIds,
      listingCityIds: body.listingCityIds,
      featureGrants: body.featureGrants,
    });
    if (needsRestore) return 'restored';
    return 'updated';
  }

  const res = await inviteWorker(body);

  if (res && typeof res === 'object' && 'success' in res && res.success === false) {
    throw new Error(String((res as { error?: string; message?: string }).error || (res as { message?: string }).message || 'Invitation échouée'));
  }
  return 'created';
}

function rowHasPhase(row: WizardStaffRow, phase: StaffApplyPhase): boolean {
  if (phase === 'adminWhatsapp') return row.roles.adminWhatsapp;
  if (phase === 'taskStaff') return row.roles.taskStaff;
  return row.roles.dashboardEmail;
}

async function applyPhaseForRow(
  ownerId: string,
  row: WizardStaffRow,
  phase: StaffApplyPhase,
  existing: ExistingKeys,
): Promise<{ created?: string; skipped?: string; error?: string }> {
  const label = STAFF_PHASE_LABELS[phase];
  const email = row.email?.trim().toLowerCase();
  const phone = normalizePhone(row.whatsapp);

  if (phase === 'adminWhatsapp') {
    if (!row.roles.adminWhatsapp) return {};
    if (!phone) return { error: 'WhatsApp requis pour Admin WA' };
    if (existing.adminWaPhones.has(phone)) return { skipped: `${label} (déjà)` };
    await applyAdminWhatsapp(ownerId, row);
    existing.adminWaPhones.add(phone);
    return { created: label };
  }

  if (phase === 'taskStaff') {
    if (!row.roles.taskStaff) return {};
    if (phone && existing.staffPhones.has(phone)) return { skipped: `${label} (déjà)` };
    await applyTaskStaff(ownerId, row);
    if (phone) existing.staffPhones.add(phone);
    return { created: label };
  }

  if (!row.roles.dashboardEmail) return {};
  if (!email) return { error: 'Email requis pour Dashboard' };
  try {
    const action = await applyDashboardWorker(ownerId, row);
    existing.workerEmails.add(email);
    if (phone) existing.staffPhones.add(phone);
    if (action === 'created') return { created: label };
    if (action === 'restored') return { created: `${label} (réactivé)` };
    if (action === 'updated') return { created: `${label} (mis à jour)` };
    return { skipped: `${label} — compte actif déjà présent` };
  } catch (e) {
    if (e instanceof AccountInviteConflictError) {
      if (e.existingRole === 'Owner') {
        return { error: e.message };
      }
      existing.workerEmails.add(email);
      return { skipped: `${label} — ${e.message}` };
    }
    const parsed = parseAccountInvite409(e);
    if (parsed) return { error: parsed };
    throw e;
  }
}

function pushRowResult(
  results: StaffApplyRowResult[],
  row: WizardStaffRow,
  outcome: { created?: string; skipped?: string; error?: string },
) {
  const name = staffDisplayName(row);
  let entry = results.find((r) => r.name === name);
  if (!entry) {
    entry = {
      name,
      email: row.email?.trim().toLowerCase(),
      whatsapp: row.whatsapp,
      roles: [],
      created: [],
      skipped: [],
      ok: true,
    };
    results.push(entry);
  }
  if (outcome.created) entry.created.push(outcome.created);
  if (outcome.skipped) entry.skipped.push(outcome.skipped);
  if (outcome.error) {
    entry.ok = false;
    entry.error = entry.error ? `${entry.error} · ${outcome.error}` : outcome.error;
  }
}

function finalizeCounts(results: StaffApplyRowResult[]): Pick<ApplyStaffResult, 'succeeded' | 'failed' | 'skipped'> {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    const allSkipped = r.created.length === 0 && r.skipped.length > 0 && !r.error;
    if (allSkipped) skipped += 1;
    else if (r.ok && r.created.length > 0) succeeded += 1;
    else if (!r.ok) failed += 1;
  }
  return { succeeded, failed, skipped };
}

/** Apply une ou plusieurs phases dans l'ordre admin WA → staff → dashboard. */
export async function applyOnboardingStaff(
  ownerId: string,
  draft: WizardDraft,
  options?: {
    phases?: StaffApplyPhase[];
    existing?: ExistingKeys;
  },
): Promise<ApplyStaffResult> {
  const phases = options?.phases ?? STAFF_APPLY_PHASE_ORDER;
  const p1 = draft.panels['1'];
  const rows = (p1?.staff ?? []).map(normalizeWizardStaffRow).filter((s) => staffDisplayName(s));
  const existing = options?.existing ?? (await loadExistingStaffKeys(ownerId));
  const results: StaffApplyRowResult[] = [];

  for (const phase of phases) {
    const phaseRows = rows.filter((r) => rowHasPhase(r, phase));
    for (const row of phaseRows) {
      try {
        const outcome = await applyPhaseForRow(ownerId, row, phase, existing);
        if (outcome.created || outcome.skipped || outcome.error) {
          pushRowResult(results, row, outcome);
        }
      } catch (e) {
        const parsed = parseAccountInvite409(e);
        pushRowResult(results, row, {
          error: parsed || (e instanceof Error ? e.message : `${STAFF_PHASE_LABELS[phase]} échoué`),
        });
      }
    }
  }

  const counts = finalizeCounts(results);
  return {
    phase: phases.length === 1 ? phases[0] : undefined,
    results,
    ...counts,
  };
}

export function staffRowsForPhase(rows: WizardStaffRow[], phase: StaffApplyPhase): WizardStaffRow[] {
  return rows.filter((r) => rowHasPhase(r, phase));
}

export function phasesNeededInDraft(draft: WizardDraft): StaffApplyPhase[] {
  const p1 = draft.panels['1'];
  const rows = (p1?.staff ?? []).map(normalizeWizardStaffRow).filter((s) => staffDisplayName(s));
  return STAFF_APPLY_PHASE_ORDER.filter((phase) => staffRowsForPhase(rows, phase).length > 0);
}
