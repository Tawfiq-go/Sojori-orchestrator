import apiClient from '../../services/apiClient';
import { FULLTASK_ADMIN_BASE } from '../../config/microserviceBases';
import { isAxiosError } from 'axios';

/** Même base que les tâches : proxy Vite `/api/v1/admin/fulltask` en local. */
const BASE = FULLTASK_ADMIN_BASE;

type ApiList<T> = { success?: boolean; data?: T; error?: string; message?: string };

type OwnerScope = { ownerId?: string | null };

function withOwnerParams(
  params: Record<string, string | number | undefined> = {},
  scope?: OwnerScope,
): Record<string, string | number | undefined> {
  const out = { ...params };
  if (scope?.ownerId) out.ownerId = scope.ownerId;
  return out;
}

function throwApiError(e: unknown, fallback: string): never {
  if (isAxiosError(e)) {
    const body = e.response?.data as ApiList<unknown> | undefined;
    const msg = body?.error || body?.message;
    if (msg) throw new Error(String(msg));
    if (e.response?.status === 403) {
      throw new Error('Sélectionnez un propriétaire PM dans la barre du haut.');
    }
    if (e.response?.status === 404) {
      throw new Error(
        'Route Extra absente sur l’API (srv-admin / srv-fulltask pas à jour). En local : VITE_FULLTASK_URL=http://127.0.0.1:4015 + srv-fulltask, ou déployer admin+fulltask+channels.',
      );
    }
  }
  throw e instanceof Error ? e : new Error(fallback);
}

export type ExtraProduct = {
  productId: string;
  name: string;
  displayName: string;
  label: string;
  price: number;
  priceOverride?: number;
  effectivePrice: number;
  priceHT?: number;
  taxCode?: string;
  taxRatePct?: number;
  taxAmount?: number;
  currency: string;
  serviceId: string;
  serviceName: string;
  isMinibar: boolean;
  stockKind?: string;
  soldQty90d?: number;
  soldQty30d?: number;
  sortOrder?: number;
  defaultParQty?: number;
  isActive: boolean;
  missingFromPms: boolean;
  importedAt?: string;
  lastSeenAt?: string;
};

export type ExtraCatalogStats = {
  total: number;
  active: number;
  minibar: number;
  lastImportedAt: string | null;
};

export type ExtraImportResult = {
  upserted: number;
  markedMissing: number;
  categoriesCreated: number;
  minibar: number;
  total: number;
};

export type StockKind = {
  id: string;
  label: string;
  staffLetter?: string;
  isMinibar: boolean;
};

export const STOCK_KINDS_FALLBACK: StockKind[] = [
  { id: 'minibar', label: 'Mini-bar', staffLetter: 'N', isMinibar: true },
  { id: 'activity', label: 'Activités', isMinibar: false },
  { id: 'towel', label: 'Serviettes', isMinibar: false },
];

export type ExtraStockRoom = {
  id: string;
  name: string;
};

export type ApplyOwnerStockResult = {
  kind: string;
  listingId: string;
  rooms: number;
  products: number;
  written: number;
};

export async function listExtras(
  params: Record<string, string | number | undefined> = {},
  scope?: OwnerScope,
): Promise<ExtraProduct[]> {
  try {
    const { data } = await apiClient.get<ApiList<ExtraProduct[]>>(`${BASE}/extras`, {
      params: withOwnerParams(params, scope),
    });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return data?.data ?? [];
  } catch (e) {
    throwApiError(e, 'Chargement extras impossible');
  }
}

export async function fetchExtraStats(scope?: OwnerScope): Promise<ExtraCatalogStats> {
  try {
    const { data } = await apiClient.get<ApiList<ExtraCatalogStats>>(`${BASE}/extras/stats`, {
      params: withOwnerParams({}, scope),
    });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return (
      data?.data ?? {
        total: 0,
        active: 0,
        minibar: 0,
        lastImportedAt: null,
      }
    );
  } catch (e) {
    throwApiError(e, 'Stats extras impossibles');
  }
}

export async function importExtrasFromPms(scope?: OwnerScope): Promise<ExtraImportResult> {
  try {
    const { data } = await apiClient.post<ApiList<ExtraImportResult>>(
      `${BASE}/extras/import-from-pms`,
      {},
      { params: withOwnerParams({}, scope), timeout: 60_000 },
    );
    if (data?.success === false) throw new Error(data.error || data.message || 'Import failed');
    if (!data?.data) throw new Error('Import sans résultat');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Import Mews impossible');
  }
}

export async function patchExtra(
  productId: string,
  body: {
    isActive?: boolean;
    displayName?: string;
    priceOverride?: number | null;
    isMinibar?: boolean;
    defaultParQty?: number;
  },
  scope?: OwnerScope,
): Promise<ExtraProduct> {
  try {
    const { data } = await apiClient.patch<ApiList<ExtraProduct>>(
      `${BASE}/extras/${encodeURIComponent(productId)}`,
      body,
      { params: withOwnerParams({}, scope) },
    );
    if (data?.success === false) throw new Error(data.error || data.message || 'Patch failed');
    if (!data?.data) throw new Error('Patch sans résultat');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Mise à jour extra impossible');
  }
}

export async function fetchStockKinds(scope?: OwnerScope): Promise<StockKind[]> {
  try {
    const { data } = await apiClient.get<ApiList<StockKind[]>>(`${BASE}/extras/stock/kinds`, {
      params: withOwnerParams({}, scope),
    });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return data?.data?.length ? data.data : STOCK_KINDS_FALLBACK;
  } catch (e) {
    throwApiError(e, 'Types de stock impossibles à charger');
  }
}

export async function fetchStockRooms(
  listingId: string,
  scope?: OwnerScope,
): Promise<ExtraStockRoom[]> {
  try {
    const { data } = await apiClient.get<ApiList<ExtraStockRoom[]>>(`${BASE}/extras/stock/rooms`, {
      params: withOwnerParams({ listingId }, scope),
    });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return data?.data ?? [];
  } catch (e) {
    throwApiError(e, 'Villas impossibles à charger');
  }
}

/** Prix / TVA / ventes Mews sur le catalogue. Ne touche PAS les villas. */
export async function syncExtraCatalog(
  scope?: OwnerScope,
): Promise<{ updated: number }> {
  try {
    const { data } = await apiClient.post<ApiList<{ updated: number }>>(
      `${BASE}/extras/stock/sync-catalog`,
      {},
      { params: withOwnerParams({}, scope) },
    );
    if (data?.success === false) throw new Error(data.error || data.message || 'Sync failed');
    return data?.data ?? { updated: 0 };
  } catch (e) {
    throwApiError(e, 'Rafraîchissement catalogue impossible');
  }
}

/** Articles cochés × villas cochées. Jamais appelé au chargement. */
export async function applyOwnerStock(
  body: {
    listingId: string;
    kind: string;
    roomIds: string[];
    productIds: string[];
    catalogOrder?: 'smart' | 'sales' | 'alpha';
  },
  scope?: OwnerScope,
): Promise<ApplyOwnerStockResult> {
  try {
    const { data } = await apiClient.post<ApiList<ApplyOwnerStockResult>>(
      `${BASE}/extras/stock/apply`,
      body,
      { params: withOwnerParams({}, scope), timeout: 60_000 },
    );
    if (data?.success === false) throw new Error(data.error || data.message || 'Apply failed');
    if (!data?.data) throw new Error('Application sans résultat');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Application stock impossible');
  }
}
