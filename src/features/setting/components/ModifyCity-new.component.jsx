import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button, Switch, IconButton, TextField, Autocomplete, Typography } from '@mui/material';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateCity, getcountries, getLanguages } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector } from 'react-redux';
import ImageUpload from 'components/CustomUpload/ImageUpload';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
const ModifyCityDialog = ({
  open,
  onClose,
  onUpdateCity,
  dataCity
}) => {
  const {
    t
  } = useTranslation('common');
  const upload = useSelector(state => state.uploadData);
  const {
    iconUrl
  } = upload;
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayImage, setDisplayImage] = useState(false);
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(t('City name is required')),
    countryId: Yup.string().required(t('Country is required')),
    description: Yup.object().test('atLeastOneDescription', t('At least one description is required'), obj => Object.keys(obj).length > 0),
    toDisplayedInMainScreen: Yup.boolean().required(t('Display flag is required')),
    gpsPosition: Yup.object().shape({
      lat: Yup.number().required(t('Latitude is required')).min(-90).max(90),
      lng: Yup.number().required(t('Longitude is required')).min(-180).max(180)
    })
  });
  useEffect(() => {
    fetchCountriesData();
    fetchLanguages();
  }, []);
  useEffect(() => {
    if (iconUrl) setImageUrl(iconUrl);
  }, [iconUrl]);
  const fetchCountriesData = async () => {
    try {
      const data = await getcountries();
      setCountries(data.data);
    } catch (error) {}
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    const formData = {
      name: values.name,
      countryId: values.countryId,
      imageUrl: imageUrl?.url || dataCity?.imageUrl,
      description: values.description,
      toDisplayedInMainScreen: values.toDisplayedInMainScreen,
      usedInSojoriSysytem: values.usedInSojoriSysytem,
      gpsPosition: values.gpsPosition
    };
    try {
      const response = await updateCity(dataCity?._id, formData);
      onUpdateCity(response.data.city);
      toast.success(t('City updated successfully'));
      resetForm();
      onClose();
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while updating the city'));
      toast.error(error.message || t('An error occurred while updating the city'));
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };
  if (!open) return null;
  const dialogContent = <>
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
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>{t('Modify City')}</h2>
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

        <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#00b4b4 #f1f1f1'
      }}>
          <Formik initialValues={{
          name: dataCity?.name || '',
          countryId: dataCity?.countryId || '',
          description: dataCity?.description || {},
          toDisplayedInMainScreen: dataCity?.toDisplayedInMainScreen || false,
          usedInSojoriSysytem: dataCity?.usedInSojoriSysytem || false,
          gpsPosition: dataCity?.gpsPosition || {
            lat: '',
            lng: ''
          }
        }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
            {({
            isSubmitting,
            setFieldValue,
            values
          }) => <Form style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
                <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingBottom: '16px'
            }}>
                  {errorMessage && <Typography sx={{
                color: '#EF4444',
                fontSize: '14px',
                fontWeight: 500,
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                      {errorMessage}
                    </Typography>}

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                      {t('City Name')}
                    </label>
                    <Field as={TextField} fullWidth size="small" name="name" />
                    <ErrorMessage name="name" component="div" style={{
                  color: '#EF4444',
                  fontSize: '13px',
                  marginTop: '4px'
                }} />
                  </div>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                      {t('Country')}
                    </label>
                    <Autocomplete disablePortal options={countries} getOptionLabel={option => option.name} value={countries.find(c => c._id === values.countryId) || null} onChange={(e, value) => setFieldValue('countryId', value?._id || '')} renderInput={params => <TextField {...params} size="small" label={t('Country')} />} />
                    <ErrorMessage name="countryId" component="div" style={{
                  color: '#EF4444',
                  fontSize: '13px',
                  marginTop: '4px'
                }} />
                  </div>

                  <FieldArray name="description">
                    {() => <div style={{
                  border: '1px dashed #d1d5db',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                        {Object.entries(values.description).map(([langId, descValue], index) => <React.Fragment key={langId}>
                            <div style={{
                      marginBottom: '16px'
                    }}>
                              <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.description).includes(lang._id) || lang._id === langId)} getOptionLabel={option => option.name} value={languages.find(l => l._id === langId) || null} onChange={(e, value) => {
                        if (value) {
                          const newDescription = {
                            ...values.description
                          };
                          delete newDescription[langId];
                          newDescription[value._id] = descValue;
                          setFieldValue('description', newDescription);
                        }
                      }} renderInput={params => <TextField {...params} size="small" label={t('Language')} sx={{
                        width: '150px'
                      }} />} />
                              <Field as={TextField} fullWidth size="small" label={t('Description')} name={`description.${langId}`} multiline rows={4} style={{
                        marginTop: '8px',
                        marginBottom: '8px'
                      }} />
                              <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
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
                                <span style={{
                          fontSize: '13px',
                          color: '#EF4444'
                        }}>{t('remove')}</span>
                              </div>
                            </div>
                            {index < Object.entries(values.description).length - 1 && <div style={{
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
                      const availableLanguages = languages.filter(lang => !Object.keys(values.description).includes(lang._id));
                      if (availableLanguages.length > 0) setFieldValue(`description.${availableLanguages[0]._id}`, '');
                    }} sx={{
                      backgroundColor: '#00b4b4',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: '#009999'
                      }
                    }}>
                            <AddIcon />
                          </IconButton>
                          <span style={{
                      fontSize: '13px',
                      color: '#374151'
                    }}>{t('Add Description')}</span>
                        </div>
                      </div>}
                  </FieldArray>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                      {t('GPS Position')}
                    </label>
                    <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                      <div>
                        <Field as={TextField} fullWidth size="small" label={t('Latitude')} name="gpsPosition.lat" type="number" slotProps={{
                      htmlInput: {
                        step: 'any'
                      }
                    }} />
                        <ErrorMessage name="gpsPosition.lat" component="div" style={{
                      color: '#EF4444',
                      fontSize: '13px',
                      marginTop: '4px'
                    }} />
                      </div>
                      <div>
                        <Field as={TextField} fullWidth size="small" label={t('Longitude')} name="gpsPosition.lng" type="number" slotProps={{
                      htmlInput: {
                        step: 'any'
                      }
                    }} />
                        <ErrorMessage name="gpsPosition.lng" component="div" style={{
                      color: '#EF4444',
                      fontSize: '13px',
                      marginTop: '4px'
                    }} />
                      </div>
                    </div>
                  </div>

                  <div style={{
                marginBottom: '16px'
              }}>
                    <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  color: '#374151'
                }}>{t('Image')}</label>
                    <div style={{
                  textAlign: 'center'
                }}>
                      <Switch checked={displayImage} onChange={() => setDisplayImage(!displayImage)} sx={{
                    color: '#00b4b4',
                    '&.Mui-checked': {
                      color: '#00b4b4'
                    }
                  }} />
                      <span style={{
                    fontSize: '13px',
                    color: '#374151'
                  }}>
                        {displayImage ? t('Upload new image') : t('Use existing image')}
                      </span>
                    </div>
                    {displayImage ? <ImageUpload label={t('Select image')} style={{
                  img: {
                    height: '300px',
                    width: '100%'
                  }
                }} avatar folder="city" /> : <img src={dataCity?.imageUrl || ''} alt="img" style={{
                  height: '300px',
                  width: '100%'
                }} />}
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
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: '#374151'
                  }}>{t('Main Screen')}</label>
                      <Field as={Switch} type="checkbox" name="toDisplayedInMainScreen" />
                      <ErrorMessage name="toDisplayedInMainScreen" component="div" style={{
                    color: '#EF4444',
                    fontSize: '13px',
                    marginTop: '4px'
                  }} />
                    </div>
                    <div style={{
                  flex: 1
                }}>
                      <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: '#374151'
                  }}>{t('Active')}</label>
                      <Field as={Switch} type="checkbox" name="usedInSojoriSysytem" />
                      <ErrorMessage name="usedInSojoriSysytem" component="div" style={{
                    color: '#EF4444',
                    fontSize: '13px',
                    marginTop: '4px'
                  }} />
                    </div>
                  </div>
                </div>

                <div style={{
              // position: 'sticky',
              bottom: 0,
              display: 'flex',
              gap: '12px',
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              paddingBottom: '5px'
            }}>
                  <Button variant="outlined" onClick={onClose} disabled={isSubmitting} sx={{
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
                  <Button variant="contained" type="submit" disabled={isSubmitting || isLoading} sx={{
                flex: 1,
                backgroundColor: '#00b4b4',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#009999'
                },
                '&:disabled': {
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af'
                },
                textTransform: 'none'
              }} startIcon={<SaveIcon sx={{
                color: '#ffffff'
              }} />}>
                    {isLoading ? t('Updating...') : t('Update')}
                  </Button>
                </div>
              </Form>}
          </Formik>
        </div>
      </div>
    </>;
  return ReactDOM.createPortal(dialogContent, document.body);
};
export default ModifyCityDialog;
