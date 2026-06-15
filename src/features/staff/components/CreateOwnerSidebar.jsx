import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, TextField, Chip, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, Users } from 'lucide-react';
import { createOwner, getCities } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
import { WHATSAPP_AI_TIER_OPTIONS, tierOptionDropdownLabel } from '../../../constants/whatsappAiTier';
import SidePanel from './SidePanel';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575'
  }
};
const StyledButton = styled(Button)(() => ({
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
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
const ResetButton = styled(Button)(() => ({
  backgroundColor: 'white',
  color: SOJORI_COLORS.gray[600],
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
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
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
  password: Yup.string().required(t('Password is required')).min(6, t('Password must be at least 6 characters')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  channelManager: Yup.string().required(t('Channel Manager is required')),
  cityId: Yup.string().required(t('City is required'))
});
const CreateOwnerSidebar = ({
  open,
  onClose,
  onOwnerCreated
}) => {
  const {
    t
  } = useTranslation('common');
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  useEffect(() => {
    const fetchCities = async () => {
      if (open) {
        setLoadingCities(true);
        try {
          const data = await getCities({
            limit: 200,
            paged: false
          });
          setCities(data || []);
        } catch (error) {} finally {
          setLoadingCities(false);
        }
      }
    };
    fetchCities();
  }, [open]);
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      // Find selected city to get rentalCityId
      const selectedCity = cities.find(city => city._id === values.cityId);
      const response = await createOwner({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        whatsapp: values.whatsapp,
        channelManager: values.channelManager,
        cityId: values.cityId,
        rentalCityId: selectedCity?.rentalCityId?.toString(),
        whatsappConversationalTier: Number(values.whatsappConversationalTier) || 2,
        role: 'Owner'
      });
      if (response.data) {
        onOwnerCreated(response.data);
        onClose();
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || error.response?.data?.error || error.message || t('Failed to create owner')
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  return <Formik initialValues={{
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    channelManager: '',
    cityId: '',
    whatsappConversationalTier: 2,
  }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
            {({
      isSubmitting,
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      setFieldValue,
      submitForm
    }) => <SidePanel open={open} onClose={onClose} title={t('Create Owner')} width={600} headerIcon={<Users size={24} color="white" strokeWidth={2.2} />} footer={<>
                            <ResetButton onClick={onClose} disabled={isSubmitting} sx={{
        flex: 1,
        fontSize: 14
      }}>
                                {t('Cancel')}
                            </ResetButton>
                            <StyledButton type="button" variant="contained" onClick={submitForm} disabled={isSubmitting} sx={{
        flex: 1,
        fontSize: 14
      }}>
                                {isSubmitting ? <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: 'center'
        }}>
                                        <CircularProgress size={16} color="inherit" />
                                        {t('Creating...')}
                                    </Box> : t('Create')}
                            </StyledButton>
                        </>}>
                    <Box sx={{
        p: 3
      }}>
                        <Form id="owner-form" className="space-y-4">
                                    {errors.submit ? <Alert severity="error" sx={{ mb: 2 }}>{errors.submit}</Alert> : null}
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
                                                {t('First Name')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="firstName" variant="outlined" size="small" InputProps={{
                startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
              }} />
                                            <ErrorMessage name="firstName" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Last Name')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="lastName" variant="outlined" size="small" InputProps={{
                startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
              }} />
                                            <ErrorMessage name="lastName" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Email')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="email" variant="outlined" type="email" size="small" />
                                            <ErrorMessage name="email" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Phone')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="phone" variant="outlined" size="small" />
                                            <ErrorMessage name="phone" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('WhatsApp')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="whatsapp" variant="outlined" size="small" />
                                            <ErrorMessage name="whatsapp" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Password')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="password" variant="outlined" type="password" size="small" />
                                            <ErrorMessage name="password" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Channel Manager')} :
                                            </label>
                                            <FormControl fullWidth size="small">
                                                <Select id="channel-manager-select" name="channelManager" value={values.channelManager} onChange={handleChange} onBlur={handleBlur}>
                                                    <MenuItem value="Channex">
                                                        <Chip label={t('Channex')} size="small" className="!bg-blue-500 !text-white" />
                                                    </MenuItem>
                                                    <MenuItem value="RU">
                                                        <Chip label={t('RU')} size="small" className="!bg-[#FFA500] !text-white" />
                                                    </MenuItem>
                                                </Select>
                                                <ErrorMessage name="channelManager" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('City')} :
                                            </label>
                                            <FormControl fullWidth size="small">
                                                <Select id="city-select" name="cityId" value={values.cityId} onChange={handleChange} onBlur={handleBlur} disabled={loadingCities}>
                                                    {cities.map(city => <MenuItem key={city._id} value={city._id}>
                                                            {city.name}
                                                        </MenuItem>)}
                                                </Select>
                                                <ErrorMessage name="cityId" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                        </div>
                                    </div>

                                    <Box sx={{ mb: 2 }}>
                                      <label
                                        style={{
                                          display: 'block',
                                          fontSize: '14px',
                                          fontWeight: '500',
                                          marginBottom: '8px',
                                        }}
                                      >
                                        IA WhatsApp invités :
                                      </label>
                                      <FormControl fullWidth size="small">
                                        <Select
                                          id="whatsapp-ai-tier-select"
                                          name="whatsappConversationalTier"
                                          value={Number(values.whatsappConversationalTier) || 2}
                                          onChange={(e) =>
                                            setFieldValue(
                                              'whatsappConversationalTier',
                                              Number(e.target.value),
                                            )
                                          }
                                        >
                                          {WHATSAPP_AI_TIER_OPTIONS.map((opt) => (
                                            <MenuItem key={opt.tier} value={opt.tier}>
                                              {tierOptionDropdownLabel(opt)}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                      <Typography sx={{ fontSize: 12, color: SOJORI_COLORS.gray[600], mt: 0.75 }}>
                                        Du moins cher au plus capable — défaut propriétaire pour la whitelist
                                        whitelist.
                                      </Typography>
                                    </Box>
                        </Form>
                    </Box>
                </SidePanel>}
        </Formik>;
};
export default CreateOwnerSidebar;
