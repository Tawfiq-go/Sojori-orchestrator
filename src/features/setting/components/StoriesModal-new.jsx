import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Box, Typography, Autocomplete, IconButton, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createStory, updateStory, getLanguages, getcities } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name_required'),
  city: Yup.string().required('City_required'),
  description: Yup.object().test('at-least-one-description', 'At_least_one_description_required', obj => Object.keys(obj).length > 0)
});
const StoriesModal = ({
  open,
  onClose,
  setStories,
  story
}) => {
  const {
    t
  } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [cities, setCities] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [languagesResponse, citiesResponse] = await Promise.all([getLanguages(), getcities()]);
        setLanguages(languagesResponse);
        setCities(citiesResponse.data.cities);
      } catch (error) {
        toast.error(t('Failed_to_fetch_data'));
      }
    };
    fetchData();
  }, []);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      let response;
      if (story) {
        response = await updateStory(story._id, values);
      } else {
        response = await createStory(values);
      }
      if (response && response.story) {
        setStories(prevStories => {
          if (!prevStories) return [response.story];
          if (story) {
            return prevStories.map(s => s._id === story._id ? response.story : s);
          } else {
            return [...prevStories, response.story];
          }
        });
        resetForm();
        onClose();
        toast.success(t(story ? 'Story_updated_successfully' : 'Story_created_successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      setErrorMessage(error.message || t('An_error_occurred_while_processing_your_request'));
      toast.error(t(story ? 'Error_updating_story' : 'Error_creating_story'));
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
    }} aria-labelledby="stories-modal-title">
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
                    <h2 id="stories-modal-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
                        {t(story ? 'Update_Story' : 'Create_New_Story')}
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
        name: story ? story.name : '',
        city: story ? story.city : '',
        description: story ? story.description : {}
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({
          values,
          errors,
          setFieldValue,
          isSubmitting,
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
                                <Form id="stories-form">
                                    <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                                        <div>
                                            <label htmlFor="name" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: '#374151'
                  }}>
                                                {t('Name')}
                                            </label>
                                            <Field as={TextField} fullWidth size="small" name="name" label={t('Name')} error={Boolean(errors.name)} helperText={t(errors.name)} />
                                        </div>
                                        <div>
                                            <label htmlFor="city" style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: '#374151'
                  }}>
                                                {t('City')}
                                            </label>
                                            <Autocomplete disablePortal options={cities} getOptionLabel={option => option.name} value={cities.find(city => city._id === values.city) || null} onChange={(e, value) => setFieldValue('city', value ? value._id : '')} renderInput={params => <TextField {...params} size="small" label={t('City')} error={Boolean(errors.city)} helperText={t(errors.city)} />} />
                                        </div>
                                        <FieldArray name="description">
                                            {({
                    push,
                    remove
                  }) => <div style={{
                    border: '1px dashed #d1d5db',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                                                    {Object.entries(values.description).map(([langId, value]) => <Box key={langId} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                                                            <TextField fullWidth size="small" multiline rows={4} label={`Description (${languages.find(lang => lang._id === langId)?.name || 'Unknown'})`} value={value} onChange={e => setFieldValue(`description.${langId}`, e.target.value)} error={Boolean(errors.description?.[langId])} helperText={errors.description?.[langId]} />
                                                            <IconButton size="small" onClick={() => {
                        const newDescription = {
                          ...values.description
                        };
                        delete newDescription[langId];
                        setFieldValue('description', newDescription);
                      }} sx={{
                        '&:hover': {
                          backgroundColor: '#f3f4f6'
                        }
                      }}>
                                                                <CloseIcon sx={{
                          color: '#EF4444'
                        }} />
                                                            </IconButton>
                                                        </Box>)}
                                                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                                                        <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.description).includes(lang._id))} getOptionLabel={option => option.name} value={null} onChange={(event, value) => {
                        if (value) {
                          setFieldValue(`description.${value._id}`, '');
                        }
                      }} renderInput={params => <TextField {...params} size="small" label={t('Add_Language')} sx={{
                        width: '150px'
                      }} />} />
                                                        <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                                                            {t('Add Description')}
                                                        </span>
                                                    </div>
                                                </div>}
                                        </FieldArray>
                                    </Box>
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
            }} />} onClick={() => document.getElementById('stories-form').requestSubmit()}>
                                    {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t(story ? 'Update' : 'Create')}
                                </Button>
                            </div>
                        </>}
                </Formik>
            </div>
        </>;
};
export default StoriesModal;
