// Conciergerie — catalogue services + picker icônes · noms/descriptions multilingues
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  TextField,
  Switch,
  Button,
  Tooltip,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS } from './types';
import {
  ConfigIntroBar,
  SectionCaps,
  chipActionSx,
  TYPO,
} from './SHARED';
import {
  CONCIERGE_ICON_PICKER,
  CONCIERGE_SERVICE_CATALOG,
  catalogItemToService,
  CONCIERGE_PRICE_OPTIONS,
  formatConciergePriceLabel,
  type ConciergeCatalogItem,
  type ConciergePriceType,
} from './conciergeServiceCatalog';
import CityAssociationField, {
  formatCityAssociationSummary,
} from './CityAssociationField';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';
import { logV3Orch } from '../../../orchestrationListingV3/v3OrchestrationDebugLog';
import { persistListingConciergeSlice } from './conciergeListingPersist';
import { cloneCityAssociation } from './transportRouteCatalog';
import {
  GuestLangTextFields,
  mergeGuestLangMap,
  cleanGuestLangMap,
} from '../../shared/GuestLangTextFields';

const T = SOJORI_TOKENS;
const MAX_SERVICES = 15;

function gestionConciergeShell(listingValues: Record<string, unknown>) {
  return {
    transportServices: listingValues.transportServices ?? [],
    groceryServices: listingValues.groceryServices ?? [],
    customServices: listingValues.customServices ?? [],
  };
}

type GuestLangMap = Record<string, string>;

interface ConciergeService {
  id: string;
  name: GuestLangMap;
  description: GuestLangMap;
  icon: string;
  price: number;
  pricePerPerson: number;
  maxPersons: number;
  priceType: ConciergePriceType;
  enabled: boolean;
  order: number;
  cityIds?: 'all' | string[];
}

interface ConciergeConfig {
  enabled: boolean;
  services: ConciergeService[];
}

const EMPTY_CONCIERGE: ConciergeConfig = { enabled: true, services: [] };

function displayName(s: ConciergeService): string {
  return s.name?.fr || s.name?.en || 'Service';
}

function mapApiService(s: Record<string, unknown>, i: number): ConciergeService {
  const name = mergeGuestLangMap(s.name as GuestLangMap | undefined);
  const desc = mergeGuestLangMap(s.description as GuestLangMap | undefined);
  const pricing = (s.pricing as {
    type?: string;
    amount?: number;
    pricePerPerson?: number;
  }) || {};
  const capacity = (s.capacity as { maxPassengers?: number }) || {};
  const typeMap: Record<string, ConciergePriceType> = {
    quote: 'ON_QUOTE',
    fixed: 'FIXED',
    hourly: 'PER_HOUR',
    per_person: 'PER_PERSON',
    per_group: 'PER_GROUP',
    hourly_per_person: 'PER_PERSON_HOUR',
    hourly_per_group: 'PER_GROUP_HOUR',
  };
  const priceType = typeMap[String(pricing.type || 'quote')] || 'ON_QUOTE';
  return {
    id: String(s.id || `svc_${i}`),
    name: name.fr ? name : mergeGuestLangMap(undefined, 'Service'),
    description: desc,
    icon: String(s.icon || '✨'),
    price: Number(pricing.amount) || 0,
    pricePerPerson: Number(pricing.pricePerPerson) || 0,
    maxPersons: Number(capacity.maxPassengers) || 0,
    priceType,
    enabled: s.enabled !== false,
    order: i,
    cityIds: cloneCityAssociation((s.cityIds as 'all' | string[] | undefined) ?? 'all'),
  };
}

function configFromCustomServices(custom: unknown): ConciergeConfig {
  if (!Array.isArray(custom) || custom.length === 0) {
    return EMPTY_CONCIERGE;
  }
  const services = (custom as Record<string, unknown>[]).map(mapApiService);
  return {
    enabled: services.some(s => s.enabled),
    services,
  };
}

function buildCustomServicesPayload(services: ConciergeService[]) {
  return services.map((s, i) => ({
    id: s.id,
    enabled: s.enabled,
    icon: s.icon,
    name: cleanGuestLangMap(s.name),
    description: cleanGuestLangMap(s.description),
    pricing: buildPricingPayload(s),
    ...(s.maxPersons > 0
      ? {
          capacity: {
            maxPassengers: s.maxPersons,
            errorMessage: {
              fr: `Maximum ${s.maxPersons} personnes pour ce service`,
              en: `Maximum ${s.maxPersons} people for this service`,
              ar: `الحد الأقصى ${s.maxPersons} أشخاص`,
              es: `Máximo ${s.maxPersons} personas para este servicio`,
              de: `Maximal ${s.maxPersons} Personen für diesen Service`,
              it: `Massimo ${s.maxPersons} persone per questo servizio`,
              ary: `Maximum ${s.maxPersons} personnes pour ce service`,
            },
          },
        }
      : {}),
    clientFields: {},
    availability: { type: 'always' },
    requiresPMValidation: true,
    images: [],
    order: i,
    cityIds: cloneCityAssociation(s.cityIds),
  }));
}

function buildPricingPayload(s: ConciergeService) {
  const currency = 'MAD';
  const expl = (fr: string) => ({ fr, en: fr, ar: fr });
  switch (s.priceType) {
    case 'FIXED':
      return {
        type: 'fixed',
        amount: s.price,
        currency,
        explanation: expl(`${s.price} ${currency}`),
      };
    case 'PER_HOUR':
      return {
        type: 'hourly',
        amount: s.price,
        currency,
        explanation: expl(`${s.price} ${currency}/h`),
      };
    case 'PER_PERSON':
      return {
        type: 'per_person',
        pricePerPerson: s.pricePerPerson || s.price,
        currency,
        explanation: expl(`${s.pricePerPerson || s.price} ${currency}/pers.`),
      };
    case 'PER_GROUP':
      return {
        type: 'per_group',
        amount: s.price,
        currency,
        explanation: expl(`${s.price} ${currency}/groupe`),
      };
    case 'PER_PERSON_HOUR':
      return {
        type: 'hourly_per_person',
        pricePerPerson: s.pricePerPerson || s.price,
        currency,
        explanation: expl(`${s.pricePerPerson || s.price} ${currency}/pers./h`),
      };
    case 'PER_GROUP_HOUR':
      return {
        type: 'hourly_per_group',
        amount: s.price,
        currency,
        explanation: expl(`${s.price} ${currency}/groupe/h`),
      };
    case 'ON_QUOTE':
    default:
      return {
        type: 'quote',
        currency,
        explanation: expl('Sur devis'),
      };
  }
}

interface Props {
  listingId?: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => Promise<void>;
  templateMode?: boolean;
  templateOwnerKey?: string;
  /** Template Admin global : bibliothèque seule, pas de services configurés ni sync. */
  adminCatalogOnly?: boolean;
  /** V3 orchestration : pas d’auto-save, barre Enregistrer par bloc. */
  manualSaveMode?: boolean;
}

export default function ConciergeConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  templateOwnerKey,
  adminCatalogOnly = false,
  manualSaveMode = false,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const isAdminGlobal = adminCatalogOnly || templateOwnerKey === 'global';
  const useOrchestrationGestion =
    Boolean(onListingPatch) && (templateMode || Object.keys(listingValues).length > 0);
  const gestionCustomKey = useMemo(
    () => JSON.stringify(listingValues.customServices ?? []),
    [listingValues.customServices],
  );
  const [config, setConfig] = useState<ConciergeConfig>(EMPTY_CONCIERGE);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [cityOptions, setCityOptions] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CONCIERGE_SERVICE_CATALOG[0]?.id ?? '');
  const configRef = useRef(config);
  const rawDocRef = useRef<Record<string, unknown> | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const skipAutoSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { configRef.current = config; }, [config]);

  const markDirty = useCallback(() => {
    if (skipAutoSaveRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listingsService.getCities({ limit: 200 });
        const list = (res?.data?.cities ?? res?.data ?? res ?? []) as Array<{ _id: string; name: string }>;
        if (!cancelled && Array.isArray(list)) {
          setCityOptions(list.filter(c => c._id && c.name));
        }
      } catch {
        if (!cancelled) setCityOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateFromGestion = useCallback(() => {
    const shell = gestionConciergeShell(listingValues);
    rawDocRef.current = shell;
    setConfig(configFromCustomServices(shell.customServices));
    hydratedRef.current = true;
  }, [listingValues]);

  const fetchConfig = useCallback(async () => {
    if (isAdminGlobal) {
      setConfig({ enabled: true, services: [] });
      setLoading(false);
      hydratedRef.current = true;
      skipAutoSaveRef.current = false;
      return;
    }
    try {
      setLoading(true);
      let data: { customServices?: Array<Record<string, unknown>> } | null = null;
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        const payload = (res as { data?: { concierge?: { customServices?: unknown[] } } })?.data ?? res;
        data = (payload as { concierge?: { customServices?: unknown[] } })?.concierge ?? null;
      } else if (listingId) {
        let res = await listingsService.getListingConciergeConfig(listingId);
        if (res.error && !res.data) {
          await listingsService.createListingConciergeConfig(listingId);
          res = await listingsService.getListingConciergeConfig(listingId);
        }
        data = res.data as { customServices?: Array<Record<string, unknown>> } | null;
      }
      const custom = data?.customServices;
      if (data != null && Array.isArray(custom)) {
        logOrchConfig('concierge.load ←', {
          source: isOwnerTemplate ? `template:${templateOwnerKey}` : `listing:${listingId}`,
          count: custom.length,
        });
        setConfig(configFromCustomServices(custom));
      } else {
        logOrchConfig('concierge.load ← empty (no saved concierge)', {
          source: isOwnerTemplate ? `template:${templateOwnerKey}` : `listing:${listingId}`,
        });
        setConfig(EMPTY_CONCIERGE);
      }
    } catch (err) {
      orchConfigError('concierge.load FAIL', err);
      setConfig(EMPTY_CONCIERGE);
    } finally {
      setLoading(false);
      hydratedRef.current = true;
      skipAutoSaveRef.current = false;
    }
  }, [isAdminGlobal, isOwnerTemplate, listingId, templateOwnerKey]);

  useEffect(() => {
    if (!useOrchestrationGestion) return;
    if (hydratedRef.current && dirtyRef.current) return;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    setDirty(false);
    setLoading(false);
    hydrateFromGestion();
    skipAutoSaveRef.current = false;
  }, [useOrchestrationGestion, gestionCustomKey, hydrateFromGestion]);

  useEffect(() => {
    if (useOrchestrationGestion) return;
    hydratedRef.current = false;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    setDirty(false);
    void fetchConfig();
  }, [fetchConfig, useOrchestrationGestion]);

  const persist = useCallback(async () => {
    if (isAdminGlobal) return;
    const cfg = configRef.current;
    const customServices = buildCustomServicesPayload(cfg.services);

    setSavingState('saving');
    logV3Orch('gestion.concierge.persist.start', {
      templateMode,
      listingId: listingId || null,
      count: customServices.length,
    });
    logOrchConfig('concierge.persist →', {
      target: isOwnerTemplate ? `template:${templateOwnerKey}` : `listing:${listingId}`,
      count: customServices.length,
    });

    try {
      if (useOrchestrationGestion && onListingPatch) {
        await onListingPatch({ customServices });
        if (!templateMode && listingId) {
          const merged = await persistListingConciergeSlice(listingId, { customServices });
          rawDocRef.current = merged;
        } else {
          rawDocRef.current = {
            ...(rawDocRef.current || {}),
            customServices,
          };
        }
      } else if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
        const prev = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
        await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'concierge', {
          transportServices: prev.transportServices || [],
          groceryServices: prev.groceryServices || [],
          customServices,
        });
      } else if (listingId) {
        await persistListingConciergeSlice(listingId, { customServices });
      } else {
        return;
      }
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
      logV3Orch('gestion.concierge.persist.ok', { count: customServices.length });
      logOrchConfig('concierge.persist ← OK');
      if (!manualSaveMode) {
        window.setTimeout(() => setSavingState('idle'), 2000);
      }
    } catch (err) {
      setSavingState('idle');
      dirtyRef.current = true;
      setDirty(true);
      orchConfigError('concierge.persist FAIL', err);
      logV3Orch('gestion.concierge.persist.error', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [
    isAdminGlobal,
    isOwnerTemplate,
    listingId,
    listingValues,
    manualSaveMode,
    onListingPatch,
    templateMode,
    templateOwnerKey,
    useOrchestrationGestion,
  ]);

  useEffect(() => {
    if (manualSaveMode || loading || !hydratedRef.current || isAdminGlobal || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, loading, persist, manualSaveMode, isAdminGlobal]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      markDirty();
      setConfig(prev => {
        const oldIndex = prev.services.findIndex(s => s.id === active.id);
        const newIndex = prev.services.findIndex(s => s.id === over.id);
        const reordered = arrayMove(prev.services, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
        return { ...prev, services: reordered };
      });
    }
  };

  const addFromCatalog = (item: ConciergeCatalogItem) => {
    if (isAdminGlobal) return;
    if (config.services.length >= MAX_SERVICES) return;
    if (config.services.some(s => s.id === item.id)) return;
    setExpandedServiceId(item.id);
    markDirty();
    setConfig(prev => ({
      ...prev,
      services: [...prev.services, catalogItemToService(item, prev.services.length)],
    }));
  };

  const addCustomService = () => {
    if (config.services.length >= MAX_SERVICES) return;
    const id = `custom_${Date.now()}`;
    setExpandedServiceId(id);
    markDirty();
    setConfig(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id,
          name: mergeGuestLangMap({ fr: 'Nouveau service' }),
          description: mergeGuestLangMap({ fr: 'Service personnalisé sur demande' }),
          icon: '✨',
          price: 0,
          pricePerPerson: 0,
          maxPersons: 0,
          priceType: 'ON_QUOTE',
          enabled: true,
          order: prev.services.length,
          cityIds: 'all',
        },
      ],
    }));
  };

  const deleteService = (id: string) => {
    markDirty();
    setConfig(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  const updateService = (id: string, updates: Partial<ConciergeService>) => {
    markDirty();
    const normalized =
      updates.cityIds !== undefined
        ? { ...updates, cityIds: cloneCityAssociation(updates.cityIds) }
        : updates;
    setConfig(prev => ({
      ...prev,
      services: prev.services.map(s => (s.id === id ? { ...s, ...normalized } : s)),
    }));
  };

  const activeCat =
    CONCIERGE_SERVICE_CATALOG.find(c => c.id === activeCategory) ?? CONCIERGE_SERVICE_CATALOG[0];
  const catalogServiceCount = CONCIERGE_SERVICE_CATALOG.reduce((n, c) => n + c.services.length, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 8 }}>
        <Typography>Chargement…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {!manualSaveMode ? (
        <ConfigIntroBar saveState={isAdminGlobal ? 'idle' : savingState}>
          {isAdminGlobal ? (
            <>
              <b>Template Admin</b> — catalogue des modèles disponibles pour les PM. Les PM ajoutent et configurent
              leurs services (prix, villes) ; rien n’est synchronisé depuis l’admin pour la conciergerie configurée.
            </>
          ) : (
            <>
              Bibliothèque = modèles sans ville. Une fois ajouté, configurez chaque service : tarif, icône et{' '}
              <b>villes</b> (toutes ou une sélection).
            </>
          )}
        </ConfigIntroBar>
      ) : (
        <Typography sx={{ ...TYPO.intro, mb: 2 }}>
          Bibliothèque = modèles sans ville. Une fois ajouté, configurez chaque service : tarif, icône et{' '}
          <b>villes</b> (toutes ou une sélection).
        </Typography>
      )}

      {/* Bibliothèque — modèles → ajout dans customServices[] (persisté) */}
      <Box sx={{
        mb: 2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.25,
        overflow: 'hidden',
        bgcolor: T.bg1,
      }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, px: 1.25, py: 0.75, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}` }}>
          <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5 }}>📚 Bibliothèque</Typography>
          <Typography sx={{ ...TYPO.monoHelp }}>
            {CONCIERGE_SERVICE_CATALOG.length} catégories · {catalogServiceCount} modèles
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '168px 1fr' },
            minHeight: 0,
            maxHeight: { sm: 280 },
          }}
        >
          <Stack
            sx={{
              borderRight: { sm: `1px solid ${T.border}` },
              borderBottom: { xs: `1px solid ${T.border}`, sm: 'none' },
              overflowY: 'auto',
              maxHeight: { sm: 280 },
              p: 0.5,
              gap: 0.25,
              bgcolor: T.bg2,
            }}
          >
            {CONCIERGE_SERVICE_CATALOG.map(cat => {
              const addedInCat = cat.services.filter(s => config.services.some(x => x.id === s.id)).length;
              const selected = cat.id === activeCat.id;
              return (
                <Box
                  key={cat.id}
                  component="button"
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.65,
                    borderRadius: 0.75,
                    textAlign: 'left',
                    bgcolor: selected ? T.primaryTint : 'transparent',
                    border: selected ? `1px solid ${T.primary}` : '1px solid transparent',
                    '&:hover': { bgcolor: selected ? T.primaryTint : T.bg3 },
                  }}
                >
                  <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{cat.icon}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ ...TYPO.small, lineHeight: 1.2 }} noWrap>
                      {cat.labelFr}
                    </Typography>
                    <Typography sx={{ ...TYPO.monoHelp, fontSize: 9.5, color: addedInCat ? T.success : T.text4 }}>
                      {cat.services.length}{addedInCat > 0 ? ` · ${addedInCat} ajouté` : ''}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ p: 1, overflowY: 'auto', maxHeight: { sm: 280 } }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{activeCat.icon}</Typography>
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5, flex: 1 }}>{activeCat.labelFr}</Typography>
              <Typography sx={{ ...TYPO.monoHelp }}>{isAdminGlobal ? 'Aperçu modèles' : 'Ajouter au listing'}</Typography>
            </Stack>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {activeCat.services.map(item => {
                const already = !isAdminGlobal && config.services.some(s => s.id === item.id);
                const full = !isAdminGlobal && config.services.length >= MAX_SERVICES;
                const hint = formatConciergePriceLabel({
                  priceType: item.priceType,
                  price: item.price ?? 0,
                  pricePerPerson: item.pricePerPerson ?? 0,
                  maxPersons: item.maxPersons,
                });
                return (
                  <Tooltip key={item.id} title={item.descriptionFr} placement="top">
                    <Box
                      component="button"
                      type="button"
                      disabled={isAdminGlobal || already || full}
                      onClick={() => addFromCatalog(item)}
                      sx={{
                        ...chipActionSx(already, { compact: true }),
                        cursor: isAdminGlobal || already || full ? 'not-allowed' : 'pointer',
                        opacity: isAdminGlobal ? 0.55 : full && !already ? 0.45 : 1,
                        maxWidth: '100%',
                        '&:hover': !already && !full ? { borderColor: T.primary, bgcolor: T.primaryTint } : {},
                      }}
                    >
                      <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ ...TYPO.small, lineHeight: 1.15 }} noWrap>
                          {item.labelFr}
                        </Typography>
                        <Typography sx={{ ...TYPO.monoHelp, fontSize: 9.5, color: already ? T.success : T.text3 }} noWrap>
                          {isAdminGlobal ? 'PM' : already ? '✓' : '+'} {hint}
                        </Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {!isAdminGlobal && (
        <>
      <SectionCaps>
        Vos services ({config.services.length}/{MAX_SERVICES})
      </SectionCaps>

      {config.services.length === 0 && (
        <Typography sx={{ ...TYPO.caption, color: T.text3, mb: 1 }}>
          Aucun service. Ajoutez depuis la bibliothèque ou créez un service personnalisé.
        </Typography>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.services.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <Stack sx={{ gap: 1 }}>
            {config.services.map(service => (
              <SortableService
                key={service.id}
                service={service}
                expanded={expandedServiceId === service.id}
                onToggleExpand={() =>
                  setExpandedServiceId(prev => (prev === service.id ? null : service.id))
                }
                cityOptions={cityOptions}
                onUpdate={updates => updateService(service.id, updates)}
                onDelete={() => deleteService(service.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {config.services.length < MAX_SERVICES && (
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1.5, borderStyle: 'dashed', textTransform: 'none', fontWeight: 600 }}
          onClick={addCustomService}
        >
          + Service personnalisé
        </Button>
      )}

      {manualSaveMode ? (
        <V3BlockSaveBar
          label="Conciergerie · services custom"
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : null}
        </>
      )}
    </Box>
  );
}

function IconPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (icon: string) => void;
  compact?: boolean;
}) {
  const icons = compact ? CONCIERGE_ICON_PICKER.slice(0, 18) : CONCIERGE_ICON_PICKER;
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Typography sx={{ ...TYPO.caps, mb: 0, mr: 0.5 }}>Icône</Typography>
      <Typography sx={{ fontSize: compact ? 20 : 28, lineHeight: 1 }}>{value || '✨'}</Typography>
      <TextField
        size="small"
        placeholder="…"
        value={value}
        onChange={e => onChange(e.target.value.slice(0, 4))}
        onKeyDown={e => e.stopPropagation()}
        sx={{ width: 56, '& input': { textAlign: 'center', fontSize: 16, py: 0.5 } }}
      />
      {icons.map(emoji => (
        <Box
          key={emoji}
          component="button"
          type="button"
          onClick={() => onChange(emoji)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: 0.5,
            fontSize: compact ? 16 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: value === emoji ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
            bgcolor: value === emoji ? T.primaryTint : T.bg1,
          }}
        >
          {emoji}
        </Box>
      ))}
    </Stack>
  );
}

function SortableService({
  service,
  expanded,
  onToggleExpand,
  cityOptions,
  onUpdate,
  onDelete,
}: {
  service: ConciergeService;
  expanded: boolean;
  onToggleExpand: () => void;
  cityOptions: Array<{ _id: string; name: string }>;
  onUpdate: (updates: Partial<ConciergeService>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!displayName(service)) return null;

  const priceLabel = formatConciergePriceLabel(service);
  const cityLabel = formatCityAssociationSummary(service.cityIds, cityOptions);

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        border: `1px solid ${expanded ? T.primary : T.border}`,
        borderRadius: 1,
        p: 1.25,
        bgcolor: '#fff',
        boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: T.text3, fontSize: 16, '&:active': { cursor: 'grabbing' } }}>
          ⠿
        </Box>
        <Switch
          checked={service.enabled}
          onChange={e => onUpdate({ enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
          }}
        />
        <Box sx={{ fontSize: 20, flexShrink: 0 }}>{service.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ ...TYPO.bodyBold }}>{displayName(service)}</Typography>
          {(service.description?.fr || service.maxPersons > 0) && (
            <Typography sx={{ ...TYPO.caption }}>
              {service.description?.fr || ''}
              {service.maxPersons > 0
                ? `${service.description?.fr ? ' · ' : ''}max ${service.maxPersons} pers.`
                : ''}
            </Typography>
          )}
          <Typography sx={{ ...TYPO.monoHelp, fontSize: 10, color: T.text3 }}>
            📍 {cityLabel}
          </Typography>
        </Box>
        <Typography sx={{ ...TYPO.price }}>{priceLabel}</Typography>
        <IconButton size="small" onClick={onToggleExpand}>
          <Box sx={{ fontSize: 18 }}>{expanded ? '▲' : '▼'}</Box>
        </IconButton>
        <Tooltip title="Supprimer">
          <IconButton size="small" onClick={onDelete} sx={{ color: T.error }}>
            ✕
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${T.border}` }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <GuestLangTextFields
              fieldLabel="Nom"
              requiredFr
              dense
              autoFillMissing
              value={mergeGuestLangMap(service.name)}
              onChange={(name) => onUpdate({ name })}
              helperText="FR requis · ✨ génère les autres langues (WhatsApp)."
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Tarification</InputLabel>
              <Select
                value={service.priceType}
                label="Tarification"
                onChange={e => onUpdate({ priceType: e.target.value as ConciergePriceType })}
              >
                <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, fontSize: 11, color: T.text3 }}>
                  Forfaits
                </MenuItem>
                {CONCIERGE_PRICE_OPTIONS.filter(o => o.group === 'forfait').map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
                <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, fontSize: 11, color: T.text3, mt: 0.5 }}>
                  Heure × personne ou groupe
                </MenuItem>
                {CONCIERGE_PRICE_OPTIONS.filter(o => o.group === 'heure').map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <GuestLangTextFields
              fieldLabel="Description"
              dense
              autoFillMissing
              value={mergeGuestLangMap(service.description)}
              onChange={(description) => onUpdate({ description })}
              multiline
              rows={2}
            />
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1,
                border: `1px solid ${T.primary}44`,
                bgcolor: T.primaryTint,
              }}
            >
              <Typography sx={{ ...TYPO.bodyBold, fontSize: 12, mb: 0.75 }}>📍 Villes</Typography>
              <Typography sx={{ ...TYPO.monoHelp, fontSize: 10.5, mb: 1 }}>
                Toutes les villes, ou sélectionnez une ou plusieurs villes Sojori pour ce service
              </Typography>
              <CityAssociationField
                key={`cities-${service.id}`}
                instanceId={service.id}
                compact
                value={service.cityIds}
                onChange={cityIds => onUpdate({ cityIds })}
              />
            </Box>
            {(service.priceType === 'PER_PERSON' || service.priceType === 'PER_PERSON_HOUR') && (
              <TextField
                size="small"
                label={service.priceType === 'PER_PERSON_HOUR' ? 'MAD / pers. / h' : 'MAD / pers.'}
                type="number"
                value={service.pricePerPerson}
                onChange={e => onUpdate({ pricePerPerson: Number(e.target.value) })}
                fullWidth
              />
            )}
            {(service.priceType === 'FIXED' ||
              service.priceType === 'PER_HOUR' ||
              service.priceType === 'PER_GROUP' ||
              service.priceType === 'PER_GROUP_HOUR') && (
              <TextField
                size="small"
                label={
                  service.priceType === 'PER_GROUP_HOUR'
                    ? 'MAD / groupe / h'
                    : service.priceType === 'PER_GROUP'
                      ? 'MAD / groupe'
                      : service.priceType === 'PER_HOUR'
                        ? 'MAD / h'
                        : 'MAD'
                }
                type="number"
                value={service.price}
                onChange={e => onUpdate({ price: Number(e.target.value) })}
                fullWidth
              />
            )}
            <TextField
              size="small"
              label="Max pers. (opt.)"
              type="number"
              value={service.maxPersons > 0 ? service.maxPersons : ''}
              onChange={e => onUpdate({ maxPersons: Math.max(0, Number(e.target.value) || 0) })}
              fullWidth
              slotProps={{ htmlInput: { min: 0, max: 99 } }}
            />
          </Box>
          <Box sx={{ mt: 1 }}>
            <IconPicker compact value={service.icon} onChange={icon => onUpdate({ icon })} />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
