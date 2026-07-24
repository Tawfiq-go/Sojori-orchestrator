import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import {
  defaultInformSyndicGestion,
  normalizeInformSyndicGestion,
  type InformSyndicDayOffset,
  type InformSyndicGestion,
  type InformSyndicTravelersMode,
} from './informSyndicDefaults';
import { V3 } from './theme';

type Props = {
  gestion: Record<string, unknown>;
  listingNameHint?: string;
  onSave: (next: Record<string, unknown>) => Promise<void>;
};

export default function V3InformSyndicPanel({ gestion, listingNameHint, onSave }: Props) {
  const initial = useMemo(() => normalizeInformSyndicGestion(gestion), [gestion]);
  const [cfg, setCfg] = useState<InformSyndicGestion>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCfg(initial);
  }, [initial]);

  const patch = (partial: Partial<InformSyndicGestion>) => {
    setCfg((prev) => ({ ...prev, ...partial }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(normalizeInformSyndicGestion(cfg) as unknown as Record<string, unknown>);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => setCfg(defaultInformSyndicGestion());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 0.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t1 }}>
        Informer syndic · avant arrivée
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.45 }}>
        Message <strong>template Meta</strong> (numéro staff) hors fenêtre 24h, avec bouton Flow
        « Voir passeports ». Destinataires = <code>listing.syndics</code>. Parcours Arrivée &amp;
        départ (message, pas une tâche staff).
        {listingNameHint ? (
          <>
            {' '}
            Nom BD : <strong>{listingNameHint}</strong>
          </>
        ) : null}
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={cfg.useListingNameFromDb}
            onChange={(e) => patch({ useListingNameFromDb: e.target.checked })}
          />
        }
        label="Utiliser le nom du listing (BD)"
      />
      {!cfg.useListingNameFromDb ? (
        <TextField
          size="small"
          label="Nom affiché au syndic"
          value={cfg.listingDisplayName}
          onChange={(e) => patch({ listingDisplayName: e.target.value })}
          fullWidth
        />
      ) : null}

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>Jour d’envoi (check-in)</FormLabel>
        <RadioGroup
          row
          value={String(cfg.dayOffset)}
          onChange={(e) => patch({ dayOffset: Number(e.target.value) as InformSyndicDayOffset })}
        >
          <FormControlLabel value="0" control={<Radio size="small" />} label="J0" />
          <FormControlLabel value="-1" control={<Radio size="small" />} label="J-1" />
          <FormControlLabel value="-2" control={<Radio size="small" />} label="J-2" />
        </RadioGroup>
      </FormControl>

      <TextField
        size="small"
        label="Message (texte libre)"
        value={cfg.messageBody}
        onChange={(e) => patch({ messageBody: e.target.value })}
        multiline
        minRows={6}
        fullWidth
        helperText="Placeholders : {{listingName}} {{checkIn}} {{checkOut}} {{reservationBlock}} {{guestsBlock}}"
      />

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: V3.t1, mt: 0.5 }}>
        Infos réservation
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {(
          [
            ['lastName', 'Nom'],
            ['firstName', 'Prénom'],
            ['nationality', 'Nationalité'],
          ] as const
        ).map(([key, label]) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={cfg.reservationFields[key]}
                onChange={(e) =>
                  patch({
                    reservationFields: { ...cfg.reservationFields, [key]: e.target.checked },
                  })
                }
              />
            }
            label={label}
          />
        ))}
      </Box>

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>Voyageurs enregistrés</FormLabel>
        <RadioGroup
          value={cfg.travelersMode}
          onChange={(e) => patch({ travelersMode: e.target.value as InformSyndicTravelersMode })}
        >
          <FormControlLabel
            value="reservation_guest"
            control={<Radio size="small" />}
            label="Celui qui matche la résa (nom / prénom)"
          />
          <FormControlLabel
            value="all_registered"
            control={<Radio size="small" />}
            label="Tous les voyageurs enregistrés"
          />
        </RadioGroup>
      </FormControl>

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: V3.t1 }}>Champs voyageurs</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {(
          [
            ['lastName', 'Nom'],
            ['firstName', 'Prénom'],
            ['nationality', 'Nationalité'],
            ['passportNumber', 'N° passeport'],
            ['passportImage', 'Image passeport'],
          ] as const
        ).map(([key, label]) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields[key]}
                onChange={(e) =>
                  patch({
                    travelerFields: { ...cfg.travelerFields, [key]: e.target.checked },
                  })
                }
              />
            }
            label={label}
          />
        ))}
      </Box>
      {cfg.travelerFields.passportImage ? (
        <Typography sx={{ fontSize: 11, color: V3.t3, lineHeight: 1.4 }}>
          Si une URL scan est stockée sur le membre, elle est envoyée en image WhatsApp (1 message
          par voyageur), après le texte — même principe que les notifs résa staff.
        </Typography>
      ) : null}

      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Button size="small" variant="contained" disabled={saving} onClick={() => void save()}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button size="small" variant="text" onClick={resetDefaults}>
          Défauts
        </Button>
      </Box>
    </Box>
  );
}
