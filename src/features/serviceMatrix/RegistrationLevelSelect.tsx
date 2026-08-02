// ════════════════════════════════════════════════════════════════════
// RegistrationLevelSelect — simple (passeport OCR) vs complet (fiche police)
// Stocké dans capabilities.registration.gestion.registrationLevel
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
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

export type RegistrationLevel = 'simple' | 'complete';

type Props = {
  listingId?: string;
  ownerKey?: string;
};

type AnyOrchestrationDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

function normalizeLevel(raw: unknown): RegistrationLevel {
  return raw === 'complete' ? 'complete' : 'simple';
}

export function RegistrationLevelSelect({ listingId, ownerKey }: Props) {
  const [doc, setDoc] = useState<AnyOrchestrationDoc | null>(null);
  const [value, setValue] = useState<RegistrationLevel>('simple');
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
      const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      setValue(normalizeLevel(gestion.registrationLevel));
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerKey, ownerMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChange = async (next: RegistrationLevel) => {
    if (!doc || saving || next === value) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<
      string,
      unknown
    >;
    const gestion = { ...existingGestion, registrationLevel: next };
    try {
      if (ownerMode) {
        await saveOwnerGestion({
          ownerKey: ownerKey as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as OwnerOrchestrationDoc,
        });
      } else {
        await saveListingGestion({
          listingId: listingId as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as ListingOrchestrationDoc,
        });
      }
      setValue(next);
      toast.success(
        next === 'complete'
          ? 'Enregistrement : mode complet (fiche police)'
          : 'Enregistrement : mode simple (passeport OCR)',
      );
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
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
        Type d&apos;enregistrement
      </Typography>
      <FormControl disabled={saving || !doc} fullWidth>
        <RadioGroup
          value={value}
          onChange={(e) => void handleChange(e.target.value as RegistrationLevel)}
        >
          <FormControlLabel
            value="simple"
            control={<Radio size="small" />}
            label={
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Simple — passeport</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  OCR enrichi : identité, nationalité, date de naissance, n° document (+ photo).
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="complete"
            control={<Radio size="small" />}
            label={
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  Complet — fiche de police
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Simple + profession, domicile, provenance / destination, lieu de naissance,
                  délivrance du document, contacts…
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>
      {value === 'complete' && (
        <Typography sx={{ fontSize: 12, color: '#b42318', mt: 1, fontWeight: 600 }}>
          En mode complet, les champs manquants s&apos;affichent en rouge tant que la fiche
          n&apos;est pas prête.
        </Typography>
      )}
    </Box>
  );
}

export default RegistrationLevelSelect;
