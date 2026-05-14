import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Grid,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  DateRange as DateRangeIcon,
  CalendarToday as CalendarTodayIcon,
  EventBusy as CalendarOffIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';
import { taskTypes, taskSubTypes, mockListings, mockStaff, type Task } from '../../data/mockTasks';

// Helper pour formater les dates
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isSameOrAfter = (date1: string, date2: string): boolean => {
  return new Date(date1) >= new Date(date2);
};

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  existingTask?: Task | null;
}

/**
 * CreateTaskModal - Modal avec Stepper 4 étapes pour créer/éditer une task
 *
 * Basé sur: sojori-dashboard/src/features/tasks/components/Calendar/AddTask.jsx
 *
 * Stepper:
 * - Step 0: Info de base (type, dates, prix, staff)
 * - Step 1: Notes & Services
 * - Step 2: Détails additionnels (réservation, durée, emergency)
 * - Step 3: Images
 */
export function CreateTaskModal({ open, onClose, onSave, existingTask }: CreateTaskModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [endDateClicked, setEndDateClicked] = useState(false);

  const steps = ['Info de base', 'Notes & Services', 'Détails additionnels', 'Images'];

  // Form state
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    type: '',
    subType: '',
    status: 'CREATED',
    priority: 'Normal',
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date()),
    startHour: '09:00',
    endHour: '17:00',
    duration: 2,
    staffId: '',
    staffName: '',
    reservationId: '',
    reservationNumber: '',
    guestName: '',
    arrivalDate: '',
    departureDate: '',
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
    mode: 'Auto',
    origin: 'task',
    notes: '',
  });

  // Load existing task if editing
  useEffect(() => {
    if (existingTask) {
      setFormData(existingTask);
      if (existingTask.endDate && existingTask.endDate !== existingTask.startDate) {
        setShowEndDate(true);
        setEndDateClicked(true);
      }
    } else {
      // Reset form
      setFormData({
        name: '',
        type: '',
        subType: '',
        status: 'CREATED',
        priority: 'Normal',
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date()),
        startHour: '09:00',
        endHour: '17:00',
        duration: 2,
        staffId: '',
        staffName: '',
        reservationId: '',
        reservationNumber: '',
        guestName: '',
        arrivalDate: '',
        departureDate: '',
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
        mode: 'Auto',
        origin: 'task',
        notes: '',
      });
      setShowEndDate(false);
      setEndDateClicked(false);
    }
    setActiveStep(0);
  }, [existingTask, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: string) => {
    handleChange('type', type);
    handleChange('subType', ''); // Reset subType when type changes
    handleChange('name', '');
  };

  const handleSubTypeChange = (subType: string) => {
    handleChange('subType', subType);

    // Auto-set name based on subType
    const taskType = taskTypes.find(t => t.value === formData.type);
    if (taskType) {
      const subTypeObj = taskType.subTypes.find(st => st.value === subType);
      if (subTypeObj) {
        handleChange('name', subTypeObj.label);
      }
    }
  };

  const handleStartDateChange = (date: string) => {
    const currentDate = formatDate(new Date());

    if (isSameOrAfter(date, currentDate)) {
      handleChange('startDate', date);
      if (!showEndDate) {
        handleChange('endDate', date);
      }
    } else {
      handleChange('startDate', currentDate);
      if (!showEndDate) {
        handleChange('endDate', currentDate);
      }
    }
  };

  const toggleEndDate = () => {
    setShowEndDate(!showEndDate);
    setEndDateClicked(!endDateClicked);
    if (!showEndDate) {
      handleChange('endDate', formData.startDate);
    }
  };

  const handleReservationSearch = async () => {
    if (!formData.reservationNumber) {
      toast.warning('Veuillez entrer un numéro de réservation');
      return;
    }

    setIsSearching(true);

    try {
      // TODO: Remplacer par vraie API call
      // const reservation = await getReservationByNumber(formData.reservationNumber);

      // MOCK: Simuler recherche
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // MOCK: Simuler réservation trouvée
      const mockReservation = {
        _id: 'res-123',
        guestName: 'Jean Dupont',
        arrivalDate: '2026-05-20',
        departureDate: '2026-05-25',
      };

      handleChange('reservationId', mockReservation._id);
      handleChange('guestName', mockReservation.guestName);
      handleChange('arrivalDate', mockReservation.arrivalDate);
      handleChange('departureDate', mockReservation.departureDate);

      toast.success('Réservation trouvée et détails mis à jour.');
    } catch (error) {
      toast.error('Erreur lors de la recherche de la réservation.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddDescription = () => {
    const newDescriptions = [...(formData.descriptions || []), { description: '' }];
    handleChange('descriptions', newDescriptions);
  };

  const handleUpdateDescription = (index: number, value: string) => {
    const newDescriptions = [...(formData.descriptions || [])];
    newDescriptions[index] = { description: value };
    handleChange('descriptions', newDescriptions);
  };

  const handleRemoveDescription = (index: number) => {
    const newDescriptions = (formData.descriptions || []).filter((_, i) => i !== index);
    handleChange('descriptions', newDescriptions);
  };

  const handleSave = async () => {
    // Validation basique
    if (!formData.type || !formData.subType || !formData.startDate || !formData.endDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const taskData: Task = {
        id: existingTask?.id || `task-${Date.now()}`,
        itemNumber: existingTask?.itemNumber || `TASK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        name: formData.name || '',
        type: formData.type || '',
        subType: formData.subType || '',
        status: existingTask ? (formData.status || 'CREATED') : 'CREATED',
        priority: formData.priority || 'Normal',
        startDate: formData.startDate || '',
        endDate: formData.endDate || '',
        startHour: formData.startHour || '09:00',
        endHour: formData.endHour || '17:00',
        duration: formData.duration || 2,
        staffId: formData.staffId || null,
        staffName: formData.staffName || null,
        reservationId: formData.reservationId || null,
        reservationNumber: formData.reservationNumber || null,
        guestName: formData.guestName || null,
        arrivalDate: formData.arrivalDate || null,
        departureDate: formData.departureDate || null,
        listingId: formData.listingId || '',
        listingName: formData.listingName || '',
        roomTypeId: formData.roomTypeId || '',
        roomTypeName: formData.roomTypeName || '',
        price: formData.price || 0,
        currency: formData.currency || 'EUR',
        paid: formData.paid || false,
        paymentMode: formData.paymentMode || 'cash',
        requestPayment: formData.requestPayment !== undefined ? formData.requestPayment : true,
        emergency: formData.emergency || 'Normal',
        presence: formData.presence || 'N',
        descriptions: formData.descriptions || [],
        images: formData.images || [],
        services: formData.services || [],
        TS: formData.TS || [],
        TS_SEL: formData.TS_SEL || [],
        TS_VAL: formData.TS_VAL || false,
        mode: formData.mode || 'Auto',
        origin: formData.origin || 'task',
        notes: formData.notes || '',
        createdAt: existingTask?.createdAt || new Date().toISOString(),
        clientTimeslot: formData.clientTimeslot || '',
        timeslotSource: formData.timeslotSource || 'default',
      };

      onSave(taskData);
      toast.success(existingTask ? 'Tâche mise à jour avec succès' : 'Tâche créée avec succès');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde de la tâche');
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Info de base
        return (
          <Grid container spacing={2}>
            {/* Type */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  label="Type"
                >
                  {taskTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* SubType */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small" required disabled={!formData.type}>
                <InputLabel>Sous-type</InputLabel>
                <Select
                  value={formData.subType}
                  onChange={(e) => handleSubTypeChange(e.target.value)}
                  label="Sous-type"
                >
                  {formData.type &&
                    taskTypes
                      .find((t) => t.value === formData.type)
                      ?.subTypes.map((subType) => (
                        <MenuItem key={subType.value} value={subType.value}>
                          {subType.label}
                        </MenuItem>
                      ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Mode */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode</InputLabel>
                <Select
                  value={formData.mode}
                  onChange={(e) => handleChange('mode', e.target.value)}
                  label="Mode"
                >
                  <MenuItem value="Auto">Auto</MenuItem>
                  <MenuItem value="Manu">Manuel</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Start Date + Toggle End Date */}
            <Grid item xs={12} sm={showEndDate ? 6 : 12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date de début"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: formatDate(new Date()) }}
                  required
                />
                <IconButton
                  size="small"
                  onClick={toggleEndDate}
                  sx={{
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    bgcolor: endDateClicked ? t.primaryTint : 'transparent',
                    '&:hover': { bgcolor: endDateClicked ? t.primaryTint : t.bg2 },
                  }}
                  title="Date de fin"
                >
                  {showEndDate ? <CalendarTodayIcon fontSize="small" /> : <CalendarOffIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Grid>

            {/* End Date (si visible) */}
            {showEndDate && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date de fin"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: formData.startDate }}
                  required
                />
              </Grid>
            )}

            {/* Start Hour */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Heure de début</InputLabel>
                <Select
                  value={formData.startHour}
                  onChange={(e) => handleChange('startHour', e.target.value)}
                  label="Heure de début"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <MenuItem key={i} value={`${String(i).padStart(2, '0')}:00`}>
                      {String(i).padStart(2, '0')}:00
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* End Hour */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Heure de fin</InputLabel>
                <Select
                  value={formData.endHour}
                  onChange={(e) => handleChange('endHour', e.target.value)}
                  label="Heure de fin"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <MenuItem key={i} value={`${String(i).padStart(2, '0')}:00`}>
                      {String(i).padStart(2, '0')}:00
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Price */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Prix"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', Number(e.target.value))}
                required
              />
            </Grid>

            {/* Payment Mode */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={formData.paymentMode}
                  onChange={(e) => handleChange('paymentMode', e.target.value)}
                  label="Mode de paiement"
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Carte</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Listing */}
            <Grid item xs={12} sm={existingTask ? 4 : 12}>
              <FormControl fullWidth size="small">
                <InputLabel>Propriété</InputLabel>
                <Select
                  value={formData.listingId}
                  onChange={(e) => {
                    const listing = mockListings.find((l) => l.id === e.target.value);
                    handleChange('listingId', e.target.value);
                    handleChange('listingName', listing?.name || '');
                  }}
                  label="Propriété"
                >
                  {mockListings.map((listing) => (
                    <MenuItem key={listing.id} value={listing.id}>
                      {listing.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Si existingTask, montrer Status + Assignment Status + Staff */}
            {existingTask && (
              <>
                {/* Status */}
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      label="Statut"
                    >
                      <MenuItem value="CREATED">Créée</MenuItem>
                      <MenuItem value="ASSIGNED">Assignée</MenuItem>
                      <MenuItem value="ACCEPTED">Acceptée</MenuItem>
                      <MenuItem value="IN_PROGRESS">En cours</MenuItem>
                      <MenuItem value="COMPLETED">Complétée</MenuItem>
                      <MenuItem value="CANCELLED_ADMIN">Annulée admin</MenuItem>
                      <MenuItem value="CANCELLED_CUSTOMER">Annulée client</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Staff */}
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Staff</InputLabel>
                    <Select
                      value={formData.staffId}
                      onChange={(e) => {
                        const staff = mockStaff.find((s) => s.id === e.target.value);
                        handleChange('staffId', e.target.value);
                        handleChange('staffName', staff?.name || '');
                      }}
                      label="Staff"
                    >
                      {mockStaff.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* TS_VAL Checkbox */}
                <Grid item xs={12} sm={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.TS_VAL || false}
                        onChange={(e) => handleChange('TS_VAL', e.target.checked)}
                      />
                    }
                    label="Confirmé"
                  />
                </Grid>
              </>
            )}

            {/* Paid Checkbox */}
            <Grid item xs={12} sm={existingTask ? 12 : 4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.paid || false}
                    onChange={(e) => handleChange('paid', e.target.checked)}
                  />
                }
                label="Payé"
              />
            </Grid>
          </Grid>
        );

      case 1: // Notes & Services
        return (
          <Grid container spacing={2}>
            {/* Descriptions */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Descriptions
              </Typography>
              {(formData.descriptions || []).length === 0 ? (
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddDescription}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Ajouter une description
                </Button>
              ) : (
                (formData.descriptions || []).map((desc, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      value={desc.description}
                      onChange={(e) => handleUpdateDescription(index, e.target.value)}
                      placeholder="Entrez une description..."
                    />
                    <IconButton onClick={handleAddDescription} size="small">
                      <AddIcon />
                    </IconButton>
                    {(formData.descriptions || []).length > 1 && (
                      <IconButton onClick={() => handleRemoveDescription(index)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                ))
              )}
            </Grid>

            {/* Services (TODO: Implement services selector) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: t.text3 }}>
                Services (à implémenter)
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text4, fontStyle: 'italic' }}>
                La sélection de services sera disponible prochainement.
              </Typography>
            </Grid>
          </Grid>
        );

      case 2: // Détails additionnels
        return (
          <Grid container spacing={2}>
            {/* Recherche Réservation */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Numéro de réservation"
                  value={formData.reservationNumber}
                  onChange={(e) => handleChange('reservationNumber', e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={handleReservationSearch}
                  disabled={isSearching}
                  startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                  sx={{ minWidth: 120 }}
                >
                  {isSearching ? 'Recherche...' : 'Rechercher'}
                </Button>
              </Box>
            </Grid>

            {/* Réservation Details (si trouvée) */}
            {formData.guestName && formData.departureDate && formData.arrivalDate && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: t.bg2,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: t.primary, mb: 1 }}>
                    Détails de la réservation
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PersonIcon fontSize="small" sx={{ color: t.text3 }} />
                    <Typography variant="body2">{formData.guestName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRangeIcon fontSize="small" sx={{ color: t.text3 }} />
                    <Typography variant="body2">
                      {formatDateDisplay(formData.arrivalDate)} -{' '}
                      {formatDateDisplay(formData.departureDate)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Duration */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Durée (heures)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', Number(e.target.value))}
              />
            </Grid>

            {/* Emergency */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={formData.emergency}
                  onChange={(e) => handleChange('emergency', e.target.value)}
                  label="Priorité"
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                  <MenuItem value="Critical">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Presence */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Présence</InputLabel>
                <Select
                  value={formData.presence}
                  onChange={(e) => handleChange('presence', e.target.value)}
                  label="Présence"
                >
                  <MenuItem value="P">Présent (P)</MenuItem>
                  <MenuItem value="N">Non présent (N)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 3: // Images
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Images
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text4, fontStyle: 'italic', mb: 2 }}>
                L'upload d'images sera disponible prochainement.
              </Typography>

              {/* TODO: Implement ImageUpload component */}
              <Box
                sx={{
                  border: `2px dashed ${t.border}`,
                  borderRadius: '8px',
                  p: 4,
                  textAlign: 'center',
                  bgcolor: t.bg2,
                }}
              >
                <Typography sx={{ fontSize: 13, color: t.text3 }}>
                  Cliquez ou glissez des images ici
                </Typography>
              </Box>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: t.bg1,
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: t.text }}>
          {existingTask ? `Modifier: ${existingTask.name || '_____'}` : 'Créer une tâche'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step
              key={label}
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {renderStepContent()}
      </DialogContent>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Button
          onClick={() => setActiveStep((prev) => prev - 1)}
          disabled={activeStep === 0}
          sx={btnGhostSx}
        >
          Précédent
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep < steps.length - 1 ? (
            <Button onClick={() => setActiveStep((prev) => prev + 1)} sx={btnPrimarySx}>
              Suivant
            </Button>
          ) : (
            <Button onClick={handleSave} sx={btnPrimarySx}>
              {existingTask ? 'Mettre à jour' : 'Créer'}
            </Button>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
