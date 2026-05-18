import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Typography, IconButton, Autocomplete, CircularProgress, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { updateCitiesMapping, getcities } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
const AddCityMappingDialog = ({
  open,
  onClose,
  cities,
  func
}) => {
  const {
    t
  } = useTranslation('common');
  const [citiesMapping, setCitiesMapping] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const validationSchema = Yup.object().shape({
    cityId: Yup.string().required(t('cityId is required'))
  });
  const fetchCitiesData = async () => {
    try {
      const data = await getcities();
      setCitiesMapping(data.data.cities);
    } catch (error) {}
  };
  useEffect(() => {
    fetchCitiesData();
  }, []);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const newMapping = cities.map(city => city.city._id);
    const formData = {
      citiesMapping: [...newMapping, values?.cityId]
    };
    try {
      await updateCitiesMapping(formData);
      func();
      resetForm();
      onClose();
      toast.success(t("City added successfully"));
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while adding the city'));
    } finally {
      setIsLoading(false);
      setSubmitting(false);
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
      zIndex: 1300
    }} onClick={onClose} />
      <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '600px',
      backgroundColor: '#ffffff',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }} aria-labelledby="add-city-mapping-title">
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 id="add-city-mapping-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
            {t('Add City')}
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
        <Formik initialValues={{
        cityId: ''
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid
        }) => <>
              <Box style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#00b4b4 #f1f1f1'
          }} sx={{
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#00b4b4',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#009999'
            }
          }}>
                {errorMessage && <Typography variant="body2" sx={{
              color: '#EF4444',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'center',
              marginBottom: '16px'
            }}>
                    {errorMessage}
                  </Typography>}
                <Form id="add-city-mapping-form" encType="multipart/form-data">
                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                      {t('City')}
                    </Typography>
                    {citiesMapping && citiesMapping?.length > 0 && <Autocomplete disablePortal id="cityId" options={citiesMapping} getOptionLabel={option => option.name} filterOptions={(options, {
                  inputValue
                }) => {
                  const idsToFilter = cities.map(item => item?.city?._id);
                  return options.filter(city => !idsToFilter.includes(city?._id));
                }} onChange={(event, value) => {
                  setFieldValue('cityId', value ? value._id : '');
                }} renderInput={params => <TextField {...params} label={t('City')} sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: '14px',
                    color: '#374151'
                  }
                }} />} />}
                    <ErrorMessage name="cityId" component="div" style={{
                  color: '#EF4444',
                  fontSize: '14px',
                  marginTop: '8px'
                }} />
                  </div>
                </Form>
              </Box>
              <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            paddingBottom: '20px'
          }}>
                <Button variant="outlined" onClick={onClose} disabled={isSubmitting || isLoading} sx={{
              flex: 1,
              borderColor: '#d1d5db',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb'
              },
              '&:disabled': {
                borderColor: '#e5e7eb',
                color: '#9ca3af'
              },
              textTransform: 'none'
            }} startIcon={<CloseIcon sx={{
              color: '#6b7280'
            }} />}>
                  {t('Cancel')}
                </Button>
                <Button variant="contained" disabled={isSubmitting || isLoading || !isValid} sx={{
              flex: 1,
              backgroundColor: '#00b4b4 !important',
              color: '#ffffff !important',
              '&:hover': {
                backgroundColor: '#009999 !important'
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb !important',
                color: '#9ca3af !important'
              },
              textTransform: 'none'
            }} startIcon={<SaveIcon sx={{
              color: '#ffffff'
            }} />} onClick={() => document.getElementById('add-city-mapping-form').requestSubmit()}>
                  {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t('Add')}
                </Button>
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default AddCityMappingDialog;
