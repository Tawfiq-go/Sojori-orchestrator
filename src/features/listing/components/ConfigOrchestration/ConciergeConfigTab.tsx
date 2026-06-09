// Conciergerie — FR uniquement · catalogue services + picker icônes
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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

const T = SOJORI_TOKENS;
const MAX_SERVICES = 15;

interface ConciergeService {
  id: string;
  labelFr: string;
  descriptionFr: string;
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

function mapApiService(s: Record<string, unknown>, i: number): ConciergeService {
  const name = (s.name as { fr?: string; en?: string }) || {};
  const desc = (s.description as { fr?: string; en?: string }) || {};
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
    labelFr: name.fr || name.en || 'Service',
    descriptionFr: desc.fr || desc.en || '',
    icon: String(s.icon || '✨'),
    price: Number(pricing.amount) || 0,
    pricePerPerson: Number(pricing.pricePerPerson) || 0,
    maxPersons: Number(capacity.maxPassengers) || 0,
    priceType,
    enabled: s.enabled !== false,
    order: i,
    cityIds: (s.cityIds as 'all' | string[] | undefined) ?? 'all',
  };
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
  templateOwnerKey?: string;
  /** Template Admin global : bibliothèque seule, pas de services configurés ni sync. */
  adminCatalogOnly?: boolean;
}

export default function ConciergeConfigTab({
  listingId,
  templateOwnerKey,
  adminCatalogOnly = false,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const isAdminGlobal = adminCatalogOnly || templateOwnerKey === 'global';
  const [config, setConfig] = useState<ConciergeConfig>(EMPTY_CONCIERGE);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [cityOptions, setCityOptions] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeCategory, setActiveCategory] = useState(CONCIERGE_SERVICE_CATALOG[0]?.id ?? '');
  const configRef = useRef(config);
  const hydratedRef = useRef(false);
  useEffect(() => { configRef.current = config; }, [config]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    hydratedRef.current = false;
    fetchConfig();
  }, [listingId, templateOwnerKey, isOwnerTemplate]);

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

  const fetchConfig = async () => {
    if (isAdminGlobal) {
      setConfig({ enabled: true, services: [] });
      setLoading(false);
      hydratedRef.current = true;
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
        const services = custom.map(mapApiService);
        logOrchConfig('concierge.load ←', {
          source: isOwnerTemplate ? `template:${templateOwnerKey}` : `listing:${listingId}`,
          count: services.length,
          ids: services.map(s => s.id),
        });
        setConfig({
          enabled: services.length === 0 ? true : services.some(s => s.enabled),
          services,
        });
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
    }
  };

  const persistConfig = useCallback(async (cfg: ConciergeConfig) => {
    if (isAdminGlobal) return;
    const customServices = cfg.services.map((s, i) => ({
        id: s.id,
        enabled: s.enabled,
        icon: s.icon,
        name: { fr: s.labelFr, en: s.labelFr, ar: s.labelFr },
        description: { fr: s.descriptionFr, en: s.descriptionFr, ar: s.descriptionFr },
        pricing: buildPricingPayload(s),
        ...(s.maxPersons > 0
          ? {
              capacity: {
                maxPassengers: s.maxPersons,
                errorMessage: {
                  fr: `Maximum ${s.maxPersons} personnes pour ce service`,
                  en: `Maximum ${s.maxPersons} people for this service`,
                  ar: `الحد الأقصى ${s.maxPersons} أشخاص`,
                },
              },
            }
          : {}),
        clientFields: {},
        availability: { type: 'always' },
        requiresPMValidation: true,
        images: [],
        order: i,
        cityIds: s.cityIds ?? 'all',
      }));

    logOrchConfig('concierge.persist →', {
      target: isOwnerTemplate ? `template:${templateOwnerKey}` : `listing:${listingId}`,
      count: customServices.length,
      ids: customServices.map(s => s.id),
    });

    if (isOwnerTemplate && templateOwnerKey) {
      const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
      const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
      const prev = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
      await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'concierge', {
        transportServices: prev.transportServices || [],
        groceryServices: prev.groceryServices || [],
        customServices,
      });
      logOrchConfig('concierge.persist ← OK', { via: 'listing-owner-config-template' });
      return;
    }

    if (!listingId) return;
    const existing = await listingsService.getListingConciergeConfig(listingId);
    const doc = (existing.data || {}) as { transportServices?: unknown[]; groceryServices?: unknown[] };
    await listingsService.updateListingConciergeServices(listingId, {
      transportServices: doc.transportServices || [],
      groceryServices: doc.groceryServices || [],
      customServices,
    });
    logOrchConfig('concierge.persist ← OK', { via: 'listing-concierge-config' });
  }, [listingId, isOwnerTemplate, templateOwnerKey, isAdminGlobal]);

  const debouncedSave = useCallback(() => {
    setSavingState('saving');
    if ((debouncedSave as any)._t) clearTimeout((debouncedSave as any)._t);
    (debouncedSave as any)._t = setTimeout(async () => {
      try {
        await persistConfig(configRef.current);
        setSavingState('saved');
        setTimeout(() => setSavingState('idle'), 2000);
      } catch (err) {
        orchConfigError('concierge.persist FAIL', err);
        setSavingState('idle');
      }
    }, 800);
  }, [persistConfig]);

  useEffect(() => {
    if (loading || !hydratedRef.current || isAdminGlobal) return;
    debouncedSave();
  }, [config, loading, debouncedSave, isAdminGlobal]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
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
    setConfig(prev => ({
      ...prev,
      services: [...prev.services, catalogItemToService(item, prev.services.length)],
    }));
  };

  const addCustomService = () => {
    if (config.services.length >= MAX_SERVICES) return;
    const id = `custom_${Date.now()}`;
    setExpandedServiceId(id);
    setConfig(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id,
          labelFr: 'Nouveau service',
          descriptionFr: 'Service personnalisé sur demande',
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
    setConfig(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
  };

  const updateService = (id: string, updates: Partial<ConciergeService>) => {
    setConfig(prev => ({
      ...prev,
      services: prev.services.map(s => (s.id === id ? { ...s, ...updates } : s)),
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

  if (!service.labelFr) return null;

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
          <Typography sx={{ ...TYPO.bodyBold }}>{service.labelFr}</Typography>
          {(service.descriptionFr || service.maxPersons > 0) && (
            <Typography sx={{ ...TYPO.caption }}>
              {service.descriptionFr}
              {service.maxPersons > 0
                ? `${service.descriptionFr ? ' · ' : ''}max ${service.maxPersons} pers.`
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
            <TextField
              size="small"
              label="Nom"
              value={service.labelFr}
              onChange={e => onUpdate({ labelFr: e.target.value })}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 60 } }}
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
            <TextField
              size="small"
              label="Description"
              value={service.descriptionFr}
              onChange={e => onUpdate({ descriptionFr: e.target.value })}
              fullWidth
              multiline
              minRows={1}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <Box
              sx={{
                gridColumn: { md: '1 / -1' },
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
