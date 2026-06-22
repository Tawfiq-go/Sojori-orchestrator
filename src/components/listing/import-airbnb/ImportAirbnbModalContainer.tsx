/**
 * Pont API Sojori-orchestrator → ImportAirbnbModal (design Claude).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useRuImportProgress } from '../../../hooks/useRuImportProgress';
import {
  fetchRuOwnerProperties,
  fetchRuImportProgress,
  importRuProperty,
  importRuPropertyBatch,
  resolveRuImportCities,
} from '../../../services/channelsDashboardApi';
import { getOwners } from '../../../services/teamDashboardApi';
import { listingsService } from '../../../services/listingsService';
import ImportAirbnbModal from './ImportAirbnbModal';
import { adaptRuImportProgress } from './adaptRuImportProgress';
import type { ImportProgress, ImportResultItem, Owner, RuProperty, SojoriCity } from './_tokens';
import { STEPS_ORDER } from './_tokens';
import {
  isAdminDashboardRole,
  resolveRuImportOwnerAccountId,
} from '../../../utils/resolveRuImportOwnerAccountId';

const devAuthBypass = import.meta.env.VITE_DISABLE_AUTH === 'true';

function isAdminRole(role?: string): boolean {
  return isAdminDashboardRole(role);
}

function resolveCityLabel(c: { name?: string | { fr?: string; en?: string; FR?: string } }): string {
  const n = c.name;
  if (typeof n === 'string' && n.trim()) return n.trim();
  if (n && typeof n === 'object') {
    return n.fr || n.en || n.FR || '';
  }
  return '';
}

export interface ImportAirbnbModalContainerProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
  /** Villes déjà chargées sur la page listings (évite double fetch + liste vide) */
  initialCities?: Array<{ _id: string; name?: string | { fr?: string; en?: string; FR?: string } }>;
}

export function ImportAirbnbModalContainer({
  open,
  onClose,
  onImported,
  initialCities = [],
}: ImportAirbnbModalContainerProps) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin =
    isAdminRole(user?.role) || (devAuthBypass && authLoading && !user?.id);

  const [cities, setCities] = useState<SojoriCity[]>(() =>
    initialCities.map((c) => ({ _id: c._id, name: resolveCityLabel(c) || c._id })),
  );
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [ownerDefaultCity, setOwnerDefaultCity] = useState<SojoriCity | null>(null);
  const [importResults, setImportResults] = useState<ImportResultItem[] | null>(null);
  const propertiesMapRef = useRef<Map<string, { name: string; city?: string }>>(new Map());

  const { progressData, resetProgress, runTrackedImport, isPolling } = useRuImportProgress();

  const importProgress = useMemo((): ImportProgress | null => {
    const adapted = adaptRuImportProgress(progressData);
    if (adapted) return adapted;
    if (!isPolling) return null;
    return {
      currentBatchIndex: 0,
      totalBatch: 1,
      currentPropertyName: 'Initialisation…',
      steps: STEPS_ORDER.map((key) => ({ key, status: 'pending' as const })),
      completed: false,
      hasError: false,
    };
  }, [progressData, isPolling]);

  const authReady = !authLoading && Boolean(user?.id);
  const sessionOwnerAccountId = resolveRuImportOwnerAccountId(user);

  const sessionOwner: Owner | null = useMemo(() => {
    if (isAdmin || !authReady || !sessionOwnerAccountId) return null;
    return {
      _id: sessionOwnerAccountId,
      email: user?.email || '',
      firstName: user?.firstName,
      lastName: user?.lastName,
    };
  }, [
    isAdmin,
    authReady,
    sessionOwnerAccountId,
    user?.email,
    user?.firstName,
    user?.lastName,
  ]);

  useEffect(() => {
    if (!open) return;
    setImportResults(null);
    resetProgress();
    if (initialCities.length > 0) {
      setCities(initialCities.map((c) => ({ _id: c._id, name: resolveCityLabel(c) || c._id })));
    }
    setCitiesLoading(true);
    void listingsService
      .getCities({ allCities: true, limit: 2000 })
      .then((rows) => {
        if (rows.length > 0) {
          setCities(rows.map((c) => ({ _id: c._id, name: c.name || c._id })));
        }
      })
      .catch(() => {
        /* garde initialCities si fetch échoue */
      })
      .finally(() => setCitiesLoading(false));
  }, [open, resetProgress, initialCities]);

  const searchOwners = useCallback(async (query: string): Promise<Owner[]> => {
    const res = await getOwners({ limit: 50, page: 0, search_text: query.trim() });
    const rows = res?.data ?? (Array.isArray(res) ? res : []);
    return rows.map((o: { _id: string; email?: string; firstName?: string; lastName?: string }) => ({
      _id: o._id,
      email: o.email || '',
      firstName: o.firstName,
      lastName: o.lastName,
    }));
  }, []);

  const fetchOwnerProperties = useCallback(async (ownerId: string): Promise<RuProperty[]> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetchRuOwnerProperties(ownerId, {
        signal: controller.signal,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Impossible de charger les annonces Airbnb');
      }
      const list = res.data.properties ?? [];
      const defaultCity = res.data.ownerDefaultCity as
        | { cityId?: string; cityName?: string }
        | null
        | undefined;
      if (defaultCity?.cityId) {
        setOwnerDefaultCity({
          _id: String(defaultCity.cityId),
          name: defaultCity.cityName || String(defaultCity.cityId),
        });
      } else {
        setOwnerDefaultCity(null);
      }
      if (list.length === 0) {
        console.warn('[ImportAirbnb] list-owner-properties empty', { ownerId, res: res.data });
      }
      const mapped = list.map(
        (p: {
          ruPropertyId: number;
          name?: string;
          city?: string;
          isActive?: boolean;
          isArchived?: boolean;
          alreadyImported?: boolean;
          importable?: boolean;
          sojoriListingId?: string;
        }) => ({
          ruPropertyId: String(p.ruPropertyId),
          name: p.name || `Annonce #${p.ruPropertyId}`,
          city: p.city,
          isActive: p.isActive === true,
          isArchived: p.isArchived === true,
          alreadyImported: Boolean(p.alreadyImported),
          importable: p.importable === true,
          photoGradient: ((p.ruPropertyId % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        }),
      );
      propertiesMapRef.current = new Map(
        mapped.map((p) => [p.ruPropertyId, { name: p.name, city: p.city }]),
      );
      return mapped;
    } catch (e: unknown) {
      const ax = e as { code?: string; name?: string; message?: string };
      if (ax.code === 'ERR_CANCELED' || ax.name === 'CanceledError') {
        throw new Error('Délai dépassé — Rentals United met trop de temps à répondre. Réessayez.');
      }
      throw e;
    } finally {
      window.clearTimeout(timer);
    }
  }, [isAdmin]);

  const resolveCitiesForSelection = useCallback(
    async (ownerId: string, ruPropertyIds: string[]) => {
      const ids = ruPropertyIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      if (!ownerId || ids.length === 0) return null;
      const res = await resolveRuImportCities({ ownerId, ruPropertyIds: ids });
      const map = (res.data?.cities ?? {}) as Record<string, { cityId?: string; cityName?: string }>;
      const unique = new Map<string, SojoriCity>();
      for (const entry of Object.values(map)) {
        if (entry?.cityId) {
          unique.set(entry.cityId, {
            _id: String(entry.cityId),
            name: entry.cityName || String(entry.cityId),
          });
        }
      }
      if (unique.size === 1) return [...unique.values()][0];
      return null;
    },
    [],
  );

  const warningsFromImport = (payload: {
    success?: boolean;
    errors?: string[];
    error?: string;
  }): string | undefined => {
    const parts = [...(payload.errors ?? [])];
    if (payload.error) parts.push(payload.error);
    const unique = [...new Set(parts.map((s) => String(s).trim()).filter(Boolean))];
    return unique.length > 0 ? unique.join(' · ') : undefined;
  };

  const ruMeta = (ruPropertyId: string) =>
    propertiesMapRef.current.get(ruPropertyId) ?? { name: `Annonce #${ruPropertyId}` };

  const enrichImportResults = useCallback(
    async (items: ImportResultItem[], correlationId: string): Promise<ImportResultItem[]> => {
      let progressProps: Array<{ ruPropertyId?: number; listingName?: string; listingId?: string }> =
        [];
      try {
        const progRes = await fetchRuImportProgress(correlationId);
        progressProps = progRes.data?.data?.properties ?? [];
      } catch {
        /* progress optionnel */
      }
      const byRu = new Map(progressProps.map((p) => [String(p.ruPropertyId ?? ''), p]));

      return Promise.all(
        items.map(async (item) => {
          const meta = ruMeta(item.ruPropertyId);
          const prog = byRu.get(item.ruPropertyId);
          const propertyName =
            (prog?.listingName && prog.listingName.trim()) || meta.name || item.propertyName;
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
            city: item.city || meta.city,
          };
        }),
      );
    },
    [],
  );

  const startImport = useCallback(
    async ({
      ownerId,
      ruPropertyIds,
      cityId,
    }: {
      ownerId: string;
      ruPropertyIds: string[];
      cityId?: string;
    }) => {
      setImportResults(null);
      const ids = ruPropertyIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) throw new Error('Aucune annonce sélectionnée');

      try {
        if (ids.length === 1) {
          const ruId = String(ids[0]);
          const meta = ruMeta(ruId);
          const { response, correlationId } = await runTrackedImport({
            prefix: 'orchestrator-import',
            runImportRequest: (cid) =>
              importRuProperty({
                ownerId,
                ruPropertyId: ids[0],
                ...(cityId ? { cityId } : {}),
                correlationId: cid,
              }),
          });
          const ok = response.data?.success;
          const warn = warningsFromImport(response.data ?? {});
          const singleResults: ImportResultItem[] = [
            {
              ruPropertyId: ruId,
              propertyName: meta.name,
              city: meta.city,
              success: Boolean(ok),
              listingId: response.data?.listingId,
              errorMessage: ok ? warn : warn || response.data?.error,
            },
          ];
          setImportResults(await enrichImportResults(singleResults, correlationId));
          if (ok) {
            if (warn) {
              toast.warn(`Listing créé · avertissement : ${warn}`);
            } else {
              toast.success('Annonce importée avec succès');
            }
          } else toast.error("Échec de l'import");
        } else {
          const { response, correlationId } = await runTrackedImport({
            prefix: 'orchestrator-batch',
            runImportRequest: (cid) =>
              importRuPropertyBatch({
                ownerId,
                ...(cityId ? { cityId } : {}),
                ruPropertyIds: ids,
                correlationId: cid,
              }),
          });
          const data = response.data;
          const results: ImportResultItem[] = (data?.results ?? []).map(
            (r: {
              ruPropertyId: number;
              success: boolean;
              listingId?: string;
              errors?: string[];
            }) => {
              const ruId = String(r.ruPropertyId);
              const meta = ruMeta(ruId);
              return {
                ruPropertyId: ruId,
                propertyName: meta.name,
                city: meta.city,
                success: r.success,
                listingId: r.listingId,
                errorMessage: r.errors?.length ? r.errors.join(' · ') : undefined,
              };
            },
          );
          setImportResults(await enrichImportResults(results, correlationId));
          if (data?.succeeded > 0) {
            const withWarn = results.filter((r) => r.success && r.errorMessage);
            if (withWarn.length > 0) {
              toast.warn(
                `${data.succeeded} importée(s) · ${withWarn.length} avec avertissement(s) (sync RU…)`,
              );
            } else {
              toast.success(`${data.succeeded} annonce(s) importée(s)`);
            }
          }
          if (data?.failed > 0) toast.error(`${data.failed} annonce(s) en échec`);
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        toast.error(err?.response?.data?.error || err?.message || 'Import impossible');
        throw e;
      }
    },
    [runTrackedImport, enrichImportResults],
  );

  const handleClose = useCallback(() => {
    resetProgress();
    setImportResults(null);
    onClose();
  }, [onClose, resetProgress]);

  return (
    <ImportAirbnbModal
      open={open}
      onClose={handleClose}
      isAdmin={isAdmin}
      sessionOwner={sessionOwner}
      authReady={authReady}
      searchOwners={searchOwners}
      fetchOwnerProperties={fetchOwnerProperties}
      cities={cities}
      citiesLoading={citiesLoading}
      ownerDefaultCity={ownerDefaultCity}
      resolveCitiesForSelection={resolveCitiesForSelection}
      startImport={startImport}
      importProgress={importProgress}
      importResults={importResults}
      onImported={() => onImported?.()}
    />
  );
}
