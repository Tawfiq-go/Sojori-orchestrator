import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, IconButton, FormGroup, FormControlLabel, Checkbox, Select, MenuItem, Chip, OutlinedInput, Box, FormControl, InputLabel, Stack, Card, CardContent, Avatar, CircularProgress } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X, User } from 'lucide-react';
import { updateOwner, getCities, getCurrencies } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
const validationSchema = t => Yup.object().shape({
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  selectedModules: Yup.array().min(1, t('Select at least one module')),
  status: Yup.string().oneOf(['active', 'inactive', 'suspended']).required(t('Status is required')),
  channelManager: Yup.string().required(t('Channel Manager is required')),
  cityId: Yup.string().required(t('City is required')),
  settings: Yup.object().shape({
    language: Yup.string().required(t('Language is required')),
    currency: Yup.string().required(t('Currency is required'))
  }),
  permissions: Yup.array().of(Yup.object().shape({
    module: Yup.string().required(),
    actions: Yup.array().of(Yup.string())
  }))
});
const UpdateOwnerDialog = ({
  open,
  onClose,
  owner,
  onOwnerUpdated,
  modules
}) => {
  const {
    t
  } = useTranslation('common');
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  useEffect(() => {
    const fetchCitiesAndCurrencies = async () => {
      if (open) {
        setLoadingCities(true);
        setLoadingCurrencies(true);
        try {
          const data = await getCities({
            limit: 200,
            paged: false
          });
          setCities(data || []);
        } catch (error) {} finally {
          setLoadingCities(false);
        }
        try {
          const currencyData = await getCurrencies();
          // currencyData.data should be an array of currency objects
          setCurrencies(currencyData.data || []);
        } catch (error) {} finally {
          setLoadingCurrencies(false);
        }
      }
    };
    fetchCitiesAndCurrencies();
  }, [open]);
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      // Find selected city to get rentalCityId
      const selectedCity = cities.find(city => city._id === values.cityId);
      const response = await updateOwner(owner._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        whatsapp: values.whatsapp,
        status: values.status,
        channelManager: values.channelManager,
        cityId: values.cityId,
        rentalCityId: selectedCity?.rentalCityId?.toString(),
        settings: values.settings,
        permissions: values.permissions,
        subscriptionModules: values.selectedModules.map(module => ({
          module,
          label: modules[module].label,
          price: modules[module].price
        }))
      });
      if (response.data && response.data.account) {
        onOwnerUpdated(response.data.account);
        onClose();
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || t('Failed to update owner')
      });
    } finally {
      setSubmitting(false);
    }
  };
  const initialModules = owner?.subscriptionModules?.map(m => m.module) || [];
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
        <Typography variant="h6" className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('Update Owner')}
        </Typography>
        <IconButton onClick={onClose} className="text-white">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <Formik initialValues={{
      firstName: owner?.firstName || '',
      lastName: owner?.lastName || '',
      phone: owner?.phone || '',
      whatsapp: owner?.whatsapp || '',
      selectedModules: initialModules,
      status: owner?.status || 'active',
      channelManager: owner?.channelManager || '',
      cityId: owner?.cityId || '',
      settings: owner?.settings || {
        language: 'en',
        currency: 'USD'
      },
      permissions: owner?.permissions || []
    }} validationSchema={validationSchema(t)} onSubmit={handleSubmit} enableReinitialize>
        {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        isSubmitting,
        setFieldValue
      }) => <Form>
            <DialogContent className="!space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <TextField fullWidth name="firstName" label={t('First Name')} value={t(values.firstName)} onChange={handleChange} onBlur={handleBlur} error={touched.firstName && Boolean(errors.firstName)} helperText={touched.firstName && errors.firstName} />

                <TextField fullWidth name="lastName" label={t('Last Name')} value={t(values.lastName)} onChange={handleChange} onBlur={handleBlur} error={touched.lastName && Boolean(errors.lastName)} helperText={touched.lastName && errors.lastName} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField fullWidth name="phone" label={t('Phone')} value={t(values.phone)} onChange={handleChange} onBlur={handleBlur} error={touched.phone && Boolean(errors.phone)} helperText={touched.phone && errors.phone} />

                <TextField fullWidth name="whatsapp" label={t('WhatsApp')} value={t(values.whatsapp)} onChange={handleChange} onBlur={handleBlur} error={touched.whatsapp && Boolean(errors.whatsapp)} helperText={touched.whatsapp && errors.whatsapp} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormControl fullWidth size="middle">
                  <InputLabel>{t('City')}</InputLabel>
                  <Select name="cityId" value={values.cityId} onChange={handleChange} onBlur={handleBlur} label={t('City')} disabled={loadingCities} startAdornment={loadingCities && <CircularProgress size={20} color="inherit" />} MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 250
                  }
                }
              }}>
                    {cities.map(city => <MenuItem key={city._id} value={city._id}>
                        {city.name}
                      </MenuItem>)}
                  </Select>
                  {touched.cityId && errors.cityId && <Typography color="error" variant="caption">
                      {errors.cityId}
                    </Typography>}
                </FormControl>

                <FormControl fullWidth size="middle">
                  <InputLabel>{t('Channel Manager')}</InputLabel>
                  <Select name="channelManager" value={values.channelManager} onChange={handleChange} onBlur={handleBlur} label={t('Channel Manager')}>
                    <MenuItem value="Channex">
                      <Chip label={t('Channex')} size="small" className="!text-white" />
                    </MenuItem>
                    <MenuItem value="RU">
                      <Chip label={t('RU')} size="small" className="!text-white" />
                    </MenuItem>
                  </Select>
                  {touched.channelManager && errors.channelManager && <Typography color="error" variant="caption">
                      {errors.channelManager}
                    </Typography>}
                </FormControl>
              </div>

              <Typography variant="subtitle1" className="mb-4 font-medium">
                {t('Settings')}
              </Typography>
              <div className="grid grid-cols-2 gap-4">
                <FormControl fullWidth size="middle">
                  <InputLabel>{t('Language')}</InputLabel>
                  <Select name="settings.language" value={values.settings.language} onChange={handleChange} onBlur={handleBlur} label={t('Language')} error={touched.settings?.language && Boolean(errors.settings?.language)}>
                    <MenuItem value="en">{t('English')}</MenuItem>
                    <MenuItem value="fr">{t('Français')}</MenuItem>
                    <MenuItem value="es">{t('Español')}</MenuItem>
                  </Select>
                  {touched.settings?.language && errors.settings?.language && <Typography color="error" variant="caption">
                      {errors.settings?.language}
                    </Typography>}
                </FormControl>

                <FormControl fullWidth size="middle">
                  <InputLabel>{t('Currency')}</InputLabel>
                  <Select name="settings.currency" value={values.settings.currency} onChange={e => setFieldValue('settings.currency', e.target.value)} onBlur={handleBlur} label={t('Currency')} disabled={loadingCurrencies} startAdornment={loadingCurrencies && <CircularProgress size={20} color="inherit" />}>
                    {currencies.map(currency => <MenuItem key={currency._id} value={currency.currencyCode}>
                        {currency.currencyCode}
                      </MenuItem>)}
                  </Select>
                  {touched.settings?.currency && errors.settings?.currency && <Typography color="error" variant="caption">
                      {errors.settings?.currency}
                    </Typography>}
                </FormControl>
              </div>

              <Typography variant="subtitle1" className="mb-4 font-medium">
                {t('Status')}
              </Typography>
              <FormControl fullWidth size="middle">
                <InputLabel>{t('Account Status')}</InputLabel>
                <Select name="status" value={values.status} onChange={handleChange} label={t('Account Status')}>
                  <MenuItem value="active">
                    <Chip label={t('Active')} size="small" color="success" variant="outlined" />
                  </MenuItem>
                  <MenuItem value="inactive">
                    <Chip label={t('Inactive')} size="small" color="warning" variant="outlined" />
                  </MenuItem>
                  <MenuItem value="suspended">
                    <Chip label={t('Suspended')} size="small" color="error" variant="outlined" />
                  </MenuItem>
                </Select>
              </FormControl>


      
              <Typography variant="subtitle1" className="mb-4 font-medium">
                {t('Subscription Modules')}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>{t('Selected Modules')}</InputLabel>
                <Select multiple value={values.selectedModules} onChange={e => {
              const newSelectedModules = e.target.value;
              setFieldValue('selectedModules', newSelectedModules);
              const newPermissions = newSelectedModules.map(moduleKey => ({
                module: moduleKey,
                actions: ['get', 'create', 'update']
              }));
              setFieldValue('permissions', newPermissions);
            }} input={<OutlinedInput label={t('Selected Modules')} />} renderValue={selected => <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5
            }}>
                      {selected.map(value => <Chip key={value} label={modules[value].label} size="small" className="!bg-medium-aquamarine !text-white" />)}
                    </Box>}>
                  {Object.entries(modules).map(([key, {
                label
              }]) => <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>)}
                </Select>
                {touched.selectedModules && errors.selectedModules && <Typography color="error" variant="caption">
                    {errors.selectedModules}
                  </Typography>}
              </FormControl>

              {values.selectedModules.length > 0 && <>
                  <Typography variant="subtitle1" className="mb-2 font-medium flex items-center gap-2">
                    <Box sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#00b4b4'
              }} />
                    {t('Active Permissions')}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{
              flexWrap: 'wrap',
              gap: '8px !important',
              p: 2,
              borderRadius: 1,
              background: 'linear-gradient(145deg, rgba(0, 180, 180, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 180, 180, 0.1)'
            }}>
                    {Object.entries(modules).filter(([moduleKey]) => values.selectedModules.includes(moduleKey)).map(([moduleKey, moduleData]) => <Box key={moduleKey} sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'white',
                borderRadius: '8px',
                py: 0.75,
                px: 1.5,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                border: '1px solid rgba(0, 180, 180, 0.15)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(0,180,180,0.1)'
                }
              }}>
                          <Avatar sx={{
                  width: 20,
                  height: 20,
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(0, 180, 180, 0.1)',
                  color: '#00b4b4',
                  fontWeight: 600
                }}>
                            {moduleData.label.charAt(0)}
                          </Avatar>
                          <Typography sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#2d3748',
                  textTransform: 'capitalize'
                }}>
                            {moduleData.label}
                          </Typography>
                          <Box sx={{
                  position: 'absolute',
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  backgroundColor: '#00b4b4',
                  right: 6,
                  top: 6
                }} />
                        </Box>)}
                  </Stack>
                </>}
            </DialogContent>

            <DialogActions className="p-4">
              <Button onClick={onClose} variant="outlined" className="!text-gray-500 !border-gray-500">
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} className="!bg-medium-aquamarine !text-white">
                {t('Update')}
              </Button>
            </DialogActions>
          </Form>}
      </Formik>
    </Dialog>;
};
export default UpdateOwnerDialog;
