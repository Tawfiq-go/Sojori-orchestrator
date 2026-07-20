// ════════════════════════════════════════════════════════════════════
// PeriodRulesCard — Règles par période (style Hostaway / PriceLabs)
// Une règle = période nommée + effet (+X % / −X % vs marché, ou prix
// fixe MAD) + min nuits. Désactivable sans suppression, duplicable.
// Formulaire inline (pas de modal). Affichage « +25 % » (pas « 125 % »).
// Données = events du PilotPricingConfig (kind market_percent / fixed).
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Button, IconButton, TextField, MenuItem } from '@mui/material';
import { T } from '../_tokens';
import type { PricingEvent } from './PricingControls';

const MONO = '"Geist Mono", monospace';
const fmt = (n: number) => n.toLocaleString('fr-FR');

type EffectKind = 'up' | 'down' | 'fixed';

export interface PeriodRulesCardProps {
  events: PricingEvent[];
  eventsEnabled: boolean;
  onEventsEnabledChange?: (on: boolean) => void;
  onCreateEvent?: (ev: PricingEvent) => void | Promise<void>;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onToggleEventEnabled?: (id: string, on: boolean) => void | Promise<void>;
  onDuplicateEvent?: (id: string) => void | Promise<void>;
}

function ruleNights(dateRange: string): number | null {
  const [a, b] = dateRange.split('→').map((s) => s.trim().slice(0, 10));
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86_400_000) + 1) : null;
}

function fmtRangeFr(dateRange: string): string {
  const [a, b] = dateRange.split('→').map((s) => s.trim().slice(0, 10));
  const f = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return a && b ? `${f(a)} → ${f(b)}` : dateRange;
}

/** Chip effet : « +25 % vs marché » / « −15 % vs marché » / « 3 500 MAD fixe ». */
function EffectChip({ ev }: { ev: PricingEvent }) {
  const isPct = ev.kind === 'market_percent';
  const delta = isPct ? ev.marketPercent - 100 : 0;
  const up = delta >= 0;
  const label = isPct
    ? `${up ? '+' : '−'}${Math.abs(delta)} % vs marché`
    : `${fmt(ev.fixedPrice)} MAD fixe`;
  const color = isPct ? (up ? T.success : T.info) : T.goldDeep;
  const bg = isPct ? (up ? T.successTint : T.infoTint) : T.goldTint;
  return (
    <Box
      component="span"
      sx={{
        fontFamily: MONO, fontWeight: 800, fontSize: 12, borderRadius: 999,
        px: 1.375, py: 0.375, color, bgcolor: bg, whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {label}
    </Box>
  );
}

export default function PeriodRulesCard({
  events,
  eventsEnabled,
  onEventsEnabledChange,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onToggleEventEnabled,
  onDuplicateEvent,
}: PeriodRulesCardProps) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [effect, setEffect] = React.useState<EffectKind>('up');
  const [value, setValue] = React.useState('25');
  const [minNights, setMinNights] = React.useState('1');
  const [saving, setSaving] = React.useState(false);

  const canSubmit = name.trim() && from && to && to >= from && Number(value) > 0;

  const submit = async () => {
    if (!canSubmit || !onCreateEvent) return;
    const v = Math.round(Number(value));
    const ev: PricingEvent = {
      id: `evt_${Date.now()}`,
      emoji: effect === 'fixed' ? '📌' : effect === 'up' ? '📈' : '📉',
      name: name.trim(),
      dateRange: `${from} → ${to}`,
      kind: effect === 'fixed' ? 'fixed' : 'market_percent',
      fixedPrice: effect === 'fixed' ? v : 0,
      marketPercent: effect === 'up' ? 100 + v : effect === 'down' ? Math.max(1, 100 - v) : 100,
      minNights: Math.max(0, Math.round(Number(minNights) || 0)),
      enabled: true,
    };
    setSaving(true);
    try {
      await onCreateEvent(ev);
      setFormOpen(false);
      setName('');
      setFrom('');
      setTo('');
      setValue('25');
    } finally {
      setSaving(false);
    }
  };

  const inputSx = {
    '& input, & .MuiSelect-select': { fontSize: 12.5, fontWeight: 600, py: 0.875 },
    '& .MuiOutlinedInput-root': { bgcolor: T.bg1, borderRadius: 1 },
  } as const;

  return (
    <Box>
      {!eventsEnabled ? (
        <Typography sx={{ fontSize: 12, color: T.warning, mb: 1.25 }}>
          ⚠ Les règles sont globalement désactivées (interrupteur du bloc) — elles sont conservées mais ignorées au calcul.
          {onEventsEnabledChange ? (
            <Box
              component="button"
              type="button"
              onClick={() => onEventsEnabledChange(true)}
              sx={{ all: 'unset', cursor: 'pointer', color: T.goldDeep, fontWeight: 700, textDecoration: 'underline', ml: 0.75 }}
            >
              Réactiver
            </Box>
          ) : null}
        </Typography>
      ) : null}

      {events.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: T.text3, fontStyle: 'italic', mb: 1.25 }}>
          Aucune règle — ex. « GITEX 12 → 25 oct : +25 % vs marché ». Sur ses dates, la règle est prioritaire
          sur le positionnement, l'occupation et la dernière minute.
        </Typography>
      ) : null}

      {events.map((ev) => {
        const off = ev.enabled === false;
        const nights = ruleNights(ev.dateRange);
        return (
          <Stack
            key={ev.id}
            direction="row"
            sx={{
              alignItems: 'center', gap: 1.5, p: '10px 14px', mb: 1,
              bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.375,
              opacity: off ? 0.55 : 1, flexWrap: 'wrap',
            }}
          >
            <Box sx={{ fontSize: 18, flexShrink: 0 }}>{ev.emoji}</Box>
            <Box sx={{ minWidth: 150, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                {ev.name}
                {off ? (
                  <Box component="span" sx={{ fontSize: 10, fontWeight: 600, color: T.text3, ml: 0.75 }}>
                    (désactivée, conservée)
                  </Box>
                ) : null}
              </Typography>
              <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: MONO }}>
                {fmtRangeFr(ev.dateRange)}
                {nights ? ` · ${nights} nuit${nights > 1 ? 's' : ''}` : ''}
              </Typography>
            </Box>
            {ev.minNights > 0 ? (
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: MONO, flexShrink: 0 }}>
                min {ev.minNights} nuit{ev.minNights > 1 ? 's' : ''}
              </Typography>
            ) : null}
            <EffectChip ev={ev} />
            <Stack direction="row" sx={{ gap: 0.25, flexShrink: 0 }}>
              {onToggleEventEnabled ? (
                <IconButton
                  size="small"
                  aria-label={off ? 'Réactiver la règle' : 'Désactiver la règle (conservée)'}
                  title={off ? 'Réactiver' : 'Désactiver (conservée)'}
                  onClick={() => onToggleEventEnabled(ev.id, off)}
                  sx={{ fontSize: 12, color: T.text3 }}
                >
                  {off ? '▶' : '⏸'}
                </IconButton>
              ) : null}
              <IconButton size="small" aria-label="Modifier" title="Modifier" onClick={() => onEditEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>
                ✏
              </IconButton>
              {onDuplicateEvent ? (
                <IconButton size="small" aria-label="Dupliquer" title="Dupliquer (ex. année suivante)" onClick={() => onDuplicateEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>
                  ⧉
                </IconButton>
              ) : null}
              <IconButton size="small" aria-label="Supprimer" title="Supprimer" onClick={() => onDeleteEvent(ev.id)} sx={{ fontSize: 12, color: T.text3 }}>
                🗑
              </IconButton>
            </Stack>
          </Stack>
        );
      })}

      {!formOpen ? (
        <Button
          fullWidth
          onClick={() => setFormOpen(true)}
          sx={{
            py: 1.125, bgcolor: T.bg2, border: `1.5px dashed ${T.borderStrong}`, borderRadius: 1.375,
            color: T.text2, fontSize: 12.5, fontWeight: 700, textTransform: 'none',
            '&:hover': { borderColor: T.goldDeep, bgcolor: T.goldTint, color: T.goldDeep },
          }}
        >
          + Ajouter une règle de période
        </Button>
      ) : (
        <Stack
          direction="row"
          sx={{
            alignItems: 'flex-end', gap: 1.75, flexWrap: 'wrap',
            bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.375, p: '13px 15px', mt: 0.5,
          }}
        >
          {(
            [
              ['Nom', <TextField key="n" size="small" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. GITEX Africa" sx={{ ...inputSx, width: 170 }} />],
              ['Du', <TextField key="f" size="small" type="date" value={from} onChange={(e) => setFrom(e.target.value)} sx={{ ...inputSx, width: 150 }} />],
              ['Au', <TextField key="t" size="small" type="date" value={to} onChange={(e) => setTo(e.target.value)} sx={{ ...inputSx, width: 150 }} />],
              [
                'Effet',
                <TextField key="e" size="small" select value={effect} onChange={(e) => setEffect(e.target.value as EffectKind)} sx={{ ...inputSx, width: 160 }}>
                  <MenuItem value="up" sx={{ fontSize: 12.5 }}>+ % vs marché</MenuItem>
                  <MenuItem value="down" sx={{ fontSize: 12.5 }}>− % vs marché</MenuItem>
                  <MenuItem value="fixed" sx={{ fontSize: 12.5 }}>Prix fixe MAD</MenuItem>
                </TextField>,
              ],
              [
                effect === 'fixed' ? 'MAD/nuit' : '%',
                <TextField key="v" size="small" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} sx={{ ...inputSx, width: 86, '& input': { fontFamily: MONO, textAlign: 'right', fontSize: 12.5, fontWeight: 700, py: 0.875 } }} />,
              ],
              [
                'Min nuits',
                <TextField key="m" size="small" value={minNights} onChange={(e) => setMinNights(e.target.value.replace(/[^\d]/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} sx={{ ...inputSx, width: 72, '& input': { fontFamily: MONO, textAlign: 'right', fontSize: 12.5, fontWeight: 700, py: 0.875 } }} />,
              ],
            ] as const
          ).map(([lbl, field]) => (
            <Stack key={String(lbl)} sx={{ gap: 0.5 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3 }}>{lbl}</Typography>
              {field}
            </Stack>
          ))}
          <Button
            disabled={!canSubmit || saving}
            onClick={submit}
            sx={{
              bgcolor: T.goldDeep, color: '#fff', borderRadius: 1.125, px: 2.25, py: 1,
              fontSize: 12.5, fontWeight: 700, textTransform: 'none',
              '&:hover': { bgcolor: T.gold, color: T.text },
              '&.Mui-disabled': { bgcolor: T.bg3, color: T.text4 },
            }}
          >
            {saving ? 'Ajout…' : 'Ajouter la règle'}
          </Button>
          <Button
            onClick={() => setFormOpen(false)}
            sx={{ color: T.text3, fontSize: 12, textTransform: 'none', py: 1 }}
          >
            Annuler
          </Button>
        </Stack>
      )}
    </Box>
  );
}
