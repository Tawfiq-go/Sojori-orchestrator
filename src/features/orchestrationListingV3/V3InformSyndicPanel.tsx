import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  defaultInformSyndicGestion,
  normalizeInformSyndicGestion,
  type InformSyndicDayOffset,
  type InformSyndicGestion,
  type InformSyndicTravelersMode,
} from './informSyndicDefaults';
import { V3 } from './theme';
import { listingsService } from '../../services/listingsService';

export type SyndicContactDraft = {
  name: string;
  phone: string;
  language: string;
};

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'es', label: 'Español' },
];

function emptySyndic(): SyndicContactDraft {
  return { name: '', phone: '', language: 'fr' };
}

export function normalizeSyndicContacts(raw: unknown): SyndicContactDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        name: String(o.name ?? '').trim(),
        phone: String(o.phone ?? '').replace(/\s+/g, '').trim(),
        language: String(o.language ?? 'fr').trim() || 'fr',
      };
    })
    .filter((s) => s.name || s.phone);
}

function listingNameFromValues(listingValues?: Record<string, unknown>): string {
  if (!listingValues) return '';
  const name = listingValues.name;
  if (typeof name === 'string') return name.trim();
  if (name && typeof name === 'object') {
    const o = name as Record<string, unknown>;
    return String(o.fr || o.en || o.value || '').trim();
  }
  return '';
}

type Props = {
  gestion: Record<string, unknown>;
  /** Listing scope — contacts stockés sur listing.syndics */
  listingId?: string;
  listingValues?: Record<string, unknown>;
  listingNameHint?: string;
  /** Template owner : pas de contacts (ils sont par listing). */
  ownerTemplateMode?: boolean;
  onSave: (next: Record<string, unknown>) => Promise<void>;
  /** Après save des contacts listing (pour refresh listingValues). */
  onSyndicsSaved?: (next: SyndicContactDraft[]) => void;
};

export default function V3InformSyndicPanel({
  gestion,
  listingId,
  listingValues,
  listingNameHint,
  ownerTemplateMode = false,
  onSave,
  onSyndicsSaved,
}: Props) {
  const initial = useMemo(() => normalizeInformSyndicGestion(gestion), [gestion]);
  const initialSyndics = useMemo(
    () => normalizeSyndicContacts(listingValues?.syndics),
    [listingValues?.syndics],
  );
  const [cfg, setCfg] = useState<InformSyndicGestion>(initial);
  const [syndics, setSyndics] = useState<SyndicContactDraft[]>(
    initialSyndics.length ? initialSyndics : [emptySyndic()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameHint = listingNameHint || listingNameFromValues(listingValues);
  const canEditSyndics = Boolean(listingId) && !ownerTemplateMode;

  useEffect(() => {
    setCfg(initial);
  }, [initial]);

  useEffect(() => {
    setSyndics(initialSyndics.length ? initialSyndics : canEditSyndics ? [emptySyndic()] : []);
  }, [initialSyndics, canEditSyndics]);

  const patch = (partial: Partial<InformSyndicGestion>) => {
    setCfg((prev) => ({ ...prev, ...partial }));
  };

  const patchSyndic = (index: number, partial: Partial<SyndicContactDraft>) => {
    setSyndics((prev) => prev.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  };

  const addSyndic = () => setSyndics((prev) => [...prev, emptySyndic()]);

  const removeSyndic = (index: number) => {
    setSyndics((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (canEditSyndics && listingId) {
        const cleaned = normalizeSyndicContacts(syndics).filter((s) => s.phone);
        if (syndics.some((s) => s.phone.trim() && !s.name.trim())) {
          setError('Chaque contact avec téléphone doit avoir un nom.');
          setSaving(false);
          return;
        }
        if (syndics.some((s) => s.name.trim() && !s.phone.trim())) {
          setError('Chaque contact avec nom doit avoir un numéro WhatsApp.');
          setSaving(false);
          return;
        }
        const payload = cleaned.map((s) => ({
          name: s.name || 'Syndic',
          phone: s.phone.replace(/\s+/g, ''),
          language: s.language || 'fr',
        }));
        await listingsService.updateListingProperty(listingId, { syndics: payload });
        setSyndics(payload);
        onSyndicsSaved?.(payload);
      }
      await onSave(normalizeInformSyndicGestion(cfg) as unknown as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
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
        Message template Meta (numéro staff) hors fenêtre 24h, bouton Flow « Voir passeports ».
        Destinataires = contacts ci-dessous (<code>listing.syndics</code>).
        {nameHint ? (
          <>
            {' '}
            Nom BD : <strong>{nameHint}</strong>
          </>
        ) : null}
      </Typography>

      {/* ——— Contacts syndic (listing) ——— */}
      <Box
        sx={{
          border: `1px solid ${V3.b}`,
          borderRadius: 1.5,
          p: 1.25,
          bgcolor: V3.alt,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: V3.t1 }}>
            Contacts syndic
          </Typography>
          {canEditSyndics ? (
            <Button size="small" startIcon={<AddIcon />} onClick={addSyndic} sx={{ textTransform: 'none' }}>
              Ajouter
            </Button>
          ) : null}
        </Box>

        {!canEditSyndics ? (
          <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
            Les numéros syndic se configurent sur chaque listing (pas dans le template owner).
          </Typography>
        ) : syndics.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontSize: 11.5, color: V3.warn }}>
              Aucun contact — ajoutez au moins un numéro WhatsApp pour que le message parte.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSyndic}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Ajouter un syndic
            </Button>
          </Box>
        ) : (
          syndics.map((row, index) => (
            <Box
              key={`syndic-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1.4fr 0.8fr auto' },
                gap: 1,
                alignItems: 'flex-start',
              }}
            >
              <TextField
                size="small"
                label="Nom"
                value={row.name}
                onChange={(e) => patchSyndic(index, { name: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="WhatsApp"
                placeholder="+2126…"
                value={row.phone}
                onChange={(e) => patchSyndic(index, { phone: e.target.value })}
                fullWidth
                helperText={index === 0 ? 'Format international, ex. +212662113193' : undefined}
              />
              <TextField
                size="small"
                select
                label="Langue"
                value={row.language || 'fr'}
                onChange={(e) => patchSyndic(index, { language: e.target.value })}
                fullWidth
              >
                {LANG_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton
                size="small"
                aria-label="Supprimer"
                onClick={() => removeSyndic(index)}
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </Box>

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
        label="Message (aperçu / fallback)"
        value={cfg.messageBody}
        onChange={(e) => patch({ messageBody: e.target.value })}
        multiline
        minRows={5}
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
          Images passeport : jusqu’à 3 dans le Flow Meta (si URL scan stockée sur le membre).
        </Typography>
      ) : null}

      {error ? (
        <Typography sx={{ fontSize: 12, color: 'error.main' }}>{error}</Typography>
      ) : null}

      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Button size="small" variant="contained" disabled={saving} onClick={() => void save()}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button size="small" variant="text" onClick={resetDefaults}>
          Défauts message
        </Button>
      </Box>
    </Box>
  );
}
