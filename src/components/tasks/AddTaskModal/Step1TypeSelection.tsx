/**
 * Étape 1: Sélection Type → Listing → Réservation
 */

import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField, Typography, Divider, Paper, Chip, Alert, CircularProgress } from '@mui/material';
import { FlightLand, FlightTakeoff, CleaningServices, Assignment, Support, DirectionsCar, ShoppingCart, Star } from '@mui/icons-material';
import {
  fetchCurrentReservation,
  fetchListingClientServices,
  fetchTaskListings,
  fetchTaskReservations,
} from './addTaskApi';
import type {
  TaskFormData,
  TaskType,
  Listing,
  Reservation,
  ListingClientServices,
} from './types';

// Client task types that require listing-specific service config
const CLIENT_TASK_TYPES: TaskType[] = ['TRANSPORT', 'GROCERIES', 'CUSTOM', 'SUPPORT'];
const TASK_TYPES = [{
  value: 'ARRIVAL' as TaskType,
  label: 'Arrivée',
  icon: <FlightLand />,
  color: '#4CAF50'
}, {
  value: 'DEPARTURE' as TaskType,
  label: 'Départ',
  icon: <FlightTakeoff />,
  color: '#FF9800'
}, {
  value: 'CLEANING' as TaskType,
  label: 'Ménage',
  icon: <CleaningServices />,
  color: '#2196F3'
}, {
  value: 'REGISTRATION' as TaskType,
  label: 'Enregistrement',
  icon: <Assignment />,
  color: '#9C27B0'
}, {
  value: 'SUPPORT' as TaskType,
  label: 'Support',
  icon: <Support />,
  color: '#F44336'
}, {
  value: 'TRANSPORT' as TaskType,
  label: 'Transport',
  icon: <DirectionsCar />,
  color: '#607D8B'
}, {
  value: 'GROCERIES' as TaskType,
  label: 'Courses',
  icon: <ShoppingCart />,
  color: '#FF5722'
}, {
  value: 'CUSTOM' as TaskType,
  label: 'Personnalisé',
  icon: <Star />,
  color: '#FFC107'
}];
interface Step1Props {
  formData: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  ownerId?: string;
  /** Platform admin: load listings/reservations without requiring ownerId (JWT role on server). */
  isAdminUser?: boolean;
}
export function Step1TypeSelection({
  formData,
  onChange,
  ownerId,
  isAdminUser = false
}: Step1Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [loadingCurrentReservation, setLoadingCurrentReservation] = useState(false);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loadingAllReservations, setLoadingAllReservations] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  // Charger listings quand type sélectionné (owners need ownerId; admins rely on JWT-only scope)
  useEffect(() => {
    if (!formData.taskType) return;
    if (!isAdminUser && !ownerId) return;
    const loadListings = async () => {
      try {
        setLoadingListings(true);
        const data = await fetchTaskListings(ownerId);
        setListings(data);
      } catch {
        setListings([]);
      } finally {
        setLoadingListings(false);
      }
    };
    void loadListings();
  }, [formData.taskType, ownerId, isAdminUser]);

  // Charger réservation en cours quand listing sélectionné
  useEffect(() => {
    if (!formData.listing) {
      setCurrentReservation(null);
      return;
    }
    const loadCurrent = async () => {
      try {
        setLoadingCurrentReservation(true);
        const listingId = formData.listing?._id || formData.listing?.id;
        if (!listingId) return;
        const current = await fetchCurrentReservation(listingId);
        setCurrentReservation(current);

        // Auto-sélectionner si disponible
        if (current) {
          onChange({
            reservation: current
          });
        } else {
          onChange({
            reservation: null
          });
        }
      } catch (error) {
        setCurrentReservation(null);
      } finally {
        setLoadingCurrentReservation(false);
      }
    };
    void loadCurrent();
  }, [formData.listing]);

  // Charger les réservations pour le listing sélectionné
  useEffect(() => {
    if (!formData.listing) {
      setAllReservations([]);
      return;
    }
    const loadReservations = async () => {
      try {
        setLoadingAllReservations(true);
        const listingId = formData.listing._id || formData.listing.id;
        const filtered = await fetchTaskReservations(ownerId, listingId);
        setAllReservations(filtered);
      } catch {
        setAllReservations([]);
      } finally {
        setLoadingAllReservations(false);
      }
    };
    void loadReservations();
  }, [formData.listing, ownerId, isAdminUser]);

  // Load listing client services when listing + client-type task is selected
  useEffect(() => {
    const isClientType = formData.taskType && CLIENT_TASK_TYPES.includes(formData.taskType);
    const listingId = formData.listing?._id || formData.listing?.id;
    if (!isClientType || !listingId) {
      if (!isClientType) onChange({
        listingServices: null
      });
      return;
    }
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const services = await fetchListingClientServices(listingId);
        onChange({ listingServices: services });
      } catch {
        onChange({ listingServices: null });
      } finally {
        setLoadingServices(false);
      }
    };
    void loadServices();
  }, [formData.listing, formData.taskType]);
  const handleTypeChange = (type: TaskType) => {
    onChange({
      taskType: type,
      listing: null,
      reservation: null,
      listingServices: null
    });
  };
  const handleListingChange = (listing: Listing | null) => {
    onChange({
      listing,
      reservation: null,
      listingServices: null // Will be reloaded by the effect above
    });
  };
  const handleReservationSearch = (reservation: Reservation | null) => {
    if (!reservation) {
      onChange({
        reservation: null
      });
      return;
    }
    onChange({
      reservation
    });

    // Si réservation d'un autre listing, update listing aussi
    const resListingId = reservation.listingId || reservation.sojoriId;
    if (formData.listing && formData.listing._id !== resListingId && formData.listing.id !== resListingId) {
      const newListing = listings.find(l => l._id === resListingId || l.id === resListingId);
      if (newListing) {
        onChange({
          listing: newListing,
          reservation
        });
      }
    }
  };
  const selectedType = TASK_TYPES.find(t => t.value === formData.taskType);
  const canProceed = formData.taskType && formData.listing && formData.reservation;
  return <Box sx={{
    mt: 2
  }}>
      {/* 1️⃣ Type de Tâche */}
      <FormControl fullWidth sx={{
      mb: 3
    }}>
        <InputLabel>1️⃣ Type de Tâche *</InputLabel>
        <Select value={formData.taskType || ''} onChange={e => handleTypeChange(e.target.value as TaskType)} label="1️⃣ Type de Tâche *">
          {TASK_TYPES.map(type => <MenuItem key={type.value} value={type.value}>
              <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
                {type.icon}
                <Typography>{type.label}</Typography>
              </Box>
            </MenuItem>)}
        </Select>
      </FormControl>

      {formData.taskType && <Divider sx={{
      my: 3
    }} />}

      {/* 2️⃣ Logement */}
      {formData.taskType && <Autocomplete options={listings} value={formData.listing} onChange={(_, newValue) => handleListingChange(newValue)} getOptionLabel={option => option.name || option.title || 'Sans nom'} loading={loadingListings} renderInput={params => <TextField {...params} label="2️⃣ Logement *" placeholder="Rechercher un logement..." helperText={isAdminUser ? '💡 Tous les logements (admin)' : '💡 Liste filtrée par owner (vos logements)'} InputProps={{
      ...params.InputProps,
      endAdornment: <>
                    {loadingListings && <CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </>
    }} />} renderOption={(props, option) => <li {...props} key={option._id || option.id}>
              <Box>
                <Typography variant="body1">🏠 {option.name || option.title}</Typography>
                {option.address && <Typography variant="caption" color="text.secondary">
                    {option.address}
                  </Typography>}
              </Box>
            </li>} isOptionEqualToValue={(option, value) => option._id === value._id || option.id === value.id} sx={{
      mb: 3
    }} />}

      {formData.listing && <Divider sx={{
      my: 3
    }} />}

      {/* 3️⃣ Réservation */}
      {formData.listing && <>
          <Typography variant="subtitle2" sx={{
        mb: 2
      }}>
            3️⃣ Réservation *
          </Typography>

          {/* Réservation en cours (auto-selected) */}
          {loadingCurrentReservation ? <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 2
      }}>
              <CircularProgress />
            </Box> : currentReservation ? <Paper elevation={formData.reservation?._id === currentReservation._id || formData.reservation?.id === currentReservation._id ? 3 : 1} sx={{
        p: 2,
        mb: 2,
        border: formData.reservation?._id === currentReservation._id || formData.reservation?.id === currentReservation._id ? '2px solid #4CAF50' : '1px solid #E0E0E0',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: '#f5f5f5'
        }
      }} onClick={() => onChange({
        reservation: currentReservation
      })}>
              <Typography variant="caption" color="text.secondary" sx={{
          mb: 1,
          display: 'block'
        }}>
                📌 Réservation en cours (sélectionnée par défaut)
              </Typography>
              <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1
        }}>
                <Chip label={currentReservation.number || currentReservation.reservationNumber} color="primary" size="small" />
                <Typography variant="body1" fontWeight="bold">
                  {currentReservation.guestName}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                📅{' '}
                {new Date(currentReservation.checkIn || currentReservation.arrivalDate || '').toLocaleDateString()} -{' '}
                {new Date(currentReservation.checkOut || currentReservation.departureDate || '').toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                👥 {currentReservation.adults} adultes
                {currentReservation.children > 0 ? `, ${currentReservation.children} enfant(s)` : ''}
              </Typography>
            </Paper> : <Alert severity="info" sx={{
        mb: 2
      }}>
              Aucune réservation en cours pour ce logement. Recherchez une réservation ci-dessous.
            </Alert>}

          {/* Recherche autre réservation */}
          <Typography variant="body2" sx={{
        mb: 1,
        mt: 2
      }}>
            OU
          </Typography>

          <Autocomplete options={allReservations} value={formData.reservation && (!currentReservation || formData.reservation._id !== currentReservation._id && formData.reservation.id !== currentReservation._id) ? formData.reservation : null} onChange={(_, newValue) => handleReservationSearch(newValue)} getOptionLabel={option => `${option.number || option.reservationNumber} - ${option.guestName}`} loading={loadingAllReservations} renderInput={params => <TextField {...params} label="🔍 Rechercher une autre réservation" placeholder="N° résa (SJ-XXX) ou Nom client..." helperText={loadingAllReservations ? 'Chargement...' : allReservations.length > 0 ? `💡 ${allReservations.length} réservation(s) disponible(s) pour ce logement` : '⚠️ Aucune réservation trouvée pour ce logement (pending/confirmed)'} InputProps={{
        ...params.InputProps,
        endAdornment: <>
                      {loadingAllReservations && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
      }} />} renderOption={(props, option) => <li {...props} key={option._id || option.id}>
                <Box>
                  <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 0.5
          }}>
                    <Chip label={option.number || option.reservationNumber} size="small" />
                    <Typography variant="body2" fontWeight="bold">
                      {option.guestName}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    📅{' '}
                    {new Date(option.checkIn || option.arrivalDate || '').toLocaleDateString()} -{' '}
                    {new Date(option.checkOut || option.departureDate || '').toLocaleDateString()}
                  </Typography>
                </Box>
              </li>} filterOptions={(options, {
        inputValue
      }) => {
        const input = inputValue.toLowerCase();
        return options.filter(option => option.number && option.number.toLowerCase().includes(input) || option.reservationNumber && option.reservationNumber.toLowerCase().includes(input) || option.guestName.toLowerCase().includes(input));
      }} isOptionEqualToValue={(option, value) => option._id === value._id || option.id === value.id} />
        </>}

      {canProceed && <Divider sx={{
      my: 3
    }} />}

      {/* Résumé */}
      {canProceed && <Alert severity="success" sx={{
      mt: 2
    }}>
          <Typography variant="subtitle2" sx={{
        mb: 1
      }}>
            📊 Résumé Sélection
          </Typography>
          <Box>
            <Typography variant="body2">
              Type: {selectedType?.icon} {selectedType?.label}
            </Typography>
            <Typography variant="body2">
              Logement: 🏠 {formData.listing?.name || formData.listing?.title}
            </Typography>
            <Typography variant="body2">
              Réservation: {formData.reservation?.number || formData.reservation?.reservationNumber} -{' '}
              {formData.reservation?.guestName}
            </Typography>
            <Typography variant="body2">
              Check-in:{' '}
              {formData.reservation && new Date(formData.reservation.checkIn || formData.reservation.arrivalDate || '').toLocaleDateString()}
            </Typography>
            {formData.taskType && CLIENT_TASK_TYPES.includes(formData.taskType) && <Typography variant="body2" sx={{
          mt: 0.5
        }}>
                {loadingServices ? '⏳ Chargement services listing...' : formData.listingServices ? `✅ Config listing chargée (${formData.listingServices.transport.length + formData.listingServices.grocery.length + formData.listingServices.custom.length} service(s) concierge, ${formData.listingServices.support.length} catégorie(s) support)` : '⚠️ Aucune config services pour ce logement — valeurs par défaut utilisées'}
              </Typography>}
          </Box>
        </Alert>}
    </Box>;
}
