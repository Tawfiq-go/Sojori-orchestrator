import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Drawer, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Box, Checkbox, ListItemText, IconButton, Switch, FormHelperText } from '@mui/material';
import { styled } from '@mui/material/styles';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import SidePanel from './SidePanel';
import { User, MessageSquare, X, Globe, MapPinned, Languages, Type } from 'lucide-react';
import { CreateAdminWhatsapp, getOwners } from '../services/serverApi.task';
import ListingSelector from './ListingSelector';
import { hasAdminAccess } from 'utils/rbac.utils';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import PermissionsMatrix from './PermissionsMatrix';
import { booleanMapFromGroups, groupsFromBooleanMap, NOTIFICATION_CATEGORIES } from './NotificationsSection';
import NotificationsSection from './NotificationsSection';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
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
const ALLOWED_TYPES = ['Reservation', 'Task', 'Message', 'Reviews', 'ArrivalDeparture'];
const makeValidationSchema = t => Yup.object().shape({
  username: Yup.string().required(t('Username is required')),
  language: Yup.string().required(t('Language is required')),
  whatsappPhone: Yup.string().required(t('WhatsApp Phone is required')),
  listingIds: Yup.array(),
  ownerId: Yup.string().required(t('Owner is required'))
});
const CreateStaffDialog = ({
  open,
  handleClose,
  onStaffCreated,
  cities,
  countries,
  listings,
  taskTypes,
  languages
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState([]);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  useEffect(() => {
    if (open && isAdmin) fetchOwners();
  }, [open, isAdmin]);
  const validationSchema = useMemo(() => makeValidationSchema(t), [t]);
  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await getOwners({
        limit: 100
      });
      if (response && response.data) setOwners(response.data);
    } finally {
      setIsLoading(false);
    }
  };
  const defaultPermissions = () => ALLOWED_TYPES.map(type => ({
    type,
    access: 'write'
  }));
  const initialOwnerId = isAdmin ? '' : user?._id || '';
  const handleSubmit = async (values, {
    setSubmitting
  }) => {
    try {
      const permissions = (values.permissions || []).map(p => ({
        type: p.type,
        access: p.access === 'read' || p.access === 'write' ? p.access : 'none'
      }));
      const transformedValues = {
        ...values,
        listingIds: values.listingIds.includes('All') ? ['All'] : values.listingIds,
        countryIds: values.countryIds.includes('All') ? ['All'] : values.countryIds,
        cityIds: values.cityIds.includes('All') ? ['All'] : values.cityIds,
        permissions,
        notifications: booleanMapFromGroups(values.notifications, t)
      };
      const response = await CreateAdminWhatsapp(transformedValues);
      if (response.data && response.data.success) {
        let newAdminData = response.data.data;
        if (newAdminData.ownerId) {
          const ownerData = owners.find(o => o._id === newAdminData.ownerId);
          if (ownerData) {
            newAdminData = {
              ...newAdminData,
              owner: {
                _id: ownerData._id,
                firstName: ownerData.firstName,
                lastName: ownerData.lastName,
                email: ownerData.email
              }
            };
          }
        }
        onStaffCreated(newAdminData);
        toast.success(t('Admin Whatsapp created successfully'));
        handleClose();
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      const err = error.response?.data;
      if (!err) toast.error(t('An unexpected error occurred'));else if (Array.isArray(err.error)) err.error.forEach(e => toast.error(e.message || e.longMessage || t('An error occurred')));else toast.error(err.error || err.message || t('An error occurred while creating staff'));
    } finally {
      setSubmitting(false);
    }
  };
  return <Formik initialValues={{
    username: '',
    whatsappPhone: '',
    language: '',
    listingIds: [],
    countryIds: [],
    cityIds: [],
    banned: false,
    ownerId: initialOwnerId,
    permissions: defaultPermissions(),
    notifications: {
      reservation: [],
      airbnb: [],
      message_review: [],
      task: []
    }
  }} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({
      isSubmitting,
      setFieldValue,
      values,
      submitForm
    }) => {
      // Listings filtered by selected owner (admin); otherwise keep as-is or use user's owner
      const filteredListings = useMemo(() => {
        if (!Array.isArray(listings)) return [];
        if (!isAdmin) return listings; // non-admin: no change
        if (!values.ownerId) return listings; // admin with no owner selected: show all
        const oid = values.ownerId;
        return listings.filter(l => l.ownerId === oid);
      }, [listings, isAdmin, values.ownerId]);
      useEffect(() => {
        if (!isAdmin) return;
        if (!values.ownerId) return;
        const allowed = new Set(filteredListings.map(l => String(l._id)));
        const current = Array.isArray(values.listingIds) ? values.listingIds : [];
        const allValid = current.every(id => allowed.has(String(id)));
        if (!allValid) {
          setFieldValue('listingIds', []);
        }
      }, [isAdmin, values.ownerId, filteredListings, values.listingIds, setFieldValue]);
      return <SidePanel open={open} onClose={handleClose} title={t('Create Admin Whatsapp')} width={600} footer={<>
          <ResetButton onClick={handleClose} disabled={isSubmitting} sx={{
          flex: 1,
          fontSize: 14
        }}>
            {t('Cancel')}
          </ResetButton>
          <StyledButton type="submit" variant="contained" onClick={submitForm} disabled={isSubmitting} sx={{
          flex: 1,
          fontSize: 14
        }}>
            {isSubmitting ? t('Creating...') : t('Create Admin')}
          </StyledButton>
          </>}>
      <Form>
            {/* Scrollable content */}
            <Box sx={{
            p: 3,
            flex: 1,
            overflow: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[100]}`
          }}>
              {/* === your existing fields, unchanged === */}
              <Box className="flex flex-col gap-3 mt-3">
                <Box>
                  <Field as={TextField} fullWidth name="username" label={t('Username')} slotProps={{
                  input: {
                    startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
                  }
                }} />
                  <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs" />
                </Box>

                <RoleBasedRenderer adminOnly>
                  <FormControl fullWidth error={Boolean(<ErrorMessage name="ownerId" />)}>
                    <InputLabel id="owner-select-label">{t('Owner')}</InputLabel>
                    <Select labelId="owner-select-label" id="owner-select" name="ownerId" value={values.ownerId} label={t('Owner')} onChange={e => setFieldValue('ownerId', e.target.value)} disabled={isLoading}>
                      {owners.map(owner => <MenuItem key={owner._id} value={owner._id}>{owner.firstName} {owner.lastName}</MenuItem>)}
                    </Select>
                    <ErrorMessage name="ownerId" component={FormHelperText} className="text-red-500" />
                  </FormControl>
                </RoleBasedRenderer>

                {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}

                <FormControl fullWidth>
                  <ListingSelector listings={isAdmin ? filteredListings : listings} selectedIds={values.listingIds} onChange={newIds => setFieldValue('listingIds', newIds)} showAllOption />
                  <ErrorMessage name="listingIds" component={Typography} className="text-red-500 !text-xs" />
                </FormControl>

                <Box className="flex gap-2">
                  <Box className="w-full">
                    <Field as={TextField} fullWidth name="whatsappPhone" label={t('WhatsApp Phone')} slotProps={{
                    input: {
                      startAdornment: <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                    }
                  }} />
                    <ErrorMessage name="whatsappPhone" component={Typography} className="text-red-500 !text-xs" />
                  </Box>
                </Box>

                {/* <Box className="flex gap-2">
                  <FormControl fullWidth>
                    <InputLabel id="countries-label">{t('Countries')}</InputLabel>
                    <Select
                      labelId="countries-label"
                      multiple
                      value={values.countryIds}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.includes('All')) { setFieldValue('countryIds', ['All']); setFieldValue('cityIds', ['All']); }
                        else { setFieldValue('countryIds', v); setFieldValue('cityIds', []); }
                      }}
                      renderValue={(sel) => sel.includes('All')
                        ? t('All Countries')
                        : sel.map((id) => countries.find(c => c._id === id)?.name || '').join(', ')}
                      startAdornment={<Globe className="w-4 h-4 ml-2 text-gray-500" />}
                    >
                      <MenuItem value="All"><Checkbox checked={values.countryIds.includes('All')} /><ListItemText primary={t('All Countries')} /></MenuItem>
                      {!values.countryIds.includes('All') && countries.map((c) => (
                        <MenuItem key={c._id} value={c._id}><Checkbox checked={values.countryIds.includes(c._id)} /><ListItemText primary={c.name} /></MenuItem>
                      ))}
                    </Select>
                    <ErrorMessage name="countryIds" component={Typography} className="text-red-500 !text-xs" />
                  </FormControl>
                   <FormControl fullWidth>
                    <InputLabel id="cities-label">{t('Cities')}</InputLabel>
                    <Select
                      labelId="cities-label"
                      multiple
                      value={values.cityIds}
                      onChange={(e) => setFieldValue('cityIds', e.target.value.includes('All') ? ['All'] : e.target.value)}
                      renderValue={(sel) => sel.includes('All')
                        ? t('All Cities')
                        : sel.map((id) => cities.find(c => c._id === id)?.name || '').join(', ')}
                      startAdornment={<MapPinned className="w-4 h-4 ml-2 text-gray-500" />}
                      disabled={values.countryIds.includes('All')}
                    >
                      <MenuItem value="All"><Checkbox checked={values.cityIds.includes('All')} /><ListItemText primary={t('All Cities')} /></MenuItem>
                      {!values.cityIds.includes('All') &&
                        cities.filter(city => values.countryIds.includes(city.countryId)).map(city => (
                          <MenuItem key={city._id} value={city._id}>
                            <Checkbox checked={values.cityIds.includes(city._id)} /><ListItemText primary={city.name} />
                          </MenuItem>
                        ))}
                    </Select>
                    <ErrorMessage name="cityIds" component={Typography} className="text-red-500 !text-xs" />
                  </FormControl>
                 </Box> */}

                <Box className="flex gap-2">
                  <FormControl fullWidth>
                    <InputLabel id="language-label">{t('Language')}</InputLabel>
                    <Field as={Select} labelId="language-label" id="language" name="language" startAdornment={<Box component="span" sx={{
                    mr: 1
                  }}><Languages className="w-4 h-4 text-gray-500" /></Box>}>
                      {languages.map(lang => <MenuItem key={lang._id} value={lang.name}>{lang.name}</MenuItem>)}
                    </Field>
                    <ErrorMessage name="language" component={Typography} className="text-red-500 !text-xs" />
                  </FormControl>

                  
                </Box>

                <Box className="gap-2">
                  {/* <FormControl fullWidth>
                    <InputLabel id="type-label">{t('Types')}</InputLabel>
                    <Select
                      labelId="type-label"
                      multiple
                      value={values.type}
                      onChange={(e) => setFieldValue('type', e.target.value)}
                      renderValue={(selected) => selected.join(', ')}
                      startAdornment={<Box component="span" sx={{ mr: 1 }}><Type className="w-4 h-4 text-gray-500" /></Box>}
                    >
                      {taskTypes.map((taskType) => (
                        <MenuItem key={taskType._id} value={taskType.task} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox checked={values.type.includes(taskType.task)} sx={{ p: '4px' }} />
                          <Typography variant="body1">{taskType.task}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                    <ErrorMessage name="type" component={Typography} className="text-red-500 !text-xs mt-1" />
                   </FormControl>
                   <Field name="access.read">
                    {({ field }) => (
                      <div>
                        <Switch {...field} checked={field.value}
                                onChange={(e) => setFieldValue('access', { ...values.access, read: e.target.checked })} />
                        {t('read')}
                      </div>
                    )}
                   </Field>
                   <Field name="access.write">
                    {({ field }) => (
                      <div>
                        <Switch {...field} checked={field.value}
                                onChange={(e) => setFieldValue('access', { ...values.access, write: e.target.checked })} />
                        {t('write')}
                      </div>
                    )}
                   </Field> */}
                <PermissionsMatrix taskTypes={taskTypes} value={values.permissions} onChange={next => setFieldValue('permissions', next)} t={t} allowedTypes={ALLOWED_TYPES} />

                <NotificationsSection value={values.notifications} onChange={next => setFieldValue('notifications', next)} t={t} />
                </Box>
              </Box>
            </Box>
      </Form>
     </SidePanel>;
    }}
      </Formik>;
};
export default CreateStaffDialog;
