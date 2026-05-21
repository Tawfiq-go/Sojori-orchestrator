// Transport — FR uniquement · transportServices[]
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress, IconButton, Collapse, Tooltip } from '@mui/material';
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
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import {
  Card,
  FormRow,
  TextInput,
  TextArea,
  ConfigIntroBar,
  PillButton,
  LockedPropertyBox,
  PlaceEndpointField,
  chipActionSx,
  TYPO,
} from './SHARED';
import { DashedAddButton } from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import {
  TRANSPORT_ROUTE_PRESETS,
  TRANSPORT_JOURNEY_OPTIONS,
  journeyLabel,
  type TransportExternalKind,
  type TransportJourneyTag,
  type TransportPriceType,
  type TransportRouteItem,
} from './transportRouteCatalog';
import { listingPropertyFromValues, type ListingPropertyPlace } from './transportListingProperty';
import { syncRouteEndpoints, TRANSPORT_V1_NOTE } from './transportRouteRules';

const MAX_ROUTES = 10;

function mapApiRoute(t: Record<string, unknown>, i: number, fallbackProperty: ListingPropertyPlace): TransportRouteItem {
  const name = (t.name as { fr?: string }) || {};
  const desc = (t.description as { fr?: string }) || {};
  const route = (t.route as {
    from?: string;
    to?: string;
    estimatedDuration?: string;
    journeyTag?: TransportJourneyTag;
    departureType?: string;
    arrivalType?: string;
    propertyName?: string;
    propertyAddress?: string;
    propertyLat?: number;
    propertyLng?: number;
    externalLabel?: string;
    externalKind?: TransportExternalKind;
  }) || {};
  const pricing = (t.pricing as {
    type?: TransportPriceType;
    amount?: number;
    pricePerPerson?: number;
  }) || {};
  const capacity = (t.capacity as { maxPassengers?: number }) || {};
  const journeyTag = route.journeyTag || 'other';
  const propertyPlace: ListingPropertyPlace = {
    name: route.propertyName || fallbackProperty.name,
    address: route.propertyAddress || fallbackProperty.address,
    lat: route.propertyLat ?? fallbackProperty.lat,
    lng: route.propertyLng ?? fallbackProperty.lng,
  };
  const externalLabel =
    route.externalLabel ||
    (journeyTag === 'arrival' ? route.from : journeyTag === 'departure' ? route.to : route.from) ||
    '';
  const draft: TransportRouteItem = {
    id: String(t.id || `route_${i}`),
    labelFr: name.fr || 'Route',
    descriptionFr: desc.fr || '',
    from: route.from || '',
    to: route.to || '',
    journeyTag,
    departureType: route.departureType as TransportRouteItem['departureType'],
    arrivalType: route.arrivalType as TransportRouteItem['arrivalType'],
    externalLabel,
    externalKind: route.externalKind || 'other',
    propertyPlace,
    priceType: pricing.type === 'per_person' ? 'per_person' : 'total',
    price: Number(pricing.amount) || 0,
    pricePerPerson: Number(pricing.pricePerPerson) || 0,
    maxPassengers: Number(capacity.maxPassengers) || 4,
    estimatedDuration: route.estimatedDuration || '',
    enabled: t.enabled !== false,
    order: i,
  };
  return syncRouteEndpoints(draft, propertyPlace);
}

function routeToApi(r: TransportRouteItem, i: number, property: ListingPropertyPlace) {
  const synced = syncRouteEndpoints(r, property);
  const fr = synced.labelFr;
  const p = synced.propertyPlace || property;
  return {
    id: synced.id,
    enabled: synced.enabled,
    name: { fr, en: fr, ar: fr },
    description: { fr: synced.descriptionFr, en: synced.descriptionFr, ar: synced.descriptionFr },
    route: {
      from: synced.from,
      to: synced.to,
      estimatedDuration: synced.estimatedDuration || undefined,
      journeyTag: synced.journeyTag,
      ...(synced.departureType ? { departureType: synced.departureType } : {}),
      ...(synced.arrivalType ? { arrivalType: synced.arrivalType } : {}),
      propertyName: p.name,
      propertyAddress: p.address,
      ...(p.lat != null ? { propertyLat: p.lat } : {}),
      ...(p.lng != null ? { propertyLng: p.lng } : {}),
      externalLabel: synced.externalLabel,
      externalKind: synced.externalKind,
    },
    pricing: {
      type: synced.priceType,
      amount: synced.priceType === 'total' ? synced.price : undefined,
      pricePerPerson: synced.priceType === 'per_person' ? synced.pricePerPerson || synced.price : undefined,
      currency: 'MAD',
    },
    capacity: {
      maxPassengers: synced.maxPassengers,
      errorMessage: {
        fr: `Maximum ${synced.maxPassengers} passagers`,
        en: `Maximum ${synced.maxPassengers} passengers`,
        ar: `الحد الأقصى ${synced.maxPassengers} ركاب`,
      },
    },
    clientFields: {},
    availability: { type: 'always' },
    images: [],
    order: i,
  };
}

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
}

export default function TransportConfigTab({ listingId, listingValues = {} }: Props) {
  const listingProperty = listingPropertyFromValues(listingValues);

  const defaultRoutes = () =>
    TRANSPORT_ROUTE_PRESETS.map((p, i) =>
      syncRouteEndpoints({ ...p, enabled: true, order: i }, listingProperty),
    );

  const [routes, setRoutes] = useState<TransportRouteItem[]>(defaultRoutes);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const routesRef = useRef(routes);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { routesRef.current = routes; }, [routes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listingsService.getListingConciergeConfig(listingId);
        const transport = (res.data as { transportServices?: Array<Record<string, unknown>> } | null)
          ?.transportServices;
        if (Array.isArray(transport) && transport.length > 0) {
          setRoutes(transport.map((t, i) => mapApiRoute(t, i, listingProperty)));
        } else {
          setRoutes(defaultRoutes());
        }
      } catch {
        /* défauts */
      } finally {
        setLoading(false);
        hydratedRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch si autre listing
  }, [listingId]);

  const persist = useCallback(async () => {
    setSavingState('saving');
    try {
      const existing = await listingsService.getListingConciergeConfig(listingId);
      const doc = (existing.data || {}) as { groceryServices?: unknown[]; customServices?: unknown[] };
      await listingsService.updateListingConciergeServices(listingId, {
        transportServices: routesRef.current.map((r, i) => routeToApi(r, i, listingProperty)),
        groceryServices: doc.groceryServices || [],
        customServices: doc.customServices || [],
      });
      setSavingState('saved');
    } catch {
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, listingProperty]);

  useEffect(() => {
    if (loading || !hydratedRef.current || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [routes, loading, persist]);

  const mutateRoutes = (fn: (prev: TransportRouteItem[]) => TransportRouteItem[]) => {
    dirtyRef.current = true;
    setRoutes(fn);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    mutateRoutes(prev => {
      const o = prev.findIndex(r => r.id === active.id);
      const n = prev.findIndex(r => r.id === over.id);
      return arrayMove(prev, o, n).map((r, i) => ({ ...r, order: i }));
    });
  };

  const updateRoute = (id: string, patch: Partial<TransportRouteItem>) => {
    mutateRoutes(prev =>
      prev.map(r => (r.id === id ? syncRouteEndpoints({ ...r, ...patch }, listingProperty) : r)),
    );
  };

  const presetsAvailable = TRANSPORT_ROUTE_PRESETS.filter(p => !routes.some(r => r.id === p.id));

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Arrivée / départ · logement = <b>{listingProperty.name}</b> (adresse & GPS listing). {TRANSPORT_V1_NOTE}
      </ConfigIntroBar>

      <Card compact icon="📍" title={`Routes · ${routes.length}/${MAX_ROUTES}`} meta="transportServices[]">
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75} sx={{ mb: catalogOpen ? 1 : 0 }}>
          <DashedAddButton
            label={catalogOpen ? '▲ Masquer modèles' : '▼ Modèles (aéroport, gare…)'}
            onClick={() => setCatalogOpen(o => !o)}
          />
        </Stack>
        <Collapse in={catalogOpen}>
          <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {presetsAvailable.length === 0 ? (
              <Typography sx={{ ...TYPO.caption }}>Tous les modèles sont déjà ajoutés.</Typography>
            ) : (
              presetsAvailable.map(preset => (
                <Tooltip key={preset.id} title={`${preset.from} → ${preset.to}`} placement="top">
                  <Box
                    component="button"
                    type="button"
                    disabled={routes.length >= MAX_ROUTES}
                    onClick={() =>
                      mutateRoutes(prev => [
                        ...prev,
                        syncRouteEndpoints({ ...preset, enabled: true, order: prev.length }, listingProperty),
                      ])
                    }
                    sx={{
                      ...chipActionSx(false, { compact: true }),
                      '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
                    }}
                  >
                    + {preset.labelFr}
                  </Box>
                </Tooltip>
              ))
            )}
          </Stack>
        </Collapse>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routes.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <Stack gap={1}>
              {routes.map(route => (
                <SortableRoute
                  key={route.id}
                  route={route}
                  listingProperty={listingProperty}
                  onUpdate={p => updateRoute(route.id, p)}
                  onDelete={() => mutateRoutes(prev => prev.filter(r => r.id !== route.id))}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>

        {routes.length < MAX_ROUTES && (
          <Box sx={{ mt: 1 }}>
            <DashedAddButton
              label="+ Route personnalisée"
              onClick={() =>
                mutateRoutes(prev => [
                  ...prev,
                  syncRouteEndpoints(
                    {
                      id: `route_${Date.now()}`,
                      labelFr: 'Arrivée — nouveau point',
                      descriptionFr: 'Transfert vers le logement',
                      from: '',
                      to: '',
                      journeyTag: 'arrival',
                      externalKind: 'other',
                      externalLabel: '',
                      priceType: 'total',
                      price: 0,
                      maxPassengers: 4,
                      estimatedDuration: '',
                      enabled: true,
                      order: prev.length,
                    },
                    listingProperty,
                  ),
                ])
              }
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}

type RouteEndpointMode = 'locked' | 'external' | 'free';

function RouteEndpointColumn({
  title,
  mode,
  place,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  mode: RouteEndpointMode;
  place: ListingPropertyPlace;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  if (mode === 'locked') {
    return (
      <Box>
        <Typography sx={{ ...TYPO.caps, color: T.text4, mb: 0.5 }}>{title}</Typography>
        <LockedPropertyBox name={place.name} address={place.address} />
      </Box>
    );
  }
  return (
    <PlaceEndpointField label={title} value={value} onChange={onChange} placeholder={placeholder} />
  );
}

function SortableRoute({
  route,
  listingProperty,
  onUpdate,
  onDelete,
}: {
  route: TransportRouteItem;
  listingProperty: ListingPropertyPlace;
  onUpdate: (p: Partial<TransportRouteItem>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: route.id });
  const priceLabel =
    route.priceType === 'per_person'
      ? `${route.pricePerPerson || route.price} MAD/pers. · max ${route.maxPassengers}`
      : `${route.price} MAD · max ${route.maxPassengers}`;
  const isArrival = route.journeyTag === 'arrival';
  const isDeparture = route.journeyTag === 'departure';
  const isOther = route.journeyTag === 'other';
  const place = route.propertyPlace || listingProperty;
  const depuisMode: RouteEndpointMode = isDeparture ? 'locked' : isOther ? 'free' : 'external';
  const versMode: RouteEndpointMode = isArrival ? 'locked' : isOther ? 'free' : 'external';

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      sx={{
        border: `1px solid ${expanded ? T.primary : T.border}`,
        borderRadius: 1,
        bgcolor: T.bg1,
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: '8px 10px', bgcolor: T.bg2 }}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: T.text3, fontSize: 14 }}>⠿</Box>
        <Box
          component="button"
          type="button"
          onClick={() => onUpdate({ enabled: !route.enabled })}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            width: 32,
            height: 18,
            borderRadius: '99px',
            bgcolor: route.enabled ? T.primary : T.borderStrong,
            position: 'relative',
            flexShrink: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 2,
              left: route.enabled ? 16 : 2,
              width: 14,
              height: 14,
              bgcolor: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
            },
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5 }} noWrap>{route.labelFr}</Typography>
          <Typography sx={{ ...TYPO.monoHelp, fontSize: 10.5 }} noWrap>
            {route.from} → {route.to} · {journeyLabel(route.journeyTag)} · {priceLabel}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ p: 0.25 }}>
          <Typography sx={{ fontSize: 14 }}>{expanded ? '▲' : '▼'}</Typography>
        </IconButton>
        <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.25 }}>✕</IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ p: 1.25 }}>
          <FormRow compact label="Type de trajet" schemaPath="transportServices[].route.journeyTag" inSchema>
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              {TRANSPORT_JOURNEY_OPTIONS.map(tag => (
                <PillButton key={tag} active={route.journeyTag === tag} onClick={() => onUpdate({ journeyTag: tag })}>
                  {journeyLabel(tag)}
                </PillButton>
              ))}
            </Stack>
          </FormRow>

          <Box
            sx={{
              mb: 1.25,
              p: 1.25,
              borderRadius: 1,
              border: `1px solid ${T.border}`,
              bgcolor: T.bg2,
            }}
          >
            <Typography sx={{ ...TYPO.caps, mb: 1 }}>Itinéraire</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                gap: { xs: 1, md: 1.25 },
                alignItems: 'stretch',
              }}
            >
              <RouteEndpointColumn
                title="Depuis"
                mode={depuisMode}
                place={place}
                value={isOther ? route.from : route.externalLabel}
                onChange={v =>
                  isOther ? onUpdate({ from: v }) : onUpdate({ externalLabel: v })
                }
                placeholder="Lieu de départ"
              />
              <Typography
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  color: T.text4,
                  fontFamily: CONFIG_ORCH_FONT.mono,
                  pt: 2,
                }}
              >
                →
              </Typography>
              <RouteEndpointColumn
                title="Vers"
                mode={versMode}
                place={place}
                value={isOther ? route.to : route.externalLabel}
                onChange={v =>
                  isOther ? onUpdate({ to: v }) : onUpdate({ externalLabel: v })
                }
                placeholder="Lieu d'arrivée"
              />
            </Box>
            {isOther && (
              <Typography sx={{ ...TYPO.caption, mt: 0.75, color: T.text3 }}>
                Saisissez librement les deux extrémités (ex. Gare Gueliz → Aéroport Marrakech).
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0 }}>
            <FormRow compact label="Nom affiché" schemaPath="transportServices[].name.fr" inSchema>
              <TextInput value={route.labelFr} onChange={e => onUpdate({ labelFr: e.target.value })} />
            </FormRow>
            <FormRow compact label="Tarif" schemaPath="transportServices[].pricing.type" inSchema>
              <Stack direction="row" gap={0.5}>
                <PillButton active={route.priceType === 'total'} onClick={() => onUpdate({ priceType: 'total' })}>Fixe</PillButton>
                <PillButton active={route.priceType === 'per_person'} onClick={() => onUpdate({ priceType: 'per_person' })}>/pers.</PillButton>
              </Stack>
            </FormRow>
            <FormRow
              compact
              label={route.priceType === 'per_person' ? 'MAD/pers.' : 'MAD total'}
              schemaPath={
                route.priceType === 'per_person'
                  ? 'transportServices[].pricing.pricePerPerson'
                  : 'transportServices[].pricing.amount'
              }
              inSchema
            >
              <TextInput
                type="number"
                value={route.priceType === 'per_person' ? route.pricePerPerson ?? route.price : route.price}
                onChange={e => {
                  const v = Number(e.target.value);
                  onUpdate(route.priceType === 'per_person' ? { pricePerPerson: v, price: v } : { price: v });
                }}
              />
            </FormRow>
            <FormRow compact label="Durée" schemaPath="transportServices[].route.estimatedDuration" inSchema>
              <TextInput value={route.estimatedDuration} onChange={e => onUpdate({ estimatedDuration: e.target.value })} placeholder="45 min" />
            </FormRow>
            <FormRow compact label="Max pers." schemaPath="transportServices[].capacity.maxPassengers" inSchema>
              <TextInput type="number" value={route.maxPassengers} onChange={e => onUpdate({ maxPassengers: Math.max(1, Number(e.target.value) || 1) })} />
            </FormRow>
            <FormRow compact label="Description" optional schemaPath="transportServices[].description.fr" inSchema>
              <TextArea rows={1} value={route.descriptionFr} onChange={e => onUpdate({ descriptionFr: e.target.value })} />
            </FormRow>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

