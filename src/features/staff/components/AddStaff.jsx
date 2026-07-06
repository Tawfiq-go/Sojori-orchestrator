import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Box, Checkbox, ListItemText, IconButton, FormHelperText } from '@mui/material';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Phone, MessageSquare, X, Globe, MapPinned, Languages, Type } from 'lucide-react';
import { CreateStaff, getOwners } from '../services/serverApi.task';
import ListingSelector from './ListingSelector';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
const validationSchema = t => Yup.object().shape({
  username: Yup.string().required(t('Username is required')),
  email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
  // password: Yup.string()
  //   .required('Password is required')
  //   .min(8, 'Password must be at least 8 characters'),
  subType: Yup.array().min(1, t('At least one task must be selected')).required(t('Tasks are required')),
  callPhone: Yup.string().required(t('Call Phone is required')),
  whatsappPhone: Yup.string().required(t('WhatsApp Phone is required')),
  language: Yup.string().required(t('Language is required')),
  listingIds: Yup.array(),
  countryIds: Yup.array().min(1, t('At least one country must be selected')).required(t('Countries are required')),
  cityIds: Yup.array().min(1, t('At least one city must be selected')).required(t('Cities are required')),
  ownerId: Yup.string().required(t('Owner is required'))
});
const CreateStaffDialog = ({
  open,
  handleClose,
  onStaffCreated,
  cities,
  countries,
  listings,
  taskTypes,
  languages
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = hasAdminAccess(user?.role);
  useEffect(() => {
    if (open && isAdmin) {
      fetchOwners();
    }
  }, [open, isAdmin]);
  const fetchOwners = async () => {
    setIsLoadingOwners(true);
    try {
      const response = await getOwners({
        limit: 100
      });
      if (response && response.data) {
        setOwners(response.data);
      }
    } catch (error) {} finally {
      setIsLoadingOwners(false);
    }
  };
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    try {
      const transformedValues = {
        ...values,
        listingIds: values.listingIds.includes('All') ? ['All'] : values.listingIds,
        countryIds: values.countryIds.includes('All') ? ['All'] : values.countryIds,
        cityIds: values.cityIds.includes('All') ? ['All'] : values.cityIds
      };
      const response = await CreateStaff(transformedValues);
      if (response.data && response.data.success) {
        const newStaffData = response.data.user;
        if (newStaffData) {
          onStaffCreated(newStaffData);
          toast.success(t('Staff created successfully'));
          handleClose();
        } else {
          throw new Error('User data not found in the response');
        }
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      handleErrorResponse(error.response?.data || error);
    } finally {
      setSubmitting(false);
    }
  };
  const handleErrorResponse = errorData => {
    if (!errorData) {
      toast.error(t('An unexpected error occurred'));
      return;
    }
    if (Array.isArray(errorData.error)) {
      errorData.error.forEach(err => {
        toast.error(err.message || err.longMessage || t('An error occurred'));
      });
    } else if (typeof errorData.error === 'string') {
      toast.error(errorData.error);
    } else if (errorData.message) {
      toast.error(errorData.message);
    } else if (errorData instanceof Error) {
      toast.error(errorData.message);
    } else {
      toast.error(t('An error occurred while creating staff'));
    }
  };

  // Set initial ownerId based on the user's role
  const initialOwnerId = isAdmin ? '' : user?._id || '';
  return <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{
    className: "rounded-lg"
  }}>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('Create Staff')}
        </Typography>
        <IconButton onClick={handleClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="pt-6">
        <Formik initialValues={{
        username: '',
        email: '',
        // password: '',
        subType: [],
        callPhone: '',
        whatsappPhone: '',
        listingIds: [],
        countryIds: [],
        cityIds: [],
        role: 'staff',
        language: '',
        ownerId: initialOwnerId
      }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          values,
          errors,
          touched,
          handleChange,
          handleBlur
        }) => <Form className="space-y-4">
              <Box className="flex flex-col gap-3 mt-3">
                <Box>
                  <Field as={TextField} fullWidth name="username" label={t('Username')} variant="outlined" slotProps={{
                input: {
                  startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                }
              }} />
                  <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs" />
                </Box>
                
                <Box className="flex gap-2">
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="email" label={t('Email')} variant="outlined" type="email" slotProps={{
                  input: {
                    startAdornment: <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                    <ErrorMessage name="email" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                  {/* <Box className="w-full">
                    <Field
                      as={TextField}
                      fullWidth
                      name="password"
                      label="Password"
                      variant="outlined"
                      type="password"
                      slotProps={{
                        input: {
                          startAdornment: <Lock className="w-4 h-4 mr-2 text-gray-500" />,
                        }
                      }}
                    />
                    <ErrorMessage name="password" component={Typography} className="text-red-500 !text-xs" />
                   </Box> */}
                </Box>

                {/* Owner selection for admins */}
                <RoleBasedRenderer adminOnly>
                  <FormControl fullWidth error={touched.ownerId && Boolean(errors.ownerId)}>
                    <InputLabel id="owner-select-label">{t('Owner')}</InputLabel>
                    <Select labelId="owner-select-label" id="owner-select" name="ownerId" value={values.ownerId} label={t('Owner')} onChange={handleChange} onBlur={handleBlur} disabled={isLoadingOwners}>
                      {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>
                          {owner.firstName} {owner.lastName}
                        </MenuItem>)}
                    </Select>
                    {touched.ownerId && errors.ownerId && <FormHelperText>{errors.ownerId}</FormHelperText>}
                  </FormControl>
                </RoleBasedRenderer>

                {/* Hidden field for non-admin users */}
                {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}
                
                <FormControl fullWidth>
                  <ListingSelector listings={listings} selectedIds={values.listingIds} onChange={newIds => setFieldValue('listingIds', newIds)} showAllOption={true} />
                  <ErrorMessage name="listingIds" component={Typography} className="text-red-500 !text-xs" />
                </FormControl>

                <Box className="flex gap-2">
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="callPhone" label={t('Call Phone')} variant="outlined" slotProps={{
                  input: {
                    startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                    <ErrorMessage name="callPhone" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="whatsappPhone" label={t('WhatsApp Phone')} variant="outlined" slotProps={{
                  input: {
                    startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                    <ErrorMessage name="whatsappPhone" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                </Box>

                <Box className="flex gap-2">
                  <FormControl fullWidth>
                    <InputLabel id="countries-label">{t('Countries')}</InputLabel>
                    <Select labelId="countries-label" multiple value={values.countryIds} onChange={e => {
                  const newValue = e.target.value;
                  if (newValue.includes('All')) {
                    setFieldValue('countryIds', ['All']);
                    setFieldValue('cityIds', ['All']);
                  } else {
                    setFieldValue('countryIds', newValue);
                    setFieldValue('cityIds', []);
                  }
                }} label={t('Countries')} renderValue={selected => {
                  if (selected.includes('All')) return t('All Countries');
                  return selected.map(id => countries.find(country => country._id === id)?.name || '').join(', ');
                }} startAdornment={<Globe className="w-4 h-4 ml-2 text-gray-500" />}>
                      <MenuItem value="All">
                        <Checkbox checked={values.countryIds.includes('All')} />
                        <ListItemText primary={t('All Countries')} />
                      </MenuItem>
                      {!values.countryIds.includes('All') && countries.map(country => <MenuItem key={country._id} value={country._id}>
                          <Checkbox checked={values.countryIds.includes(country._id)} />
                          <ListItemText primary={country.name} />
                        </MenuItem>)}
                    </Select>
                    <ErrorMessage name="countryIds" component={Typography} className="text-red-500 !text-xs" />
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="cities-label">{t('Cities')}</InputLabel>
                    <Select labelId="cities-label" multiple value={values.cityIds} onChange={e => {
                  const newValue = e.target.value;
                  if (newValue.includes('All')) {
                    setFieldValue('cityIds', ['All']);
                  } else {
                    setFieldValue('cityIds', newValue);
                  }
                }} label={t('Cities')} renderValue={selected => {
                  if (selected.includes('All')) return t('All Cities');
                  return selected.map(id => cities.find(city => city._id === id)?.name || '').join(', ');
                }} startAdornment={<MapPinned className="w-4 h-4 ml-2 text-gray-500" />} disabled={values.countryIds.includes('All')}>
                      <MenuItem value="All">
                        <Checkbox checked={values.cityIds.includes('All')} />
                        <ListItemText primary={t('All Cities')} />
                      </MenuItem>
                      {!values.cityIds.includes('All') && cities.filter(city => values.countryIds.includes(city.countryId)).map(city => <MenuItem key={city._id} value={city._id}>
                            <Checkbox checked={values.cityIds.includes(city._id)} />
                            <ListItemText primary={city.name} />
                          </MenuItem>)}
                    </Select>
                    <ErrorMessage name="cityIds" component={Typography} className="text-red-500 !text-xs" />
                  </FormControl>
                </Box>
                
                <Box className="flex gap-2">
                  <FormControl fullWidth>
                    <InputLabel id="language-label">{t('Language')}</InputLabel>
                    <Field as={Select} labelId="language-label" id="language" name="language" label={t('Language')} startAdornment={<Box component="span" sx={{
                  mr: 1
                }}>
                          <Languages className="w-4 h-4 text-gray-500" />
                        </Box>}>
                      {languages.map(lang => <MenuItem key={lang._id} value={lang.name}>
                          {lang.name}
                        </MenuItem>)}
                    </Field>
                    <ErrorMessage name="language" component={Typography} variant="body2" className="text-red-500 !text-xs" />
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel id="subType-label">{t('Task Types')}</InputLabel>
                    <Select labelId="subType-label" multiple value={values.subType} onChange={e => setFieldValue('subType', e.target.value)} label={t('Task Types')} renderValue={selected => selected.join(', ')} startAdornment={<Box component="span" sx={{
                  mr: 1
                }}>
                          <Type className="w-4 h-4 text-gray-500" />
                        </Box>}>
                      {taskTypes.map(taskType => <MenuItem key={taskType._id} value={taskType.task} sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 16px'
                  }}>
                          <Box sx={{
                      width: '100%'
                    }}>
                            <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                              <Checkbox checked={values.subType.includes(taskType.task)} sx={{
                          padding: '4px'
                        }} />
                              <Typography variant="body1">
                                {taskType.task}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>)}
                    </Select>
                    <ErrorMessage name="subType" component={Typography} className="text-red-500 !text-xs mt-1" />
                  </FormControl>
                </Box>
              </Box>

              <DialogActions className="pt-4">
                <Button className='!text-red-500' onClick={handleClose} variant="outlined" color="error" startIcon={<X className="w-4 h-4" />}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoading} className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90" variant="contained" startIcon={<User className="w-4 h-4" />}>
                  {isSubmitting ? t('Creating...') : t('Create Staff')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default CreateStaffDialog;
