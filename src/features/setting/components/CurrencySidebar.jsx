import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { IconButton, TextField, Button, MenuItem, Select, InputLabel, FormControl, Switch, FormControlLabel, Grid, CircularProgress, Box, Typography, Chip, Autocomplete } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { createCurrency, updateCurrency } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
const CurrencySidebar = ({
  open,
  onClose,
  onSave,
  existingCurrency = null,
  languages = [],
  canUpdate,
  canCreate
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const validationSchema = Yup.object({
    currencyName: Yup.string().required(t('Required')),
    currencyCode: Yup.string().required(t('Required')),
    currencySymbol: Yup.string().required(t('Required')),
    languageId: Yup.array().min(1, t('At_least_one_language_required')),
    min: Yup.number().min(0, t('Must_be_positive')).required(t('Required')),
    max: Yup.number().min(Yup.ref('min'), t('Max_must_be_greater_than_min')).required(t('Required')),
    madRate: Yup.number().positive().nullable().optional(),
  });
  const getInitialValues = () => {
    const baseValues = {
      currencyName: '',
      currencyCode: '',
      currencySymbol: '',
      languageId: [],
      useInTranslate: false,
      defaultCurrency: false,
      min: 0,
      max: 1000,
      madRate: '',
    };
    if (!existingCurrency) {
      return baseValues;
    }
    return {
      ...baseValues,
      ...existingCurrency,
      languageId: existingCurrency.languageId || [],
      madRate: existingCurrency.madRate ?? '',
    };
  };
  const initialValues = getInitialValues();
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open]);
  const handleSave = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const currencyData = {
        currencyName: values.currencyName,
        currencyCode: values.currencyCode,
        currencySymbol: values.currencySymbol,
        languageId: values.languageId,
        useInTranslate: values.useInTranslate,
        defaultCurrency: values.defaultCurrency,
        min: Number(values.min),
        max: Number(values.max),
        madRate:
          values.madRate === '' || values.madRate == null
            ? null
            : Number(values.madRate),
      };
      let savedCurrency;
      if (existingCurrency) {
        const currencyId = existingCurrency._id || existingCurrency.id;
        if (!currencyId) {
          throw new Error(t('Currency_ID_is_missing'));
        }
        savedCurrency = await updateCurrency(currencyId, currencyData);
      } else {
        savedCurrency = await createCurrency(currencyData);
      }
      const currencyDoc = savedCurrency?.currency || savedCurrency;
      onSave(currencyDoc);
      onClose();
      toast.success(t(existingCurrency ? 'Currency_updated_successfully' : 'Currency_created_successfully'));
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
        toast.error(error.response.data.message);
      } else {
        setErrorMessage(error.message || t('Failed_to_save_currency'));
        toast.error(error.message || t('Failed_to_save_currency'));
      }
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };
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
        borderBottom: '1px solid #d1d5db',
        backgroundColor: 'white'
      }}>
          <h2 style={{
          fontSize: '22px',
          fontWeight: '500',
          color: '#374151',
          margin: 0
        }}>
            {existingCurrency ? t('Update_Currency') : t('Create_New_Currency')}
          </h2>
          <IconButton onClick={onClose} sx={{
          '&:hover': {
            backgroundColor: '#f3f4f6'
          }
        }}>
            <CloseIcon sx={{
            fontSize: '1.25rem'
          }} />
          </IconButton>
        </div>

        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSave} enableReinitialize={true}>
          {({
          values,
          setFieldValue,
          errors,
          touched,
          isSubmitting,
          submitForm
        }) => <>
              <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#00b4b4 #f1f1f1'
          }}>
                <Form>
                  {errorMessage && <Typography color="error" sx={{
                mb: 2
              }}>
                      {errorMessage}
                    </Typography>}

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Currency_Name')} :
                      </label>
                      <Field as={TextField} fullWidth name="currencyName" size="small" error={Boolean(errors.currencyName && touched.currencyName)} helperText={errors.currencyName && touched.currencyName ? t(errors.currencyName) : ''} />
                    </div>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Currency_Code')} :
                      </label>
                      <Field as={TextField} fullWidth name="currencyCode" size="small" error={Boolean(errors.currencyCode && touched.currencyCode)} helperText={errors.currencyCode && touched.currencyCode ? t(errors.currencyCode) : ''} />
                    </div>
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Currency_Symbol')} :
                      </label>
                      <Field as={TextField} fullWidth name="currencySymbol" size="small" error={Boolean(errors.currencySymbol && touched.currencySymbol)} helperText={errors.currencySymbol && touched.currencySymbol ? t(errors.currencySymbol) : ''} />
                    </div>
                  </div>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                      {t('Languages')} :
                    </label>
                    <Autocomplete multiple options={languages} getOptionLabel={option => option.name} value={languages.filter(lang => values.languageId.includes(lang._id))} onChange={(event, newValue) => {
                  setFieldValue('languageId', newValue.map(lang => lang._id));
                }} renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant="outlined" label={option.name} {...getTagProps({
                  index
                })} key={option._id} />)} renderInput={params => <TextField {...params} size="small" error={Boolean(errors.languageId && touched.languageId)} helperText={errors.languageId && touched.languageId ? t(errors.languageId) : ''} />} />
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Min_Value')} :
                      </label>
                      <Field as={TextField} fullWidth name="min" type="number" size="small" error={Boolean(errors.min && touched.min)} helperText={errors.min && touched.min ? t(errors.min) : ''} />
                    </div>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                        {t('Max_Value')} :
                      </label>
                      <Field as={TextField} fullWidth name="max" type="number" size="small" error={Boolean(errors.max && touched.max)} helperText={errors.max && touched.max ? t(errors.max) : ''} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                    }}>
                      Taux → MAD (1 {values.currencyCode || 'devise'} = X MAD)
                    </label>
                    <Field
                      as={TextField}
                      fullWidth
                      name="madRate"
                      type="number"
                      size="small"
                      placeholder="ex. 10.67 pour EUR"
                      inputProps={{ step: '0.0001', min: '0' }}
                      error={Boolean(errors.madRate && touched.madRate)}
                      helperText={
                        errors.madRate && touched.madRate
                          ? t(errors.madRate)
                          : 'Utilisé pour le push prix RU/Airbnb. MAD = 1. EUR ≈ 10.67 aujourd’hui. Laisser vide si non applicable.'
                      }
                    />
                  </div>

                  <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                    <div style={{
                  flex: 1
                }}>
                      <FormControlLabel control={<Field as={Switch} name="useInTranslate" checked={values.useInTranslate} onChange={e => setFieldValue('useInTranslate', e.target.checked)} />} label={t('Use_in_Translate')} />
                    </div>
                    <div style={{
                  flex: 1
                }}>
                      <FormControlLabel control={<Field as={Switch} name="defaultCurrency" checked={values.defaultCurrency} onChange={e => setFieldValue('defaultCurrency', e.target.checked)} />} label={t('Default_Currency')} />
                    </div>
                  </div>
                </Form>
              </div>

              <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'white'
          }}>
                <Button variant="outlined" onClick={onClose} disabled={isSubmitting} style={{
              flex: 1
            }} sx={{
              borderColor: '#d1d5db',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb'
              },
              '&:disabled': {
                borderColor: '#e5e7eb',
                color: '#9ca3af'
              }
            }}>
                  {t('Cancel')}
                </Button>
                {(existingCurrency ? canUpdate : canCreate) && <Button variant="contained" onClick={submitForm} disabled={isSubmitting || isLoading} style={{
              flex: 1
            }} className="!text-white !bg-medium-aquamarine">
                    {isSubmitting || isLoading ? <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                        <CircularProgress size={16} color="inherit" />
                        {existingCurrency ? t('Updating...') : t('Creating...')}
                      </div> : existingCurrency ? t('Update_Currency') : t('Create_Currency')}
                  </Button>}
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default CurrencySidebar;
