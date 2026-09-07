import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { listingsService } from '../../../../services/listingsService';
import {
  computeDepartureTaxTotal,
  isDepartureChecklistPresetId,
  isDepartureTaxPresetId,
  mapDepartureGuestToListingPatch,
  normalizeDepartureGuest,
  type DepartureGuestConfig,
  type DepartureTaxCalculationMode,
  type DepartureTaxCollectionMode,
  type DepartureTaxItem,
} from './departureGuestCatalog';

type Props = {
  values: Record<string, unknown>;
  onChange: (arg1: string | Record<string, unknown>, arg2?: unknown) => void;
  listingId?: string;
  templateMode?: boolean;
};

const CALC_LABEL: Record<DepartureTaxCalculationMode, string> = {
  per_person_per_night: 'Par personne / nuit',
  per_night: 'Par nuit',
  per_stay: 'Par séjour',
};

const COLLECT_LABEL: Record<DepartureTaxCollectionMode, string> = {
  on_table: 'Sur la table',
  hand_to_pm: 'En main propre',
  cash_on_departure: 'Espèces au départ',
  included_in_price: 'Déjà incluse',
};

function applyChange(
  onChange: Props['onChange'],
  patch: Record<string, unknown>,
) {
  onChange(patch);
}

export default function ListingDepartureTab({ values, onChange, listingId, templateMode = false }: Props) {
  const cfg = useMemo(
    () => normalizeDepartureGuest(values.departureGuest, values),
    [values],
  );
  const [customLabel, setCustomLabel] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  const persist = useCallback(
    (next: DepartureGuestConfig) => {
      const patch = mapDepartureGuestToListingPatch(next);
      applyChange(onChange, patch);
      if (!listingId || templateMode) return;
      pendingRef.current = patch;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const payload = pendingRef.current;
        pendingRef.current = null;
        if (!payload) return;
        void listingsService.updateListingProperty(listingId, payload).catch(() => undefined);
      }, 800);
    },
    [listingId, onChange, templateMode],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setCfg = (next: DepartureGuestConfig) => persist(next);

  const patchChecklist = (id: string, patch: Partial<DepartureGuestConfig['checklist'][number]>) => {
    setCfg({
      ...cfg,
      checklist: cfg.checklist.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const patchTax = (id: string, patch: Partial<DepartureTaxItem>) => {
    setCfg({
      ...cfg,
      taxes: cfg.taxes.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const addCustom = () => {
    const label = customLabel.trim().slice(0, 80);
    if (!label) return;
    setCfg({
      ...cfg,
      checklist: [
        ...cfg.checklist,
        {
          id: `custom_${Date.now()}`,
          labelFr: label,
          labelEn: label,
          enabled: true,
        },
      ],
    });
    setCustomLabel('');
  };

  if (!listingId && !templateMode) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
        Enregistrez le listing avant de configurer les instructions de départ.
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 720 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: V3.t3, mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.5, lineHeight: 1.2 }}>
        Instructions départ
      </Typography>
      <Typography sx={{ fontSize: 13, color: V3.t3, mb: 2, lineHeight: 1.45 }}>
        C’est ici que WhatsApp lit les consignes, la liste (poubelle, clés…) et les taxes à
        payer. Montant × règle (personne / nuit / séjour).
      </Typography>

      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Instructions</Typography>
      <TextField
        multiline
        minRows={4}
        fullWidth
        value={cfg.instructions}
        onChange={(e) => setCfg({ ...cfg, instructions: e.target.value })}
        placeholder="Texte libre en plus de la liste (codes, où laisser les clés…)"
        sx={{ mb: 2.5 }}
      />

      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Liste avant de partir</Typography>
      <Stack spacing={1} sx={{ mb: 1.25 }}>
        {cfg.checklist.map((row) => (
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
                onChange={(e) => patchChecklist(row.id, { enabled: e.target.checked })}
              />
              {isDepartureChecklistPresetId(row.id) ? (
                <Typography sx={{ fontSize: 13, fontWeight: 650 }}>{row.labelFr}</Typography>
              ) : (
                <TextField
                  size="small"
                  label="Libellé"
                  value={row.labelFr}
                  onChange={(e) =>
                    patchChecklist(row.id, { labelFr: e.target.value, labelEn: e.target.value })
                  }
                  sx={{ minWidth: 200, flex: 1 }}
                />
              )}
              {!isDepartureChecklistPresetId(row.id) ? (
                <Button
                  size="small"
                  onClick={() =>
                    setCfg({ ...cfg, checklist: cfg.checklist.filter((i) => i.id !== row.id) })
                  }
                >
                  Retirer
                </Button>
              ) : null}
            </Stack>
          </Box>
        ))}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
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

      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Taxes à régler</Typography>
      <Stack spacing={1} sx={{ mb: 2 }}>
        {cfg.taxes.map((row) => {
          const total = computeDepartureTaxTotal(row, 2, 3);
          return (
            <Box
              key={row.id}
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${V3.bs}`,
                background: row.enabled ? V3.card : V3.alt,
              }}
            >
              <Stack spacing={1}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                  <Switch
                    size="small"
                    checked={row.enabled}
                    onChange={(e) => patchTax(row.id, { enabled: e.target.checked })}
                  />
                  {isDepartureTaxPresetId(row.id) ? (
                    <Typography sx={{ fontSize: 13, fontWeight: 650, minWidth: 200 }}>{row.labelFr}</Typography>
                  ) : (
                    <TextField
                      size="small"
                      label="Libellé"
                      value={row.labelFr}
                      onChange={(e) => patchTax(row.id, { labelFr: e.target.value, labelEn: e.target.value })}
                    />
                  )}
                </Stack>
                {row.enabled ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Montant"
                      value={row.amount}
                      onChange={(e) =>
                        patchTax(row.id, {
                          amount: Math.max(0, Math.min(9999, Number(e.target.value) || 0)),
                        })
                      }
                      inputProps={{ min: 0, step: 0.5 }}
                      sx={{ width: 120 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 88 }}>
                      <InputLabel>Devise</InputLabel>
                      <Select
                        label="Devise"
                        value={row.currency}
                        onChange={(e) => patchTax(row.id, { currency: e.target.value as 'MAD' | 'EUR' })}
                      >
                        <MenuItem value="MAD">MAD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>Règle</InputLabel>
                      <Select
                        label="Règle"
                        value={row.calculationMode}
                        onChange={(e) =>
                          patchTax(row.id, {
                            calculationMode: e.target.value as DepartureTaxCalculationMode,
                          })
                        }
                      >
                        <MenuItem value="per_person_per_night">{CALC_LABEL.per_person_per_night}</MenuItem>
                        <MenuItem value="per_night">{CALC_LABEL.per_night}</MenuItem>
                        <MenuItem value="per_stay">{CALC_LABEL.per_stay}</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel>Réception</InputLabel>
                      <Select
                        label="Réception"
                        value={row.collectionMode}
                        onChange={(e) =>
                          patchTax(row.id, {
                            collectionMode: e.target.value as DepartureTaxCollectionMode,
                          })
                        }
                      >
                        <MenuItem value="on_table">{COLLECT_LABEL.on_table}</MenuItem>
                        <MenuItem value="hand_to_pm">{COLLECT_LABEL.hand_to_pm}</MenuItem>
                        <MenuItem value="cash_on_departure">{COLLECT_LABEL.cash_on_departure}</MenuItem>
                        <MenuItem value="included_in_price">{COLLECT_LABEL.included_in_price}</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                ) : null}
                {row.enabled ? (
                  <Typography sx={{ fontSize: 12, color: V3.t3 }}>
                    Aperçu 2 pers. × 3 nuits : {total} {row.currency}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${V3.bs}`, background: V3.alt }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Switch
            size="small"
            checked={cfg.exemptChildren}
            onChange={(e) => setCfg({ ...cfg, exemptChildren: e.target.checked })}
          />
          <Typography sx={{ fontSize: 13 }}>Enfants exemptés</Typography>
        </Stack>
        {cfg.exemptChildren ? (
          <TextField
            size="small"
            type="number"
            label="Âge inférieur à"
            value={cfg.exemptBelowAge}
            onChange={(e) =>
              setCfg({
                ...cfg,
                exemptBelowAge: Math.max(0, Math.min(18, Number(e.target.value) || 0)),
              })
            }
            inputProps={{ min: 0, max: 18 }}
            sx={{ width: 140 }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
