/**
 * Config ops ménage v2 : Normal/Grand, par passage / forfait, options serviettes/draps.
 * Sur TOUTES les pistes (inclus / payant / checkout).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import { listingsService } from '../../../../services/listingsService';
import {
  defaultMenageOps,
  normalizeMenageOps,
  parseMenageOpsFromSources,
  type CleaningLevelPrices,
  type MenageCheckoutConfig,
  type MenageOpsConfig,
  type MenageTrackWithOptions,
} from './menageOpsTypes';

export type MenageFocusTrack = 'included' | 'paid' | 'checkout' | 'all';

type TrackAny = MenageTrackWithOptions | MenageCheckoutConfig;

type Props = {
  listingId: string;
  listingValues?: Record<string, unknown>;
  gestion?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void | Promise<void>;
  templateMode?: boolean;
  focusTrack?: MenageFocusTrack;
};

function LevelFields({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: CleaningLevelPrices;
  onChange: (next: CleaningLevelPrices) => void;
  disabled?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 72, color: T.text2 }}>
        {label}
      </Typography>
      <TextField
        size="small"
        label="Prix MAD"
        type="number"
        disabled={disabled}
        value={value.price}
        onChange={e => onChange({ ...value, price: Math.max(0, Number(e.target.value) || 0) })}
        sx={{ width: 110 }}
      />
      <TextField
        size="small"
        label="Durée min"
        type="number"
        disabled={disabled}
        value={value.durationMinutes}
        onChange={e =>
          onChange({ ...value, durationMinutes: Math.max(15, Number(e.target.value) || 15) })
        }
        sx={{ width: 110 }}
      />
    </Stack>
  );
}

function TrackBlock({
  title,
  track,
  onChange,
}: {
  title: string;
  track: TrackAny;
  onChange: (next: TrackAny) => void;
}) {
  const t = track;
  const isForfait = t.pricingMode === 'monthly_forfait';
  const opts = t.options ?? {
    towels: { enabled: false, price: 0 },
    sheets: { enabled: false, price: 0 },
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{title}</Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={t.enabled !== false}
              onChange={e => onChange({ ...t, enabled: e.target.checked })}
              size="small"
            />
          }
          label={<Typography sx={{ fontSize: 12 }}>Activé</Typography>}
        />
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        <TextField
          select
          size="small"
          label="Mode de facturation"
          value={t.pricingMode || 'per_passage'}
          onChange={e =>
            onChange({
              ...t,
              pricingMode: e.target.value === 'monthly_forfait' ? 'monthly_forfait' : 'per_passage',
            })
          }
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="per_passage">Par passage</MenuItem>
          <MenuItem value="monthly_forfait">Forfait mensuel</MenuItem>
        </TextField>
        {isForfait && (
          <TextField
            size="small"
            label="Forfait MAD/mois"
            type="number"
            value={t.monthlyForfaitAmount ?? 0}
            onChange={e =>
              onChange({
                ...t,
                monthlyForfaitAmount: Math.max(0, Number(e.target.value) || 0),
              })
            }
            sx={{ width: 160 }}
          />
        )}
      </Stack>

      {!isForfait && (
        <>
          <TextField
            select
            size="small"
            label="Niveau par défaut (création tâche)"
            value={t.defaultLevel || 'normal'}
            onChange={e =>
              onChange({ ...t, defaultLevel: e.target.value === 'grand' ? 'grand' : 'normal' })
            }
            sx={{ maxWidth: 280 }}
          >
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="grand">Grand ménage</MenuItem>
          </TextField>

          <LevelFields
            label="Normal"
            value={t.normal}
            onChange={normal => onChange({ ...t, normal })}
          />
          <LevelFields label="Grand" value={t.grand} onChange={grand => onChange({ ...t, grand })} />
        </>
      )}

      <Stack spacing={1}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
          Compléments (optionnels)
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.towels.enabled}
                onChange={e =>
                  onChange({
                    ...t,
                    options: {
                      ...opts,
                      towels: { ...opts.towels, enabled: e.target.checked },
                    },
                  })
                }
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 12 }}>Serviettes</Typography>}
          />
          <TextField
            size="small"
            label="Prix"
            type="number"
            disabled={!opts.towels.enabled}
            value={opts.towels.price}
            onChange={e =>
              onChange({
                ...t,
                options: {
                  ...opts,
                  towels: {
                    ...opts.towels,
                    price: Math.max(0, Number(e.target.value) || 0),
                  },
                },
              })
            }
            sx={{ width: 100 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.sheets.enabled}
                onChange={e =>
                  onChange({
                    ...t,
                    options: {
                      ...opts,
                      sheets: { ...opts.sheets, enabled: e.target.checked },
                    },
                  })
                }
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 12 }}>Draps</Typography>}
          />
          <TextField
            size="small"
            label="Prix"
            type="number"
            disabled={!opts.sheets.enabled}
            value={opts.sheets.price}
            onChange={e =>
              onChange({
                ...t,
                options: {
                  ...opts,
                  sheets: {
                    ...opts.sheets,
                    price: Math.max(0, Number(e.target.value) || 0),
                  },
                },
              })
            }
            sx={{ width: 100 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

const INTRO: Record<MenageFocusTrack, string> = {
  all: 'Chaque type : par passage (Normal/Grand) ou forfait mensuel, + options serviettes/draps.',
  included:
    'Choisissez par passage ou forfait mensuel. Les paliers (nombre de ménages) restent juste en dessous.',
  paid: 'Par passage (Normal/Grand) ou forfait mensuel + options serviettes/draps.',
  checkout: 'Par passage (Normal/Grand) ou forfait mensuel + options. Déclenchement J/J+1 ci-dessous.',
};

export default function MenageOpsPanel({
  listingId,
  listingValues = {},
  gestion,
  onListingPatch,
  templateMode = false,
  focusTrack = 'all',
}: Props) {
  const [cfg, setCfg] = useState<MenageOpsConfig>(() =>
    parseMenageOpsFromSources(gestion, listingValues),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setCfg(parseMenageOpsFromSources(gestion, listingValues));
  }, [gestion, listingValues]);

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const next = normalizeMenageOps(cfg);
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, { menageOps: next });
      }
      await onListingPatch?.({ menageOps: next });
      setCfg(next);
      setMsg('Enregistré');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [cfg, listingId, onListingPatch, templateMode]);

  const showIncluded = focusTrack === 'all' || focusTrack === 'included';
  const showPaid = focusTrack === 'all' || focusTrack === 'paid';
  const showCheckout = focusTrack === 'all' || focusTrack === 'checkout';

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontSize: 13, color: T.text2 }}>{INTRO[focusTrack]}</Typography>

      {showIncluded && (
        <TrackBlock
          title="Inclus — prix"
          track={cfg.included}
          onChange={included => setCfg(c => ({ ...c, included: included as MenageTrackWithOptions }))}
        />
      )}
      {showPaid && (
        <TrackBlock
          title="Payant — prix"
          track={cfg.paid}
          onChange={paid => setCfg(c => ({ ...c, paid: paid as MenageTrackWithOptions }))}
        />
      )}
      {showCheckout && (
        <TrackBlock
          title="Checkout — prix"
          track={cfg.checkout}
          onChange={checkout =>
            setCfg(c => ({ ...c, checkout: checkout as MenageCheckoutConfig }))
          }
        />
      )}

      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>
          Règles de changement de type
        </Typography>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cfg.flexibility.canChangeLevel !== false}
                  onChange={e =>
                    setCfg(c => ({
                      ...c,
                      flexibility: { ...c.flexibility, canChangeLevel: e.target.checked },
                    }))
                  }
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 12 }}>
                  On peut changer le type (normal ↔ grand) —{' '}
                  <strong>{cfg.flexibility.canChangeLevel !== false ? 'Yes' : 'No'}</strong>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cfg.flexibility.fdmCanProposeLevel}
                  disabled={cfg.flexibility.canChangeLevel === false}
                  onChange={e =>
                    setCfg(c => ({
                      ...c,
                      flexibility: { ...c.flexibility, fdmCanProposeLevel: e.target.checked },
                    }))
                  }
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 12 }}>
                  FdM peut demander un changement de type —{' '}
                  <strong>{cfg.flexibility.fdmCanProposeLevel ? 'Yes' : 'No'}</strong>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cfg.flexibility.supervisorOrAdminValidates}
                  disabled={
                    cfg.flexibility.canChangeLevel === false || !cfg.flexibility.fdmCanProposeLevel
                  }
                  onChange={e =>
                    setCfg(c => ({
                      ...c,
                      flexibility: {
                        ...c.flexibility,
                        supervisorOrAdminValidates: e.target.checked,
                      },
                    }))
                  }
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 12 }}>
                  Demande FdM nécessite validation (superviseur / admin) —{' '}
                  <strong>{cfg.flexibility.supervisorOrAdminValidates ? 'Yes' : 'No'}</strong>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cfg.flexibility.fdmCanSendImages !== false}
                  onChange={e =>
                    setCfg(c => ({
                      ...c,
                      flexibility: {
                        ...c.flexibility,
                        fdmCanSendImages: e.target.checked,
                        ...(e.target.checked
                          ? {}
                          : { imagesRequired: false }),
                      },
                    }))
                  }
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 12 }}>
                  FdM autorisée à envoyer des images —{' '}
                  <strong>{cfg.flexibility.fdmCanSendImages !== false ? 'Yes' : 'No'}</strong>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cfg.flexibility.imagesRequired}
                  disabled={cfg.flexibility.fdmCanSendImages === false}
                  onChange={e =>
                    setCfg(c => ({
                      ...c,
                      flexibility: { ...c.flexibility, imagesRequired: e.target.checked },
                    }))
                  }
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 12 }}>
                  Photos obligatoires (max 5) —{' '}
                  <strong>{cfg.flexibility.imagesRequired ? 'Yes' : 'No'}</strong>
                </Typography>
              }
            />
          </Stack>
        </Box>

      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>Flow FdM</Typography>
        <TextField
          size="small"
          label="Jours visibles"
          type="number"
          value={cfg.fdmVisibleDays}
          onChange={e =>
            setCfg(c => ({
              ...c,
              fdmVisibleDays: Math.min(7, Math.max(1, Number(e.target.value) || 1)),
            }))
          }
          inputProps={{ min: 1, max: 7 }}
          sx={{ width: 140 }}
        />
        <Typography sx={{ fontSize: 12, color: T.text2, mt: 0.75 }}>
          1 = aujourd’hui · 2 = aujourd’hui + demain. La FdM ne peut <strong>commencer</strong> que
          les ménages du jour.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          disabled={saving || (!onListingPatch && (templateMode || !listingId))}
          onClick={() => void save()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}
        </Button>
        {msg && (
          <Typography sx={{ fontSize: 12, color: msg === 'Enregistré' ? T.primary : '#b91c1c' }}>
            {msg}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
