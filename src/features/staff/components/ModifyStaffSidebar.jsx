import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { IconButton, Box, Typography, Button, FormControl, Select, MenuItem, TextField, Checkbox, ListItemText, FormHelperText, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateStaff, getOwners } from '../services/serverApi.task';
import { User, X, Globe, MapPinned, Phone, MessageSquare, Languages, Type } from 'lucide-react';
import ListingSelector from './ListingSelector';
import { toast } from 'react-toastify';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import { useTranslation } from 'react-i18next';
import { staffType } from './mock';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};
const StyledButton = styled(Button)(({
  theme
}) => ({
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
    transform: 'translateY(-1px)'
  }
}));
const ResetButton = styled(Button)(({
  theme
}) => ({
  backgroundColor: 'white',
  color: SOJORI_COLORS.gray[600],
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  border: `1px solid ${SOJORI_COLORS.gray[300]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[50],
    borderColor: SOJORI_COLORS.gray[400],
    transform: 'translateY(-1px)'
  }
}));
const validationSchema = t => Yup.object().shape({
  username: Yup.string().required(t('Username is required')),
  subType: Yup.array().min(1, t('At least one task must be selected')).required(t('Tasks are required')),
  callPhone: Yup.string().required(t('Call Phone is required')),
  whatsappPhone: Yup.string().required(t('WhatsApp Phone is required')),
  listingIds: Yup.array(),
  language: Yup.string().required(t('Language is required')),
  countryIds: Yup.array().min(1, t('At least one country must be selected')).required(t('Countries are required')),
  cityIds: Yup.array().min(1, t('At least one city must be selected')).required(t('Cities are required')),
  ownerId: Yup.string().required(t('Owner is required')),
  staffType: Yup.string().oneOf(staffType).required(t('Staff type is required')),
  pricingPerTaskType: Yup.object().optional()
});
const ModifyStaffSidebar = ({
  open,
  onClose,
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
        onClose();
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
  if (!open) return null;
  return <>
      <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1300,
      overflow: 'hidden'
    }} onClick={onClose} />

      <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '600px',
      backgroundColor: 'white',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
        backgroundColor: 'white'
      }}>
          <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: SOJORI_COLORS.gray[900],
          margin: 0
        }}>
            {t('Update Staff')}
          </h2>
          <IconButton onClick={onClose} sx={{
          color: SOJORI_COLORS.gray[600],
          '&:hover': {
            backgroundColor: SOJORI_COLORS.gray[100],
            color: SOJORI_COLORS.primary
          }
        }}>
            <X sx={{
            fontSize: '1.25rem'
          }} />
          </IconButton>
        </div>

        <Formik initialValues={{
        username: staff?.username || '',
        subType: staff?.subType || [],
        callPhone: staff?.callPhone || '',
        whatsappPhone: staff?.whatsappPhone || '',
        listingIds: staff?.listingIds || [],
        countryIds: staff?.countryIds || [],
        cityIds: staff?.cityIds || [],
        language: staff?.language || '',
        ownerId: staff?.ownerId || initialOwnerId,
        staffType: staff?.staffType,
        pricingPerTaskType: staff?.pricingPerTaskType && typeof staff.pricingPerTaskType === 'object' ? Object.fromEntries(Object.entries(staff.pricingPerTaskType)) : {}
      }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          submitForm
        }) => <>
              <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[100]}`
          }}>
                <Form id="staff-form" className="space-y-4">
                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Username')} :
                      </label>
                      <Field as={TextField} fullWidth name="username" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                      <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs" />
                    </div>
                    <RoleBasedRenderer adminOnly>
                      <div style={{
                    width: '270px'
                  }}>
                        <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                          {t('Owner')} :
                        </label>
                        <FormControl fullWidth size="small">
                          <Select id="owner-select" name="ownerId" value={values.ownerId} label={t('Owner')} onChange={e => {
                        handleChange(e);
                        setFieldValue('listingIds', []);
                      }} onBlur={handleBlur} disabled={isLoadingOwners} sx={{
                        width: '100%',
                        minWidth: '270px'
                      }}>
                            {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>
                                {owner.firstName} {owner.lastName}
                              </MenuItem>)}
                          </Select>
                          <ErrorMessage name="ownerId" component={Typography} className="text-red-500 !text-xs" />
                        </FormControl>
                      </div>
                    </RoleBasedRenderer>
                  </div>

                  {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                      {t('Listings')} :
                    </label>
                    <ListingSelector listings={values.ownerId ? listings.filter(listing => listing.ownerId === values.ownerId) : []} selectedIds={values.listingIds} onChange={newIds => setFieldValue('listingIds', newIds)} showAllOption={true} ownerSelected={!!values.ownerId} />
                    <ErrorMessage name="listingIds" component={Typography} className="text-red-500 !text-xs" />
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Countries')} :
                      </label>
                      <FormControl fullWidth size="small">
                        <Select multiple value={values.countryIds} onChange={e => {
                      const newValue = e.target.value;
                      if (newValue.includes('All')) {
                        setFieldValue('countryIds', ['All']);
                        setFieldValue('cityIds', ['All']);
                      } else {
                        setFieldValue('countryIds', newValue);
                        setFieldValue('cityIds', []);
                      }
                    }} renderValue={selected => {
                      if (selected.includes('All')) return t('All Countries');
                      return selected.map(id => countries.find(country => country._id === id)?.name || '').join(', ');
                    }} startAdornment={<Globe className="w-4 h-4 ml-2 text-gray-500" />} sx={{
                      width: '100%',
                      minWidth: '270px'
                    }}>
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
                    </div>

                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Cities')} :
                      </label>
                      <FormControl fullWidth size="small">
                        <Select multiple value={values.cityIds} onChange={e => {
                      const newValue = e.target.value;
                      if (newValue.includes('All')) {
                        setFieldValue('cityIds', ['All']);
                      } else {
                        setFieldValue('cityIds', newValue);
                      }
                    }} renderValue={selected => {
                      if (selected.includes('All')) return t('All Cities');
                      return selected.map(id => cities.find(city => city._id === id)?.name || '').join(', ');
                    }} startAdornment={<MapPinned className="w-4 h-4 ml-2 text-gray-500" />} disabled={values.countryIds.includes('All')} sx={{
                      width: '100%',
                      minWidth: '270px'
                    }}>
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
                    </div>
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Call Phone')} :
                      </label>
                      <Field as={TextField} fullWidth name="callPhone" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                      <ErrorMessage name="callPhone" component={Typography} className="text-red-500 !text-xs" />
                    </div>
                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('WhatsApp Phone')} :
                      </label>
                      <Field as={TextField} fullWidth name="whatsappPhone" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                      <ErrorMessage name="whatsappPhone" component={Typography} className="text-red-500 !text-xs" />
                    </div>
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  width: '270px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Language')} :
                      </label>
                      <FormControl fullWidth size="small">
                        <Field as={Select} id="language" name="language" startAdornment={<Box component="span" sx={{
                      mr: 1
                    }}>
                              <Languages className="w-4 h-4 text-gray-500" />
                            </Box>} sx={{
                      width: '100%',
                      minWidth: '270px'
                    }}>
                          {languages.map(lang => <MenuItem key={lang._id} value={lang.name}>
                              {lang.name}
                            </MenuItem>)}
                        </Field>
                        <ErrorMessage name="language" component={Typography} variant="error" className="text-red-500 !text-xs" />
                      </FormControl>
                    </div>
                    <div style={{
                  width: '270px',
                  marginBottom: '16px'
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px'
                  }}>
                        {t('Staff Type')} :
                      </label>
                      <FormControl fullWidth size="small">
                        <Select name="staffType" value={values.staffType} onChange={handleChange}>
                          {['salaried', 'Self-employed', 'Company', 'Individual activities'].map(type => <MenuItem value={type} key={type}>
                              {t(type)}
                            </MenuItem>)}
                        </Select>
                      </FormControl>
                      <ErrorMessage name="staffType" component={Typography} className="text-red-500 !text-xs" />
                    </div>
                  </div>
                  <div style={{
                width: '270px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                      {t('Task Types')} :
                    </label>
                    <FormControl fullWidth size="small">
                      <Select multiple value={values.subType} onChange={e => setFieldValue('subType', e.target.value)} renderValue={selected => {
                    return Array.isArray(selected) ? selected.join(', ') : '';
                  }} startAdornment={<Box component="span" sx={{
                    mr: 1
                  }}>
                            <Type className="w-4 h-4 text-gray-500" />
                          </Box>} sx={{
                    width: '100%',
                    minWidth: '270px'
                  }}>
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
                  </div>
                  {['Self-employed', 'Company', 'Individual activities'].includes(values.staffType) && <div style={{
                marginTop: 8,
                marginBottom: 16
              }}>
                      <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: 8
                }}>
                        {t('Pricing per task type')} :
                      </label>

                      {(values.subType || []).length === 0 ? <Typography variant="body2" color="text.secondary">
                          {t('Select at least one task type to set prices')}
                        </Typography> : <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px',
                  gap: '8px 12px',
                  alignItems: 'center'
                }}>
                          {(values.subType || []).map(taskKey => <React.Fragment key={taskKey}>
                              <Typography variant="body2" sx={{
                      fontWeight: 500
                    }}>
                                {taskKey}
                              </Typography>
                              <TextField size="small" type="number" slotProps={{
                      htmlInput: {
                        step: '0.01',
                        min: '0'
                      }
                    }} placeholder={t('Price')} value={values.pricingPerTaskType?.[taskKey] === 0 || values.pricingPerTaskType?.[taskKey] === '' ? values.pricingPerTaskType?.[taskKey] : values.pricingPerTaskType?.[taskKey] ?? ''} onChange={e => {
                      const raw = e.target.value;
                      const next = raw === '' ? '' : Number.isNaN(Number(raw)) ? '' : Number(raw);
                      setFieldValue('pricingPerTaskType', {
                        ...(values.pricingPerTaskType || {}),
                        [taskKey]: next
                      });
                    }} />
                            </React.Fragment>)}
                        </div>}
                    </div>}
                </Form>
              </div>

              <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: `1px solid ${SOJORI_COLORS.gray[200]}`,
            backgroundColor: 'white'
          }}>
                <ResetButton onClick={onClose} disabled={isSubmitting} sx={{
              flex: 1
            }}>
                  {t('Cancel')}
                </ResetButton>
                <StyledButton onClick={submitForm} disabled={isSubmitting} sx={{
              flex: 1
            }}>
                  {isSubmitting ? <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                      <CircularProgress size={16} color="inherit" />
                      {t('Updating...')}
                    </div> : t('Update Staff')}
                </StyledButton>
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default ModifyStaffSidebar;
