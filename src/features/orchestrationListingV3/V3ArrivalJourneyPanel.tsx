import { Box, Typography } from '@mui/material';
import { V3 } from './theme';

type Props = {
  receptionMode?: string | null;
};

const MODE_STUBS: Record<string, { fr: string; en: string }> = {
  autonomous: {
    fr: 'Vous entrez seuls. Codes / adresse selon planning.',
    en: 'Self check-in. Codes / address according to schedule.',
  },
  assisted: {
    fr: 'Quelqu’un vous accueille sur place.',
    en: 'Someone welcomes you on site.',
  },
  reception: {
    fr: 'Présentez-vous à la réception / desk.',
    en: 'Check in at the front desk / reception.',
  },
};

const STEPS = [
  { key: 'arrival_choose', label: 'Heure d’arrivée' },
  { key: 'registration', label: 'Pièces d’identité' },
  { key: 'contract', label: 'Contrat digital' },
] as const;

export function V3ArrivalJourneyPanel({ receptionMode }: Props) {
  const mode = String(receptionMode || 'assisted').toLowerCase();
  const stub =
    MODE_STUBS[mode] ??
    MODE_STUBS.assisted;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Mode d’entrée (stub)</Typography>
        <Typography sx={{ fontSize: 13, color: V3.t2 }}>{stub.fr}</Typography>
        <Typography sx={{ fontSize: 12, color: V3.t3, mt: 0.5 }}>{stub.en}</Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
          Étapes Check-In — obligatoire / optionnel (stub)
        </Typography>
        {STEPS.map((step) => (
          <Typography key={step.key} sx={{ fontSize: 13, color: V3.t2, mb: 0.5 }}>
            · {step.label} — statut lu depuis la config heure / enregistrement / contrat (V1)
          </Typography>
        ))}
        <Typography sx={{ fontSize: 12, color: V3.t3, mt: 1 }}>
          Le message Parcours Arrivée (menu C) compose mode + étapes actives + fait / à faire.
        </Typography>
      </Box>
    </Box>
  );
}
