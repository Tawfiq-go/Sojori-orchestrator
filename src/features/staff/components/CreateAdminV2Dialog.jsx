import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, IconButton } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X, User } from 'lucide-react';
import { createAdminV2 } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
import { setLocale } from 'yup';
const yupT = key => {
  return key;
};
setLocale({
  mixed: {
    required: ({
      path
    }) => yupT(`${path} is required`)
  },
  string: {
    email: yupT('Invalid email'),
    min: ({
      min
    }) => yupT(`Password must be at least ${min} characters`)
  }
});
const validationSchema = Yup.object().shape({
  firstName: Yup.string().required(yupT('First name is required')),
  lastName: Yup.string().required(yupT('Last name is required')),
  email: Yup.string().email().required(yupT('Email is required')),
  password: Yup.string().required(yupT('Password is required')).min(6),
  phone: Yup.string().required(yupT('Phone is required')),
  whatsapp: Yup.string()
});
const CreateAdminV2Dialog = ({
  open,
  onClose,
  onAdminCreated
}) => {
  const {
    t
  } = useTranslation('common');
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      const response = await createAdminV2({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        whatsapp: values.whatsapp
      });
      if (response.data) {
        onAdminCreated(response.data);
        onClose();
      }
    } catch (error) {
      setErrors({
        submit: t('Failed to create admin')
      });
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
                <Typography variant="h6" className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('Create Admin')}
                </Typography>
                <IconButton onClick={onClose} className="text-white">
                    <X className="w-5 h-5" />
                </IconButton>
            </DialogTitle>

            <Formik initialValues={{
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      whatsapp: ''
    }} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        isSubmitting
      }) => <Form>
                        <DialogContent className="!space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="firstName" label={t('First Name')} value={values.firstName} onChange={handleChange} onBlur={handleBlur} error={touched.firstName && Boolean(errors.firstName)} helperText={touched.firstName && errors.firstName} className="col-span-1" />

                                <TextField fullWidth name="lastName" label={t('Last Name')} value={values.lastName} onChange={handleChange} onBlur={handleBlur} error={touched.lastName && Boolean(errors.lastName)} helperText={touched.lastName && errors.lastName} className="col-span-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="email" label={t('Email')} type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={touched.email && Boolean(errors.email)} helperText={touched.email && errors.email} className="col-span-1" />

                                <TextField fullWidth name="phone" label={t('Phone')} value={values.phone} onChange={handleChange} onBlur={handleBlur} error={touched.phone && Boolean(errors.phone)} helperText={touched.phone && errors.phone} className="col-span-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField fullWidth name="whatsapp" label={t('WhatsApp')} value={values.whatsapp} onChange={handleChange} onBlur={handleBlur} error={touched.whatsapp && Boolean(errors.whatsapp)} helperText={touched.whatsapp && errors.whatsapp} className="col-span-1" />
                                <TextField fullWidth name="password" label={t('Password')} type="password" value={values.password} onChange={handleChange} onBlur={handleBlur} error={touched.password && Boolean(errors.password)} helperText={touched.password && errors.password} />
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
export default CreateAdminV2Dialog;
