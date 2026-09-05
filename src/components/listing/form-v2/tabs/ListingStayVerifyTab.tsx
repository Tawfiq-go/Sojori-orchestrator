import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { V3 } from '../../../../features/orchestrationListingV3/theme';
import {
  isStayVerifyPresetId,
  normalizeStayVerify,
  type StayVerifyConfig,
  type StayVerifyItem,
  type StayVerifyPer,
} from './stayVerifyCatalog';

type Props = {
  values: { stayVerify?: StayVerifyConfig };
  onChange: (field: string, value: unknown) => void;
  listingId?: string;
};

const PER_LABEL: Record<StayVerifyPer, string> = {
  reservation: 'Par résa',
  person: 'Par personne',
  adult: 'Par adulte',
};

export default function ListingStayVerifyTab({ values, onChange, listingId }: Props) {
  const cfg = useMemo(() => normalizeStayVerify(values.stayVerify), [values.stayVerify]);
  const [customLabel, setCustomLabel] = useState('');

  if (!listingId) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
        Enregistrez le listing avant de configurer Vérifier logement.
      </Box>
    );
  }

  const setCfg = (next: StayVerifyConfig) => onChange('stayVerify', next);

  const patchItem = (id: string, patch: Partial<StayVerifyItem>) => {
    setCfg({
      ...cfg,
      items: cfg.items.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const addCustom = () => {
    const label = customLabel.trim().slice(0, 80);
    if (!label) return;
    setCfg({
      ...cfg,
      items: [
        ...cfg.items,
        {
          id: `custom_${Date.now()}`,
          labelFr: label,
          labelEn: label,
          enabled: true,
          qty: 1,
          per: 'reservation',
        },
      ],
    });
    setCustomLabel('');
  };

  const photos = cfg.photos;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 720 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: V3.t3, mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.5, lineHeight: 1.2 }}>
        Vérifier logement
      </Typography>
      <Typography sx={{ fontSize: 13, color: V3.t3, mb: 2, lineHeight: 1.45 }}>
        Catalogue Sojori, pas les amenities Airbnb. Quantité × par résa / personne / adulte.
        Les photos FDM ne sont pas câblées — flag seulement.
      </Typography>

      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Informations</Typography>
      <Stack spacing={1}>
        {cfg.items.map((row) => (
          <Box
            key={row.id}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${V3.bs}`,
              background: row.enabled ? V3.card : V3.alt,
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <Switch
                size="small"
                checked={row.enabled}
                onChange={(e) => patchItem(row.id, { enabled: e.target.checked })}
              />
              {isStayVerifyPresetId(row.id) ? (
                <Typography sx={{ fontSize: 13, fontWeight: 650, minWidth: 140 }}>{row.labelFr}</Typography>
              ) : (
                <TextField
                  size="small"
                  label="Libellé"
                  value={row.labelFr}
                  onChange={(e) =>
                    patchItem(row.id, { labelFr: e.target.value, labelEn: e.target.value })
                  }
                  sx={{ minWidth: 140 }}
                />
              )}
              <TextField
                size="small"
                type="number"
                label="Qté"
                value={row.qty}
                onChange={(e) => patchItem(row.id, { qty: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                inputProps={{ min: 0, max: 99 }}
                sx={{ width: 88 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Règle</InputLabel>
                <Select
                  label="Règle"
                  value={row.per}
                  onChange={(e) => patchItem(row.id, { per: e.target.value as StayVerifyPer })}
                >
                  <MenuItem value="reservation">{PER_LABEL.reservation}</MenuItem>
                  <MenuItem value="person">{PER_LABEL.person}</MenuItem>
                  <MenuItem value="adult">{PER_LABEL.adult}</MenuItem>
                </Select>
              </FormControl>
              {!isStayVerifyPresetId(row.id) ? (
                <Button
                  size="small"
                  onClick={() => setCfg({ ...cfg, items: cfg.items.filter((i) => i.id !== row.id) })}
                >
                  Retirer
                </Button>
              ) : null}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25, mb: 2.5 }}>
        <TextField
          size="small"
          label="Ajouter une ligne"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button variant="outlined" onClick={addCustom} disabled={!customLabel.trim()}>
          Ajouter
        </Button>
      </Stack>

      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Images</Typography>
      <Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${V3.bs}`, background: V3.alt }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Switch
            size="small"
            checked={photos.include}
            onChange={(e) =>
              setCfg({
                ...cfg,
                photos: {
                  include: e.target.checked,
                  source: e.target.checked ? photos.source === 'none' ? 'fixed' : photos.source : 'none',
                  fixedUrls: e.target.checked && photos.source === 'fixed' ? photos.fixedUrls : [],
                },
              })
            }
          />
          <Typography sx={{ fontSize: 13 }}>Inclure dans la vérification</Typography>
        </Stack>
        {photos.include ? (
          <Stack spacing={1.25}>
            <FormControl size="small" sx={{ maxWidth: 280 }}>
              <InputLabel>Source</InputLabel>
              <Select
                label="Source"
                value={photos.source === 'none' ? 'fixed' : photos.source}
                onChange={(e) => {
                  const source = e.target.value === 'fdm' ? 'fdm' : 'fixed';
                  setCfg({
                    ...cfg,
                    photos: {
                      include: true,
                      source,
                      fixedUrls: source === 'fixed' ? photos.fixedUrls : [],
                    },
                  });
                }}
              >
                <MenuItem value="fixed">Fixes (PM)</MenuItem>
                <MenuItem value="fdm">Sortie FDM (plus tard)</MenuItem>
              </Select>
            </FormControl>
            {photos.source === 'fixed' ? (
              <Stack spacing={1}>
                <Typography sx={{ fontSize: 12, color: V3.t3 }}>
                  URLs https des images à vérifier. Pas de sortie FDM ici.
                </Typography>
                {photos.fixedUrls.map((url, idx) => (
                  <Stack key={`${url}-${idx}`} direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      label={`Image ${idx + 1}`}
                      value={url}
                      onChange={(e) => {
                        const next = [...photos.fixedUrls];
                        next[idx] = e.target.value;
                        setCfg({ ...cfg, photos: { ...photos, include: true, source: 'fixed', fixedUrls: next } });
                      }}
                    />
                    <Button
                      size="small"
                      onClick={() =>
                        setCfg({
                          ...cfg,
                          photos: {
                            ...photos,
                            include: true,
                            source: 'fixed',
                            fixedUrls: photos.fixedUrls.filter((_, i) => i !== idx),
                          },
                        })
                      }
                    >
                      Retirer
                    </Button>
                  </Stack>
                ))}
                {photos.fixedUrls.length < 8 ? (
                  <Button
                    size="small"
                    onClick={() =>
                      setCfg({
                        ...cfg,
                        photos: { ...photos, include: true, source: 'fixed', fixedUrls: [...photos.fixedUrls, ''] },
                      })
                    }
                  >
                    Ajouter une URL
                  </Button>
                ) : null}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 12, color: V3.t3 }}>
                Flag enregistré. Les photos ménage seront branchées plus tard (Luis).
              </Typography>
            )}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
