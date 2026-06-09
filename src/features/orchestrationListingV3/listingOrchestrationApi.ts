import listingsService from '../../services/listingsService';
import { ensureMenuOptionsComplete } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import type { Workflow } from '../taskHub/staff-design/types';
import {
  apiOrchestrationToDesign,
  designWorkflowToApi,
} from '../../utils/fulltaskMappers';
import { CAPABILITY_REGISTRY, getCapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import {
  applyDependencyRules,
  buildMatrixFromSources,
  patchMenuOptionsForCapability,
  patchWorkflowForCapability,
} from '../serviceMatrix/matrixStateUtils';
import type { CapabilityExecutionState, CapabilityRowState } from '../serviceMatrix/types';

export interface ListingCapabilityDoc {
  key: string;
  taskType: string | null;
  decisions?: {
    managed?: boolean;
    clientEnabled?: boolean;
    orchestrated?: boolean;
    taskEnabled?: boolean;
  };
  taskBehavior?: {
    requiresClientAction: boolean;
    autoCompletionTrigger: string;
  };
  whatsapp?: {
    menuCodes?: string[];
    menuOptions?: unknown[];
    overrides?: unknown[];
  };
  gestion?: Record<string, unknown>;
  execution?: Record<string, unknown>;
}

export interface ListingOrchestrationDoc {
  listingId: string;
  ownerId: string;
  orchestrationEnabled: boolean;
  capabilities: Record<string, ListingCapabilityDoc>;
  scheduledMessages: unknown[];
  version: number;
  source?: string;
}

export interface ListingOrchestrationEffective extends ListingOrchestrationDoc {
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

export function orchestrationFlagsFromDoc(
  doc: ListingOrchestrationEffective | ListingOrchestrationDoc,
): Record<string, unknown> {
  const flags: Record<string, unknown> = {
    orchestrationEnabled: doc.orchestrationEnabled !== false,
  };
  for (const def of CAPABILITY_REGISTRY) {
    if (!def.orchestrationFlag) continue;
    const cap = doc.capabilities?.[def.key];
    flags[def.orchestrationFlag] = cap?.decisions?.orchestrated !== false;
  }
  return flags;
}

export function mergeMenuOptionsFromDoc(
  doc: ListingOrchestrationEffective | ListingOrchestrationDoc,
): unknown[] {
  const byCode = new Map<string, unknown>();
  for (const def of CAPABILITY_REGISTRY) {
    const cap = doc.capabilities?.[def.key];
    for (const opt of cap?.whatsapp?.menuOptions ?? []) {
      if (!opt || typeof opt !== 'object') continue;
      const code = String((opt as { code?: string }).code ?? '');
      if (code) byCode.set(code, opt);
    }
  }
  if (byCode.size > 0) return ensureMenuOptionsComplete([...byCode.values()]);
  return ensureMenuOptionsComplete([]);
}

export function workflowsFromEffective(doc: ListingOrchestrationEffective): Workflow[] {
  const mapped = apiOrchestrationToDesign({
    workflows: doc.workflows ?? [],
  });
  return (mapped.workflows ?? []) as Workflow[];
}

export function workflowFromCapabilityExecution(
  taskType: string,
  execution: Record<string, unknown> | undefined,
): Workflow | null {
  if (!execution) return null;
  const mapped = apiOrchestrationToDesign({
    workflows: [{ type: taskType, ...execution }],
  });
  return ((mapped.workflows ?? []) as Workflow[])[0] ?? null;
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

function rowsFromListingDoc(
  rows: CapabilityRowState[],
  doc: ListingOrchestrationEffective | ListingOrchestrationDoc,
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

export async function loadListingOrchestrationMatrix(listingId: string): Promise<{
  rows: CapabilityRowState[];
  doc: ListingOrchestrationEffective;
  workflows: Workflow[];
  menuOptions: unknown[];
}> {
  const raw = await listingsService.getListingOrchestrationCompiled(listingId);
  const doc = unwrapData<ListingOrchestrationEffective>(raw);
  if (!doc?.listingId) {
    throw new Error('Config orchestration listing introuvable');
  }

  let menuOptions = mergeMenuOptionsFromDoc(doc);
  if (menuOptions.length === 0) {
    menuOptions = ensureMenuOptionsComplete([]);
  }

  const workflows = workflowsFromEffective(doc);
  const baseRows = buildMatrixFromSources({
    orchestrationFlags: orchestrationFlagsFromDoc(doc),
    menuOptions,
    workflows,
  });
  const rows = rowsFromListingDoc(baseRows, doc);

  return { rows, doc, workflows, menuOptions };
}

export async function saveListingOrchestrationRow(input: {
  listingId: string;
  row: CapabilityRowState;
  allWorkflows: Workflow[];
  allMenuOptions: unknown[];
  doc: ListingOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.row.key);
  if (!def) throw new Error('Capacité inconnue');

  const nextMenu = patchMenuOptionsForCapability(
    input.allMenuOptions,
    def,
    input.row.clientEnabled,
  );
  const nextWorkflows = patchWorkflowForCapability(
    input.allWorkflows,
    def,
    input.row,
  );
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

  await listingsService.putListingOrchestration(input.listingId, {
    capabilities: { [def.key]: capability },
  });
}

export async function saveListingGestion(input: {
  listingId: string;
  capabilityKey: string;
  gestion: Record<string, unknown>;
  doc: ListingOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  await listingsService.putListingOrchestration(input.listingId, {
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
}

export async function saveListingWhatsappOption(input: {
  listingId: string;
  capabilityKey: string;
  menuCodes: string[];
  menuOptions: unknown[];
  doc: ListingOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  await listingsService.putListingOrchestration(input.listingId, {
    capabilities: {
      [input.capabilityKey]: {
        key: input.capabilityKey,
        taskType: def.taskType,
        decisions: existing?.decisions,
        gestion: existing?.gestion,
        taskBehavior: existing?.taskBehavior,
        execution: existing?.execution,
        whatsapp: {
          menuCodes: input.menuCodes,
          menuOptions: input.menuOptions.filter(o => {
            const code = String((o as { code?: string }).code ?? '');
            return input.menuCodes.includes(code);
          }),
          overrides: existing?.whatsapp?.overrides ?? [],
        },
      },
    },
  });
}

export async function saveListingTaskBehavior(input: {
  listingId: string;
  capabilityKey: string;
  taskBehavior: { requiresClientAction: boolean; autoCompletionTrigger: string };
  doc: ListingOrchestrationDoc;
}): Promise<void> {
  const def = getCapabilityDefinition(input.capabilityKey);
  if (!def) throw new Error('Capacité inconnue');

  const existing = input.doc.capabilities?.[input.capabilityKey];
  await listingsService.putListingOrchestration(input.listingId, {
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
}

export async function saveListingExecutionWorkflow(input: {
  listingId: string;
  capabilityKey: string;
  taskType: string;
  workflow: Workflow;
  doc: ListingOrchestrationDoc;
}): Promise<void> {
  const existing = input.doc.capabilities?.[input.capabilityKey];
  const apiWf = designWorkflowToApi(input.workflow as unknown as Record<string, unknown>);
  if (!apiWf) throw new Error('Workflow invalide');

  const { type: _t, ...execution } = apiWf as Record<string, unknown>;

  await listingsService.putListingOrchestration(input.listingId, {
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
}
