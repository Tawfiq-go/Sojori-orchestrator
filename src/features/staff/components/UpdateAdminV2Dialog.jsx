import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, IconButton, Select, MenuItem, Chip, FormControl, InputLabel, Stack } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X, User } from 'lucide-react';
import { updateAdminV2 } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
const validationSchema = Yup.object().shape({
  firstName: Yup.string().required(t => t('First name is required')),
  lastName: Yup.string().required(t => t('Last name is required')),
  phone: Yup.string().required(t => t('Phone is required')),
  whatsapp: Yup.string(),
  banned: Yup.boolean(),
  deleted: Yup.boolean(),
  settings: Yup.object().shape({
    language: Yup.string().required(t => t('Language is required')),
    currency: Yup.string().required(t => t('Currency is required'))
  })
});
const UpdateAdminV2Dialog = ({
  open,
  onClose,
  admin,
  onAdminUpdated
}) => {
  const {
    t
  } = useTranslation('common');
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      const response = await updateAdminV2(admin._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        whatsapp: values.whatsapp,
        banned: values.banned,
        deleted: values.deleted,
        settings: values.settings
      });
      if (response.data && response.data.account) {
        const updateAdmin = {
          ...response.data.account
        };
        onAdminUpdated(updateAdmin);
        onClose();
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || t('Failed to update admin')
      });
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
                <Typography variant="h6" className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('Update Admin')}
                </Typography>
                <IconButton onClick={onClose} className="text-white">
                    <X className="w-5 h-5" />
                </IconButton>
            </DialogTitle>

            <Formik initialValues={{
      firstName: admin?.firstName || '',
      lastName: admin?.lastName || '',
      phone: admin?.phone || '',
      whatsapp: admin?.whatsapp || '',
      banned: admin?.banned || false,
      deleted: admin?.deleted || false,
      settings: admin?.settings || {
        language: 'en',
        currency: 'USD'
      }
    }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
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
                                <TextField fullWidth name="firstName" label={t('First Name')} value={values.firstName} onChange={handleChange} onBlur={handleBlur} error={touched.firstName && Boolean(errors.firstName)} helperText={touched.firstName && errors.firstName} />

                                <TextField fullWidth name="lastName" label={t('Last Name')} value={values.lastName} onChange={handleChange} onBlur={handleBlur} error={touched.lastName && Boolean(errors.lastName)} helperText={touched.lastName && errors.lastName} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="phone" label={t('Phone')} value={values.phone} onChange={handleChange} onBlur={handleBlur} error={touched.phone && Boolean(errors.phone)} helperText={touched.phone && errors.phone} />

                                <TextField fullWidth name="whatsapp" label={t('WhatsApp')} value={values.whatsapp} onChange={handleChange} onBlur={handleBlur} error={touched.whatsapp && Boolean(errors.whatsapp)} helperText={touched.whatsapp && errors.whatsapp} />
                            </div>

                            <Typography variant="subtitle1" className="mb-4 font-medium">
                                {t('Settings')}
                            </Typography>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth size="small" name="settings.language" label={t('Language')} value={values.settings.language} onChange={handleChange} onBlur={handleBlur} error={touched.settings?.language && Boolean(errors.settings?.language)} helperText={touched.settings?.language && errors.settings?.language} />

                                <TextField fullWidth size="small" name="settings.currency" label={t('Currency')} value={values.settings.currency} onChange={handleChange} onBlur={handleBlur} error={touched.settings?.currency && Boolean(errors.settings?.currency)} helperText={touched.settings?.currency && errors.settings?.currency} />
                            </div>

                            <Typography variant="subtitle1" className="mb-4 font-medium">
                                {t('Account Status')}
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>{t('Ban Status')}</InputLabel>
                                    <Select value={values.banned ? 'banned' : 'active'} onChange={e => {
                setFieldValue('banned', e.target.value === 'banned');
              }} label={t('Ban Status')}>
                                        <MenuItem value="active">
                                            <Chip label={t('Active')} size="small" color="success" variant="outlined" />
                                        </MenuItem>
                                        <MenuItem value="banned">
                                            <Chip label={t('Banned')} size="small" color="error" variant="outlined" />
                                        </MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>{t('Delete Status')}</InputLabel>
                                    <Select value={values.deleted ? 'deleted' : 'active'} onChange={e => {
                setFieldValue('deleted', e.target.value === 'deleted');
              }} label={t('Delete Status')}>
                                        <MenuItem value="active">
                                            <Chip label={t('Active')} size="small" color="success" variant="outlined" />
                                        </MenuItem>
                                        <MenuItem value="deleted">
                                            <Chip label={t('Deleted')} size="small" color="default" variant="outlined" />
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
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
export default UpdateAdminV2Dialog;
