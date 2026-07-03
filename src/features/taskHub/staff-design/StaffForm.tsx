// ════════════════════════════════════════════════════════════════════
// StaffForm.tsx — Formulaire création / édition staff
// (drawer ou page · le parent décide via le wrapper)
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, Button, TextField, MenuItem, Switch, Chip, IconButton } from '@mui/material';
import type { Staff, TaskType, ContractType, StaffStatus } from './types';
import { T, TASK_TYPE_META } from './types';

export interface StaffFormProps {
  initial?: Partial<Staff>;
  allListings: { _id: string; name: string }[];
  onSave: (s: Staff) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

const DAY_LABELS = ['L','M','M','J','V','S','D'];

export default function StaffForm({ initial, allListings, onSave, onCancel, onDelete }: StaffFormProps) {
  const [s, setS] = useState<Staff>({
    _id: initial?._id || '',
    fullName: initial?.fullName || '',
    phoneE164: initial?.phoneE164 || '',
    whatsappE164: initial?.whatsappE164 || '',
    email: initial?.email || '',
    avatarColor: initial?.avatarColor || 1,
    status: initial?.status || 'active',
    isAdmin: initial?.isAdmin || false,
    contractType: initial?.contractType || 'employee',
    rates: initial?.rates || {},
    allowedTaskTypes: initial?.allowedTaskTypes || [],
    allowedListingIds: initial?.allowedListingIds || [],
    allowedCityIds: initial?.allowedCityIds || [],
    maxTasksPerDay: initial?.maxTasksPerDay,
    schedule: initial?.schedule || { daysOfWeek: [0,1,2,3,4], timeWindows: [{ start: '08:00', end: '18:00' }] },
    notes: initial?.notes,
  });
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<Staff>) => setS(prev => ({ ...prev, ...p }));
  const toggleTask = (t: TaskType) => patch({
    allowedTaskTypes: s.allowedTaskTypes.includes(t)
      ? s.allowedTaskTypes.filter(x => x !== t)
      : [...s.allowedTaskTypes, t],
  });
  const toggleListing = (id: string) => patch({
    allowedListingIds: s.allowedListingIds.includes(id)
      ? s.allowedListingIds.filter(x => x !== id)
      : [...s.allowedListingIds, id],
  });
  const toggleDay = (d: number) => patch({
    schedule: {
      ...s.schedule,
      daysOfWeek: s.schedule.daysOfWeek.includes(d)
        ? s.schedule.daysOfWeek.filter(x => x !== d)
        : [...s.schedule.daysOfWeek, d],
    },
  });

  const handleSave = async () => {
    if (!s.fullName || !s.whatsappE164) return;
    setSaving(true);
    try { await onSave(s); } finally { setSaving(false); }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction="row" gap={1.5} sx={{ alignItems: 'center',  mb: 3 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em' }}>
          {initial?._id ? 'Modifier le membre' : 'Nouveau membre'}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          {initial?._id && onDelete && (
            <Button onClick={onDelete} sx={{
              textTransform: 'none', color: T.error, mr: 1,
              '&:hover': { bgcolor: T.errorTint },
            }}>Supprimer</Button>
          )}
          <Button onClick={onCancel} sx={{
            textTransform: 'none', color: T.text2, mr: 1,
          }}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !s.fullName || !s.whatsappE164} sx={{
            background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
            textTransform: 'none', fontWeight: 700, px: 2.25, borderRadius: 1.25,
            '&:hover': { transform: 'translateY(-1px)' },
            '&:disabled': { opacity: 0.4 },
          }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </Box>
      </Stack>

      {/* Identité */}
      <Section title="Identité">
        <Field label="Nom complet" required>
          <TextField size="small" fullWidth value={s.fullName}
            onChange={e => patch({ fullName: e.target.value })}
            placeholder="ex: Ahmed Benali" sx={inputSx} />
        </Field>
        <Field label="WhatsApp" required help="Format E.164 · ex : +212600123456">
          <TextField size="small" fullWidth value={s.whatsappE164}
            onChange={e => patch({ whatsappE164: e.target.value })}
            placeholder="+212600000000" sx={inputSx} />
        </Field>
        <Field label="Téléphone" help="Optionnel · format E.164">
          <TextField size="small" fullWidth value={s.phoneE164}
            onChange={e => patch({ phoneE164: e.target.value })} sx={inputSx} />
        </Field>
        <Field label="Email" help="Optionnel · pour notifications email">
          <TextField size="small" fullWidth type="email" value={s.email}
            onChange={e => patch({ email: e.target.value })} sx={inputSx} />
        </Field>
      </Section>

      {/* Statut & rôle */}
      <Section title="Statut & rôle">
        <Field label="Statut">
          <Stack direction="row" gap={0.5}>
            {(['active','off','leave'] as StaffStatus[]).map(st => (
              <PillBtn key={st} on={s.status === st} onClick={() => patch({ status: st })}>
                {{active:'Actif', off:'Hors service', leave:'Congé'}[st]}
              </PillBtn>
            ))}
          </Stack>
        </Field>
        <Field label="Type contrat">
          <Stack direction="row" gap={0.5}>
            {(['employee','freelance'] as ContractType[]).map(c => (
              <PillBtn key={c} on={s.contractType === c} onClick={() => patch({ contractType: c })}>
                {c === 'employee' ? 'Salarié' : 'Freelance'}
              </PillBtn>
            ))}
          </Stack>
        </Field>
        <Field label="Admin" help="Accès complet au dashboard PM">
          <Switch checked={s.isAdmin} onChange={e => patch({ isAdmin: e.target.checked })}
            sx={{ '& .Mui-checked': { color: T.primary } }} />
        </Field>
      </Section>

      {/* Tâches autorisées */}
      <Section title="Types de tâches autorisés" help="Le staff ne sera assigné qu a ces types">
        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
          {(Object.keys(TASK_TYPE_META) as TaskType[]).map(t => {
            const on = s.allowedTaskTypes.includes(t);
            return (
              <PillBtn key={t} on={on} onClick={() => toggleTask(t)}>
                {TASK_TYPE_META[t].emoji} {TASK_TYPE_META[t].label}
              </PillBtn>
            );
          })}
        </Stack>
      </Section>

      {/* Tarifs freelance */}
      {s.contractType === 'freelance' && (
        <Section title="Tarifs freelance" help="Prix par type de tâche en MAD">
          {s.allowedTaskTypes.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: T.text3, fontStyle: 'italic' }}>
              {'Sélectionne d\u2019abord des types de tâches ci-dessus.'}
            </Typography>
          ) : s.allowedTaskTypes.map(t => (
            <Field key={t} label={`${TASK_TYPE_META[t].emoji} ${TASK_TYPE_META[t].label}`}>
              <TextField size="small" type="number" value={s.rates?.[t] || ''}
                onChange={e => patch({ rates: { ...s.rates, [t]: Number(e.target.value) } })}
                InputProps={{ endAdornment: <Box sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 700, letterSpacing: '0.04em' }}>MAD</Box> }}
                sx={{ ...inputSx, maxWidth: 200 }} />
            </Field>
          ))}
        </Section>
      )}

      {/* Listings autorisés */}
      <Section title="Listings autorisés" help="Vide = tous les listings du PM">
        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
          {allListings.map(l => {
            const on = s.allowedListingIds.includes(l._id);
            return (
              <PillBtn key={l._id} on={on} onClick={() => toggleListing(l._id)}>{l.name}</PillBtn>
            );
          })}
        </Stack>
      </Section>

      {/* Planning */}
      <Section title="Planning">
        <Field label="Jours travaillés">
          <Stack direction="row" gap={0.5}>
            {DAY_LABELS.map((d, i) => {
              const on = s.schedule.daysOfWeek.includes(i);
              return <PillBtn key={i} on={on} onClick={() => toggleDay(i)}>{d}</PillBtn>;
            })}
          </Stack>
        </Field>
        <Field label="Horaires">
          {s.schedule.timeWindows.map((tw, i) => (
            <Stack key={i} direction="row" gap={0.75} sx={{ alignItems: 'center',  mb: 0.5 }}>
              <TextField size="small" type="time" value={tw.start}
                onChange={e => {
                  const next = [...s.schedule.timeWindows];
                  next[i] = { ...next[i], start: e.target.value };
                  patch({ schedule: { ...s.schedule, timeWindows: next } });
                }}
                sx={{ ...inputSx, width: 110 }} />
              <Box sx={{ color: T.text3 }}>→</Box>
              <TextField size="small" type="time" value={tw.end}
                onChange={e => {
                  const next = [...s.schedule.timeWindows];
                  next[i] = { ...next[i], end: e.target.value };
                  patch({ schedule: { ...s.schedule, timeWindows: next } });
                }}
                sx={{ ...inputSx, width: 110 }} />
              {s.schedule.timeWindows.length > 1 && (
                <IconButton size="small" onClick={() => patch({ schedule: { ...s.schedule, timeWindows: s.schedule.timeWindows.filter((_, j) => j !== i) } })}
                  sx={{ color: T.text3 }}>✕</IconButton>
              )}
            </Stack>
          ))}
          <Button size="small" onClick={() => patch({ schedule: { ...s.schedule, timeWindows: [...s.schedule.timeWindows, { start: '08:00', end: '18:00' }] } })}
            sx={{ textTransform: 'none', fontSize: 11.5, color: T.primaryDeep, mt: 0.5 }}>
            + Ajouter une plage
          </Button>
        </Field>
        <Field label="Max tâches / jour" help="Vide = illimité">
          <TextField size="small" type="number" value={s.maxTasksPerDay || ''}
            onChange={e => patch({ maxTasksPerDay: e.target.value ? Number(e.target.value) : undefined })}
            sx={{ ...inputSx, maxWidth: 120 }} />
        </Field>
      </Section>
    </Box>
  );
}

/* ─── Sub-pieces ─── */
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.125, bgcolor: T.bg1, fontSize: 13,
    '& fieldset': { borderColor: T.border },
    '&.Mui-focused fieldset': { borderColor: T.primary, boxShadow: `0 0 0 3px ${T.primaryTint}` },
  },
};

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      mb: 2, p: 2, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
    }}>
      <Stack direction="row" gap={1.25} sx={{ alignItems: 'baseline',  mb: 1.5 }}>
        <Typography sx={{
          fontSize: 11, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{title}</Typography>
        {help && <Typography sx={{ fontSize: 11, color: T.text4 }}>{help}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

function Field({ label, required, help, children }: {
  label: string; required?: boolean; help?: string; children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 1.75, alignItems: 'flex-start', py: 0.875 }}>
      <Box sx={{ pt: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
          {label}{required && <Box component="span" sx={{ color: T.error, ml: 0.25 }}>*</Box>}
        </Typography>
        {help && <Typography sx={{
          fontSize: 10.5, color: T.text4, fontFamily: '"Geist Mono", monospace',
          fontWeight: 600, mt: 0.375, letterSpacing: '0.02em', lineHeight: 1.4,
        }}>{help}</Typography>}
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

function PillBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer',
      px: 1.25, py: 0.75, borderRadius: 0.875, fontSize: 11.5, fontWeight: 700,
      fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em',
      ...(on
        ? { bgcolor: T.primaryTint, border: `1px solid ${T.primary}`, color: T.primaryDeep }
        : { bgcolor: T.bg1, border: `1px solid ${T.border}`, color: T.text3 }),
    }}>{children}</Box>
  );
}
