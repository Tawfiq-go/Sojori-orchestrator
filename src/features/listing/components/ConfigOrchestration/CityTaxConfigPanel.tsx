// Taxe de séjour — panneau réutilisable (onglet départ ou standalone)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import { Card, FormRow, PillButton, Toggle, NumInput } from './SHARED';
import {
  mapCityTaxToListingPatch,
  mapListingToCityTaxConfig,
  CITY_TAX_CALCULATION_OPTIONS,
  previewCityTaxBreakdown,
  type CityTaxConfig,
  type CityTaxCurrency,
} from './cityTaxConfigTypes';

const CURRENCIES: { id: CityTaxCurrency; label: string }[] = [
  { id: 'MAD', label: 'MAD' },
  { id: 'EUR', label: 'EUR' },
];

export type CityTaxSaveState = 'idle' | 'saving' | 'saved';

interface Props {
  listingId: string;
  listingValues: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  onSaveStateChange?: (state: CityTaxSaveState) => void;
}

export default function CityTaxConfigPanel({
  listingId,
  listingValues,
  onListingPatch,
  onSaveStateChange,
}: Props) {
  const [config, setConfig] = useState<CityTaxConfig | null>(null);
  const configRef = useRef<CityTaxConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calcOption = useMemo(
    () => CITY_TAX_CALCULATION_OPTIONS.find(o => o.id === config?.calculationMode),
    [config?.calculationMode],
  );

  const preview = useMemo(
    () => (config ? previewCityTaxBreakdown(config) : null),
    [config],
  );

  const setSavingState = useCallback(
    (state: CityTaxSaveState) => {
      onSaveStateChange?.(state);
    },
    [onSaveStateChange],
  );

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
  }, [listingId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToCityTaxConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId]);

  const patch = useCallback((fn: (c: CityTaxConfig) => CityTaxConfig) => {
    dirtyRef.current = true;
    setConfig(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || !listingId) return;
    const payload = mapCityTaxToListingPatch(cfg);
    setSavingState('saving');
    try {
      await listingsService.updateListingProperty(listingId, payload);
      onListingPatch?.(payload);
      setSavingState('saved');
    } catch {
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, onListingPatch, setSavingState]);

  useEffect(() => {
    if (!config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist]);

  if (!config) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Card compact icon="💰" title="Taxe de séjour" subtitle="Rappel voyageur · calcul dans les messages">
        <FormRow compact label="Taxe activée">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Toggle on={config.enabled} onChange={() => patch(c => ({ ...c, enabled: !c.enabled }))} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>
              {config.enabled ? 'Activée' : 'Désactivée'}
            </Typography>
          </Stack>
        </FormRow>

        {config.enabled && (
          <>
            <FormRow
              compact
              required
              label="Montant"
              help={calcOption?.help ?? 'Montant de base'}


            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ maxWidth: 120 }}>
                  <NumInput
                    value={config.amount}
                    min={0}
                    step={0.5}
                    onChange={e =>
                      patch(c => ({
                        ...c,
                        amount: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: CONFIG_ORCH_FONT.mono,
                    color: T.text3,
                    letterSpacing: '0.04em',
                  }}
                >
                  {config.currency} {calcOption?.amountSuffix ?? ''}
                </Typography>
              </Stack>
            </FormRow>

            <FormRow compact label="Devise">
              <Stack direction="row" sx={{ gap: 0.5 }}>
                {CURRENCIES.map(cur => (
                  <PillButton
                    key={cur.id}
                    compact
                    active={config.currency === cur.id}
                    onClick={() => patch(c => ({ ...c, currency: cur.id }))}
                  >
                    {cur.label}
                  </PillButton>
                ))}
              </Stack>
            </FormRow>
          </>
        )}
      </Card>

      {config.enabled && (
        <>
          <Card
            compact
            icon="🧮"
            title="Calcul affiché au voyageur"
            subtitle="Résumé du montant dans le message de départ"

          >
            <FormRow
              compact
              label="Mode de calcul"
              help="Comment expliquer le montant dû dans le message"


            >
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                {CITY_TAX_CALCULATION_OPTIONS.map(mode => (
                  <PillButton
                    key={mode.id}
                    compact
                    active={config.calculationMode === mode.id}
                    onClick={() => patch(c => ({ ...c, calculationMode: mode.id }))}
                  >
                    {mode.label}
                  </PillButton>
                ))}
              </Stack>
            </FormRow>
            {preview && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: T.bg2,
                  border: `1px dashed ${T.border}`,
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, mb: 0.5 }}>
                  Aperçu (2 adultes · 3 nuits)
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: CONFIG_ORCH_FONT.mono }}>
                  {preview.total}
                </Typography>
                <Typography sx={{ fontSize: 11, color: T.text2, mt: 0.5 }}>{preview.formula}</Typography>
              </Box>
            )}
          </Card>

          <Card compact icon="👶" title="Exemptions enfants" subtitle="Âge en-dessous duquel la taxe ne s'applique pas">
            <FormRow compact label="Enfants exemptés">
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                <Toggle
                  on={config.exemptChildren}
                  onChange={() => patch(c => ({ ...c, exemptChildren: !c.exemptChildren }))}
                />
                <Typography sx={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>
                  Exempter les enfants de la taxe
                </Typography>
              </Stack>
            </FormRow>
            {config.exemptChildren && (
              <FormRow
                compact
                required
                label="Exempté si âge inférieur à"
                help="Requis si exemption activée"


              >
                <Box sx={{ maxWidth: 100 }}>
                  <NumInput
                    value={config.exemptBelowAge}
                    suffix="ANS"
                    min={0}
                    max={18}
                    onChange={e =>
                      patch(c => ({
                        ...c,
                        exemptBelowAge: Math.max(0, Math.min(18, Number(e.target.value) || 0)),
                      }))
                    }
                  />
                </Box>
              </FormRow>
            )}
          </Card>
        </>
      )}
    </Box>
  );
}
