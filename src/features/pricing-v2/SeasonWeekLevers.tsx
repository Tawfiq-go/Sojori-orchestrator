// ════════════════════════════════════════════════════════════════════════════
// LEVIERS SAISONNALITÉ + SEMAINE (mode Expert) — maquette « Vos 5 leviers »
// ────────────────────────────────────────────────────────────────────────────
// • Saisonnalité : 12 barres. La courbe = le MARCHÉ (dérivée d'AirROI). Le PM
//   tire un mois vers le haut/bas ; son ajustement s'ajoute au marché.
//   La ligne pointillée = l'équilibre annuel (moyenne 1) : au-dessus il monte,
//   en dessous il descend, et la moyenne reste 1 → pas de dérive du prix annuel.
// • Semaine : 7 curseurs (défaut Marrakech mesuré à ±4 %, pas ±20 % US).
//
// ⚠️ CONTRAT MOTEUR : `seasonalCoefs` (12, moyenne 1) et `dowMult` (7) sont
// envoyés tels quels. Le moteur RENORMALISE le dow à moyenne 1 (§6.10bis) pour
// que le jour de semaine ne dérive pas la base annuelle — ne duplique pas cette
// normalisation ici, tu la compterais deux fois.
// ════════════════════════════════════════════════════════════════════════════
import { Box, Slider, Stack, Typography } from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import { T, kickerSx } from './tokens';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DOW = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

/** Bornes du moteur : un mois ne descend pas sous -30 % ni au-dessus de +40 %. */
const clampC = (c: number) => Math.min(1.4, Math.max(0.7, c));

export default function SeasonWeekLevers({
  /** 12 coefficients (moyenne 1). Ceux du marché si le PM n'a rien édité. */
  seasonalCoefs,
  /** 7 multiplicateurs, index 0 = dimanche. */
  dowMult,
  onSeasonalChange,
  onDowChange,
  onResetSeasonal,
  onResetDow,
  busy,
}: {
  seasonalCoefs: number[];
  dowMult: number[];
  onSeasonalChange: (next: number[]) => void;
  onDowChange: (next: number[]) => void;
  onResetSeasonal: () => void;
  onResetDow: () => void;
  busy?: boolean;
}) {
  const W = 620;
  const H = 110;
  // ⚠️ Échelle FIXE (0.70 → 1.40), volontairement PAS calculée depuis les valeurs :
  // avec une échelle auto, tirer une barre change l'échelle, donc la barre fuit
  // sous le doigt et les 11 autres bougent toutes seules. Bornes = celles du moteur.
  const MIN_C = 0.7;
  const MAX_C = 1.4;
  const barW = W / 12 - 6;
  const yOf = (c: number) => H - ((clampC(c) - MIN_C) / (MAX_C - MIN_C)) * (H - 18) - 6;
  /** Inverse de yOf : position verticale (px SVG) → coefficient. */
  const cOf = (y: number) => clampC(MAX_C - ((y - 6) / (H - 18)) * (MAX_C - MIN_C));

  // ⚠️ Pourquoi un état local : `seasonalCoefs` vient du SERVEUR. Si on appelait
  // onSeasonalChange à chaque pixel, l'affichage n'avancerait qu'au retour réseau
  // — d'où les sauts, et l'impression que « bouger un curseur bouge les autres »
  // (on voyait en fait la réponse d'un appel précédent écraser le geste en cours).
  // Ici : `draft` suit le doigt, le serveur n'est prévenu qu'au relâchement.
  const [draft, setDraft] = useState<number[] | null>(null);
  const coefs = draft ?? seasonalCoefs;
  const [dowDraft, setDowDraft] = useState<number[] | null>(null);
  const dows = dowDraft ?? dowMult;

  const setMonth = (i: number, v: number) => {
    const base = draft ?? seasonalCoefs;
    const next = [...base];
    next[i] = clampC(v);
    setDraft(next);
    return next;
  };

  /** Tirer le haut d'une barre. On suit le pointeur jusqu'au relâchement. */
  const dragMonth = (i: number) => (e: React.PointerEvent<SVGGElement>) => {
    if (busy) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    e.preventDefault();
    const apply = (clientY: number) => {
      const r = svg.getBoundingClientRect();
      // clientY → unités du viewBox (le SVG est étiré en largeur : H/r.height).
      return setMonth(i, cOf(((clientY - r.top) * H) / r.height));
    };
    let last = apply(e.clientY);
    const move = (ev: PointerEvent) => {
      last = apply(ev.clientY);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // Un seul appel réseau, à la fin du geste.
      if (last) onSeasonalChange(last);
      setDraft(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Box>
      {/* ── Saisonnalité ── */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Saisonnalité du marché — réglez un mois
        </Typography>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={onResetSeasonal}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
        >
          revenir au marché
        </Box>
      </Stack>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 110, display: 'block' }}>
        {/* Ligne d'équilibre annuel (coef = 1) */}
        <line
          x1={0}
          y1={yOf(1)}
          x2={W}
          y2={yOf(1)}
          stroke={T.ink2}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {coefs.map((c, i) => {
          const x = (i * W) / 12 + 3;
          const y = yOf(c);
          const above = c >= 1;
          const edited = Math.abs(c - 1) > 0.005;
          return (
            <g
              key={i}
              onPointerDown={dragMonth(i)}
              style={{ cursor: busy ? 'default' : 'ns-resize', touchAction: 'none' }}
            >
              {/* Zone de saisie invisible : toute la colonne est attrapable,
                  sinon il faut viser un rectangle de quelques pixels. */}
              <rect x={x} y={0} width={barW} height={H - 10} fill="transparent" />
              <rect
                x={x}
                y={Math.min(y, yOf(1))}
                width={barW}
                height={Math.abs(yOf(1) - y) || 1.5}
                rx={2}
                fill={above ? T.goldPure : T.line}
                fillOpacity={above ? 0.75 : 1}
              >
                <title>{`${MONTHS_FULL[i]} : ${Math.round((c - 1) * 100) > 0 ? '+' : ''}${Math.round((c - 1) * 100)} % vs votre année — tirez pour régler`}</title>
              </rect>
              {/* Poignée : dit « ça se tire » sans mode d'emploi. */}
              <rect
                x={x}
                y={y - 1.5}
                width={barW}
                height={3}
                rx={1.5}
                fill={above ? T.goldPure : T.ink2}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                style={{
                  fontSize: 8.5,
                  fontFamily: T.mono,
                  fill: edited ? T.ink : T.mut,
                  fontWeight: edited ? 700 : 400,
                  pointerEvents: 'none',
                }}
              >
                {Math.round((c - 1) * 100) > 0 ? '+' : ''}
                {Math.round((c - 1) * 100)}
              </text>
              <text
                x={x + barW / 2}
                y={H - 1}
                textAnchor="middle"
                style={{ fontSize: 8.5, fontFamily: T.mono, fill: T.mut }}
              >
                {MONTHS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Les 12 curseurs d'origine ont été retirés : on règle en tirant le haut
          de la barre. Deux commandes pour un même réglage, c'est une de trop. */}

      {/* ── Semaine ── */}
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 2.5, mb: 1 }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Semaine — défaut Marrakech ±4 %
        </Typography>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={onResetDow}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
        >
          revenir au marché
        </Box>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {dows.map((m, i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Typography sx={{ ...kickerSx, fontSize: 8.5 }}>{DOW[i]}</Typography>
            <Slider
              size="small"
              orientation="vertical"
              min={0.8}
              max={1.3}
              step={0.01}
              value={m}
              disabled={busy}
              // onChange = affichage local uniquement (suit le doigt).
              onChange={(_, v) => {
                const next = [...(dowDraft ?? dowMult)];
                next[i] = v as number;
                setDowDraft(next);
              }}
              // onChangeCommitted = relâchement → un seul appel réseau.
              onChangeCommitted={(_, v) => {
                const next = [...(dowDraft ?? dowMult)];
                next[i] = v as number;
                setDowDraft(null);
                onDowChange(next);
              }}
              sx={{ height: 64, color: m >= 1 ? T.goldPure : T.ink2, my: 0.5 }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, color: T.ink }}>
              {Math.round((m - 1) * 100) > 0 ? '+' : ''}
              {Math.round((m - 1) * 100)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: T.ink2, mt: 1, lineHeight: 1.5 }}>
        La moyenne des 7 jours est ramenée à 1 par le moteur : régler un week-end ne gonfle pas
        votre prix annuel, ça le redistribue.
      </Typography>
    </Box>
  );
}
