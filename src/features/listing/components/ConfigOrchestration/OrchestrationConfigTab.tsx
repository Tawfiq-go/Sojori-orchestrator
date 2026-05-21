import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import { SectionHeader, Card, FormRow, WhenOffNote, Toggle } from './SHARED';

const ORCH_FLAGS = [
  { key: 'orchestration_choose_arrival', label: 'Choisir arrivée' },
  { key: 'orchestration_choose_departure', label: 'Choisir départ' },
  { key: 'orchestration_declare_arrival', label: 'Déclarer arrivée' },
  { key: 'orchestration_declare_departure', label: 'Déclarer départ' },
  { key: 'orchestration_registration', label: 'Enregistrement voyageurs' },
  { key: 'orchestration_cleaning_free', label: 'Ménage gratuit' },
  { key: 'orchestration_cleaning_paid', label: 'Ménage payant' },
  { key: 'orchestration_cleaning_sojori', label: 'Ménage Sojori auto' },
  { key: 'orchestration_transport', label: 'Transport' },
  { key: 'orchestration_grocery', label: 'Courses' },
  { key: 'orchestration_custom', label: 'Conciergerie / custom' },
  { key: 'orchestration_support', label: 'Support' },
];

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
}

export default function OrchestrationConfigTab({ listingValues = {} }: Props) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const cleaningOrch = (listingValues.cleaningOrchestration as { enabled?: boolean }) || {};

  useEffect(() => {
    const next = {};
    ORCH_FLAGS.forEach(({ key }) => {
      next[key] = listingValues[key] !== false;
    });
    setFlags(next);
  }, [listingValues]);

  const toggleFlag = key => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box>
      <SectionHeader
        icon="🧼"
        title="Automatisations"
        badge="OPS · PART"
        badgeKind="wa-partial"
        subtitle={
          <>
            Interrupteurs <b>orchestration_*</b> sur le listing (srv-listing). Sauvegarde via le formulaire listing principal — pas WhatsApp.
          </>
        }
      />

      <Card icon="🔀" title="Catégories orchestration" subtitle="Champs listing.orchestration_*" meta="listing">
        <Stack gap={0}>
          {ORCH_FLAGS.map(({ key, label }) => (
            <FormRow key={key} label={label} schemaPath={`listing.${key}`} inSchema>
              <Stack direction="row" alignItems="center" gap={1}>
                <Toggle on={!!flags[key]} onChange={() => toggleFlag(key)} />
                <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
                  {flags[key] ? 'ON' : 'OFF'}
                </Typography>
              </Stack>
            </FormRow>
          ))}
        </Stack>
      </Card>

      <Card icon="🧹" title="Ménage automatique Sojori" meta="cleaningOrchestration">
        <FormRow label="Orchestration ménage" schemaPath="cleaningOrchestration.enabled" inSchema>
          <Toggle
            on={!!cleaningOrch.enabled}
            onChange={() => {
              /* lecture seule ici — éditer via onglet Ménage ou save listing */
            }}
          />
        </FormRow>
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
          Édition complète : onglet « Ménage » (config legacy) ou champs cleaningOrchestration sur le listing.
        </Typography>
      </Card>

      <WhenOffNote>
        Les créneaux IN/OUT et templates messages orchestrateur restent dans l’onglet <b>Config orchestration</b> (7 onglets) et srv-orchestrator — hors collection « automatisations » dédiée.
      </WhenOffNote>
    </Box>
  );
}
