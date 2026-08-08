// ════════════════════════════════════════════════════════════════════════════
// BARRE DE PLAGE — apparaît au-dessus du calendrier après un glisser
// ────────────────────────────────────────────────────────────────────────────
// Agencement calqué sur la maquette validée :
//   « 9 août → 26 août · 9 nuits libres »  [MAD] [Fixer]  [+10 % ▾] [Ajuster]
//   [Revenir au calcul]                                                    [✕]
//
// ⚠️ RÈGLES :
// - Le compte annoncé est celui des nuits RÉELLEMENT modifiables (les nuits
//   réservées de la plage sont exclues) — sinon le PM croit agir sur 17 nuits
//   alors que 8 sont déjà vendues.
// - Les 3 actions écrivent dans `dailyOverrides`. Le moteur les applique dans
//   SA cascade et les BORNE : même un prix « fixé » ne sort pas de la fourchette.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { T } from './tokens';

export type RangeAction =
  | { type: 'fixed'; value: number }
  | { type: 'mult'; value: number }
  | { type: 'clear' };

/** Pas proposés dans le menu ±% (comme la maquette). */
const PCT_STEPS = [-30, -20, -15, -10, -5, 5, 10, 15, 20, 30];

export default function RangeActionBar({
  fromDate,
  toDate,
  /** Nuits de la plage — TOUTES reçoivent la consigne (réservées incluses). */
  nbDays,
  /** Réservées dans la plage : la consigne s'y applique pour l'après-annulation. */
  nbBooked = 0,
  /** Bloquées dans la plage : idem, la consigne sert au déblocage. */
  nbBlocked = 0,
  /** Glisser en cours : la barre reste montée mais en retrait (pas de démontage,
   *  sinon le champ « MAD » se vide et la page saute à chaque geste). */
  dragging = false,
  onApply,
  onCancel,
  /** Ouvre le ticket de caisse. Fourni UNIQUEMENT quand une seule nuit est
   *  sélectionnée : le détail explique un prix, pas une plage. C'est le seul
   *  chemin vers le popup depuis que le clic ne l'ouvre plus tout seul. */
  onShowDetail,
  busy,
}: {
  fromDate: string;
  toDate: string;
  nbDays: number;
  nbBooked?: number;
  nbBlocked?: number;
  dragging?: boolean;
  onApply: (a: RangeAction) => void;
  onCancel: () => void;
  onShowDetail?: () => void;
  busy?: boolean;
}) {
  const [fixed, setFixed] = useState('');
  const [pct, setPct] = useState(10);

  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

  const actionSx = {
    textTransform: 'none' as const,
    fontWeight: 700,
    borderRadius: `${T.radius}px`,
    px: 2,
  };

  return (
    <Box
      sx={{
        border: `1.5px solid ${T.manual}33`,
        bgcolor: T.manualBg,
        borderRadius: `${T.radius}px`,
        p: 1.75,
        mb: 1.5,
        position: 'relative',
        // Pendant le glisser : lisible (les dates suivent le geste) mais non
        // cliquable, pour ne pas capter le relâchement de la souris.
        opacity: dragging ? 0.6 : 1,
        pointerEvents: dragging ? 'none' : 'auto',
        transition: 'opacity 120ms',
      }}
    >
      {/* ✕ ancré dans le coin : en flux, il retombait sur une 3e ligne. */}
      <Box
        component="button"
        type="button"
        onClick={onCancel}
        aria-label="Annuler la sélection"
        sx={{
          all: 'unset',
          position: 'absolute',
          top: 8,
          right: 12,
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          color: T.ink2,
          p: 0.5,
        }}
      >
        ✕
      </Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap: 1.25, flexWrap: 'wrap', rowGap: 1.25 }}
      >
        {/* Plage + décompte honnête */}
        <Typography sx={{ fontSize: 14.5, fontWeight: 750, color: T.ink }}>
          {fmt(fromDate)} → {fmt(toDate)}
          <Box component="span" sx={{ fontWeight: 400, color: T.ink2, ml: 1 }}>
            · {nbDays} nuit{nbDays > 1 ? 's' : ''}
            {/* On annonce réservées/bloquées sans dire « ignorées » : la consigne
                s'applique bien à elles, elle prendra effet au déblocage ou à
                l'annulation (le prix encaissé d'une résa ne change pas). */}
            {nbBooked > 0 || nbBlocked > 0
              ? ` (dont ${[
                  nbBooked > 0 ? `${nbBooked} réservée${nbBooked > 1 ? 's' : ''}` : null,
                  nbBlocked > 0 ? `${nbBlocked} bloquée${nbBlocked > 1 ? 's' : ''}` : null,
                ]
                  .filter(Boolean)
                  .join(' et ')} — la consigne s'appliquera à la libération)`
              : ''}
          </Box>
        </Typography>

        {/* Passe à la ligne en bloc : le champ MAD doit rester collé à « Fixer »
            (au premier rendu il partait seul à droite — illisible). */}
        <Box sx={{ flexBasis: '100%', height: 0 }} />

        {/* Fixer un prix */}
        <TextField
          size="small"
          placeholder="MAD"
          value={fixed}
          disabled={busy}
          onChange={(e) => setFixed(e.target.value.replace(/[^\d]/g, ''))}
          sx={{
            width: 110,
            '& .MuiOutlinedInput-root': { bgcolor: T.card, borderRadius: `${T.radius}px` },
            '& input': { fontFamily: T.mono, fontSize: 14 },
          }}
        />
        <Button
          size="medium"
          variant="contained"
          disableElevation
          disabled={busy || !(Number(fixed) > 0)}
          onClick={() => onApply({ type: 'fixed', value: Number(fixed) })}
          sx={{ ...actionSx, bgcolor: T.goldPure, color: T.ink, '&:hover': { bgcolor: T.gold } }}
        >
          Fixer
        </Button>

        {/* Ajuster en % */}
        <Select
          size="small"
          value={pct}
          disabled={busy}
          onChange={(e) => setPct(Number(e.target.value))}
          sx={{
            width: 110,
            bgcolor: T.card,
            borderRadius: `${T.radius}px`,
            '& .MuiSelect-select': { fontFamily: T.mono, fontSize: 14, fontWeight: 700 },
          }}
        >
          {PCT_STEPS.map((p) => (
            <MenuItem key={p} value={p} sx={{ fontFamily: T.mono, fontSize: 14 }}>
              {p > 0 ? '+' : ''}
              {p} %
            </MenuItem>
          ))}
        </Select>
        <Button
          size="medium"
          variant="contained"
          disableElevation
          disabled={busy}
          onClick={() => onApply({ type: 'mult', value: 1 + pct / 100 })}
          sx={{ ...actionSx, bgcolor: T.goldPure, color: T.ink, '&:hover': { bgcolor: T.gold } }}
        >
          Ajuster
        </Button>

        <Button
          size="medium"
          variant="outlined"
          disabled={busy}
          onClick={() => onApply({ type: 'clear' })}
          sx={{ ...actionSx, borderColor: T.line, color: T.ink, bgcolor: T.card }}
        >
          Revenir au calcul
        </Button>

        {/* Le détail explique UN prix : proposé sur une nuit seule, jamais sur
            une plage. Remplace le popup qui s'ouvrait à chaque clic. */}
        {onShowDetail ? (
          <Button
            size="medium"
            variant="text"
            disabled={busy}
            onClick={onShowDetail}
            sx={{ ...actionSx, color: T.ink2, px: 1.25 }}
          >
            🧾 Voir le détail
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
