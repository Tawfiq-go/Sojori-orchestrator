import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { updateAdminWhatsapp, getOwners } from '../services/serverApi.task';
import { toast } from 'react-toastify';
import { hasAdminAccess } from 'utils/rbac.utils';
import SidePanel from './SidePanel';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  gray: { 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0', 600: '#757575', 700: '#616161' },
};

const makeValidationSchema = (t) =>
  Yup.object().shape({
    username: Yup.string().required(t('Username is required')),
    language: Yup.string().required(t('Language is required')),
    whatsappPhone: Yup.string().required(t('WhatsApp Phone is required')),
    ownerId: Yup.string().required(t('Owner is required')),
  });

const ModifyStaff = ({ open, handleClose, staff, onStaffUpdate, cities, countries, listings, taskTypes, languages }) => {
  const { t } = useTranslation('common');
  const [owners, setOwners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  const validationSchema = useMemo(() => makeValidationSchema(t), [t]);

  useEffect(() => {
    if (open && isAdmin) fetchOwners();
  }, [open, isAdmin]);

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await getOwners({ limit: 100 });
      if (response?.data) setOwners(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  const staffForForm = staff;
  const initialOwnerId = isAdmin ? staffForForm?.ownerId || '' : user?._id || '';
  const ALLOWED_TYPES = ['Reservation', 'Task', 'Message', 'Reviews', 'ArrivalDeparture'];

  const PERMISSION_LABELS = {
    'Reservation': 'Réservation',
    'Task': 'Tâche',
    'Message': 'Message',
    'Reviews': 'Avis',
    'ArrivalDeparture': 'Arrivée/Départ',
  };

  // Backend peut retourner type en français ou anglais ; on normalise vers la clé anglaise (utilisée dans le formulaire).
  const TYPE_TO_CANONICAL = {
    'Réservation': 'Reservation',
    'Reservation': 'Reservation',
    'Tâche': 'Task',
    'Task': 'Task',
    'Message': 'Message',
    'Avis': 'Reviews',
    'Reviews': 'Reviews',
    'Arrivée/Départ': 'ArrivalDeparture',
    'ArrivalDeparture': 'ArrivalDeparture',
  };

  const defaultPermissionsBase = ALLOWED_TYPES.map((type) => ({ type, access: 'write' }));

  const derivePermissions = (staff) => {
    const base = defaultPermissionsBase;
    if (Array.isArray(staff?.permissions) && staff.permissions.length) {
      const map = new Map();
      staff.permissions.forEach((p) => {
        const canonical = TYPE_TO_CANONICAL[p.type] || p.type;
        let access = p.access;
        if (access !== 'none' && access !== 'read' && access !== 'write') {
          const read = !!p.read;
          const write = !!p.write;
          access = write ? 'write' : read ? 'read' : 'none';
        }
        map.set(canonical, { type: canonical, access });
      });
      return base.map((b) => {
        const found = map.get(b.type);
        return found ? { type: b.type, access: found.access } : b;
      });
    }
    if (Array.isArray(staff?.type)) {
      const w = !!staff.access?.write;
      const r = !!staff.access?.read;
      const access = w ? 'write' : r ? 'read' : 'none';
      return base.map((b) => (staff.type.includes(b.type) ? { type: b.type, access } : b));
    }
    return base;
  };

  // Clés backend (underscores). Support anciennes clés avec points pour rétrocompat.
  const deriveNotifications = (staff) => {
    const n = staff?.notifications || {};
    const get = (backendKey, legacyKey) => n[backendKey] ?? n[legacyKey] ?? false;
    return {
      reservation_new: get('reservation_new', 'reservations.newReservation'),
      reservation_cancelled: get('reservation_cancelled', 'reservations.reservationCancelled'),
      reservation_modified: get('reservation_modified', 'reservations.reservationModified'),
      airbnb_new_request: get('airbnb_new_request', 'airbnbRequestLead.newRequest'),
      lead_new: get('lead_new', 'airbnbRequestLead.newLead'),
      message_received: get('message_received', 'messageReview.messageReceived'),
      message_automated_sent: get('message_automated_sent', 'messageReview.automatedMessageSent'),
      review_new: get('review_new', 'messageReview.newReview'),
      task_createdByCustomer: get('task_createdByCustomer', 'task.taskCreatedByClient'),
    };
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const permissions = values.permissions.map((p) => ({
        type: p.type,
        access: p.access === 'read' || p.access === 'write' ? p.access : 'none',
      }));

      const transformedValues = {
        username: values.username,
        whatsappPhone: values.whatsappPhone,
        language: values.language,
        ownerId: values.ownerId,
        banned: values.banned,
        listingIds: values.listingIds.includes('All') ? ['All'] : values.listingIds,
        permissions: permissions,
        notifications: {
          reservation_new: values.notifications.reservation_new,
          reservation_cancelled: values.notifications.reservation_cancelled,
          reservation_modified: values.notifications.reservation_modified,
          airbnb_new_request: values.notifications.airbnb_new_request,
          lead_new: values.notifications.lead_new,
          message_received: values.notifications.message_received,
          message_automated_sent: values.notifications.message_automated_sent,
          review_new: values.notifications.review_new,
          task_createdByCustomer: values.notifications.task_createdByCustomer,
        },
      };

      const response = await updateAdminWhatsapp(staff._id, transformedValues);
      if (response.data?.success) {
        let newAdminData = response.data.data;
        if (newAdminData.ownerId && (!newAdminData.owner || newAdminData.owner?._id !== newAdminData.ownerId)) {
          const ownerData = owners.find((o) => o._id === newAdminData.ownerId);
          if (ownerData) {
            newAdminData = {
              ...newAdminData,
              owner: {
                _id: ownerData._id,
                firstName: ownerData.firstName,
                lastName: ownerData.lastName,
                email: ownerData.email,
              },
            };
          }
        }
        onStaffUpdate(newAdminData);
        toast.success(t('Admin updated successfully'));
        handleClose();
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('Error updating staff'));
    } finally {
      setSubmitting(false);
    }
  };

  const initialPermissions = derivePermissions(staffForForm);

  return (
    <Formik
      initialValues={{
        username: staffForForm?.username || '',
        whatsappPhone: staffForForm?.whatsappPhone || '',
        language: staffForForm?.language || '',
        listingIds: Array.isArray(staffForForm?.listingIds) ? staffForForm.listingIds.filter(id => id) : [],
        banned: !!staffForForm?.banned,
        ownerId: initialOwnerId,
        permissions: initialPermissions,
        notifications: deriveNotifications(staffForForm),
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ isSubmitting, setFieldValue, values }) => {
        const filteredListings = useMemo(() => {
          if (!Array.isArray(listings)) return [];
          // Si pas admin ou pas de ownerId sélectionné, afficher tous les listings
          if (!isAdmin) return listings;
          if (!values.ownerId) return listings;
          // Filtrer par ownerId OU owner._id (selon la structure des données)
          return listings.filter((l) => l.ownerId === values.ownerId || l.owner?._id === values.ownerId);
        }, [listings, isAdmin, values.ownerId]);

        const handleOwnerChange = (newOwnerId) => {
          setFieldValue('ownerId', newOwnerId);
          // Réinitialiser listingIds quand le owner change
          if (isAdmin && !values.listingIds.includes('All')) {
            const newFilteredListings = listings.filter((l) =>
              l.ownerId === newOwnerId || l.owner?._id === newOwnerId
            );
            const validIds = values.listingIds.filter(id =>
              newFilteredListings.some(listing => listing._id === id)
            );
            setFieldValue('listingIds', validIds);
          }
        };

        return (
          <SidePanel
            open={open}
            onClose={handleClose}
            title={`Admin: ${staff?.username}`}
            width={500}
            footer={
              <>
                <Button onClick={handleClose} variant="outlined" sx={{ flex: 1, textTransform: 'none', borderColor: SOJORI_COLORS.gray[300], color: SOJORI_COLORS.gray[700] }}>
                  Annuler
                </Button>
                <Button
                  onClick={() => document.getElementById('modify-admin-form').requestSubmit()}
                  disabled={isSubmitting}
                  variant="contained"
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    bgcolor: SOJORI_COLORS.primary,
                    color: 'white !important',
                    '&:hover': { bgcolor: SOJORI_COLORS.primaryDark },
                  }}
                >
                  {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
                </Button>
              </>
            }
          >
            <Form id="modify-admin-form">
              <Box sx={{ p: 2 }}>
                {/* Basic Info */}
                <Field
                  as={TextField}
                  fullWidth
                  size="small"
                  name="username"
                  label="Username"
                  sx={{ mb: 1, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: SOJORI_COLORS.primary } }}
                />
                <Field
                  as={TextField}
                  fullWidth
                  size="small"
                  name="whatsappPhone"
                  label="WhatsApp"
                  sx={{ mb: 1, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: SOJORI_COLORS.primary } }}
                />
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <Select
                    name="language"
                    value={values.language}
                    onChange={(e) => setFieldValue('language', e.target.value)}
                    sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SOJORI_COLORS.primary } }}
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang._id} value={lang.name}>
                        {lang.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {isAdmin && (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <Select
                      name="ownerId"
                      value={values.ownerId}
                      onChange={(e) => handleOwnerChange(e.target.value)}
                      disabled={isLoading}
                      sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SOJORI_COLORS.primary } }}
                    >
                      {owners.map((o) => (
                        <MenuItem key={o._id} value={o._id}>
                          {o.firstName} {o.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {!isAdmin && <input type="hidden" name="ownerId" value={values.ownerId} />}

                <Box
                  onClick={() => setFieldValue('banned', !values.banned)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.75,
                    mb: 1,
                    borderRadius: '6px',
                    border: `1px solid ${values.banned ? '#F44336' : '#4CAF50'}`,
                    cursor: 'pointer',
                    bgcolor: values.banned ? '#FFEBEE' : '#E8F5E9',
                  }}
                >
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, color: values.banned ? '#F44336' : '#4CAF50' }}>
                    {values.banned ? 'Banned' : 'Actif'}
                  </Typography>
                  <Switch size="small" checked={values.banned} onChange={(e) => setFieldValue('banned', e.target.checked)} />
                </Box>

                {/* Listings Accordion */}
                <Accordion defaultExpanded sx={{ mb: 1, boxShadow: 'none', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '&.Mui-expanded': { minHeight: 40 }, bgcolor: SOJORI_COLORS.gray[100] }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Annonces ({values.listingIds.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={values.listingIds.includes('All')}
                            onChange={(e) => setFieldValue('listingIds', e.target.checked ? ['All'] : [])}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px', fontWeight: 600 }}>Toutes</Typography>}
                        sx={{ m: 0 }}
                      />
                      {!values.listingIds.includes('All') &&
                        filteredListings.map((listing) => {
                          const isChecked = values.listingIds.includes(listing._id);
                          return (
                            <FormControlLabel
                              key={listing._id}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const checked = e.target.checked;
                                    const newListingIds = checked
                                      ? [...values.listingIds, listing._id]
                                      : values.listingIds.filter((id) => id !== listing._id);
                                    setFieldValue('listingIds', newListingIds);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              }
                              label={<Typography sx={{ fontSize: '10px' }}>{listing.name}</Typography>}
                              sx={{ m: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          );
                        })}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Permissions — 3 valeurs: Aucun accès, Lecture, Écriture */}
                <Accordion sx={{ mb: 1, boxShadow: 'none', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '&.Mui-expanded': { minHeight: 40 }, bgcolor: SOJORI_COLORS.gray[100] }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Permissions</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 1 }}>
                    {values.permissions.map((perm) => (
                      <Box key={perm.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, minWidth: '100px' }}>{PERMISSION_LABELS[perm.type] || perm.type}</Typography>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={perm.access || 'none'}
                            onChange={(e) => {
                              const access = e.target.value;
                              const newPerms = values.permissions.map((p) =>
                                p.type === perm.type ? { type: p.type, access } : p
                              );
                              setFieldValue('permissions', newPerms);
                            }}
                            sx={{ height: 32, fontSize: '11px', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: SOJORI_COLORS.primary } }}
                          >
                            <MenuItem value="none">Aucun accès</MenuItem>
                            <MenuItem value="read">Lecture</MenuItem>
                            <MenuItem value="write">Écriture</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>

                {/* Notifications Accordion */}
                <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '&.Mui-expanded': { minHeight: 40 }, bgcolor: SOJORI_COLORS.gray[100] }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Notifications</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 1 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.3 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.reservation_new}
                            onChange={(e) => setFieldValue('notifications.reservation_new', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Nouvelle réservation</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.reservation_cancelled}
                            onChange={(e) => setFieldValue('notifications.reservation_cancelled', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Réservation annulée</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.reservation_modified}
                            onChange={(e) => setFieldValue('notifications.reservation_modified', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Réservation modifiée</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.airbnb_new_request}
                            onChange={(e) => setFieldValue('notifications.airbnb_new_request', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Nouvelle demande Airbnb</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.lead_new}
                            onChange={(e) => setFieldValue('notifications.lead_new', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Nouveau lead Airbnb</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.message_received}
                            onChange={(e) => setFieldValue('notifications.message_received', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Message reçu</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.message_automated_sent}
                            onChange={(e) => setFieldValue('notifications.message_automated_sent', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Message envoyé automatiquement</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.review_new}
                            onChange={(e) => setFieldValue('notifications.review_new', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Nouvel avis</Typography>}
                        sx={{ m: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!values.notifications.task_createdByCustomer}
                            onChange={(e) => setFieldValue('notifications.task_createdByCustomer', e.target.checked)}
                          />
                        }
                        label={<Typography sx={{ fontSize: '10px' }}>Tâche créée par le client</Typography>}
                        sx={{ m: 0 }}
                      />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Form>
          </SidePanel>
        );
      }}
    </Formik>
  );
};

export default ModifyStaff;
