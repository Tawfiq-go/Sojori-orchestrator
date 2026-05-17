import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, IconButton, FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress, Alert } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X, User } from 'lucide-react';
import { createOwner, getCities } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
const validationSchema = t => Yup.object().shape({
  elevatedAuthEmail: Yup.string().email(t('Invalid email')).required(t('ownerCreate_elevated_email_required')),
  elevatedAuthPassword: Yup.string().required(t('ownerCreate_elevated_password_required')),
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
  password: Yup.string().required(t('Password is required')).min(6, t('Password must be at least 6 characters')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  channelManager: Yup.string().required(t('Channel Manager is required')),
  cityId: Yup.string().required(t('City is required'))
});
const CreateOwnerDialog = ({
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
        role: 'Owner'
      }, {
        email: values.elevatedAuthEmail,
        password: values.elevatedAuthPassword
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
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
                <Typography variant="h6" className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('Create Owner')}
                </Typography>
                <IconButton onClick={onClose} className="text-white">
                    <X className="w-5 h-5" />
                </IconButton>
            </DialogTitle>

            <Formik initialValues={{
      elevatedAuthEmail: '',
      elevatedAuthPassword: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      whatsapp: '',
      channelManager: '',
      cityId: ''
    }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
                {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        isSubmitting
      }) => <Form>
                        <DialogContent className="!space-y-4">
                            {errors.submit ? <Alert severity="error">{errors.submit}</Alert> : null}
                            <Typography variant="subtitle2" className="font-semibold">{t('ownerCreate_elevated_section_title')}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">{t('ownerCreate_elevated_hint')}</Typography>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="elevatedAuthEmail" label={t('ownerCreate_elevated_email')} type="email" value={values.elevatedAuthEmail} onChange={handleChange} onBlur={handleBlur} error={touched.elevatedAuthEmail && Boolean(errors.elevatedAuthEmail)} helperText={touched.elevatedAuthEmail && errors.elevatedAuthEmail} autoComplete="username" />
                                <TextField fullWidth name="elevatedAuthPassword" label={t('ownerCreate_elevated_password')} type="password" value={values.elevatedAuthPassword} onChange={handleChange} onBlur={handleBlur} error={touched.elevatedAuthPassword && Boolean(errors.elevatedAuthPassword)} helperText={touched.elevatedAuthPassword && errors.elevatedAuthPassword} autoComplete="current-password" />
                            </div>
                            <Typography variant="subtitle2" className="font-semibold pt-2">{t('ownerCreate_new_owner_section_title')}</Typography>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="firstName" label={t('First Name')} value={values.firstName} onChange={handleChange} onBlur={handleBlur} error={touched.firstName && Boolean(errors.firstName)} helperText={touched.firstName && errors.firstName} className="col-span-1" />
                                <TextField fullWidth name="lastName" label={t('Last Name')} value={values.lastName} onChange={handleChange} onBlur={handleBlur} error={touched.lastName && Boolean(errors.lastName)} helperText={touched.lastName && errors.lastName} className="col-span-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="email" label={t('Email')} type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={touched.email && Boolean(errors.email)} helperText={touched.email && errors.email} className="col-span-1" />
                                <TextField fullWidth name="phone" label={t('Phone')} value={values.phone} onChange={handleChange} onBlur={handleBlur} error={touched.phone && Boolean(errors.phone)} helperText={touched.phone && errors.phone} className="col-span-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="whatsapp" label={t('Whatsapp')} value={values.whatsapp} onChange={handleChange} onBlur={handleBlur} error={touched.whatsapp && Boolean(errors.whatsapp)} helperText={touched.whatsapp && errors.whatsapp} className="col-span-1" />
                                <TextField fullWidth name="password" label={t('Password')} type="password" value={values.password} onChange={handleChange} onBlur={handleBlur} error={touched.password && Boolean(errors.password)} helperText={touched.password && errors.password} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormControl fullWidth error={touched.channelManager && Boolean(errors.channelManager)}>
                                    <InputLabel>{t('Channel Manager')}</InputLabel>
                                    <Select name="channelManager" value={values.channelManager} label={t('Channel Manager')} onChange={handleChange} onBlur={handleBlur}>
                                        <MenuItem value="Channex">
                                            <Chip label={t('Channex')} size="small" className="!bg-blue-500 !text-white" />
                                        </MenuItem>
                                        <MenuItem value="RU">
                                            <Chip label={t('RU')} size="small" className="!bg-[#FFA500] !text-white" />
                                        </MenuItem>
                                    </Select>
                                    {touched.channelManager && errors.channelManager && <Typography variant="caption" color="error">
                                            {errors.channelManager}
                                        </Typography>}
                                </FormControl>
                                <FormControl fullWidth error={touched.cityId && Boolean(errors.cityId)}>
                                    <InputLabel>{t('City')}</InputLabel>
                                    <Select name="cityId" value={values.cityId} label={t('City')} onChange={handleChange} onBlur={handleBlur} disabled={loadingCities} startAdornment={loadingCities && <CircularProgress size={20} color="inherit" />} MenuProps={{
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
                                    {touched.cityId && errors.cityId && <Typography variant="caption" color="error">
                                            {errors.cityId}
                                        </Typography>}
                                </FormControl>
                            </div>
                        </DialogContent>
                        <DialogActions className="p-4">
                            <Button onClick={onClose} variant="outlined" className="!text-gray-500 !border-gray-500">
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting} className="!bg-medium-aquamarine !text-white">
                                {t('Create')}
                            </Button>
                        </DialogActions>
                    </Form>}
            </Formik>
        </Dialog>;
};
export default CreateOwnerDialog;
