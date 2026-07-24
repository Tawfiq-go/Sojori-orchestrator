import { useCallback, useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import {
  loadOwnerOrchestrationFlags,
  saveOwnerOrchestrationFlags,
} from '../../utils/adminOrchestrationTemplate';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';
import { SOJORI_TOKENS as T } from './types';
import { SectionHeader, Card, FormRow, Toggle, ConfigIntroBar } from './SHARED';

const ORCH_FLAGS = [
  { key: 'orchestrationEnabled', label: 'Orchestration active' },
  { key: 'orchestration_choose_arrival', label: 'Choisir heure arrivée' },
  { key: 'orchestration_choose_departure', label: 'Choisir heure départ' },
  { key: 'orchestration_declare_arrival', label: 'Déclarer arrivée' },
  { key: 'orchestration_declare_departure', label: 'Déclarer départ' },
  { key: 'orchestration_receive_arrival', label: 'Accueil arrivée' },
  { key: 'orchestration_receive_departure', label: 'Accueil départ' },
  { key: 'orchestration_inform_syndic', label: 'Informer syndic' },
  { key: 'orchestration_registration', label: 'Enregistrement voyageurs' },
  { key: 'orchestration_cleaning_free', label: 'Ménage gratuit' },
  { key: 'orchestration_cleaning_paid', label: 'Ménage payant' },
  { key: 'orchestration_cleaning_sojori', label: 'Ménage Sojori auto' },
  { key: 'orchestration_transport', label: 'Transport' },
  { key: 'orchestration_grocery', label: 'Courses' },
  { key: 'orchestration_custom', label: 'Conciergerie / custom' },
  { key: 'orchestration_support', label: 'Support' },
  { key: 'orchestration_service_client', label: 'Service client' },
] as const;

type Props = {
  ownerKey: string;
  templateLabel: string;
};

export default function OwnerOrchestrationFlagsTab({ ownerKey, templateLabel }: Props) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { flags: f, source } = await loadOwnerOrchestrationFlags(ownerKey);
      logOrchConfig('flags.load ←', { ownerKey, source, flags: f });
      const next: Record<string, boolean> = {};
      ORCH_FLAGS.forEach(({ key }) => {
        next[key] = f[key] !== false;
      });
      setFlags(next);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Chargement template impossible');
    } finally {
      setLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (field: string, checked: boolean) => {
    setSavingField(field);
    setSaveState('saving');
    try {
      const via = await saveOwnerOrchestrationFlags(ownerKey, { ...flags, [field]: checked });
      logOrchConfig('flags.toggle ← OK', { ownerKey, field, checked, via });
      setFlags((prev) => ({ ...prev, [field]: checked }));
      setSaveState('saved');
    } catch (e: unknown) {
      orchConfigError('flags.toggle ← FAIL', e, { ownerKey, field, checked });
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setSaveState('idle');
      throw e;
    } finally {
      setSavingField(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Chargement template orchestration…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={saveState}>
        Template orchestration <b>{templateLabel}</b> — appliqué aux nouveaux logements et à la
        synchronisation propriétaire.
      </ConfigIntroBar>

      <SectionHeader
        icon="⚡"
        title="Orchestration (template)"
        badge="TEMPLATE"
        badgeKind="wa-partial"
        subtitle="Catégories ON/OFF par défaut pour les annonces de ce propriétaire."
      />

      <Card icon="🔀" title="Configuration" subtitle={templateLabel}>
        {ORCH_FLAGS.map(({ key, label }) => (
          <FormRow key={key} label={label}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Toggle
                on={flags[key] !== false}
                onChange={() => {
                  const next = !(flags[key] !== false);
                  setFlags((p) => ({ ...p, [key]: next }));
                  void persist(key, next).catch(() => setFlags((p) => ({ ...p, [key]: !next })));
                }}
                disabled={savingField === key}
              />
              <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: 'monospace' }}>
                {flags[key] !== false ? 'ON' : 'OFF'}
              </Typography>
            </Stack>
          </FormRow>
        ))}
      </Card>
    </Box>
  );
}
