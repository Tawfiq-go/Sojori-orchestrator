import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Switch, IconButton, Autocomplete, TextField, CircularProgress, Typography, Box } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { getcities, getLanguages, updateSlide } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
const UpdateSlideDialog = ({
  open,
  onClose,
  slideData,
  setSlidesItems
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
  const [isLoading, setIsLoading] = useState(false);
  const [displayImage, setDisplayImage] = useState({});
  const [slideImages, setSlideImages] = useState({});
  const validationSchema = Yup.object().shape({
    slides: Yup.array().of(Yup.object({
      title: Yup.object().test('atLeastOneTitle', t('At least one title is required'), obj => Object.keys(obj).length > 0),
      description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
      enabled: Yup.boolean().required(t('Enabled is required')),
      cityId: Yup.string().required(t('City ID is required'))
    }).required())
  });
  useEffect(() => {
    const fetchCitiesData = async () => {
      try {
        const data = await getcities();
        setCities(data.data.cities);
      } catch (error) {}
    };
    const fetchLanguages = async () => {
      try {
        const response = await getLanguages();
        setLanguages(response);
      } catch (error) {}
    };
    fetchCitiesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) {
      setSlideImages(prev => ({
        ...prev,
        [Object.keys(displayImage).find(key => displayImage[key])]: iconUrl.url
      }));
    }
  }, [iconUrl, displayImage]);
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    const updatedValues = {
      ...values,
      slides: values.slides.map((slide, index) => ({
        ...slide,
        imageUrl: slideImages[index] || slide.imageUrl
      }))
    };
    try {
      const data = await updateSlide(slideData._id, updatedValues);
      setSlidesItems(prevState => prevState.map(slide => slide._id === slideData._id ? data.data.slideShowConfig : slide));
      setSubmitting(false);
      onClose();
      resetForm();
      toast.success(t('Update Successful'));
      setDisplayImage({});
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
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
    }} aria-labelledby="update-slide-title" aria-describedby={errorMessage ? 'error-message' : undefined}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 id="update-slide-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
            {t('Update Slide')}
          </h2>
          <IconButton aria-label={t('Close dialog')} onClick={onClose} sx={{
          '&:hover': {
            backgroundColor: '#f3f4f6'
          }
        }}>
            <CloseIcon sx={{
            fontSize: '1.25rem'
          }} />
          </IconButton>
        </div>
        <Formik initialValues={slideData} validationSchema={validationSchema} onSubmit={handleSubmit}>
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
                <Form id="update-slide-form" encType="multipart/form-data">
                  <FieldArray name="slides">
                    {({
                  push,
                  remove
                }) => <div>
                        {values.slides.map((slide, index) => <div key={index} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
                            <FieldArray name={`slides[${index}].languages`}>
                              {() => <div style={{
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
                                  newTitle[value._id] = titleValue;
                                  newDescription[value._id] = slide.description[langId] || '';
                                  setFieldValue(`slides[${index}].title`, newTitle);
                                  setFieldValue(`slides[${index}].description`, newDescription);
                                }
                              }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                                width: '150px'
                              }} />} />
                                          <Field name={`slides[${index}].title.${langId}`} as={TextField} label={t('Title')} fullWidth size="small" />
                                        </div>
                                        <Field name={`slides[${index}].description.${langId}`} as={TextField} label={t('Description')} fullWidth multiline rows={4} size="small" sx={{
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
                                  bgcolor: '#f3f4f6'
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
                            bgcolor: '#00b4b4',
                            color: '#ffffff',
                            '&:hover': {
                              bgcolor: '#009999'
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
                                {t('Enabled')}
                              </Typography>
                              <Field as={Switch} type="checkbox" name={`slides[${index}].enabled`} />
                              <ErrorMessage name={`slides[${index}].enabled`} component="div" sx={{
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
                                {t('Select City')}
                              </Typography>
                              <Autocomplete disablePortal options={cities} value={cities.find(city => city._id === slide.cityId) || null} getOptionLabel={option => option.name} onChange={(event, value) => setFieldValue(`slides[${index}].cityId`, value?._id || '')} renderInput={params => <TextField {...params} size="small" label={t('Select City')} />} />
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
                              <div style={{
                        textAlign: 'center'
                      }}>
                                <Switch checked={displayImage[index] || false} onChange={e => setDisplayImage(prev => ({
                          ...prev,
                          [index]: e.target.checked
                        }))} sx={{
                          color: '#00b4b4',
                          '&.Mui-checked': {
                            color: '#00b4b4'
                          }
                        }} />
                                <Typography sx={{
                          fontSize: '13px',
                          color: '#374151'
                        }}>
                                  {displayImage[index] ? t('Upload new image') : t('Use existing image')}
                                </Typography>
                              </div>
                              {displayImage[index] ? <ImageUpload label={t('Select image')} avatar folder="slide" sx={{
                        img: {
                          height: '100px',
                          width: '120px'
                        }
                      }} /> : <img src={slide.imageUrl || ''} alt="slide" style={{
                        height: '100px',
                        width: '120px'
                      }} />}
                            </div>

                            <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                              <Button variant="outlined" onClick={() => remove(index)} sx={{
                        borderColor: '#d1d5db',
                        color: '#EF4444',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          bgcolor: '#f9fafb'
                        }
                      }}>
                                {t('Remove Slide')}
                              </Button>
                            </div>
                          </div>)}
                        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                          <Button variant="outlined" onClick={() => push({
                      title: {},
                      description: {},
                      enabled: false,
                      cityId: '',
                      imageUrl: ''
                    })} sx={{
                      borderColor: '#d1d5db',
                      color: '#00b4b4',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        bgcolor: '#f9fafb'
                      }
                    }}>
                            <AddIcon sx={{
                        color: '#00b4b4'
                      }} />
                            {t('Add Slide')}
                          </Button>
                        </div>
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
            }} />} onClick={() => document.getElementById('update-slide-form').requestSubmit()}>
                  {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t('Submit')}
                </Button>
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default UpdateSlideDialog;
