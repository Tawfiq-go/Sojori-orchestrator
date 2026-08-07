// ════════════════════════════════════════════════════════════════════════════
// ÉCRAN SIGNATURE (mode Expert) — « Le marché, et vous dessus »
// ────────────────────────────────────────────────────────────────────────────
// La distribution des prix des VRAIS concurrents du bien, avec 4 repères
// nommés en langage business et le curseur du bien posé dessus.
//
// ⚠️ RÈGLES (agent futur) :
// - CETTE COURBE EST LE CONTRÔLE DU POSITIONNEMENT. Il n'y a plus de cartes
//   Économique/Normal/Luxe en dessous : c'était deux contrôles pour la même
//   décision. Le PM clique un repère → la gamme change → tout se recalcule.
// - 4 positions = 4 valeurs de `gamme` du moteur, dans cet ordre :
//     Économique (p25) · Normal (p50) · Premium (p75) · Luxe (p90)
// - Les repères viennent de `scale` (échelle PERSONNELLE, calculée sur les
//   comps du bien). Ne JAMAIS afficher `marketWide` comme si c'était l'échelle
//   du bien : le marché large est bien plus étalé (723–1774 vs 790–1147 sur
//   Majorelle) et donnerait une lecture fausse. marketWide = contexte discret.
// - SVG pur, zéro dépendance graphique (le module reste autonome).
// ════════════════════════════════════════════════════════════════════════════
import { Box, Stack, Typography } from '@mui/material';
import type { PricingV2Comp } from './api';

import { T, cardSx, kickerSx } from './tokens';

// Couleurs/typo : UNIQUEMENT via T (tokens de la maquette validée).

export type Gamme = 'economique' | 'normal' | 'premium' | 'luxe';

type Props = {
  scale: { p25: number; p50: number; p75: number; p90: number };
  comps: PricingV2Comp[];
  /** Prix actuel du bien (celui de ce soir) — le curseur « VOUS ». */
  yourPrice: number;
  compsetSize: number;
  /** Position choisie — le repère actif sur la courbe. */
  gamme: Gamme;
  /** Clic sur un repère → change la gamme et recalcule. */
  onGammeChange: (g: Gamme) => void;
  busy?: boolean;
};

const W = 720;
const H = 205; // marge basse : les valeurs décalées (labels serrés) tiennent dedans
const PAD_X = 28;
const BASE_Y = 140;

export default function DistributionChart({ scale, comps, yourPrice, compsetSize, gamme, onGammeChange, busy }: Props) {
  // Échelle horizontale : on cadre sur les comps réels + le prix du bien,
  // avec 8 % de marge pour que rien ne touche les bords.
  const values = comps.map((c) => c.adjustedMad).filter((v) => v > 0);
  const lo = Math.min(...values, yourPrice, scale.p25) * 0.92;
  const hi = Math.max(...values, yourPrice, scale.p90) * 1.08;
  const x = (v: number) => PAD_X + ((v - lo) / Math.max(1, hi - lo)) * (W - 2 * PAD_X);

  // Courbe de densité — noyau gaussien simple sur les prix ajustés des comps.
  // Purement visuel : la "forme" du marché, pas un calcul de pricing.
  const bandwidth = Math.max(40, (hi - lo) / 14);
  const samples = 90;
  const density: Array<{ px: number; d: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const v = lo + ((hi - lo) * i) / samples;
    const d = values.reduce(
      (s, val) => s + Math.exp(-0.5 * ((v - val) / bandwidth) ** 2),
      0,
    );
    density.push({ px: x(v), d });
  }
  const maxD = Math.max(...density.map((p) => p.d), 1);
  const curveH = 92;
  const path =
    `M ${PAD_X} ${BASE_Y} ` +
    density.map((p) => `L ${p.px.toFixed(1)} ${(BASE_Y - (p.d / maxD) * curveH).toFixed(1)}`).join(' ') +
    ` L ${W - PAD_X} ${BASE_Y} Z`;

  // Les 4 positions = les 4 valeurs de `gamme` du moteur. Cliquables.
  const markers: Array<{ key: Gamme; label: string; value: number; sub: string }> = [
    { key: 'economique', label: 'ÉCONOMIQUE', value: scale.p25, sub: 'remplir vite' },
    { key: 'normal', label: 'NORMAL', value: scale.p50, sub: 'le prix de vos voisins' },
    { key: 'premium', label: 'PREMIUM', value: scale.p75, sub: 'au-dessus du lot' },
    { key: 'luxe', label: 'LUXE', value: scale.p90, sub: 'le haut du marché' },
  ];
  const active = markers.find((m) => m.key === gamme) ?? markers[1];

  // Position du bien vs sa propre échelle → phrase de lecture immédiate.
  const position =
    yourPrice < scale.p25
      ? 'en dessous du prix d’appel de votre marché'
      : yourPrice < scale.p50
        ? 'entre le prix d’appel et le prix du marché'
        : yourPrice < scale.p75
          ? 'au niveau du prix du marché'
          : yourPrice < scale.p90
            ? 'dans le haut du marché (premium)'
            : 'dans le top 10 % de votre marché';

  return (
    <Box sx={cardSx}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>Le marché, et vous dessus</Typography>
        <Typography sx={{ ...kickerSx, color: T.ok }}>
          {compsetSize} COMPARABLES · CLIQUEZ UN REPÈRE
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 480, display: 'block' }}>
          {/* Densité du marché */}
          <path d={path} fill={T.goldSoft} fillOpacity={0.28} stroke={T.gold} strokeWidth={1.5} />

          {/* Repères nommés (langage business, jamais « p75 »).
              ⚠️ Sur une échelle PERSONNELLE les 4 repères sont resserrés
              (ex. Majorelle : 993 / 1060) → décalage vertical alterné, sinon
              les libellés se chevauchent (défaut vu au premier rendu réel). */}
          {markers.map((m, i) => {
            const prev = i > 0 ? markers[i - 1] : null;
            const tooClose = prev ? x(m.value) - x(prev.value) < 78 : false;
            const labelY = BASE_Y - curveH - (tooClose ? 6 : 20);
            const isActive = m.key === gamme;
            return (
              <g
                key={m.key}
                onClick={() => !busy && onGammeChange(m.key)}
                style={{ cursor: busy ? 'default' : 'pointer' }}
              >
                {/* Zone de clic généreuse (le trait seul serait trop fin) */}
                <rect
                  x={x(m.value) - 34}
                  y={labelY - 12}
                  width={68}
                  height={BASE_Y - labelY + 30}
                  fill="transparent"
                />
                <line
                  x1={x(m.value)}
                  y1={labelY + 6}
                  x2={x(m.value)}
                  y2={BASE_Y}
                  stroke={isActive ? T.goldPure : T.line}
                  strokeDasharray={isActive ? undefined : '3 3'}
                  strokeWidth={isActive ? 2 : 1}
                />
                {/* Pastille du repère actif */}
                {isActive ? (
                  <circle cx={x(m.value)} cy={BASE_Y} r={4.5} fill={T.goldPure} />
                ) : null}
                <text
                  x={x(m.value)}
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontSize: isActive ? 10 : 9,
                    fontFamily: T.mono,
                    fill: isActive ? T.gold : T.mut,
                    fontWeight: isActive ? 700 : 400,
                    letterSpacing: 0.54,
                  }}
                >
                  {m.label}
                </text>
                <text
                  x={x(m.value)}
                  y={BASE_Y + 16}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontFamily: T.mono,
                    fill: isActive ? T.ink : T.ink2,
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {m.value}
                </text>
              </g>
            );
          })}

          {/* Les concurrents réels, un point chacun (hover = détail) */}
          {comps.map((c) => (
            <circle
              key={c.listingId}
              cx={x(c.adjustedMad)}
              cy={BASE_Y - 8 - (c.similarity - 0.75) * 120}
              r={3.4}
              fill={T.gold}
              fillOpacity={0.5}
            >
              <title>
                {`${c.adjustedMad} MAD ajusté · note ${c.rating ?? '—'} · ${c.locality}` +
                  (c.advantages.length ? ` · eux ont : ${c.advantages.join(', ')}` : '')}
              </title>
            </circle>
          ))}

          {/* Le curseur VOUS */}
          <line
            x1={x(yourPrice)}
            y1={BASE_Y - curveH - 8}
            x2={x(yourPrice)}
            y2={BASE_Y + 4}
            stroke={T.ink}
            strokeWidth={2.5}
          />
          <circle cx={x(yourPrice)} cy={BASE_Y - curveH - 8} r={9} fill={T.ink} />
          {/* Légende du curseur — sous la ligne des valeurs, jamais dessus.
              Fond blanc pour rester lisible si un repère tombe juste derrière. */}
          <rect
            x={x(yourPrice) - 62}
            y={BASE_Y + 24}
            width={124}
            height={17}
            rx={3}
            fill={T.card}
            fillOpacity={0.94}
          />
          <text
            x={x(yourPrice)}
            y={BASE_Y + 36}
            textAnchor="middle"
            style={{ fontSize: 11, fontFamily: T.mono, fontWeight: 700, fill: T.ink }}
          >
            VOUS · {yourPrice} MAD
          </text>
        </svg>
      </Box>

      <Typography sx={{ fontSize: 13, color: T.ink2, mt: 1.25, lineHeight: 1.5 }}>
        Votre prix de ce soir est <b>{position}</b>. Les points sont vos concurrents réels, replacés
        au niveau de qualité de votre bien.
      </Typography>
    </Box>
  );
}
