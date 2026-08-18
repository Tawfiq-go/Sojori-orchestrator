import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
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

import {
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
  type ContractSignatureConfigValue,
} from './contractSignatureDefaults';

type Props = {
  listingId?: string;
  ownerKey?: string;
};

type AnyDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

export function ContractSignatureConfig({ listingId, ownerKey }: Props) {
  const [doc, setDoc] = useState<AnyDoc | null>(null);
  const [value, setValue] = useState<ContractSignatureConfigValue>(DEFAULT_CONTRACT_SIGNATURE);
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
        | AnyDoc
        | null;
      const d = (raw && typeof raw === 'object' && 'data' in raw && raw.data
        ? raw.data
        : raw) as AnyDoc | null;
      setDoc(d ?? null);
      const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      const compiled = (d as { contractSignature?: unknown } | null)?.contractSignature;
      setValue(parseContractSignature(gestion.contractSignature ?? compiled));
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerKey, ownerMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: ContractSignatureConfigValue) => {
    if (!doc || saving) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
    const gestion = { ...existingGestion, contractSignature: next };
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
        next.enabled
          ? 'Signature électronique simple activée'
          : 'Signature électronique simple désactivée',
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
        mt: 2,
        p: 1.5,
        border: '1px solid rgba(26,22,17,0.10)',
        borderRadius: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
        Contrat et signature électronique simple
      </Typography>
      <Alert severity="info" sx={{ mb: 1.5, fontSize: 12.5 }}>
        Signature électronique simple au sens du cadre marocain applicable, notamment la loi n°
        43-20 — non présentée comme avancée ou qualifiée. L&apos;envoi WhatsApp automatique reste
        désactivé tant que les deux options ci-dessous ne sont pas activées.
      </Alert>
      <Stack spacing={1.25}>
        <FormControlLabel
          control={
            <Switch
              checked={value.enabled}
              disabled={saving || !doc}
              onChange={e => void save({ ...value, enabled: e.target.checked })}
            />
          }
          label="Activer le contrat et la signature (pilote manuel dashboard)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={value.autoSendAfterRegistration}
              disabled={saving || !doc || !value.enabled}
              onChange={e => void save({ ...value, autoSendAfterRegistration: e.target.checked })}
            />
          }
          label="Générer et envoyer automatiquement après l’enregistrement"
        />
        <FormControl size="small" fullWidth>
          <TextField
            select
            size="small"
            label="Type de document"
            value={value.documentType}
            disabled={saving || !doc}
            onChange={e =>
              void save({
                ...value,
                documentType: e.target.value as ContractSignatureConfigValue['documentType'],
              })
            }
          >
            <MenuItem value="stay_contract">Contrat de séjour</MenuItem>
            {value.documentType === 'moroccan_police_form' ? (
              <MenuItem value="moroccan_police_form" disabled>
                Fiche de police (placeholder, non officiel)
              </MenuItem>
            ) : null}
          </TextField>
        </FormControl>
        {value.documentType === 'moroccan_police_form' ? (
          <Alert severity="warning" sx={{ fontSize: 12.5 }}>
            La fiche de police marocaine n&apos;est pas un formulaire officiel pour ce pilote. Le
            renderer placeholder est utilisé. Revenez au contrat de séjour.
          </Alert>
        ) : null}
        <FormControl size="small" fullWidth>
          <TextField
            select
            size="small"
            label="Politique de signataire"
            value={value.signerPolicy}
            disabled={saving || !doc}
            onChange={e =>
              void save({
                ...value,
                signerPolicy: e.target.value as ContractSignatureConfigValue['signerPolicy'],
              })
            }
          >
            <MenuItem value="primary_guest">Voyageur principal uniquement</MenuItem>
            <MenuItem value="each_traveler">Chaque voyageur</MenuItem>
          </TextField>
        </FormControl>
        <TextField
          size="small"
          label="Template ID"
          value={value.templateId}
          disabled={saving || !doc}
          onBlur={() => void save(value)}
          onChange={e => setValue({ ...value, templateId: e.target.value })}
        />
      </Stack>
    </Box>
  );
}
