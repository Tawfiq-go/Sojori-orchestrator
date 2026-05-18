import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Box, Typography, IconButton, Autocomplete, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateWhatsappConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import ImageUpload from 'components/CustomUpload/UploadV2';
import defaultAvatar from 'assets/images/placeholder.jpg';
const WhatsAppConfigModal = ({
  open,
  onClose,
  setWhatsappConfig,
  config,
  configId,
  featureOrder,
  languages,
  activeTab
}) => {
  const {
    t
  } = useTranslation('common');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const updatedConfig = {
        ...config,
        ...values
      };
      const response = await updateWhatsappConfig(configId, updatedConfig);
      if (response && response.data && response.data.whatsappConfig) {
        setWhatsappConfig(response.data.whatsappConfig);
        setSubmitting(false);
        onClose();
        toast.success(t('WhatsApp configuration updated successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      setErrorMessage(error.message || t('An error occurred while processing your request.'));
      setSubmitting(false);
      toast.error(t('Error updating WhatsApp configuration'));
    } finally {
      setIsLoading(false);
    }
  };
  const getInitialValues = () => {
    switch (activeTab) {
      case 0:
        return {
          title: config.title,
          description: config.description
        };
      case 1:
        return {
          blogTitle: config.blogTitle,
          blogDescription: config.blogDescription
        };
      case 2:
        return {
          vdUrl: config.vdUrl
        };
      case 3:
        return {
          imageUrl: config.imageUrl,
          imageTitle: config.imageTitle,
          imageDescription: config.imageDescription
        };
      case 4:
        return {
          features: featureOrder
        };
      default:
        return {};
    }
  };
  const getValidationSchema = () => {
    switch (activeTab) {
      case 0:
        return Yup.object().shape({
          title: Yup.object().test('at-least-one-title', t => t('At least one title is required'), obj => Object.keys(obj).length > 0),
          description: Yup.object().test('at-least-one-description', t => t('At least one description is required'), obj => Object.keys(obj).length > 0)
        });
      case 1:
        return Yup.object().shape({
          blogTitle: Yup.object().test('at-least-one-blog-title', t => t('At least one blog title is required'), obj => Object.keys(obj).length > 0),
          blogDescription: Yup.object().test('at-least-one-blog-description', t => t('At least one blog description is required'), obj => Object.keys(obj).length > 0)
        });
      case 2:
        return Yup.object().shape({
          vdUrl: Yup.string().required(t => t('Video URL is required'))
        });
      case 3:
        return Yup.object().shape({
          imageUrl: Yup.string().required(t => t('Image URL is required')),
          imageTitle: Yup.object().test('at-least-one-image-title', t => t('At least one image title is required'), obj => Object.keys(obj).length > 0),
          imageDescription: Yup.object().test('at-least-one-image-description', t => t('At least one image description is required'), obj => Object.keys(obj).length > 0)
        });
      case 4:
        return Yup.object().shape({
          features: Yup.array().of(Yup.object().shape({
            txt: Yup.object().test('at-least-one-feature-text', t => t('At least one feature text is required'), obj => Object.keys(obj).length > 0),
            iconUrl: Yup.string().required(t => t('Feature icon URL is required'))
          }))
        });
      default:
        return Yup.object();
    }
  };
  const renderFormFields = (values, errors, setFieldValue) => {
    const isVideo = values.vdUrl && values.vdUrl.includes('/MS/videos/');
    const isImage = values.vdUrl && values.vdUrl.includes('/MS/images/');
    switch (activeTab) {
      case 0:
        return <>
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Title')}</Typography>
                        <MultiLingualField t={t} name="title" values={values.title} errors={errors.title} setFieldValue={setFieldValue} languages={languages} />
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Description')}</Typography>
                        <MultiLingualField t={t} name="description" values={values.description} errors={errors.description} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 1:
        return <>
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Blog Title')}</Typography>
                        <MultiLingualField t={t} name="blogTitle" values={values.blogTitle} errors={errors.blogTitle} setFieldValue={setFieldValue} languages={languages} />
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Blog Description')}</Typography>
                        <MultiLingualField t={t} name="blogDescription" values={values.blogDescription} errors={errors.blogDescription} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 2:
        return <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t(isVideo ? 'Video' : 'Image')}</Typography>
                        {isVideo ? <video src={values.vdUrl} controls style={{
            width: '100%',
            marginTop: '8px',
            marginBottom: '8px',
            maxWidth: '400px',
            maxHeight: '300px'
          }}>
                                {t('Your browser does not support the video tag.')}
                            </video> : <img src={isImage ? values.vdUrl : defaultAvatar} alt={t('Uploaded media')} style={{
            width: '100%',
            marginTop: '8px',
            marginBottom: '8px',
            maxWidth: '400px',
            maxHeight: '300px',
            objectFit: 'contain'
          }} />}
                        <ImageUpload fieldName="vdUrl" setFieldValue={setFieldValue} folder="other" />
                    </Box>;
      case 3:
        return <>
                        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
                            <Typography sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px'
            }}>{t('Image')}</Typography>
                            <img src={values.imageUrl || defaultAvatar} alt={t('Uploaded')} style={{
              width: '100%',
              marginTop: '8px',
              marginBottom: '8px',
              maxWidth: '400px',
              maxHeight: '300px'
            }} />
                            <ImageUpload fieldName="imageUrl" setFieldValue={setFieldValue} folder="other" />
                        </Box>
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Image Title')}</Typography>
                        <MultiLingualField t={t} name="imageTitle" values={values.imageTitle} errors={errors.imageTitle} setFieldValue={setFieldValue} languages={languages} />
                        <Typography sx={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px'
          }}>{t('Image Description')}</Typography>
                        <MultiLingualField t={t} name="imageDescription" values={values.imageDescription} errors={errors.imageDescription} setFieldValue={setFieldValue} languages={languages} multiline />
                    </>;
      case 4:
        return <FieldArray name="features">
                        {({
            push,
            remove
          }) => <div style={{
            border: '1px dashed #d1d5db',
            padding: '16px',
            marginBottom: '16px'
          }}>
                                {values.features.map((feature, index) => <Box key={index} sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mb: 2
            }}>
                                        <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                                            <Typography sx={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#374151'
                }}>{t('Feature {number}', {
                    number: index + 1
                  })}</Typography>
                                            <IconButton onClick={() => remove(index)} sx={{
                  '&:hover': {
                    backgroundColor: '#f3f4f6'
                  }
                }}>
                                                <DeleteIcon sx={{
                    color: '#EF4444 !important',
                    width: '24px',
                    height: '24px'
                  }} />
                                            </IconButton>
                                        </Box>
                                        <MultiLingualField t={t} name={`features.${index}.txt`} values={feature.txt} errors={errors.features?.[index]?.txt} setFieldValue={setFieldValue} languages={languages} />
                                        <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                                            <Typography sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px'
                }}>{t('Icon')}</Typography>
                                            <img src={feature.iconUrl || defaultAvatar} alt={t('Uploaded')} style={{
                  height: '80px',
                  width: '120px',
                  marginBottom: '8px'
                }} />
                                            <ImageUpload fieldName={`features.${index}.iconUrl`} setFieldValue={setFieldValue} folder="other" />
                                        </Box>
                                        {index < values.features.length - 1 && <div style={{
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '16px'
              }} />}
                                    </Box>)}
                                <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}>
                                    <IconButton onClick={() => push({
                txt: {},
                iconUrl: ''
              })} sx={{
                backgroundColor: '#00b4b4 !important',
                color: '#ffffff !important',
                '&:hover': {
                  backgroundColor: '#009999 !important'
                }
              }}>
                                        <AddCircleOutlineIcon sx={{
                  width: '16px',
                  height: '16px'
                }} />
                                    </IconButton>
                                    <Typography sx={{
                fontSize: '13px',
                color: '#374151'
              }}>{t('Add Feature')}</Typography>
                                </Box>
                            </div>}
                    </FieldArray>;
      default:
        return null;
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
      backgroundColor: '#ffffff',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }} aria-labelledby="whatsapp-config-title">
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
                    <h2 id="whatsapp-config-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
                        {t('Update WhatsApp Configuration')}
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
                <Formik initialValues={getInitialValues()} validationSchema={getValidationSchema()} onSubmit={handleSubmit}>
                    {({
          values,
          errors,
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
                                <Form id="whatsapp-config-form">
                                    <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                                        {renderFormFields(values, errors, setFieldValue)}
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
            }} />} onClick={() => document.getElementById('whatsapp-config-form').requestSubmit()}>
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
const MultiLingualField = ({
  t,
  name,
  values,
  errors,
  setFieldValue,
  languages,
  multiline = false
}) => {
  return <FieldArray name={name}>
            {({
      remove
    }) => <div style={{
      border: '1px dashed #d1d5db',
      padding: '16px',
      marginBottom: '16px'
    }}>
                    {Object.entries(values).map(([langId, value], index) => <Box key={langId} sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        mb: 2
      }}>
                            <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
                                <TextField fullWidth multiline={multiline} rows={multiline ? 4 : 1} label={`${languages.find(lang => lang._id === langId)?.name || t('Unknown')}`} value={value} onChange={e => setFieldValue(`${name}.${langId}`, e.target.value)} error={Boolean(errors?.[langId])} helperText={errors?.[langId]} sx={{
            '& .MuiInputLabel-root': {
              fontSize: '14px',
              color: '#374151'
            }
          }} />
                                <IconButton onClick={() => {
            const newValues = {
              ...values
            };
            delete newValues[langId];
            setFieldValue(name, newValues);
          }} sx={{
            '&:hover': {
              backgroundColor: '#f3f4f6'
            }
          }}>
                                    <DeleteIcon sx={{
              color: '#EF4444 !important'
            }} />
                                </IconButton>
                            </Box>
                            {index < Object.entries(values).length - 1 && <div style={{
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '16px'
        }} />}
                        </Box>)}
                    <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values).includes(lang._id))} getOptionLabel={option => option.name} value={null} onChange={(event, value) => {
          if (value) {
            setFieldValue(`${name}.${value._id}`, '');
          }
        }} renderInput={params => <TextField {...params} size="small" label={t('Add Language')} sx={{
          width: '150px'
        }} />} />
                        <Typography sx={{
          fontSize: '13px',
          color: '#374151'
        }}>{t('Add Language')}</Typography>
                    </Box>
                </div>}
        </FieldArray>;
};
export default WhatsAppConfigModal;
