import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import { ensureMenuOptionsComplete } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import type { Workflow } from '../taskHub/staff-design/types';
import { apiOrchestrationToDesign, designWorkflowToApi } from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import { CAPABILITY_REGISTRY, getCapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import {
  applyDependencyRules,
  buildMatrixFromSources,
  patchMenuOptionsForCapability,
  patchWorkflowForCapability,
} from '../serviceMatrix/matrixStateUtils';
import type { CapabilityExecutionState, CapabilityRowState } from '../serviceMatrix/types';
import {
  orchestrationFlagsFromDoc,
  type ListingCapabilityDoc,
} from './listingOrchestrationApi';
import { loadCapabilityMatrix, saveCapabilityRow } from '../serviceMatrix/capabilityMatrixApi';
import { cleaningIncludedToGestion, parseCleaningIncludedGestion } from './cleaningGestionHelpers';
import { isAxiosError } from 'axios';
import { enrichOwnerDocGestionFromTemplate } from './enrichOwnerOrchestration';

export interface OwnerOrchestrationDoc {
  ownerId: string;
  orchestrationEnabled: boolean;
  capabilities: Record<string, ListingCapabilityDoc>;
  scheduledMessages: unknown[];
  version: number;
  source?: string;
}

export interface OwnerOrchestrationEffective extends OwnerOrchestrationDoc {
  updatedAt?: string;
  workflows: Record<string, unknown>[];
  categoryEnabled: Record<string, boolean>;
}

function unwrapData<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { data?: T; success?: boolean };
  if (r.data !== undefined) return r.data;
  return res as T;
}

function mergeMenuOptionsFromDoc(doc: OwnerOrchestrationEffective | OwnerOrchestrationDoc): unknown[] {
  const byCode = new Map<string, unknown>();
  for (const def of CAPABILITY_REGISTRY) {
    const cap = doc.capabilities?.[def.key];
    if (!cap?.whatsapp?.menuOptions) continue;
    for (const raw of cap.whatsapp.menuOptions) {
      if (!raw || typeof raw !== 'object') continue;
      const code = String((raw as { code?: string }).code ?? '');
      if (code) byCode.set(code, raw);
    }
  }
  return ensureMenuOptionsComplete(Array.from(byCode.values()));
}

function workflowsFromEffective(doc: OwnerOrchestrationEffective): Workflow[] {
  const raw = doc.workflows ?? [];
  if (!raw.length) return [];
  const mapped = apiOrchestrationToDesign({ workflows: raw });
  return (mapped.workflows ?? []) as Workflow[];
}

function executionFlagsFromStored(
  execution: Record<string, unknown> | undefined,
): CapabilityExecutionState | undefined {
  if (!execution) return undefined;
  const reminders = execution.reminders as unknown[] | undefined;
  const staffReminders = execution.staffReminders as unknown[] | undefined;
  const staffAssignment = execution.staffAssignment;
  return {
    clientReminders: Array.isArray(reminders) && reminders.length > 0,
    staffAssignment: Boolean(staffAssignment),
    staffReminders: Array.isArray(staffReminders) && staffReminders.length > 0,
    pmEscalation: execution.escalationEnabled === true,
  };
}

function rowsFromOwnerDoc(
  rows: CapabilityRowState[],
  doc: OwnerOrchestrationEffective | OwnerOrchestrationDoc,
): CapabilityRowState[] {
  return rows.map(row => {
    const cap = doc.capabilities?.[row.key];
    if (!cap) return row;
    const patch: Partial<CapabilityRowState> = { inherited: false };
    if (cap.decisions) {
      if (cap.decisions.managed != null) patch.managed = cap.decisions.managed;
      if (cap.decisions.clientEnabled != null) patch.clientEnabled = cap.decisions.clientEnabled;
      if (cap.decisions.orchestrated != null) patch.orchestrated = cap.decisions.orchestrated;
      if (cap.decisions.taskEnabled != null) patch.taskEnabled = cap.decisions.taskEnabled;
    }
    const execFlags = executionFlagsFromStored(cap.execution);
    if (execFlags) patch.execution = execFlags;
    return applyDependencyRules(row, patch);
  });
}

function isOwnerOrchestrationRouteMissing(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 404) return false;
  const body = error.response?.data as { error?: string; errors?: Array<{ message?: string }> } | undefined;
  if (body?.error?.includes('Owner orchestration')) return false;
  return true;
}

function buildOwnerGestionFromTemplate(
  capabilityKey: string,
  listing: Record<string, unknown>,
  tpl: Record<string, unknown>,
): Record<string, unknown> | undefined {
  switch (capabilityKey) {
    case 'cleaning_free':
      return cleaningIncludedToGestion(parseCleaningIncludedGestion({}, listing));
    case 'cleaning_paid':
      return { paidCleaningConfig: listing.paidCleaningConfig ?? null };
    case 'cleaning_sojori':
      return { cleaningOrchestration: listing.cleaningOrchestration ?? null };
    case 'arrival_choose':
      return {
        checkinTimeslotsEnabled: listing.checkinTimeslotsEnabled,
        TS_CHECKIN: listing.TS_CHECKIN ?? [],
      };
    case 'departure_choose':
      return {
        checkoutTimeslotsEnabled: listing.checkoutTimeslotsEnabled,
        TS_CHECKOUT: listing.TS_CHECKOUT ?? [],
      };
    case 'arrival_declare':
    case 'departure_declare':
      return undefined;
    case 'access':
      return tpl.access ? { ...(tpl.access as Record<string, unknown>) } : undefined;
    case 'property_wifi':
      return {
        wifiUsername: listing.wifiUsername ?? '',
        wifiPassword: listing.wifiPassword ?? '',
      };
    case 'support':
      return { categories: (tpl.support as { categories?: unknown[] } | undefined)?.categories ?? [] };
    case 'service_client':
      return tpl.serviceClient ? { ...(tpl.serviceClient as Record<string, unknown>) } : undefined;
    case 'transport':
    case 'groceries':
    case 'concierge':
      return {
        transportServices: (tpl.concierge as { transportServices?: unknown[] } | undefined)?.transportServices ?? [],
        groceryServices: (tpl.concierge as { groceryServices?: unknown[] } | undefined)?.groceryServices ?? [],
        customServices: (tpl.concierge as { customServices?: unknown[] } | undefined)?.customServices ?? [],
      };
    case 'house_rules':
      return tpl.rulesAndInfo ? { ...(tpl.rulesAndInfo as Record<string, unknown>) } : undefined;
    default:
      return undefined;
  }
}

async function loadOwnerOrchestrationFromLegacy(ownerKey: string): Promise<{
  rows: CapabilityRowState[];
  doc: OwnerOrchestrationEffective;
  workflows: Workflow[];
  menuOptions: unknown[];
}> {
  const templateKey = ownerKey === 'global' ? 'global' : ownerKey;
  const [rows, tplRes] = await Promise.all([
    loadCapabilityMatrix({ scope: 'owner', ownerKey: templateKey }),
    listingsService.getListingOwnerConfigTemplate(templateKey),
  ]);
  const tpl =
    unwrapData<{
      listing?: Record<string, unknown>;
      chatbot?: { menuOptions?: unknown[] };
      access?: unknown;
      support?: unknown;
      concierge?: unknown;
      serviceClient?: unknown;
      rulesAndInfo?: unknown;
    }>(tplRes) ?? {};
  const listing = tpl.listing ?? {};

  let workflows: Workflow[] = [];
  const scheduledMessages: unknown[] = [];
  try {
    const raw = await fulltaskApi.getOrchestrationConfig(templateKey === 'global' ? 'global' : templateKey);
    const ftDoc = unwrapFulltaskData<Record<string, unknown>>(raw);
    if (ftDoc) {
      const mapped = apiOrchestrationToDesign(ftDoc);
      workflows = (mapped.workflows ?? []) as Workflow[];
      if (Array.isArray(ftDoc.scheduledMessages) && ftDoc.scheduledMessages.length > 0) {
        scheduledMessages.push(...(ftDoc.scheduledMessages as unknown[]));
      }
    }
  } catch {
    workflows = [];
  }

  const menuOptions = ensureMenuOptionsComplete(tpl.chatbot?.menuOptions ?? []);
  const capabilities: Record<string, ListingCapabilityDoc> = {};

  for (const def of CAPABILITY_REGISTRY) {
    const row = rows.find(r => r.key === def.key);
    const wf = def.taskType ? workflows.find(w => w.taskTypeId === def.taskType) : undefined;
    const cap: ListingCapabilityDoc = {
      key: def.key,
      taskType: def.taskType,
      decisions: {
        managed: row?.managed ?? true,
        clientEnabled: row?.clientEnabled ?? true,
        orchestrated: row?.orchestrated ?? true,
        taskEnabled: row?.taskEnabled ?? true,
      },
      gestion: buildOwnerGestionFromTemplate(def.key, listing, tpl as Record<string, unknown>),
    };
    if (def.menuCodes.length) {
      cap.whatsapp = {
        menuCodes: def.menuCodes,
        menuOptions: menuOptions.filter(o => {
          const code = String((o as { code?: string }).code ?? '');
          return def.menuCodes.includes(code);
        }),
        overrides: def.menuCodes.map(code => ({
          code,
          enabled: row?.clientEnabled ?? true,
        })),
      };
    }
    if (wf && def.taskType) {
      const apiWf = designWorkflowToApi(wf as unknown as Record<string, unknown>);
      if (apiWf) {
        const { type: _t, ...exec } = apiWf as Record<string, unknown>;
        cap.execution = exec;
      }
    }
    capabilities[def.key] = cap;
  }

  const doc: OwnerOrchestrationEffective = {
    ownerId: templateKey,
    orchestrationEnabled: true,
    capabilities,
    scheduledMessages,
    version: 0,
    source: 'legacy_fallback',
    updatedAt: new Date().toISOString(),
    workflows: workflows.map(w => designWorkflowToApi(w as unknown as Record<string, unknown>)).filter(Boolean) as Record<string, unknown>[],
    categoryEnabled: Object.fromEntries(
      CAPABILITY_REGISTRY.filter(d => d.taskType).map(d => [d.taskType!, rows.find(r => r.key === d.key)?.orchestrated !== false]),
    ),
  };

  return { rows, doc, workflows, menuOptions };
}

async function saveOwnerGestionLegacy(input: {
  ownerKey: string;
  capabilityKey: string;
  gestion: Record<string, unknown>;
}): Promise<void> {
  const templateKey = input.ownerKey === 'global' ? 'global' : input.ownerKey;
  if (input.capabilityKey === 'cleaning_free') {
    const patch = cleaningIncludedToGestion({
      frequency: Array.isArray(input.gestion.frequency)
        ? (input.gestion.frequency as never)
        : [],
      timeSlots: Array.isArray(input.gestion.timeSlots)
        ? (input.gestion.timeSlots as never)
        : Array.isArray(input.gestion.TS_CLEAN)
          ? (input.gestion.TS_CLEAN as never)
          : [],
      descriptionFr: String(input.gestion.descriptionFr ?? ''),
      extras: Array.isArray(input.gestion.extras) ? input.gestion.extras : [],
    });
    await listingsService.putListingOwnerConfigTemplateSection(templateKey, 'listing', {
      frequency: patch.frequency,
      TS_CLEAN: patch.TS_CLEAN,
      includedCleaningDescription: {
        fr: patch.descriptionFr,
        en: patch.descriptionFr,
        ar: '',
      },
      includedCleaningExtras: patch.extras,
    });
    return;
  }
  throw new Error('Modèle orchestration (API owner_orchestrations) indisponible — déployer srv-listing');
}

export async function loadOwnerOrchestrationMatrix(ownerKey: string): Promise<{
  rows: CapabilityRowState[];
  doc: OwnerOrchestrationEffective;
  workflows: Workflow[];
  menuOptions: unknown[];
}> {
  try {
    const raw = await listingsService.getOwnerOrchestrationCompiled(ownerKey);
    let doc = unwrapData<OwnerOrchestrationEffective>(raw);
    if (!doc?.ownerId) {
      throw new Error('Modèle orchestration introuvable');
    }

    doc = await enrichOwnerDocGestionFromTemplate(ownerKey, doc);

    let menuOptions = mergeMenuOptionsFromDoc(doc);
    if (menuOptions.length === 0) {
      menuOptions = ensureMenuOptionsComplete([]);
    }

    const workflows = workflowsFromEffective(doc);
    const baseRows = buildMatrixFromSources({
      orchestrationFlags: orchestrationFlagsFromDoc(doc as never),
      menuOptions,
      workflows,
    });
    const rows = rowsFromOwnerDoc(baseRows, doc);

    return { rows, doc, workflows, menuOptions };
  } catch (error: unknown) {
    if (isOwnerOrchestrationRouteMissing(error)) {
      return loadOwnerOrchestrationFromLegacy(ownerKey);
    }
    throw error;
  }
}

export async function saveOwnerOrchestrationRow(input: {
  ownerKey: string;
  row: CapabilityRowState;
  allWorkflows: Workflow[];
  allMenuOptions: unknown[];
  doc: OwnerOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.row.key);
  if (!def) throw new Error('Capacité inconnue');

  const nextMenu = patchMenuOptionsForCapability(
    input.allMenuOptions,
    def,
    input.row.clientEnabled,
  );
  const nextWorkflows = patchWorkflowForCapability(input.allWorkflows, def, input.row);
  const wf = def.taskType
    ? nextWorkflows.find(w => w.taskTypeId === def.taskType)
    : undefined;

  const existing = input.doc.capabilities?.[def.key];
  const capability: ListingCapabilityDoc = {
    key: def.key,
    taskType: def.taskType,
    decisions: {
      managed: input.row.managed,
      clientEnabled: input.row.clientEnabled,
      orchestrated: input.row.orchestrated,
      taskEnabled: input.row.taskEnabled,
    },
    taskBehavior: existing?.taskBehavior,
    gestion: existing?.gestion,
  };

  if (def.menuCodes.length) {
    capability.whatsapp = {
      menuCodes: def.menuCodes,
      menuOptions: nextMenu.filter(o => {
        const code = String((o as { code?: string }).code ?? '');
        return def.menuCodes.includes(code);
      }),
      overrides: def.menuCodes.map(code => ({
        code,
        enabled: input.row.clientEnabled,
      })),
    };
  }

  if (wf && def.taskType) {
    const apiWf = designWorkflowToApi(wf as unknown as Record<string, unknown>);
    if (apiWf) {
      const { type: _t, ...exec } = apiWf as Record<string, unknown>;
      capability.execution = exec;
    }
  }

  try {
    await listingsService.putOwnerOrchestration(input.ownerKey, {
      capabilities: { [def.key]: capability },
    });
  } catch (error: unknown) {
    if (!isOwnerOrchestrationRouteMissing(error)) throw error;
    const result = await saveCapabilityRow({
      scope: 'owner',
      ownerKey: input.ownerKey,
      row: input.row,
      allMenuOptions: input.allMenuOptions,
      allWorkflows: input.allWorkflows,
    });
    if (!result.listingOk && !result.fulltaskOk) {
      throw new Error(result.error ?? 'Erreur enregistrement legacy');
    }
  }
}

export async function saveOwnerGestion(input: {
  ownerKey: string;
  capabilityKey: string;
  gestion: Record<string, unknown>;
  doc: OwnerOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  try {
    await listingsService.putOwnerOrchestration(input.ownerKey, {
      capabilities: {
        [input.capabilityKey]: {
          key: input.capabilityKey,
          taskType: def.taskType,
          decisions: existing?.decisions ?? {
            managed: true,
            clientEnabled: true,
            orchestrated: true,
            taskEnabled: true,
          },
          gestion: input.gestion,
          taskBehavior: existing?.taskBehavior,
          execution: existing?.execution,
          whatsapp: existing?.whatsapp,
        },
      },
    });
  } catch (error: unknown) {
    if (!isOwnerOrchestrationRouteMissing(error)) throw error;
    await saveOwnerGestionLegacy(input);
  }
}

export async function saveOwnerTaskBehavior(input: {
  ownerKey: string;
  capabilityKey: string;
  taskBehavior: { requiresClientAction: boolean; autoCompletionTrigger: string };
  doc: OwnerOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  try {
    await listingsService.putOwnerOrchestration(input.ownerKey, {
      capabilities: {
        [input.capabilityKey]: {
          key: input.capabilityKey,
          taskType: def.taskType,
          decisions: existing?.decisions ?? {
            managed: true,
            clientEnabled: true,
            orchestrated: true,
            taskEnabled: true,
          },
          taskBehavior: input.taskBehavior,
          gestion: existing?.gestion,
          execution: existing?.execution,
          whatsapp: existing?.whatsapp,
        },
      },
    });
  } catch (error: unknown) {
    if (!isOwnerOrchestrationRouteMissing(error)) throw error;
    throw new Error('Route owner orchestration indisponible — comportement tâche non enregistré');
  }
}

export async function saveOwnerExecutionWorkflow(input: {
  ownerKey: string;
  capabilityKey: string;
  taskType: string;
  workflow: Workflow;
  doc: OwnerOrchestrationDoc;
}): Promise<void> {
  const existing = input.doc.capabilities?.[input.capabilityKey];
  const apiWf = designWorkflowToApi(input.workflow as unknown as Record<string, unknown>);
  if (!apiWf) throw new Error('Workflow invalide');

  const { type: _t, ...execution } = apiWf as Record<string, unknown>;

  try {
    await listingsService.putOwnerOrchestration(input.ownerKey, {
      capabilities: {
        [input.capabilityKey]: {
          key: input.capabilityKey,
          taskType: input.taskType,
          decisions: existing?.decisions,
          taskBehavior: existing?.taskBehavior,
          gestion: existing?.gestion,
          whatsapp: existing?.whatsapp,
          execution,
        },
      },
    });
  } catch (error: unknown) {
    if (!isOwnerOrchestrationRouteMissing(error)) throw error;
    throw new Error('Route owner orchestration indisponible — relances non enregistrées');
  }
}

export async function saveOwnerWhatsappOption(input: {
  ownerKey: string;
  capabilityKey: string;
  menuCodes: string[];
  menuOptions: unknown[];
  doc: OwnerOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  await listingsService.putOwnerOrchestration(input.ownerKey, {
    capabilities: {
      [input.capabilityKey]: {
        key: input.capabilityKey,
        taskType: def.taskType,
        decisions: existing?.decisions ?? {
          managed: true,
          clientEnabled: true,
          orchestrated: true,
          taskEnabled: true,
        },
        whatsapp: {
          menuCodes: input.menuCodes,
          menuOptions: input.menuOptions.filter(o => {
            const code = String((o as { code?: string }).code ?? '');
            return input.menuCodes.includes(code);
          }),
          overrides: existing?.whatsapp?.overrides ?? [],
        },
        gestion: existing?.gestion,
        taskBehavior: existing?.taskBehavior,
        execution: existing?.execution,
      },
    },
  });
}
