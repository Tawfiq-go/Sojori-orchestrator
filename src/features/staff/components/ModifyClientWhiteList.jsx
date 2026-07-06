import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, IconButton, Box, Switch, Grid, Paper, List, ListItem, ListItemText, MenuItem, Select } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, X, Phone, Languages, Earth, Search, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { getReservation } from '../services/serverApi.task';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const ModifyClientWhiteList = ({
  open,
  handleClose,
  staff,
  functionToExecute
}) => {
  const {
    t
  } = useTranslation('common');
  const [enrichedReservations, setEnrichedReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [searchReservationNumber, setSearchReservationNumber] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedReservations, setSelectedReservations] = useState([]);
  const navigate = useNavigate();
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
  useEffect(() => {
    if (open && staff?.reservationIds?.length) {
      fetchEnrichedReservationDetails();
    }
    if (!open) {
      setSearchReservationNumber('');
      setSearchResults([]);
      setSelectedReservations([]);
    }
  }, [open, staff]);
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
      setSearchResults(response.data);
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
    setSelectedReservations(selectedReservations.filter(r => r.reservationId !== reservationId));
  };
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      const updatedValues = {
        ...values,
        reservationIds: [...(staff.reservationIds || []), ...selectedReservations]
      };
      await functionToExecute(staff._id, updatedValues);
      handleClose();
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
  return <Dialog open={open} onClose={() => {
    setSearchReservationNumber('');
    setSearchResults([]);
    handleClose();
  }} maxWidth="md" fullWidth>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('Update Client White List')}
        </Typography>
        <IconButton onClick={handleClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="pt-6">
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
        }) => <Form className="space-y-4">
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
                  }) => <div>
                          <Switch {...field} checked={field.value} onChange={event => setFieldValue('communicated', event.target.checked)} />
                          {t('communicated')}
                        </div>}
                    </Field>
                    <Field name="blocked">
                      {({
                    field
                  }) => <div>
                          <Switch {...field} checked={field.value} onChange={event => setFieldValue('blocked', event.target.checked)} />
                          {t('blocked')}
                        </div>}
                    </Field>
                    <Field name="reservation">
                      {({
                    field
                  }) => <div>
                          <Switch {...field} checked={field.value} onChange={event => setFieldValue('reservation', event.target.checked)} />
                          {t('reservation')}
                        </div>}
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
                <Button variant="contained" onClick={handleReservationSearch} disabled={isLoadingReservations} className="!bg-medium-aquamarine !text-white">
                  {t('Search')}
                </Button>
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
                                    {field === 'arrivalDate' || field === 'departureDate' ? reservation[field] ? new Date(reservation[field].replace('Z', '')).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
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
                                    {field === 'arrivalDate' || field === 'departureDate' ? reservation[field] ? new Date(reservation[field]).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
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
                              <IconButton color="error" onClick={() => {
                        const updatedEnrichedReservations = enrichedReservations.filter(r => r.reservationId !== reservation.reservationId);
                        setEnrichedReservations(updatedEnrichedReservations);
                        const updatedReservationIds = staff.reservationIds.filter(r => r.reservationId !== reservation.reservationId);
                        staff.reservationIds = updatedReservationIds;
                      }} className="p-1">
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
                                      {field === 'arrivalDate' || field === 'departureDate' ? reservation[field] ? new Date(reservation[field]).toLocaleDateString() : t('Not Available') : reservation[field] || t('Not Available')}
                                    </span>
                                  </Typography>)}
                            </div>
                          </div>
                        </Paper>
                      </Grid>)}
                  </Grid>
                </Box>}

              <DialogActions>
                <Button className="!text-red-500" onClick={handleClose} variant="outlined" color="error" startIcon={<X className="w-4 h-4" />}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90" variant="contained" startIcon={<User className="w-4 h-4" />}>
                  {isSubmitting ? t('Updating...') : t('Update Client')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifyClientWhiteList;
