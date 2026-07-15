import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  capabilityShortHint,
  type CapabilityGroupId,
} from '../serviceMatrix/capabilityRegistry';
import type { CapabilityRowState } from '../serviceMatrix/types';
import { V3 } from './theme';
import {
  activationsFromRows,
  defaultActivationsAllOff,
  saveOwnerCapabilityActivations,
  saveOwnerOrchestrationEnabled,
} from './ownerCapabilityActivation';
import {
  countEffectiveActiveServices,
  displayActivationsFromServices,
  listingActivationLabel,
  type ServiceActivationStatusEntry,
} from './listingCapabilityActivation';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';
import OrchestrationGlobalSwitch from './OrchestrationGlobalSwitch';
import {
  shouldAutoSyncListingsAfterOwnerSave,
  syncAllListingsFromOwnerOrchestration,
} from './ownerOrchestrationListingSync';
import listingsService from '../../services/listingsService';

const GROUP_EMOJI: Record<CapabilityGroupId, string> = {
  cleaning: '🧹',
  journey: '✈️',
  communication: '💬',
  concierge: '🛎',
  info: 'ℹ️',
};

type Props = {
  ownerKey: string;
  rows: CapabilityRowState[];
  orchestrationDoc: OwnerOrchestrationDoc | null;
  /** Création owner : pas de save auto, state contrôlé par le parent. */
  compact?: boolean;
  /** Contenu de l’onglet dédié (sans carte englobante). */
  variant?: 'card' | 'tab';
  value?: Record<string, boolean>;
  onChange?: (next: Record<string, boolean>) => void;
  onSaved?: (activations: Record<string, boolean>) => void;
  disabled?: boolean;
  /** Listing-level activation — can override owner default per listing. */
  mode?: 'owner' | 'listing';
  serviceActivationStatus?: ServiceActivationStatusEntry[];
  onListingSave?: (activations: Record<string, boolean>) => Promise<void>;
  onResetListingOverride?: (key: string) => void;
  /** Listing tab: auto-save on toggle (debounced by parent). */
  autoSaveListing?: boolean;
  /** Parent-driven save indicator (listing auto-save). */
  listingSaving?: boolean;
  /** Après save owner : propager le modèle PM vers toutes les annonces. */
  autoSyncListings?: boolean;
  isAdminTemplate?: boolean;
  /** Coupe-circuit orchestrationEnabled (indépendant des services). */
  orchestrationEnabled?: boolean;
  onOrchestrationEnabledChange?: (next: boolean) => void;
};

export default function OwnerCapabilitiesActivationPanel({
  ownerKey,
  rows,
  orchestrationDoc,
  compact = false,
  variant = 'card',
  value,
  onChange,
  onSaved,
  disabled = false,
  mode = 'owner',
  onListingSave,
  serviceActivationStatus,
  onResetListingOverride,
  autoSaveListing = false,
  listingSaving = false,
  autoSyncListings = false,
  isAdminTemplate = false,
  orchestrationEnabled: orchestrationEnabledProp,
  onOrchestrationEnabledChange,
}: Props) {
  const statusByKey = useMemo(
    () => Object.fromEntries((serviceActivationStatus ?? []).map(s => [s.serviceId, s])),
    [serviceActivationStatus],
  );
  const isListingMode = mode === 'listing';
  const isTab = variant === 'tab';
  const controlled = value != null && onChange != null;
  const [local, setLocal] = useState<Record<string, boolean>>(() =>
    controlled
      ? isListingMode
        ? displayActivationsFromServices(serviceActivationStatus)
        : (value ?? defaultActivationsAllOff())
      : activationsFromRows(rows),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [globalOn, setGlobalOn] = useState(() =>
    orchestrationEnabledProp !== undefined
      ? orchestrationEnabledProp
      : orchestrationDoc?.orchestrationEnabled !== false,
  );
  const [savingGlobal, setSavingGlobal] = useState(false);

  useEffect(() => {
    if (orchestrationEnabledProp !== undefined) {
      setGlobalOn(orchestrationEnabledProp);
      return;
    }
    if (orchestrationDoc) {
      setGlobalOn(orchestrationDoc.orchestrationEnabled !== false);
    }
  }, [orchestrationEnabledProp, orchestrationDoc]);

  useEffect(() => {
    if (controlled && isListingMode && autoSaveListing) {
      setLocal(displayActivationsFromServices(serviceActivationStatus ?? []));
      return;
    }
    if (controlled) {
      setLocal(
        isListingMode
          ? displayActivationsFromServices(serviceActivationStatus ?? [])
          : (value ?? defaultActivationsAllOff()),
      );
      if (!autoSaveListing) setDirty(false);
      return;
    }
    setLocal(activationsFromRows(rows));
    setDirty(false);
  }, [controlled, rows, value, isListingMode, serviceActivationStatus, autoSaveListing]);

  const savingNow = saving || listingSaving || savingGlobal;
  const globalOff = globalOn === false;
  const switchesDisabled = disabled || savingNow || globalOff;

  const setActivation = useCallback(
    (key: string, active: boolean) => {
      setLocal(prev => {
        const next = { ...prev, [key]: active };
        onChange?.(next);
        return next;
      });
      if (autoSaveListing && onChange) {
        setDirty(false);
      } else if (!controlled || isListingMode) {
        setDirty(true);
      }
    },
    [controlled, isListingMode, onChange, autoSaveListing],
  );

  const setGroup = useCallback(
    (groupId: CapabilityGroupId, active: boolean) => {
      setLocal(prev => {
        const next = { ...prev };
        for (const def of CAPABILITY_REGISTRY) {
          if (def.group === groupId && def.key !== 'menu_navigation') {
            next[def.key] = active;
          }
        }
        onChange?.(next);
        return next;
      });
      if (autoSaveListing) {
        setDirty(false);
      } else if (!controlled || isListingMode) {
        setDirty(true);
      }
    },
    [controlled, isListingMode, onChange, autoSaveListing],
  );

  const groups = useMemo(
    () =>
      (Object.entries(CAPABILITY_GROUPS) as [CapabilityGroupId, string][]).map(([id, label]) => ({
        id,
        label,
        items: CAPABILITY_REGISTRY.filter(c => c.group === id && c.key !== 'menu_navigation'),
      })),
    [],
  );

  const menuNav = CAPABILITY_REGISTRY.find(c => c.key === 'menu_navigation');

  const activeCount = isListingMode
    ? countEffectiveActiveServices(serviceActivationStatus)
    : Object.entries(local).filter(([key, on]) => {
        if (!on) return false;
        return true;
      }).length;

  const persist = async () => {
    if (isListingMode) {
      if (!onListingSave) return;
      setSaving(true);
      try {
        await onListingSave(local);
        toast.success('Activation listing enregistrée');
        setDirty(false);
        onSaved?.(local);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!ownerKey || ownerKey === 'global') return;
    setSaving(true);
    try {
      await saveOwnerCapabilityActivations(ownerKey, local, orchestrationDoc, {
        orchestrationEnabled: globalOn,
      });
      let syncCount = 0;
      if (
        autoSyncListings &&
        shouldAutoSyncListingsAfterOwnerSave(ownerKey, isAdminTemplate)
      ) {
        try {
          syncCount = await syncAllListingsFromOwnerOrchestration(ownerKey);
        } catch (syncErr: unknown) {
          toast.warn(
            syncErr instanceof Error
              ? `Activation PM OK — sync annonces : ${syncErr.message}`
              : 'Activation PM OK — sync annonces échouée',
          );
        }
      }
      toast.success(
        syncCount > 0
          ? `Activation enregistrée · ${syncCount} annonce(s) synchronisée(s)`
          : 'Activation services enregistrée',
      );
      setDirty(false);
      onSaved?.(local);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
      if (/network error|connection refused|failed to fetch/i.test(msg)) {
        toast.error(
          'API listing inaccessible — vérifiez que le serveur Vite tourne (127.0.0.1:4174) ou relancez pnpm dev.',
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const persistGlobal = async (next: boolean) => {
    const prev = globalOn;
    setGlobalOn(next);
    if (onOrchestrationEnabledChange) {
      onOrchestrationEnabledChange(next);
      return;
    }
    if (isListingMode) {
      if (!ownerKey) return;
      setSavingGlobal(true);
      try {
        await listingsService.putListingOrchestration(ownerKey, { orchestrationEnabled: next });
        toast.success(next ? 'Orchestration globale activée' : 'Orchestration globale coupée');
      } catch (e: unknown) {
        setGlobalOn(prev);
        toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
      } finally {
        setSavingGlobal(false);
      }
      return;
    }
    if (!ownerKey || ownerKey === 'global') return;
    setSavingGlobal(true);
    try {
      await saveOwnerOrchestrationEnabled(ownerKey, next);
      if (
        autoSyncListings &&
        shouldAutoSyncListingsAfterOwnerSave(ownerKey, isAdminTemplate)
      ) {
        try {
          await syncAllListingsFromOwnerOrchestration(ownerKey);
        } catch {
          /* sync best-effort */
        }
      }
      toast.success(next ? 'Orchestration globale activée' : 'Orchestration globale coupée');
    } catch (e: unknown) {
      setGlobalOn(prev);
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSavingGlobal(false);
    }
  };

  return (
    <Box
      sx={{
        mb: isTab ? 0 : 2,
        p: compact ? 1.5 : isTab ? 0 : 2,
        borderRadius: isTab ? 0 : 2,
        border: isTab ? 'none' : `1px solid ${V3.b}`,
        bgcolor: isTab ? 'transparent' : V3.card,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          mb: 1.5,
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {!isTab ? (
            <Typography sx={{ fontSize: compact ? 14 : 15, fontWeight: 800 }}>
              Activation des services
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: 12, color: V3.t3 }}>
            {isListingMode
              ? 'Par défaut, chaque annonce hérite de l’activation propriétaire. Vous pouvez activer ou désactiver un service pour cette annonce uniquement.'
              : 'Désactivé = invisible dans le menu gauche. Par défaut tout est off pour un nouveau PM.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip size="small" label={`${activeCount} actif(s)`} color={activeCount ? 'success' : 'default'} />
          {isListingMode && savingNow ? (
            <Chip
              size="small"
              icon={<CircularProgress size={12} color="inherit" />}
              label="Enregistrement…"
              variant="outlined"
            />
          ) : null}
          {!autoSaveListing && !controlled && dirty ? (
            <Button
              size="small"
              variant="contained"
              disabled={saving || disabled}
              onClick={() => void persist()}
              sx={{ bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }}
            >
              {saving ? <CircularProgress size={16} color="inherit" /> : 'Enregistrer'}
            </Button>
          ) : null}
          {!autoSaveListing && isListingMode && controlled && dirty ? (
            <Button
              size="small"
              variant="contained"
              disabled={saving || disabled}
              onClick={() => void persist()}
              sx={{ bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }}
            >
              {saving ? <CircularProgress size={16} color="inherit" /> : 'Enregistrer'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <OrchestrationGlobalSwitch
        checked={globalOn}
        disabled={disabled || savingNow}
        scope={isListingMode ? 'listing' : 'owner'}
        onChange={v => void persistGlobal(v)}
      />

      {menuNav ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1.25,
            mb: 1.5,
            borderRadius: 1.5,
            border: `1px solid ${local.menu_navigation ? V3.wa : V3.b}`,
            bgcolor: local.menu_navigation ? V3.waT : 'transparent',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {menuNav.emoji} {menuNav.label}
            </Typography>
            {isListingMode ? (
              <Typography sx={{ fontSize: 10.5, color: V3.t3, lineHeight: 1.2 }}>
                {listingActivationLabel(statusByKey.menu_navigation)}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 11, color: V3.t3, fontFamily: 'monospace' }}>
                A · B · C · D · J
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {isListingMode && statusByKey.menu_navigation?.source === 'listing' ? (
              <Button
                size="small"
                sx={{ minWidth: 0, fontSize: 9, py: 0.1, px: 0.75 }}
                disabled={switchesDisabled}
                onClick={() => onResetListingOverride?.('menu_navigation')}
              >
                Hériter
              </Button>
            ) : null}
            <Typography sx={{ fontSize: 11, color: V3.t3 }}>{local.menu_navigation ? 'Oui' : 'Non'}</Typography>
            <Switch
              size="small"
              checked={local.menu_navigation === true}
              disabled={switchesDisabled}
              onChange={(_, checked) => setActivation('menu_navigation', checked)}
            />
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact
            ? { xs: '1fr', md: '1fr 1fr' }
            : { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 1.5,
        }}
      >
        {groups.map(grp => (
          <Box
            key={grp.id}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${V3.b}`,
              bgcolor: V3.bg,
            }}
          >
            <Stack
              direction="row"
              sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                {GROUP_EMOJI[grp.id]} {grp.label}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button
                  size="small"
                  sx={{ minWidth: 0, fontSize: 10, py: 0.25 }}
                  disabled={switchesDisabled}
                  onClick={() => setGroup(grp.id, true)}
                >
                  Tout Oui
                </Button>
                <Button
                  size="small"
                  sx={{ minWidth: 0, fontSize: 10, py: 0.25 }}
                  disabled={switchesDisabled}
                  onClick={() => setGroup(grp.id, false)}
                >
                  Tout Non
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={0.75}>
              {grp.items.map(def => {
                const row = statusByKey[def.key];
                const hint = isListingMode
                  ? listingActivationLabel(row)
                  : capabilityShortHint(def);
                return (
                <Stack
                  key={def.key}
                  direction="row"
                  sx={{ gap: 1, py: 0.25, alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25 }}>
                      {def.label}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: V3.t3, lineHeight: 1.2 }}>
                      {hint}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                    {isListingMode && row?.source === 'listing' ? (
                      <Button
                        size="small"
                        sx={{ minWidth: 0, fontSize: 9, py: 0.1, px: 0.75 }}
                        disabled={switchesDisabled}
                        onClick={() => onResetListingOverride?.(def.key)}
                      >
                        Hériter
                      </Button>
                    ) : null}
                    <Switch
                      size="small"
                      checked={local[def.key] === true}
                      disabled={switchesDisabled}
                      onChange={(_, checked) => setActivation(def.key, checked)}
                    />
                  </Stack>
                </Stack>
              );
              })}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
