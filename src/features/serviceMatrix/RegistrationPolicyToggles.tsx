// ════════════════════════════════════════════════════════════════════
// RegistrationPolicyToggles — requiredBeforeArrival + blocksAccess
// Stocké dans capabilities.registration.gestion
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  saveListingGestion,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';
import {
  saveOwnerGestion,
  type OwnerOrchestrationDoc,
} from '../orchestrationListingV3/ownerOrchestrationApi';
import { DEFAULT_REGISTRATION_POLICIES, readOptionalBoolean } from '../guestDocuments';

type Props = {
  listingId?: string;
  ownerKey?: string;
  capabilityKey?: 'registration';
  title?: string;
};

type AnyOrchestrationDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

export function RegistrationPolicyToggles({
  listingId,
  ownerKey,
  capabilityKey = 'registration',
  title = 'Enregistrement voyageurs',
}: Props) {
  const [doc, setDoc] = useState<AnyOrchestrationDoc | null>(null);
  const [requiredBeforeArrival, setRequiredBeforeArrival] = useState(
    DEFAULT_REGISTRATION_POLICIES.requiredBeforeArrival,
  );
  const [blocksAccess, setBlocksAccess] = useState(DEFAULT_REGISTRATION_POLICIES.blocksAccess);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const ownerMode = !listingId && Boolean(ownerKey);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = (ownerMode
        ? await listingsService.getOwnerOrchestrationCompiled(ownerKey as string)
        : await listingsService.getListingOrchestrationCompiled(listingId as string)) as
        | { data?: unknown }
        | AnyOrchestrationDoc
        | null;
      const d = (raw && typeof raw === 'object' && 'data' in raw && raw.data
        ? raw.data
        : raw) as AnyOrchestrationDoc | null;
      setDoc(d ?? null);
      const gestion = (d?.capabilities?.[capabilityKey]?.gestion ?? {}) as Record<string, unknown>;
      const required =
        readOptionalBoolean(gestion.requiredBeforeArrival) ??
        DEFAULT_REGISTRATION_POLICIES.requiredBeforeArrival;
      const blocks =
        readOptionalBoolean(gestion.blocksAccess) ??
        (required ? DEFAULT_REGISTRATION_POLICIES.blocksAccess : false);
      setRequiredBeforeArrival(required);
      setBlocksAccess(required ? blocks : false);
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerKey, ownerMode, capabilityKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextRequired: boolean, nextBlocks: boolean) => {
    if (!doc || saving) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.[capabilityKey]?.gestion ?? {}) as Record<
      string,
      unknown
    >;
    const blocks = nextRequired ? nextBlocks : false;
    const gestion = {
      ...existingGestion,
      requiredBeforeArrival: nextRequired,
      blocksAccess: blocks,
    };
    try {
      if (ownerMode) {
        await saveOwnerGestion({
          ownerKey: ownerKey as string,
          capabilityKey,
          gestion,
          doc: doc as OwnerOrchestrationDoc,
        });
      } else {
        await saveListingGestion({
          listingId: listingId as string,
          capabilityKey,
          gestion,
          doc: doc as ListingOrchestrationDoc,
        });
      }
      setRequiredBeforeArrival(nextRequired);
      setBlocksAccess(blocks);
      toast.success(`${title} : politique mise à jour`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Chargement…</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid rgba(26,22,17,0.10)',
        borderRadius: 2,
        px: 2,
        py: 1.5,
        mt: 1.5,
        background: '#fff',
        display: 'grid',
        gap: 1.25,
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={requiredBeforeArrival}
            disabled={saving || !doc}
            onChange={(e) => {
              const next = e.target.checked;
              void persist(next, next ? blocksAccess || DEFAULT_REGISTRATION_POLICIES.blocksAccess : false);
            }}
            size="small"
          />
        }
        label={
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            Enregistrement obligatoire avant l&apos;arrivée
          </Typography>
        }
      />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: -0.5 }}>
        {requiredBeforeArrival
          ? 'Compte dans la progression Enregistrement x/y. Le voyageur doit compléter l’identité avant l’arrivée.'
          : 'L’enregistrement reste disponible mais optionnel — il ne compte plus dans le total requis.'}
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={blocksAccess}
            disabled={saving || !doc || !requiredBeforeArrival}
            onChange={(e) => void persist(requiredBeforeArrival, e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Bloque l&apos;accès</Typography>
        }
      />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: -0.5 }}>
        {blocksAccess
          ? 'Les codes d’accès (menu F) restent verrouillés tant que l’enregistrement identité n’est pas complété.'
          : requiredBeforeArrival
            ? 'L’enregistrement compte dans la progression, sans verrouiller les codes d’accès.'
            : 'Activez d’abord « obligatoire avant l’arrivée » pour pouvoir bloquer l’accès.'}
      </Typography>
    </Box>
  );
}

export default RegistrationPolicyToggles;
