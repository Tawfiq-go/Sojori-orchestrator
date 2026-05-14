// ════════════════════════════════════════════════════════════════════
// Sojori — PricingRulesEditor
// 6 tabs: Month / Weekday / Events / Occupancy / Long Stay / Last Minute
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import {
  Box, Stack, Typography, Tabs, Tab, Slider, Switch, Button, TextField,
  IconButton, Card, Dialog, DialogActions, DialogContent, DialogTitle,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.10)',
  ai: '#8b5cf6', aiTint: 'rgba(139,92,246,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const WEEKDAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export interface PricingRules {
  monthly: { month: number; pct: number; active: boolean }[];
  weekday: { day: number; pct: number; active: boolean }[];
  events: { id: string; name: string; from: string; to: string; pct: number; minStay: number; active: boolean }[];
  occupancy: { minPct: number; maxPct: number; adjustment: number; active: boolean }[];
  longStay: { minNights: number; discount: number; active: boolean }[];
  lastMinute: { daysBefore: number; discount: number; active: boolean }[];
}

const DEFAULT: PricingRules = {
  monthly: MONTHS.map((_, i) => ({ month: i, pct: i === 6 || i === 7 ? 25 : i === 11 ? 15 : 0, active: true })),
  weekday: WEEKDAYS.map((_, i) => ({ day: i, pct: i >= 4 ? 20 : 0, active: true })),
  events: [
    { id: 'e1', name: 'Festival Cannes', from: '2026-05-13', to: '2026-05-24', pct: 50, minStay: 3, active: true },
    { id: 'e2', name: 'Noël',            from: '2026-12-20', to: '2026-12-31', pct: 80, minStay: 5, active: true },
  ],
  occupancy: [
    { minPct: 0,  maxPct: 30, adjustment: -10, active: true },
    { minPct: 70, maxPct: 100, adjustment: 15, active: true },
  ],
  longStay: [
    { minNights: 7,  discount: 10, active: true },
    { minNights: 28, discount: 25, active: true },
  ],
  lastMinute: [
    { daysBefore: 7, discount: 5,  active: true },
    { daysBefore: 2, discount: 15, active: true },
  ],
};

export default function PricingRulesEditor({
  rules: initial = DEFAULT,
  initialTab = 0,
  onChange,
}: {
  rules?: PricingRules;
  initialTab?: number;
  onChange?: (r: PricingRules) => void;
}) {
  const [rules, setRules] = useState<PricingRules>(initial);
  const [tab, setTab] = useState(initialTab);
  const [pendingDelete, setPendingDelete] = useState<null | {
    family: 'events' | 'occupancy' | 'longStay' | 'lastMinute';
    index: number;
    label: string;
  }>(null);

  useEffect(() => {
    setRules(initial);
  }, [initial]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const update = (next: PricingRules) => { setRules(next); onChange?.(next); };
  const confirmDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.family === 'events') {
      update({ ...rules, events: rules.events.filter((_, index) => index !== pendingDelete.index) });
    }
    if (pendingDelete.family === 'occupancy') {
      update({ ...rules, occupancy: rules.occupancy.filter((_, index) => index !== pendingDelete.index) });
    }
    if (pendingDelete.family === 'longStay') {
      update({ ...rules, longStay: rules.longStay.filter((_, index) => index !== pendingDelete.index) });
    }
    if (pendingDelete.family === 'lastMinute') {
      update({ ...rules, lastMinute: rules.lastMinute.filter((_, index) => index !== pendingDelete.index) });
    }

    setPendingDelete(null);
  };

  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ px: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}>
        <Tab label="📅 Mois" />
        <Tab label="🗓️ Jour de la semaine" />
        <Tab label="🎉 Événements" />
        <Tab label="📊 Occupation" />
        <Tab label="🛏️ Séjour long" />
        <Tab label="⚡ Last minute" />
      </Tabs>

      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {rules.monthly.map((m, i) => (
              <Box key={i} sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: m.active ? T.bg1 : T.bg2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{MONTHS[m.month]}</Typography>
                  <Switch size="small" checked={m.active} onChange={(_, c) => update({ ...rules, monthly: rules.monthly.map((x, j) => j === i ? { ...x, active: c } : x) })} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Slider size="small" value={m.pct} min={-50} max={100} step={5} disabled={!m.active}
                    sx={{ color: m.pct >= 0 ? T.success : T.error }}
                    onChange={(_, v) => update({ ...rules, monthly: rules.monthly.map((x, j) => j === i ? { ...x, pct: v as number } : x) })} />
                  <Typography sx={{ minWidth: 50, textAlign: 'right', fontWeight: 700, fontFamily: 'Geist Mono', color: m.pct >= 0 ? T.success : T.error }}>
                    {m.pct >= 0 ? '+' : ''}{m.pct}%
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {tab === 1 && (
          <Stack spacing={1.5}>
            {rules.weekday.map((w, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={2} sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
                <Typography sx={{ fontWeight: 700, minWidth: 80 }}>{WEEKDAYS[w.day]}</Typography>
                <Slider size="small" value={w.pct} min={-30} max={50} step={5} disabled={!w.active}
                  sx={{ flex: 1, color: w.pct >= 0 ? T.success : T.error }}
                  onChange={(_, v) => update({ ...rules, weekday: rules.weekday.map((x, j) => j === i ? { ...x, pct: v as number } : x) })} />
                <Typography sx={{ minWidth: 60, textAlign: 'right', fontWeight: 700, fontFamily: 'Geist Mono', color: w.pct >= 0 ? T.success : T.error }}>
                  {w.pct >= 0 ? '+' : ''}{w.pct}%
                </Typography>
                <Switch size="small" checked={w.active}
                  onChange={(_, c) => update({ ...rules, weekday: rules.weekday.map((x, j) => j === i ? { ...x, active: c } : x) })} />
              </Stack>
            ))}
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={1.5}>
            {rules.events.map((e, i) => (
              <Card key={e.id} variant="outlined" sx={{ p: 2, borderColor: T.border }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                  <TextField size="small" label="Nom" value={e.name} sx={{ flex: 1 }}
                    onChange={(ev) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, name: ev.target.value } : x) })} />
                  <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }} value={e.from}
                    onChange={(ev) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, from: ev.target.value } : x) })} />
                  <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }} value={e.to}
                    onChange={(ev) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, to: ev.target.value } : x) })} />
                  <TextField size="small" type="number" label="%" value={e.pct} sx={{ width: 90 }} InputProps={{ endAdornment: '%' }}
                    onChange={(ev) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, pct: Number(ev.target.value) } : x) })} />
                  <TextField size="small" type="number" label="Min stay" value={e.minStay} sx={{ width: 100 }}
                    onChange={(ev) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, minStay: Number(ev.target.value) } : x) })} />
                  <Switch size="small" checked={e.active}
                    onChange={(_, c) => update({ ...rules, events: rules.events.map((x, j) => j === i ? { ...x, active: c } : x) })} />
                  <IconButton size="small" color="error" onClick={() => setPendingDelete({ family: 'events', index: i, label: e.name || 'cet événement' })}>🗑️</IconButton>
                </Stack>
              </Card>
            ))}
            <Button variant="outlined" sx={{ textTransform: 'none' }}
              onClick={() => update({ ...rules, events: [...rules.events, { id: String(Date.now()), name: 'Nouvel événement', from: '', to: '', pct: 30, minStay: 2, active: true }] })}>
              + Ajouter un événement
            </Button>
          </Stack>
        )}

        {tab === 3 && (
          <Stack spacing={1.5}>
            {rules.occupancy.map((o, i) => (
              <Card key={i} variant="outlined" sx={{ p: 2, borderColor: T.border }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Occupation : {o.minPct}% — {o.maxPct}%</Typography>
                    <Slider size="small" value={[o.minPct, o.maxPct]} min={0} max={100}
                      onChange={(_, v) => { const [a, b] = v as number[]; update({ ...rules, occupancy: rules.occupancy.map((x, j) => j === i ? { ...x, minPct: a, maxPct: b } : x) }); }} />
                  </Box>
                  <TextField size="small" label="Ajustement %" value={o.adjustment} sx={{ width: 130 }} type="number"
                    onChange={(e) => update({ ...rules, occupancy: rules.occupancy.map((x, j) => j === i ? { ...x, adjustment: Number(e.target.value) } : x) })} />
                  <Switch size="small" checked={o.active} />
                  <IconButton size="small" color="error" onClick={() => setPendingDelete({ family: 'occupancy', index: i, label: `la règle ${o.minPct}-${o.maxPct}%` })}>🗑️</IconButton>
                </Stack>
              </Card>
            ))}
            <Button variant="outlined" sx={{ textTransform: 'none' }}
              onClick={() => update({ ...rules, occupancy: [...rules.occupancy, { minPct: 0, maxPct: 100, adjustment: 0, active: true }] })}>
              + Ajouter une règle
            </Button>
          </Stack>
        )}

        {tab === 4 && (
          <Stack spacing={1.5}>
            {rules.longStay.map((l, i) => (
              <Card key={i} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField size="small" type="number" label="Min nuits" value={l.minNights} sx={{ width: 130 }}
                    onChange={(e) => update({ ...rules, longStay: rules.longStay.map((x, j) => j === i ? { ...x, minNights: Number(e.target.value) } : x) })} />
                  <TextField size="small" type="number" label="Remise %" value={l.discount} sx={{ width: 130 }}
                    onChange={(e) => update({ ...rules, longStay: rules.longStay.map((x, j) => j === i ? { ...x, discount: Number(e.target.value) } : x) })} />
                  <Box sx={{ flex: 1 }} />
                  <Switch size="small" checked={l.active} />
                  <IconButton size="small" color="error" onClick={() => setPendingDelete({ family: 'longStay', index: i, label: `la règle ${l.minNights}+ nuits` })}>🗑️</IconButton>
                </Stack>
              </Card>
            ))}
            <Button variant="outlined" sx={{ textTransform: 'none' }}
              onClick={() => update({ ...rules, longStay: [...rules.longStay, { minNights: 7, discount: 5, active: true }] })}>
              + Ajouter une règle séjour long
            </Button>
          </Stack>
        )}

        {tab === 5 && (
          <Stack spacing={1.5}>
            {rules.lastMinute.map((m, i) => (
              <Card key={i} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField size="small" type="number" label="J- avant" value={m.daysBefore} sx={{ width: 130 }}
                    onChange={(e) => update({ ...rules, lastMinute: rules.lastMinute.map((x, j) => j === i ? { ...x, daysBefore: Number(e.target.value) } : x) })} />
                  <TextField size="small" type="number" label="Remise %" value={m.discount} sx={{ width: 130 }}
                    onChange={(e) => update({ ...rules, lastMinute: rules.lastMinute.map((x, j) => j === i ? { ...x, discount: Number(e.target.value) } : x) })} />
                  <Box sx={{ flex: 1 }} />
                  <Switch size="small" checked={m.active} />
                  <IconButton size="small" color="error" onClick={() => setPendingDelete({ family: 'lastMinute', index: i, label: `la règle J-${m.daysBefore}` })}>🗑️</IconButton>
                </Stack>
              </Card>
            ))}
            <Button variant="outlined" sx={{ textTransform: 'none' }}
              onClick={() => update({ ...rules, lastMinute: [...rules.lastMinute, { daysBefore: 3, discount: 10, active: true }] })}>
              + Ajouter une règle last minute
            </Button>
          </Stack>
        )}
      </Box>

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer une règle</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: T.text2 }}>
            Confirmer la suppression de {pendingDelete?.label} ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button color="error" onClick={confirmDelete} sx={{ textTransform: 'none' }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
