import React from 'react';
import { IconButton, Box, Typography, Button, FormControl, Select, MenuItem, TextField, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { X, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { updateAdminV2 } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
const validationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  phone: Yup.string().required('Phone is required'),
  whatsapp: Yup.string(),
  settings: Yup.object().shape({
    language: Yup.string().required('Language is required'),
    currency: Yup.string().required('Currency is required')
  }),
  banned: Yup.boolean(),
  deleted: Yup.boolean()
});
const UpdateAdminV2Sidebar = ({
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
        submit: t('Failed to update admin')
      });
    } finally {
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
      overflow: 'hidden',
      onClick: e => e.stopPropagation()
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
                        {t('Update Admin')}
                    </h2>
                    <IconButton onClick={onClose} sx={{
          '&:hover': {
            backgroundColor: '#f3f4f6'
          }
        }}>
                        <X sx={{
            fontSize: '1.25rem'
          }} />
                    </IconButton>
                </div>

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
        }) => <>
                            <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#00b4b4 #f1f1f1'
          }}>
                                <Form id="admin-form" className="space-y-4">
                                    <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('First Name')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="firstName" variant="outlined" size="small" InputProps={{
                    startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                  }} />
                                            <ErrorMessage name="firstName" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('Last Name')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="lastName" variant="outlined" size="small" InputProps={{
                    startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                  }} />
                                            <ErrorMessage name="lastName" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                    </div>

                                    <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('Phone')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="phone" variant="outlined" size="small" InputProps={{
                    startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  }} />
                                            <ErrorMessage name="phone" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('WhatsApp')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="whatsapp" variant="outlined" size="small" InputProps={{
                    startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  }} />
                                            <ErrorMessage name="whatsapp" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                    </div>

                                    <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '16px'
              }}>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('Language')} :
                                            </label>
                                            <FormControl fullWidth size="small">
                                                <Field as={Select} id="language" name="settings.language" startAdornment={<Box component="span" sx={{
                      mr: 1
                    }}>
                                                            <Mail className="w-4 h-4 text-gray-500" />
                                                        </Box>} sx={{
                      width: '100%',
                      minWidth: '270px'
                    }}>
                                                    <MenuItem value="en">English</MenuItem>
                                                    <MenuItem value="ar">Arabic</MenuItem>
                                                </Field>
                                                <ErrorMessage name="settings.language" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                        </div>
                                        <div style={{
                  width: '270px'
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                                                {t('Currency')} :
                                            </label>
                                            <FormControl fullWidth size="small">
                                                <Field as={Select} id="currency" name="settings.currency" startAdornment={<Box component="span" sx={{
                      mr: 1
                    }}>
                                                            <Mail className="w-4 h-4 text-gray-500" />
                                                        </Box>} sx={{
                      width: '100%',
                      minWidth: '270px'
                    }}>
                                                    <MenuItem value="USD">USD</MenuItem>
                                                    <MenuItem value="EUR">EUR</MenuItem>
                                                </Field>
                                                <ErrorMessage name="settings.currency" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                        </div>
                                    </div>

                                    <Box className="flex flex-col space-y-2 mt-4">
                                        <Box sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  mt: 1
                }}>
                                            <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                                                {t('Account Status')}:
                                            </label>
                                            <FormControlLabel control={<Switch checked={values.banned} onChange={handleChange} name="banned" color="error" sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#ef4444'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#ef4444'
                    }
                  }} />} label={<Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                                                        <Typography variant="body2" sx={{
                      fontWeight: 500
                    }}>
                                                            {t('Banned')}
                                                        </Typography>
                                                    </Box>} sx={{
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px'
                    }
                  }} />
                                            <Typography variant="body2" sx={{
                    color: '#6b7280',
                    fontWeight: 500
                  }}>
                                                |
                                            </Typography>
                                            <FormControlLabel control={<Switch checked={values.deleted} onChange={handleChange} name="deleted" color="error" sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#ef4444'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#ef4444'
                    }
                  }} />} label={<Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                                                        <Typography variant="body2" sx={{
                      fontWeight: 500
                    }}>
                                                            {t('Deleted')}
                                                        </Typography>
                                                    </Box>} sx={{
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px'
                    }
                  }} />
                                        </Box>
                                    </Box>
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
                                <Button variant="contained" onClick={() => document.getElementById('admin-form').requestSubmit()} disabled={isSubmitting} style={{
              flex: 1
            }} className="!text-white !bg-medium-aquamarine">
                                    {isSubmitting ? <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                                            <CircularProgress size={16} color="inherit" />
                                            {t('Updating...')}
                                        </div> : t('Update')}
                                </Button>
                            </div>
                        </>}
                </Formik>
            </div>
        </>;
};
export default UpdateAdminV2Sidebar;
