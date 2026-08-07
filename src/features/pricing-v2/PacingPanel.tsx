// ════════════════════════════════════════════════════════════════════════════
// PACING — 4 CURSEURS (mode Expert), calqué sur la maquette validée
// ────────────────────────────────────────────────────────────────────────────
// « Le prix respire avec le remplissage » — deux décisions symétriques :
//   • Remplissage ÉLEVÉ  → le prix monte   (vert)  : seuil + hausse max
//   • Remplissage FAIBLE → le prix descend (terracotta) : seuil + baisse max
//   • ENTRE les deux seuils : le prix suit le marché, sans correction.
//
// ⚠️ CONTRAT MOTEUR (option B) : `mode` reste le PRÉRÉGLAGE. Tant que le PM n'a
// touché aucun curseur, la config ne porte aucun seuil et le moteur applique la
// courbe du mode (prudent/équilibré/agressif). Dès qu'un curseur bouge, les 4
// valeurs sont envoyées et la logique explicite prend le relais.
// Voir apps/srv-pricing-v2/src/engine/engine.ts → pacingMult().
// ════════════════════════════════════════════════════════════════════════════
import { Box, Slider, Stack, Typography } from '@mui/material';
import { T, kickerSx } from './tokens';

export type PacingSettings = {
  highThreshold: number; // 0–1
  highMax: number; // 0.15 = +15 %
  lowThreshold: number;
  lowMax: number;
};

/** Défauts affichés tant que le PM n'a rien réglé (= ceux de la maquette). */
export const PACING_DEFAULTS: PacingSettings = {
  highThreshold: 0.85,
  highMax: 0.15,
  lowThreshold: 0.7,
  lowMax: 0.15,
};

const pctLabel = (v: number) => `${Math.round(v * 100)} %`;

export default function PacingPanel({
  value,
  onChange,
  /** Occupation réelle par date (fenêtre glissante) pour le graphe 90 j. */
  occupancy,
  busy,
}: {
  value: PacingSettings;
  onChange: (next: PacingSettings) => void;
  occupancy?: Array<{ date: string; occ: number }>;
  busy?: boolean;
}) {
  const set = (patch: Partial<PacingSettings>) => onChange({ ...value, ...patch });

  // ── Graphe 90 jours : courbe de remplissage + les deux seuils en pointillés,
  //    zones teintées (verte au-dessus du seuil haut, terracotta sous le bas).
  const W = 620;
  const H = 96;
  const pts = (occupancy ?? []).slice(0, 90);
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (occ: number) => H - Math.max(0, Math.min(1, occ)) * H;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.occ).toFixed(1)}`).join(' ');

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Pacing — le prix respire avec le remplissage
        </Typography>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={() => onChange(PACING_DEFAULTS)}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
        >
          revenir au marché
        </Box>
      </Stack>

      {/* ── Graphe 90 j ── */}
      {pts.length > 1 ? (
        <Box sx={{ mb: 1.5 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 96, display: 'block' }}>
            {/* Zone « prix monte » : au-dessus du seuil haut */}
            <rect x={0} y={0} width={W} height={y(value.highThreshold)} fill={T.ok} fillOpacity={0.07} />
            {/* Zone « prix descend » : sous le seuil bas */}
            <rect
              x={0}
              y={y(value.lowThreshold)}
              width={W}
              height={H - y(value.lowThreshold)}
              fill={T.crit}
              fillOpacity={0.07}
            />
            {/* Seuils */}
            <line x1={0} y1={y(value.highThreshold)} x2={W} y2={y(value.highThreshold)}
              stroke={T.ok} strokeWidth={1} strokeDasharray="4 3" />
            <line x1={0} y1={y(value.lowThreshold)} x2={W} y2={y(value.lowThreshold)}
              stroke={T.crit} strokeWidth={1} strokeDasharray="4 3" />
            {/* Courbe de remplissage projeté */}
            <polyline points={line} fill="none" stroke={T.ink} strokeWidth={1.75} />
          </svg>
          <Typography sx={{ ...kickerSx, fontSize: 8.5, mt: 0.25 }}>
            REMPLISSAGE PROJETÉ · 90 PROCHAINS JOURS
          </Typography>
        </Box>
      ) : null}

      {/* ── Les 2 groupes de curseurs ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {/* Groupe HAUT — vert */}
        <Box sx={{ border: `1px solid ${T.line}`, borderRadius: `${T.radius}px`, p: 1.5, bgcolor: T.okBg }}>
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: T.ok, mb: 1 }}>
            Remplissage élevé → le prix monte
          </Typography>
          <Typography sx={{ ...kickerSx, fontSize: 9 }}>DÈS</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0.5}
              max={0.95}
              step={0.05}
              value={value.highThreshold}
              disabled={busy}
              onChange={(_, v) => set({ highThreshold: v as number })}
              sx={{ color: T.ok }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              {pctLabel(value.highThreshold)}
            </Typography>
          </Stack>
          <Typography sx={{ ...kickerSx, fontSize: 9, mt: 0.5 }}>HAUSSE MAX</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0}
              max={0.3}
              step={0.01}
              value={value.highMax}
              disabled={busy}
              onChange={(_, v) => set({ highMax: v as number })}
              sx={{ color: T.ok }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              +{Math.round(value.highMax * 100)} %
            </Typography>
          </Stack>
        </Box>

        {/* Groupe BAS — terracotta */}
        <Box sx={{ border: `1px solid ${T.line}`, borderRadius: `${T.radius}px`, p: 1.5, bgcolor: T.critBg }}>
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: T.crit, mb: 1 }}>
            Remplissage faible → le prix descend
          </Typography>
          <Typography sx={{ ...kickerSx, fontSize: 9 }}>EN DESSOUS DE</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0.2}
              max={0.9}
              step={0.05}
              value={value.lowThreshold}
              disabled={busy}
              onChange={(_, v) => set({ lowThreshold: v as number })}
              sx={{ color: T.crit }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              {pctLabel(value.lowThreshold)}
            </Typography>
          </Stack>
          <Typography sx={{ ...kickerSx, fontSize: 9, mt: 0.5 }}>BAISSE MAX</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0}
              max={0.3}
              step={0.01}
              value={value.lowMax}
              disabled={busy}
              onChange={(_, v) => set({ lowMax: v as number })}
              sx={{ color: T.crit }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              −{Math.round(value.lowMax * 100)} %
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 11.5, color: T.ink2, mt: 1.25, lineHeight: 1.5 }}>
        Entre {pctLabel(value.lowThreshold)} et {pctLabel(value.highThreshold)} de remplissage, le
        prix suit le marché sans correction. Vos bornes restent prioritaires.
      </Typography>
    </Box>
  );
}
