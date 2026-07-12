// ════════════════════════════════════════════════════════════════════
// PreArrivalRequiredToggle — flag « obligatoire avant l'arrivée » par listing
// Stocké dans capabilities[key].gestion.requiredBeforeArrival (défaut true).
// Consommé par le chatbot : verrou du menu F + discours de l'assistant.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  saveListingGestion,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';

type Props = {
  listingId: string;
  capabilityKey: 'registration' | 'arrival_choose';
  title: string;
  helpRequired: string;
  helpOptional: string;
};

export function PreArrivalRequiredToggle({
  listingId,
  capabilityKey,
  title,
  helpRequired,
  helpOptional,
}: Props) {
  const [doc, setDoc] = useState<ListingOrchestrationDoc | null>(null);
  const [value, setValue] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = (await listingsService.getListingOrchestrationCompiled(listingId)) as
        | { data?: unknown }
        | ListingOrchestrationDoc
        | null;
      const d = (raw && typeof raw === 'object' && 'data' in raw && raw.data
        ? raw.data
        : raw) as ListingOrchestrationDoc | null;
      setDoc(d ?? null);
      const gestion = (d?.capabilities?.[capabilityKey]?.gestion ?? {}) as Record<string, unknown>;
      setValue(gestion.requiredBeforeArrival !== false);
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, capabilityKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (next: boolean) => {
    if (!doc || saving) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.[capabilityKey]?.gestion ?? {}) as Record<
      string,
      unknown
    >;
    try {
      await saveListingGestion({
        listingId,
        capabilityKey,
        gestion: { ...existingGestion, requiredBeforeArrival: next },
        doc,
      });
      setValue(next);
      toast.success(
        next ? `${title} : obligatoire avant l'arrivée` : `${title} : possible sur place / optionnel`,
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
      <FormControlLabel
        control={
          <Switch
            checked={value}
            disabled={saving || !doc}
            onChange={(e) => void handleToggle(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            {title} obligatoire avant l'arrivée
          </Typography>
        }
      />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
        {value ? helpRequired : helpOptional}
      </Typography>
    </Box>
  );
}

export default PreArrivalRequiredToggle;
