import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button, Switch, IconButton, Autocomplete, TextField, Typography, Box, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { createSlide, getcities, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
const AddSlideDialog = ({
  open,
  onClose,
  addSlide
}) => {
  const {
    t
  } = useTranslation('common');
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [imagesUrl, setImagesUrl] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Define validation schema inside the component to use `t`
  const validationSchema = Yup.object().shape({
    title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    isMain: Yup.boolean().required(t('IsMain is required')),
    slides: Yup.array().of(Yup.object({
      title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
      description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
      enabled: Yup.boolean().required(t('Enabled is required')),
      cityId: Yup.string().required(t('City ID is required'))
    }))
  });
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [citiesData, languagesResponse] = await Promise.all([getcities(), getLanguages()]);
        setCities(citiesData.data.cities);
        setLanguages(languagesResponse);
      } catch (error) {
        toast.error(t('Failed_to_fetch_data'));
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (iconUrl?.url) {
      setImagesUrl(prevImagesUrl => [...prevImagesUrl, iconUrl.url]);
    }
  }, [iconUrl]);
  useEffect(() => {
    if (!open) {
      setImagesUrl([]);
    }
  }, [open]);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const formData = {
      ...values
    };
    for (let i = 0; i < formData.slides.length; i++) {
      formData.slides[i].imageUrl = imagesUrl[i] || '';
    }
    try {
      const data = await createSlide(formData);
      addSlide(data?.data?.slideShowConfig);
      setSubmitting(false);
      onClose();
      resetForm();
      setImagesUrl([]);
      toast.success(t('Slide added successfully'));
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while adding the slide'));
      toast.error(error.message || t('An error occurred while adding the slide'));
    } finally {
      setIsLoading(false);
    }
  };
  if (!open) return null;
  return ReactDOM.createPortal(<>
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
    }} aria-labelledby="add-slide-title" aria-describedby={errorMessage ? 'error-message' : undefined}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 id="add-slide-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
            {t('Create Slide')}
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
        title: {},
        description: {},
        isMain: false,
        slides: [{
          title: {},
          description: {},
          enabled: true,
          cityId: ''
        }]
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          isSubmitting,
          setFieldValue,
          isValid,
          values
        }) => <>
              {errorMessage && <Typography id="error-message" sx={{
            color: '#EF4444',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'center',
            mb: '16px',
            p: '16px'
          }}>
                  {errorMessage}
                </Typography>}
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
                <Form id="add-slide-form" encType="multipart/form-data">
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
                        }} renderInput={params => <TextField {...params} size="small" label={t('Language')} sx={{
                          width: '150px'
                        }} />} />
                                <Field as={TextField} name={`title.${langId}`} label={t('Title')} fullWidth size="small" />
                              </div>
                              <Field as={TextField} name={`description.${langId}`} label={t('Description')} fullWidth multiline rows={4} size="small" style={{
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
                                <Typography sx={{
                          fontSize: '13px',
                          color: '#EF4444'
                        }}>{t('remove')}</Typography>
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
                          <Typography sx={{
                      fontSize: '13px',
                      color: '#374151'
                    }}>{t('Add Title and Description')}</Typography>
                        </div>
                      </div>}
                  </FieldArray>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <Typography sx={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  mb: '8px',
                  color: '#374151'
                }}>
                      {t('Is Main')}
                    </Typography>
                    <Field as={Switch} type="checkbox" name="isMain" />
                    <ErrorMessage name="isMain" component="div" sx={{
                  color: '#EF4444',
                  fontSize: '13px',
                  mt: '4px'
                }} />
                  </div>

                  <FieldArray name="slides">
                    {({
                  push,
                  remove
                }) => <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                        {values.slides.map((slide, index) => <div key={index} style={{
                    marginBottom: '16px'
                  }}>
                            <Typography sx={{
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#374151',
                      mb: '16px'
                    }}>
                              {t('Slide {number}', {
                        number: index + 1
                      })}
                            </Typography>
                            <FieldArray name={`slides[${index}].title`}>
                              {({
                        push: pushLang,
                        remove: removeLang
                      }) => <div style={{
                        border: '1px dashed #d1d5db',
                        padding: '16px',
                        marginBottom: '16px'
                      }}>
                                  {Object.entries(slide.title).map(([langId, titleValue], langIndex) => <React.Fragment key={langId}>
                                      <div style={{
                            marginBottom: '16px'
                          }}>
                                        <div style={{
                              display: 'flex',
                              gap: '16px',
                              marginBottom: '8px'
                            }}>
                                          <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(slide.title).includes(lang._id) || lang._id === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang._id === langId) || null} onChange={(event, value) => {
                                if (value) {
                                  const newTitle = {
                                    ...slide.title
                                  };
                                  const newDescription = {
                                    ...slide.description
                                  };
                                  delete newTitle[langId];
                                  delete newDescription[langId];
                                  newTitle[value._id] = titleValue || '';
                                  newDescription[value._id] = slide.description[langId] || '';
                                  setFieldValue(`slides[${index}].title`, newTitle);
                                  setFieldValue(`slides[${index}].description`, newDescription);
                                }
                              }} renderInput={params => <TextField {...params} size="small" label={t('Language')} sx={{
                                width: '150px'
                              }} />} />
                                          <Field as={TextField} name={`slides[${index}].title.${langId}`} label={t('Title')} fullWidth size="small" />
                                        </div>
                                        <Field as={TextField} name={`slides[${index}].description.${langId}`} label={t('Description')} fullWidth multiline rows={4} size="small" sx={{
                              mb: '8px'
                            }} />
                                        <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                                          <IconButton size="small" onClick={() => {
                                const newTitle = {
                                  ...slide.title
                                };
                                const newDescription = {
                                  ...slide.description
                                };
                                delete newTitle[langId];
                                delete newDescription[langId];
                                setFieldValue(`slides[${index}].title`, newTitle);
                                setFieldValue(`slides[${index}].description`, newDescription);
                              }} sx={{
                                '&:hover': {
                                  backgroundColor: '#f3f4f6'
                                }
                              }}>
                                            <CloseIcon sx={{
                                  color: '#EF4444'
                                }} />
                                          </IconButton>
                                          <Typography sx={{
                                fontSize: '13px',
                                color: '#EF4444'
                              }}>{t('remove')}</Typography>
                                        </div>
                                      </div>
                                      {langIndex < Object.entries(slide.title).length - 1 && <div style={{
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
                            const availableLanguages = languages.filter(lang => !Object.keys(slide.title).includes(lang._id));
                            if (availableLanguages.length > 0) {
                              const newLangId = availableLanguages[0]._id;
                              setFieldValue(`slides[${index}].title.${newLangId}`, '');
                              setFieldValue(`slides[${index}].description.${newLangId}`, '');
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
                                    <Typography sx={{
                            fontSize: '13px',
                            color: '#374151'
                          }}>{t('Add Title and Description')}</Typography>
                                  </div>
                                </div>}
                            </FieldArray>

                            <div style={{
                      marginBottom: '16px'
                    }}>
                              <Typography sx={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        mb: '8px',
                        color: '#374151'
                      }}>
                                {t('City')}
                              </Typography>
                              {cities && cities.length > 0 && <Autocomplete disablePortal options={cities} getOptionLabel={option => option.name} value={cities.find(city => city._id === slide.cityId) || null} onChange={(event, value) => {
                        setFieldValue(`slides[${index}].cityId`, value ? value._id : '');
                      }} renderInput={params => <TextField {...params} size="small" label={t('City')} />} />}
                              <ErrorMessage name={`slides[${index}].cityId`} component="div" sx={{
                        color: '#EF4444',
                        fontSize: '13px',
                        mt: '4px'
                      }} />
                            </div>

                            <div style={{
                      marginBottom: '16px'
                    }}>
                              <Typography sx={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        mb: '8px',
                        color: '#374151'
                      }}>
                                {t('Image')}
                              </Typography>
                              <ImageUpload sx={{
                        img: {
                          height: '300px',
                          width: '444px'
                        }
                      }} label={t('Select image')} folder="slide" avatar />
                            </div>

                            <div style={{
                      marginBottom: '16px'
                    }}>
                              <Typography sx={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        mb: '8px',
                        color: '#374151'
                      }}>
                                {t('Enabled')}
                              </Typography>
                              <Field as={Switch} type="checkbox" name={`slides[${index}].enabled`} />
                              <ErrorMessage name={`slides[${index}].enabled`} component="div" sx={{
                        color: '#EF4444',
                        fontSize: '13px',
                        mt: '4px'
                      }} />
                            </div>

                            <Button variant="outlined" sx={{
                      marginBottom: '8px',
                      borderColor: '#d1d5db',
                      color: '#EF4444 !important',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        backgroundColor: '#f9fafb'
                      }
                    }} onClick={() => remove(index)}>
                              {t('Remove Slide')}
                            </Button>
                          </div>)}
                        <Button variant="outlined" sx={{
                    borderColor: '#d1d5db',
                    color: '#00b4b4 !important',
                    '&:hover': {
                      borderColor: '#9ca3af',
                      backgroundColor: '#f9fafb'
                    }
                  }} onClick={() => push({
                    title: {},
                    description: {},
                    enabled: true,
                    cityId: ''
                  })}>
                          <AddIcon sx={{
                      color: '#00b4b4'
                    }} />
                          {t('Add Slide')}
                        </Button>
                      </div>}
                  </FieldArray>
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
            }} />} onClick={() => document.getElementById('add-slide-form').requestSubmit()}>
                  {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t('Add')}
                </Button>
              </div>
            </>}
        </Formik>
      </div>
    </>, document.body);
};
export default AddSlideDialog;
