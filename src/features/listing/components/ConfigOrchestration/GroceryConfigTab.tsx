// Courses — liste libre + frais de service
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import {
  SectionHeader,
  Card,
  FormRow,
  NumInput,
  TextInput,
  TextArea,
  DayPills,
  SlotPills,
  WhenOffNote,
} from './SHARED';

const DEFAULT_SLOT_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const DEFAULT_GROCERY = {
  enabled: true,
  serviceFee: 50,
  currency: 'MAD',
  deliveryLeadTimeHours: 24,
  availability: {
    daysOfWeek: [0, 1, 2, 3, 4, 5],
    timeSlots: ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'],
  },
  noteToGuest:
    "Saisissez librement votre liste de courses. Sojori s'occupe de tout. Frais de service ajoutés à la facture.",
};

function mapFromConciergeDoc(doc) {
  const svc = doc?.groceryServices?.[0];
  if (!svc) {
    return { ...DEFAULT_GROCERY };
  }
  return {
    enabled: svc.enabled !== false,
    serviceFee: svc.pricing?.serviceFee ?? DEFAULT_GROCERY.serviceFee,
    currency: svc.pricing?.currency ?? 'MAD',
    deliveryLeadTimeHours: DEFAULT_GROCERY.deliveryLeadTimeHours,
    availability: { ...DEFAULT_GROCERY.availability },
    noteToGuest: svc.description?.fr || svc.name?.fr || DEFAULT_GROCERY.noteToGuest,
    _serviceId: svc.id,
  };
}

function mapToConciergeGrocery(config, existingDoc) {
  const base = existingDoc?.groceryServices?.[0];
  const id = config._serviceId || base?.id || 'grocery_default';
  const groceryService = {
    id,
    enabled: true,
    name: {
      fr: 'Courses',
      en: 'Groceries',
      ar: 'بقالة',
    },
    description: {
      fr: config.noteToGuest,
      en: config.noteToGuest,
      ar: config.noteToGuest,
    },
    pricing: {
      type: 'service_fee_only',
      serviceFee: Number(config.serviceFee) || 0,
      currency: config.currency || 'MAD',
      explanation: {
        fr: `Frais de service ${config.serviceFee} ${config.currency || 'MAD'}`,
        en: `Service fee ${config.serviceFee} ${config.currency || 'MAD'}`,
        ar: '',
      },
    },
    clientFields: base?.clientFields || {},
    availability: base?.availability || { type: 'always' },
    requiresPMValidation: base?.requiresPMValidation ?? true,
    images: base?.images || [],
  };
  return {
    transportServices: existingDoc?.transportServices || [],
    groceryServices: [groceryService],
    customServices: existingDoc?.customServices || [],
  };
}

interface Props {
  listingId?: string;
  ownerId?: string;
  templateOwnerKey?: string;
}

export default function GroceryConfigTab({ listingId, templateOwnerKey }: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const [config, setConfig] = useState(DEFAULT_GROCERY);
  const [rawDoc, setRawDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState('idle');

  const patch = useCallback(p => setConfig(c => ({ ...c, ...p })), []);
  const patchAvail = useCallback(
    p => setConfig(c => ({ ...c, availability: { ...c.availability, ...p } })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        if (cancelled) return;
        const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
        const concierge = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
        setRawDoc({ groceryServices: concierge.groceryServices, transportServices: concierge.transportServices });
        setConfig(mapFromConciergeDoc({ groceryServices: concierge.groceryServices }));
      } else if (listingId) {
        const res = await listingsService.getListingConciergeConfig(listingId);
        if (cancelled) return;
        if (res.data) {
          setRawDoc(res.data);
          setConfig(mapFromConciergeDoc(res.data));
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, isOwnerTemplate, templateOwnerKey]);

  const save = useCallback(async () => {
    setSavingState('saving');
    const body = mapToConciergeGrocery(config, rawDoc);
    if (isOwnerTemplate && templateOwnerKey) {
      const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
      const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
      const prev = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
      await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'concierge', {
        transportServices: prev.transportServices || [],
        groceryServices: body.groceryServices,
        customServices: prev.customServices || [],
      });
      setRawDoc(prev => ({ ...(prev || {}), groceryServices: body.groceryServices }));
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 2000);
      return;
    }
    if (!listingId) return;
    const res = await listingsService.updateListingConciergeServices(listingId, body);
    if (!res.error) {
      setRawDoc(prev => ({ ...(prev || {}), ...body }));
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 2000);
    } else {
      setSavingState('idle');
    }
  }, [config, listingId, rawDoc, isOwnerTemplate, templateOwnerKey]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => save(), 900);
    return () => clearTimeout(t);
  }, [config, loading, save]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      {savingState !== 'idle' && (
        <Typography
          sx={{
            mb: 1.5,
            fontSize: 10.5,
            color: savingState === 'saved' ? T.success : T.text3,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
          }}
        >
          {savingState === 'saving' ? '⏳ Enregistrement…' : '✓ Sauvegardé'}
        </Typography>
      )}

      <SectionHeader
        icon="🛒"
        title="Courses"
        badge="WA · OUI"
        badgeKind="wa-yes"
        subtitle={
          <>
            Liste libre + frais de service pour ce logement.
          </>
        }
      />

      <Card icon="💰" title="Frais de service" subtitle="Facturés en plus du coût réel des courses">
        <FormRow
          label="Frais de service"
          required
          help="Forfait facturé au voyageur"


        >
          <Box sx={{ maxWidth: 200 }}>
            <NumInput
              value={config.serviceFee}
              suffix="MAD"
              min={0}
              onChange={e => patch({ serviceFee: Number(e.target.value) })}
            />
          </Box>
        </FormRow>
        <FormRow label="Devise">
          <Box sx={{ maxWidth: 120 }}>
            <TextInput value={config.currency} onChange={e => patch({ currency: e.target.value })} />
          </Box>
        </FormRow>
      </Card>

      <Card icon="📅" title="Disponibilités" subtitle="Estimation pour le voyageur (enregistrement à venir)">
        <FormRow label="Jours disponibles" help="Jours où les courses sont possibles">
          <DayPills value={config.availability.daysOfWeek} onChange={v => patchAvail({ daysOfWeek: v })} />
        </FormRow>
        <FormRow label="Créneaux horaires">
          <SlotPills
            value={config.availability.timeSlots}
            options={DEFAULT_SLOT_OPTIONS}
            onChange={v => patchAvail({ timeSlots: v })}
          />
        </FormRow>
        <FormRow label="Délai minimum" help="Heures entre commande et livraison estimée">
          <Box sx={{ maxWidth: 160 }}>
            <NumInput
              value={config.deliveryLeadTimeHours}
              suffix="HEURES"
              min={1}
              onChange={e => patch({ deliveryLeadTimeHours: Number(e.target.value) })}
            />
          </Box>
        </FormRow>
      </Card>

      <Card icon="📝" title="Note voyageur" subtitle="Texte affiché au voyageur">
        <FormRow label="Note">
          <TextArea
            rows={3}
            value={config.noteToGuest}
            onChange={e => patch({ noteToGuest: e.target.value })}
            placeholder="Saisissez librement votre liste de courses…"
          />
        </FormRow>
      </Card>

      <WhenOffNote>
        <b style={{ color: T.text }}>Quand courses est désactivé</b>, le service n’est plus proposé au voyageur.
        Pas de catalogue produits — demande en texte libre + frais de service.
      </WhenOffNote>
    </Box>
  );
}
