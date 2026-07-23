import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  defaultReceiveGestion,
  normalizeReceiveChecklist,
  type ReceiveChecklistItem,
} from './receiveChecklistDefaults';
import { V3 } from './theme';

type Props = {
  kind: 'arrival' | 'departure';
  gestion: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
};

export default function V3ReceiveChecklistPanel({ kind, gestion, onSave }: Props) {
  const initial = useMemo(() => {
    const base = defaultReceiveGestion(kind);
    const mins = Number(gestion.durationMinutes);
    return {
      durationMinutes:
        Number.isFinite(mins) && mins > 0 ? Math.min(240, Math.round(mins)) : base.durationMinutes,
      checklist: normalizeReceiveChecklist(gestion.checklist, kind),
    };
  }, [gestion, kind]);

  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes);
  const [checklist, setChecklist] = useState<ReceiveChecklistItem[]>(initial.checklist);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDurationMinutes(initial.durationMinutes);
    setChecklist(initial.checklist);
  }, [initial]);

  const title = kind === 'arrival' ? 'Accueil arrivée' : 'Accueil départ';

  const patchItem = (id: string, patch: Partial<ReceiveChecklistItem>) => {
    setChecklist((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeItem = (id: string) => {
    setChecklist((prev) =>
      prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, order: i })),
    );
  };

  const addItem = () => {
    setChecklist((prev) => [
      ...prev,
      {
        id: `rcv_${Date.now().toString(36)}`,
        label: '',
        required: true,
        order: prev.length,
      },
    ]);
  };

  const resetDefaults = () => {
    const d = defaultReceiveGestion(kind);
    setDurationMinutes(d.durationMinutes);
    setChecklist(d.checklist);
  };

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = checklist
        .map((row, i) => ({
          ...row,
          label: row.label.trim(),
          order: i,
        }))
        .filter((row) => row.label.length > 0);
      await onSave({
        durationMinutes: Math.max(5, Math.min(240, Number(durationMinutes) || 30)),
        checklist: cleaned.length ? cleaned : defaultReceiveGestion(kind).checklist,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 0.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t1 }}>
        {title} · durée & checklist staff
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.45 }}>
        Points à vérifier sur place (ex. enregistrement si pas fait, taxe de séjour, clés…). Copiés
        sur la tâche staff du jour J.
      </Typography>

      <TextField
        size="small"
        type="number"
        label="Durée estimée (min)"
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
        inputProps={{ min: 5, max: 240, step: 5 }}
        sx={{ maxWidth: 180 }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {checklist.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.75,
              p: 1,
              borderRadius: 1.5,
              border: `1px solid ${V3.line}`,
              background: V3.panel2,
            }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder="Point de contrôle…"
              value={item.label}
              onChange={(e) => patchItem(item.id, { label: e.target.value })}
            />
            <FormControlLabel
              sx={{ m: 0, flexShrink: 0, '& .MuiFormControlLabel-label': { fontSize: 11 } }}
              control={
                <Checkbox
                  size="small"
                  checked={item.required}
                  onChange={(e) => patchItem(item.id, { required: e.target.checked })}
                />
              }
              label="Oblig."
            />
            <IconButton size="small" aria-label="Supprimer" onClick={() => removeItem(item.id)}>
              ✕
            </IconButton>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="outlined" onClick={addItem} sx={{ textTransform: 'none' }}>
          + Ajouter un point
        </Button>
        <Button size="small" onClick={resetDefaults} sx={{ textTransform: 'none' }}>
          Réinitialiser défauts
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={saving}
          onClick={() => void save()}
          sx={{ textTransform: 'none', fontWeight: 700, ml: 'auto' }}
        >
          {saving ? '…' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
}
