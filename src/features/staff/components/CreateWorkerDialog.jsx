import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { IconButton, Box, Typography, Button, FormControl, Select, MenuItem, TextField, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { X, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { inviteWorker, getOwners } from '../services/serverApi.task';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import { useTranslation } from 'react-i18next';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};
const StyledButton = styled(Button)(({
  theme
}) => ({
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
    transform: 'translateY(-1px)'
  }
}));
const ResetButton = styled(Button)(({
  theme
}) => ({
  backgroundColor: 'white',
  color: SOJORI_COLORS.gray[600],
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  border: `1px solid ${SOJORI_COLORS.gray[300]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[50],
    borderColor: SOJORI_COLORS.gray[400],
    transform: 'translateY(-1px)'
  }
}));
const validationSchema = t => Yup.object().shape({
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  ownerId: Yup.string().required(t('Owner is required'))
});
const CreateWorkerSidebar = ({
  open,
  onClose,
  onWorkerCreated
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
    setSubmitting
  }) => {
    try {
      const response = await inviteWorker({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        whatsapp: values.whatsapp,
        ownerId: values.ownerId
      });
      if (response.data) {
        onWorkerCreated(response.data);
        onClose();
      }
    } catch (error) {} finally {
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
      overflow: 'hidden'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
        backgroundColor: 'white'
      }}>
                    <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: SOJORI_COLORS.gray[900],
          margin: 0
        }}>
                        {t('Invite Worker')}
                    </h2>
                    <IconButton onClick={onClose} sx={{
          color: SOJORI_COLORS.gray[600],
          '&:hover': {
            backgroundColor: SOJORI_COLORS.gray[100],
            color: SOJORI_COLORS.primary
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
        phone: '',
        whatsapp: '',
        ownerId: initialOwnerId
      }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
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
            scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[100]}`
          }}>
                                <Form id="worker-form" className="space-y-4">
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
                                                {t('Email')} :
                                            </label>
                                            <Field as={TextField} fullWidth name="email" variant="outlined" type="email" size="small" InputProps={{
                    startAdornment: <Mail className="w-4 h-4 mr-2 text-gray-500" />
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
                                            <Field as={TextField} fullWidth name="phone" variant="outlined" size="small" InputProps={{
                    startAdornment: <Phone className="w-4 h-4 mr-2 text-gray-500" />
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
                                            <Field as={TextField} fullWidth name="whatsapp" variant="outlined" size="small" InputProps={{
                    startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  }} />
                                            <ErrorMessage name="whatsapp" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                        <RoleBasedRenderer adminOnly>
                                            <div style={{
                    width: '270px'
                  }}>
                                                <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                                                    {t('Owner')} :
                                                </label>
                                                <FormControl fullWidth size="small">
                                                    <Select id="owner-select" name="ownerId" value={values.ownerId} onChange={handleChange} onBlur={handleBlur} disabled={isLoadingOwners} sx={{
                        width: '100%',
                        minWidth: '270px'
                      }}>
                                                        {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>
                                                                {owner.firstName} {owner.lastName}
                                                            </MenuItem>)}
                                                    </Select>
                                                    <ErrorMessage name="ownerId" component={Typography} className="text-red-500 !text-xs" />
                                                </FormControl>
                                            </div>
                                        </RoleBasedRenderer>
                                    </div>

                                    {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}
                                </Form>
                            </div>

                            <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: `1px solid ${SOJORI_COLORS.gray[200]}`,
            backgroundColor: 'white'
          }}>
                                <ResetButton onClick={onClose} disabled={isSubmitting} style={{
              flex: 1
            }}>
                                    {t('Cancel')}
                                </ResetButton>
                                <StyledButton onClick={submitForm} disabled={isSubmitting} style={{
              flex: 1
            }}>
                                    {isSubmitting ? <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                                            <CircularProgress size={16} color="inherit" />
                                            {t('Inviting...')}
                                        </div> : t('Invite')}
                                </StyledButton>
                            </div>
                        </>}
                </Formik>
            </div>
        </>;
};
export default CreateWorkerSidebar;
