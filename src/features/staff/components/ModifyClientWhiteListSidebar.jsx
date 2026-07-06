import React, { useState, useEffect } from 'react';
import { IconButton, Box, Typography, Button, TextField, CircularProgress, Grid, Paper, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, Switch, FormControlLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, X, Phone, Languages, Earth, Search, Plus } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { toast } from 'react-toastify';
import { getReservation } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});
const ModifyClientWhiteListSidebar = ({
  open,
  onClose,
  staff,
  onSubmit,
  onRefresh
}) => {
  const {
    t
  } = useTranslation('common');
  const [enrichedReservations, setEnrichedReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [searchReservationNumber, setSearchReservationNumber] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [removedReservationIds, setRemovedReservationIds] = useState([]);
  const validationSchema = Yup.object().shape({
    phone: Yup.string().required(t('Phone is required')),
    language: Yup.string(),
    name: Yup.string(),
    country: Yup.string(),
    communicated: Yup.boolean().required(t('communicated is required')),
    blocked: Yup.boolean().required(t('blocked is required')),
    reservation: Yup.boolean().required(t('reservation is required')),
    reservationIds: Yup.array().required(t('reservationIds is required'))
  });

  // Fetch enriched reservation details when modal opens
  useEffect(() => {
    if (open && staff?.reservationIds?.length) {
      fetchEnrichedReservationDetails();
    }
  }, [open, staff?._id]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setSearchReservationNumber('');
      setSearchResults([]);
      setSelectedReservations([]);
      setRemovedReservationIds([]);
    }
  }, [open]);
  const fetchEnrichedReservationDetails = async () => {
    if (!staff?.reservationIds?.length) return;
    setIsLoadingReservations(true);
    try {
      const reservationIds = staff.reservationIds.map(res => res.reservationId);
      const response = await getReservation({
        reservationId: reservationIds,
        limit: 100,
        page: 0
      });
      const mergedReservations = staff.reservationIds.map(originalRes => {
        const fetchedReservation = response.data.find(fetchedRes => fetchedRes._id === originalRes.reservationId);
        return {
          ...originalRes,
          guestName: fetchedReservation?.guestName || originalRes.guestName,
          listingName: originalRes.listingName || fetchedReservation?.listingName || '',
          channelName: fetchedReservation?.channelName || originalRes.channelName,
          status: fetchedReservation?.status || originalRes.status,
          reservationNumber: fetchedReservation?.reservationNumber || originalRes.reservationNumber,
          reservationDate: fetchedReservation?.reservationDate || originalRes.reservationDate,
          arrivalDate: fetchedReservation?.arrivalDate || originalRes.arrivalDate,
          departureDate: fetchedReservation?.departureDate || originalRes.departureDate,
          type: originalRes.type || 'Owner'
        };
      });
      staff.reservationIds = mergedReservations;
      setEnrichedReservations(mergedReservations);
    } catch (error) {
      toast.error(t('Could not fetch reservation details'));
      setEnrichedReservations(staff.reservationIds);
    } finally {
      setIsLoadingReservations(false);
    }
  };
  const handleReservationSearch = async () => {
    if (!searchReservationNumber.trim()) {
      toast.warning(t('Please enter a search term'));
      return;
    }
    setIsLoadingReservations(true);
    try {
      const response = await getReservation({
        reservationNumber: searchReservationNumber,
        limit: 10,
        page: 0
      });

      // Auto-add the found reservations to selectedReservations
      if (response.data && response.data.length > 0) {
        const newReservations = response.data.filter(reservation => {
          // Check if not already in existing or selected
          const isDuplicate = [...enrichedReservations, ...selectedReservations].some(r => r.reservationId === reservation._id || r._id === reservation._id);
          return !isDuplicate;
        }).map(reservation => ({
          reservationId: reservation._id,
          reservationNumber: reservation.reservationNumber,
          reservationDate: reservation.reservationDate,
          arrivalDate: reservation.arrivalDate,
          departureDate: reservation.departureDate,
          type: reservation.type || 'Owner',
          guestName: reservation.guestName || '',
          listingName: reservation.listingName || '',
          channelName: reservation.channelName || '',
          status: reservation.status || ''
        }));
        if (newReservations.length > 0) {
          setSelectedReservations([...selectedReservations, ...newReservations]);
          toast.success(t(`${newReservations.length} reservation(s) added`));
        } else {
          toast.info(t('Reservation(s) already added'));
        }
      } else {
        toast.warning(t('No reservations found'));
      }

      // Clear search after adding
      setSearchReservationNumber('');
      setSearchResults([]);
    } catch (error) {
      toast.error(t('Could not search reservations'));
      setSearchResults([]);
    } finally {
      setIsLoadingReservations(false);
    }
  };
  const handleReservationNumberClick = reservationId => {
    const identifier = typeof reservationId === 'object' ? reservationId.reservationNumber || reservationId._id : reservationId;
    if (identifier) {
      window.open(`/admin/Reservation/reservation-detail/${identifier}`, '_blank');
    } else {
      toast.warning(t('No reservation details available'));
    }
  };
  const handleAddReservation = reservation => {
    const isDuplicate = [...enrichedReservations, ...selectedReservations].some(r => r.reservationId === reservation._id);
    if (!isDuplicate) {
      const newReservation = {
        reservationId: reservation._id,
        reservationNumber: reservation.reservationNumber,
        reservationDate: reservation.reservationDate,
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate,
        type: reservation.type || 'Owner',
        guestName: reservation.guestName || '',
        listingName: reservation.listingName || '',
        channelName: reservation.channelName || '',
        status: reservation.status || ''
      };
      setSelectedReservations([...selectedReservations, newReservation]);
    } else {
      toast.info(t('Reservation already added'));
    }
  };
  const handleRemoveReservation = reservationId => {
    // Check if it's an existing reservation (in enrichedReservations)
    const isExisting = enrichedReservations.some(r => r.reservationId === reservationId || r._id === reservationId);
    if (isExisting) {
      // Mark for removal and remove from enrichedReservations display
      const newRemovedIds = [...removedReservationIds, reservationId];
      setRemovedReservationIds(newRemovedIds);
      setEnrichedReservations(enrichedReservations.filter(r => r.reservationId !== reservationId && r._id !== reservationId));
    } else {
      // Just remove from selectedReservations (not yet saved)

      setSelectedReservations(selectedReservations.filter(r => r.reservationId !== reservationId && r._id !== reservationId));
    }
  };
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      // First, update basic info (phone, name, etc.) without reservations
      const basicValues = {
        phone: values.phone,
        language: values.language,
        name: values.name,
        country: values.country,
        communicated: values.communicated,
        blocked: values.blocked,
        reservation: values.reservation
      };
      await onSubmit(staff._id, basicValues);

      // Remove reservations that were marked for deletion

      if (removedReservationIds.length > 0) {
        for (const reservationId of removedReservationIds) {
          try {
            const response = await axios.delete(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/${staff._id}/remove-reservation/${reservationId}`);
            if (response.data.success) {} else {
              toast.warning(t(`Failed to remove reservation ${reservationId}`));
            }
          } catch (err) {
            toast.error(t(`Error removing reservation: ${err.response?.data?.message || err.message}`));
          }
        }
      } else {}

      // Then, add each NEW reservation individually using the WhatsApp-style API
      if (selectedReservations.length > 0) {
        for (const reservation of selectedReservations) {
          const reservationId = reservation.reservationId || reservation._id;
          try {
            const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/client/${staff._id}/add-reservation`, {
              reservationId
            });
            if (response.data.success) {}
          } catch (err) {}
        }
      }
      toast.success(t('Client updated successfully'));

      // Refresh the list to show updated data with WhatsApp config
      if (onRefresh) {
        await onRefresh();
      }
      onClose();
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path[0]] = err.message;
        });
        setErrors(serverErrors);
        toast.error(t(serverErrors[Object.keys(serverErrors)[0]]));
      } else {
        toast.error(t('Error updating Client'));
      }
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
    sx: {
      minHeight: '80vh',
      maxHeight: '90vh'
    }
  }}>
      {/* Header - Style TasksNew */}
      <DialogTitle sx={{
      padding: 0
    }}>
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <PersonIcon style={{
            color: SOJORI_COLORS.primary,
            fontSize: 28
          }} />
            <h3 className="text-xl font-bold bg-gradient-to-r from-[#E6B022] to-[#B8881A] bg-clip-text text-transparent">
              {t('Update Client White List')}
            </h3>
          </div>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </div>
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-600">
            📱 {staff?.phone || 'N/A'} {staff?.name && `• ${staff.name}`}
          </div>
        </div>
      </DialogTitle>

      <Formik initialValues={{
      phone: staff?.phone,
      language: staff?.language,
      name: staff?.name,
      country: staff?.country,
      communicated: staff?.communicated,
      blocked: staff?.blocked,
      reservation: staff?.reservation,
      reservationIds: staff?.reservationIds
    }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({
        isSubmitting,
        setFieldValue,
        values
      }) => <>
            {/* Content avec scroll */}
            <DialogContent sx={{
          bgcolor: 'white',
          paddingTop: 3,
          paddingBottom: 2,
          maxHeight: 'calc(90vh - 220px)',
          overflowY: 'auto'
        }}>
                <Form id="client-form" className="space-y-4">
                  <Box className="flex flex-col gap-4 mt-4">
                    <Box className="flex gap-2">
                      <Box className="w-full">
                        <Field as={TextField} fullWidth name="phone" label={t('phone')} variant="outlined" slotProps={{
                    input: {
                      startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                        <ErrorMessage name="phone" component={Typography} className="text-red-500 !text-xs" />
                      </Box>
                      <Box className="w-full">
                        <Field as={TextField} fullWidth name="language" label={t('language')} variant="outlined" slotProps={{
                    input: {
                      startAdornment: <Languages className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                        <ErrorMessage name="language" component={Typography} className="text-red-500 !text-xs" />
                      </Box>
                    </Box>
                    <Box className="flex gap-2">
                      <Box className="w-full">
                        <Field as={TextField} fullWidth name="name" label={t('name')} variant="outlined" slotProps={{
                    input: {
                      startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                        <ErrorMessage name="name" component={Typography} className="text-red-500 !text-xs" />
                      </Box>
                      <Box className="w-full">
                        <Field as={TextField} fullWidth name="country" label={t('country')} variant="outlined" slotProps={{
                    input: {
                      startAdornment: <Earth className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                        <ErrorMessage name="country" component={Typography} className="text-red-500 !text-xs" />
                      </Box>
                    </Box>
                    <Box className="flex gap-2">
                      <Box className="w-full flex gap-2">
                        <Field name="communicated">
                          {({
                      field
                    }) => <FormControlLabel control={<Switch {...field} checked={field.value} onChange={event => setFieldValue('communicated', event.target.checked)} />} label={t('communicated')} />}
                        </Field>
                        <Field name="blocked">
                          {({
                      field
                    }) => <FormControlLabel control={<Switch {...field} checked={field.value} onChange={event => setFieldValue('blocked', event.target.checked)} />} label={t('blocked')} />}
                        </Field>
                        <Field name="reservation">
                          {({
                      field
                    }) => <FormControlLabel control={<Switch {...field} checked={field.value} onChange={event => setFieldValue('reservation', event.target.checked)} />} label={t('reservation')} />}
                        </Field>
                      </Box>
                    </Box>
                  </Box>
                  <Box className="mt-4 flex gap-2">
                    <TextField fullWidth variant="outlined" label={t('Search Reservation Number')} value={searchReservationNumber} onChange={e => setSearchReservationNumber(e.target.value)} slotProps={{
                input: {
                  startAdornment: <Search className="w-4 h-4 mr-2 text-gray-500" />
                }
              }} />
                    <StyledButton variant="contained" onClick={handleReservationSearch} disabled={isLoadingReservations}>
                      {t('Search')}
                    </StyledButton>
                  </Box>
                  {searchResults.length > 0 && <Box className="mt-4">
                      <Typography variant="h6" className="mb-2">
                        {t('Search Results')}
                      </Typography>
                      <Grid container spacing={2}>
                        {searchResults.map(reservation => <Grid item xs={12} sm={6} md={4} key={reservation._id}>
                            <Paper elevation={3} className="p-4 h-full flex flex-col">
                              <Box className="flex justify-between items-center mb-2">
                                <Typography variant="body1" onClick={() => handleReservationNumberClick(reservation._id || reservation.reservationId)} className="cursor-pointer">
                                  <strong className="text-medium-aquamarine">
                                    #{reservation.reservationNumber}
                                  </strong>
                                </Typography>
                                <IconButton onClick={() => {
                        const reservationWithType = {
                          ...reservation,
                          type: reservation.type || 'Owner'
                        };
                        handleAddReservation(reservationWithType);
                      }} className="p-1 !text-medium-aquamarine">
                                  <Plus className="w-5 h-5" />
                                </IconButton>
                              </Box>
                              <div className="space-y-2">
                                {[{
                        label: t('Guest Name'),
                        field: 'guestName'
                      }, {
                        label: t('Listing'),
                        field: 'listingName'
                      }, {
                        label: t('Channel Name'),
                        field: 'channelName'
                      }, {
                        label: t('Status'),
                        field: 'status'
                      }, {
                        label: t('Created'),
                        field: 'reservationDate'
                      }, {
                        label: t('Arrival'),
                        field: 'arrivalDate'
                      }, {
                        label: t('Departure'),
                        field: 'departureDate'
                      }, {
                        label: t('Type'),
                        field: 'type'
                      }].map(({
                        label,
                        field
                      }) => field === 'type' ? <Box key={field} className="flex gap-2 items-center !text-xs">
                                      <Typography variant="body2" className="text-gray-600 whitespace-nowrap">{label}:</Typography>
                                      <Select value={reservation.type || 'Owner'} onChange={e => {
                          const updatedResults = searchResults.map(r => r._id === reservation._id ? {
                            ...r,
                            type: e.target.value
                          } : r);
                          setSearchResults(updatedResults);
                        }} size="small" variant="standard" className="!text-xs">
                                        <MenuItem value="Owner" className="!text-xs">{t('Owner')}</MenuItem>
                                        <MenuItem value="Traveller" className="!text-xs">{t('Traveller')}</MenuItem>
                                        <MenuItem value="Registration" className="!text-xs">{t('Registration')}</MenuItem>
                                      </Select>
                                    </Box> : <Typography key={field} variant="body2" className="!text-xs flex gap-2">
                                      <span className="text-gray-600 whitespace-nowrap">{label}:</span>
                                      <span className="text-right">
                                        {field === 'arrivalDate' || field === 'departureDate' || field === 'reservationDate' ? reservation[field] ? new Date(reservation[field].replace('Z', '')).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
                                      </span>
                                    </Typography>)}
                              </div>
                            </Paper>
                          </Grid>)}
                      </Grid>
                    </Box>}

                  {selectedReservations.length > 0 && <Box className="mt-4">
                      <Typography variant="h6" className="mb-2">
                        {t('Selected Reservations')}
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedReservations.map(reservation => <Grid item xs={12} sm={6} md={4} key={reservation.reservationId}>
                            <Paper elevation={3} className="p-4 h-full flex flex-col">
                              <Box className="flex justify-between items-center mb-2">
                                <Typography variant="body1">
                                  <strong className="text-medium-aquamarine">
                                    #{reservation.reservationNumber}
                                  </strong>
                                </Typography>
                                <IconButton color="error" onClick={() => handleRemoveReservation(reservation.reservationId)} className="p-1">
                                  <X className="w-5 h-5" />
                                </IconButton>
                              </Box>
                              <div className="space-y-2">
                                {[{
                        label: t('Guest Name'),
                        field: 'guestName'
                      }, {
                        label: t('Listing'),
                        field: 'listingName'
                      }, {
                        label: t('Channel Name'),
                        field: 'channelName'
                      }, {
                        label: t('Status'),
                        field: 'status'
                      }, {
                        label: t('Created'),
                        field: 'reservationDate'
                      }, {
                        label: t('Arrival'),
                        field: 'arrivalDate'
                      }, {
                        label: t('Departure'),
                        field: 'departureDate'
                      }, {
                        label: t('Type'),
                        field: 'type'
                      }].map(({
                        label,
                        field
                      }) => field === 'type' ? <Box key={field} className="flex gap-2 items-center !text-xs">
                                      <Typography variant="body2" className="text-gray-600 whitespace-nowrap">{label}:</Typography>
                                      <Select value={reservation.type || 'Owner'} onChange={e => {
                          const updatedReservations = selectedReservations.map(r => r.reservationId === reservation.reservationId ? {
                            ...r,
                            type: e.target.value
                          } : r);
                          setSelectedReservations(updatedReservations);
                        }} size="small" variant="standard" className="!text-xs">
                                        <MenuItem value="Owner" className="!text-xs">{t('Owner')}</MenuItem>
                                        <MenuItem value="Traveller" className="!text-xs">{t('Traveller')}</MenuItem>
                                        <MenuItem value="Registration" className="!text-xs">{t('Registration')}</MenuItem>
                                      </Select>
                                    </Box> : <Typography key={field} variant="body2" className="!text-xs flex gap-2">
                                      <span className="text-gray-600 whitespace-nowrap">{label}:</span>
                                      <span className="text-right">
                                        {field === 'arrivalDate' || field === 'departureDate' || field === 'reservationDate' ? reservation[field] ? new Date(reservation[field]).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
                                      </span>
                                    </Typography>)}
                              </div>
                            </Paper>
                          </Grid>)}
                      </Grid>
                    </Box>}

                  {enrichedReservations?.length > 0 && <Box className="mt-4">
                      <Typography variant="h6" className="mb-2 flex items-center gap-2">
                        {t('Reservation Details')}
                        {isLoadingReservations && <span className="text-sm text-gray-500 italic">({t('Updating...')})</span>}
                      </Typography>
                      <Grid container spacing={2}>
                        {enrichedReservations.map((reservation, index) => <Grid item xs={12} sm={6} md={4} key={reservation.reservationId || index}>
                            <Paper elevation={3} className="p-4 h-full flex flex-col justify-between hover:shadow-lg transition-shadow">
                              <div>
                                <Box className="flex justify-between items-center mb-2">
                                  <Typography variant="body1" onClick={() => handleReservationNumberClick(reservation._id || reservation.reservationId)} className="cursor-pointer">
                                    <strong className="text-medium-aquamarine">
                                      #{reservation.reservationNumber || t('N/A')}
                                    </strong>
                                  </Typography>
                                  <IconButton color="error" onClick={() => handleRemoveReservation(reservation.reservationId || reservation._id)} className="p-1">
                                    <X className="w-5 h-5" />
                                  </IconButton>
                                </Box>
                                <div className="space-y-2">
                                  {[{
                          label: t('Guest Name'),
                          field: 'guestName'
                        }, {
                          label: t('Channel Name'),
                          field: 'channelName'
                        }, {
                          label: t('Status'),
                          field: 'status'
                        }, {
                          label: t('Created'),
                          field: 'reservationDate'
                        }, {
                          label: t('Arrival'),
                          field: 'arrivalDate'
                        }, {
                          label: t('Departure'),
                          field: 'departureDate'
                        }, {
                          label: t('Type'),
                          field: 'type'
                        }].map(({
                          label,
                          field
                        }) => field === 'type' ? <Box key={field} className="flex gap-2 items-center !text-xs">
                                        <Typography variant="body2" className="text-gray-600 whitespace-nowrap">{label}:</Typography>
                                        <Select value={reservation.type || 'Owner'} onChange={e => {
                            const newType = e.target.value;
                            const updatedReservations = enrichedReservations.map(r => r.reservationId === reservation.reservationId ? {
                              ...r,
                              type: newType
                            } : r);
                            setEnrichedReservations(updatedReservations);
                            staff.reservationIds = staff.reservationIds.map(r => r.reservationId === reservation.reservationId ? {
                              ...r,
                              type: newType
                            } : r);
                          }} size="small" variant="standard" className="!text-xs">
                                          <MenuItem value="Owner" className="!text-xs">{t('Owner')}</MenuItem>
                                          <MenuItem value="Traveller" className="!text-xs">{t('Traveller')}</MenuItem>
                                          <MenuItem value="Registration" className="!text-xs">{t('Registration')}</MenuItem>
                                        </Select>
                                      </Box> : <Typography key={field} variant="body2" className="!text-xs flex gap-2">
                                        <span className="text-gray-600 whitespace-nowrap">{label}:</span>
                                        <span className="text-right">
                                          {field === 'arrivalDate' || field === 'departureDate' || field === 'reservationDate' ? reservation[field] ? new Date(reservation[field]).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
                                        </span>
                                      </Typography>)}
                                </div>
                              </div>
                            </Paper>
                          </Grid>)}
                      </Grid>
                    </Box>}
                </Form>
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions sx={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          bgcolor: '#f9fafb',
          gap: 1.5
        }}>
              <Button variant="outlined" onClick={onClose} disabled={isSubmitting} sx={{
            flex: 1,
            borderRadius: '8px',
            borderColor: '#d1d5db',
            color: '#6b7280',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#9ca3af',
              backgroundColor: '#f3f4f6'
            },
            '&:disabled': {
              borderColor: '#e5e7eb',
              color: '#9ca3af'
            }
          }}>
                {t('Cancel')}
              </Button>
              <Button variant="contained" onClick={() => document.getElementById('client-form').requestSubmit()} disabled={isSubmitting} sx={{
            flex: 1,
            borderRadius: '8px',
            background: 'linear-gradient(to right, #E6B022, #B8881A)',
            textTransform: 'none',
            fontWeight: 600,
            color: 'white',
            boxShadow: '0 4px 6px rgba(255, 107, 53, 0.25)',
            '&:hover': {
              background: 'linear-gradient(to right, #B8881A, #D44920)',
              boxShadow: '0 6px 8px rgba(255, 107, 53, 0.35)'
            },
            '&:disabled': {
              background: '#d1d5db',
              color: '#9ca3af'
            }
          }}>
                {isSubmitting ? <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
                    <CircularProgress size={16} color="inherit" />
                    {t('Updating...')}
                  </div> : t('Update')}
              </Button>
            </DialogActions>
          </>}
      </Formik>
    </Dialog>;
};
export default ModifyClientWhiteListSidebar;
