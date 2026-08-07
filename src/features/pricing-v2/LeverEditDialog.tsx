// ════════════════════════════════════════════════════════════════════════════
// ÉDITION AU CHIFFRE — popup de réglage groupé (saisonnalité 12 mois, semaine 7 j)
// ────────────────────────────────────────────────────────────────────────────
// POURQUOI : les curseurs sont bons pour sentir une tendance, mauvais pour poser
// une valeur exacte — et catastrophiques pour en poser douze. Ici on tape les
// pourcentages, on voit tout d'un coup, et on valide en une fois (UN seul appel
// serveur, pas douze).
//
// Le composant travaille en POURCENTAGES (ce que lit le PM) et ne convertit en
// coefficients qu'à la validation : un coefficient 1.08 ne veut rien dire pour
// un propriétaire, « +8 % » si.
// ════════════════════════════════════════════════════════════════════════════
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { T, kickerSx } from './tokens';

export default function LeverEditDialog({
  open,
  title,
  hint,
  labels,
  /** Valeurs COURANTES, en coefficients (1 = neutre). */
  values,
  /** Bornes en pourcentage — celles du moteur, pas des valeurs décoratives. */
  minPct,
  maxPct,
  onClose,
  onApply,
  busy,
}: {
  open: boolean;
  title: string;
  hint: string;
  labels: string[];
  values: number[];
  minPct: number;
  maxPct: number;
  onClose: () => void;
  /** Reçoit les nouveaux COEFFICIENTS, dans l'ordre des labels. */
  onApply: (next: number[]) => void;
  busy?: boolean;
}) {
  // On édite du TEXTE, pas des nombres : sinon impossible de taper « -1 »
  // (l'état repasserait à 0 dès le signe moins saisi).
  const [draft, setDraft] = useState<string[]>([]);

  // Resynchronise à chaque ouverture — sans ça, on rouvrirait sur les valeurs
  // d'une session d'édition précédente.
  useEffect(() => {
    if (open) setDraft(values.map((v) => String(Math.round((v - 1) * 100))));
  }, [open, values]);

  const parsed = draft.map((d) => {
    const n = Number(d.replace(',', '.').trim());
    return Number.isFinite(n) ? n : 0;
  });
  const outOfRange = parsed.some((p) => p < minPct || p > maxPct);

  const apply = () => {
    // Clamp de sécurité : le moteur borne de toute façon, mais mieux vaut
    // envoyer une valeur propre que compter sur lui.
    onApply(parsed.map((p) => 1 + Math.min(maxPct, Math.max(minPct, p)) / 100));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 750, fontSize: 16, color: T.ink, pb: 0.5 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12.5, color: T.ink2, mb: 2, lineHeight: 1.5 }}>
          {hint}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 1.25,
          }}
        >
          {labels.map((lab, i) => (
            <Box key={lab}>
              <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.25 }}>{lab}</Typography>
              <TextField
                size="small"
                fullWidth
                value={draft[i] ?? ''}
                disabled={busy}
                onChange={(e) => {
                  const next = [...draft];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                slotProps={{ input: { endAdornment: <Box sx={{ fontSize: 11, color: T.mut }}>%</Box> } }}
                error={parsed[i] < minPct || parsed[i] > maxPct}
                sx={{
                  '& input': {
                    fontFamily: T.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    textAlign: 'right',
                    py: 0.75,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 11.5, color: outOfRange ? T.crit : T.mut, mt: 1.5 }}>
          {outOfRange
            ? `Valeurs autorisées : ${minPct} % à +${maxPct} %. Hors bornes, elles seront ramenées.`
            : `0 % = neutre. Autorisé de ${minPct} % à +${maxPct} %.`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ color: T.mut }}>
          Annuler
        </Button>
        <Button
          onClick={apply}
          disabled={busy}
          variant="contained"
          sx={{ bgcolor: T.ink, '&:hover': { bgcolor: T.ink } }}
        >
          Appliquer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
