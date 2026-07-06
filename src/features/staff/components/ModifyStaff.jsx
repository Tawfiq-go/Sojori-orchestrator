import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Checkbox, ListItemText, IconButton, Box, FormHelperText, Tabs, Tab, Paper } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateStaff, getOwners } from '../services/serverApi.task';
import { User, X, Globe, MapPinned, Phone, MessageSquare, Languages, Type, Settings, MapPin } from 'lucide-react';
import ListingSelector from './ListingSelector';
import { toast } from 'react-toastify';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import { useTranslation } from 'react-i18next';
const validationSchema = t => Yup.object().shape({
  username: Yup.string().required(t('Username is required')),
  subType: Yup.array().min(1, t('At least one task must be selected')).required(t('Tasks are required')),
  callPhone: Yup.string().required(t('Call Phone is required')),
  whatsappPhone: Yup.string().required(t('WhatsApp Phone is required')),
  listingIds: Yup.array(),
  language: Yup.string().required(t('Language is required')),
  countryIds: Yup.array().min(1, t('At least one country must be selected')).required(t('Countries are required')),
  cityIds: Yup.array().min(1, t('At least one city must be selected')).required(t('Cities are required')),
  ownerId: Yup.string().required(t('Owner is required'))
});
const ModifyStaff = ({
  open,
  handleClose,
  staff,
  onStaffUpdate,
  cities,
  countries,
  listings,
  taskTypes,
  languages
}) => {
  const {
    t
  } = useTranslation('common');
  const [owners, setOwners] = useState([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = hasAdminAccess(user?.role);
  useEffect(() => {
    if (open && isAdmin) {
      fetchOwners();
    }
    if (open) {
      setActiveTab(0); // Reset to first tab when dialog opens
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
    setSubmitting,
    setErrors
  }) => {
    try {
      const transformedValues = {
        ...values,
        listingIds: values.listingIds.includes('All') ? ['All'] : values.listingIds,
        countryIds: values.countryIds.includes('All') ? ['All'] : values.countryIds,
        cityIds: values.cityIds.includes('All') ? ['All'] : values.cityIds,
        role: 'staff',
        email: staff?.email || ''
      };
      const response = await updateStaff(staff._id, transformedValues);
      if (response.data && response.data.success) {
        const updatedStaff = {
          ...staff,
          ...response.data.user
        };
        onStaffUpdate(updatedStaff);
        toast.success(t('Staff updated successfully'));
        handleClose();
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path[0]] = err.message;
        });
        setErrors(serverErrors);
        toast.error(serverErrors[Object.keys(serverErrors)[0]]);
      } else {
        toast.error(t('Error updating staff'));
      }
    } finally {
      setSubmitting(false);
    }
  };
  const initialOwnerId = isAdmin ? staff?.ownerId || '' : user?._id || '';
  return <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('Update Staff')}
        </Typography>
        <IconButton onClick={handleClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="pt-4" sx={{
      minHeight: '500px'
    }}>
        <Formik initialValues={{
        username: staff?.username || '',
        subType: staff?.subType || [],
        callPhone: staff?.callPhone || '',
        whatsappPhone: staff?.whatsappPhone || '',
        listingIds: staff?.listingIds || [],
        countryIds: staff?.countryIds || [],
        cityIds: staff?.cityIds || [],
        language: staff?.language || '',
        ownerId: staff?.ownerId || initialOwnerId
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
              {/* Onglets pour organiser par thèmes */}
              <Paper sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2
          }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                minHeight: '42px'
              },
              '& .Mui-selected': {
                color: '#E6B022 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#E6B022'
              }
            }}>
                  <Tab icon={<User size={16} />} iconPosition="start" label="Informations personnelles" />
                  <Tab icon={<MapPin size={16} />} iconPosition="start" label="Localisation" />
                  <Tab icon={<Languages size={16} />} iconPosition="start" label="Langue" />
                  <Tab icon={<Type size={16} />} iconPosition="start" label="Catégories" />
                </Tabs>
              </Paper>

              <Box className="flex flex-col gap-4 mt-4">
                {/* Onglet 1: Informations personnelles */}
                {activeTab === 0 && <Box className="flex flex-col gap-4">
                    <Typography variant="h6" sx={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#E6B022',
                mb: 1
              }}>
                      Informations personnelles
                    </Typography>

                    <Box>
                      <Field as={TextField} fullWidth name="username" label={t('Username')} variant="outlined" slotProps={{
                  input: {
                    startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                      <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs" />
                    </Box>

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

                    {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}

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
                  </Box>}

                {/* Onglet 2: Localisation */}
                {activeTab === 1 && <Box className="flex flex-col gap-4">
                    <Typography variant="h6" sx={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#E6B022',
                mb: 1
              }}>
                      Localisation
                    </Typography>

                    <FormControl fullWidth>
                      <ListingSelector listings={listings} selectedIds={values.listingIds} onChange={newIds => setFieldValue('listingIds', newIds)} showAllOption={true} />
                      <ErrorMessage name="listingIds" component={Typography} className="text-red-500 !text-xs" />
                    </FormControl>

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
                          {!values.countryIds.includes('All') ? countries.map(country => <MenuItem key={country._id} value={country._id}>
                                <Checkbox checked={values.countryIds.includes(country._id)} />
                                <ListItemText primary={country.name} />
                              </MenuItem>) : null}
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
                          {cities.filter(city => values.countryIds.includes(city.countryId)).map(city => <MenuItem key={city._id} value={city._id}>
                                <Checkbox checked={values.cityIds.includes(city._id)} />
                                <ListItemText primary={city.name} />
                              </MenuItem>)}
                        </Select>
                        <ErrorMessage name="cityIds" component={Typography} className="text-red-500 !text-xs" />
                      </FormControl>
                    </Box>
                  </Box>}

                {/* Onglet 3: Langue */}
                {activeTab === 2 && <Box className="flex flex-col gap-4">
                    <Typography variant="h6" sx={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#E6B022',
                mb: 1
              }}>
                      Langue de communication
                    </Typography>

                    <Paper sx={{
                p: 3,
                bgcolor: '#FFF5F0',
                border: '2px solid #E6B022'
              }}>
                      <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2
                }}>
                        <Languages className="w-5 h-5" style={{
                    color: '#E6B022'
                  }} />
                        <Typography sx={{
                    fontSize: '13px',
                    color: 'text.secondary'
                  }}>
                          Sélectionnez la langue de communication principale pour ce membre du staff
                        </Typography>
                      </Box>

                      <FormControl fullWidth>
                        <InputLabel id="language-label" sx={{
                    fontSize: '14px'
                  }}>{t('Language')}</InputLabel>
                        <Field as={Select} labelId="language-label" id="language" name="language" label={t('Language')} startAdornment={<Box component="span" sx={{
                    mr: 1
                  }}>
                              <Languages className="w-5 h-5 text-gray-500" />
                            </Box>} sx={{
                    fontSize: '15px',
                    fontWeight: 600
                  }}>
                          {languages.map(lang => <MenuItem key={lang._id} value={lang.name} sx={{
                      fontSize: '14px',
                      py: 1.5
                    }}>
                              <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                                <Languages size={18} />
                                {lang.name}
                              </Box>
                            </MenuItem>)}
                        </Field>
                        <ErrorMessage name="language" component={Typography} variant="error" className="text-red-500 !text-xs mt-1" />
                      </FormControl>
                    </Paper>

                    <Box sx={{
                mt: 2,
                p: 2,
                bgcolor: '#F3F4F6',
                borderRadius: 1
              }}>
                      <Typography sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                        💡 Cette langue sera utilisée pour les notifications WhatsApp et toutes les communications avec le staff.
                      </Typography>
                    </Box>
                  </Box>}

                {/* Onglet 4: Catégories */}
                {activeTab === 3 && <Box className="flex flex-col gap-4">
                    <Typography variant="h6" sx={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#E6B022',
                mb: 1
              }}>
                      Types de tâches et catégories
                    </Typography>

                    <FormControl fullWidth>
                      <InputLabel id="subType-label">{t('Task Types')}</InputLabel>
                      <Select labelId="subType-label" multiple value={values.subType} onChange={e => setFieldValue('subType', e.target.value)} label={t('Task Types')} renderValue={selected => {
                  return Array.isArray(selected) ? selected.join(', ') : '';
                }} startAdornment={<Box component="span" sx={{
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

                    <Box sx={{
                mt: 2,
                p: 2,
                bgcolor: '#F3F4F6',
                borderRadius: 1
              }}>
                      <Typography sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                        📋 Sélectionnez au moins une catégorie de tâches que ce membre du staff peut effectuer.
                      </Typography>
                    </Box>
                  </Box>}
              </Box>

              <DialogActions>
                <Button className='!text-red-500' onClick={handleClose} variant="outlined" color="error" startIcon={<X className="w-4 h-4" />}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90" variant="contained" startIcon={<User className="w-4 h-4" />}>
                  {isSubmitting ? t('Updating...') : t('Update Staff')}
                </Button>
              </DialogActions>
            </Form>}
        </Formik>
      </DialogContent>
    </Dialog>;
};
export default ModifyStaff;
