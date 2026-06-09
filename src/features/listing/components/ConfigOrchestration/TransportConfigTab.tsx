// Transport — FR uniquement · transportServices[]
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress, IconButton, Collapse, Alert } from '@mui/material';
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
import { SOJORI_TOKENS as T } from './types';
import {
  Card,
  FormRow,
  TextInput,
  TextArea,
  ConfigIntroBar,
  PillButton,
  LockedPropertyBox,
  PlaceEndpointField,
  TYPO,
} from './SHARED';
import { DashedAddButton } from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import {
  createBlankTransportRoute,
  TRANSPORT_JOURNEY_OPTIONS,
  journeyLabel,
  type TransportExternalKind,
  type TransportJourneyTag,
  type TransportPriceType,
  type TransportRouteItem,
} from './transportRouteCatalog';
import { listingPropertyFromValues, type ListingPropertyPlace } from './transportListingProperty';
import { migrateJourneyTag, syncRouteEndpoints, TRANSPORT_V1_NOTE } from './transportRouteRules';
import CityAssociationField from './CityAssociationField';

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
  const propertyPlace: ListingPropertyPlace = {
    name: route.propertyName || fallbackProperty.name,
    address: route.propertyAddress || fallbackProperty.address,
    lat: route.propertyLat ?? fallbackProperty.lat,
    lng: route.propertyLng ?? fallbackProperty.lng,
  };
  const draft: TransportRouteItem = {
    id: String(t.id || `route_${i}`),
    labelFr: name.fr || 'Route',
    descriptionFr: desc.fr || '',
    from: route.from || '',
    to: route.to || '',
    journeyTag: (route.journeyTag as TransportJourneyTag) || 'other',
    externalLabel:
      route.externalLabel ||
      (route.journeyTag === 'departure' ? route.to : route.from) ||
      '',
    externalKind: route.externalKind || 'other',
    propertyPlace,
    priceType: pricing.type === 'per_person' ? 'per_person' : 'total',
    price: Number(pricing.amount) || 0,
    pricePerPerson: Number(pricing.pricePerPerson) || 0,
    maxPassengers: Number(capacity.maxPassengers) || 4,
    estimatedDuration: route.estimatedDuration || '',
    enabled: t.enabled !== false,
    order: i,
    cityIds: (t.cityIds as 'all' | string[] | undefined) ?? 'all',
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
    cityIds: synced.cityIds ?? 'all',
  };
}

interface Props {
  listingId?: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  templateOwnerKey?: string;
}

export default function TransportConfigTab({
  listingId = '',
  listingValues = {},
  templateOwnerKey,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const isAdminGlobalTemplate = templateOwnerKey === 'global';
  const listingProperty = listingPropertyFromValues(listingValues);

  const [routes, setRoutes] = useState<TransportRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
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
        let transport: Array<Record<string, unknown>> | undefined;
        if (isOwnerTemplate && templateOwnerKey) {
          const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
          const payload = (res as { data?: { concierge?: { transportServices?: unknown[] } } })?.data ?? res;
          transport = (payload as { concierge?: { transportServices?: unknown[] } })?.concierge
            ?.transportServices as Array<Record<string, unknown>> | undefined;
        } else if (listingId) {
          const res = await listingsService.getListingConciergeConfig(listingId);
          transport = (res.data as { transportServices?: Array<Record<string, unknown>> } | null)
            ?.transportServices;
        }
        if (Array.isArray(transport) && transport.length > 0) {
          setRoutes(transport.map((t, i) => mapApiRoute(t, i, listingProperty)));
        } else {
          setRoutes([]);
        }
      } catch {
        setRoutes([]);
      } finally {
        setLoading(false);
        hydratedRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch si autre listing
  }, [listingId, isOwnerTemplate, templateOwnerKey]);

  const persist = useCallback(async () => {
    if (isAdminGlobalTemplate) return;
    setSavingState('saving');
    try {
      const transportServices = routesRef.current.map((r, i) => routeToApi(r, i, listingProperty));
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
        const prev = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
        await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'concierge', {
          transportServices,
          groceryServices: prev.groceryServices || [],
          customServices: prev.customServices || [],
        });
      } else if (listingId) {
        const existing = await listingsService.getListingConciergeConfig(listingId);
        const doc = (existing.data || {}) as { groceryServices?: unknown[]; customServices?: unknown[] };
        await listingsService.updateListingConciergeServices(listingId, {
          transportServices,
          groceryServices: doc.groceryServices || [],
          customServices: doc.customServices || [],
        });
      }
      setSavingState('saved');
    } catch {
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, listingProperty, isOwnerTemplate, templateOwnerKey, isAdminGlobalTemplate]);

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

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
      </Box>
    );
  }

  const readOnly = isAdminGlobalTemplate;

  return (
    <Box>
      {readOnly && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Le transport n’est <strong>pas</strong> configuré au niveau Admin. Chaque PM ajoute ses navettes
          manuellement (non synchronisées depuis le template global).
        </Alert>
      )}

      <ConfigIntroBar saveState={readOnly ? 'idle' : savingState}>
        <b>Arrivée</b> : navette → logement <b>{listingProperty.name || 'Logement'}</b> (fixe). <b>Départ</b> : logement →
        navette. Ajoutez vos routes manuellement — aucun modèle prérempli. {TRANSPORT_V1_NOTE}
      </ConfigIntroBar>

      <Box sx={readOnly ? { opacity: 0.55, pointerEvents: 'none', userSelect: 'none' } : undefined}>
      <Card compact icon="📍" title={`Routes · ${routes.length}/${MAX_ROUTES}`}>
        {routes.length === 0 && (
          <Typography sx={{ ...TYPO.caption, color: T.text3, mb: 1 }}>
            Aucune route. Cliquez « + Route » pour en créer une.
          </Typography>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routes.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <Stack sx={{ gap: 1 }}>
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

        {routes.length < MAX_ROUTES && !readOnly && (
          <Box sx={{ mt: 1 }}>
            <DashedAddButton
              label="+ Route"
              onClick={() =>
                mutateRoutes(prev => [
                  ...prev,
                  syncRouteEndpoints(createBlankTransportRoute(prev.length), listingProperty),
                ])
              }
            />
          </Box>
        )}
      </Card>
      </Box>
    </Box>
  );
}

function RoutePlaceCell({
  label,
  locked,
  place,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  locked: boolean;
  place: ListingPropertyPlace;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  if (locked) {
    return <LockedPropertyBox name={place.name} address={place.address} label={label} />;
  }
  return (
    <PlaceEndpointField label={label} value={value} onChange={onChange} placeholder={placeholder} />
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
  const externalValue = route.externalLabel || '';

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
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, p: '8px 10px', bgcolor: T.bg2 }}>
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
            {route.from || '…'} → {route.to || '…'} · {journeyLabel(route.journeyTag)} · {priceLabel}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ p: 0.25 }}>
          <Typography sx={{ fontSize: 14 }}>{expanded ? '▲' : '▼'}</Typography>
        </IconButton>
        <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.25 }}>✕</IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ p: 1.25 }}>
          <FormRow compact label="Type">
            <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
              {TRANSPORT_JOURNEY_OPTIONS.map(tag => (
                <PillButton
                  key={tag}
                  active={route.journeyTag === tag}
                  onClick={() =>
                    onUpdate(migrateJourneyTag(route, place, tag))
                  }
                >
                  {journeyLabel(tag)}
                </PillButton>
              ))}
            </Stack>
          </FormRow>

          <Box
            sx={{
              mb: 1.25,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.25,
            }}
          >
            <RoutePlaceCell
              label="Provenance"
              locked={isDeparture}
              place={place}
              value={isOther ? route.from : externalValue}
              onChange={v =>
                onUpdate(isOther ? { from: v, externalLabel: v } : { externalLabel: v })
              }
              placeholder="Ex. Aéroport Marrakech, Gare Casa-Voyageurs…"
            />
            <RoutePlaceCell
              label="Destination"
              locked={isArrival}
              place={place}
              value={isOther ? route.to : externalValue}
              onChange={v => onUpdate(isOther ? { to: v } : { externalLabel: v })}
              placeholder="Ex. Aéroport Mohammed V, Marina…"
            />
          </Box>
          <Typography sx={{ ...TYPO.caption, color: T.text3, mb: 1.25 }}>
            {isArrival &&
              'Arrivée : provenance modifiable (navette) · destination = votre logement (fixe).'}
            {isDeparture &&
              'Départ : provenance = logement (fixe) · destination modifiable (navette).'}
            {isOther && 'Autre : provenance et destination libres.'}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0 }}>
            <FormRow compact label="Nom affiché">
              <TextInput value={route.labelFr} onChange={e => onUpdate({ labelFr: e.target.value })} />
            </FormRow>
            <FormRow compact label="Tarif">
              <Stack direction="row" sx={{ gap: 0.5 }}>
                <PillButton active={route.priceType === 'total'} onClick={() => onUpdate({ priceType: 'total' })}>Fixe</PillButton>
                <PillButton active={route.priceType === 'per_person'} onClick={() => onUpdate({ priceType: 'per_person' })}>/pers.</PillButton>
              </Stack>
            </FormRow>
            <FormRow compact label={route.priceType === 'per_person' ? 'MAD/pers.' : 'MAD total'}>
              <TextInput
                type="number"
                value={route.priceType === 'per_person' ? route.pricePerPerson ?? route.price : route.price}
                onChange={e => {
                  const v = Number(e.target.value);
                  onUpdate(route.priceType === 'per_person' ? { pricePerPerson: v, price: v } : { price: v });
                }}
              />
            </FormRow>
            <FormRow compact label="Durée">
              <TextInput value={route.estimatedDuration} onChange={e => onUpdate({ estimatedDuration: e.target.value })} placeholder="45 min" />
            </FormRow>
            <FormRow compact label="Max pers.">
              <TextInput type="number" value={route.maxPassengers} onChange={e => onUpdate({ maxPassengers: Math.max(1, Number(e.target.value) || 1) })} />
            </FormRow>
            <FormRow compact label="Description" optional>
              <TextArea rows={1} value={route.descriptionFr} onChange={e => onUpdate({ descriptionFr: e.target.value })} />
            </FormRow>
            <FormRow compact label="Villes" optional>
              <CityAssociationField
                compact
                value={route.cityIds}
                onChange={cityIds => onUpdate({ cityIds })}
              />
            </FormRow>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

