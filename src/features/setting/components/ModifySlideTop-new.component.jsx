import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Switch, IconButton, TextField, Autocomplete, Typography, Box, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateSlide, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const validationSchema = Yup.object({
  title: Yup.object().test('requiredTitle', t => t('At least one title is required'), obj => {
    return obj && Object.values(obj).some(value => !!value);
  }),
  description: Yup.object().test('requiredDescription', t => t('At least one description is required'), obj => {
    return obj && Object.values(obj).some(value => !!value);
  }),
  isMain: Yup.boolean().required(t => t('IsMain is required'))
});
const ModifySlideTopDialog = ({
  open,
  onClose,
  slidesItems,
  setSlidesItems,
  selectedTop,
  topIndex
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [languages, setLanguages] = useState([]);
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await getLanguages();
        setLanguages(response);
      } catch (error) {}
    };
    fetchLanguages();
  }, []);
  const initialValues = {
    title: selectedTop?.title || {},
    description: selectedTop?.description || {},
    isMain: selectedTop?.isMain || false
  };
  const handleSubmit = (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const dataNew = {
      ...selectedTop,
      title: values.title,
      description: values.description,
      isMain: values.isMain
    };
    updateSlide(selectedTop?._id, dataNew).then(data => {
      let newSlide = [...slidesItems];
      newSlide[topIndex] = data?.data?.slideShowConfig;
      setSlidesItems(newSlide);
      resetForm();
      onClose();
      toast.success(t("Modification Successful"));
    }).catch(error => {
      setErrorMessage(error.message || t('An error occurred while updating the slide'));
    }).finally(() => {
      setIsLoading(false);
      setSubmitting(false);
    });
  };
  if (!open) return null;
  return <>
      <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1300
    }} onClick={onClose} />
      <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '600px',
      backgroundColor: '#ffffff',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }} aria-labelledby="modify-slide-top-title">
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 id="modify-slide-top-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
            {t('Modify slide')}
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
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          values,
          setFieldValue,
          isValid,
          isSubmitting
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
                <Form id="modify-slide-top-form">
                  <FieldArray name="title">
                    {({
                  push,
                  remove
                }) => <div style={{
                  border: '1px dashed #d1d5db',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                        {Object.entries(values.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                            <div style={{
                      marginBottom: '16px'
                    }}>
                              <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: '8px'
                      }}>
                                <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.title).includes(lang._id) || lang._id === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                          if (value) {
                            const newTitle = {
                              ...values.title
                            };
                            const newDescription = {
                              ...values.description
                            };
                            delete newTitle[langId];
                            delete newDescription[langId];
                            newTitle[value._id] = titleValue || '';
                            newDescription[value._id] = values.description[langId] || '';
                            setFieldValue('title', newTitle);
                            setFieldValue('description', newDescription);
                          }
                        }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                          width: '150px'
                        }} />} />
                                <Field name={`title.${langId}`} as={TextField} label={t('Title')} fullWidth size="small" />
                              </div>
                              <Field name={`description.${langId}`} as={TextField} label={t('Description')} fullWidth multiline rows={4} size="small" style={{
                        marginBottom: '8px'
                      }} />
                              <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                                <IconButton size="small" onClick={() => {
                          const newTitle = {
                            ...values.title
                          };
                          const newDescription = {
                            ...values.description
                          };
                          delete newTitle[langId];
                          delete newDescription[langId];
                          setFieldValue('title', newTitle);
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
                                <span style={{
                          fontSize: '13px',
                          color: '#EF4444'
                        }}>
                                  {t('remove')}
                                </span>
                              </div>
                            </div>
                            {index < Object.entries(values.title).length - 1 && <div style={{
                      borderBottom: '1px solid #e5e7eb',
                      marginBottom: '16px'
                    }} />}
                          </React.Fragment>)}
                        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                          <IconButton size="small" onClick={() => {
                      const availableLanguages = languages.filter(lang => !Object.keys(values.title).includes(lang._id));
                      if (availableLanguages.length > 0) {
                        const newLangId = availableLanguages[0]._id;
                        setFieldValue(`title.${newLangId}`, '');
                        setFieldValue(`description.${newLangId}`, '');
                      }
                    }} sx={{
                      backgroundColor: '#00b4b4',
                      color: '#ffffff',
                      '&:hover': {
                        backgroundColor: '#009999'
                      }
                    }}>
                            <AddIcon />
                          </IconButton>
                          <span style={{
                      fontSize: '13px',
                      color: '#374151'
                    }}>
                            {t('Add Title and Description')}
                          </span>
                        </div>
                      </div>}
                  </FieldArray>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label htmlFor="isMain" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                      {t('Is Main')}
                    </label>
                    <Field as={Switch} name="isMain" checked={values.isMain} onChange={event => {
                  setFieldValue('isMain', event.target.checked);
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
            }} />} onClick={() => document.getElementById('modify-slide-top-form').requestSubmit()}>
                  {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t('Update')}
                </Button>
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default ModifySlideTopDialog;
