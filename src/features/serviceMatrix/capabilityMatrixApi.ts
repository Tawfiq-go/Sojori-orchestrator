import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import { apiOrchestrationToDesign, designOrchestrationToApi } from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import { ensureMenuOptionsComplete } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import type { Workflow } from '../taskHub/staff-design/types';
import { getCapabilityDefinition } from './capabilityRegistry';
import {
  buildMatrixFromSources,
  orchestrationFlagsPatchFromRow,
  patchMenuOptionsForCapability,
  patchWorkflowForCapability,
} from './matrixStateUtils';
import type { CapabilityRowState, MatrixScopeMode, UnifiedSaveResult } from './types';
import {
  loadListingOrchestrationMatrix,
  saveListingOrchestrationRow,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';

export async function loadCapabilityMatrix(input: {
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
}): Promise<CapabilityRowState[]> {
  const { scope, ownerKey, listingId } = input;

  if (scope === 'listing' && listingId) {
    const { rows } = await loadListingOrchestrationMatrix(listingId);
    return rows;
  }

  let orchestrationFlags: Record<string, unknown> = {};
  let menuOptions: unknown[] = [];

  const [orchTpl, ownerTpl] = await Promise.all([
    listingsService.getListingOrchestrationTemplate(ownerKey),
    listingsService.getListingOwnerConfigTemplate(ownerKey === 'global' ? 'global' : ownerKey),
  ]);
  const orchPayload = (orchTpl as { data?: { flags?: Record<string, unknown> } })?.data ?? orchTpl;
  orchestrationFlags =
    (orchPayload as { flags?: Record<string, unknown> }).flags ??
    (orchPayload as Record<string, unknown>) ??
    {};
  const ownerData = (ownerTpl as { data?: { chatbot?: { menuOptions?: unknown[] } } })?.data ?? ownerTpl;
  menuOptions = ensureMenuOptionsComplete(
    (ownerData as { chatbot?: { menuOptions?: unknown[] } })?.chatbot?.menuOptions ?? [],
  );

  let workflows: Workflow[] = [];
  try {
    const raw = await fulltaskApi.getOrchestrationConfig(ownerKey === 'global' ? 'global' : ownerKey);
    const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
    if (doc) {
      workflows = (apiOrchestrationToDesign(doc).workflows ?? []) as Workflow[];
    }
  } catch {
    workflows = [];
  }

  return buildMatrixFromSources({ orchestrationFlags, menuOptions, workflows });
}

export async function saveCapabilityRow(input: {
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
  row: CapabilityRowState;
  allMenuOptions: unknown[];
  allWorkflows: Workflow[];
  listingOrchestrationDoc?: ListingOrchestrationDoc;
}): Promise<UnifiedSaveResult> {
  const def = getCapabilityDefinition(input.row.key);
  if (!def) {
    return { listingOk: false, fulltaskOk: false, error: 'Capacité inconnue' };
  }

  if (input.scope === 'listing' && input.listingId && !input.listingOrchestrationDoc) {
    return {
      listingOk: false,
      fulltaskOk: false,
      error: 'Listing sans doc orchestration — utiliser Orchestration',
    };
  }

  if (input.scope === 'listing' && input.listingId && input.listingOrchestrationDoc) {
    try {
      await saveListingOrchestrationRow({
        listingId: input.listingId,
        row: input.row,
        allMenuOptions: input.allMenuOptions,
        allWorkflows: input.allWorkflows,
        doc: input.listingOrchestrationDoc,
      });
      return { listingOk: true, fulltaskOk: true };
    } catch (e: unknown) {
      return {
        listingOk: false,
        fulltaskOk: false,
        error: e instanceof Error ? e.message : 'Erreur listing orchestration',
      };
    }
  }

  let listingOk = true;
  let fulltaskOk = true;
  let error: string | undefined;

  const flagsPatch = orchestrationFlagsPatchFromRow(def, input.row);
  const nextMenu = patchMenuOptionsForCapability(input.allMenuOptions, def, input.row.clientEnabled);
  const nextWorkflows = patchWorkflowForCapability(input.allWorkflows, def, input.row);

  try {
    if (Object.keys(flagsPatch).length) {
      await listingsService.putListingOrchestrationTemplate(input.ownerKey, flagsPatch);
    }
    await listingsService.putListingOwnerConfigTemplateSection(input.ownerKey, 'chatbot', {
      menuOptions: nextMenu,
    });
  } catch (e: unknown) {
    listingOk = false;
    error = e instanceof Error ? e.message : 'Erreur listing';
  }

  if (def.taskType && def.columns.execution === 'yes') {
    try {
      const ownerId = input.ownerKey === 'global' ? 'global' : input.ownerKey;
      const raw = await fulltaskApi.getOrchestrationConfig(ownerId);
      const doc = unwrapFulltaskData<Record<string, unknown>>(raw) ?? {};
      const mapped = apiOrchestrationToDesign(doc);
      const mergedWorkflows = (mapped.workflows as Workflow[]).map(wf => {
        const patched = nextWorkflows.find(p => p.taskTypeId === wf.taskTypeId);
        return patched ?? wf;
      });
      const body = designOrchestrationToApi({
        ...mapped,
        workflows: mergedWorkflows,
      });
      await fulltaskApi.upsertOrchestrationConfig(ownerId, body as Record<string, unknown>);
    } catch (e: unknown) {
      fulltaskOk = false;
      error = error ?? (e instanceof Error ? e.message : 'Erreur fulltask');
    }
  }

  return { listingOk, fulltaskOk, error };
}
