import type { Workflow } from '../taskHub/staff-design/types';
import { defaultWorkflowAssignment } from '../taskHub/staff-design/fulltaskTaskTypes';
import {
  CAPABILITY_REGISTRY,
  defaultCapabilityRowState,
  type CapabilityDefinition,
} from './capabilityRegistry';
import type { CapabilityExecutionState, CapabilityRowState, CapabilityStatus } from './types';

function menuOptionEnabled(menuOptions: unknown[], code: string): boolean {
  if (!Array.isArray(menuOptions)) return true;
  const opt = menuOptions.find(o => String((o as { code?: string }).code) === code);
  if (!opt) return true;
  return (opt as { enabled?: boolean }).enabled !== false;
}

function executionFromWorkflow(wf: Workflow | undefined): CapabilityExecutionState {
  if (!wf) {
    return {
      clientReminders: false,
      staffAssignment: false,
      staffReminders: false,
      pmEscalation: false,
    };
  }
  return {
    clientReminders: (wf.relances ?? []).some(r => r.enabled),
    staffAssignment: Boolean(wf.assignment?.autoAssign ?? wf.assignment),
    staffReminders: (wf.staffReminders ?? []).some(r => r.enabled),
    pmEscalation: wf.escalationEnabled === true,
  };
}

function computeStatus(row: Omit<CapabilityRowState, 'status'>): CapabilityStatus {
  if (!row.managed) return 'not_managed';
  if (!row.clientEnabled && row.orchestrated === false && !row.taskEnabled) return 'incomplete';
  return 'configured';
}

function rowFromSources(
  def: CapabilityDefinition,
  flags: Record<string, unknown>,
  menuOptions: unknown[],
  workflows: Workflow[],
): CapabilityRowState {
  const base = defaultCapabilityRowState(def);
  const orchestrated =
    def.orchestrationFlag != null
      ? flags[def.orchestrationFlag] !== false
      : def.key === 'house_rules'
        ? true
        : false;

  let clientEnabled = base.clientEnabled;
  if (def.menuCodes.length > 0) {
    clientEnabled = def.menuCodes.every(code => menuOptionEnabled(menuOptions, code));
  }

  const wf = def.taskType
    ? workflows.find(w => w.taskTypeId === def.taskType || w._id === def.workflowKey?.replace('wf:', 'wf-'))
    : undefined;
  const wfByType = def.taskType
    ? workflows.find(w => w.taskTypeId === def.taskType)
    : undefined;
  const workflow = wfByType ?? wf;

  const taskEnabled = def.columns.task === 'na' ? false : workflow?.enabled !== false;

  const managed =
    def.orchestrationFlag != null
      ? orchestrated || clientEnabled || taskEnabled
      : clientEnabled || def.columns.managed === 'yes';

  const partial = {
    key: def.key,
    managed,
    clientEnabled: def.columns.client === 'na' ? false : clientEnabled,
    orchestrated: def.columns.orchestrated === 'na' ? false : orchestrated,
    taskEnabled,
    execution: def.columns.execution === 'na' ? base.execution : executionFromWorkflow(workflow),
    inherited: true,
  };

  return { ...partial, status: computeStatus(partial) };
}

export function buildMatrixFromSources(input: {
  orchestrationFlags: Record<string, unknown>;
  menuOptions: unknown[];
  workflows: Workflow[];
}): CapabilityRowState[] {
  return CAPABILITY_REGISTRY.map(def =>
    rowFromSources(def, input.orchestrationFlags, input.menuOptions, input.workflows),
  );
}

export function applyDependencyRules(row: CapabilityRowState, patch: Partial<CapabilityRowState>): CapabilityRowState {
  let next = { ...row, ...patch };

  if (patch.managed === false) {
    next = {
      ...next,
      managed: false,
      clientEnabled: false,
      orchestrated: false,
      taskEnabled: false,
      execution: {
        clientReminders: false,
        staffAssignment: false,
        staffReminders: false,
        pmEscalation: false,
      },
    };
  }

  if (patch.clientEnabled === true || patch.orchestrated === true || patch.taskEnabled === true) {
    next.managed = true;
  }

  if (!next.managed) {
    next.clientEnabled = false;
    next.orchestrated = false;
    next.taskEnabled = false;
  }

  return { ...next, status: computeStatus(next) };
}

export function patchMenuOptionsForCapability(
  menuOptions: unknown[],
  def: CapabilityDefinition,
  clientEnabled: boolean,
): unknown[] {
  const codes = new Set(def.menuCodes);
  if (!codes.size) return menuOptions;
  return (menuOptions ?? []).map(opt => {
    const code = String((opt as { code?: string }).code ?? '');
    if (!codes.has(code)) return opt;
    return { ...(opt as object), enabled: clientEnabled };
  });
}

export function patchWorkflowForCapability(
  workflows: Workflow[],
  def: CapabilityDefinition,
  row: CapabilityRowState,
): Workflow[] {
  if (!def.taskType) return workflows;
  return workflows.map(wf => {
    if (wf.taskTypeId !== def.taskType) return wf;
    const relances = (wf.relances ?? []).map(r => ({
      ...r,
      enabled: row.execution.clientReminders ? r.enabled !== false : false,
    }));
    if (row.execution.clientReminders && relances.length === 0) {
      // keep workflow as-is if no relances defined
    }
    let assignment = wf.assignment;
    if (!row.execution.staffAssignment) {
      assignment = null;
    } else if (!assignment) {
      assignment = defaultWorkflowAssignment(def.taskType);
    }
    return {
      ...wf,
      enabled: row.taskEnabled,
      relances,
      assignment,
      staffReminders: wf.staffReminders ?? [],
      escalationEnabled: row.execution.pmEscalation,
    };
  });
}

export function orchestrationFlagsPatchFromRow(
  def: CapabilityDefinition,
  row: CapabilityRowState,
): Record<string, boolean> {
  if (!def.orchestrationFlag) return {};
  return { [def.orchestrationFlag]: row.orchestrated };
}
