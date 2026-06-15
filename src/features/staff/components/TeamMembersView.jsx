import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar, Menu, MenuItem, Checkbox, FormControl, InputLabel, Select, InputAdornment, Card, CardContent, Typography, Box, ListItemText, Tabs, Tab } from '@mui/material';
import { Users, UserPlus, Search, Filter, Edit2, Trash2, Ban, CheckCircle, XCircle, Mail, Phone, MessageSquare, Eye, EyeOff, X, Shield, TrendingUp, UserCheck, UserX, Lock, User, Save } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { getStaffPlannig, CreateStaff, deleteStaff, getLanguage } from '../services/serverApi.task';
import { updateStaffSimplified } from '../services/serverApi.staffSimplified';
import { getListingsTa, getTaskConfigs } from '../../tasks/services/serverApi.task';
import { getcities, getcountries } from '../../setting/services/serverApi.adminConfig';
import StaffPlanningFilter from './StaffPlanningFilter';
import ListingSelector from './ListingSelector';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryLight: '#FF8F6B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  }
};

// Catégories complètes (sans All) - pour détecter si backend a renvoyé "toutes"
const ALL_CATEGORY_IDS = ['ARRIVAL', 'DEPARTURE', 'CLEANING', 'TRANSPORT', 'GROCERIES', 'SUPPORT', 'MAINTENANCE', 'CUSTOM'];
const isAllCategories = cats => !cats?.length ? false : cats.includes('ALL') || cats.length >= 8 && ALL_CATEGORY_IDS.every(c => cats.includes(c));
const categoriesForDisplay = cats => isAllCategories(cats) ? ['All'] : cats || [];
const categoriesForSubmit = subType => subType?.includes('All') ? ['ALL'] : subType || [];

// Available permissions/task types
// Task Categories - Catégories principales (ALL = toutes les catégories)
const TASK_TYPES = [{
  id: 'All',
  label: 'ALL',
  description: 'Toutes les activités',
  color: '#6366F1'
}, {
  id: 'ARRIVAL',
  label: 'Arrivée',
  description: 'Accueil client (Checkin)',
  color: '#10B981'
}, {
  id: 'DEPARTURE',
  label: 'Départ',
  description: 'Départ client (Checkout)',
  color: '#EF4444'
}, {
  id: 'CLEANING',
  label: 'Ménage',
  description: 'Nettoyage (tous types)',
  color: '#3B82F6'
}, {
  id: 'TRANSPORT',
  label: 'Transport',
  description: 'Transport/Chauffeur',
  color: '#F59E0B'
}, {
  id: 'GROCERIES',
  label: 'Courses',
  description: 'Courses alimentaires',
  color: '#10B981'
}, {
  id: 'SUPPORT',
  label: 'Support',
  description: 'Assistance technique/générale',
  color: '#8B5CF6'
}, {
  id: 'MAINTENANCE',
  label: 'Maintenance',
  description: 'Maintenance',
  color: '#EC4899'
}, {
  id: 'CUSTOM',
  label: 'Personnalisé',
  description: 'Demandes sur mesure',
  color: '#14B8A6'
}];

// Staff types
const STAFF_TYPES = ['salaried', 'Self-employed', 'Company', 'Individual activities'];

// Member roles
const MEMBER_ROLES = ['Staff', 'Manager'];
const createValidationSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
  subType: Yup.array().min(1, 'At least one category is required').required('Categories are required'),
  callPhone: Yup.string(),
  whatsappPhone: Yup.string()
});
const updateValidationSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  subType: Yup.array().min(1, 'At least one task must be selected').required('Tasks are required'),
  callPhone: Yup.string().required('Call Phone is required'),
  whatsappPhone: Yup.string().required('WhatsApp Phone is required'),
  listingIds: Yup.array(),
  language: Yup.string().required('Language is required'),
  countryIds: Yup.array().min(1, 'At least one country must be selected').required('Countries are required'),
  cityIds: Yup.array().min(1, 'At least one city must be selected').required('Cities are required'),
  staffType: Yup.string().oneOf(STAFF_TYPES).required('Staff type is required')
});
const TeamMembersView = () => {
  // Get current user from Redux
  const currentUser = useSelector(state => state.auth?.user);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterMenu, setFilterMenu] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, banned, deleted
  const [roleFilter, setRoleFilter] = useState('all'); // all, staff, manager
  const [permissionFilter, setPermissionFilter] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Filter data
  const [listings, setListings] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);

  // Selected filters
  const [selectedListings, setSelectedListings] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [updateTabIndex, setUpdateTabIndex] = useState(0);
  const [createTabIndex, setCreateTabIndex] = useState(0);
  const [updateTab, setUpdateTab] = useState(0);
  useEffect(() => {
    fetchFilterData();
  }, []);
  useEffect(() => {
    fetchMembers();
  }, [page, limit, searchText, statusFilter, roleFilter, selectedListings, selectedTypes, selectedLanguages]);
  const fetchFilterData = async () => {
    try {
      // Fetch listings
      const listingsResponse = await getListingsTa();

      // Transform listings to match the expected format
      const transformedListings = (listingsResponse || []).map(listing => ({
        id: listing.id,
        _id: listing.id,
        name: listing.name,
        title: listing.name,
        ownerId: listing.ownerId
      }));
      setListings(transformedListings);

      // Fetch task types
      const taskTypesResponse = await getTaskConfigs();
      if (taskTypesResponse && Array.isArray(taskTypesResponse)) {
        const updatedTaskTypes = taskTypesResponse.flatMap(item => {
          if (item.task === 'CONCIERGE' && Array.isArray(item?.subs)) {
            return item.subs.map(sub => ({
              ...sub,
              task: sub.type
            }));
          }
          return item;
        });
        setTaskTypes(updatedTaskTypes);
      }

      // Fetch languages - ONLY Arabic and French for staff
      const languagesResponse = await getLanguage();
      if (languagesResponse.data) {
        // Filter to only keep Arabic and French
        const filteredLanguages = languagesResponse.data.filter(lang => lang.name === 'Arabic' || lang.name === 'French' || lang.name === 'Français');
        setLanguages(filteredLanguages);
      }

      // Fetch cities
      const citiesResponse = await getcities();
      if (citiesResponse.data?.cities) {
        setCities(citiesResponse.data.cities);
      }

      // Fetch countries
      const countriesResponse = await getcountries();
      if (countriesResponse.data) {
        setCountries(countriesResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load filter data');
    }
  };
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const ownerId = currentUser?._id || currentUser?.id;
      const params = {
        page,
        limit,
        search_text: searchText,
        ...(ownerId && {
          ownerId
        })
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      if (selectedTypes && selectedTypes.length > 0) {
        params.types = selectedTypes;
      }
      if (selectedLanguages && selectedLanguages.length > 0) {
        params.languages = selectedLanguages;
      }
      const response = await getStaffPlannig(params);
      if (response && response.data) {
        // staff-simplified returns 'staff' array, not 'data'
        const staffData = response.data.staff || response.data.data || [];
        // Filter by status if needed (staff doesn't have deleted/banned in API)
        let filteredData = staffData;
        if (statusFilter === 'deleted') {
          filteredData = staffData.filter(m => m.deleted === true);
        } else if (statusFilter === 'banned') {
          filteredData = staffData.filter(m => m.banned === true);
        } else if (statusFilter === 'active') {
          filteredData = staffData.filter(m => !m.deleted && !m.banned);
        }

        // Filter by role if needed
        if (roleFilter === 'staff') {
          filteredData = filteredData.filter(m => m.memberRole === 'Staff' || !m.memberRole);
        } else if (roleFilter === 'manager') {
          filteredData = filteredData.filter(m => m.memberRole === 'Manager');
        }
        setMembers(filteredData);
        setTotalCount(response.data.pagination?.totalCount || response.data.total || staffData.length);
      } else {
        setMembers([]);
        setTotalCount(0);
      }
    } catch (error) {
      setMembers([]);
      setTotalCount(0);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: totalCount,
    active: members.filter(m => !m.banned && !m.deleted).length,
    banned: members.filter(m => m.banned).length,
    deleted: members.filter(m => m.deleted).length
  };
  const handleCreateMember = async (values, {
    setSubmitting
  }) => {
    try {
      // Get ownerId from Redux user state
      const ownerId = currentUser?._id || currentUser?.id;
      if (!ownerId) {
        toast.error('Unable to get current user ID. Please login again.');
        setSubmitting(false);
        return;
      }
      const transformedValues = {
        ownerId,
        username: values.username,
        email: values.email,
        password: values.password,
        callPhone: values.callPhone || '+33000000000',
        whatsappPhone: values.whatsappPhone || '+33000000000',
        language: values.language || 'French',
        // Location - ALL pour category et listing
        cityIds: values.cityIds.length > 0 ? values.cityIds : ['All'],
        countryIds: values.countryIds.length > 0 ? values.countryIds : ['All'],
        listingIds: values.listingIds.length > 0 ? values.listingIds : ['All'],
        // Categories & Type
        categories: categoriesForSubmit(values.subType),
        staffType: 'salaried',
        // Role
        memberRole: values.memberRole || 'Staff',
        // Optional defaults for staff-simplified
        priority: 3,
        maxTasksPerDay: 6,
        maxHoursPerWeek: 40,
        isActive: true
      };
      const response = await CreateStaff(transformedValues);
      if (response.data) {
        toast.success('Team member created successfully');
        setCreateDialog(false);
        fetchMembers();
      }
    } catch (error) {
      // Display detailed error message
      const errorMessage = error.response?.data?.errors?.[0]?.message || error.response?.data?.error?.[0]?.message || error.response?.data?.message || 'Failed to create team member';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  const handleUpdateMember = async (values, {
    setSubmitting
  }) => {
    try {
      const staffCode = selectedMember.staffCode || selectedMember._id;
      if (!staffCode) {
        toast.error('Staff code not found');
        return;
      }
      const updateData = {
        username: values.username,
        categories: categoriesForSubmit(values.subType),
        callPhone: values.callPhone,
        whatsappPhone: values.whatsappPhone,
        memberRole: values.memberRole || 'Staff',
        listingIds: values.listingIds.length > 0 ? values.listingIds : ['All'],
        language: values.language,
        countryIds: values.countryIds,
        cityIds: values.cityIds,
        staffType: values.staffType
      };
      await updateStaffSimplified(staffCode, updateData);
      toast.success('Team member updated successfully');
      setUpdateDialog(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update team member');
    } finally {
      setSubmitting(false);
    }
  };
  const handleOpenUpdate = member => {
    setSelectedMember(member);
    setUpdateDialog(true);
  };
  const handleFilterChange = (key, value) => {
    setPage(0);
  };
  const handleDelete = async member => {
    if (!window.confirm(`Delete ${member.username}?`)) return;
    try {
      await deleteStaff(member.staffCode);
      toast.success('Member deleted successfully');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete member');
    }
  };
  const handleSearch = () => {
    setPage(0);
    fetchMembers();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setSelectedTypes([]);
    setSelectedLanguages([]);
    setStatusFilter('all');
    setPage(0);
  };
  return <div className="w-full bg-gray-50 min-h-screen p-4">
      {/* Header + Status Filters - Single Line */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2 mb-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title + Stats */}
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-gray-900">Team Members</span>
              {/* Inline Stats - Very Compact */}
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">{stats.active}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-sm font-bold text-red-600">{stats.banned}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-sm font-bold text-gray-600">{stats.deleted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status Filters + Add Button */}
          <div className="flex items-center gap-3">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-2">
              <Chip label="All" onClick={() => setStatusFilter('all')} size="small" sx={{
              backgroundColor: statusFilter === 'all' ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[200],
              color: `${statusFilter === 'all' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '&:hover': {
                backgroundColor: statusFilter === 'all' ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[300]
              }
            }} />
              <Chip label="Active" icon={<CheckCircle className="w-3 h-3" />} onClick={() => setStatusFilter('active')} size="small" sx={{
              backgroundColor: statusFilter === 'active' ? SOJORI_COLORS.success : SOJORI_COLORS.gray[200],
              color: `${statusFilter === 'active' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '& .MuiChip-icon': {
                color: `${statusFilter === 'active' ? 'white' : SOJORI_COLORS.gray[700]} !important`
              },
              '&:hover': {
                backgroundColor: statusFilter === 'active' ? '#059669' : SOJORI_COLORS.gray[300]
              }
            }} />
              <Chip label="Banned" icon={<Ban className="w-3 h-3" />} onClick={() => setStatusFilter('banned')} size="small" sx={{
              backgroundColor: statusFilter === 'banned' ? SOJORI_COLORS.error : SOJORI_COLORS.gray[200],
              color: `${statusFilter === 'banned' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '& .MuiChip-icon': {
                color: `${statusFilter === 'banned' ? 'white' : SOJORI_COLORS.gray[700]} !important`
              },
              '&:hover': {
                backgroundColor: statusFilter === 'banned' ? '#DC2626' : SOJORI_COLORS.gray[300]
              }
            }} />
              <Chip label="Deleted" icon={<Trash2 className="w-3 h-3" />} onClick={() => setStatusFilter('deleted')} size="small" sx={{
              backgroundColor: statusFilter === 'deleted' ? SOJORI_COLORS.gray[600] : SOJORI_COLORS.gray[200],
              color: `${statusFilter === 'deleted' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '& .MuiChip-icon': {
                color: `${statusFilter === 'deleted' ? 'white' : SOJORI_COLORS.gray[700]} !important`
              },
              '&:hover': {
                backgroundColor: statusFilter === 'deleted' ? SOJORI_COLORS.gray[700] : SOJORI_COLORS.gray[300]
              }
            }} />
            </div>

            {/* Role Filters - Staff/Manager */}
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
              <Chip label="All Roles" onClick={() => setRoleFilter('all')} size="small" sx={{
              backgroundColor: roleFilter === 'all' ? '#6366F1' : SOJORI_COLORS.gray[200],
              color: `${roleFilter === 'all' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '&:hover': {
                backgroundColor: roleFilter === 'all' ? '#4F46E5' : SOJORI_COLORS.gray[300]
              }
            }} />
              <Chip label="Staff" onClick={() => setRoleFilter('staff')} size="small" sx={{
              backgroundColor: roleFilter === 'staff' ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[200],
              color: `${roleFilter === 'staff' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '&:hover': {
                backgroundColor: roleFilter === 'staff' ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[300]
              }
            }} />
              <Chip label="Manager" onClick={() => setRoleFilter('manager')} size="small" sx={{
              backgroundColor: roleFilter === 'manager' ? '#F59E0B' : SOJORI_COLORS.gray[200],
              color: `${roleFilter === 'manager' ? 'white' : SOJORI_COLORS.gray[700]} !important`,
              fontWeight: 600,
              fontSize: '11px',
              height: '26px',
              '&:hover': {
                backgroundColor: roleFilter === 'manager' ? '#D97706' : SOJORI_COLORS.gray[300]
              }
            }} />
            </div>

            <Button variant="contained" size="small" onClick={() => setCreateDialog(true)} startIcon={<UserPlus className="w-4 h-4" />} sx={{
            backgroundColor: SOJORI_COLORS.primary,
            color: 'white !important',
            fontWeight: 600,
            fontSize: '12px',
            height: '32px',
            px: 1.5,
            borderRadius: '8px',
            textTransform: 'none',
            flexShrink: 0,
            '&:hover': {
              backgroundColor: SOJORI_COLORS.primaryDark
            }
          }}>
              Add Member
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <StaffPlanningFilter searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages} types={taskTypes} languages={languages} onSearch={handleSearch} onReset={handleReset} showFilters={true} onFilterChange={handleFilterChange} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[10, 25, 50, 100]} loading={loading} />

      {/* Team Members Grid - 7 columns for density */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {loading ? <div className="col-span-full flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div> : members.length === 0 ? <div className="col-span-full flex flex-col items-center justify-center py-20">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No team members found</p>
          </div> : members.map(member => {
        const permissions = categoriesForDisplay(member.categories || member.subType || []);
        const email = member.email || member.primaryEmailAddress?.emailAddress || '-';
        const isManager = member.memberRole === 'Manager';
        return <Card key={member._id || member.id} className="group hover:shadow-lg transition-all duration-200" sx={{
          borderRadius: '8px',
          border: '2px solid',
          borderColor: isManager ? '#F59E0B' : SOJORI_COLORS.gray[200],
          background: isManager ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' : 'white',
          '&:hover': {
            borderColor: isManager ? '#D97706' : SOJORI_COLORS.primary
          }
        }}>
                <CardContent sx={{
            padding: '10px !important'
          }}>
                  {/* Compact Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar sx={{
                  width: 32,
                  height: 32,
                  background: isManager ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
                  fontSize: '13px',
                  fontWeight: 700
                }}>
                        {isManager ? '👔' : member.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Typography variant="body2" className="font-bold text-gray-900 truncate" sx={{
                      fontSize: '12px'
                    }}>
                            {member.username || member.firstName || 'N/A'}
                          </Typography>
                          {isManager && <Chip label="Manager" size="small" sx={{
                      backgroundColor: '#F59E0B',
                      color: 'white !important',
                      fontSize: '8px',
                      height: '16px',
                      fontWeight: 700,
                      '& .MuiChip-label': {
                        padding: '0 4px'
                      }
                    }} />}
                        </div>
                        <Typography variant="caption" className="text-gray-500 truncate block" sx={{
                    fontSize: '10px'
                  }}>
                          {email}
                        </Typography>
                      </div>
                    </div>

                    {/* Mini Status Badge */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                backgroundColor: member.banned ? '#DC2626' : member.deleted ? SOJORI_COLORS.gray[400] : '#10B981'
              }} title={member.banned ? 'Banned' : member.deleted ? 'Deleted' : 'Active'} />
                  </div>

                  {/* Compact Permissions */}
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {permissions.length === 0 ? <Chip label="No perms" size="small" sx={{
                  fontSize: '9px',
                  height: '18px',
                  color: '#9CA3AF !important'
                }} /> : permissions.slice(0, 2).map(perm => {
                  const taskType = TASK_TYPES.find(t => t.id === perm);
                  const label = perm === 'All' ? 'ALL' : perm.substring ? perm.substring(0, 8) : perm;
                  return <Chip key={perm} label={label} size="small" sx={{
                    backgroundColor: taskType?.color || SOJORI_COLORS.gray[300],
                    color: 'white !important',
                    fontSize: '9px',
                    fontWeight: 600,
                    height: '18px'
                  }} />;
                })}
                      {permissions.length > 2 && <Chip label={`+${permissions.length - 2}`} size="small" sx={{
                  backgroundColor: SOJORI_COLORS.gray[300],
                  color: `${SOJORI_COLORS.gray[700]} !important`,
                  fontSize: '9px',
                  fontWeight: 600,
                  height: '18px'
                }} />}
                    </div>
                  </div>

                  {/* Compact Actions */}
                  <div className="flex gap-1">
                    <Button fullWidth size="small" variant="outlined" startIcon={<Edit2 className="w-3 h-3" />} onClick={() => handleOpenUpdate(member)} sx={{
                borderColor: SOJORI_COLORS.primary,
                color: `${SOJORI_COLORS.primary} !important`,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '10px',
                padding: '3px 6px',
                minHeight: '24px',
                '&:hover': {
                  borderColor: SOJORI_COLORS.primaryDark,
                  backgroundColor: '#FFF5F2'
                }
              }}>
                      Edit
                    </Button>
                    <IconButton size="small" onClick={() => handleDelete(member)} sx={{
                border: `1px solid ${SOJORI_COLORS.error}`,
                color: SOJORI_COLORS.error,
                padding: '3px',
                minWidth: '24px',
                minHeight: '24px',
                '&:hover': {
                  backgroundColor: '#FEE2E2'
                }
              }}>
                      <Trash2 className="w-3 h-3" />
                    </IconButton>
                  </div>
                </CardContent>
              </Card>;
      })}
      </div>

      {/* Create Member Dialog - Ultra Compact */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{
        padding: '12px 16px !important',
        borderBottom: '1px solid #E5E7EB'
      }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <Typography variant="subtitle1" sx={{
              fontWeight: 700,
              fontSize: '14px',
              color: '#111827'
            }}>
                Add Team Member
              </Typography>
            </div>
            <IconButton onClick={() => setCreateDialog(false)} size="small">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </DialogTitle>

        <DialogContent sx={{
        padding: '16px !important'
      }}>
          {/* Tabs */}
          <Tabs value={createTabIndex} onChange={(e, newValue) => setCreateTabIndex(newValue)} sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
          minHeight: '36px',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '12px',
            minHeight: '36px',
            padding: '6px 12px'
          }
        }}>
            <Tab label="📋 Infos" />
            <Tab label="🌍 Localisation" />
            <Tab label="🎯 Categories" />
          </Tabs>

          <Formik initialValues={{
          username: '',
          email: '',
          password: '',
          subType: [],
          callPhone: '',
          whatsappPhone: '',
          memberRole: 'Staff',
          listingIds: ['All'],
          language: 'French',
          countryIds: ['All'],
          cityIds: ['All']
        }} validationSchema={createValidationSchema} onSubmit={handleCreateMember}>
            {({
            isSubmitting,
            values,
            setFieldValue
          }) => <Form>
                {/* Tab 0: Infos */}
                {createTabIndex === 0 && <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Username */}
                      <Box>
                        <Field as={TextField} fullWidth size="small" name="username" label="Username *" variant="outlined" InputProps={{
                    startAdornment: <User className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  }} />
                        <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs mt-0.5" />
                      </Box>

                      {/* Email */}
                      <Box>
                        <Field as={TextField} fullWidth size="small" name="email" label="Email *" type="email" variant="outlined" InputProps={{
                    startAdornment: <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  }} />
                        <ErrorMessage name="email" component={Typography} className="text-red-500 !text-xs mt-0.5" />
                      </Box>

                      {/* Password */}
                      <Box>
                        <Field as={TextField} fullWidth size="small" name="password" label="Password *" type={showPassword ? 'text' : 'password'} variant="outlined" InputProps={{
                    startAdornment: <Lock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />,
                    endAdornment: <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </IconButton>
                              </InputAdornment>
                  }} />
                        <ErrorMessage name="password" component={Typography} className="text-red-500 !text-xs mt-0.5" />
                      </Box>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Call Phone */}
                      <Box>
                        <Field as={TextField} fullWidth size="small" name="callPhone" label="Call Phone" variant="outlined" InputProps={{
                    startAdornment: <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  }} />
                      </Box>

                      {/* WhatsApp Phone */}
                      <Box>
                        <Field as={TextField} fullWidth size="small" name="whatsappPhone" label="WhatsApp" variant="outlined" InputProps={{
                    startAdornment: <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  }} />
                      </Box>

                      {/* Member Role */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Role *</InputLabel>
                          <Field name="memberRole">
                            {({
                        field
                      }) => <Select {...field} label="Role *" startAdornment={<Shield className="w-3.5 h-3.5 ml-2 mr-1 text-gray-500" />}>
                                {MEMBER_ROLES.map(role => <MenuItem key={role} value={role}>
                                    <div className="flex items-center gap-1.5 text-sm">
                                      {role === 'Manager' ? '👔' : '👤'} {role}
                                    </div>
                                  </MenuItem>)}
                              </Select>}
                          </Field>
                        </FormControl>
                      </Box>
                    </div>
                  </div>}

                {/* Tab 1: Localisation */}
                {createTabIndex === 1 && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Listings */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Listings *</InputLabel>
                          <Select multiple value={values.listingIds} onChange={e => setFieldValue('listingIds', e.target.value)} label="Listings *" renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                                {selected.includes('All') ? <Chip label="All" size="small" sx={{
                        height: '20px',
                        fontSize: '11px'
                      }} /> : selected.slice(0, 1).map(id => {
                        const listing = listings.find(l => l._id === id || l.id === id);
                        return <Chip key={id} label={listing?.name?.substring(0, 10) || id} size="small" sx={{
                          height: '20px',
                          fontSize: '10px'
                        }} />;
                      })}
                                {selected.length > 1 && !selected.includes('All') && <Chip label={`+${selected.length - 1}`} size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} />}
                              </Box>}>
                            <MenuItem value="All">
                              <Checkbox checked={values.listingIds.includes('All')} size="small" />
                              <ListItemText primary="All Listings" primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                            </MenuItem>
                            {!values.listingIds.includes('All') && listings.map(listing => <MenuItem key={listing._id || listing.id} value={listing._id || listing.id}>
                                <Checkbox checked={values.listingIds.includes(listing._id || listing.id)} size="small" />
                                <ListItemText primary={listing.name || listing.title} primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                              </MenuItem>)}
                          </Select>
                        </FormControl>
                        <ErrorMessage name="listingIds" component={Typography} className="text-red-500 !text-xs mt-0.5" />
                      </Box>

                      {/* Language */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Language</InputLabel>
                          <Field name="language">
                            {({
                        field
                      }) => <Select {...field} label="Language">
                                {languages.map(lang => <MenuItem key={lang._id} value={lang.name} sx={{
                          fontSize: '12px'
                        }}>
                                    {lang.name}
                                  </MenuItem>)}
                              </Select>}
                          </Field>
                        </FormControl>
                      </Box>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Countries */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Countries</InputLabel>
                          <Select multiple value={values.countryIds} onChange={e => setFieldValue('countryIds', e.target.value)} label="Countries" renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                                {selected.includes('All') ? <Chip label="All" size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} /> : selected.slice(0, 1).map(id => {
                        const country = countries.find(c => c._id === id);
                        return <Chip key={id} label={country?.name?.substring(0, 10) || id} size="small" sx={{
                          height: '20px',
                          fontSize: '10px'
                        }} />;
                      })}
                                {selected.length > 1 && !selected.includes('All') && <Chip label={`+${selected.length - 1}`} size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} />}
                              </Box>}>
                            <MenuItem value="All">
                              <Checkbox checked={values.countryIds.includes('All')} size="small" />
                              <ListItemText primary="All Countries" primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                            </MenuItem>
                            {!values.countryIds.includes('All') && countries.map(country => <MenuItem key={country._id} value={country._id}>
                                <Checkbox checked={values.countryIds.includes(country._id)} size="small" />
                                <ListItemText primary={country.name} primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                              </MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Cities */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Cities</InputLabel>
                          <Select multiple value={values.cityIds} onChange={e => setFieldValue('cityIds', e.target.value)} label="Cities" renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                                {selected.includes('All') ? <Chip label="All" size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} /> : selected.slice(0, 1).map(id => {
                        const city = cities.find(c => c._id === id);
                        return <Chip key={id} label={city?.name?.substring(0, 10) || id} size="small" sx={{
                          height: '20px',
                          fontSize: '10px'
                        }} />;
                      })}
                                {selected.length > 1 && !selected.includes('All') && <Chip label={`+${selected.length - 1}`} size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} />}
                              </Box>}>
                            <MenuItem value="All">
                              <Checkbox checked={values.cityIds.includes('All')} size="small" />
                              <ListItemText primary="All Cities" primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                            </MenuItem>
                            {!values.cityIds.includes('All') && cities.map(city => <MenuItem key={city._id} value={city._id}>
                                <Checkbox checked={values.cityIds.includes(city._id)} size="small" />
                                <ListItemText primary={city.name} primaryTypographyProps={{
                          fontSize: '12px'
                        }} />
                              </MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                    </div>
                  </div>}

                {/* Tab 2: Categories */}
                {createTabIndex === 2 && <div className="space-y-4">
                    <Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Categories *</InputLabel>
                        <Select multiple value={values.subType} onChange={e => {
                    const value = e.target.value;
                    // If "All" is selected, only keep "All"
                    if (value.includes('All')) {
                      setFieldValue('subType', ['All']);
                    } else {
                      setFieldValue('subType', value);
                    }
                  }} label="Categories *" renderValue={selected => <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5
                  }}>
                              {selected.includes('All') ? <Chip label="ALL" size="small" sx={{
                      backgroundColor: '#6366F1',
                      color: 'white !important',
                      fontSize: '10px',
                      height: '20px'
                    }} /> : <>
                                  {selected.slice(0, 3).map(value => {
                        const taskType = TASK_TYPES.find(t => t.id === value);
                        return <Chip key={value} label={taskType?.label || value} size="small" sx={{
                          backgroundColor: taskType?.color,
                          color: 'white !important',
                          fontSize: '10px',
                          height: '20px'
                        }} />;
                      })}
                                  {selected.length > 3 && <Chip label={`+${selected.length - 3}`} size="small" sx={{
                        height: '20px',
                        fontSize: '10px'
                      }} />}
                                </>}
                            </Box>}>
                          {TASK_TYPES.map(type => <MenuItem key={type.id} value={type.id}>
                              <Checkbox checked={values.subType.includes(type.id)} size="small" />
                              <div className="flex flex-col">
                                <Typography sx={{
                          fontSize: '13px',
                          fontWeight: 600
                        }}>{type.label}</Typography>
                                <Typography sx={{
                          fontSize: '11px',
                          color: '#6B7280'
                        }}>{type.description}</Typography>
                              </div>
                            </MenuItem>)}
                        </Select>
                      </FormControl>
                      <ErrorMessage name="subType" component={Typography} className="text-red-500 !text-xs mt-0.5" />
                    </Box>
                  </div>}

                {/* Buttons */}
                <DialogActions sx={{
              padding: '12px 0 0 0 !important',
              gap: 1,
              justifyContent: 'flex-end'
            }}>
                  <Button onClick={() => setCreateDialog(false)} variant="outlined" size="small" startIcon={<X className="w-3.5 h-3.5" />} sx={{
                borderColor: SOJORI_COLORS.gray[300],
                color: `${SOJORI_COLORS.gray[700]} !important`,
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 12px',
                '&:hover': {
                  borderColor: SOJORI_COLORS.error,
                  backgroundColor: '#FEE2E2'
                }
              }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} variant="contained" size="small" startIcon={<UserPlus className="w-4 h-4" />} sx={{
                bgcolor: SOJORI_COLORS.primary,
                color: 'white !important',
                fontSize: '12px',
                fontWeight: 600,
                height: '32px',
                px: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: SOJORI_COLORS.primaryDark
                },
                '&:disabled': {
                  bgcolor: SOJORI_COLORS.gray[200],
                  color: SOJORI_COLORS.gray[600]
                }
              }}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                </DialogActions>
              </Form>}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Update Member Dialog */}
      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB'
      }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <Typography sx={{
                fontSize: '15px',
                fontWeight: 700
              }}>Update Team Member</Typography>
                <Typography sx={{
                fontSize: '11px',
                color: '#6B7280'
              }}>{selectedMember?.username}</Typography>
              </div>
            </div>
            <IconButton onClick={() => setUpdateDialog(false)} size="small">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </DialogTitle>

        <DialogContent sx={{
        padding: '16px'
      }}>
          {/* Tabs Navigation */}
          <Tabs value={updateTabIndex} onChange={(e, newValue) => setUpdateTabIndex(newValue)} sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
          minHeight: '36px',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '12px',
            minHeight: '36px',
            padding: '6px 12px'
          }
        }}>
            <Tab label="📋 Infos" />
            <Tab label="🌍 Localisation" />
            <Tab label="🎯 Categories" />
          </Tabs>

          {selectedMember && <Formik initialValues={{
          username: selectedMember.username || '',
          subType: categoriesForDisplay(selectedMember.categories || selectedMember.subType || []),
          callPhone: selectedMember.callPhone || '',
          whatsappPhone: selectedMember.whatsappPhone || '',
          listingIds: Array.isArray(selectedMember.listingIds) && selectedMember.listingIds.includes('All') ? ['All'] : Array.isArray(selectedMember.listingIds) ? selectedMember.listingIds.map(id => typeof id === 'object' && id ? (id._id || id).toString() : String(id)) : [],
          language: selectedMember.language || '',
          countryIds: Array.isArray(selectedMember.countryIds) ? selectedMember.countryIds.map(id => typeof id === 'object' ? id._id || id : id) : [],
          cityIds: Array.isArray(selectedMember.cityIds) ? selectedMember.cityIds.map(id => typeof id === 'object' ? id._id || id : id) : [],
          staffType: selectedMember.staffType || '',
          memberRole: selectedMember.memberRole || 'Staff'
        }} validationSchema={updateValidationSchema} onSubmit={handleUpdateMember} enableReinitialize>
              {({
            isSubmitting,
            values,
            setFieldValue
          }) => <Form className="space-y-3">
                  {/* Tab 0: Informations de Base */}
                  {updateTabIndex === 0 && <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Username */}
                        <Box>
                          <Field as={TextField} fullWidth name="username" label="Username *" variant="outlined" size="small" InputProps={{
                    startAdornment: <User className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  }} />
                          <ErrorMessage name="username" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>

                        {/* Call Phone */}
                        <Box>
                          <Field as={TextField} fullWidth name="callPhone" label="Call Phone *" variant="outlined" size="small" InputProps={{
                    startAdornment: <Phone className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  }} />
                          <ErrorMessage name="callPhone" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>

                        {/* WhatsApp Phone */}
                        <Box>
                          <Field as={TextField} fullWidth name="whatsappPhone" label="WhatsApp Phone *" variant="outlined" size="small" InputProps={{
                    startAdornment: <MessageSquare className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  }} />
                          <ErrorMessage name="whatsappPhone" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>
                      </div>

                      {/* Member Role */}
                      <Box>
                        <FormControl fullWidth size="small">
                          <InputLabel>Role *</InputLabel>
                          <Field name="memberRole">
                            {({
                      field
                    }) => <Select {...field} label="Role *" startAdornment={<Shield className="w-3.5 h-3.5 ml-2 mr-1 text-gray-500" />}>
                                {MEMBER_ROLES.map(role => <MenuItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      {role === 'Manager' ? '👔' : '👤'} {role}
                                    </div>
                                  </MenuItem>)}
                              </Select>}
                          </Field>
                        </FormControl>
                      </Box>
                    </div>}

                  {/* Tab 1: Localisation */}
                  {updateTabIndex === 1 && <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                    {/* Listings */}
                    <Box>
                      <Typography variant="body2" className="text-gray-700 font-semibold mb-2">Listings:</Typography>
                      <ListingSelector listings={listings} selectedIds={values.listingIds} onChange={newIds => setFieldValue('listingIds', newIds)} showAllOption={true} ownerSelected={true} />
                    </Box>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Countries */}
                        <Box>
                          <FormControl fullWidth size="small">
                      <InputLabel>Countries *</InputLabel>
                      <Select multiple value={values.countryIds} onChange={e => {
                      const newValue = e.target.value;
                      if (newValue.includes('All')) {
                        setFieldValue('countryIds', ['All']);
                        setFieldValue('cityIds', ['All']);
                      } else {
                        setFieldValue('countryIds', newValue);
                        setFieldValue('cityIds', []);
                      }
                    }} label="Countries *" renderValue={selected => {
                      if (selected.includes('All')) return 'All Countries';
                      return selected.map(id => countries.find(c => c._id === id)?.name || '').join(', ');
                    }}>
                        <MenuItem value="All">
                          <Checkbox checked={values.countryIds.includes('All')} />
                          <ListItemText primary="All Countries" />
                        </MenuItem>
                        {!values.countryIds.includes('All') && countries.map(country => <MenuItem key={country._id} value={country._id}>
                            <Checkbox checked={values.countryIds.includes(country._id)} />
                            <ListItemText primary={country.name} />
                          </MenuItem>)}
                      </Select>
                          </FormControl>
                          <ErrorMessage name="countryIds" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>

                        {/* Cities */}
                        <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Cities *</InputLabel>
                      <Select multiple value={values.cityIds} disabled={values.countryIds.includes('All')} onChange={e => {
                      const newValue = e.target.value;
                      if (newValue.includes('All')) {
                        setFieldValue('cityIds', ['All']);
                      } else {
                        setFieldValue('cityIds', newValue);
                      }
                    }} label="Cities *" renderValue={selected => {
                      if (selected.includes('All')) return 'All Cities';
                      return selected.map(id => cities.find(c => c._id === id)?.name || '').join(', ');
                    }}>
                        <MenuItem value="All">
                          <Checkbox checked={values.cityIds.includes('All')} />
                          <ListItemText primary="All Cities" />
                        </MenuItem>
                        {!values.cityIds.includes('All') && cities.filter(city => values.countryIds.includes(city.countryId)).map(city => <MenuItem key={city._id} value={city._id}>
                            <Checkbox checked={values.cityIds.includes(city._id)} />
                            <ListItemText primary={city.name} />
                          </MenuItem>)}
                      </Select>
                          </FormControl>
                          <ErrorMessage name="cityIds" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>
                      </div>
                    </div>}

                  {/* Tab 2: Configuration */}
                  {updateTabIndex === 2 && <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Language */}
                        <Box>
                          <FormControl fullWidth size="small">
                        <InputLabel>Language *</InputLabel>
                        <Select name="language" value={values.language} onChange={e => setFieldValue('language', e.target.value)} label="Language *">
                          {languages.map(lang => {
                        const langValue = typeof lang === 'object' ? lang.name : lang;
                        const langKey = typeof lang === 'object' ? lang._id : lang;
                        return <MenuItem key={langKey} value={langValue}>
                                {langValue}
                              </MenuItem>;
                      })}
                        </Select>
                          </FormControl>
                          <ErrorMessage name="language" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>

                        {/* Staff Type */}
                        <Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Staff Type *</InputLabel>
                        <Select name="staffType" value={values.staffType} onChange={e => setFieldValue('staffType', e.target.value)} label="Staff Type *">
                          {STAFF_TYPES.map(type => <MenuItem value={type} key={type}>
                              {type}
                            </MenuItem>)}
                        </Select>
                          </FormControl>
                          <ErrorMessage name="staffType" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>

                        {/* Categories */}
                        <Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Categories *</InputLabel>
                        <Select multiple value={values.subType} onChange={e => {
                      const value = e.target.value;
                      // If "All" is selected, only keep "All"
                      if (value.includes('All')) {
                        setFieldValue('subType', ['All']);
                      } else {
                        setFieldValue('subType', value);
                      }
                    }} label="Categories *" renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                              {selected.includes('All') ? <Chip label="ALL" size="small" sx={{
                        backgroundColor: '#6366F1',
                        color: 'white !important',
                        fontSize: '10px',
                        height: '20px'
                      }} /> : selected.map(value => {
                        const taskType = TASK_TYPES.find(t => t.id === value);
                        return <Chip key={value} label={value} size="small" sx={{
                          backgroundColor: taskType?.color || SOJORI_COLORS.gray[500],
                          color: 'white !important',
                          fontSize: '10px',
                          height: '20px'
                        }} />;
                      })}
                            </Box>}>
                          {TASK_TYPES.map(type => <MenuItem key={type.id} value={type.id}>
                              <Checkbox checked={values.subType.includes(type.id)} size="small" />
                              <div className="flex flex-col">
                                <Typography sx={{
                            fontSize: '13px',
                            fontWeight: 600
                          }}>{type.label}</Typography>
                                <Typography sx={{
                            fontSize: '11px',
                            color: '#6B7280'
                          }}>{type.description}</Typography>
                              </div>
                            </MenuItem>)}
                        </Select>
                          </FormControl>
                          <ErrorMessage name="subType" component={Typography} className="text-red-500 !text-xs mt-1" />
                        </Box>
                      </div>
                    </div>}

                  <DialogActions sx={{
              padding: '12px 16px',
              borderTop: '1px solid #E5E7EB'
            }}>
                    <Button onClick={() => setUpdateDialog(false)} variant="outlined" size="small" startIcon={<X className="w-3.5 h-3.5" />} sx={{
                borderColor: '#EF4444',
                color: '#EF4444 !important',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 16px',
                '&:hover': {
                  borderColor: '#DC2626',
                  backgroundColor: '#FEE2E2'
                }
              }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} variant="contained" size="small" startIcon={<Save className="w-3.5 h-3.5" />} sx={{
                background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
                color: 'white !important',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 16px',
                '&:hover': {
                  background: `linear-gradient(135deg, ${SOJORI_COLORS.primaryDark} 0%, #C44519 100%)`
                },
                '&:disabled': {
                  background: SOJORI_COLORS.gray[300]
                }
              }}>
                      {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                  </DialogActions>
                </Form>}
            </Formik>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default TeamMembersView;
