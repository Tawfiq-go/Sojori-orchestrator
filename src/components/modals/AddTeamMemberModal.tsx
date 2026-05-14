// ════════════════════════════════════════════════════════════════════
// Sojori — AddTeamMemberModal
// 3 tabs (Profil / Planning / Documents) — 17 champs profil
// Material-UI v9 · TypeScript · Aurora Soft Light · MOCK data
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button,
  Tabs, Tab, Box, Stack, Avatar, TextField, Select, MenuItem, Chip,
  Radio, RadioGroup, FormControlLabel, FormLabel, FormControl, Switch,
  Typography, useTheme, useMediaQuery,
} from '@mui/material';

const T = {
  primary: '#e6b022', primaryDeep: '#b8881a', primarySoft: '#f4cf5e',
  ai: '#8b5cf6', success: '#10b981', error: '#ef4444', warning: '#f59e0b',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

const ROLES = ['Concierge', 'Ménage', 'Maintenance', 'Manager', 'Réceptionniste'];
const SUBTYPES = ['Check-in', 'Check-out', 'Mid-stay', 'Inspection', 'Réparation', 'Livraison', 'Photos'];
const LANGS = ['🇫🇷 FR', '🇬🇧 EN', '🇪🇸 ES', '🇮🇹 IT', '🇩🇪 DE', '🇲🇦 AR'];
const ZONES = ['Nice — Côte d\'Azur', 'Marrakech — Médina', 'Marrakech — Guéliz', 'Marrakech — Palmeraie', 'Calvi'];
const CONTRATS = ['CDI', 'CDD', 'Indépendant', 'Stage', 'Apprentissage'];

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export interface TeamMember {
  id?: string;
  photo?: string;
  username?: string;
  staffCode?: string;
  email?: string;
  phone?: string;
  role?: string;
  subtypes?: string[];
  languages?: string[];
  skills?: string[];
  zone?: string;
  status?: 'active' | 'inactive' | 'leave';
  hiringDate?: string;
  contract?: string;
  rate?: number;
  notes?: string;
  planning?: { day: string; start: string; end: string; present: boolean }[];
  documents?: { name: string; url?: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  member?: TeamMember;
  onSave?: (member: TeamMember) => void;
}

export default function AddTeamMemberModal({ open, onClose, member, onSave }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<TeamMember>(member || {
    status: 'active', subtypes: [], languages: ['🇫🇷 FR'], skills: [],
    planning: DAYS.map(d => ({ day: d, start: '09:00', end: '18:00', present: d !== 'Dimanche' })),
    documents: [],
  });
  const [skillInput, setSkillInput] = useState('');

  const update = (k: keyof TeamMember, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleChip = (k: keyof TeamMember, v: string) => {
    const arr = (form[k] as string[]) || [];
    update(k, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 2.5, bgcolor: T.bg1 } } }}
    >
      <DialogTitle sx={{ p: 0, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" sx={{ px: 3, py: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.3px' }}>
              {member ? 'Modifier membre' : 'Ajouter membre'}
            </Typography>
            <Typography variant="body2" sx={{ color: T.text3, mt: 0.5 }}>
              Renseignez le profil, le planning hebdomadaire et les documents.
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}>
          <Tab label="Profil" />
          <Tab label="Planning" />
          <Tab label="Documents" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: T.bg2 }}>
        {tab === 0 && <ProfilTab form={form} update={update} toggleChip={toggleChip} skillInput={skillInput} setSkillInput={setSkillInput} />}
        {tab === 1 && <PlanningTab form={form} update={update} />}
        {tab === 2 && <DocumentsTab form={form} update={update} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2 }}>Annuler</Button>
        {member && <Button color="error" sx={{ textTransform: 'none' }}>Supprimer</Button>}
        <Button onClick={() => onSave?.(form)} variant="contained" sx={{
          textTransform: 'none', fontWeight: 600,
          background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
          color: T.text, boxShadow: `0 4px 12px rgba(230,176,34,0.30)`,
          '&:hover': { background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
        }}>
          {member ? 'Enregistrer' : 'Créer le membre'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab : Profil (17 champs) ────────────────────────────────────
function ProfilTab({ form, update, toggleChip, skillInput, setSkillInput }: any) {
  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !form.skills?.includes(v)) update('skills', [...(form.skills || []), v]);
    setSkillInput('');
  };

  return (
    <Stack spacing={3}>
      {/* Header : photo + identité */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar src={form.photo} sx={{ width: 72, height: 72, bgcolor: T.bg2, color: T.text3, fontSize: 28, fontWeight: 700 }}>
          {form.username?.[0]?.toUpperCase() || '?'}
        </Avatar>
        <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
          📷 Upload photo
          <input type="file" hidden accept="image/*" />
        </Button>
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={<Switch checked={form.status === 'active'} onChange={(_, c) => update('status', c ? 'active' : 'inactive')} />}
          label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Actif</Typography>}
        />
      </Stack>

      <Section title="Identité">
        <Grid2>
          <TextField fullWidth size="small" label="Username" value={form.username || ''} onChange={(e) => update('username', e.target.value)} />
          <TextField fullWidth size="small" label="Staff Code (auto)" value={form.staffCode || ''} onChange={(e) => update('staffCode', e.target.value)} placeholder="SOJ-MEM-XXXX" />
        </Grid2>
        <Grid2>
          <TextField fullWidth size="small" type="email" label="Email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
          <TextField fullWidth size="small" label="Téléphone" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="+33 6 ... ou +212 6 ..." />
        </Grid2>
      </Section>

      <Section title="Rôle & compétences">
        <Grid2>
          <FormControl fullWidth size="small">
            <Select displayEmpty value={form.role || ''} onChange={(e) => update('role', e.target.value)}>
              <MenuItem value=""><em>Rôle principal</em></MenuItem>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <Select displayEmpty value={form.zone || ''} onChange={(e) => update('zone', e.target.value)}>
              <MenuItem value=""><em>Zone géographique</em></MenuItem>
              {ZONES.map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid2>

        <Box>
          <ChipLabel>Sous-types (multi)</ChipLabel>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {SUBTYPES.map(s => (
              <Chip key={s} label={s} clickable
                onClick={() => toggleChip('subtypes', s)}
                color={form.subtypes?.includes(s) ? 'primary' : 'default'}
                variant={form.subtypes?.includes(s) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <ChipLabel>Langues</ChipLabel>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {LANGS.map(l => (
              <Chip key={l} label={l} clickable
                onClick={() => toggleChip('languages', l)}
                color={form.languages?.includes(l) ? 'primary' : 'default'}
                variant={form.languages?.includes(l) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <ChipLabel>Compétences</ChipLabel>
          <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: 'wrap' }}>
            {(form.skills || []).map((s: string) => (
              <Chip key={s} label={s} onDelete={() => update('skills', form.skills.filter((x: string) => x !== s))} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" placeholder="Ajouter une compétence" value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              sx={{ flex: 1 }} />
            <Button onClick={addSkill} variant="outlined" sx={{ textTransform: 'none' }}>+ Ajouter</Button>
          </Stack>
        </Box>
      </Section>

      <Section title="Statut & contrat">
        <FormControl>
          <FormLabel sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Statut</FormLabel>
          <RadioGroup row value={form.status} onChange={(e) => update('status', e.target.value)}>
            <FormControlLabel value="active" control={<Radio size="small" />} label="Actif" />
            <FormControlLabel value="inactive" control={<Radio size="small" />} label="Inactif" />
            <FormControlLabel value="leave" control={<Radio size="small" />} label="En congé" />
          </RadioGroup>
        </FormControl>
        <Grid2>
          <TextField fullWidth size="small" type="date" label="Date embauche" slotProps={{ inputLabel: { shrink: true } }}
            value={form.hiringDate || ''} onChange={(e) => update('hiringDate', e.target.value)} />
          <FormControl fullWidth size="small">
            <Select displayEmpty value={form.contract || ''} onChange={(e) => update('contract', e.target.value)}>
              <MenuItem value=""><em>Type de contrat</em></MenuItem>
              {CONTRATS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid2>
        <Grid2>
          <TextField fullWidth size="small" type="number" label="Salaire / Tarif (€)" value={form.rate || ''}
            onChange={(e) => update('rate', Number(e.target.value))} slotProps={{ input: { endAdornment: '€' } }} />
          <Box />
        </Grid2>
      </Section>

      <Section title="Notes internes">
        <TextField fullWidth multiline rows={3} size="small" placeholder="Notes visibles uniquement par les admins…"
          value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
      </Section>
    </Stack>
  );
}

// ─── Tab : Planning 7 jours ─────────────────────────────────────
function PlanningTab({ form, update }: any) {
  const updateDay = (idx: number, patch: any) => {
    const next = [...(form.planning || [])];
    next[idx] = { ...next[idx], ...patch };
    update('planning', next);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: T.text3 }}>
        Horaires hebdomadaires standards. Pour des congés ou variations, utilisez
        l'onglet « Planning horaires » sur la page Équipe.
      </Typography>
      <Stack spacing={1}>
        {(form.planning || []).map((d: any, idx: number) => (
          <Stack key={d.day} direction="row" spacing={2}
            sx={{ p: 2, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 600, width: 100 }}>{d.day}</Typography>
            <FormControlLabel
              control={<Switch checked={d.present} onChange={(_, c) => updateDay(idx, { present: c })} />}
              label={<Typography variant="body2">{d.present ? 'Présent' : 'Absent'}</Typography>}
              sx={{ minWidth: 110 }}
            />
            <TextField size="small" type="time" label="Début" slotProps={{ inputLabel: { shrink: true } }}
              value={d.start} disabled={!d.present}
              onChange={(e) => updateDay(idx, { start: e.target.value })} />
            <TextField size="small" type="time" label="Fin" slotProps={{ inputLabel: { shrink: true } }}
              value={d.end} disabled={!d.present}
              onChange={(e) => updateDay(idx, { end: e.target.value })} />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// ─── Tab : Documents ────────────────────────────────────────────
function DocumentsTab({ form, update }: any) {
  const addDoc = (name: string) => update('documents', [...(form.documents || []), { name }]);
  return (
    <Stack spacing={2}>
      <Box sx={{
        p: 4, textAlign: 'center', borderRadius: 2, border: `2px dashed ${T.border}`,
        bgcolor: T.bg1, color: T.text3,
      }}>
        <Typography variant="h6" sx={{ mb: 0.5, color: T.text2 }}>📄 Glisser-déposer vos documents</Typography>
        <Typography variant="body2">Contrat, pièce d'identité, certificats — PDF, JPG, PNG · max 10 MB</Typography>
        <Button variant="outlined" component="label" sx={{ mt: 2, textTransform: 'none' }}>
          Parcourir mes fichiers
          <input type="file" hidden multiple onChange={(e) => {
            Array.from(e.target.files || []).forEach(f => addDoc(f.name));
          }} />
        </Button>
      </Box>
      <Stack spacing={1}>
        {(form.documents || []).map((d: any, i: number) => (
          <Stack key={i} direction="row" spacing={1.5}
            sx={{ p: 1.5, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, alignItems: 'center' }}>
            <Typography sx={{ fontSize: 20 }}>📄</Typography>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{d.name}</Typography>
            <IconButton size="small" onClick={() => update('documents', form.documents.filter((_: any, j: number) => j !== i))}>✕</IconButton>
          </Stack>
        ))}
        {(form.documents || []).length === 0 && (
          <Typography variant="caption" sx={{ textAlign: 'center', color: T.text3, fontStyle: 'italic', py: 2 }}>
            Aucun document uploadé pour le moment.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

// ─── Helpers ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2.5, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 700, mb: 2, color: T.text }}>{title}</Typography>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{children}</Stack>;
}
function ChipLabel({ children }: { children: React.ReactNode }) {
  return <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: T.text2 }}>{children}</Typography>;
}
