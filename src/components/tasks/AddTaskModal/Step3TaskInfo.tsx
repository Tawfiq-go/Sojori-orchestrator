/**
 * Étape 3: Info Tâche & Validation
 */

import React, { useState, useEffect } from 'react';
import { Box, TextField, Grid, MenuItem, Autocomplete, Typography, Alert, Chip, Paper, Divider, CircularProgress, FormControlLabel, Checkbox, RadioGroup, Radio, FormControl, FormLabel, Button } from '@mui/material';
import { ManageSearch as SmartIcon } from '@mui/icons-material';
import { fetchStaffSimplified } from './addTaskApi';
import type { TaskFormData, TaskInfoData } from './types';
import { SmartStaffSelector } from './SmartStaffSelector';

interface Step3Props {
  formData: TaskFormData;
  onChange: (taskInfo: TaskInfoData) => void;
  ownerId?: string;
  error: string | null;
  useFulltaskApi?: boolean;
  listingId?: string;
}
interface Staff {
  _id: string;
  staffCode: string;
  username: string;
  whatsappPhone?: string;
  tasksThisWeek?: number;
}
export function Step3TaskInfo({
  formData,
  onChange,
  ownerId,
  error,
  useFulltaskApi = false,
  listingId,
}: Step3Props) {
  const {
    taskType,
    reservation,
    clientRequest,
    taskInfo,
    listing
  } = formData;
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>(
    useFulltaskApi ? 'manual' : 'auto',
  );
  const [smartSelectorOpen, setSmartSelectorOpen] = useState(false);

  const taskTypeForStaff = formData.fulltaskTypeId || taskType;

  // Fulltask : dates depuis la réservation si pas encore renseignées
  useEffect(() => {
    if (!useFulltaskApi || !reservation) return;
    if (taskInfo.startDate && taskInfo.endDate) return;
    const startRaw = reservation.checkIn || reservation.arrivalDate;
    const endRaw = reservation.checkOut || reservation.departureDate;
    if (!startRaw || !endRaw) return;
    const startDate = new Date(startRaw);
    const endDate = new Date(endRaw);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;
    const durationHours = Math.max(
      0.5,
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
    );
    onChange({
      ...taskInfo,
      startDate,
      endDate,
      duration: durationHours,
    });
  }, [useFulltaskApi, reservation?._id, reservation?.id]);

  // Load staff list
  useEffect(() => {
    const loadStaff = async () => {
      try {
        setLoadingStaff(true);
        if (useFulltaskApi) {
          const { listStaff } = await import('../../../services/fulltaskApi');
          const res = await listStaff(listingId ? { listingId: String(listingId) } : {});
          const rows = (res?.data || [])
            .filter((s: { taskTypes?: string[] }) => {
              if (!taskTypeForStaff || !s.taskTypes?.length) return true;
              return s.taskTypes.includes(String(taskTypeForStaff));
            })
            .map((s: { _id: string; name: string; phone?: string }) => ({
              _id: s._id,
              staffCode: s._id,
              username: s.name,
              whatsappPhone: s.phone,
            }));
          setStaffList(rows);
        } else {
          const staffData = await fetchStaffSimplified(ownerId);
          setStaffList(staffData);
        }
      } catch {
        setStaffList([]);
      } finally {
        setLoadingStaff(false);
      }
    };
    if (useFulltaskApi || ownerId) {
      void loadStaff();
    }
  }, [ownerId, useFulltaskApi, listingId, taskTypeForStaff]);

  // Auto-fill dates from clientRequest
  useEffect(() => {
    if (!clientRequest.date) {
      return;
    }
    const date = new Date(clientRequest.date);
    // ✅ Always update startDate when clientRequest changes (date or timeslot)
    const startDate = new Date(date);

    // Set time based on timeslot or type
    if (clientRequest.timeslot?.start !== undefined) {
      startDate.setHours(clientRequest.timeslot.start, 0, 0, 0);
    } else if (clientRequest.pickupTime) {
      const pickupDate = new Date(clientRequest.pickupTime);
      startDate.setHours(pickupDate.getHours(), pickupDate.getMinutes(), 0, 0);
    } else {
      startDate.setHours(9, 0, 0, 0); // Default 9h
    }
    // ✅ Always update endDate when clientRequest changes
    const endDate = new Date(date);
    if (clientRequest.timeslot?.end !== undefined) {
      endDate.setHours(clientRequest.timeslot.end, 0, 0, 0);
    } else {
      // Use local startDate variable (not taskInfo.startDate which is not updated yet)
      endDate.setHours(startDate.getHours() + taskInfo.duration, 0, 0, 0);
    }
    // ✅ Update both dates together
    onChange({
      ...taskInfo,
      startDate,
      endDate,
      duration: clientRequest.timeslot ? clientRequest.timeslot.end - clientRequest.timeslot.start : taskInfo.duration
    });
  }, [clientRequest.date, clientRequest.timeslot, clientRequest.pickupTime, taskInfo.duration]);

  // Auto-calculate duration when start/end change
  useEffect(() => {
    if (taskInfo.startDate && taskInfo.endDate) {
      const start = new Date(taskInfo.startDate);
      const end = new Date(taskInfo.endDate);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (durationHours > 0 && durationHours !== taskInfo.duration) {
        handleChange('duration', Math.max(0.5, durationHours));
      }
    }
  }, [taskInfo.startDate, taskInfo.endDate]);
  const handleChange = (field: keyof TaskInfoData, value: any) => {
    onChange({
      ...taskInfo,
      [field]: value
    });
  };
  const handleAssignmentModeChange = (mode: 'auto' | 'manual') => {
    setAssignmentMode(mode);
    if (mode === 'auto') {
      // Mode automatique : effacer staffId/staffCode, mettre un flag spécial
      handleChange('staffId', undefined);
      handleChange('staffCode', undefined);
      handleChange('initialStatus', 'AUTO_ASSIGN');
    } else {
      // Mode manuel : effacer AUTO_ASSIGN
      if (taskInfo.initialStatus === 'AUTO_ASSIGN') {
        handleChange('initialStatus', undefined);
      }
    }
  };
  const handleStaffChange = (staff: Staff | null) => {
    if (staff) {
      handleChange('staffId', staff._id);
      handleChange('staffCode', staff.staffCode);
      if (!taskInfo.initialStatus || taskInfo.initialStatus === 'AUTO_ASSIGN') {
        handleChange('initialStatus', 'ASSIGNED');
      }
    } else {
      handleChange('staffId', undefined);
      handleChange('staffCode', undefined);
      if (assignmentMode === 'manual') {
        handleChange('initialStatus', undefined);
      }
    }
  };
  const handleSmartStaffSelect = (staff: any) => {
    handleChange('staffId', staff._id);
    handleChange('staffCode', staff.staffCode);
    if (!taskInfo.initialStatus || taskInfo.initialStatus === 'AUTO_ASSIGN') {
      handleChange('initialStatus', 'ASSIGNED');
    }
    // Auto-switch to manual mode
    setAssignmentMode('manual');
  };
  const selectedStaff = Array.isArray(staffList) ? staffList.find(s => s._id === taskInfo.staffId) : undefined;
  return <Box sx={{
    mt: 2
  }}>
      <Typography variant="h6" sx={{
      mb: 2
    }}>
        Informations de la Tâche
      </Typography>

      {error && <Alert severity="error" sx={{
      mb: 2
    }}>
          {error}
        </Alert>}

      <Grid container spacing={2}>
        {/* Dates d'exécution */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{
          mb: 1,
          fontWeight: 600
        }}>
            📅 Dates d&apos;Exécution
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField label="Début" type="datetime-local" value={taskInfo.startDate ? new Date(taskInfo.startDate).toISOString().slice(0, 16) : ''} onChange={e => handleChange('startDate', new Date(e.target.value))} fullWidth InputLabelProps={{
          shrink: true
        }} required />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField label="Fin" type="datetime-local" value={taskInfo.endDate ? new Date(taskInfo.endDate).toISOString().slice(0, 16) : ''} onChange={e => handleChange('endDate', new Date(e.target.value))} fullWidth InputLabelProps={{
          shrink: true
        }} required inputProps={{
          min: taskInfo.startDate ? new Date(taskInfo.startDate).toISOString().slice(0, 16) : undefined
        }} />
        </Grid>

        <Grid item xs={12}>
          <TextField label="Durée (heures)" type="number" value={taskInfo.duration} onChange={e => handleChange('duration', parseFloat(e.target.value) || 0.5)} fullWidth inputProps={{
          min: 0.5,
          step: 0.5
        }} helperText={taskInfo.startDate && taskInfo.endDate ? `Auto-calculé: ${taskInfo.duration}h` : 'Durée estimée de la tâche'} />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{
          my: 1
        }} />
        </Grid>

        {/* Staff Assignment */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{
          mb: 1,
          fontWeight: 600
        }}>
            👤 Assignation Staff
          </Typography>
        </Grid>

        {!useFulltaskApi && (
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Mode d&apos;assignation
              </FormLabel>
              <RadioGroup
                row
                value={assignmentMode}
                onChange={(e) => handleAssignmentModeChange(e.target.value as 'auto' | 'manual')}
              >
                <FormControlLabel
                  value="auto"
                  control={<Radio />}
                  label="🤖 Automatique (système choisit le staff disponible)"
                />
                <FormControlLabel
                  value="manual"
                  control={<Radio />}
                  label="👤 Manuel (assigner à un staff précis)"
                />
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {(useFulltaskApi || assignmentMode === 'manual') && (
          <>
            <Grid item xs={12}>
              {useFulltaskApi ? (
                <Autocomplete
                  options={Array.isArray(staffList) ? staffList : []}
                  loading={loadingStaff}
                  value={selectedStaff || null}
                  onChange={(_, newValue) => handleStaffChange(newValue)}
                  getOptionLabel={(option) => option.username}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Staff (optionnel)"
                      placeholder="Filtré par type de tâche et logement"
                      helperText={
                        taskInfo.staffId
                          ? 'Assigné à la création'
                          : 'Laisser vide pour assigner plus tard'
                      }
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={Array.isArray(staffList) ? staffList : []}
                    loading={loadingStaff}
                    value={selectedStaff || null}
                    onChange={(_, newValue) => handleStaffChange(newValue)}
                    getOptionLabel={(option) => `${option.username}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Staff assigné"
                        placeholder="Rechercher un staff..."
                        helperText={
                          taskInfo.staffId
                            ? '✅ La tâche sera assignée au staff sélectionné'
                            : 'Sélectionnez un staff pour assignation manuelle'
                        }
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => setSmartSelectorOpen(true)}
                    startIcon={<SmartIcon />}
                    sx={{
                      height: '56px',
                      minWidth: '180px',
                      borderColor: '#E6B022',
                      color: '#E6B022',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#B8881A', bgcolor: '#FFF3E0' },
                    }}
                  >
                    Filtres Intelligents
                  </Button>
                </Box>
              )}
            </Grid>

            {!useFulltaskApi && taskInfo.staffId && (
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Status initial"
                  value={taskInfo.initialStatus || 'ASSIGNED'}
                  onChange={(e) => handleChange('initialStatus', e.target.value)}
                  fullWidth
                  helperText="Définir le statut initial de la tâche"
                >
                  <MenuItem value="ASSIGNED">🟡 ASSIGNED - En attente d&apos;acceptation</MenuItem>
                  <MenuItem value="ACCEPTED">🟢 ACCEPTED - Déjà accepté par le staff</MenuItem>
                </TextField>
              </Grid>
            )}

            {!useFulltaskApi && (
              <SmartStaffSelector
                open={smartSelectorOpen}
                onClose={() => setSmartSelectorOpen(false)}
                onSelect={handleSmartStaffSelect}
                taskData={{
                  listingId: listing?._id || listing?.id,
                  listingName: listing?.name || listing?.title,
                  taskType: taskType || undefined,
                  taskCategory: taskType || undefined,
                  ownerId,
                  startDate: taskInfo.startDate ? new Date(taskInfo.startDate) : undefined,
                  startTime: taskInfo.startDate
                    ? new Date(taskInfo.startDate).toTimeString().substring(0, 5)
                    : undefined,
                  endTime: taskInfo.endDate
                    ? new Date(taskInfo.endDate).toTimeString().substring(0, 5)
                    : undefined,
                }}
              />
            )}
          </>
        )}

        {!useFulltaskApi && assignmentMode === 'auto' && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 1 }}>
              🤖 Le système assignera automatiquement cette tâche au staff disponible avec la charge
              de travail la plus faible
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{
          my: 1
        }} />
        </Grid>

        {/* Task Details */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{
          mb: 1,
          fontWeight: 600
        }}>
            📝 Détails
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField select label="Urgence" value={taskInfo.emergency} onChange={e => handleChange('emergency', e.target.value)} fullWidth>
            <MenuItem value="Normal">🟢 Normale</MenuItem>
            <MenuItem value="Urgent">🟠 Urgente</MenuItem>
            <MenuItem value="Critical">🔴 Critique</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField label="Tags (séparés par virgule)" value={taskInfo.tags.join(', ')} onChange={e => {
          const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
          handleChange('tags', tags);
        }} fullWidth placeholder="urgent, vip, special..." />
        </Grid>

        <Grid item xs={12}>
          <TextField label="Notes / Commentaires" value={taskInfo.comment} onChange={e => handleChange('comment', e.target.value)} multiline rows={3} fullWidth placeholder="Détails supplémentaires sur la tâche..." />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{
          my: 1
        }} />
        </Grid>

        {/* Payment */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{
          mb: 1,
          fontWeight: 600
        }}>
            💰 Paiement
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControlLabel control={<Checkbox checked={taskInfo.paid} onChange={e => handleChange('paid', e.target.checked)} />} label="Tâche payante" />
        </Grid>

        {taskInfo.paid && <>
            <Grid item xs={12} md={4}>
              <TextField label="Prix (€)" type="number" value={taskInfo.price} onChange={e => handleChange('price', parseFloat(e.target.value) || 0)} fullWidth inputProps={{
            min: 0,
            step: 10
          }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField select label="Mode de paiement" value={taskInfo.paymentMode} onChange={e => handleChange('paymentMode', e.target.value)} fullWidth>
                <MenuItem value="">Non spécifié</MenuItem>
                <MenuItem value="cash">💵 Espèces</MenuItem>
                <MenuItem value="card">💳 Carte</MenuItem>
                <MenuItem value="transfer">🏦 Virement</MenuItem>
                <MenuItem value="online">🌐 En ligne</MenuItem>
              </TextField>
            </Grid>
          </>}
      </Grid>

      <Divider sx={{
      my: 3
    }} />

      {/* Summary */}
      <Paper elevation={2} sx={{
      p: 2,
      bgcolor: '#f5f5f5'
    }}>
        <Typography variant="subtitle1" sx={{
        mb: 2,
        fontWeight: 600
      }}>
          📊 Résumé Complet
        </Typography>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Type:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              {taskType}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Réservation:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              {reservation?.number || reservation?.reservationNumber} - {reservation?.guestName}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Logement:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              {formData.listing?.name || formData.listing?.title}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Exécution:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              {taskInfo.startDate && new Date(taskInfo.startDate).toLocaleString('fr-FR')}
              {' → '}
              {taskInfo.endDate && new Date(taskInfo.endDate).toLocaleString('fr-FR')}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Assignation:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            {assignmentMode === 'auto' ? <Chip label="🤖 Automatique" color="primary" size="small" /> : taskInfo.staffId || taskInfo.staffCode ? <Typography variant="body2" fontWeight="bold">
                {staffList.find(s => s._id === taskInfo.staffId || s.staffCode === taskInfo.staffCode)?.username || taskInfo.staffCode || 'Staff sélectionné'}
              </Typography> : <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Aucun staff sélectionné
              </Typography>}
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Urgence:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Chip label={taskInfo.emergency} size="small" />
          </Grid>

          {taskInfo.paid && <>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Prix:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  {taskInfo.price}€ ({taskInfo.paymentMode || 'non spécifié'})
                </Typography>
              </Grid>
            </>}
        </Grid>
      </Paper>

      <Alert severity="info" sx={{
      mt: 2
    }}>
        ✅ Vérifiez les informations ci-dessus avant de créer la tâche
      </Alert>
    </Box>;
}
