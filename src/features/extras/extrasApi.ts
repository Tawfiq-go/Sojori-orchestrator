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
  currency: string;
  serviceId: string;
  serviceName: string;
  isMinibar: boolean;
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
