import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import {
  SectionHeader,
  Card,
  FormRow,
  NumInput,
  TextInput,
  AddRowBtn,
  WhenOffNote,
} from './SHARED';

interface Subject {
  id: string;
  labelFr: string;
  enabled: boolean;
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'billing', labelFr: 'Facturation', enabled: true },
  { id: 'booking', labelFr: 'Modification réservation', enabled: true },
];

interface Props {
  listingId: string;
  ownerId?: string;
}

/** Design Claude complet · collection srv-listing à brancher */
export default function ServiceClientConfigTab({ listingId }: Props) {
  const [slaHours, setSlaHours] = useState(4);
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);

  const addSubject = () => {
    setSubjects(s => [
      ...s,
      { id: `sub_${Date.now()}`, labelFr: 'Nouvel objet', enabled: true },
    ]);
  };

  return (
    <Box>
      <SectionHeader
        icon="💌"
        title="Service client"
        badge="WA · OUI"
        badgeKind="wa-yes"
        subtitle={
          <>
            Bouton « Service client » dans WhatsApp. <b>Activation</b> : <b>Menu WhatsApp</b>. Collection dédiée : à créer.
          </>
        }
      />

      <Card icon="⏱️" title="SLA & objets" meta="serviceClient (futur)">
        <FormRow label="Délai de réponse (h)" schemaPath={null} inSchema={false}>
          <Box sx={{ maxWidth: 160 }}>
            <NumInput value={slaHours} suffix="H" min={1} onChange={e => setSlaHours(Number(e.target.value))} />
          </Box>
        </FormRow>

        {subjects.map((sub, idx) => (
          <FormRow
            key={sub.id}
            label={`Objet ${idx + 1}`}
            schemaPath={null}
            inSchema={false}
            help="Mockup · subjects[]"
          >
            <TextInput
              value={sub.labelFr}
              onChange={e => {
                const v = e.target.value;
                setSubjects(list => list.map(x => (x.id === sub.id ? { ...x, labelFr: v } : x)));
              }}
            />
          </FormRow>
        ))}

        <AddRowBtn onClick={addSubject}>+ Ajouter un objet</AddRowBtn>
      </Card>

      <WhenOffNote>
        Listing <code>{listingId}</code> · branchement API <code>service-client-config</code> prévu dans srv-listing (non déployé). UI prête selon design Claude (39).
      </WhenOffNote>
    </Box>
  );
}
