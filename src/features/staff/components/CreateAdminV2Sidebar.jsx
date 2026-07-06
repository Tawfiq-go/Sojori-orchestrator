import React, { useState, useEffect } from 'react';
import { IconButton, Box, Typography, Button, FormControl, Select, MenuItem, TextField, CircularProgress } from '@mui/material';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { X, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { createAdminV2, getOwners } from '../services/serverApi.task';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
const validationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
  phone: Yup.string().required('Phone is required'),
  whatsapp: Yup.string()
  // ownerId: Yup.string().required('Owner is required'), // Commented out - not needed right now
});
const CreateAdminV2Sidebar = ({
  open,
  onClose,
  onAdminCreated
}) => {
  const {
    t
  } = useTranslation('common');
  const [owners, setOwners] = useState([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = hasAdminAccess(user?.role);
  useEffect(() => {
    if (open && isAdmin) {
      fetchOwners();
    }
  }, [open, isAdmin]);
  const fetchOwners = async () => {
    setIsLoadingOwners(true);
    try {
      const response = await getOwners({
        limit: 100
      });
      if (response && response.data) {
        setOwners(response.data);
      }
    } catch (error) {} finally {
      setIsLoadingOwners(false);
    }
  };
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
        whatsapp: values.whatsapp,
        ownerId: values.ownerId
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
  const initialOwnerId = isAdmin ? '' : user?._id || '';
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
                        {t('Create Admin')}
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
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        whatsapp: '',
        ownerId: initialOwnerId
      }} validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({
          isSubmitting,
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
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
                                            <Field as={TextField} fullWidth name="firstName" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                    }
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
                                            <Field as={TextField} fullWidth name="lastName" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                    }
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
                                                {t('Email')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="email" variant="outlined" type="email" size="small" slotProps={{
                    input: {
                      startAdornment: <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                                            <ErrorMessage name="email" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Phone')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="phone" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                                            <ErrorMessage name="phone" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('WhatsApp')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="whatsapp" variant="outlined" size="small" slotProps={{
                    input: {
                      startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                                            <ErrorMessage name="whatsapp" component={Typography} className="text-red-500 !text-xs" />
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
                                                {t('Password')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="password" variant="outlined" type="password" size="small" />
                                            <ErrorMessage name="password" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                    </div>

                                    {/* Owner select commented out - not needed right now */}
                                    {/* <RoleBasedRenderer adminOnly>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                                {t('Owner')} :
                                            </label>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    id="owner-select"
                                                    name="ownerId"
                                                    value={values.ownerId}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    disabled={isLoadingOwners}
                                                    sx={{ width: '100%', minWidth: '270px' }}
                                                >
                                                    {owners.map((owner) => (
                                                        <MenuItem key={owner._id} value={owner._id}>
                                                            {owner.firstName} {owner.lastName}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <ErrorMessage name="ownerId" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                        </div>
                                     </RoleBasedRenderer> */}

                                    {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}
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
                                <Button variant="contained" onClick={submitForm} disabled={isSubmitting} style={{
              flex: 1
            }} className="!text-white !bg-medium-aquamarine">
                                    {isSubmitting ? <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                                            <CircularProgress size={16} color="inherit" />
                                            {t('Creating...')}
                                        </div> : t('Create')}
                                </Button>
                            </div>
                        </>}
                </Formik>
            </div>
        </>;
};
export default CreateAdminV2Sidebar;
