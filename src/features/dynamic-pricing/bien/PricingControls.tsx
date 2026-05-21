// ════════════════════════════════════════════════════════════════════
// PricingControls.tsx — Section 3 : bornes + modes + events
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Slider, Button, IconButton, Switch, FormControlLabel, TextField } from '@mui/material';
import { T } from '../_tokens';

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

export interface PricingEvent {
  id: string;
  emoji: string;
  name: string;
  dateRange: string;
  fixedPrice: number;
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
  minStayDelta: number;
  minStayPlancher: number;
  modeEnabled: boolean;
  /** false = réglages min stay visibles mais non synchronisés (rouge) */
  minStaySyncActive?: boolean;
  onFloorChange: (v: number) => void;
  onCeilingChange: (v: number) => void;
  onMinStayDeltaChange: (v: number) => void;
  onMinStayPlancherChange: (v: number) => void;
  onModeEnabledChange: (enabled: boolean) => void;
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
    pricingModes, activeModeId, events, suggestions, minStayDelta, minStayPlancher, modeEnabled,
    minStaySyncActive = true,
    onFloorChange, onCeilingChange, onMinStayDeltaChange, onMinStayPlancherChange, onModeEnabledChange,
    onApplyRecoBounds,
    onActiveModeChange, onModeToggle, onAddCustomMode, onUpdateCustomMode, onDeleteCustomMode,
    onAddEvent, onEditEvent, onDeleteEvent, onAcceptSuggestion,
    estimatedRevenue, estimatedRevenueLiftPct, hasBoundsProd = false,
  } = props;

  const dash = '—';
  const sortedModes = [...pricingModes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'preset' ? -1 : 1;
    return a.label.localeCompare(b.label, 'fr');
  });

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
      gap: 2,
      maxWidth: 1380,
      mx: 'auto',
    }}>
      <CtrlBlock title="💰 Bornes de prix">
        {hasBoundsProd ? <DistributionMini /> : null}
        <Box sx={{ mb: 2.25 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between',  mb: 0.75 }}>
            <Typography sx={lblSx}>Prix min (plancher)</Typography>
            <Typography sx={valSx}>{hasBoundsProd ? floor.toLocaleString('fr-FR') : dash}<Box component="span" sx={{ fontSize: 10, color: T.text3, ml: 0.375 }}>MAD</Box></Typography>
          </Stack>
          <GoldSlider value={floor} min={floorRange[0]} max={floorRange[1]} step={50} onChange={onFloorChange} />
        </Box>
        <Box sx={{
          mb: 2.25,
          p: 1.5,
          borderRadius: 1.25,
          bgcolor: minStaySyncActive ? T.bg2 : 'rgba(211,47,47,0.04)',
          border: `1px solid ${minStaySyncActive ? T.border : '#d32f2f'}`,
          opacity: minStaySyncActive ? 1 : 0.92,
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5, color: minStaySyncActive ? T.text : '#b71c1c' }}>
            🌙 Séjour minimum
            {!minStaySyncActive ? (
              <Box component="span" sx={{ fontSize: 10, ml: 0.75, fontWeight: 800 }}>
                · non synchronisé
              </Box>
            ) : null}
          </Typography>
          {!minStaySyncActive ? (
            <Typography sx={{ fontSize: 11, color: '#c62828', fontWeight: 700, mb: 1 }}>
              Modifiable ici mais non envoyé au calendrier — activez « Min stay » dans Sojori AI (modal).
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.25 }}>
              Base = marché (snapshot/jour) · poussé au calendrier si sync min stay ON
            </Typography>
          )}
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between',  mb: 0.5 }}>
              <Typography sx={lblSx}>Ajustement</Typography>
              <Typography sx={{ ...valSx, fontSize: 12 }}>
                {minStayDelta >= 0 ? `+${minStayDelta}` : minStayDelta} nuit(s)
              </Typography>
            </Stack>
            <GoldSlider value={minStayDelta} min={-2} max={5} step={1} onChange={onMinStayDeltaChange} />
          </Box>
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between',  mb: 0.5 }}>
              <Typography sx={lblSx}>Plancher absolu</Typography>
              <Typography sx={{ ...valSx, fontSize: 12 }}>{minStayPlancher} nuit(s)</Typography>
            </Stack>
            <GoldSlider value={minStayPlancher} min={1} max={14} step={1} onChange={onMinStayPlancherChange} />
          </Box>
        </Box>
        <Box sx={{ mb: 2.25 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between',  mb: 0.75 }}>
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

      <CtrlBlock title="🎯 Modes de tarification">
        <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.25 }}>
          Marché = base (toujours active) · occupation = recalcul batch ~3h (srv-calendar), pas de réglage ici.
        </Typography>
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
              {modeEnabled ? 'Coefficients modes actifs' : 'Modes OFF (×1 — visible, sans effet)'}
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
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1,  mt: -0.5, mb: 0.5, pl: 0.5 }}>
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
                    <Stack direction="row" sx={{ justifyContent: 'space-between',  mb: 0.5 }}>
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

      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
      <CtrlBlock title="📅 Événements · prix fixe forcé">
        <Typography sx={{ fontSize: 11.5, color: T.text2, mb: 1.5 }}>
          Ex. GITEX · dates début/fin · 2 000 MAD/nuit → prix <b>forcé</b> (ignore marché, mode, occupation).
        </Typography>
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
                {ev.dateRange} · <b style={{ color: T.goldDeep }}>{ev.fixedPrice.toLocaleString('fr-FR')} MAD/nuit forcé</b>
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

function CtrlBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, p: 2.75,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.75, letterSpacing: '-0.015em' }}>{title}</Typography>
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
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1,  mb: 0.625, pr: 4 }}>
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
