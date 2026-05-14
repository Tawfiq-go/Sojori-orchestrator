import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Chip,
  Autocomplete,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { tokens as t } from '../dashboard/DashboardV2.components';
import { Task, taskTypes, taskSubTypes, mockListings, mockStaff } from '../../data/mockTasks';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  existingTask?: Task | null;
}

export function CreateTaskModal({ open, onClose, onSave, existingTask }: CreateTaskModalProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    type: '',
    subType: '',
    status: 'CREATED',
    priority: 'Normal',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startHour: '09:00',
    endHour: '17:00',
    duration: 2,
    staffId: null,
    staffName: null,
    reservationId: null,
    reservationNumber: null,
    guestName: null,
    arrivalDate: null,
    departureDate: null,
    listingId: mockListings[0].id,
    listingName: mockListings[0].name,
    roomTypeId: '',
    roomTypeName: '',
    price: 0,
    currency: 'EUR',
    paid: false,
    paymentMode: 'cash',
    requestPayment: true,
    emergency: 'Normal',
    presence: 'N',
    descriptions: [],
    images: [],
    services: [],
    TS: [],
    TS_SEL: [],
    TS_VAL: false,
    clientTimeslot: '',
    timeslotSource: 'default',
    origin: 'task',
    notes: '',
  });

  const [expandedPanel, setExpandedPanel] = useState<string | false>('base');
  const [searchingReservation, setSearchingReservation] = useState(false);

  // Load existing task if editing
  useEffect(() => {
    if (existingTask) {
      setFormData(existingTask);
    } else {
      // Reset form
      setFormData({
        name: '',
        type: '',
        subType: '',
        status: 'CREATED',
        priority: 'Normal',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startHour: '09:00',
        endHour: '17:00',
        duration: 2,
        staffId: null,
        staffName: null,
        reservationId: null,
        reservationNumber: null,
        guestName: null,
        arrivalDate: null,
        departureDate: null,
        listingId: mockListings[0].id,
        listingName: mockListings[0].name,
        roomTypeId: '',
        roomTypeName: '',
        price: 0,
        currency: 'EUR',
        paid: false,
        paymentMode: 'cash',
        requestPayment: true,
        emergency: 'Normal',
        presence: 'N',
        descriptions: [],
        images: [],
        services: [],
        TS: [],
        TS_SEL: [],
        TS_VAL: false,
        clientTimeslot: '',
        timeslotSource: 'default',
        origin: 'task',
        notes: '',
      });
    }
  }, [existingTask, open]);

  const handleChange = (field: keyof Task, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-update listing name when listing ID changes
    if (field === 'listingId') {
      const listing = mockListings.find((l) => l.id === value);
      if (listing) {
        setFormData((prev) => ({ ...prev, listingName: listing.name }));
      }
    }

    // Auto-update staff name when staff ID changes
    if (field === 'staffId') {
      const staff = mockStaff.find((s) => s.id === value);
      if (staff) {
        setFormData((prev) => ({ ...prev, staffName: staff.name }));
      }
    }

    // Auto-calculate duration when hours change
    if (field === 'startHour' || field === 'endHour') {
      const start = field === 'startHour' ? parseInt(value.split(':')[0]) : parseInt((formData.startHour || '09:00').split(':')[0]);
      const end = field === 'endHour' ? parseInt(value.split(':')[0]) : parseInt((formData.endHour || '17:00').split(':')[0]);
      setFormData((prev) => ({ ...prev, duration: Math.max(0, end - start) }));
    }
  };

  const handleSearchReservation = () => {
    setSearchingReservation(true);

    // MOCK search reservation
    setTimeout(() => {
      if (formData.reservationNumber) {
        // Found
        toast.success('Réservation trouvée !');
        setFormData((prev) => ({
          ...prev,
          reservationId: `res-${Date.now()}`,
          guestName: 'John Doe',
          arrivalDate: new Date().toISOString().split('T')[0],
          departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }));
      } else {
        toast.warning('Numéro de réservation requis');
      }
      setSearchingReservation(false);
    }, 500);
  };

  const handleAddDescription = () => {
    setFormData((prev) => ({
      ...prev,
      descriptions: [...(prev.descriptions || []), { description: '' }],
    }));
  };

  const handleRemoveDescription = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      descriptions: (prev.descriptions || []).filter((_, i) => i !== index),
    }));
  };

  const handleDescriptionChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      descriptions: (prev.descriptions || []).map((d, i) => (i === index ? { description: value } : d)),
    }));
  };

  const handleSave = () => {
    // Validation
    if (!formData.name || !formData.type || !formData.subType) {
      toast.error('Veuillez remplir les champs obligatoires (Nom, Type, Sous-type)');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Veuillez sélectionner les dates de début et fin');
      return;
    }

    if (!formData.listingId) {
      toast.error('Veuillez sélectionner un listing');
      return;
    }

    // Generate item number if new task
    const itemNumber = existingTask?.itemNumber || `TASK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    // Create complete task object
    const task: Task = {
      id: existingTask?.id || `task-${Date.now()}`,
      itemNumber,
      name: formData.name!,
      type: formData.type!,
      subType: formData.subType!,
      status: formData.status as Task['status'] || 'CREATED',
      priority: formData.priority as Task['priority'] || 'Normal',
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      startHour: formData.startHour || '09:00',
      endHour: formData.endHour || '17:00',
      duration: formData.duration || 2,
      staffId: formData.staffId || null,
      staffName: formData.staffName || null,
      assignmentStatus: formData.assignmentStatus,
      reservationId: formData.reservationId || null,
      reservationNumber: formData.reservationNumber || null,
      guestName: formData.guestName || null,
      arrivalDate: formData.arrivalDate || null,
      departureDate: formData.departureDate || null,
      listingId: formData.listingId!,
      listingName: formData.listingName || mockListings.find((l) => l.id === formData.listingId)?.name || '',
      roomTypeId: formData.roomTypeId,
      roomTypeName: formData.roomTypeName,
      price: formData.price || 0,
      currency: formData.currency || 'EUR',
      paid: formData.paid || false,
      paymentMode: formData.paymentMode || 'cash',
      requestPayment: formData.requestPayment !== undefined ? formData.requestPayment : true,
      emergency: formData.emergency as Task['emergency'] || 'Normal',
      presence: formData.presence as Task['presence'] || 'N',
      descriptions: formData.descriptions || [],
      images: formData.images || [],
      services: formData.services || [],
      TS: formData.TS || [],
      TS_SEL: formData.TS_SEL || [{ start: parseInt((formData.startHour || '09:00').split(':')[0]), end: parseInt((formData.endHour || '17:00').split(':')[0]) }],
      TS_VAL: formData.TS_VAL || false,
      clientTimeslot: formData.clientTimeslot,
      timeslotSource: formData.timeslotSource as Task['timeslotSource'] || 'default',
      origin: formData.origin as Task['origin'] || 'task',
      notes: formData.notes,
    };

    onSave(task);
    toast.success(existingTask ? 'Tâche modifiée avec succès !' : 'Tâche créée avec succès !');
    onClose();
  };

  const availableSubTypes = formData.type ? taskSubTypes[formData.type] || [] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          {existingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Section 1: BASE */}
        <Accordion expanded={expandedPanel === 'base'} onChange={() => setExpandedPanel(expandedPanel === 'base' ? false : 'base')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>1. Informations de base</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label="Nom de la tâche *"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                fullWidth
                required
              />
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>Type *</InputLabel>
                  <Select
                    value={formData.type}
                    label="Type *"
                    onChange={(e) => {
                      handleChange('type', e.target.value);
                      handleChange('subType', ''); // Reset subtype
                    }}
                  >
                    {taskTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required disabled={!formData.type}>
                  <InputLabel>Sous-type *</InputLabel>
                  <Select
                    value={formData.subType}
                    label="Sous-type *"
                    onChange={(e) => handleChange('subType', e.target.value)}
                  >
                    {availableSubTypes.map((subType) => (
                      <MenuItem key={subType.value} value={subType.value}>
                        {subType.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Priorité</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priorité"
                    onChange={(e) => handleChange('priority', e.target.value)}
                  >
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                    <MenuItem value="Critical">Critique</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Origine</InputLabel>
                  <Select
                    value={formData.origin}
                    label="Origine"
                    onChange={(e) => handleChange('origin', e.target.value)}
                  >
                    <MenuItem value="task">Tâche</MenuItem>
                    <MenuItem value="client">Client</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <FormControl fullWidth required>
                <InputLabel>Listing *</InputLabel>
                <Select
                  value={formData.listingId}
                  label="Listing *"
                  onChange={(e) => handleChange('listingId', e.target.value)}
                >
                  {mockListings.map((listing) => (
                    <MenuItem key={listing.id} value={listing.id}>
                      {listing.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 2: DATES */}
        <Accordion expanded={expandedPanel === 'dates'} onChange={() => setExpandedPanel(expandedPanel === 'dates' ? false : 'dates')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>2. Dates et horaires</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Date début *"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Date fin *"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Heure début"
                  type="time"
                  value={formData.startHour}
                  onChange={(e) => handleChange('startHour', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Heure fin"
                  type="time"
                  value={formData.endHour}
                  onChange={(e) => handleChange('endHour', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <TextField
                label="Durée (heures)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseFloat(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.5 } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.TS_VAL}
                    onChange={(e) => handleChange('TS_VAL', e.target.checked)}
                  />
                }
                label="Créneau validé"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 3: ASSIGNATION */}
        <Accordion expanded={expandedPanel === 'assignment'} onChange={() => setExpandedPanel(expandedPanel === 'assignment' ? false : 'assignment')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>3. Assignation</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Staff membre</InputLabel>
                <Select
                  value={formData.staffId || ''}
                  label="Staff membre"
                  onChange={(e) => handleChange('staffId', e.target.value || null)}
                >
                  <MenuItem value="">
                    <em>Non assigné</em>
                  </MenuItem>
                  {mockStaff.map((staff) => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.name} ({staff.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Présence requise</InputLabel>
                <Select
                  value={formData.presence}
                  label="Présence requise"
                  onChange={(e) => handleChange('presence', e.target.value)}
                >
                  <MenuItem value="N">Non</MenuItem>
                  <MenuItem value="Y">Oui</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 4: TARIFICATION */}
        <Accordion expanded={expandedPanel === 'pricing'} onChange={() => setExpandedPanel(expandedPanel === 'pricing' ? false : 'pricing')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>4. Tarification</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Prix"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                  fullWidth
                  InputProps={{ inputProps: { min: 0, step: 1 } }}
                />
                <FormControl fullWidth>
                  <InputLabel>Devise</InputLabel>
                  <Select
                    value={formData.currency}
                    label="Devise"
                    onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="MAD">MAD (DH)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.paid}
                    onChange={(e) => handleChange('paid', e.target.checked)}
                  />
                }
                label="Payé"
              />
              <FormControl fullWidth>
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={formData.paymentMode}
                  label="Mode de paiement"
                  onChange={(e) => handleChange('paymentMode', e.target.value)}
                >
                  <MenuItem value="cash">Espèces</MenuItem>
                  <MenuItem value="bank_transfer">Virement bancaire</MenuItem>
                  <MenuItem value="card">Carte</MenuItem>
                  <MenuItem value="included">Inclus</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requestPayment}
                    onChange={(e) => handleChange('requestPayment', e.target.checked)}
                  />
                }
                label="Demander paiement"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 5: DÉTAILS */}
        <Accordion expanded={expandedPanel === 'details'} onChange={() => setExpandedPanel(expandedPanel === 'details' ? false : 'details')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>5. Détails supplémentaires</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {/* Reservation search */}
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Lier à une réservation</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Numéro de réservation"
                    value={formData.reservationNumber || ''}
                    onChange={(e) => handleChange('reservationNumber', e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSearchReservation}
                    disabled={searchingReservation || !formData.reservationNumber}
                    startIcon={<SearchIcon />}
                  >
                    Rechercher
                  </Button>
                </Stack>
                {formData.reservationId && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: t.successTint, borderRadius: 1 }}>
                    <Typography sx={{ fontSize: 12, color: t.success }}>
                      ✓ Réservation trouvée : {formData.guestName} ({formData.arrivalDate} → {formData.departureDate})
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Room type */}
              <TextField
                label="Type de chambre"
                value={formData.roomTypeName || ''}
                onChange={(e) => handleChange('roomTypeName', e.target.value)}
                fullWidth
                size="small"
              />

              {/* Descriptions */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Descriptions</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddDescription}>
                    Ajouter
                  </Button>
                </Stack>
                {(formData.descriptions || []).map((desc, index) => (
                  <Stack key={index} direction="row" spacing={1} mb={1}>
                    <TextField
                      value={desc.description}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="Description..."
                    />
                    <IconButton size="small" onClick={() => handleRemoveDescription(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Box>

              {/* Notes */}
              <TextField
                label="Notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" sx={{ bgcolor: t.primary, '&:hover': { bgcolor: t.primaryDeep } }}>
          {existingTask ? 'Modifier' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
