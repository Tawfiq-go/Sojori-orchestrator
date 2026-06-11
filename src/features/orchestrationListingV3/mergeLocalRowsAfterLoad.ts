import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import type { CapabilityRowState } from '../serviceMatrix/types';

/** Conserve les toggles locaux (non enregistrés) après un reload silencieux. */
export function mergeLocalRowsAfterLoad(
  prev: CapabilityRowState[],
  serverRows: CapabilityRowState[],
  discardLocalKey?: string,
): CapabilityRowState[] {
  const localByKey = new Map(
    prev
      .filter(r => !r.inherited && r.key !== discardLocalKey)
      .map(r => [r.key, r]),
  );
  if (localByKey.size === 0) return serverRows;

  return serverRows.map(serverRow => {
    const local = localByKey.get(serverRow.key);
    if (!local) return serverRow;
    return applyDependencyRules(serverRow, {
      managed: local.managed,
      clientEnabled: local.clientEnabled,
      orchestrated: local.orchestrated,
      taskEnabled: local.taskEnabled,
      execution: { ...serverRow.execution, ...local.execution },
      inherited: false,
    });
  });
}

export function patchOrchestrationDocGestion<T extends { capabilities?: Record<string, { gestion?: Record<string, unknown> }> }>(
  doc: T,
  capabilityKey: string,
  gestion: Record<string, unknown>,
): T {
  const existing = doc.capabilities?.[capabilityKey]?.gestion ?? {};
  return {
    ...doc,
    capabilities: {
      ...doc.capabilities,
      [capabilityKey]: {
        ...doc.capabilities?.[capabilityKey],
        gestion: { ...existing, ...gestion },
      },
    },
  };
}

export function patchOrchestrationDocExecution<
  T extends { capabilities?: Record<string, { execution?: Record<string, unknown> }> },
>(doc: T, capabilityKey: string, execution: Record<string, unknown>): T {
  return {
    ...doc,
    capabilities: {
      ...doc.capabilities,
      [capabilityKey]: {
        ...doc.capabilities?.[capabilityKey],
        execution,
      },
    },
  };
}

export function patchOrchestrationDocWhatsapp<
  T extends {
    capabilities?: Record<
      string,
      {
        whatsapp?: {
          menuCodes?: string[];
          menuOptions?: unknown[];
          overrides?: unknown[];
        };
      }
    >;
  },
>(doc: T, capabilityKey: string, menuOptions: unknown[], menuCodes: string[]): T {
  const cap = doc.capabilities?.[capabilityKey];
  const filtered = menuOptions.filter(o => {
    const code = String((o as { code?: string }).code ?? '');
    return menuCodes.includes(code);
  });
  return {
    ...doc,
    capabilities: {
      ...doc.capabilities,
      [capabilityKey]: {
        ...cap,
        whatsapp: {
          menuCodes,
          menuOptions: filtered,
          overrides: cap?.whatsapp?.overrides ?? [],
        },
      },
    },
  };
}
