// ════════════════════════════════════════════════════════════════════
// PricingControls.tsx — Réglages pédagogiques (PriceLabs-like cascade)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Slider, Button, IconButton, Switch, FormControlLabel, TextField } from '@mui/material';
import { T, DP_LAYOUT_SX } from '../_tokens';

export type PricingMode = 'prudent' | 'equilibre' | 'agressif';

export interface PricingModeDef {
  id: string;
  label: string;
  multiplier: number;
  kind: 'preset' | 'custom';
  enabled: boolean;
}

export const DEFAULT_PRICING_MODES: PricingModeDef[] = [
  { id: 'prudent', label: 'Prudent', multiplier: 0.95, kind: 'preset', enabled: true },
  { id: 'equilibre', label: 'Équilibré', multiplier: 1, kind: 'preset', enabled: true },
  { id: 'agressif', label: 'Agressif', multiplier: 1.1, kind: 'preset', enabled: true },
];

export type PricingEventKind = 'fixed' | 'market_percent';

export interface PricingEvent {
  id: string;
  emoji: string;
  name: string;
  dateRange: string;
  kind: PricingEventKind;
  /** MAD/nuit si kind=fixed */
  fixedPrice: number;
  /** % du marché × occupation si kind=market_percent (ex. 115 = 115 %) */
  marketPercent: number;
  minNights: number;
}

export interface PricingSuggestion {
  id: string;
  dateRange: string;
  reason: string;
  deltaPct: number;
}

export interface PricingControlsProps {
  floor: number;
  ceiling: number;
  floorRange: [number, number];
  ceilingRange: [number, number];
  recoFloor: number;
  recoCeiling: number;
  pricingModes: PricingModeDef[];
  activeModeId: string;
  events: PricingEvent[];
  suggestions: PricingSuggestion[];
  gapBlockEnabled: boolean;
  gapBlockMinNights: number;
  modeEnabled: boolean;
  lastMinuteEnabled: boolean;
  lastMinuteWindowDays: number;
  lastMinuteDiscountPct: number;
  occupancyBandsEnabled: boolean;
  occupancyLowMax: number;
  occupancyLowAdj: number;
  occupancyHighMin: number;
  occupancyHighAdj: number;
  pricingBaseSource: 'estimate' | 'listing_base' | 'manual_base';
  /** Base fixe MAD si source C (manuel). */
  manualBasePriceMad: number;
  onFloorChange: (v: number) => void;
  onCeilingChange: (v: number) => void;
  onGapBlockEnabledChange: (on: boolean) => void;
  onGapBlockMinNightsChange: (v: number) => void;
  onModeEnabledChange: (enabled: boolean) => void;
  onLastMinuteEnabledChange: (on: boolean) => void;
  onLastMinuteWindowDaysChange: (v: number) => void;
  onLastMinuteDiscountPctChange: (v: number) => void;
  onOccupancyBandsEnabledChange: (on: boolean) => void;
  onOccupancyLowMaxChange: (v: number) => void;
  onOccupancyLowAdjChange: (v: number) => void;
  onOccupancyHighMinChange: (v: number) => void;
  onOccupancyHighAdjChange: (v: number) => void;
  onPricingBaseSourceChange: (v: 'estimate' | 'listing_base' | 'manual_base') => void;
  onManualBasePriceMadChange: (v: number) => void;
  onApplyRecoBounds: () => void;
  onActiveModeChange: (modeId: string) => void;
  onModeToggle: (modeId: string, enabled: boolean) => void;
  onAddCustomMode: () => void;
  onUpdateCustomMode: (modeId: string, patch: Partial<Pick<PricingModeDef, 'label' | 'multiplier'>>) => void;
  onDeleteCustomMode: (modeId: string) => void;
  onAddEvent: () => void;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onAcceptSuggestion: (id: string) => void;
  estimatedRevenue?: number;
  estimatedRevenueLiftPct?: number;
  hasBoundsProd?: boolean;
  /** Comps vs estimate — évite la confusion 500–800 MAD */
  boundsContextHint?: string;
}

const PRESET_META: Record<
  string,
  { desc: React.ReactNode; quote: string; recommended?: boolean }
> = {
  prudent: {
    desc: <>Coefficient <b>×0,95</b> sur le prix marché</>,
    quote: 'Je veux remplir mon calendrier',
  },
  equilibre: {
    desc: <>Coefficient <b>×1</b> — référence marché</>,
    quote: "L'optimum revenu × occupation",
    recommended: true,
  },
  agressif: {
    desc: <>Coefficient <b>×1,1</b> — premium</>,
    quote: 'Je vise le segment premium',
  },
};

export default function PricingControls(props: PricingControlsProps) {
  const {
    floor, ceiling, floorRange, ceilingRange, recoFloor, recoCeiling,
    pricingModes, activeModeId, events, suggestions, gapBlockEnabled, gapBlockMinNights, modeEnabled,
    lastMinuteEnabled, lastMinuteWindowDays, lastMinuteDiscountPct,
    occupancyBandsEnabled, occupancyLowMax, occupancyLowAdj, occupancyHighMin, occupancyHighAdj,
    pricingBaseSource, manualBasePriceMad,
    onGapBlockEnabledChange, onGapBlockMinNightsChange,
    onFloorChange, onCeilingChange, onModeEnabledChange,
    onLastMinuteEnabledChange, onLastMinuteWindowDaysChange, onLastMinuteDiscountPctChange,
    onOccupancyBandsEnabledChange, onOccupancyLowMaxChange, onOccupancyLowAdjChange,
    onOccupancyHighMinChange, onOccupancyHighAdjChange,
    onPricingBaseSourceChange, onManualBasePriceMadChange,
    onApplyRecoBounds,
    onActiveModeChange, onModeToggle, onAddCustomMode, onUpdateCustomMode, onDeleteCustomMode,
    onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    estimatedRevenue, estimatedRevenueLiftPct, hasBoundsProd = false, boundsContextHint,
  } = props;

  const dash = '—';
  const sortedModes = [...pricingModes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'preset' ? -1 : 1;
    return a.label.localeCompare(b.label, 'fr');
  });

  const cascadeChips: { n: number; label: string; on: boolean }[] = [
    {
      n: 1,
      label:
        pricingBaseSource === 'manual_base'
          ? `Base · ${manualBasePriceMad} MAD`
          : pricingBaseSource === 'listing_base'
            ? 'Base · listing'
            : 'Base · estimé',
      on: true,
    },
    { n: 2, label: 'Mode', on: modeEnabled },
    { n: 3, label: 'Occupation', on: occupancyBandsEnabled },
    { n: 4, label: 'Bornes', on: true },
    { n: 5, label: 'Events', on: events.length > 0 },
    { n: 6, label: 'Last-min', on: lastMinuteEnabled },
  ];

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
      gap: 2,
      ...DP_LAYOUT_SX,
    }}>
      {/* ── Bannière pédagogique + cascade live ───────────────── */}
      <Box sx={{
        gridColumn: { md: '1 / -1' },
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: `1px solid ${T.goldTint2}`,
        background: `linear-gradient(135deg, ${T.goldTint}, ${T.bg1} 55%)`,
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', mb: 0.625 }}>
          Comment Sojori calcule votre prix
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.5, maxWidth: 720, mb: 1.75 }}>
          Comme PriceLabs : on part d&apos;une <b>base</b>, on applique le <b>mode</b> et
          l&apos;<b>occupation</b>, on serre dans les <b>bornes</b>, puis on surcharge les{' '}
          <b>événements</b> et la <b>dernière minute</b>. Chaque nuit, le cron refait cette cascade.
        </Typography>
        <Stack
          direction="row"
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          {cascadeChips.map((chip, i) => (
            <React.Fragment key={chip.n}>
              {i > 0 && (
                <Typography
                  sx={{
                    fontSize: 11,
                    color: T.text4,
                    fontFamily: '"Geist Mono", monospace',
                    px: 0.25,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  →
                </Typography>
              )}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.4,
                  borderRadius: 999,
                  border: `1px solid ${chip.on ? T.goldTint2 : T.border}`,
                  bgcolor: chip.on ? T.bg1 : T.bg3,
                  opacity: chip.on ? 1 : 0.42,
                  transition: 'opacity 0.15s',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9.5,
                    fontWeight: 800,
                    fontFamily: '"Geist Mono", monospace',
                    bgcolor: chip.on ? T.gold : T.bg2,
                    color: chip.on ? T.text : T.text3,
                  }}
                >
                  {chip.n}
                </Box>
                <Typography sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: chip.on ? T.text : T.text3,
                  whiteSpace: 'nowrap',
                }}>
                  {chip.label}
                  {!chip.on && (
                    <Box component="span" sx={{ ml: 0.5, fontSize: 9.5, fontWeight: 800, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
                      OFF
                    </Box>
                  )}
                </Typography>
              </Box>
            </React.Fragment>
          ))}
        </Stack>
      </Box>

      {/* ① Base du calcul */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <CtrlBlock
          title="① Base du calcul"
          stepHint="Choisissez d’où part le prix avant les réglages ci-dessous."
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            {[
              {
                id: 'estimate' as const,
                title: 'A · Estimation prix de marché',
                desc: 'Recommandé — estimation marché, puis vos réglages',
                recommended: true,
              },
              {
                id: 'listing_base' as const,
                title: 'B · Prix listing',
                desc: 'Base = prix déjà en place · + réglages',
                recommended: false,
              },
              {
                id: 'manual_base' as const,
                title: 'C · Prix manuel',
                desc: 'Base fixe (ex. 1000 MAD) · + mode / occ / last-min',
                recommended: false,
              },
            ].map((opt) => {
              const on = pricingBaseSource === opt.id;
              return (
                <Box
                  key={opt.id}
                  onClick={() => onPricingBaseSourceChange(opt.id)}
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    p: 1.5,
                    borderRadius: 1.25,
                    border: `1.5px solid ${on ? T.gold : T.border}`,
                    bgcolor: on ? T.goldTint : T.bg1,
                    boxShadow: on ? `0 0 0 2px ${T.goldTint}` : 'none',
                    position: 'relative',
                  }}
                >
                  {opt.recommended ? (
                    <Box sx={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 9, fontWeight: 800, fontFamily: '"Geist Mono", monospace',
                      bgcolor: T.gold, color: T.text, px: 0.6, py: 0.1, borderRadius: 999,
                    }}>★ RECO</Box>
                  ) : null}
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, pr: opt.recommended ? 5 : 0 }}>
                    {opt.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: T.text2, mt: 0.5, lineHeight: 1.4 }}>
                    {opt.desc}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
          {pricingBaseSource === 'manual_base' ? (
            <Box sx={{ mt: 1.75, p: 1.5, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Montant de base (MAD)</Typography>
                <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 800, fontSize: 14 }}>
                  {manualBasePriceMad.toLocaleString('fr-FR')} MAD
                </Typography>
              </Stack>
              <GoldSlider
                value={manualBasePriceMad}
                min={200}
                max={5000}
                step={50}
                onChange={onManualBasePriceMadChange}
              />
              <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.75 }}>
                Tous les jours partent de ce montant, puis mode / occupation / last-min / events.
              </Typography>
            </Box>
          ) : null}
        </CtrlBlock>
      </Box>

      {/* ② Bornes */}
      <CtrlBlock
        title="② Bornes de prix"
        stepHint="Plancher et plafond : le prix final ne sort jamais de cette fourchette."
      >
        {boundsContextHint ? (
          <Typography sx={{ fontSize: 10.5, color: T.text2, lineHeight: 1.45, mb: 1.5 }}>
            {boundsContextHint}
          </Typography>
        ) : null}
        {hasBoundsProd ? <DistributionMini /> : null}
        <Box sx={{ mb: 2.25 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={lblSx}>Prix min (plancher)</Typography>
            <Typography sx={valSx}>{hasBoundsProd ? floor.toLocaleString('fr-FR') : dash}<Box component="span" sx={{ fontSize: 10, color: T.text3, ml: 0.375 }}>MAD</Box></Typography>
          </Stack>
          <GoldSlider value={floor} min={floorRange[0]} max={floorRange[1]} step={50} onChange={onFloorChange} />
        </Box>
        <Box
          sx={{
            mb: 2.25,
            p: 1.5,
            borderRadius: 1.25,
            bgcolor: gapBlockEnabled ? T.bg2 : 'rgba(211,47,47,0.04)',
            border: `1px solid ${gapBlockEnabled ? T.border : '#d32f2f'}`,
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text }}>
              Combler trous (min stay)
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => onGapBlockEnabledChange(!gapBlockEnabled)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 800,
                fontFamily: '"Geist Mono", monospace',
                px: 1,
                py: 0.35,
                borderRadius: 999,
                bgcolor: gapBlockEnabled ? T.successTint : T.bg3,
                color: gapBlockEnabled ? T.success : T.text3,
              }}
            >
              {gapBlockEnabled ? 'ON' : 'OFF'}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 11, color: T.text2, lineHeight: 1.45, mb: 1.25 }}>
            Trou de <b>2 nuits</b> avec min stay client <b>3</b> → on écrit <b>min stay 2</b> sur
            ces jours (valeur d&apos;origine sauvegardée). Trou 1 nuit : signalé seulement.
            Annulation résa : autre flux calendrier.
          </Typography>
          {gapBlockEnabled ? (
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Min stay client (référence)</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>{gapBlockMinNights} nuit(s)</Typography>
              </Stack>
              <GoldSlider
                value={gapBlockMinNights}
                min={2}
                max={14}
                step={1}
                onChange={onGapBlockMinNightsChange}
              />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
              Désactivé — aucun ajustement min stay sur les trous.
            </Typography>
          )}
        </Box>
        <Box sx={{ mb: 2.25 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={lblSx}>Prix max (plafond)</Typography>
            <Typography sx={valSx}>{hasBoundsProd ? ceiling.toLocaleString('fr-FR') : dash}<Box component="span" sx={{ fontSize: 10, color: T.text3, ml: 0.375 }}>MAD</Box></Typography>
          </Stack>
          <GoldSlider value={ceiling} min={ceilingRange[0]} max={ceilingRange[1]} step={100} onChange={onCeilingChange} />
        </Box>
        <Box sx={{
          mt: 2.25, p: 1.75, borderRadius: 1.375,
          background: `linear-gradient(135deg, ${T.goldTint}, transparent 80%)`,
          border: `1px solid ${T.goldTint2}`,
        }}>
          <Typography sx={{
            fontSize: 11, color: T.goldDeep, fontFamily: '"Geist Mono", monospace',
            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.625,
          }}>💡 Recommandation Sojori</Typography>
          <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.125 }}>
            Plancher <b style={{ color: T.text, fontFamily: '"Geist Mono", monospace' }}>{recoFloor} MAD</b> · Plafond{' '}
            <b style={{ color: T.text, fontFamily: '"Geist Mono", monospace' }}>{recoCeiling} MAD</b> · aligné P25→P75 Guéliz.
          </Typography>
          <Button onClick={onApplyRecoBounds} sx={{
            px: 1.5, py: 0.75, bgcolor: T.bg1, border: `1px solid ${T.goldDeep}`,
            color: T.goldDeep, fontSize: 11.5, fontWeight: 700, borderRadius: 1, textTransform: 'none',
            '&:hover': { bgcolor: T.gold, color: T.text },
          }}>Appliquer les défauts</Button>
        </Box>
      </CtrlBlock>

      {/* ③ Mode */}
      <CtrlBlock
        title="③ Coefficient modes"
        stepHint="Positionnement vs marché (×0,95 / ×1 / ×1,1). Pas le taux d’occupation."
      >
        <FormControlLabel
          sx={{ mb: 1.25, ml: 0 }}
          control={
            <Switch
              checked={modeEnabled}
              onChange={(_, v) => onModeEnabledChange(v)}
              sx={{ '& .Mui-checked': { color: T.goldDeep }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: T.gold } }}
            />
          }
          label={
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
              {modeEnabled ? 'Modes actifs' : 'Modes OFF (×1 — sans effet)'}
            </Typography>
          }
        />
        <Box sx={{ opacity: modeEnabled ? 1 : 0.55 }}>
          {sortedModes.map((m) => {
            const meta = m.kind === 'preset' ? PRESET_META[m.id] : null;
            const isActive = activeModeId === m.id && m.enabled;
            return (
              <Box key={m.id} sx={{ mb: 1.25, position: 'relative' }}>
                <ModeCard
                  on={isActive}
                  disabled={!m.enabled}
                  recommended={meta?.recommended}
                  name={m.label}
                  sub={`×${m.multiplier}${m.kind === 'custom' ? ' · personnalisé' : ''}`}
                  desc={meta?.desc ?? (
                    <>Coefficient <b>×{m.multiplier}</b></>
                  )}
                  quote={meta?.quote ?? 'Mode personnalisé'}
                  extra={
                    m.id === 'equilibre' && isActive && estimatedRevenue !== undefined ? (
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1,
                        mt: 1, p: '7px 10px',
                        background: `linear-gradient(90deg, ${T.goldTint}, transparent)`,
                        borderRadius: '7px', fontSize: 11, color: T.text2, fontFamily: '"Geist Mono", monospace',
                      }}>
                        <span>Revenu annuel estimé</span>
                        <Box component="b" sx={{ color: T.goldDeep, fontSize: 13, fontWeight: 800 }}>
                          {estimatedRevenue.toLocaleString('fr-FR')} MAD
                        </Box>
                        {estimatedRevenueLiftPct !== undefined && <span>· +{estimatedRevenueLiftPct}%</span>}
                      </Stack>
                    ) : null
                  }
                  onClick={() => m.enabled && onActiveModeChange(m.id)}
                />
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: -0.5, mb: 0.5, pl: 0.5 }}>
                  <Switch
                    size="small"
                    checked={m.enabled}
                    onChange={(_, v) => onModeToggle(m.id, v)}
                    sx={{ '& .Mui-checked': { color: T.goldDeep } }}
                  />
                  <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
                    {m.enabled ? 'Activé' : 'Désactivé'}
                  </Typography>
                  {m.kind === 'custom' && (
                    <>
                      <TextField
                        size="small"
                        value={m.label}
                        onChange={(e) => onUpdateCustomMode(m.id, { label: e.target.value })}
                        sx={{ ml: 'auto', maxWidth: 140, '& input': { fontSize: 11, py: 0.5 } }}
                      />
                      <IconButton size="small" onClick={() => onDeleteCustomMode(m.id)} sx={{ fontSize: 12 }}>🗑</IconButton>
                    </>
                  )}
                </Stack>
                {m.kind === 'custom' && m.enabled && (
                  <Box sx={{ px: 1, pb: 1 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={lblSx}>Coefficient</Typography>
                      <Typography sx={{ ...valSx, fontSize: 12 }}>×{m.multiplier}</Typography>
                    </Stack>
                    <GoldSlider
                      value={m.multiplier}
                      min={0.75}
                      max={1.35}
                      step={0.01}
                      onChange={(v) => onUpdateCustomMode(m.id, { multiplier: v })}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
          <Button
            fullWidth
            onClick={onAddCustomMode}
            sx={{
              py: 1, mt: 0.5, bgcolor: T.bg2, border: `1.5px dashed ${T.borderStrong}`,
              borderRadius: 1.25, color: T.text2, fontSize: 12, fontWeight: 700, textTransform: 'none',
              '&:hover': { borderColor: T.gold, bgcolor: T.goldTint, color: T.goldDeep },
            }}
          >
            + Mode personnalisé
          </Button>
        </Box>
      </CtrlBlock>

      {/* ④ Occupation · ⑤ Last-minute */}
      <Box sx={{ gridColumn: { md: '1 / -1' }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <CtrlBlock
          title="④ Taux d’occupation"
          stepHint="Mois sous ou sur-occupé → baisse ou hausse % (cron nuit)."
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Bandes actives</Typography>
            <Box
              component="button"
              type="button"
              onClick={() => onOccupancyBandsEnabledChange(!occupancyBandsEnabled)}
              sx={{
                all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 800,
                fontFamily: '"Geist Mono", monospace', px: 1, py: 0.35, borderRadius: 999,
                bgcolor: occupancyBandsEnabled ? T.successTint : T.bg3,
                color: occupancyBandsEnabled ? T.success : T.text3,
              }}
            >
              {occupancyBandsEnabled ? 'ON' : 'OFF'}
            </Box>
          </Stack>
          <Box sx={{ opacity: occupancyBandsEnabled ? 1 : 0.5 }}>
            <Box sx={{ mb: 1.75 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Seuil bas (sous → baisse)</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>&lt; {occupancyLowMax} %</Typography>
              </Stack>
              <GoldSlider value={occupancyLowMax} min={10} max={50} step={5} onChange={onOccupancyLowMaxChange} />
            </Box>
            <Box sx={{ mb: 1.75 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Ajustement bas</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>{occupancyLowAdj} %</Typography>
              </Stack>
              <GoldSlider value={occupancyLowAdj} min={-30} max={0} step={1} onChange={onOccupancyLowAdjChange} />
            </Box>
            <Box sx={{ mb: 1.75 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Seuil haut (dessus → hausse)</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>&gt; {occupancyHighMin} %</Typography>
              </Stack>
              <GoldSlider value={occupancyHighMin} min={50} max={90} step={5} onChange={onOccupancyHighMinChange} />
            </Box>
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Ajustement haut</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>+{occupancyHighAdj} %</Typography>
              </Stack>
              <GoldSlider value={occupancyHighAdj} min={0} max={40} step={1} onChange={onOccupancyHighAdjChange} />
            </Box>
          </Box>
        </CtrlBlock>

        <CtrlBlock
          title="⑤ Dernière minute"
          stepHint="Sur les N jours dispo à venir : % sur le prix déjà calculé."
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Réduction active</Typography>
            <Box
              component="button"
              type="button"
              onClick={() => onLastMinuteEnabledChange(!lastMinuteEnabled)}
              sx={{
                all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 800,
                fontFamily: '"Geist Mono", monospace', px: 1, py: 0.35, borderRadius: 999,
                bgcolor: lastMinuteEnabled ? T.successTint : T.bg3,
                color: lastMinuteEnabled ? T.success : T.text3,
              }}
            >
              {lastMinuteEnabled ? 'ON' : 'OFF'}
            </Box>
          </Stack>
          <Box sx={{ opacity: lastMinuteEnabled ? 1 : 0.5 }}>
            <Box sx={{ mb: 1.75 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Fenêtre (jours)</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>{lastMinuteWindowDays} j</Typography>
              </Stack>
              <GoldSlider value={lastMinuteWindowDays} min={3} max={21} step={1} onChange={onLastMinuteWindowDaysChange} />
            </Box>
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={lblSx}>Ajustement prix dynamique</Typography>
                <Typography sx={{ ...valSx, fontSize: 12 }}>{lastMinuteDiscountPct} %</Typography>
              </Stack>
              <GoldSlider value={lastMinuteDiscountPct} min={-40} max={0} step={1} onChange={onLastMinuteDiscountPctChange} />
            </Box>
          </Box>
        </CtrlBlock>
      </Box>

      {/* ⑥ Events */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <CtrlBlock
          title="⑥ Événements"
          stepHint="Périodes datées : prix fixe MAD ou % marché. Hors last-min / occupation."
        >
          <Button fullWidth onClick={onAddEvent} sx={{
            py: 1.125, mb: 1.5, bgcolor: T.bg2, border: `1.5px dashed ${T.borderStrong}`,
            borderRadius: 1.25, color: T.text2, fontSize: 12, fontWeight: 700, textTransform: 'none',
            '&:hover': { borderColor: T.gold, bgcolor: T.goldTint, color: T.goldDeep },
          }}>+ Ajouter une période</Button>

          {events.map(ev => (
            <Stack key={ev.id} direction="row" sx={{ alignItems: 'center', gap: 1.25,
              p: '11px 13px', mb: 1, bgcolor: T.bg1,
              border: `1px solid ${T.border}`, borderRadius: 1.25,
            }}>
              <Box sx={{ fontSize: 18 }}>{ev.emoji}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{ev.name}</Typography>
                <Typography sx={{
                  fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.25,
                }}>
                  {ev.dateRange} ·{' '}
                  <b style={{ color: T.goldDeep }}>
                    {ev.kind === 'market_percent'
                      ? `${ev.marketPercent} % marché×occupation`
                      : `${ev.fixedPrice.toLocaleString('fr-FR')} MAD/nuit fixe`}
                  </b>
                  {' '}· min {ev.minNights} nuits
                </Typography>
              </Box>
              <Stack direction="row" sx={{ gap: 0.375 }}>
                <IconButton size="small" onClick={() => onEditEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>✏</IconButton>
                <IconButton size="small" onClick={() => onDeleteEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>🗑</IconButton>
              </Stack>
            </Stack>
          ))}

          {suggestions.length > 0 && (
            <Box sx={{
              mt: 1.75, p: 1.5, borderRadius: 1.375,
              background: `linear-gradient(135deg, ${T.aiTint}, transparent)`,
              border: '1px solid rgba(124,58,237,0.30)',
            }}>
              <Typography sx={{
                fontSize: 10.5, color: T.ai, fontFamily: '"Geist Mono", monospace',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.875,
              }}>✨ Sojori suggère · détection IA</Typography>
              {suggestions.map(s => (
                <Stack key={s.id} direction="row"
                  onClick={() => onAcceptSuggestion(s.id)} sx={{ alignItems: 'center', gap: 1.125,
                    p: '9px 11px', bgcolor: T.bg1, border: '1px solid rgba(124,58,237,0.20)',
                    borderRadius: 1, cursor: 'pointer', mb: 0.625,
                    '&:hover': { borderColor: T.ai, bgcolor: 'rgba(124,58,237,0.04)' },
                  }}>
                  <Box sx={{ fontSize: 14 }}>📌</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{s.dateRange}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.125 }}>
                      {s.reason}
                    </Typography>
                  </Box>
                  <Box sx={{
                    ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 11, fontWeight: 800,
                    color: T.ai, bgcolor: T.aiTint, px: 0.875, py: 0.25, borderRadius: '99px',
                  }}>+{s.deltaPct}%</Box>
                </Stack>
              ))}
            </Box>
          )}
        </CtrlBlock>
      </Box>
    </Box>
  );
}

const lblSx = { fontSize: 11, fontFamily: '"Geist Mono", monospace', fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.04em' } as const;
const valSx = { fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' } as const;

function CtrlBlock({ title, stepHint, children }: {
  title: string;
  stepHint?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.75,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, mb: stepHint ? 0.5 : 1.75, letterSpacing: '-0.015em' }}>
        {title}
      </Typography>
      {stepHint ? (
        <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.45, mb: 1.5 }}>
          {stepHint}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

function GoldSlider({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <Slider value={value} min={min} max={max} step={step}
      onChange={(_, v) => onChange(v as number)}
      sx={{
        color: T.goldDeep, height: 6,
        '& .MuiSlider-rail': { bgcolor: T.borderStrong, opacity: 0.3 },
        '& .MuiSlider-track': { background: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`, border: 0, boxShadow: `0 0 8px ${T.goldTint2}` },
        '& .MuiSlider-thumb': {
          width: 24, height: 24, bgcolor: '#fff', border: `3px solid ${T.goldDeep}`,
          boxShadow: '0 3px 10px rgba(199,155,34,0.30)',
          '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 6px ${T.goldTint}` },
        },
      }}
    />
  );
}

function ModeCard({ on, disabled, recommended, name, sub, desc, quote, extra, onClick }: {
  on: boolean; disabled?: boolean; recommended?: boolean; name: string; sub?: string;
  desc: React.ReactNode; quote: string; extra?: React.ReactNode; onClick: () => void;
}) {
  return (
    <Box onClick={disabled ? undefined : onClick} sx={{
      p: 1.75, borderRadius: 1.5, cursor: disabled ? 'default' : 'pointer', position: 'relative',
      bgcolor: T.bg1,
      border: `1.5px solid ${on ? T.gold : T.border}`,
      background: on ? `linear-gradient(135deg, ${T.goldTint}, ${T.bg1} 70%)` : T.bg1,
      boxShadow: on ? `0 0 0 3px ${T.goldTint}` : 'none',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.15s',
    }}>
      <Box sx={{
        position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${on ? T.goldDeep : T.borderStrong}`,
        background: on ? `radial-gradient(circle at center, ${T.goldDeep} 0 5px, transparent 5px)` : 'transparent',
      }} />
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.625, pr: 4 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{name}</Typography>
        {sub && (
          <Typography sx={{ fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{sub}</Typography>
        )}
        {recommended && (
          <Box sx={{
            fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
            bgcolor: T.gold, color: T.text, px: 0.75, py: 0.125,
            borderRadius: '99px', letterSpacing: '0.04em',
          }}>★ RECOMMANDÉ</Box>
        )}
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 0.75, '& b': { color: T.text, fontWeight: 700 } }}>
        {desc}
      </Typography>
      <Box sx={{
        fontSize: 11, color: T.text2, fontStyle: 'italic',
        p: '6px 9px', bgcolor: T.bg2, borderRadius: 0.75,
        borderLeft: `2px solid ${on ? T.gold : T.borderStrong}`,
      }}>"{quote}"</Box>
      {on && extra}
    </Box>
  );
}

function DistributionMini() {
  return (
    <Box sx={{ height: 48, my: 1, mb: -0.5 }}>
      <svg viewBox="0 0 280 48" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="distrGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={T.gold} stopOpacity="0.4" />
            <stop offset="1" stopColor={T.gold} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M 0,42 Q 30,42 50,38 T 100,15 T 140,8 T 180,15 T 230,32 T 280,42 L 280,48 L 0,48 Z" fill="url(#distrGrad)" />
        <path d="M 0,42 Q 30,42 50,38 T 100,15 T 140,8 T 180,15 T 230,32 T 280,42" stroke={T.goldDeep} strokeWidth="1.5" fill="none" />
        <line x1="70" y1="0" x2="70" y2="48" stroke={T.text4} strokeDasharray="2 2" opacity="0.5" />
        <line x1="140" y1="0" x2="140" y2="48" stroke={T.text4} strokeDasharray="2 2" opacity="0.5" />
        <line x1="210" y1="0" x2="210" y2="48" stroke={T.text4} strokeDasharray="2 2" opacity="0.5" />
        <text x="70" y="9" textAnchor="middle" fontSize="7" fontFamily="Geist Mono" fill={T.text3} fontWeight="700">P25</text>
        <text x="140" y="9" textAnchor="middle" fontSize="7" fontFamily="Geist Mono" fill={T.text3} fontWeight="700">P50</text>
        <text x="210" y="9" textAnchor="middle" fontSize="7" fontFamily="Geist Mono" fill={T.text3} fontWeight="700">P75</text>
        <line x1="50" y1="0" x2="50" y2="48" stroke={T.goldDeep} strokeWidth="2" />
        <line x1="220" y1="0" x2="220" y2="48" stroke={T.goldDeep} strokeWidth="2" />
      </svg>
    </Box>
  );
}
