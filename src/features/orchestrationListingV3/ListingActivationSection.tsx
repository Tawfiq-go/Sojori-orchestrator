import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import OwnerCapabilitiesActivationPanel from './OwnerCapabilitiesActivationPanel';
import {
  displayActivationsFromServices,
  loadListingServiceActivation,
  overridesPatchFromDisplayState,
  saveListingServiceActivation,
  type ListingServiceActivationPatch,
  type ServiceActivationStatusEntry,
} from './listingCapabilityActivation';

type Props = {
  listingId: string;
  initialServices?: ServiceActivationStatusEntry[];
  onSaved?: (status: ServiceActivationStatusEntry[]) => void;
};

function patchIsEmpty(patch: ListingServiceActivationPatch): boolean {
  return !patch.overrides && !patch.unset?.length;
}

export default function ListingActivationSection({
  listingId,
  initialServices,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(!initialServices?.length);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceActivationStatusEntry[]>(initialServices ?? []);
  const [local, setLocal] = useState<Record<string, boolean>>(() =>
    displayActivationsFromServices(initialServices),
  );
  const [orchestrationEnabled, setOrchestrationEnabled] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<ListingServiceActivationPatch | null>(null);
  const servicesRef = useRef(services);
  const listingIdRef = useRef(listingId);

  useEffect(() => {
    listingIdRef.current = listingId;
  }, [listingId]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  const applyServices = useCallback((data: ServiceActivationStatusEntry[]) => {
    setServices(data);
    setLocal(displayActivationsFromServices(data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadListingServiceActivation(listingId);
      applyServices(data.services ?? []);
      if (data.orchestrationEnabled !== undefined) {
        setOrchestrationEnabled(data.orchestrationEnabled !== false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chargement activation impossible';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [applyServices, listingId]);

  useEffect(() => {
    if (initialServices?.length) {
      applyServices(initialServices);
      setLoading(false);
      void loadListingServiceActivation(listingId)
        .then(data => {
          if (data.orchestrationEnabled !== undefined) {
            setOrchestrationEnabled(data.orchestrationEnabled !== false);
          }
        })
        .catch(() => undefined);
      return;
    }
    void load();
  }, [applyServices, initialServices, load, listingId]);

  const flushSave = useCallback(
    async (patch: ListingServiceActivationPatch) => {
      if (patchIsEmpty(patch)) return;
      setSaving(true);
      try {
        const data = await saveListingServiceActivation(listingIdRef.current, patch);
        applyServices(data.services ?? []);
        onSaved?.(data.services ?? []);
        toast.success('Activation listing enregistrée');
      } catch (e: unknown) {
        setLocal(displayActivationsFromServices(servicesRef.current));
        toast.error(e instanceof Error ? e.message : 'Erreur enregistrement activation');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyServices, onSaved],
  );

  const scheduleAutoSave = useCallback(
    (display: Record<string, boolean>) => {
      const patch = overridesPatchFromDisplayState(servicesRef.current, display);
      if (patchIsEmpty(patch)) return;
      pendingSaveRef.current = patch;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (next) void flushSave(next);
      }, 400);
    },
    [flushSave],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const next = pendingSaveRef.current;
      if (next && !patchIsEmpty(next)) {
        void saveListingServiceActivation(listingIdRef.current, next)
          .then(data => onSaved?.(data.services ?? []))
          .catch(() => undefined);
      }
    },
    [onSaved],
  );

  const handleChange = useCallback(
    (display: Record<string, boolean>) => {
      setLocal(display);
      scheduleAutoSave(display);
    },
    [scheduleAutoSave],
  );

  const handleResetOverride = useCallback(
    (key: string) => {
      const nextDisplay = {
        ...local,
        [key]: servicesRef.current.find(s => s.serviceId === key)?.ownerEnabled === true,
      };
      setLocal(nextDisplay);
      void flushSave({ unset: [key] });
    },
    [flushSave, local],
  );

  const handleGlobalChange = useCallback(
    async (next: boolean) => {
      const prev = orchestrationEnabled;
      setOrchestrationEnabled(next);
      setSaving(true);
      try {
        await listingsService.putListingOrchestration(listingIdRef.current, {
          orchestrationEnabled: next,
        });
        toast.success(next ? 'Orchestration globale activée' : 'Orchestration globale coupée');
      } catch (e: unknown) {
        setOrchestrationEnabled(prev);
        toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
      } finally {
        setSaving(false);
      }
    },
    [orchestrationEnabled],
  );

  if (loading && !services.length) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <OwnerCapabilitiesActivationPanel
      variant="tab"
      ownerKey={listingId}
      rows={[]}
      orchestrationDoc={null}
      mode="listing"
      value={local}
      serviceActivationStatus={services}
      orchestrationEnabled={orchestrationEnabled}
      onOrchestrationEnabledChange={v => void handleGlobalChange(v)}
      onChange={handleChange}
      onListingSave={async display => {
        await flushSave(overridesPatchFromDisplayState(servicesRef.current, display));
      }}
      onResetListingOverride={handleResetOverride}
      autoSaveListing
      listingSaving={saving}
    />
  );
}
