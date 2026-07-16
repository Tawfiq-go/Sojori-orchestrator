// ════════════════════════════════════════════════════════════════════
// PricingControls.tsx — Réglages pédagogiques (cascade PriceLabs-like)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Slider, Button, IconButton, TextField } from '@mui/material';
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
  /** Début fenêtre A (jours avant arrivée). */
  lastMinuteFromDays: number;
  /** Fin fenêtre B (jours avant arrivée). */
  lastMinuteToDays: number;
  /** @deprecated alias de lastMinuteToDays */
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
  /** Si false, les events restent en mémoire mais ne sont pas appliqués. */
  eventsEnabled?: boolean;
  onFloorChange: (v: number) => void;
  onCeilingChange: (v: number) => void;
  onGapBlockEnabledChange: (on: boolean) => void;
  onGapBlockMinNightsChange: (v: number) => void;
  onModeEnabledChange: (enabled: boolean) => void;
  onLastMinuteEnabledChange: (on: boolean) => void;
  onLastMinuteFromDaysChange: (v: number) => void;
  onLastMinuteToDaysChange: (v: number) => void;
  onLastMinuteDiscountPctChange: (v: number) => void;
  onOccupancyBandsEnabledChange: (on: boolean) => void;
  onOccupancyLowMaxChange: (v: number) => void;
  onOccupancyLowAdjChange: (v: number) => void;
  onOccupancyHighMinChange: (v: number) => void;
  onOccupancyHighAdjChange: (v: number) => void;
  onPricingBaseSourceChange: (v: 'estimate' | 'listing_base' | 'manual_base') => void;
  onManualBasePriceMadChange: (v: number) => void;
  onEventsEnabledChange?: (on: boolean) => void;
  onApplyRecoBounds: () => void;
  onActiveModeChange: (modeId: string) => void;
  /** Conservé pour compat — les modes se choisissent au clic carte. */
  onModeToggle?: (modeId: string, enabled: boolean) => void;
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

const lblSx = {
  fontSize: 11,
  fontFamily: '"Geist Mono", monospace',
  fontWeight: 700,
  color: T.text3,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
} as const;
const valSx = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: '-0.01em',
} as const;

/** Interrupteur uniforme Actif · Oui / Non */
function ActiveToggle({
  active,
  onChange,
  alwaysOn,
}: {
  active: boolean;
  onChange?: (v: boolean) => void;
  alwaysOn?: boolean;
}) {
  if (alwaysOn) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.4,
          borderRadius: 999,
          bgcolor: T.goldTint,
          border: `1px solid ${T.gold}`,
        }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.goldDeep, letterSpacing: '0.04em' }}>
          TOUJOURS ACTIF
        </Typography>
      </Box>
    );
  }
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>Actif</Typography>
      <Box
        sx={{
          display: 'inline-flex',
          p: 0.25,
          borderRadius: 999,
          bgcolor: T.bg3,
          border: `1px solid ${T.border}`,
        }}
      >
        {([true, false] as const).map((v) => {
          const on = active === v;
          return (
            <Box
              key={v ? 'oui' : 'non'}
              component="button"
              type="button"
              onClick={() => onChange?.(v)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                px: 1.1,
                py: 0.35,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                fontFamily: '"Geist Mono", monospace',
                bgcolor: on ? (v ? T.successTint : T.bg1) : 'transparent',
                color: on ? (v ? T.success : T.text3) : T.text4,
                boxShadow: on ? `inset 0 0 0 1px ${v ? T.success : T.border}` : 'none',
              }}
            >
              {v ? 'Oui' : 'Non'}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}

function CtrlBlock({
  title,
  stepHint,
  active,
  onActiveChange,
  alwaysOn,
  children,
}: {
  title: string;
  stepHint?: string;
  active?: boolean;
  onActiveChange?: (v: boolean) => void;
  alwaysOn?: boolean;
  children: React.ReactNode;
}) {
  const isOff = !alwaysOn && active === false;
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${isOff ? T.border : T.border}`,
        borderRadius: 2,
        p: { xs: 2, md: 2.5 },
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        opacity: isOff ? 0.92 : 1,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: stepHint ? 0.5 : 1.5,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.015em', flex: 1 }}>
          {title}
        </Typography>
        {(alwaysOn || onActiveChange != null) && (
          <ActiveToggle
            alwaysOn={alwaysOn}
            active={alwaysOn ? true : Boolean(active)}
            onChange={onActiveChange}
          />
        )}
      </Stack>
      {stepHint ? (
        <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.45, mb: 1.5 }}>
          {stepHint}
        </Typography>
      ) : null}
      {isOff ? (
        <Typography sx={{ fontSize: 11.5, color: T.text3, fontStyle: 'italic', mb: 1.25 }}>
          Désactivé — les valeurs ci-dessous sont conservées mais ignorées au calcul. Pas besoin de
          mettre des zéros.
        </Typography>
      ) : null}
      <Box
        sx={{
          opacity: isOff ? 0.45 : 1,
          pointerEvents: isOff ? 'none' : 'auto',
          transition: 'opacity 0.15s',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function FieldSlider({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  display: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={lblSx}>{label}</Typography>
        <Typography sx={{ ...valSx, fontSize: 13 }}>{display}</Typography>
      </Stack>
      <GoldSlider value={value} min={min} max={max} step={step} onChange={onChange} />
    </Box>
  );
}

export default function PricingControls(props: PricingControlsProps) {
  const {
    floor, ceiling, floorRange, ceilingRange, recoFloor, recoCeiling,
    pricingModes, activeModeId, events, suggestions, gapBlockEnabled, gapBlockMinNights, modeEnabled,
    lastMinuteEnabled, lastMinuteFromDays, lastMinuteToDays, lastMinuteDiscountPct,
    occupancyBandsEnabled, occupancyLowMax, occupancyLowAdj, occupancyHighMin, occupancyHighAdj,
    pricingBaseSource, manualBasePriceMad,
    eventsEnabled = true,
    onGapBlockEnabledChange, onGapBlockMinNightsChange,
    onFloorChange, onCeilingChange, onModeEnabledChange,
    onLastMinuteEnabledChange, onLastMinuteFromDaysChange, onLastMinuteToDaysChange, onLastMinuteDiscountPctChange,
    onOccupancyBandsEnabledChange, onOccupancyLowMaxChange, onOccupancyLowAdjChange,
    onOccupancyHighMinChange, onOccupancyHighAdjChange,
    onPricingBaseSourceChange, onManualBasePriceMadChange,
    onEventsEnabledChange,
    onApplyRecoBounds,
    onActiveModeChange, onAddCustomMode, onUpdateCustomMode, onDeleteCustomMode,
    onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    estimatedRevenue, estimatedRevenueLiftPct, boundsContextHint,
  } = props;

  const sortedModes = [...pricingModes]
    .filter((m) => m.enabled || m.kind === 'custom')
    .sort((a, b) => {
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
    { n: 2, label: 'Bornes', on: true },
    { n: 3, label: 'Mode', on: modeEnabled },
    { n: 4, label: 'Occupation', on: occupancyBandsEnabled },
    { n: 5, label: 'Last-min', on: lastMinuteEnabled },
    { n: 6, label: 'Trous', on: gapBlockEnabled },
    { n: 7, label: 'Events', on: eventsEnabled && events.length > 0 },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2,
        ...DP_LAYOUT_SX,
      }}
    >
      {/* Bannière */}
      <Box
        sx={{
          gridColumn: { md: '1 / -1' },
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          border: `1px solid ${T.goldTint2}`,
          background: `linear-gradient(135deg, ${T.goldTint}, ${T.bg1} 55%)`,
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', mb: 0.625 }}>
          Comment Sojori calcule votre prix
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.5, maxWidth: 720, mb: 1.75 }}>
          Base → bornes → mode → occupation → last-min. Un <b>événement</b> actif prend le lead
          et remplace tout sur ses dates.
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
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
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: chip.on ? T.text : T.text3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chip.label}
                  {!chip.on && (
                    <Box
                      component="span"
                      sx={{
                        ml: 0.5,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: T.text4,
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      OFF
                    </Box>
                  )}
                </Typography>
              </Box>
            </React.Fragment>
          ))}
        </Stack>
      </Box>

      {/* ① Base */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <CtrlBlock
          title="① Base du calcul"
          stepHint="D’où part le prix avant les réglages. Toujours utilisé."
          alwaysOn
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            {(
              [
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
              ] as const
            ).map((opt) => {
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
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 9,
                        fontWeight: 800,
                        fontFamily: '"Geist Mono", monospace',
                        bgcolor: T.gold,
                        color: T.text,
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 999,
                      }}
                    >
                      ★ RECO
                    </Box>
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
            <Box
              sx={{
                mt: 1.75,
                p: 1.5,
                borderRadius: 1.25,
                bgcolor: T.bg2,
                border: `1px solid ${T.border}`,
              }}
            >
              <FieldSlider
                label="Montant de base (MAD)"
                display={`${manualBasePriceMad.toLocaleString('fr-FR')} MAD`}
                value={manualBasePriceMad}
                min={200}
                max={5000}
                step={50}
                onChange={onManualBasePriceMadChange}
              />
              <Typography sx={{ fontSize: 10.5, color: T.text3, mt: -0.5 }}>
                Tous les jours partent de ce montant, puis les blocs actifs ci-dessous.
              </Typography>
            </Box>
          ) : null}
        </CtrlBlock>
      </Box>

      {/* ② Bornes — toujours actives, min + max seulement */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <CtrlBlock
          title="② Bornes de prix"
          stepHint="Plancher et plafond : le prix final ne sort jamais de cette fourchette. Toujours actifs avec le dynamic pricing."
          alwaysOn
        >
          {boundsContextHint ? (
            <Typography sx={{ fontSize: 10.5, color: T.text2, lineHeight: 1.45, mb: 1.25 }}>
              {boundsContextHint}
            </Typography>
          ) : null}

          <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.25, lineHeight: 1.4 }}>
            Deux curseurs <b>indépendants</b> — 0 à 20 000 MAD. Aucune corrélation avec P25/P75 ni
            entre min et max.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Typography sx={lblSx}>Prix min (plancher)</Typography>
              <Typography sx={valSx}>
                {floor.toLocaleString('fr-FR')}
                <Box component="span" sx={{ fontSize: 10, color: T.text3, ml: 0.375 }}>MAD</Box>
              </Typography>
            </Stack>
            <GoldSlider
              value={Math.min(floorRange[1], Math.max(floorRange[0], floor))}
              min={floorRange[0]}
              max={floorRange[1]}
              step={50}
              onChange={onFloorChange}
            />
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Typography sx={lblSx}>Prix max (plafond)</Typography>
              <Typography sx={valSx}>
                {ceiling.toLocaleString('fr-FR')}
                <Box component="span" sx={{ fontSize: 10, color: T.text3, ml: 0.375 }}>MAD</Box>
              </Typography>
            </Stack>
            <GoldSlider
              value={Math.min(ceilingRange[1], Math.max(ceilingRange[0], ceiling))}
              min={ceilingRange[0]}
              max={ceilingRange[1]}
              step={50}
              onChange={onCeilingChange}
            />
          </Box>

          {(recoFloor > 0 || recoCeiling > 0) && (
            <Typography sx={{ fontSize: 10.5, color: T.text4, lineHeight: 1.4 }}>
              Repère marché (non appliqué) : {recoFloor.toLocaleString('fr-FR')} –{' '}
              {recoCeiling.toLocaleString('fr-FR')} MAD
              {recoFloor > 0 && recoCeiling > 0 ? (
                <>
                  {' · '}
                  <Box
                    component="button"
                    type="button"
                    onClick={onApplyRecoBounds}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      color: T.goldDeep,
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    utiliser ce repère
                  </Box>
                </>
              ) : null}
            </Typography>
          )}
        </CtrlBlock>
      </Box>

      {/* ③ Mode */}
      <CtrlBlock
        title="③ Coefficient modes"
        stepHint="Positionnement vs marché (×0,95 / ×1 / ×1,1). Pas le taux d’occupation."
        active={modeEnabled}
        onActiveChange={onModeEnabledChange}
      >
        <Stack spacing={1}>
          {sortedModes.map((m) => {
            const meta = m.kind === 'preset' ? PRESET_META[m.id] : null;
            const isActive = activeModeId === m.id;
            return (
              <Box key={m.id}>
                <ModeCard
                  on={isActive}
                  recommended={meta?.recommended}
                  name={m.label}
                  sub={`×${m.multiplier}${m.kind === 'custom' ? ' · perso' : ''}`}
                  desc={meta?.desc ?? (
                    <>
                      Coefficient <b>×{m.multiplier}</b>
                    </>
                  )}
                  quote={meta?.quote ?? 'Mode personnalisé'}
                  extra={
                    m.id === 'equilibre' && isActive && estimatedRevenue !== undefined ? (
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: 'center',
                          gap: 1,
                          mt: 1,
                          p: '7px 10px',
                          background: `linear-gradient(90deg, ${T.goldTint}, transparent)`,
                          borderRadius: '7px',
                          fontSize: 11,
                          color: T.text2,
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        <span>Revenu annuel estimé</span>
                        <Box
                          component="b"
                          sx={{ color: T.goldDeep, fontSize: 13, fontWeight: 800 }}
                        >
                          {estimatedRevenue.toLocaleString('fr-FR')} MAD
                        </Box>
                        {estimatedRevenueLiftPct !== undefined && (
                          <span>· +{estimatedRevenueLiftPct}%</span>
                        )}
                      </Stack>
                    ) : null
                  }
                  onClick={() => onActiveModeChange(m.id)}
                />
                {m.kind === 'custom' && (
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 0.75, pl: 0.5 }}>
                    <TextField
                      size="small"
                      value={m.label}
                      onChange={(e) => onUpdateCustomMode(m.id, { label: e.target.value })}
                      sx={{ maxWidth: 140, '& input': { fontSize: 11, py: 0.5 } }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <FieldSlider
                        label="Coefficient"
                        display={`×${m.multiplier}`}
                        value={m.multiplier}
                        min={0.75}
                        max={1.35}
                        step={0.01}
                        onChange={(v) => onUpdateCustomMode(m.id, { multiplier: v })}
                      />
                    </Box>
                    <IconButton size="small" onClick={() => onDeleteCustomMode(m.id)} sx={{ fontSize: 12 }}>
                      🗑
                    </IconButton>
                  </Stack>
                )}
              </Box>
            );
          })}
          <Button
            fullWidth
            onClick={onAddCustomMode}
            sx={{
              py: 1,
              bgcolor: T.bg2,
              border: `1.5px dashed ${T.borderStrong}`,
              borderRadius: 1.25,
              color: T.text2,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { borderColor: T.gold, bgcolor: T.goldTint, color: T.goldDeep },
            }}
          >
            + Mode personnalisé
          </Button>
        </Stack>
      </CtrlBlock>

      {/* ④ Occupation */}
      <CtrlBlock
        title="④ Taux d’occupation"
        stepHint="Mois restant sous ou sur-occupé (à partir d’aujourd’hui) → baisse ou hausse %. Le passé du mois n’entre plus dans le %."
        active={occupancyBandsEnabled}
        onActiveChange={onOccupancyBandsEnabledChange}
      >
        <FieldSlider
          label="Seuil bas (sous → baisse)"
          display={`< ${occupancyLowMax} %`}
          value={occupancyLowMax}
          min={10}
          max={50}
          step={5}
          onChange={onOccupancyLowMaxChange}
        />
        <FieldSlider
          label="Ajustement bas"
          display={`${occupancyLowAdj} %`}
          value={occupancyLowAdj}
          min={-30}
          max={0}
          step={1}
          onChange={onOccupancyLowAdjChange}
        />
        <FieldSlider
          label="Seuil haut (dessus → hausse)"
          display={`> ${occupancyHighMin} %`}
          value={occupancyHighMin}
          min={50}
          max={90}
          step={5}
          onChange={onOccupancyHighMinChange}
        />
        <FieldSlider
          label="Ajustement haut"
          display={`+${occupancyHighAdj} %`}
          value={occupancyHighAdj}
          min={0}
          max={40}
          step={1}
          onChange={onOccupancyHighAdjChange}
        />
      </CtrlBlock>

      {/* ⑤ Last-min */}
      <CtrlBlock
        title="⑤ Dernière minute"
        stepHint="Fenêtre A→B depuis la config BD de ce listing (jours avant arrivée). Ex. A=1 B=15 = demain→J+15 ; A=10 B=30 = J+10→J+30. Y = %."
        active={lastMinuteEnabled}
        onActiveChange={onLastMinuteEnabledChange}
      >
        <FieldSlider
          label="De A (jours avant)"
          display={`J+${lastMinuteFromDays}`}
          value={lastMinuteFromDays}
          min={1}
          max={30}
          step={1}
          onChange={onLastMinuteFromDaysChange}
        />
        <FieldSlider
          label="À B (jours avant)"
          display={`J+${lastMinuteToDays}`}
          value={lastMinuteToDays}
          min={1}
          max={30}
          step={1}
          onChange={onLastMinuteToDaysChange}
        />
        <FieldSlider
          label="Ajustement Y (%)"
          display={`${lastMinuteDiscountPct} %`}
          value={lastMinuteDiscountPct}
          min={-50}
          max={0}
          step={1}
          onChange={onLastMinuteDiscountPctChange}
        />
      </CtrlBlock>

      {/* ⑥ Trous — séparé des bornes */}
        <CtrlBlock
          title="⑥ Combler trous (min stay)"
          stepHint="Référence min stay client (défaut 2, min 1). Trou de 2 nuits avec min stay 3 → on écrit min stay 2 (origine sauvegardée). Trou 1 nuit : signalé seulement."
          active={gapBlockEnabled}
          onActiveChange={onGapBlockEnabledChange}
        >
          <FieldSlider
            label="Min stay client (référence)"
            display={`${gapBlockMinNights} nuit(s)`}
            value={gapBlockMinNights}
            min={1}
            max={14}
            step={1}
            onChange={onGapBlockMinNightsChange}
          />
        </CtrlBlock>

      {/* ⑦ Events */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <CtrlBlock
          title="⑦ Événements"
          stepHint="Lead absolu : sur leurs dates, le prix event remplace mode, occupation, bornes et last-min. Prix fixe MAD ou % marché."
          active={eventsEnabled}
          onActiveChange={onEventsEnabledChange}
        >
          <Button
            fullWidth
            onClick={onAddEvent}
            sx={{
              py: 1.125,
              mb: 1.5,
              bgcolor: T.bg2,
              border: `1.5px dashed ${T.borderStrong}`,
              borderRadius: 1.25,
              color: T.text2,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { borderColor: T.gold, bgcolor: T.goldTint, color: T.goldDeep },
            }}
          >
            + Ajouter une période
          </Button>

          {events.map((ev) => (
            <Stack
              key={ev.id}
              direction="row"
              sx={{
                alignItems: 'center',
                gap: 1.25,
                p: '11px 13px',
                mb: 1,
                bgcolor: T.bg1,
                border: `1px solid ${T.border}`,
                borderRadius: 1.25,
              }}
            >
              <Box sx={{ fontSize: 18 }}>{ev.emoji}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.005em' }}>
                  {ev.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    color: T.text3,
                    fontFamily: '"Geist Mono", monospace',
                    mt: 0.25,
                  }}
                >
                  {ev.dateRange} ·{' '}
                  <b style={{ color: T.goldDeep }}>
                    {ev.kind === 'market_percent'
                      ? `${ev.marketPercent} % marché×occupation`
                      : `${ev.fixedPrice.toLocaleString('fr-FR')} MAD/nuit fixe`}
                  </b>{' '}
                  · min {ev.minNights} nuits
                </Typography>
              </Box>
              <Stack direction="row" sx={{ gap: 0.375 }}>
                <IconButton
                  size="small"
                  onClick={() => onEditEvent(ev.id)}
                  sx={{ fontSize: 12, color: T.text3 }}
                >
                  ✏
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDeleteEvent(ev.id)}
                  sx={{ fontSize: 12, color: T.text3 }}
                >
                  🗑
                </IconButton>
              </Stack>
            </Stack>
          ))}

          {suggestions.length > 0 && (
            <Box
              sx={{
                mt: 1.75,
                p: 1.5,
                borderRadius: 1.375,
                background: `linear-gradient(135deg, ${T.aiTint}, transparent)`,
                border: '1px solid rgba(124,58,237,0.30)',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  color: T.ai,
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: 0.875,
                }}
              >
                ✨ Sojori suggère · détection IA
              </Typography>
              {suggestions.map((s) => (
                <Stack
                  key={s.id}
                  direction="row"
                  onClick={() => onAcceptSuggestion(s.id)}
                  sx={{
                    alignItems: 'center',
                    gap: 1.125,
                    p: '9px 11px',
                    bgcolor: T.bg1,
                    border: '1px solid rgba(124,58,237,0.20)',
                    borderRadius: 1,
                    cursor: 'pointer',
                    mb: 0.625,
                    '&:hover': { borderColor: T.ai, bgcolor: 'rgba(124,58,237,0.04)' },
                  }}
                >
                  <Box sx={{ fontSize: 14 }}>📌</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{s.dateRange}</Typography>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: T.text3,
                        fontFamily: '"Geist Mono", monospace',
                        mt: 0.125,
                      }}
                    >
                      {s.reason}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      ml: 'auto',
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.ai,
                      bgcolor: T.aiTint,
                      px: 0.875,
                      py: 0.25,
                      borderRadius: '99px',
                    }}
                  >
                    +{s.deltaPct}%
                  </Box>
                </Stack>
              ))}
            </Box>
          )}
        </CtrlBlock>
      </Box>
    </Box>
  );
}

function GoldSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(_, v) => onChange(v as number)}
      sx={{
        color: T.goldDeep,
        height: 6,
        '& .MuiSlider-rail': { bgcolor: T.borderStrong, opacity: 0.3 },
        '& .MuiSlider-track': {
          background: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`,
          border: 0,
          boxShadow: `0 0 8px ${T.goldTint2}`,
        },
        '& .MuiSlider-thumb': {
          width: 22,
          height: 22,
          bgcolor: '#fff',
          border: `3px solid ${T.goldDeep}`,
          boxShadow: '0 3px 10px rgba(199,155,34,0.30)',
          '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 6px ${T.goldTint}` },
        },
      }}
    />
  );
}

function ModeCard({
  on,
  recommended,
  name,
  sub,
  desc,
  quote,
  extra,
  onClick,
}: {
  on: boolean;
  recommended?: boolean;
  name: string;
  sub?: string;
  desc: React.ReactNode;
  quote: string;
  extra?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        cursor: 'pointer',
        position: 'relative',
        bgcolor: T.bg1,
        border: `1.5px solid ${on ? T.gold : T.border}`,
        background: on ? `linear-gradient(135deg, ${T.goldTint}, ${T.bg1} 70%)` : T.bg1,
        boxShadow: on ? `0 0 0 3px ${T.goldTint}` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `2px solid ${on ? T.goldDeep : T.borderStrong}`,
          background: on
            ? `radial-gradient(circle at center, ${T.goldDeep} 0 5px, transparent 5px)`
            : 'transparent',
        }}
      />
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5, pr: 4 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>
          {name}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
            {sub}
          </Typography>
        )}
        {recommended && (
          <Box
            sx={{
              fontSize: 9.5,
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 800,
              bgcolor: T.gold,
              color: T.text,
              px: 0.75,
              py: 0.125,
              borderRadius: '99px',
              letterSpacing: '0.04em',
            }}
          >
            ★ RECO
          </Box>
        )}
      </Stack>
      <Typography
        sx={{ fontSize: 11.5, color: T.text3, mb: 0.75, '& b': { color: T.text, fontWeight: 700 } }}
      >
        {desc}
      </Typography>
      <Box
        sx={{
          fontSize: 11,
          color: T.text2,
          fontStyle: 'italic',
          p: '6px 9px',
          bgcolor: T.bg2,
          borderRadius: 0.75,
          borderLeft: `2px solid ${on ? T.gold : T.borderStrong}`,
        }}
      >
        &quot;{quote}&quot;
      </Box>
      {on && extra}
    </Box>
  );
}
