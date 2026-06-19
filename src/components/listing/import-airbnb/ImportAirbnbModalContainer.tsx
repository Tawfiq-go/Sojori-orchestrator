/**
 * Pont API Sojori-orchestrator → ImportAirbnbModal (design Claude).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useRuImportProgress } from '../../../hooks/useRuImportProgress';
import {
  fetchRuOwnerProperties,
  importRuProperty,
  importRuPropertyBatch,
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
  const [importResults, setImportResults] = useState<ImportResultItem[] | null>(null);

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
      if (list.length === 0) {
        console.warn('[ImportAirbnb] list-owner-properties empty', { ownerId, res: res.data });
      }
      return list.map(
        (p: {
          ruPropertyId: number;
          name?: string;
          isActive?: boolean;
          isArchived?: boolean;
          alreadyImported?: boolean;
          importable?: boolean;
          sojoriListingId?: string;
        }) => ({
          ruPropertyId: String(p.ruPropertyId),
          name: p.name || `Annonce #${p.ruPropertyId}`,
          isActive: p.isActive !== false,
          isArchived: p.isArchived === true,
          alreadyImported: Boolean(p.alreadyImported),
          importable: p.importable === true,
          photoGradient: ((p.ruPropertyId % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        }),
      );
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

  const startImport = useCallback(
    async ({
      ownerId,
      ruPropertyIds,
      cityId,
    }: {
      ownerId: string;
      ruPropertyIds: string[];
      cityId: string;
    }) => {
      setImportResults(null);
      const ids = ruPropertyIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) throw new Error('Aucune annonce sélectionnée');

      try {
        if (ids.length === 1) {
          const { response } = await runTrackedImport({
            prefix: 'orchestrator-import',
            runImportRequest: (correlationId) =>
              importRuProperty({
                ownerId,
                ruPropertyId: ids[0],
                cityId,
                correlationId,
              }),
          });
          const ok = response.data?.success;
          const warn = warningsFromImport(response.data ?? {});
          const singleResults: ImportResultItem[] = [
            {
              ruPropertyId: String(ids[0]),
              propertyName: `Annonce #${ids[0]}`,
              success: Boolean(ok),
              listingId: response.data?.listingId,
              errorMessage: ok ? warn : warn || response.data?.error,
            },
          ];
          setImportResults(singleResults);
          if (ok) {
            if (warn) {
              toast.warn(`Listing créé · avertissement : ${warn}`);
            } else {
              toast.success('Annonce importée avec succès');
            }
          } else toast.error("Échec de l'import");
        } else {
          const { response } = await runTrackedImport({
            prefix: 'orchestrator-batch',
            runImportRequest: (correlationId) =>
              importRuPropertyBatch({
                ownerId,
                cityId,
                ruPropertyIds: ids,
                correlationId,
              }),
          });
          const data = response.data;
          const results: ImportResultItem[] = (data?.results ?? []).map(
            (r: {
              ruPropertyId: number;
              success: boolean;
              listingId?: string;
              errors?: string[];
            }) => ({
              ruPropertyId: String(r.ruPropertyId),
              propertyName: `Annonce #${r.ruPropertyId}`,
              success: r.success,
              listingId: r.listingId,
              errorMessage:
                r.errors?.length ? r.errors.join(' · ') : undefined,
            }),
          );
          setImportResults(results);
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
    [runTrackedImport],
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
      startImport={startImport}
      importProgress={importProgress}
      importResults={importResults}
      onImported={() => onImported?.()}
    />
  );
}
