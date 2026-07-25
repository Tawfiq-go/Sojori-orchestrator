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
  INFORM_SYNDIC_ACCESS_UNTIL_OPTIONS,
  INFORM_SYNDIC_SEND_TIMES,
  normalizeInformSyndicGestion,
  type InformSyndicDayOffset,
  type InformSyndicGestion,
  type InformSyndicAccessUntil,
  type InformSyndicSendTime,
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

type Props = {
  gestion: Record<string, unknown>;
  listingId?: string;
  listingValues?: Record<string, unknown>;
  ownerTemplateMode?: boolean;
  onSave: (next: Record<string, unknown>) => Promise<void>;
  onSyndicsSaved?: (next: SyndicContactDraft[]) => void;
};

/**
 * Config listing « Informer syndic » = message planifié (pas une tâche / flow staff).
 * Contacts WhatsApp = listing.syndics (par annonce).
 * Jour / champs résa & voyageurs / passeports = capabilities.inform_syndic.gestion (orchestration listing).
 */
export default function V3InformSyndicPanel({
  gestion,
  listingId,
  listingValues,
  ownerTemplateMode = false,
  onSave,
  onSyndicsSaved,
}: Props) {
  const initial = useMemo(() => normalizeInformSyndicGestion(gestion), [gestion]);
  const initialSyndics = useMemo(
    () => normalizeSyndicContacts(listingValues?.syndics),
    [listingValues?.syndics],
  );
  const canEditSyndics = Boolean(listingId) && !ownerTemplateMode;

  const [cfg, setCfg] = useState<InformSyndicGestion>(initial);
  const [syndics, setSyndics] = useState<SyndicContactDraft[]>(
    initialSyndics.length ? initialSyndics : canEditSyndics ? [emptySyndic()] : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCfg(initial);
  }, [initial]);

  useEffect(() => {
    setSyndics(initialSyndics.length ? initialSyndics : canEditSyndics ? [emptySyndic()] : []);
  }, [initialSyndics, canEditSyndics]);

  const patchSyndic = (index: number, partial: Partial<SyndicContactDraft>) => {
    setSyndics((prev) => prev.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  };

  const patchReservationField = (key: keyof InformSyndicGestion['reservationFields'], checked: boolean) => {
    setCfg((prev) => ({
      ...prev,
      reservationFields: { ...prev.reservationFields, [key]: checked },
    }));
  };

  const patchTravelerField = (key: keyof InformSyndicGestion['travelerFields'], checked: boolean) => {
    setCfg((prev) => ({
      ...prev,
      travelerFields: { ...prev.travelerFields, [key]: checked },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (canEditSyndics && listingId) {
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
        const payload = normalizeSyndicContacts(syndics)
          .filter((s) => s.phone)
          .map((s) => ({
            name: s.name || 'Syndic',
            phone: s.phone.replace(/\s+/g, ''),
            language: s.language || 'fr',
          }));
        if (!payload.length) {
          setError('Ajoutez au moins un numéro WhatsApp syndic.');
          setSaving(false);
          return;
        }
        await listingsService.updateListingProperty(listingId, { syndics: payload });
        setSyndics(payload);
        onSyndicsSaved?.(payload);
      }
      await onSave(
        normalizeInformSyndicGestion({
          ...cfg,
          useListingNameFromDb: true,
        }) as unknown as Record<string, unknown>,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t1 }}>
          Informer syndic
        </Typography>
        <Box
          component="span"
          sx={{
            fontSize: 10.5,
            fontWeight: 700,
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: V3.pt,
            color: V3.pd,
          }}
        >
          Message planifié
        </Box>
      </Box>
      <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.45 }}>
        Envoi unique au syndic (template Meta + bouton Voir passeports). Pas de tâche staff, pas de
        relances. Chaque listing garde ses contacts et sa config.
      </Typography>

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
            Contacts WhatsApp
          </Typography>
          {canEditSyndics ? (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setSyndics((prev) => [...prev, emptySyndic()])}
              sx={{ textTransform: 'none' }}
            >
              Ajouter
            </Button>
          ) : null}
        </Box>

        {!canEditSyndics ? (
          <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
            Les numéros se configurent sur chaque listing.
          </Typography>
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
                onClick={() => setSyndics((prev) => prev.filter((_, i) => i !== index))}
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </Box>

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>Quand envoyer (avant check-in)</FormLabel>
        <RadioGroup
          row
          value={String(cfg.dayOffset)}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              dayOffset: Number(e.target.value) as InformSyndicDayOffset,
            }))
          }
        >
          <FormControlLabel value="0" control={<Radio size="small" />} label="J0" />
          <FormControlLabel value="-1" control={<Radio size="small" />} label="J-1" />
          <FormControlLabel value="-2" control={<Radio size="small" />} label="J-2" />
        </RadioGroup>
      </FormControl>

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>Heure d’envoi (plan)</FormLabel>
        <RadioGroup
          row
          value={cfg.sendTime}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              sendTime: e.target.value as InformSyndicSendTime,
            }))
          }
        >
          {INFORM_SYNDIC_SEND_TIMES.map((t) => (
            <FormControlLabel
              key={t}
              value={t}
              control={<Radio size="small" />}
              label={`${Number.parseInt(t, 10)}h`}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>
          Durée d’accès au contenu (Flow / pièces)
        </FormLabel>
        <Typography sx={{ fontSize: 11, color: V3.t3, mb: 0.5, lineHeight: 1.4 }}>
          Utile en cas de retard ou arrivée très tôt (ex. 6h). Après la date, les images ne sont plus
          injectées.
        </Typography>
        <RadioGroup
          value={cfg.accessUntil}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              accessUntil: e.target.value as InformSyndicAccessUntil,
            }))
          }
        >
          {INFORM_SYNDIC_ACCESS_UNTIL_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value}
              value={o.value}
              control={<Radio size="small" />}
              label={o.label}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: V3.t2, mb: 0.5 }}>
          Champs réservation (dans le message / Flow)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.reservationFields.firstName}
                onChange={(e) => patchReservationField('firstName', e.target.checked)}
              />
            }
            label="Prénom"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.reservationFields.lastName}
                onChange={(e) => patchReservationField('lastName', e.target.checked)}
              />
            }
            label="Nom"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.reservationFields.nationality}
                onChange={(e) => patchReservationField('nationality', e.target.checked)}
              />
            }
            label="Nationalité"
          />
        </Box>
      </Box>

      <FormControl>
        <FormLabel sx={{ fontSize: 12, fontWeight: 600 }}>Voyageurs à inclure</FormLabel>
        <RadioGroup
          row
          value={cfg.travelersMode}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              travelersMode: e.target.value as InformSyndicTravelersMode,
            }))
          }
        >
          <FormControlLabel
            value="all_registered"
            control={<Radio size="small" />}
            label="Tous les voyageurs enregistrés"
          />
          <FormControlLabel
            value="reservation_guest"
            control={<Radio size="small" />}
            label="Voyageur réservation (match nom)"
          />
        </RadioGroup>
      </FormControl>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: V3.t2, mb: 0.5 }}>
          Champs voyageur (dans le Flow)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields.firstName}
                onChange={(e) => patchTravelerField('firstName', e.target.checked)}
              />
            }
            label="Prénom"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields.lastName}
                onChange={(e) => patchTravelerField('lastName', e.target.checked)}
              />
            }
            label="Nom"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields.nationality}
                onChange={(e) => patchTravelerField('nationality', e.target.checked)}
              />
            }
            label="Nationalité"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields.passportNumber}
                onChange={(e) => patchTravelerField('passportNumber', e.target.checked)}
              />
            }
            label="N° passeport"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={cfg.travelerFields.passportImage === true}
                onChange={(e) => patchTravelerField('passportImage', e.target.checked)}
              />
            }
            label="Inclure les images passeport dans le Flow (si disponibles)"
          />
        </Box>
      </Box>

      {error ? (
        <Typography sx={{ fontSize: 12, color: 'error.main' }}>{error}</Typography>
      ) : null}

      <Button
        size="small"
        variant="contained"
        disabled={saving}
        onClick={() => void save()}
        sx={{ alignSelf: 'flex-start' }}
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </Box>
  );
}
