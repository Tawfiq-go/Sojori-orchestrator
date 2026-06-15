import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Button, FormControl, Select, MenuItem, TextField, Checkbox, FormControlLabel, Switch, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { updateWorker, getOwners } from '../services/serverApi.task';
import { hasAdminAccess } from 'utils/rbac.utils';
import { useTranslation } from 'react-i18next';
import SidePanel from './SidePanel';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    600: '#757575',
    700: '#616161'
  }
};
const ALL_MODULES = {
  PMS: {
    label: 'PMS',
    price: 100
  },
  WhGuest: {
    label: 'WhatsApp Guest',
    price: 100
  },
  WhStaff: {
    label: 'WhatsApp Staff',
    price: 100
  },
  WhPMS: {
    label: 'WhatsApp PMS',
    price: 100
  },
  RMS: {
    label: 'Dynamic Pricing',
    price: 100
  },
  MessageAndReview: {
    label: 'Message & Review',
    price: 100
  }
};
const validationSchema = t => Yup.object().shape({
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  ownerId: Yup.string().required(t('Owner is required')),
  banned: Yup.boolean(),
  deleted: Yup.boolean(),
  selectedModules: Yup.array()
});

// Ultra-compact Worker modal with SidePanel and Accordions
const UpdateWorkerSidebar = ({
  open,
  onClose,
  worker,
  onWorkerUpdated
}) => {
  const {
    t
  } = useTranslation('common');
  const [owners, setOwners] = useState([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [availableModules, setAvailableModules] = useState({});
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = hasAdminAccess(user?.role);
  const initialModules = worker?.permissions?.map(perm => perm.module) || [];
  useEffect(() => {
    if (open) {
      if (isAdmin) {
        fetchOwners();
        setAvailableModules(ALL_MODULES);
      } else {
        const ownerModules = {};
        if (user?.subscriptionModules && user.subscriptionModules.length > 0) {
          user.subscriptionModules.forEach(mod => {
            ownerModules[mod.module] = {
              label: mod.label || mod.module,
              price: mod.price || 100
            };
          });
        }
        setAvailableModules(ownerModules);
      }
    }
  }, [open, isAdmin, user]);
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
      const permissions = values.selectedModules.map(moduleKey => ({
        module: moduleKey,
        actions: ['get', 'create', 'update', 'delete']
      }));
      const response = await updateWorker(worker._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        whatsapp: values.whatsapp,
        ownerId: values.ownerId,
        banned: values.banned,
        deleted: values.deleted,
        permissions: permissions
      });
      if (response.data && response.data.account) {
        let updatedWorker = response.data.account;
        if (values.ownerId && (!updatedWorker.owner || updatedWorker.owner?._id !== values.ownerId)) {
          const ownerData = owners.find(owner => owner._id === values.ownerId);
          if (ownerData) {
            updatedWorker = {
              ...updatedWorker,
              owner: {
                _id: ownerData._id,
                firstName: ownerData.firstName,
                lastName: ownerData.lastName,
                email: ownerData.email
              }
            };
          }
        }
        onWorkerUpdated(updatedWorker);
        // Debug log to check if this path is reached
        onClose();
      } else {
        throw new Error('Unexpected response: account data missing');
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || t('Failed to update worker')
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (!worker) return null;
  const initialOwnerId = isAdmin ? worker.owner?._id || '' : user?._id || '';
  return <Formik initialValues={{
    firstName: worker.firstName || '',
    lastName: worker.lastName || '',
    email: worker.email || '',
    phone: worker.phone || '',
    whatsapp: worker.whatsapp || '',
    ownerId: initialOwnerId,
    banned: worker.banned || false,
    deleted: worker.deleted || false,
    selectedModules: initialModules
  }} validationSchema={validationSchema(t)} onSubmit={handleSubmit}>
            {({
      values,
      isSubmitting,
      setFieldValue
    }) => <SidePanel open={open} onClose={onClose} title={`Modifier Worker: ${worker.firstName} ${worker.lastName}`} width={500} footer={<>
                            <Button onClick={onClose} variant="outlined" sx={{
        flex: 1,
        textTransform: 'none',
        borderColor: SOJORI_COLORS.gray[300],
        color: SOJORI_COLORS.gray[700]
      }}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={() => document.getElementById('update-worker-form').requestSubmit()} disabled={isSubmitting} variant="contained" sx={{
        flex: 1,
        textTransform: 'none',
        bgcolor: SOJORI_COLORS.primary,
        color: 'white !important',
        '&:hover': {
          bgcolor: SOJORI_COLORS.primaryDark
        }
      }}>
                                {isSubmitting ? t('Updating...') : t('Update')}
                            </Button>
                        </>}>
                    <Form id="update-worker-form">
                        <Box sx={{
          p: 2
        }}>
                            {/* Basic Info */}
                            <Field as={TextField} fullWidth size="small" name="firstName" label={t('First Name')} sx={{
            mb: 1,
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: SOJORI_COLORS.primary
            }
          }} />
                            <Field as={TextField} fullWidth size="small" name="lastName" label={t('Last Name')} sx={{
            mb: 1,
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: SOJORI_COLORS.primary
            }
          }} />
                            <Field as={TextField} fullWidth size="small" name="email" label={t('Email')} disabled sx={{
            mb: 1,
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: SOJORI_COLORS.primary
            }
          }} />
                            <Field as={TextField} fullWidth size="small" name="phone" label={t('Phone')} sx={{
            mb: 1,
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: SOJORI_COLORS.primary
            }
          }} />
                            <Field as={TextField} fullWidth size="small" name="whatsapp" label={t('WhatsApp')} sx={{
            mb: 1,
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: SOJORI_COLORS.primary
            }
          }} />

                            {isAdmin && <FormControl fullWidth size="small" sx={{
            mb: 1
          }}>
                                    <Select name="ownerId" value={values.ownerId} onChange={e => setFieldValue('ownerId', e.target.value)} disabled={isLoadingOwners} sx={{
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: SOJORI_COLORS.primary
              }
            }}>
                                        {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>
                                                {owner.firstName} {owner.lastName}
                                            </MenuItem>)}
                                    </Select>
                                </FormControl>}

                            {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}

                            {/* Status */}
                            <Box sx={{
            display: 'flex',
            gap: 1,
            mb: 1
          }}>
                                <FormControlLabel control={<Switch size="small" checked={values.banned} onChange={e => setFieldValue('banned', e.target.checked)} sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#ef4444'
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#ef4444'
              }
            }} />} label={<Typography sx={{
              fontSize: '11px'
            }}>{t('Banned')}</Typography>} sx={{
              m: 0
            }} />
                                <FormControlLabel control={<Switch size="small" checked={values.deleted} onChange={e => setFieldValue('deleted', e.target.checked)} sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#ef4444'
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#ef4444'
              }
            }} />} label={<Typography sx={{
              fontSize: '11px'
            }}>{t('Deleted')}</Typography>} sx={{
              m: 0
            }} />
                            </Box>

                            {/* Permissions Accordion */}
                            <Accordion defaultExpanded sx={{
            boxShadow: 'none',
            '&:before': {
              display: 'none'
            }
          }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
              minHeight: 40,
              '&.Mui-expanded': {
                minHeight: 40
              },
              bgcolor: SOJORI_COLORS.gray[100]
            }}>
                                    <Typography sx={{
                fontSize: '13px',
                fontWeight: 600
              }}>
                                        {t('Worker Permissions')} ({values.selectedModules.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{
              p: 1
            }}>
                                    {Object.keys(availableModules).length === 0 ? <Typography sx={{
                fontSize: '10px',
                fontStyle: 'italic',
                color: SOJORI_COLORS.gray[600]
              }}>
                                            {t('You don t have any subscription modules to assign.')}
                                        </Typography> : <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0.3
              }}>
                                            {Object.entries(availableModules).map(([moduleKey, {
                  label
                }]) => <FormControlLabel key={moduleKey} control={<Checkbox size="small" checked={values.selectedModules.includes(moduleKey)} onChange={e => {
                  if (e.target.checked) {
                    setFieldValue('selectedModules', [...values.selectedModules, moduleKey]);
                  } else {
                    setFieldValue('selectedModules', values.selectedModules.filter(m => m !== moduleKey));
                  }
                }} />} label={<Typography sx={{
                  fontSize: '10px'
                }}>{label}</Typography>} sx={{
                  m: 0
                }} />)}
                                        </Box>}
                                </AccordionDetails>
                            </Accordion>
                        </Box>
                    </Form>
                </SidePanel>}
        </Formik>;
};
export default UpdateWorkerSidebar;
