import { isAxiosError } from 'axios';
import listingsService from '../../services/listingsService';
import { CAPABILITY_REGISTRY } from '../serviceMatrix/capabilityRegistry';
import type { ListingOrchestrationEffective } from './listingOrchestrationApi';

export type ServiceActivationStatusEntry = {
  serviceId: string;
  label: string;
  ownerEnabled: boolean;
  listingOverride: boolean | null;
  listingEnabled: boolean | null;
  effectiveEnabled: boolean;
  source: 'owner' | 'listing';
  disabledReason: 'owner' | 'listing' | null;
};

export type ListingServiceActivationPatch = {
  overrides?: Record<string, boolean>;
  unset?: string[];
};

export type ListingServiceActivationResponse = {
  ownerId: string;
  listingId: string;
  services: ServiceActivationStatusEntry[];
};

function unwrapApiPayload<T>(res: unknown): T {
  if (!res || typeof res !== 'object') return res as T;
  const r = res as { data?: T; success?: boolean };
  if (r.data !== undefined && typeof r.data === 'object' && r.data !== null) {
    const inner = r.data as { data?: T; services?: unknown[]; serviceActivationStatus?: unknown[] };
    if (
      Array.isArray(inner.services) ||
      Array.isArray(inner.serviceActivationStatus) ||
      (inner as { listingId?: string }).listingId
    ) {
      return r.data as T;
    }
    if (inner.data !== undefined) return inner.data as T;
  }
  return res as T;
}

function rowForKey(
  services: ServiceActivationStatusEntry[] | undefined,
  key: string,
): ServiceActivationStatusEntry | undefined {
  return services?.find(s => s.serviceId === key);
}

/** Toggle display = effective enabled (inherited or override). */
export function displayActivationsFromServices(
  services: ServiceActivationStatusEntry[] | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of CAPABILITY_REGISTRY) {
    const row = rowForKey(services, def.key);
    out[def.key] = row?.effectiveEnabled === true;
  }
  return out;
}

/** @deprecated use displayActivationsFromServices */
export function listingActivationsFromServices(
  services: ServiceActivationStatusEntry[] | undefined,
): Record<string, boolean> {
  return displayActivationsFromServices(services);
}

export function ownerActivationsFromServiceStatus(
  services: ServiceActivationStatusEntry[] | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of CAPABILITY_REGISTRY) {
    out[def.key] = rowForKey(services, def.key)?.ownerEnabled === true;
  }
  return out;
}

export function listingActivationLabel(
  row: ServiceActivationStatusEntry | undefined,
): string {
  if (!row) return '';
  if (row.source === 'owner') {
    return row.ownerEnabled
      ? 'Hérité du propriétaire'
      : 'Désactivé par défaut au niveau propriétaire';
  }
  return row.effectiveEnabled
    ? 'Activé pour cette annonce'
    : 'Désactivé pour cette annonce';
}

export function overridesPatchFromDisplayState(
  services: ServiceActivationStatusEntry[],
  display: Record<string, boolean>,
): ListingServiceActivationPatch {
  const overrides: Record<string, boolean> = {};
  const unset: string[] = [];

  for (const def of CAPABILITY_REGISTRY) {
    const row = rowForKey(services, def.key);
    const owner = row?.ownerEnabled === true;
    const next = display[def.key] === true;
    const hadOverride = row?.source === 'listing';

    if (next === owner) {
      if (hadOverride) unset.push(def.key);
    } else {
      overrides[def.key] = next;
    }
  }

  return {
    ...(Object.keys(overrides).length ? { overrides } : {}),
    ...(unset.length ? { unset } : {}),
  };
}

export function overridePatchForToggle(
  services: ServiceActivationStatusEntry[],
  key: string,
  checked: boolean,
): ListingServiceActivationPatch {
  const row = rowForKey(services, key);
  const owner = row?.ownerEnabled === true;
  if (checked === owner) {
    return row?.source === 'listing' ? { unset: [key] } : {};
  }
  return { overrides: { [key]: checked } };
}

function isRouteNotFoundError(e: unknown): boolean {
  if (!isAxiosError(e) || e.response?.status !== 404) return false;
  const body = e.response.data as { errors?: { message?: string }[]; error?: string };
  return (
    body?.errors?.some(err => err.message?.includes('Not Found')) === true ||
    body?.error?.includes('Not Found') === true
  );
}

/** Pre-deploy fallback when orchestration-effective has no serviceActivationStatus yet. */
export function activationStatusFromLegacyEffective(
  doc: ListingOrchestrationEffective,
  _listingId: string,
): ServiceActivationStatusEntry[] {
  return CAPABILITY_REGISTRY.map(def => {
    const managed = doc.capabilities?.[def.key]?.decisions?.managed === true;
    return {
      serviceId: def.key,
      label: def.label,
      ownerEnabled: managed,
      listingOverride: null,
      listingEnabled: null,
      effectiveEnabled: managed,
      source: 'owner' as const,
      disabledReason: managed ? null : ('owner' as const),
    };
  });
}

export function activationStatusFromEffectiveDoc(
  doc: ListingOrchestrationEffective,
  listingId: string,
): ServiceActivationStatusEntry[] | null {
  if (doc.serviceActivationStatus?.length) {
    return doc.serviceActivationStatus as ServiceActivationStatusEntry[];
  }
  if (doc.capabilities && Object.keys(doc.capabilities).length > 0) {
    return activationStatusFromLegacyEffective(doc, listingId);
  }
  return null;
}

async function loadFromOrchestrationEffective(
  listingId: string,
): Promise<ListingServiceActivationResponse | null> {
  const compiled = await listingsService.getListingOrchestrationCompiled(listingId);
  const doc = unwrapApiPayload<ListingOrchestrationEffective>(compiled);
  if (!doc?.listingId && !doc?.ownerId) return null;
  const services = activationStatusFromEffectiveDoc(doc, listingId);
  if (!services?.length) return null;
  return {
    ownerId: String(doc.ownerId ?? ''),
    listingId,
    services,
  };
}

function parseServiceActivationResponse(res: unknown): ListingServiceActivationResponse {
  const body = unwrapApiPayload<{ data?: ListingServiceActivationResponse } & ListingServiceActivationResponse>(
    res,
  );
  if (Array.isArray((body as ListingServiceActivationResponse).services)) {
    return body as ListingServiceActivationResponse;
  }
  if ((body as { data?: ListingServiceActivationResponse }).data?.services) {
    return (body as { data: ListingServiceActivationResponse }).data;
  }
  const effective = (body as { effective?: ListingOrchestrationEffective }).effective;
  if (effective) {
    const services = activationStatusFromEffectiveDoc(effective, effective.listingId);
    if (services?.length) {
      return {
        ownerId: String(effective.ownerId ?? ''),
        listingId: effective.listingId,
        services,
      };
    }
  }
  throw new Error('Réponse activation listing invalide');
}

/**
 * GET activation — uses deployed orchestration-effective (not service-activation).
 * Dedicated GET …/service-activation is only used when explicitly requested after deploy.
 */
export async function loadListingServiceActivation(
  listingId: string,
): Promise<ListingServiceActivationResponse> {
  const fromEffective = await loadFromOrchestrationEffective(listingId);
  if (fromEffective) return fromEffective;

  try {
    const res = await listingsService.getListingServiceActivation(listingId);
    return parseServiceActivationResponse(res);
  } catch (dedicatedErr: unknown) {
    if (isRouteNotFoundError(dedicatedErr)) {
      throw new Error(
        'Activation listing indisponible : orchestration-effective vide et route service-activation absente sur dev.sojori.com. Redéployez srv-listing (≥ main-cf42ed56f).',
      );
    }
    throw dedicatedErr;
  }
}

/** @deprecated use displayActivationsFromServices */
export function activationsFromServiceStatus(
  services: ServiceActivationStatusEntry[],
): Record<string, boolean> {
  return displayActivationsFromServices(services);
}

export async function saveListingServiceActivation(
  listingId: string,
  patch: ListingServiceActivationPatch,
): Promise<ListingServiceActivationResponse> {
  try {
    const res = await listingsService.putListingServiceActivation(listingId, patch);
    return parseServiceActivationResponse(res);
  } catch (dedicatedErr: unknown) {
    if (!isRouteNotFoundError(dedicatedErr)) throw dedicatedErr;
  }

  try {
    const res = await listingsService.putListingOrchestrationServiceActivation(listingId, patch);
    return parseServiceActivationResponse(res);
  } catch (orchestrationErr: unknown) {
    if (isRouteNotFoundError(orchestrationErr)) {
      throw new Error(
        'Enregistrement impossible : routes service-activation et PUT orchestration/serviceActivation absentes sur dev.sojori.com. Redéployez srv-listing (≥ main-cf42ed56f).',
      );
    }
    throw orchestrationErr;
  }
}

export function isEffectivelyActivated(
  serviceId: string,
  status: ServiceActivationStatusEntry[] | undefined,
): boolean {
  if (!status?.length) return false;
  const row = status.find(s => s.serviceId === serviceId);
  if (!row) return true;
  return row.effectiveEnabled === true;
}

export function countEffectiveActiveServices(
  status: ServiceActivationStatusEntry[] | undefined,
): number {
  if (!status?.length) return 0;
  return status.filter(s => s.effectiveEnabled === true).length;
}

export function hasAnyEffectiveActiveService(
  status: ServiceActivationStatusEntry[] | undefined,
): boolean {
  if (!status?.length) return false;
  return status.some(s => s.effectiveEnabled === true);
}

export function mergeActivationPatches(
  ...patches: ListingServiceActivationPatch[]
): ListingServiceActivationPatch {
  const overrides: Record<string, boolean> = {};
  const unset = new Set<string>();
  for (const patch of patches) {
    patch.unset?.forEach(k => {
      unset.add(k);
      delete overrides[k];
    });
    if (patch.overrides) {
      for (const [k, v] of Object.entries(patch.overrides)) {
        unset.delete(k);
        overrides[k] = v;
      }
    }
  }
  return {
    ...(Object.keys(overrides).length ? { overrides } : {}),
    ...(unset.size ? { unset: [...unset] } : {}),
  };
}
