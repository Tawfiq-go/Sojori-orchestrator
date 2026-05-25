import listingsService from '../../../services/listingsService';
import { ADMIN_TEMPLATE_REFERENCE_LISTING_ID } from '../../../constants/listingTemplateAdmin';

export const ORCH_FLAG_KEYS = [
  'orchestrationEnabled',
  'orchestration_choose_arrival',
  'orchestration_choose_departure',
  'orchestration_declare_arrival',
  'orchestration_declare_departure',
  'orchestration_registration',
  'orchestration_cleaning_free',
  'orchestration_cleaning_paid',
  'orchestration_cleaning_sojori',
  'orchestration_transport',
  'orchestration_grocery',
  'orchestration_custom',
  'orchestration_support',
  'orchestration_service_client',
] as const;

/** Réponse health srv-listing quand la route template n’existe pas encore en prod. */
export function isListingServiceHealthPayload(res: unknown): boolean {
  const r = res as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return false;
  const msg = String(r.message ?? '');
  if (msg === 'Service OK') return true;
  if (r.flags || (r.data && typeof r.data === 'object' && (r.data as Record<string, unknown>).flags)) {
    return false;
  }
  if (ORCH_FLAG_KEYS.some((k) => r[k] !== undefined)) return false;
  if (r.success === true && r.data) {
    const d = r.data as Record<string, unknown>;
    if (d.flags || ORCH_FLAG_KEYS.some((k) => d[k] !== undefined)) return false;
  }
  return false;
}

export function extractOrchestrationFlags(res: unknown): Record<string, boolean> | null {
  const root = res as Record<string, unknown> | null;
  if (!root || isListingServiceHealthPayload(root)) return null;

  const data = (root?.data as Record<string, unknown> | undefined) ?? root;
  if (!data || typeof data !== 'object') return null;

  if (data.flags && typeof data.flags === 'object') {
    return data.flags as Record<string, boolean>;
  }

  const out: Record<string, boolean> = {};
  let n = 0;
  for (const k of ORCH_FLAG_KEYS) {
    if (data[k] !== undefined) {
      out[k] = data[k] !== false;
      n += 1;
    }
  }
  return n > 0 ? out : null;
}

export function defaultOrchestrationFlags(): Record<string, boolean> {
  return ORCH_FLAG_KEYS.reduce(
    (acc, k) => {
      acc[k] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );
}

/** Template Admin : API global, sinon listing Harcay CFC (ce que tu vois dans l’onglet Accès). */
export async function loadAdminOrchestrationFlags(): Promise<{
  flags: Record<string, boolean>;
  source: string;
}> {
  try {
    const apiRes = await listingsService.getListingOrchestrationTemplate('global');
    const flags = extractOrchestrationFlags(apiRes);
    if (flags) return { flags, source: 'API template global' };
  } catch {
    /* route absente */
  }

  const doc = await listingsService.getListingDocument(ADMIN_TEMPLATE_REFERENCE_LISTING_ID);
  const fromListing = extractOrchestrationFlags(doc);
  if (fromListing) {
    return { flags: fromListing, source: 'listing Harcay CFC' };
  }

  return { flags: defaultOrchestrationFlags(), source: 'défaut (aucune source)' };
}

export async function fetchListingIdsForOwner(ownerId: string): Promise<string[]> {
  const res = await listingsService.getListings({
    page: 0,
    limit: 500,
    forListingsOverview: true,
  });
  return (res.data?.items ?? [])
    .filter((l) => l.ownerId && String(l.ownerId) === String(ownerId))
    .map((l) => l.id);
}

function patchErrorMessage(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { message?: string; error?: string } }; message?: string };
  const body = err.response?.data;
  const detail = body?.message || body?.error;
  if (err.response?.status && detail) return `${err.response.status}: ${detail}`;
  if (err.response?.status) return `HTTP ${err.response.status}`;
  return e instanceof Error ? e.message : String(e);
}

/** Applique les flags orchestration sur chaque annonce (PUT update-property, pas update). */
export async function applyOrchestrationFlagsToOwnerListings(
  ownerId: string,
  flags: Record<string, boolean>,
): Promise<{ ok: number; failed: number; errors: string[] }> {
  const ids = await fetchListingIdsForOwner(ownerId);
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await listingsService.updateListingProperty(id, flags);
      ok += 1;
    } catch (e: unknown) {
      failed += 1;
      errors.push(`${id.slice(-6)}: ${patchErrorMessage(e)}`);
    }
  }
  return { ok, failed, errors };
}

export async function saveOwnerOrchestrationFlags(
  ownerKey: string,
  flags: Record<string, boolean>,
): Promise<string> {
  if (ownerKey === 'global') {
    const putRes = await listingsService.putListingOrchestrationTemplate('global', flags);
    if (!isListingServiceHealthPayload(putRes)) return 'template global (API)';
    throw new Error(
      'Route listing-orchestration-template non déployée sur srv-listing. Déployer le service ou éditer via Harcay.',
    );
  }

  try {
    const putRes = await listingsService.putListingOrchestrationTemplate(ownerKey, flags);
    if (!isListingServiceHealthPayload(putRes)) return 'template owner (API)';
  } catch {
    /* fallback listings */
  }

  const { ok, failed, errors } = await applyOrchestrationFlagsToOwnerListings(ownerKey, flags);
  if (ok === 0 && failed === 0) {
    throw new Error('Ce PM n’a aucune annonce — orchestration non appliquée');
  }
  if (ok === 0) {
    throw new Error(errors[0] || `Échec sur ${failed} annonce(s)`);
  }
  if (failed > 0) {
    return `${ok} annonce(s) OK, ${failed} échec(s)`;
  }
  return `${ok} annonce(s) mises à jour`;
}

export async function loadOwnerOrchestrationFlags(ownerKey: string): Promise<{
  flags: Record<string, boolean>;
  source: string;
}> {
  if (ownerKey === 'global') return loadAdminOrchestrationFlags();

  try {
    const apiRes = await listingsService.getListingOrchestrationTemplate(ownerKey);
    const flags = extractOrchestrationFlags(apiRes);
    if (flags) return { flags, source: 'API template owner' };
  } catch {
    /* */
  }

  const ids = await fetchListingIdsForOwner(ownerKey);
  if (ids[0]) {
    const doc = await listingsService.getListingDocument(ids[0]);
    const flags = extractOrchestrationFlags(doc);
    if (flags) return { flags, source: `annonce ${ids[0].slice(-6)}` };
  }

  return { flags: defaultOrchestrationFlags(), source: 'défaut' };
}

/** Copie Accès Harcay → toutes les annonces du PM. */
export async function copyHarcayAccessToOwnerListings(ownerId: string): Promise<number> {
  const src = await listingsService.getListingAccessConfig(ADMIN_TEMPLATE_REFERENCE_LISTING_ID);
  const body = src.data;
  if (!body) return 0;

  const ids = await fetchListingIdsForOwner(ownerId);
  let n = 0;
  for (const id of ids) {
    try {
      await listingsService.updateListingAccess(id, body);
      n += 1;
    } catch {
      try {
        await listingsService.createListingAccess({ listingId: id, ...body });
        n += 1;
      } catch {
        /* skip */
      }
    }
  }
  return n;
}
