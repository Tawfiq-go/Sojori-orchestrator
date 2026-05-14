import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Typography,
  Switch,
  FormControlLabel,
  Stack,
  IconButton,
  Chip,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';

// Types
export interface TeamMember {
  id: string;
  staffCode: string;
  firstName: string;
  lastName: string;
  role: string;
  subTypes: string[];
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  city: string;
  zipCode: string;
  dateOfBirth: string;
  hireDate: string;
  contractType: string;
  salary: string;
  languages: string[];
  skills: string[];
  zone: string;
  availability: Record<string, { present: boolean; timings: { start: string; end: string }[] }>;
  documents: { name: string; url: string; uploadedAt: string }[];
  photo: string;
  status: 'active' | 'inactive' | 'on_leave';
}

const ROLES = ['Femme de menage', 'Maintenance', 'Chauffeur', 'Conciergerie', 'Manager', 'Admin'];
const SUB_TYPES = ['Ménage standard', 'Ménage profond', 'Plomberie', 'Électricité', 'Climatisation', 'Jardinage', 'Transport aéroport', 'Transport ville', 'Accueil', 'Check-in', 'Check-out', 'Assistance', 'Coordination', 'Supervision'];
const LANGUAGES = ['Français', 'Arabe', 'Anglais', 'Espagnol', 'Italien', 'Allemand'];
const SKILLS = ['Ménage', 'Plomberie', 'Électricité', 'Jardinage', 'Conduite', 'Communication', 'Organisation', 'Bricolage', 'Informatique'];
const ZONES = ['Marrakech Centre', 'Gueliz', 'Hivernage', 'Palmeraie', 'Route Ouarzazate', 'Targa', 'Autre'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Freelance', 'Stage'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface AddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (member: TeamMember) => void;
  existingMember?: TeamMember | null;
}

export function AddTeamMemberModal({ open, onClose, onSave, existingMember }: AddTeamMemberModalProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Tab 1: Profil (17 champs)
  const [staffCode, setStaffCode] = useState(existingMember?.staffCode || '');
  const [firstName, setFirstName] = useState(existingMember?.firstName || '');
  const [lastName, setLastName] = useState(existingMember?.lastName || '');
  const [role, setRole] = useState(existingMember?.role || '');
  const [subTypes, setSubTypes] = useState<string[]>(existingMember?.subTypes || []);
  const [phone, setPhone] = useState(existingMember?.phone || '');
  const [email, setEmail] = useState(existingMember?.email || '');
  const [emergencyContact, setEmergencyContact] = useState(existingMember?.emergencyContact || '');
  const [emergencyPhone, setEmergencyPhone] = useState(existingMember?.emergencyPhone || '');
  const [address, setAddress] = useState(existingMember?.address || '');
  const [city, setCity] = useState(existingMember?.city || 'Marrakech');
  const [zipCode, setZipCode] = useState(existingMember?.zipCode || '');
  const [dateOfBirth, setDateOfBirth] = useState(existingMember?.dateOfBirth || '');
  const [hireDate, setHireDate] = useState(existingMember?.hireDate || new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState(existingMember?.contractType || 'CDI');
  const [salary, setSalary] = useState(existingMember?.salary || '');
  const [languages, setLanguages] = useState<string[]>(existingMember?.languages || ['Français', 'Arabe']);
  const [skills, setSkills] = useState<string[]>(existingMember?.skills || []);
  const [zone, setZone] = useState(existingMember?.zone || '');

  // Tab 2: Planning (7 jours)
  const defaultAvailability = DAYS.reduce((acc, day) => {
    acc[day] = { present: true, timings: [{ start: '08:00', end: '17:00' }] };
    return acc;
  }, {} as Record<string, { present: boolean; timings: { start: string; end: string }[] }>);

  const [availability, setAvailability] = useState<Record<string, { present: boolean; timings: { start: string; end: string }[] }>>(
    existingMember?.availability || defaultAvailability
  );

  // Tab 3: Documents (upload)
  const [documents, setDocuments] = useState<{ name: string; url: string; uploadedAt: string }[]>(
    existingMember?.documents || []
  );

  const handleReset = () => {
    setActiveTab(0);
    setStaffCode('');
    setFirstName('');
    setLastName('');
    setRole('');
    setSubTypes([]);
    setPhone('');
    setEmail('');
    setEmergencyContact('');
    setEmergencyPhone('');
    setAddress('');
    setCity('Marrakech');
    setZipCode('');
    setDateOfBirth('');
    setHireDate(new Date().toISOString().split('T')[0]);
    setContractType('CDI');
    setSalary('');
    setLanguages(['Français', 'Arabe']);
    setSkills([]);
    setZone('');
    setAvailability(defaultAvailability);
    setDocuments([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSave = () => {
    // Validation
    if (!firstName.trim() || !lastName.trim() || !role || !phone || !email) {
      toast.error('Veuillez remplir tous les champs obligatoires (Prénom, Nom, Rôle, Téléphone, Email)');
      setActiveTab(0); // Go back to profile tab
      return;
    }

    const member: TeamMember = {
      id: existingMember?.id || `STAFF${String(Math.floor(Math.random() * 10000)).padStart(3, '0')}`,
      staffCode: staffCode || `STF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      firstName,
      lastName,
      role,
      subTypes,
      phone,
      email,
      emergencyContact,
      emergencyPhone,
      address,
      city,
      zipCode,
      dateOfBirth,
      hireDate,
      contractType,
      salary,
      languages,
      skills,
      zone,
      availability,
      documents,
      photo: existingMember?.photo || `https://i.pravatar.cc/150?u=${firstName}${lastName}`,
      status: existingMember?.status || 'active',
    };

    onSave(member);
    toast.success(existingMember ? 'Membre modifié avec succès' : 'Membre ajouté avec succès');
    handleClose();
  };

  // Planning helpers
  const toggleDayPresence = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        present: !availability[day].present,
      },
    });
  };

  const addTiming = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        timings: [...availability[day].timings, { start: '08:00', end: '17:00' }],
      },
    });
  };

  const removeTiming = (day: string, index: number) => {
    const newTimings = [...availability[day].timings];
    newTimings.splice(index, 1);
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        timings: newTimings.length > 0 ? newTimings : [{ start: '08:00', end: '17:00' }], // Keep at least 1
      },
    });
  };

  const updateTiming = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const newTimings = [...availability[day].timings];
    newTimings[index][field] = value;
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        timings: newTimings,
      },
    });
  };

  const copyToAllDays = (sourceDay: string) => {
    const sourceTiming = availability[sourceDay];
    const newAvailability = { ...availability };
    DAYS.forEach((day) => {
      newAvailability[day] = {
        present: sourceTiming.present,
        timings: sourceTiming.timings.map((t) => ({ ...t })),
      };
    });
    setAvailability(newAvailability);
    toast.success(`Horaires de ${sourceDay} copiés vers tous les jours`);
  };

  // Document helpers
  const handleAddDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // MOCK upload - in real app, upload to server
        const mockUrl = `https://sojori.com/documents/${file.name}`;
        setDocuments([
          ...documents,
          {
            name: file.name,
            url: mockUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]);
        toast.success(`Document "${file.name}" ajouté (MOCK)`);
      }
    };
    input.click();
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
    toast.info('Document supprimé');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: `1px solid ${t.border}`, pb: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: t.text }}>
          {existingMember ? 'Modifier un membre' : 'Ajouter un membre'}
        </Typography>
      </DialogTitle>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          borderBottom: `1px solid ${t.border}`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 },
        }}
      >
        <Tab label="1. Profil" />
        <Tab label="2. Planning" />
        <Tab label="3. Documents" />
      </Tabs>

      <DialogContent sx={{ p: 3, minHeight: 400, maxHeight: '60vh', overflowY: 'auto' }}>
        {/* TAB 1: PROFIL (17 champs) */}
        {activeTab === 0 && (
          <Stack spacing={2.5}>
            {/* Section: Identité */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text3, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Identité
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Code staff (auto-généré)"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="STF-2026-XXX"
                  disabled={!!existingMember}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Prénom *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    label="Nom *"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" fullWidth required>
                    <InputLabel>Rôle *</InputLabel>
                    <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rôle *">
                      {ROLES.map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Autocomplete
                    multiple
                    options={SUB_TYPES}
                    value={subTypes}
                    onChange={(_, newValue) => setSubTypes(newValue)}
                    renderInput={(params) => <TextField {...params} label="Sous-types" size="small" />}
                    size="small"
                    fullWidth
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} size="small" {...getTagProps({ index })} />
                      ))
                    }
                  />
                </Stack>
                <TextField
                  label="Date de naissance"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>

            {/* Section: Contact */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text3, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Contact
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Téléphone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    size="small"
                    fullWidth
                    required
                    placeholder="+33 6 12 34 56 78"
                  />
                  <TextField
                    label="Email *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Contact d'urgence"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Tél. urgence"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="+33 6 XX XX XX XX"
                  />
                </Stack>
                <TextField
                  label="Adresse"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Ville"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Code postal"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Stack>
            </Box>

            {/* Section: Emploi */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text3, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Emploi
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Date d'embauche"
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Type de contrat</InputLabel>
                    <Select value={contractType} onChange={(e) => setContractType(e.target.value)} label="Type de contrat">
                      {CONTRACT_TYPES.map((ct) => (
                        <MenuItem key={ct} value={ct}>{ct}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <TextField
                  label="Salaire (MAD/mois)"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="5000"
                />
              </Stack>
            </Box>

            {/* Section: Compétences */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text3, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Compétences & Zone
              </Typography>
              <Stack spacing={2}>
                <Autocomplete
                  multiple
                  options={LANGUAGES}
                  value={languages}
                  onChange={(_, newValue) => setLanguages(newValue)}
                  renderInput={(params) => <TextField {...params} label="Langues" size="small" />}
                  size="small"
                  fullWidth
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" color="primary" {...getTagProps({ index })} />
                    ))
                  }
                />
                <Autocomplete
                  multiple
                  options={SKILLS}
                  value={skills}
                  onChange={(_, newValue) => setSkills(newValue)}
                  renderInput={(params) => <TextField {...params} label="Compétences" size="small" />}
                  size="small"
                  fullWidth
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" color="secondary" {...getTagProps({ index })} />
                    ))
                  }
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Zone d'intervention</InputLabel>
                  <Select value={zone} onChange={(e) => setZone(e.target.value)} label="Zone d'intervention">
                    {ZONES.map((z) => (
                      <MenuItem key={z} value={z}>{z}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* TAB 2: PLANNING (7 jours) */}
        {activeTab === 1 && (
          <Stack spacing={2}>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 1 }}>
              Définissez les horaires de disponibilité pour chaque jour de la semaine.
            </Typography>
            {DAYS.map((day) => (
              <Box key={day} sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={availability[day].present}
                          onChange={() => toggleDayPresence(day)}
                          size="small"
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: availability[day].present ? t.text : t.text3 }}>
                          {day}
                        </Typography>
                      }
                    />
                    {!availability[day].present && (
                      <Chip label="Absent" size="small" sx={{ bgcolor: t.errorTint, color: t.error, height: 20, fontSize: 10 }} />
                    )}
                  </Stack>
                  <Button
                    size="small"
                    onClick={() => copyToAllDays(day)}
                    sx={{ fontSize: 11, textTransform: 'none', color: t.text3 }}
                  >
                    📋 Copier vers tous
                  </Button>
                </Stack>

                {availability[day].present && (
                  <Stack spacing={1}>
                    {availability[day].timings.map((timing, idx) => (
                      <Stack key={idx} direction="row" spacing={1} alignItems="center">
                        <TextField
                          type="time"
                          value={timing.start}
                          onChange={(e) => updateTiming(day, idx, 'start', e.target.value)}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 120 }}
                        />
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>à</Typography>
                        <TextField
                          type="time"
                          value={timing.end}
                          onChange={(e) => updateTiming(day, idx, 'end', e.target.value)}
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 120 }}
                        />
                        <Box sx={{ flex: 1 }} />
                        {availability[day].timings.length > 1 && (
                          <IconButton size="small" onClick={() => removeTiming(day, idx)} sx={{ color: t.error }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addTiming(day)}
                      sx={{ alignSelf: 'flex-start', fontSize: 11, textTransform: 'none' }}
                    >
                      Ajouter un créneau
                    </Button>
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}

        {/* TAB 3: DOCUMENTS (upload) */}
        {activeTab === 2 && (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: 'center', py: 3, bgcolor: t.bg2, borderRadius: '8px', border: `2px dashed ${t.border}` }}>
              <UploadIcon sx={{ fontSize: 48, color: t.text3, mb: 1 }} />
              <Typography sx={{ fontSize: 13, color: t.text3, mb: 2 }}>
                Ajoutez des documents (contrat, ID, certificats, etc.)
              </Typography>
              <Button variant="contained" sx={btnPrimarySx} startIcon={<AddIcon />} onClick={handleAddDocument}>
                Ajouter un document
              </Button>
            </Box>

            {documents.length > 0 && (
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Documents ({documents.length})
                </Typography>
                {documents.map((doc, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      border: `1px solid ${t.border}`,
                      borderRadius: '6px',
                      '&:hover': { bgcolor: t.bg2 },
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>{doc.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: t.text3 }}>
                        Ajouté le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Stack>
                    <IconButton size="small" onClick={() => removeDocument(idx)} sx={{ color: t.error }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${t.border}`, p: 2 }}>
        <Button onClick={handleClose} sx={btnGhostSx}>
          Annuler
        </Button>
        <Button variant="contained" sx={btnPrimarySx} onClick={handleSave}>
          {existingMember ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
