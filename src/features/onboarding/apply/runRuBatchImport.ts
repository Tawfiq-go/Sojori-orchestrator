import type { ImportResultItem } from '../../../components/listing/import-airbnb/_tokens';
import { fetchRuOwnerProperties, importRuProperty } from '../../../services/channelsDashboardApi';
import { listingsService } from '../../../services/listingsService';
import { runTrackedRuImport } from '../../../utils/ruImportTracking';
import type { RuImportProgressData } from '../../../hooks/useRuImportProgress';

export type RuImportPropertyMeta = {
  name: string;
  city?: string;
  /** Ville Sojori résolue dans le wizard — pas de question au client. */
  cityId?: string;
};

function warningsFromImport(payload: {
  success?: boolean;
  errors?: string[];
  error?: string;
}): string | undefined {
  const parts = [...(payload.errors ?? [])];
  if (payload.error) parts.push(payload.error);
  const unique = [...new Set(parts.map((s) => String(s).trim()).filter(Boolean))];
  return unique.length > 0 ? unique.join(' · ') : undefined;
}

async function enrichOneResult(
  item: ImportResultItem,
  correlationId: string,
): Promise<ImportResultItem> {
  let progressProps: Array<{ ruPropertyId?: number; listingName?: string; listingId?: string }> = [];
  try {
    const { fetchRuImportProgress } = await import('../../../services/channelsDashboardApi');
    const progRes = await fetchRuImportProgress(correlationId);
    progressProps = progRes.data?.data?.properties ?? [];
  } catch {
    /* optional */
  }
  const prog = progressProps.find((p) => String(p.ruPropertyId ?? '') === item.ruPropertyId);
  const propertyName =
    (prog?.listingName && prog.listingName.trim()) || item.propertyName;
  let listingName: string | undefined;
  const listingId = item.listingId || prog?.listingId;
  if (listingId) {
    try {
      const doc = await listingsService.getListingDocument(listingId);
      const n = typeof doc?.name === 'string' ? doc.name.trim() : '';
      if (n) listingName = n;
    } catch {
      /* ignore */
    }
  }
  return {
    ...item,
    listingId,
    propertyName,
    listingName: listingName || propertyName,
  };
}

async function importOneRuProperty(params: {
  ownerId: string;
  ruPropertyId: number;
  meta: RuImportPropertyMeta;
  index: number;
  total: number;
  onProgress?: (data: RuImportProgressData | null) => void;
}): Promise<ImportResultItem> {
  const { ownerId, ruPropertyId, meta, index, total, onProgress } = params;
  const ruId = String(ruPropertyId);

  const { response, correlationId, progress } = await runTrackedRuImport({
    prefix: `onboarding-seq-${index}-of-${total}`,
    runImportRequest: (cid) =>
      importRuProperty({
        ownerId,
        ruPropertyId,
        ...(meta.cityId ? { cityId: meta.cityId } : {}),
        correlationId: cid,
      }),
    onProgress,
  });

  const ok =
    response?.data?.success ||
    response?.data?.alreadyImported ||
    progress?.properties?.some((p) => String(p.ruPropertyId) === ruId && p.status === 'success');
  const progRow = progress?.properties?.find((p) => String(p.ruPropertyId) === ruId);
  const warn = response?.data ? warningsFromImport(response.data) : undefined;
  const alreadyImported = Boolean(response?.data?.alreadyImported);

  const item: ImportResultItem = {
    ruPropertyId: ruId,
    propertyName: progRow?.listingName?.trim() || meta.name,
    city: meta.city,
    success: Boolean(ok),
    listingId: response?.data?.listingId || (progRow as { listingId?: string })?.listingId,
    errorMessage: ok
      ? alreadyImported
        ? 'Déjà importée — listing existant'
        : warn
      : warn || response?.data?.error || progRow?.errors?.join?.(' · '),
  };

  return enrichOneResult(item, correlationId);
}

/** RU déjà mappé côté Sojori → pas d'appel import HTTP. */
async function loadAlreadyImportedRuMap(
  ownerId: string,
): Promise<Map<string, { listingId: string; name?: string }>> {
  const map = new Map<string, { listingId: string; name?: string }>();
  try {
    const res = await fetchRuOwnerProperties(ownerId);
    const payload = res.data as {
      properties?: Array<{
        ruPropertyId?: number;
        name?: string;
        alreadyImported?: boolean;
        sojoriListingId?: string | null;
      }>;
    };
    for (const row of payload.properties ?? []) {
      if (!row.alreadyImported || !row.sojoriListingId) continue;
      map.set(String(row.ruPropertyId), {
        listingId: String(row.sojoriListingId),
        name: row.name,
      });
    }
  } catch {
    /* fallback : le backend refuse aussi les doublons */
  }
  return map;
}

async function resultForExistingRu(params: {
  ruPropertyId: number;
  meta: RuImportPropertyMeta;
  listingId: string;
  liveName?: string;
}): Promise<ImportResultItem> {
  const { ruPropertyId, meta, listingId, liveName } = params;
  let listingName = liveName?.trim() || meta.name;
  try {
    const doc = await listingsService.getListingDocument(listingId);
    const n = typeof doc?.name === 'string' ? doc.name.trim() : '';
    if (n) listingName = n;
  } catch {
    /* ignore */
  }
  return {
    ruPropertyId: String(ruPropertyId),
    propertyName: listingName,
    listingName,
    city: meta.city,
    success: true,
    listingId,
    errorMessage: 'Déjà importée — listing existant',
  };
}

/**
 * Import séquentiel RU — une annonce à la fois, ville par annonce depuis le wizard.
 * Règle : RU déjà en base → skip ; sinon import HTTP.
 */
export async function runRuBatchImport(params: {
  ownerId: string;
  ruPropertyIds: number[];
  /** @deprecated utiliser propertyMeta */
  cityId?: string;
  nameMap: Map<string, RuImportPropertyMeta | { name: string; city?: string }>;
  onProgress?: (data: RuImportProgressData | null) => void;
  onPropertyStart?: (info: {
    index: number;
    total: number;
    ruPropertyId: number;
    name: string;
  }) => void;
  onPropertyDone?: (info: { ruPropertyId: number; success: boolean }) => void;
}): Promise<ImportResultItem[]> {
  const { ownerId, ruPropertyIds, nameMap, onProgress, onPropertyStart, onPropertyDone } = params;
  const ids = ruPropertyIds.filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) throw new Error('Aucune annonce sélectionnée');

  const metaFor = (ruPropertyId: number): RuImportPropertyMeta => {
    const raw = nameMap.get(String(ruPropertyId));
    if (!raw) return { name: `Annonce #${ruPropertyId}` };
    return {
      name: raw.name,
      city: raw.city,
      cityId: 'cityId' in raw ? raw.cityId : params.cityId,
    };
  };

  const results: ImportResultItem[] = [];
  const total = ids.length;
  const alreadyImportedMap = await loadAlreadyImportedRuMap(ownerId);

  for (let i = 0; i < ids.length; i += 1) {
    const ruPropertyId = ids[i];
    const meta = metaFor(ruPropertyId);
    onPropertyStart?.({ index: i + 1, total, ruPropertyId, name: meta.name });

    const existing = alreadyImportedMap.get(String(ruPropertyId));
    if (existing?.listingId) {
      const item = await resultForExistingRu({
        ruPropertyId,
        meta,
        listingId: existing.listingId,
        liveName: existing.name,
      });
      results.push(item);
      onPropertyDone?.({ ruPropertyId, success: true });
      continue;
    }

    try {
      const item = await importOneRuProperty({
        ownerId,
        ruPropertyId,
        meta,
        index: i + 1,
        total,
        onProgress,
      });
      results.push(item);
      onPropertyDone?.({ ruPropertyId, success: item.success });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Import échoué';
      results.push({
        ruPropertyId: String(ruPropertyId),
        propertyName: meta.name,
        city: meta.city,
        success: false,
        errorMessage,
      });
      onPropertyDone?.({ ruPropertyId, success: false });
    }
  }

  const okCount = results.filter((r) => r.success).length;
  if (okCount === 0) {
    throw new Error(results[0]?.errorMessage || 'Aucune annonce importée');
  }

  return results;
}
