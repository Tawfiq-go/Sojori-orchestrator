import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, Tabs, Tab, IconButton, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Select, MenuItem, FormControl, InputLabel, Checkbox, ListItemText, Accordion, AccordionSummary, AccordionDetails, Collapse, CircularProgress, Paper, Stack, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Users, UserPlus, Search, Filter, Edit2, Trash2, Calendar, TrendingUp, Settings, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import StaffConfigTab from './StaffConfigTab';
import StaffPlanningTab from './StaffPlanningTab';
import StaffWorkloadTab from './StaffWorkloadTab';
import StaffExceptionDialog from './StaffExceptionDialog';
import StaffExceptionsList from './StaffExceptionsList';
import StaffAssignmentsTab from './StaffAssignmentsTab';
import { getStaffSimplified, createStaffSimplified, updateStaffSimplified, deleteStaffSimplified } from '../services/serverApi.staffSimplified';
import { getListingsTa } from '../../tasks/services/serverApi.task';
import { getcities, getcountries } from '../../setting/services/serverApi.adminConfig';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { useTeamViewMode } from '../../../context/TeamViewContext';
import { canSelectOwnerInAdminFilter, getPropertyOwnerScopeId } from 'utils/taskScope.utils';
import { TeamHubMemberCard, TeamHubCardGrid } from '../../../components/team/TeamHubMemberCard';
import { TeamHubListTable } from '../../../components/team/TeamHubListTable';
import { TeamHubPagination } from '../../../components/team/TeamHubPagination';
import { TEAM_T } from '../../../components/team/teamHubTokens';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    600: '#4B5563',
    900: '#111827'
  }
};

// Task Categories avec icônes
const TASK_CATEGORIES = [{
  id: 'ARRIVAL',
  label: 'Arrivée',
  icon: '🚪',
  color: '#3B82F6'
}, {
  id: 'DEPARTURE',
  label: 'Départ',
  icon: '🚪',
  color: '#8B5CF6'
}, {
  id: 'CLEANING',
  label: 'Ménage',
  icon: '🧹',
  color: '#10B981'
}, {
  id: 'REGISTRATION',
  label: 'Enregistrement',
  icon: '📋',
  color: '#06B6D4'
},
// ✅ NEW: Added REGISTRATION
{
  id: 'TRANSPORT',
  label: 'Transport',
  icon: '🚗',
  color: '#F59E0B'
}, {
  id: 'GROCERIES',
  label: 'Courses',
  icon: '🛒',
  color: '#EC4899'
}, {
  id: 'SUPPORT',
  label: 'Assistance',
  icon: '🆘',
  color: '#EF4444'
}, {
  id: 'MAINTENANCE',
  label: 'Maintenance',
  icon: '🔧',
  color: '#6B7280'
}, {
  id: 'CUSTOM',
  label: 'Personnalisé',
  icon: '✨',
  color: '#14B8A6'
}];
const STAFF_TYPES = ['salaried', 'Self-employed', 'Company', 'Individual activities'];
const MEMBER_ROLES = [{
  value: 'Staff',
  label: 'Staff'
}, {
  value: 'Manager',
  label: 'Manager'
}];
const createValidationSchema = Yup.object().shape({
  username: Yup.string().required('Nom requis'),
  email: Yup.string().email('Email invalide').required('Email requis'),
  callPhone: Yup.string().required('Téléphone requis'),
  whatsappPhone: Yup.string().required('WhatsApp requis'),
  categories: Yup.array().min(1, 'Au moins une catégorie requise').required(),
  listingIds: Yup.array().min(1, 'Au moins une propriété requise').required(),
  cityIds: Yup.array().min(1, 'Au moins une ville requise').required(),
  countryIds: Yup.array().min(1, 'Au moins un pays requis').required(),
  staffType: Yup.string().required('Type de staff requis'),
  memberRole: Yup.string().oneOf(['Staff', 'Manager']).default('Staff')
});
const StaffManagementView = ({
  isEmbedded = false,
  mode = 'cards',
  staffFromParent = null,
  onStaffUpdated
}) => {
  const user = useSelector(state => state.auth.user);
  const { requestOwnerId } = useAdminOwnerFilter();
  const { viewMode: teamViewMode, setTeamStats } = useTeamViewMode();
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const staffList = staffFromParent != null ? staffFromParent : staff;
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openExceptionDialog, setOpenExceptionDialog] = useState(false);
  const [exceptionRefreshTrigger, setExceptionRefreshTrigger] = useState(0);

  // Filter data
  const [listings, setListings] = useState([]);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    if (mode === 'cards' || !staffFromParent) {
      loadStaff();
    }
    loadFilterData();
  }, [page, limit, searchText, mode, requestOwnerId]);

  useEffect(() => {
    const active = staffList.filter((s) => s.isActive !== false).length;
    setTeamStats([
      { icon: '👥', label: 'Staff terrain', value: String(totalCount) },
      { icon: '⚡', label: 'Actifs', value: String(active) },
    ]);
  }, [staffList, totalCount, setTeamStats]);
  const loadStaff = async () => {
    setLoading(true);
    try {
      const requestParams = {
        page,
        limit,
        search: searchText
      };
      if (requestOwnerId) {
        requestParams.ownerId = requestOwnerId;
      }
      const response = await getStaffSimplified(requestParams);
      setStaff(response.staff || []);
      setTotalCount(response.pagination?.totalCount || 0);
    } catch (error) {
      setStaff([]);
      setTotalCount(0);
      toast.error('Erreur lors du chargement des staff');
    } finally {
      setLoading(false);
    }
  };
  const loadFilterData = async () => {
    try {
      const [listingsRes, citiesRes, countriesRes] = await Promise.all([getListingsTa(), getcities(), getcountries()]);
      setListings(listingsRes || []);
      setCities(citiesRes || []);
      setCountries(countriesRes || []);
    } catch (error) {}
  };
  const handleCreateStaff = async (values, {
    setSubmitting,
    resetForm
  }) => {
    try {
      const targetOwner = requestOwnerId ?? getPropertyOwnerScopeId(user);
      if (canSelectOwnerInAdminFilter(user) && !requestOwnerId) {
        toast.error("Sélectionnez un propriétaire (filtre en tête d'équipe) avant d'ajouter un membre staff.");
        return;
      }
      const staffData = {
        ...values,
        ownerId: targetOwner || (user?._id || user?.id)
      };
      const response = await createStaffSimplified(staffData);
      toast.success('Staff créé avec succès');
      setOpenCreateDialog(false);
      resetForm();
      await loadStaff();
      onStaffUpdated?.();
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || 'Erreur lors de la création du staff';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  const handleUpdateStaff = async (values, {
    setSubmitting
  }) => {
    try {
      await updateStaffSimplified(selectedStaff.staffCode, values);
      toast.success('Staff mis à jour avec succès');
      setOpenEditDialog(false);
      loadStaff();
      onStaffUpdated?.();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du staff');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteStaff = async staffCode => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce staff ?')) {
      return;
    }
    try {
      await deleteStaffSimplified(staffCode);
      toast.success('Staff supprimé avec succès');
      loadStaff();
    } catch (error) {
      toast.error('Erreur lors de la suppression du staff');
    }
  };
  const handleStaffClick = staffMember => {
    // Toggle collapse
    if (selectedStaff?.staffCode === staffMember.staffCode) {
      setSelectedStaff(null); // Close if already open
    } else {
      setSelectedStaff(staffMember);
      setSelectedTab(0); // Reset to first tab
    }
  };
  const renderStaffForm = (formik, isEdit = false) => <Form>
      <Grid container spacing={2}>
        {/* Left column: Infos principales, Contact, Langue, Catégories */}
        <Grid item xs={12} md={7}>
          <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
            {/* Section: Informations principales */}
            <Box sx={{
            p: 2,
            mb: 1,
            bgcolor: SOJORI_COLORS.gray[50],
            borderRadius: 2,
            border: `2px solid ${SOJORI_COLORS.primary}`
          }}>
            <Typography sx={{
              fontSize: '15px',
              fontWeight: 700,
              color: SOJORI_COLORS.primary,
              mb: 2
            }}>
              📝 Informations principales
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth name="username" label="Nom du staff" value={formik.values.username} onChange={formik.handleChange} error={formik.touched.username && Boolean(formik.errors.username)} helperText={formik.touched.username && formik.errors.username} sx={{
                  '& .MuiInputLabel-root': {
                    fontWeight: 600
                  },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    '& fieldset': {
                      borderWidth: 2
                    }
                  }
                }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth name="email" label="Email" type="email" value={formik.values.email} onChange={formik.handleChange} error={formik.touched.email && Boolean(formik.errors.email)} helperText={formik.touched.email && formik.errors.email} sx={{
                  '& .MuiInputLabel-root': {
                    fontWeight: 600
                  },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    '& fieldset': {
                      borderWidth: 2
                    }
                  }
                }} />
              </Grid>
            </Grid>
          </Box>

        {/* Section: Contact */}
        <Box sx={{
            mt: 1
          }}>
          <Typography sx={{
              fontSize: '14px',
              fontWeight: 700,
              color: SOJORI_COLORS.gray[900],
              mb: 1
            }}>
            📞 Contact
          </Typography>
        </Box>
        <Grid item xs={12} md={4}>
          <TextField fullWidth name="callPhone" label="Téléphone" value={formik.values.callPhone} onChange={formik.handleChange} error={formik.touched.callPhone && Boolean(formik.errors.callPhone)} helperText={formik.touched.callPhone && formik.errors.callPhone} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth name="whatsappPhone" label="WhatsApp" value={formik.values.whatsappPhone} onChange={formik.handleChange} error={formik.touched.whatsappPhone && Boolean(formik.errors.whatsappPhone)} helperText={formik.touched.whatsappPhone && formik.errors.whatsappPhone} />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth error={formik.touched.language && Boolean(formik.errors.language)} sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#FFF5F0',
                '& fieldset': {
                  borderWidth: 2,
                  borderColor: SOJORI_COLORS.primary
                }
              }
            }}>
            <InputLabel sx={{
                fontWeight: 600,
                color: SOJORI_COLORS.primary
              }}>🌐 Langue</InputLabel>
            <Select name="language" value={formik.values.language || 'French'} onChange={formik.handleChange} label="🌐 Langue">
              <MenuItem value="French">🇫🇷 Français</MenuItem>
              <MenuItem value="Arabic">🇲🇦 العربية (Arabe)</MenuItem>
              <MenuItem value="English">🇬🇧 English</MenuItem>
            </Select>
            {formik.touched.language && formik.errors.language && <Typography sx={{
                color: 'error.main',
                fontSize: '12px',
                mt: 0.5
              }}>{formik.errors.language}</Typography>}
          </FormControl>
        </Grid>

        {/* Categories */}
        <Grid item xs={12}>
          <Typography sx={{
              fontSize: '14px',
              fontWeight: 700,
              color: SOJORI_COLORS.gray[900],
              mb: 1,
              mt: 1
            }}>
            🏷️ Catégories & Localisation
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth error={formik.touched.categories && Boolean(formik.errors.categories)}>
            <InputLabel>Catégories de tâches</InputLabel>
            <Select multiple name="categories" value={formik.values.categories} onChange={formik.handleChange} renderValue={selected => <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5
              }}>
                  {selected.map(value => {
                  const cat = TASK_CATEGORIES.find(c => c.id === value);
                  if (!cat) return null;
                  return <Chip key={value} label={`${cat.icon} ${cat.label}`} size="small" sx={{
                    bgcolor: cat.color,
                    color: 'white'
                  }} />;
                })}
                </Box>}>
              {TASK_CATEGORIES.map(cat => <MenuItem key={cat.id} value={cat.id}>
                  <Checkbox checked={formik.values.categories.includes(cat.id)} />
                  <ListItemText primary={`${cat.icon} ${cat.label}`} />
                </MenuItem>)}
            </Select>
          </FormControl>
        </Grid>

        {/* Listings */}
        <Grid item xs={12}>
          <FormControl fullWidth error={formik.touched.listingIds && Boolean(formik.errors.listingIds)}>
            <InputLabel>Propriétés</InputLabel>
            <Select multiple name="listingIds" value={formik.values.listingIds} onChange={e => {
                const newValue = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                const oldValue = formik.values.listingIds || [];
                if (newValue.includes('All') && !oldValue.includes('All')) {
                  formik.setFieldValue('listingIds', ['All']);
                } else if (oldValue.includes('All') && newValue.length > 1) {
                  formik.setFieldValue('listingIds', newValue.filter(v => v !== 'All'));
                } else {
                  formik.setFieldValue('listingIds', newValue);
                }
              }} renderValue={selected => {
                if (selected.includes('All')) return 'Toutes les propriétés';
                return `${selected.length} propriété(s) sélectionnée(s)`;
              }}>
              <MenuItem key="all-listings" value="All">
                <Checkbox checked={formik.values.listingIds.includes('All')} />
                <ListItemText primary="Toutes les propriétés" />
              </MenuItem>
              {Array.isArray(listings) && listings.filter(listing => listing && (listing._id || listing.id)).map(listing => {
                  const listingId = listing._id || listing.id;
                  return <MenuItem key={listingId} value={listingId}>
                      <Checkbox checked={formik.values.listingIds.includes(listingId)} />
                      <ListItemText primary={listing.name || 'Sans nom'} />
                    </MenuItem>;
                })}
            </Select>
          </FormControl>
        </Grid>

        {/* Cities & Countries */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Villes</InputLabel>
            <Select multiple name="cityIds" value={formik.values.cityIds} onChange={e => {
                const newValue = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                const oldValue = formik.values.cityIds || [];
                if (newValue.includes('All') && !oldValue.includes('All')) {
                  formik.setFieldValue('cityIds', ['All']);
                } else if (oldValue.includes('All') && newValue.length > 1) {
                  formik.setFieldValue('cityIds', newValue.filter(v => v !== 'All'));
                } else {
                  formik.setFieldValue('cityIds', newValue);
                }
              }} renderValue={selected => {
                if (selected.includes('All')) return 'Toutes les villes';
                return `${selected.length} ville(s)`;
              }}>
              <MenuItem key="all-cities" value="All">
                <Checkbox checked={formik.values.cityIds.includes('All')} />
                <ListItemText primary="Toutes les villes" />
              </MenuItem>
              {Array.isArray(cities) && cities.filter(city => city && (city._id || city.id)).map(city => {
                  const cityId = city._id || city.id;
                  return <MenuItem key={cityId} value={cityId}>
                      <Checkbox checked={formik.values.cityIds.includes(cityId)} />
                      <ListItemText primary={city.name || 'Sans nom'} />
                    </MenuItem>;
                })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Pays</InputLabel>
            <Select multiple name="countryIds" value={formik.values.countryIds} onChange={e => {
                const newValue = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                const oldValue = formik.values.countryIds || [];
                if (newValue.includes('All') && !oldValue.includes('All')) {
                  formik.setFieldValue('countryIds', ['All']);
                } else if (oldValue.includes('All') && newValue.length > 1) {
                  formik.setFieldValue('countryIds', newValue.filter(v => v !== 'All'));
                } else {
                  formik.setFieldValue('countryIds', newValue);
                }
              }} renderValue={selected => {
                if (selected.includes('All')) return 'Tous les pays';
                return `${selected.length} pays`;
              }}>
              <MenuItem key="all-countries" value="All">
                <Checkbox checked={formik.values.countryIds.includes('All')} />
                <ListItemText primary="Tous les pays" />
              </MenuItem>
              {Array.isArray(countries) && countries.filter(country => country && (country._id || country.id)).map(country => {
                  const countryId = country._id || country.id;
                  return <MenuItem key={countryId} value={countryId}>
                      <Checkbox checked={formik.values.countryIds.includes(countryId)} />
                      <ListItemText primary={country.name || 'Sans nom'} />
                    </MenuItem>;
                })}
            </Select>
          </FormControl>
        </Grid>
        </Box>
        </Grid>

        {/* Right column: Configuration (comme pour réservations) */}
        <Grid item xs={12} md={5}>
          <Box sx={{
          p: 2,
          bgcolor: SOJORI_COLORS.gray[50],
          borderRadius: 2,
          border: `2px solid ${SOJORI_COLORS.gray[200]}`,
          height: '100%'
        }}>
            <Typography sx={{
            fontSize: '14px',
            fontWeight: 700,
            color: SOJORI_COLORS.gray[900],
            mb: 2
          }}>
              ⚙️ Configuration
            </Typography>
            <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
              {/* Rôle Staff / Manager */}
              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select name="memberRole" value={formik.values.memberRole || 'Staff'} onChange={formik.handleChange} label="Rôle">
                  {MEMBER_ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </Select>
              </FormControl>
              {/* Staff Type (salaried, etc.) */}
              <FormControl fullWidth>
                <InputLabel>Type de staff</InputLabel>
                <Select name="staffType" value={formik.values.staffType} onChange={formik.handleChange} error={formik.touched.staffType && Boolean(formik.errors.staffType)} label="Type de staff">
                  {STAFF_TYPES.map(type => <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>)}
                </Select>
              </FormControl>
              {/* Priorité, Max tâches, Max heures */}
              <TextField fullWidth name="priority" label="Priorité (1-5)" type="number" InputProps={{
              inputProps: {
                min: 1,
                max: 5
              }
            }} value={formik.values.priority} onChange={formik.handleChange} />
              <TextField fullWidth name="maxTasksPerDay" label="Max tâches/jour" type="number" value={formik.values.maxTasksPerDay} onChange={formik.handleChange} />
              <TextField fullWidth name="maxHoursPerWeek" label="Max heures/semaine" type="number" value={formik.values.maxHoursPerWeek} onChange={formik.handleChange} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Form>;

  // Mode config ou planning : selector + contenu, pas de cartes
  if (mode === 'config' || mode === 'planning') {
    return <Box sx={{
      p: isEmbedded ? 0 : 2
    }}>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        flexWrap: 'wrap'
      }}>
          <FormControl size="small" sx={{
          minWidth: 220
        }}>
            <InputLabel>Staff</InputLabel>
            <Select value={selectedStaff?.staffCode || ''} label="Staff" onChange={e => {
            const s = staffList.find(st => st.staffCode === e.target.value);
            setSelectedStaff(s || null);
          }}>
              <MenuItem value="">
                <em>Sélectionner un staff</em>
              </MenuItem>
              {staffList.map(s => <MenuItem key={s.staffCode} value={s.staffCode}>
                  {s.username} ({s.staffCode})
                </MenuItem>)}
            </Select>
          </FormControl>
          {mode === 'config' && selectedStaff && <IconButton size="small" onClick={() => {
          setOpenEditDialog(true);
        }} sx={{
          border: `1px solid ${SOJORI_COLORS.primary}`,
          color: SOJORI_COLORS.primary
        }}>
              <Edit2 size={18} />
            </IconButton>}
          <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} onClick={() => setOpenCreateDialog(true)} sx={{
          bgcolor: SOJORI_COLORS.primary,
          color: 'white !important',
          fontWeight: 600,
          fontSize: '12px',
          height: '32px',
          px: 1.5,
          textTransform: 'none',
          borderRadius: '8px',
          '&:hover': {
            bgcolor: SOJORI_COLORS.primaryDark
          }
        }}>
            Ajouter Staff
          </Button>
        </Box>
        {selectedStaff ? mode === 'config' ? <StaffConfigTab staff={staffList.find(s => s.staffCode === selectedStaff.staffCode) || selectedStaff} /> : <StaffPlanningTab staff={staffList.find(s => s.staffCode === selectedStaff.staffCode) || selectedStaff} onScheduleSaved={onStaffUpdated} /> : <Box sx={{
        py: 6,
        textAlign: 'center',
        color: 'text.secondary'
      }}>
            <Typography>Sélectionnez un staff dans la liste ci-dessus</Typography>
          </Box>}
        {/* Dialogs */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth PaperProps={{
        sx: {
          mx: 'auto',
          maxHeight: '90vh'
        }
      }}>
          <DialogTitle>Créer un nouveau staff</DialogTitle>
          <Formik initialValues={{
          username: '',
          email: '',
          callPhone: '',
          whatsappPhone: '',
          language: 'French',
          categories: [],
          listingIds: [],
          cityIds: [],
          countryIds: [],
          staffType: 'salaried',
          memberRole: 'Staff',
          priority: 3,
          maxTasksPerDay: 6,
          maxHoursPerWeek: 40,
          ownerId: localStorage.getItem('ownerId') || ''
        }} validationSchema={createValidationSchema} onSubmit={handleCreateStaff}>
            {formik => <>
                <DialogContent>{renderStaffForm(formik)}</DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
                  <Button onClick={formik.handleSubmit} variant="contained" disabled={formik.isSubmitting} sx={{
                bgcolor: SOJORI_COLORS.primary,
                color: 'white !important'
              }}>Créer</Button>
                </DialogActions>
              </>}
          </Formik>
        </Dialog>
        {selectedStaff && <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth PaperProps={{
        sx: {
          mx: 'auto',
          maxHeight: '90vh'
        }
      }}>
            <DialogTitle>Modifier le staff</DialogTitle>
            <Formik initialValues={{
          username: selectedStaff.username,
          email: selectedStaff.email,
          callPhone: selectedStaff.callPhone,
          whatsappPhone: selectedStaff.whatsappPhone,
          language: selectedStaff.language,
          categories: selectedStaff.categories,
          listingIds: selectedStaff.listingIds,
          cityIds: selectedStaff.cityIds,
          countryIds: selectedStaff.countryIds,
          staffType: selectedStaff.staffType,
          memberRole: selectedStaff.memberRole || 'Staff',
          priority: selectedStaff.priority,
          maxTasksPerDay: selectedStaff.maxTasksPerDay,
          maxHoursPerWeek: selectedStaff.maxHoursPerWeek
        }} validationSchema={createValidationSchema} onSubmit={handleUpdateStaff}>
              {formik => <>
                  <DialogContent>{renderStaffForm(formik, true)}</DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
                    <Button onClick={formik.handleSubmit} variant="contained" disabled={formik.isSubmitting} sx={{
                bgcolor: SOJORI_COLORS.primary,
                color: 'white !important'
              }}>Sauvegarder</Button>
                  </DialogActions>
                </>}
            </Formik>
          </Dialog>}
        {selectedStaff && <StaffExceptionDialog open={openExceptionDialog} onClose={() => setOpenExceptionDialog(false)} staffCode={selectedStaff.staffCode} onSuccess={() => {
        setExceptionRefreshTrigger(prev => prev + 1);
        toast.success('Exception créée avec succès');
      }} />}
      </Box>;
  }

  const staffColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nom',
        render: (row) => (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEAM_T.text }}>{row.username}</Typography>
        ),
      },
      {
        key: 'code',
        label: 'Code',
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, color: TEAM_T.text2 }}>{row.staffCode}</Typography>
        ),
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        render: (row) => row.whatsappPhone || '—',
      },
      {
        key: 'categories',
        label: 'Catégories',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
            {(row.categories || []).map((catId) => {
              const cat = TASK_CATEGORIES.find((c) => c.id === catId);
              return cat ? (
                <Chip
                  key={catId}
                  label={`${cat.icon} ${cat.label}`}
                  size="small"
                  sx={{ fontSize: 10, height: 20, bgcolor: TEAM_T.bg2 }}
                />
              ) : null;
            })}
          </Box>
        ),
      },
      {
        key: 'status',
        label: 'Statut',
        align: 'center',
        render: (row) => (
          <Chip
            size="small"
            label={row.isActive === false ? 'Inactif' : 'Actif'}
            sx={{
              height: 20,
              fontSize: 10,
              fontWeight: 700,
              ...(row.isActive === false
                ? { bgcolor: TEAM_T.bg3, color: TEAM_T.text3 }
                : { bgcolor: '#e6f6ef', color: TEAM_T.success }),
            }}
          />
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStaff(row);
                setOpenEditDialog(true);
              }}
            >
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStaff(row.staffCode);
              }}
            >
              <Trash2 size={16} color={TEAM_T.error} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [],
  );

  return <Box sx={{
    p: isEmbedded ? 0 : 3
  }}>
      {/* Header - Only show when not embedded */}
      {!isEmbedded && <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3
    }}>
          <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
            <Users size={32} color={SOJORI_COLORS.primary} />
            <Typography variant="h4" fontWeight="bold">
              Gestion du Staff
            </Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} onClick={() => setOpenCreateDialog(true)} sx={{
        bgcolor: SOJORI_COLORS.primary,
        color: 'white !important',
        fontWeight: 600,
        fontSize: '12px',
        height: '32px',
        px: 1.5,
        textTransform: 'none',
        borderRadius: '8px',
        '&:hover': {
          bgcolor: SOJORI_COLORS.primaryDark
        }
      }}>
            Ajouter Staff
          </Button>
        </Box>}

      {/* Add Staff Button - Show when embedded (toolbar filter) */}
      {isEmbedded && null}

      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          border: `1px solid ${TEAM_T.border}`,
          borderRadius: 1.5,
          bgcolor: TEAM_T.bg1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Rechercher nom, email, code staff…"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: TEAM_T.text3 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: 1,
              minWidth: 180,
              maxWidth: 360,
              '& .MuiOutlinedInput-root': {
                bgcolor: TEAM_T.bg1,
                '& fieldset': { borderColor: TEAM_T.border },
              },
            }}
          />
          {isEmbedded ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<UserPlus size={16} />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{
                bgcolor: TEAM_T.primary,
                color: '#fff !important',
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: TEAM_T.primaryDeep },
              }}
            >
              Ajouter Staff
            </Button>
          ) : null}
          <Tooltip title="Réinitialiser la recherche">
            <span>
              <IconButton
                size="small"
                disabled={!searchText?.trim()}
                onClick={() => {
                  setSearchText('');
                  setPage(0);
                }}
                sx={{ color: TEAM_T.text3 }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Staff List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: TEAM_T.primary }} />
        </Box>
      ) : staffList.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>Aucun staff trouvé</Typography>
        </Box>
      ) : teamViewMode === 'cards' ? (
        <TeamHubCardGrid>
          {staffList.map((staffMember) => {
            const initials = (staffMember.username || '?').slice(0, 2).toUpperCase();
            const isSelected = selectedStaff?.staffCode === staffMember.staffCode;
            const chips = (staffMember.categories || [])
              .slice(0, 5)
              .map((catId) => {
                const cat = TASK_CATEGORIES.find((c) => c.id === catId);
                return cat ? `${cat.icon} ${cat.label}` : catId;
              });
            return (
              <TeamHubMemberCard
                key={staffMember.staffCode}
                initials={initials}
                title={staffMember.username}
                subtitle={staffMember.staffCode}
                badge={staffMember.isActive === false ? 'Inactif' : 'Actif'}
                chips={chips}
                metaLines={[
                  {
                    label: 'WhatsApp',
                    value: staffMember.whatsappPhone || staffMember.callPhone || '—',
                  },
                ]}
                active={isSelected}
                inactive={staffMember.isActive === false}
                onClick={() => handleStaffClick(staffMember)}
                onEdit={() => {
                  setSelectedStaff(staffMember);
                  setOpenEditDialog(true);
                }}
                onDelete={() => handleDeleteStaff(staffMember.staffCode)}
              />
            );
          })}
        </TeamHubCardGrid>
      ) : (
        <TeamHubListTable
          rows={staffList}
          columns={staffColumns}
          rowKey={(row) => row.staffCode}
          onRowClick={handleStaffClick}
          emptyLabel="Aucun staff trouvé"
        />
      )}

      {staffFromParent == null && (
        <TeamHubPagination
          page={page}
          limit={limit}
          total={totalCount}
          onPageChange={setPage}
          onLimitChange={setLimit}
          limitOptions={[10, 25, 50, 100]}
          itemLabel="staff"
        />
      )}

      {selectedStaff && (
        <Box sx={{ mt: 2, borderTop: '1px solid #E5E7EB', pt: 2 }}>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{
              mb: 2,
              minHeight: '40px',
              '& .MuiTab-root': { minHeight: '40px', fontSize: '12px', px: 1.5, textTransform: 'none' },
              '& .Mui-selected': { color: `${TEAM_T.primary} !important` },
              '& .MuiTabs-indicator': { bgcolor: TEAM_T.primary },
            }}
          >
            <Tab icon={<Settings size={14} />} label="Configuration" iconPosition="start" />
            <Tab icon={<Calendar size={14} />} label="Planning" iconPosition="start" />
            <Tab icon={<TrendingUp size={14} />} label="Workload" iconPosition="start" />
            <Tab icon={<CheckCircle size={14} />} label="Assignments" iconPosition="start" />
            <Tab icon={<Calendar size={14} />} label="Congés" iconPosition="start" />
          </Tabs>
          {selectedTab === 0 && <StaffConfigTab staff={selectedStaff} />}
          {selectedTab === 1 && <StaffPlanningTab staff={selectedStaff} onScheduleSaved={loadStaff} />}
          {selectedTab === 2 && <StaffWorkloadTab staff={selectedStaff} />}
          {selectedTab === 3 && <StaffAssignmentsTab staff={selectedStaff} />}
          {selectedTab === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Congés & Exceptions</Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setOpenExceptionDialog(true)}
                  sx={{ bgcolor: SOJORI_COLORS.primary, color: 'white !important', fontSize: '11px', height: '28px' }}
                >
                  + Exception
                </Button>
              </Box>
              <StaffExceptionsList staffCode={selectedStaff.staffCode} refreshTrigger={exceptionRefreshTrigger} />
            </Box>
          )}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth PaperProps={{
      sx: {
        mx: 'auto',
        maxHeight: '90vh'
      }
    }}>
        <DialogTitle>Créer un nouveau staff</DialogTitle>
        <Formik initialValues={{
        username: '',
        email: '',
        callPhone: '',
        whatsappPhone: '',
        language: 'French',
        categories: [],
        listingIds: [],
        cityIds: [],
        countryIds: [],
        staffType: 'salaried',
        memberRole: 'Staff',
        priority: 3,
        maxTasksPerDay: 6,
        maxHoursPerWeek: 40,
        ownerId: localStorage.getItem('ownerId') || ''
      }} validationSchema={createValidationSchema} onSubmit={handleCreateStaff}>
          {formik => <>
              <DialogContent>{renderStaffForm(formik)}</DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
                <Button onClick={formik.handleSubmit} variant="contained" disabled={formik.isSubmitting} sx={{
              bgcolor: SOJORI_COLORS.primary
            }}>
                  Créer
                </Button>
              </DialogActions>
            </>}
        </Formik>
      </Dialog>

      {/* Edit Dialog */}
      {selectedStaff && <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth PaperProps={{
      sx: {
        mx: 'auto',
        maxHeight: '90vh'
      }
    }}>
          <DialogTitle>Modifier le staff</DialogTitle>
          <Formik initialValues={{
        username: selectedStaff.username,
        email: selectedStaff.email,
        callPhone: selectedStaff.callPhone,
        whatsappPhone: selectedStaff.whatsappPhone,
        language: selectedStaff.language,
        categories: selectedStaff.categories || [],
        listingIds: Array.isArray(selectedStaff.listingIds) ? selectedStaff.listingIds.map(l => typeof l === 'object' ? l._id || l.id : l) : [],
        cityIds: Array.isArray(selectedStaff.cityIds) ? selectedStaff.cityIds.map(c => typeof c === 'object' ? c._id || c.id : c) : [],
        countryIds: Array.isArray(selectedStaff.countryIds) ? selectedStaff.countryIds.map(c => typeof c === 'object' ? c._id || c.id : c) : [],
        staffType: selectedStaff.staffType,
        memberRole: selectedStaff.memberRole || 'Staff',
        priority: selectedStaff.priority,
        maxTasksPerDay: selectedStaff.maxTasksPerDay,
        maxHoursPerWeek: selectedStaff.maxHoursPerWeek
      }} validationSchema={createValidationSchema} onSubmit={handleUpdateStaff}>
              {formik => <>
                  <DialogContent>{renderStaffForm(formik, true)}</DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
                  <Button onClick={formik.handleSubmit} variant="contained" disabled={formik.isSubmitting} sx={{
              bgcolor: SOJORI_COLORS.primary
            }}>
                    Sauvegarder
                  </Button>
                </DialogActions>
              </>}
          </Formik>
        </Dialog>}

      {/* Exception Dialog */}
      {selectedStaff && <StaffExceptionDialog open={openExceptionDialog} onClose={() => setOpenExceptionDialog(false)} staffCode={selectedStaff.staffCode} onSuccess={() => {
      setExceptionRefreshTrigger(prev => prev + 1);
      toast.success('Exception créée avec succès');
    }} />}
    </Box>;
};
export default StaffManagementView;
