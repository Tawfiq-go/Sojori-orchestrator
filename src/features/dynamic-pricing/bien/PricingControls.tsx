// ════════════════════════════════════════════════════════════════════
// PricingControls.tsx — Réglages pricing « version simple »
// 3 décisions visibles (base · fourchette · positionnement) + les autres
// mécanismes rangés en « ajustements automatiques » : une phrase-résultat
// + switch, détails repliés. Résumé vivant en tête. Maquette validée
// (artifact reglages-pricing-simple). Auto-save inchangé (débounce hook).
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
  pricingBaseSource: 'estimate' | 'manual_base';
  /** Base fixe MAD si source B (manuel). */
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
  onPricingBaseSourceChange: (v: 'estimate' | 'manual_base') => void;
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
  /** Owner/PM : masquer la bannière cascade pédagogique */
  compactGuide?: boolean;
}

const MONO = '"Geist Mono", monospace';

const PRESET_META: Record<string, { sub: string; quote: string; recommended?: boolean }> = {
  prudent: { sub: 'légèrement sous le marché', quote: 'Je veux remplir' },
  equilibre: { sub: 'au prix du marché', quote: "L'optimum revenu", recommended: true },
  agressif: { sub: 'légèrement au-dessus', quote: 'Je vise premium' },
};
const PRESET_EMOJI: Record<string, string> = { prudent: '🛡', equilibre: '⚖', agressif: '🚀' };

const lblSx = {
  fontSize: 11,
  fontFamily: MONO,
  fontWeight: 700,
  color: T.text3,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
} as const;
const valSx = {
  fontFamily: MONO,
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: '-0.01em',
} as const;

const fmt = (n: number) => n.toLocaleString('fr-FR');

/* ─── Petits composants ─────────────────────────────────────── */

function GoldSlider({
  value, min, max, step, onChange,
}: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
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
        },
        '& .MuiSlider-thumb': {
          width: 20,
          height: 20,
          bgcolor: '#fff',
          border: `3px solid ${T.goldDeep}`,
          boxShadow: '0 3px 10px rgba(199,155,34,0.30)',
          '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 6px ${T.goldTint}` },
        },
      }}
    />
  );
}

function FieldSlider({
  label, display, value, min, max, step, onChange,
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
    <Box sx={{ minWidth: 160, flex: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography sx={{ ...lblSx, fontSize: 10 }}>{label}</Typography>
        <Typography sx={{ ...valSx, fontSize: 12.5 }}>{display}</Typography>
      </Stack>
      <GoldSlider value={value} min={min} max={max} step={step} onChange={onChange} />
    </Box>
  );
}

/** Switch or Sojori (remplace le Oui/Non). */
function GoldSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 40,
        height: 23,
        borderRadius: 999,
        flexShrink: 0,
        bgcolor: on ? T.goldDeep : T.bg3,
        border: `1px solid ${on ? T.goldDeep : T.borderStrong}`,
        transition: 'background 0.15s',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 2,
          left: on ? 19 : 2,
          width: 17,
          height: 17,
          borderRadius: '50%',
          bgcolor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 0.15s',
        },
        '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 2 },
      }}
    />
  );
}

/** Ligne « ajustement automatique » : phrase-résultat + switch, détails repliés. */
function AutoItem({
  emoji, title, résumé, on, onToggle, defaultOpen = false, headerExtra, children,
}: {
  emoji: string;
  title: string;
  résumé: React.ReactNode;
  on: boolean;
  onToggle?: (v: boolean) => void;
  defaultOpen?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Box sx={{ borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
      <Stack
        direction="row"
        onClick={() => setOpen((o) => !o)}
        sx={{ alignItems: 'center', gap: 1.5, py: 1.625, cursor: 'pointer', userSelect: 'none' }}
      >
        <Box sx={{ fontSize: 17, width: 26, textAlign: 'center', flexShrink: 0 }}>{emoji}</Box>
        <Box sx={{ flex: 1, minWidth: 0, opacity: on ? 1 : 0.55 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.4, '& b': { fontFamily: MONO, color: T.text2 } }}>
            {on ? résumé : 'Désactivé — valeurs conservées, ignorées au calcul'}
          </Typography>
        </Box>
        {headerExtra}
        {onToggle ? <GoldSwitch on={on} onChange={onToggle} label={title} /> : null}
        <Box
          component="span"
          sx={{
            color: T.text4,
            fontSize: 11,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(90deg)' : 'none',
            flexShrink: 0,
          }}
        >
          ▶
        </Box>
      </Stack>
      {open ? (
        <Box
          sx={{
            pb: 2,
            pl: { xs: 0, sm: 4.75 },
            opacity: on ? 1 : 0.45,
            pointerEvents: on ? 'auto' : 'none',
          }}
        >
          {children}
        </Box>
      ) : null}
    </Box>
  );
}

/** Carte compacte de positionnement (grille horizontale). */
function ModeCardMini({
  on, name, emoji, sub, quote, recommended, custom, onClick,
}: {
  on: boolean;
  name: string;
  emoji: string;
  sub: string;
  quote: string;
  recommended?: boolean;
  custom?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        p: '11px 12px',
        borderRadius: 1.5,
        border: `1.5px solid ${on ? T.goldDeep : T.borderStrong}`,
        bgcolor: on ? T.goldTint : T.bg2,
        display: 'block',
        minWidth: 0,
        '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 1 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.625, mb: 0.25 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }} noWrap>
          {emoji} {name}
        </Typography>
        {recommended ? (
          <Box
            sx={{
              fontSize: 9,
              fontFamily: MONO,
              fontWeight: 800,
              bgcolor: T.gold,
              color: T.text,
              px: 0.6,
              py: 0.1,
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            RECO
          </Box>
        ) : null}
        {custom ? (
          <Box sx={{ fontSize: 9, fontFamily: MONO, fontWeight: 800, color: T.info, bgcolor: T.infoTint, px: 0.6, py: 0.1, borderRadius: 999, flexShrink: 0 }}>
            PERSO
          </Box>
        ) : null}
      </Stack>
      <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: MONO }} noWrap>
        {sub}
      </Typography>
      <Typography sx={{ fontSize: 11, color: T.text2, mt: 0.375 }} noWrap>
        « {quote} »
      </Typography>
    </Box>
  );
}

/** Input MAD compact (fourchette). */
function MadInput({
  value, label, onCommit,
}: { value: number; label: string; onCommit: (v: number) => void }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft.replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n >= 0 && n <= 20_000 && n !== value) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <TextField
      size="small"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      sx={{
        width: 92,
        '& input': { fontFamily: MONO, fontSize: 13.5, fontWeight: 800, textAlign: 'right', py: 0.75 },
        '& .MuiOutlinedInput-root': { bgcolor: T.bg2, borderRadius: 1 },
      }}
    />
  );
}

/* ─── Composant principal ───────────────────────────────────── */

export default function PricingControls(props: PricingControlsProps) {
  const {
    floor, ceiling, recoFloor, recoCeiling,
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

  const presets = pricingModes.filter((m) => m.kind === 'preset' && m.enabled);
  const customs = pricingModes.filter((m) => m.kind === 'custom');
  const activeMode = pricingModes.find((m) => m.id === activeModeId);
  const activeCustom = customs.find((m) => m.id === activeModeId);

  /* Résumé vivant */
  const activeAdjustments: string[] = [];
  if (occupancyBandsEnabled) activeAdjustments.push('le remplissage');
  if (lastMinuteEnabled) activeAdjustments.push('la dernière minute');
  if (gapBlockEnabled) activeAdjustments.push('les trous entre réservations');
  const eventsActiveCount = eventsEnabled ? events.length : 0;

  const cardSx = {
    bgcolor: T.bg1,
    border: `1px solid ${T.border}`,
    borderRadius: 2,
    p: { xs: 2, md: 2.5 },
    boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
  } as const;

  return (
    <Stack spacing={1.75} sx={DP_LAYOUT_SX}>
      {/* ═══ Résumé vivant ═══ */}
      <Box
        sx={{
          ...cardSx,
          border: `1.5px solid ${T.goldDeep}`,
          background: `linear-gradient(135deg, ${T.goldTint}, ${T.bg1} 60%)`,
        }}
      >
        <Typography sx={{ ...lblSx, color: T.goldDeep, mb: 0.75 }}>Votre stratégie aujourd'hui</Typography>
        <Typography sx={{ fontSize: 15, lineHeight: 1.55, '& b': { color: T.goldDeep } }}>
          {pricingBaseSource === 'manual_base' ? (
            <>Base fixe de <b>{fmt(manualBasePriceMad)} MAD</b></>
          ) : (
            <>Prix de <b>marché</b></>
          )}
          {modeEnabled && activeMode ? (
            <> en position <b>{activeMode.label} ×{activeMode.multiplier}</b></>
          ) : null}
          , toujours entre <b>{fmt(floor)}</b> et <b>{fmt(ceiling)} MAD</b>.{' '}
          {activeAdjustments.length > 0
            ? <>Sojori ajuste ensuite automatiquement selon {activeAdjustments.join(', ')}.</>
            : <>Aucun ajustement automatique actif.</>}
          {eventsActiveCount > 0 ? (
            <> <b>{eventsActiveCount} événement{eventsActiveCount > 1 ? 's' : ''}</b> à prix prioritaire.</>
          ) : null}
        </Typography>
        {estimatedRevenue !== undefined ? (
          <Stack
            direction="row"
            sx={{
              alignItems: 'center', gap: 1, mt: 1.25, p: '7px 12px',
              bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.25,
              fontFamily: MONO, fontSize: 11.5, color: T.text2, width: 'fit-content', flexWrap: 'wrap',
            }}
          >
            <span>Revenu annuel estimé →</span>
            <Box component="b" sx={{ color: T.goldDeep, fontSize: 14, fontWeight: 800 }}>
              {fmt(estimatedRevenue)} MAD
            </Box>
            {estimatedRevenueLiftPct !== undefined ? <span>· +{estimatedRevenueLiftPct} %</span> : null}
          </Stack>
        ) : null}
      </Box>

      {/* ═══ L'essentiel ═══ */}
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mt: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>L'essentiel</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>— les 3 seuls réglages à décider</Typography>
      </Stack>
      <Box sx={cardSx}>
        {/* Point de départ + Fourchette côte à côte en large */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'auto 1fr' },
            columnGap: 6,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.5, py: 1.5, pt: 0.5, borderBottom: { xs: `1px solid ${T.border}`, lg: 'none' }, alignItems: { sm: 'center' } }}
        >
          <Box sx={{ width: { sm: 150 }, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Point de départ</Typography>
            <Typography sx={{ fontSize: 11, color: T.text3 }}>d'où part le prix</Typography>
          </Box>
          <Box>
            <Stack direction="row" sx={{ display: 'inline-flex', bgcolor: T.bg3, borderRadius: 1.25, p: 0.375, gap: 0.375 }}>
              {(
                [
                  { id: 'estimate' as const, label: 'Prix du marché', reco: true },
                  { id: 'manual_base' as const, label: 'Mon prix fixe', reco: false },
                ] as const
              ).map((opt) => {
                const on = pricingBaseSource === opt.id;
                return (
                  <Box
                    key={opt.id}
                    component="button"
                    type="button"
                    onClick={() => onPricingBaseSourceChange(opt.id)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      px: 1.75,
                      py: 0.875,
                      borderRadius: 1,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: on ? T.text : T.text3,
                      bgcolor: on ? T.bg1 : 'transparent',
                      boxShadow: on ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                      '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 1 },
                    }}
                  >
                    {opt.label}
                    {opt.reco ? (
                      <Box component="span" sx={{ fontSize: 9, fontFamily: MONO, color: T.goldDeep, ml: 0.625, fontWeight: 800 }}>
                        RECO
                      </Box>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
            {pricingBaseSource === 'manual_base' ? (
              <Box sx={{ mt: 1.25, maxWidth: 360 }}>
                <FieldSlider
                  label="Montant de base (MAD)"
                  display={`${fmt(manualBasePriceMad)} MAD`}
                  value={manualBasePriceMad}
                  min={200}
                  max={5000}
                  step={50}
                  onChange={onManualBasePriceMadChange}
                />
              </Box>
            ) : null}
          </Box>
        </Stack>

        {/* Fourchette */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.5, py: 1.5, pt: { lg: 0.5 }, alignItems: { sm: 'center' } }}
        >
          <Box sx={{ width: { sm: 150 }, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Fourchette</Typography>
            <Typography sx={{ fontSize: 11, color: T.text3 }}>le prix ne sort jamais de là</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <MadInput value={floor} label="Prix minimum (plancher)" onCommit={onFloorChange} />
              <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: MONO }}>min</Typography>
              <Typography sx={{ color: T.text4 }}>—</Typography>
              <MadInput value={ceiling} label="Prix maximum (plafond)" onCommit={onCeilingChange} />
              <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: MONO }}>max MAD</Typography>
              {recoFloor > 0 && recoCeiling > 0 ? (
                <Box
                  component="button"
                  type="button"
                  onClick={onApplyRecoBounds}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    border: `1.5px dashed ${T.goldDeep}`,
                    bgcolor: T.goldTint,
                    color: T.goldDeep,
                    borderRadius: 999,
                    px: 1.5,
                    py: 0.625,
                    fontSize: 11.5,
                    fontWeight: 700,
                    '&:hover': { bgcolor: T.goldTint2 },
                    '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 1 },
                  }}
                >
                  ✨ Suggérer : {fmt(recoFloor)} – {fmt(recoCeiling)} (marché)
                </Box>
              ) : null}
            </Stack>
            {boundsContextHint ? (
              <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.875, lineHeight: 1.45 }}>
                {boundsContextHint}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        </Box>

        {/* Positionnement */}
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, py: 1.5, pb: 0.5, alignItems: { sm: 'flex-start' } }}>
          <Box sx={{ width: { sm: 150 }, flexShrink: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.875 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Positionnement</Typography>
              <GoldSwitch on={modeEnabled} onChange={onModeEnabledChange} label="Positionnement actif" />
            </Stack>
            <Typography sx={{ fontSize: 11, color: T.text3 }}>vs le marché</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, opacity: modeEnabled ? 1 : 0.45, pointerEvents: modeEnabled ? 'auto' : 'none' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' },
                gap: 1,
              }}
            >
              {presets.map((m) => {
                const meta = PRESET_META[m.id];
                return (
                  <ModeCardMini
                    key={m.id}
                    on={activeModeId === m.id}
                    name={m.label}
                    emoji={PRESET_EMOJI[m.id] ?? '⭐'}
                    sub={`${meta?.sub ?? ''} · ×${m.multiplier}`}
                    quote={meta?.quote ?? ''}
                    recommended={meta?.recommended}
                    onClick={() => onActiveModeChange(m.id)}
                  />
                );
              })}
              {customs.map((m) => (
                <ModeCardMini
                  key={m.id}
                  on={activeModeId === m.id}
                  name={m.label}
                  emoji="✏️"
                  sub={`×${m.multiplier}`}
                  quote="Mon positionnement"
                  custom
                  onClick={() => onActiveModeChange(m.id)}
                />
              ))}
              <Box
                component="button"
                type="button"
                onClick={onAddCustomMode}
                aria-label="Ajouter un positionnement personnalisé"
                sx={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  border: `1.5px dashed ${T.borderStrong}`,
                  bgcolor: T.bg2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                  minHeight: 76,
                  color: T.text3,
                  '&:hover': { borderColor: T.goldDeep, bgcolor: T.goldTint, color: T.goldDeep },
                  '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 1 },
                }}
              >
                <Box sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>＋</Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>Personnalisé</Typography>
              </Box>
            </Box>

            {/* Éditeur du mode perso actif : nom + coefficient */}
            {activeCustom ? (
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center', gap: 1.5, mt: 1.25, p: '10px 12px',
                  bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.25, flexWrap: 'wrap',
                }}
              >
                <TextField
                  size="small"
                  value={activeCustom.label}
                  aria-label="Nom du positionnement personnalisé"
                  placeholder="Nom (ex. Ramadan)"
                  onChange={(e) => onUpdateCustomMode(activeCustom.id, { label: e.target.value })}
                  sx={{ width: 160, '& input': { fontSize: 12.5, fontWeight: 700, py: 0.75 } }}
                />
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <FieldSlider
                    label="Coefficient"
                    display={`×${activeCustom.multiplier}`}
                    value={activeCustom.multiplier}
                    min={0.75}
                    max={1.35}
                    step={0.01}
                    onChange={(v) => onUpdateCustomMode(activeCustom.id, { multiplier: v })}
                  />
                </Box>
                <IconButton
                  size="small"
                  aria-label="Supprimer ce positionnement"
                  onClick={() => onDeleteCustomMode(activeCustom.id)}
                  sx={{ fontSize: 13 }}
                >
                  🗑
                </IconButton>
              </Stack>
            ) : null}
          </Box>
        </Stack>
      </Box>

      {/* ═══ Ajustements automatiques ═══ */}
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mt: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Ajustements automatiques</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>— déjà réglés · déplier pour affiner</Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        <Box sx={{ ...cardSx, py: { xs: 0.5, md: 0.75 } }}>
        <AutoItem
          emoji="📉"
          title="Remplissage du mois"
          résumé={
            <>mois peu rempli (&lt; {occupancyLowMax} %) → <b>{occupancyLowAdj} %</b> · presque plein (&gt; {occupancyHighMin} %) → <b>+{occupancyHighAdj} %</b></>
          }
          on={occupancyBandsEnabled}
          onToggle={onOccupancyBandsEnabledChange}
        >
          <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.25, lineHeight: 1.5 }}>
            Sojori regarde le remplissage du mois restant (à partir d'aujourd'hui) et pousse le prix dans le bon sens.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <FieldSlider label="Baisse si sous" display={`< ${occupancyLowMax} %`} value={occupancyLowMax} min={10} max={50} step={5} onChange={onOccupancyLowMaxChange} />
            <FieldSlider label="Ajustement" display={`${occupancyLowAdj} %`} value={occupancyLowAdj} min={-30} max={0} step={1} onChange={onOccupancyLowAdjChange} />
            <FieldSlider label="Hausse si dessus" display={`> ${occupancyHighMin} %`} value={occupancyHighMin} min={50} max={90} step={5} onChange={onOccupancyHighMinChange} />
            <FieldSlider label="Ajustement" display={`+${occupancyHighAdj} %`} value={occupancyHighAdj} min={0} max={40} step={1} onChange={onOccupancyHighAdjChange} />
          </Stack>
        </AutoItem>
        </Box>

        <Box sx={{ ...cardSx, py: { xs: 0.5, md: 0.75 } }}>
        <AutoItem
          emoji="⏰"
          title="Dernière minute"
          résumé={
            <><b>{lastMinuteDiscountPct} %</b> sur les nuits encore libres de J+{lastMinuteFromDays} à J+{lastMinuteToDays}</>
          }
          on={lastMinuteEnabled}
          onToggle={onLastMinuteEnabledChange}
        >
          <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.25, lineHeight: 1.5 }}>
            Une nuit invendue ne rapporte rien : on baisse un peu le prix quand l'arrivée approche.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <FieldSlider label="De (jours avant)" display={`J+${lastMinuteFromDays}`} value={lastMinuteFromDays} min={1} max={30} step={1} onChange={onLastMinuteFromDaysChange} />
            <FieldSlider label="À" display={`J+${lastMinuteToDays}`} value={lastMinuteToDays} min={1} max={30} step={1} onChange={onLastMinuteToDaysChange} />
            <FieldSlider label="Remise" display={`${lastMinuteDiscountPct} %`} value={lastMinuteDiscountPct} min={-50} max={0} step={1} onChange={onLastMinuteDiscountPctChange} />
          </Stack>
        </AutoItem>
        </Box>

        <Box sx={{ ...cardSx, py: { xs: 0.5, md: 0.75 } }}>
        <AutoItem
          emoji="🧩"
          title="Trous entre réservations"
          résumé={
            <>trou court → min stay abaissé à <b>{gapBlockMinNights}</b> pour le rendre vendable (origine restaurée)</>
          }
          on={gapBlockEnabled}
          onToggle={onGapBlockEnabledChange}
        >
          <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.25, lineHeight: 1.5 }}>
            Le réglage d'origine est sauvegardé et restauré ensuite. Les trous d'une nuit sont seulement signalés.
          </Typography>
          <Box sx={{ maxWidth: 320 }}>
            <FieldSlider label="Min stay référence" display={`${gapBlockMinNights} nuit(s)`} value={gapBlockMinNights} min={1} max={14} step={1} onChange={onGapBlockMinNightsChange} />
          </Box>
        </AutoItem>
        </Box>

        <Box sx={{ ...cardSx, py: { xs: 0.5, md: 0.75 } }}>
        <AutoItem
          emoji="🎉"
          title="Événements & dates spéciales"
          résumé={
            events.length > 0
              ? <><b>{events.length}</b> période{events.length > 1 ? 's' : ''} à prix prioritaire — remplace tout le calcul sur ses dates</>
              : <>aucune période — le prix event remplace tout le calcul sur ses dates</>
          }
          on={eventsEnabled}
          onToggle={onEventsEnabledChange}
          defaultOpen={events.length > 0 || suggestions.length > 0}
          headerExtra={
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAddEvent();
              }}
              sx={{
                textTransform: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                color: T.text2,
                border: `1px solid ${T.borderStrong}`,
                borderRadius: 1,
                px: 1.25,
                py: 0.375,
                flexShrink: 0,
                '&:hover': { borderColor: T.goldDeep, color: T.goldDeep, bgcolor: T.goldTint },
              }}
            >
              + Ajouter
            </Button>
          }
        >
          {events.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: T.text3, fontStyle: 'italic' }}>
              Ex. Nouvel An, GITEX… — prix fixe MAD ou % du marché sur des dates précises.
            </Typography>
          ) : null}
          {events.map((ev) => (
            <Stack
              key={ev.id}
              direction="row"
              sx={{
                alignItems: 'center', gap: 1.25, p: '9px 12px', mb: 0.75,
                bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.25,
              }}
            >
              <Box sx={{ fontSize: 17 }}>{ev.emoji}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} noWrap>{ev.name}</Typography>
                <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: MONO }} noWrap>
                  {ev.dateRange} ·{' '}
                  <b style={{ color: T.goldDeep }}>
                    {ev.kind === 'market_percent'
                      ? `${ev.marketPercent} % marché`
                      : `${fmt(ev.fixedPrice)} MAD/nuit`}
                  </b>{' '}
                  · min {ev.minNights} nuits
                </Typography>
              </Box>
              <IconButton size="small" aria-label="Modifier" onClick={() => onEditEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>
                ✏
              </IconButton>
              <IconButton size="small" aria-label="Supprimer" onClick={() => onDeleteEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>
                🗑
              </IconButton>
            </Stack>
          ))}

          {suggestions.length > 0 ? (
            <Box
              sx={{
                mt: 1.25, p: 1.5, borderRadius: 1.375,
                background: `linear-gradient(135deg, ${T.aiTint}, transparent)`,
                border: '1px solid rgba(124,58,237,0.30)',
              }}
            >
              <Typography sx={{ fontSize: 10.5, color: T.ai, fontFamily: MONO, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.875 }}>
                ✨ Sojori suggère · détection IA
              </Typography>
              {suggestions.map((s) => (
                <Stack
                  key={s.id}
                  direction="row"
                  onClick={() => onAcceptSuggestion(s.id)}
                  sx={{
                    alignItems: 'center', gap: 1.125, p: '8px 11px', mb: 0.625,
                    bgcolor: T.bg1, border: '1px solid rgba(124,58,237,0.20)', borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: T.ai, bgcolor: 'rgba(124,58,237,0.04)' },
                  }}
                >
                  <Box sx={{ fontSize: 14 }}>📌</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{s.dateRange}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: MONO }} noWrap>{s.reason}</Typography>
                  </Box>
                  <Box sx={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: T.ai, bgcolor: T.aiTint, px: 0.875, py: 0.25, borderRadius: 999 }}>
                    +{s.deltaPct}%
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : null}
        </AutoItem>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 10.5, color: T.text4, textAlign: 'center' }}>
        Modifications enregistrées automatiquement · la propagation vers le calendrier suit le réglage « Sync calendrier »
      </Typography>
    </Stack>
  );
}
