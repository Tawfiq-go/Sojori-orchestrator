import listingsService from '../../services/listingsService';
import type { ListingCapabilityDoc } from './listingOrchestrationApi';

function unwrapData<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { data?: T };
  if (r.data !== undefined) return r.data;
  return res as T;
}

function hasItems(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

const CONCIERGE_KEYS = ['transport', 'groceries', 'concierge'] as const;

export async function enrichOwnerGestionFromTemplateDoc(
  ownerKey: string,
  capabilities: Record<string, ListingCapabilityDoc>,
): Promise<Record<string, ListingCapabilityDoc>> {
  const tpl = unwrapData<{ concierge?: Record<string, unknown> }>(
    await listingsService.getListingOwnerConfigTemplate(ownerKey),
  );
  const concierge = tpl?.concierge ?? {};
  const shell = {
    transportServices: concierge.transportServices ?? [],
    groceryServices: concierge.groceryServices ?? [],
    customServices: concierge.customServices ?? [],
  };
  const shellHas =
    hasItems(shell.transportServices) ||
    hasItems(shell.groceryServices) ||
    hasItems(shell.customServices);
  if (!shellHas) return capabilities;

  const out = { ...capabilities };
  for (const key of CONCIERGE_KEYS) {
    const cap = out[key];
    if (!cap) continue;
    const g = { ...(cap.gestion ?? {}) } as Record<string, unknown>;
    let changed = false;
    if (!hasItems(g.transportServices) && hasItems(shell.transportServices)) {
      g.transportServices = shell.transportServices;
      changed = true;
    }
    if (!hasItems(g.groceryServices) && hasItems(shell.groceryServices)) {
      g.groceryServices = shell.groceryServices;
      changed = true;
    }
    if (!hasItems(g.customServices) && hasItems(shell.customServices)) {
      g.customServices = shell.customServices;
      changed = true;
    }
    if (changed) {
      out[key] = { ...cap, gestion: g };
    }
  }
  return out;
}
