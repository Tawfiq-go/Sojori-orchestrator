// pages/admin/workers/CreateWorkerForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Container, Grid, Paper, Typography, TextField, Stack, Button, Avatar, List, ListItemButton, ListItemText, Table, TableHead, TableRow, TableCell, TableBody, Checkbox, FormControlLabel, Chip, useMediaQuery, Switch, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, MenuItem, InputAdornment } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useTheme } from '@mui/material/styles';
import { Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { ArrowLeft } from 'lucide-react';
import { Formik, Form } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// API & helpers (same places you use in Edit)
import { getListings } from '../../listing/services/serverApi.listing';
import { getNotificationEvent, getGroups, inviteWorker } from '../services/serverApi.task';
import { uploadImageToAPI } from '../../../redux/slices/UploadSlice';
import { buildOwnerPermissionRows } from '../../../utils/ownerRoutePermissions';
const CONTRACT_TYPES = ['GROSS REVENUE', 'NET REVENUE', 'NET-NET', 'FIXED FEE'];
const BRAND = {
  primary: '#0ea5a9'
};
const ACTIONS = [{
  key: 'get',
  label: 'View'
}, {
  key: 'update',
  label: 'Modify'
}, {
  key: 'create',
  label: 'Create'
}, {
  key: 'delete',
  label: 'Delete'
}];
const setAction = (grants, feature, action, value) => {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex(g => g.feature === feature);
  if (i === -1) {
    if (value) next.push({
      feature,
      actions: [action]
    });
    return next;
  }
  const set = new Set(next[i].actions || []);
  if (value) set.add(action);else set.delete(action);
  const updated = Array.from(set);
  if (updated.length === 0) next.splice(i, 1);else next[i] = {
    feature,
    actions: updated
  };
  return next;
};
const setRowAllLimited = (grants, feature, value, allowedKeys) => {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex(g => g.feature === feature);
  if (value) {
    const all = Array.from(new Set(allowedKeys));
    if (i === -1) next.push({
      feature,
      actions: all
    });else next[i] = {
      feature,
      actions: all
    };
  } else {
    if (i !== -1) next.splice(i, 1);
  }
  return next;
};
const hasAction = (grants, feature, action) => {
  const arr = Array.isArray(grants) ? grants : [];
  return arr.some(g => (g.feature === '*' || g.feature === feature) && (g.actions?.includes('*') || g.actions?.includes(action)));
};
const isWildcardGrants = grants => Array.isArray(grants) && grants.some(g => g?.feature === '*' || (g?.actions || []).includes('*'));
const NOTIF_CHANNELS = [{
  key: 'dashboard',
  label: 'Dashboard'
}];
const SECTIONS = [{
  id: 'basic-info',
  label: 'BASIC INFO'
}, {
  id: 'address',
  label: 'ADDRESS'
}, {
  id: 'listings-access',
  label: 'LISTING ACCESS'
}, {
  id: 'access-permissions',
  label: 'ACCESS PERMISSIONS'
}, {
  id: 'notifications',
  label: 'NOTIFICATIONS'
}];
const EMPTY_WORKER = {
  avatar: null,
  firstName: '',
  lastName: '',
  title: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  postalCode: '',
  city: '',
  country: '',
  timezone: '',
  noteBeforeContact: '',
  isOwnerAdmin: false,
  workerTypeOwner: true,
  featureGrants: [],
  groupIds: [],
  listingIds: [],
  ownerAccess: false,
  notificationConfig: [],
  contractType: '',
  commission: 0
};
const ADMIN_OPT = {
  _id: '__ADMIN__',
  name: 'Admin-level access'
};
export default function CreateWorkerForm() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isTabletOrMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const {
    t
  } = useTranslation('common');

  // auth (to get ownerId if needed)
  const {
    user
  } = useSelector(s => s.auth) || {};
  const ownerIdFromAuth = user?.ownerId || (user?.role === 'Owner' ? user?._id : null);
  const [active, setActive] = useState(SECTIONS[0].id);
  const [groups, setGroups] = useState([]);
  const [NOTIFICATION_EVENTS, setNOTIFICATION_EVENTS] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsLimit, setListingsLimit] = useState(4);
  const [listingSearch, setListingSearch] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [missingPermission, setMissingPermission] = useState(false);
  const [missingFlags, setMissingFlags] = useState({
    listings: false,
    grants: false
  });
  const formikRef = React.useRef(null);
  const staging = JSON.parse(localStorage.getItem('isStaging')) || false;

  // load notifications catalog
  useEffect(() => {
    getNotificationEvent().then(({
      data
    }) => setNOTIFICATION_EVENTS(data?.NOTIFICATION_EVENTS || [])).catch(() => {});
  }, []);

  // load groups for this owner
  useEffect(() => {
    if (!ownerIdFromAuth) return;
    getGroups(ownerIdFromAuth).then(({
      data
    }) => setGroups(Array.isArray(data?.groups) ? data.groups : [])).catch(() => {});
  }, [ownerIdFromAuth]);

  // listings search/pagination
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        setListingsLoading(true);
        try {
          const result = await getListings({
            page: listingsPage,
            limit: listingsLimit,
            name: listingSearch,
            staging,
            useActiveFilter: true,
            active: true
          });
          setListings(Array.isArray(result?.data?.data) ? result.data?.data : []);
          setListingsTotal(result?.data?.total ?? 0);
        } catch (e) {
          setListings([]);
          setListingsTotal(0);
        } finally {
          setListingsLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [listingSearch, listingsPage, listingsLimit, staging]);

  // section spy
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (v?.target?.id) setActive(v.target.id);
    }, {
      root: null,
      rootMargin: '0px 0px -60% 0px',
      threshold: [0.1, 0.25, 0.5, 0.75, 1]
    });
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  const consumeApiError = (error, setFieldError) => {
    const data = error?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
      // Set field-level errors (if path/key present)
      data.errors.forEach(e => {
        const field = Array.isArray(e.path) && e.path[0] || e.key || '';
        if (field && setFieldError) setFieldError(`worker.${field}`, e.message || 'Invalid');
      });
      // Show a toast with combined messages
      const msg = data.errors.map(e => e.message).join('\n');
      toast.error(msg || 'Validation failed');
    } else {
      toast.error(data?.message || data?.error || 'Failed to save');
    }
  };
  const normalizePhone = (val = '') => (val || '').replace(/[^\d+]/g, '');
  const isValidPhone = val => {
    if (!val) return true; // optional
    const n = normalizePhone(val);
    return /^\+?\d{7,15}$/.test(n);
  };
  const validate = values => {
    const v = values.worker || {};
    const errors = {
      worker: {}
    };
    if (!v.firstName?.trim()) errors.worker.firstName = t('First name is required');
    if (!v.lastName?.trim()) errors.worker.lastName = t('Last name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email || '')) errors.worker.email = t('Valid email is required');
    if (v.workerTypeOwner) {
      if (!v.contractType) {
        errors.worker.contractType = t('Contract type is required');
      }
      if (v.contractType !== 'FIXED FEE') {
        const c = Number(v.commission);
        if (Number.isNaN(c) || c < 0 || c > 100) {
          errors.worker.commission = t('Commission must be between 0 and 100');
        }
      }
    }
    // Optional, but if provided must be valid format
    if (!isValidPhone(v.phone)) {
      errors.worker.phone = t('Enter a valid phone number (e.g., +212612345678)');
    }
    if (!isValidPhone(v.whatsapp)) {
      errors.worker.whatsapp = t('Enter a valid WhatsApp number (e.g., +212612345678)');
    }
    return Object.keys(errors.worker).length ? errors : {};
  };
  const featureRows = useMemo(() => buildOwnerPermissionRows(), []);
  const allCurrentListingIds = useMemo(() => listings.map(l => l._id), [listings]);
  const selectedGroupOptions = w => {
    const arr = [];
    if (w.isOwnerAdmin || isWildcardGrants(w.featureGrants)) arr.push(ADMIN_OPT);
    const map = new Map((groups || []).map(g => [String(g._id), g]));
    (w.groupIds || []).forEach(id => {
      const g = map.get(String(id));
      if (g) arr.push(g);
    });
    return arr;
  };
  const mergeGrants = ({
    current = [],
    selectedGroups = [],
    prevOverlay = []
  } = {}) => {
    const hasWildcard = (grants = []) => grants.some(g => g?.feature === '*' || (g?.actions || []).includes('*'));
    const toMap = (grants = []) => {
      const m = new Map();
      for (const g of grants) {
        if (!g?.feature) continue;
        const set = m.get(g.feature) || new Set();
        (g.actions || []).forEach(a => set.add(a));
        m.set(g.feature, set);
      }
      return m;
    };
    const fromMap = map => Array.from(map.entries()).map(([feature, set]) => ({
      feature,
      actions: Array.from(set)
    }));
    if (hasWildcard(current) || selectedGroups.some(hasWildcard)) {
      return {
        next: [{
          feature: '*',
          actions: ['*']
        }],
        overlay: [{
          feature: '*',
          actions: ['*']
        }]
      };
    }
    const overlayMap = new Map();
    for (const groupGrants of selectedGroups) {
      for (const g of groupGrants || []) {
        if (!g?.feature) continue;
        const set = overlayMap.get(g.feature) || new Set();
        (g.actions || []).forEach(a => set.add(a));
        overlayMap.set(g.feature, set);
      }
    }
    const newOverlay = fromMap(overlayMap);
    let manual;
    if (isWildcardGrants(prevOverlay)) {
      manual = [];
    } else {
      const curMap = toMap(current);
      const prevMap = toMap(prevOverlay);
      for (const [feat, prevSet] of prevMap.entries()) {
        const curSet = curMap.get(feat);
        if (!curSet) continue;
        prevSet.forEach(a => curSet.delete(a));
        if (curSet.size === 0) curMap.delete(feat);
      }
      manual = fromMap(curMap);
    }
    const nextMap = toMap(manual);
    for (const [feat, set] of overlayMap.entries()) {
      const dst = nextMap.get(feat) || new Set();
      set.forEach(a => dst.add(a));
      nextMap.set(feat, dst);
    }
    const next = fromMap(nextMap);
    return {
      next,
      overlay: newOverlay
    };
  };
  const notifFind = (config, key) => (Array.isArray(config) ? config : []).find(e => e.key === key) || null;
  const notifIsOn = (config, key, channelKey, defaults = {}) => {
    const found = notifFind(config, key);
    if (found) return !!found.channels?.[channelKey];
    return !!defaults[channelKey];
  };
  const notifSet = (config, key, channelKey, value, defaults = {}, allChannelKeys = NOTIF_CHANNELS.map(c => c.key)) => {
    const next = Array.isArray(config) ? [...config] : [];
    const idx = next.findIndex(e => e.key === key);
    if (idx === -1) {
      const channels = {
        ...defaults,
        [channelKey]: !!value
      };
      const allOff = allChannelKeys.every(k => !channels[k]);
      if (!allOff) next.push({
        key,
        channels
      });
      return next;
    }
    const updated = {
      key,
      channels: {
        ...(next[idx].channels || {}),
        [channelKey]: !!value
      }
    };
    const allOff = allChannelKeys.every(k => !updated.channels[k]);
    if (allOff) next.splice(idx, 1);else next[idx] = updated;
    return next;
  };
  const handleCreate = async values => {
    try {
      const {
        _previousFeatureGrants,
        _groupGrants,
        ...payload
      } = values.worker || {};
      payload.groupIds = Array.isArray(payload.groupIds) ? payload.groupIds : [];
      payload.listingIds = Array.isArray(payload.listingIds) ? payload.listingIds : [];
      payload.featureGrants = Array.isArray(payload.featureGrants) ? payload.featureGrants : [];
      payload.phone = payload.phone?.trim() ? normalizePhone(payload.phone) : null;
      payload.whatsapp = payload.whatsapp?.trim() ? normalizePhone(payload.whatsapp) : null;
      const listingsMissing = payload.listingIds.length === 0;
      const grantsMissing = payload.featureGrants.length === 0;
      if (listingsMissing || grantsMissing) {
        setMissingFlags({
          listings: listingsMissing,
          grants: grantsMissing
        });
        setMissingPermission(true);
        return; // stop submit; wait for dialog choice
      }
      if (!payload.workerTypeOwner) {
        payload.contractType = '';
        payload.commission = 0;
      }
      await inviteWorker(payload);
      toast.success(t('saved'));
      // navigate(-1);
      // navigate('User/worker');
      const isOwner = !!payload.workerTypeOwner;
      navigate('/admin/equipe?tab=worker', {
        replace: true
      });
    } catch (err) {
      consumeApiError(err, formikRef.current?.setFieldError);
    }
  };
  const scrollToSection = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // "Add" button: scroll to whichever fields are missing
  const handleAddMissing = () => {
    if (missingFlags.listings) scrollToSection('listings-access');
    if (missingFlags.grants) scrollToSection('access-permissions');
    setMissingPermission(false);
  };

  // "Create anyway": build payload from current form values and call API
  const handleCreateAnyway = async () => {
    try {
      const values = formikRef.current?.values || {
        worker: {}
      };
      const {
        _previousFeatureGrants,
        _groupGrants,
        ...payload
      } = values.worker || {};
      payload.groupIds = Array.isArray(payload.groupIds) ? payload.groupIds : [];
      payload.listingIds = Array.isArray(payload.listingIds) ? payload.listingIds : [];
      payload.featureGrants = Array.isArray(payload.featureGrants) ? payload.featureGrants : [];
      payload.phone = payload.phone?.trim() ? normalizePhone(payload.phone) : null;
      payload.whatsapp = payload.whatsapp?.trim() ? normalizePhone(payload.whatsapp) : null;
      setMissingPermission(false);
      if (!payload.workerTypeOwner) {
        payload.contractType = '';
        payload.commission = 0;
      }
      await inviteWorker(payload);
      toast.success(t('saved'));
      // navigate(-1);
      // navigate('User/worker');
      const isOwner = !!payload.workerTypeOwner;
      navigate('/admin/equipe?tab=worker', {
        replace: true
      });
    } catch (err) {
      consumeApiError(err, formikRef.current?.setFieldError);
    }
  };
  return <Container maxWidth="lg" sx={{
    py: 3
  }}>
      <ToastContainer position="top-right" autoClose={3000} />
      {/* header bar */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
      mb: 2
    }}>
        <Button variant="text" onClick={() => navigate(-1)} className="!text-gray-500 hover:!bg-gray-100 !px-3 !py-2 !text-sm !font-medium !min-w-0 !normal-case !rounded-md !transition-colors !flex !items-center !gap-2" sx={{
        fontSize: isTabletOrMobile ? '0.95rem' : undefined
      }}>
          <ArrowLeft className="!w-4 !h-4" />
          {t('Back')}
        </Button>
        <Stack direction="row" spacing={1}>
          <div className="!bg-red-500 !text-white !rounded-lg !text-sm !font-medium" style={{
          padding: isTabletOrMobile ? '8px 12px' : '12px',
          marginBottom: isTabletOrMobile ? 2 : 0,
          width: isTabletOrMobile ? '100%' : 'auto',
          textAlign: 'center',
          cursor: 'pointer'
        }} onClick={() => navigate(-1)}>
            {t('Cancel')}
          </div>
          <div className="!bg-green-500 !text-white !rounded-lg !text-sm !font-medium" style={{
          padding: isTabletOrMobile ? '8px 12px' : '12px',
          marginBottom: isTabletOrMobile ? 2 : 0,
          width: isTabletOrMobile ? '100%' : 'auto',
          textAlign: 'center',
          cursor: 'pointer'
        }} onClick={() => document.getElementById('worker-form-create')?.requestSubmit()}>
            {t('Save')}
          </div>
        </Stack>
      </Stack>

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={9}>
          <Formik innerRef={formikRef} enableReinitialize initialValues={{
          worker: {
            ...EMPTY_WORKER
          }
        }} validate={validate} onSubmit={handleCreate}>
            {({
            values,
            setFieldValue,
            handleChange,
            handleBlur,
            errors,
            touched
          }) => {
            const w = values.worker || EMPTY_WORKER;
            const isAllSelected = w.ownerAccess || w.isOwnerAdmin || w.listingIds?.includes('*') || Array.isArray(w.listingIds) && allCurrentListingIds.length > 0 && allCurrentListingIds.every(id => w.listingIds.includes(id));
            const handleAvatarUpload = async e => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              const localUrl = URL.createObjectURL(file);
              setAvatarPreview(localUrl);
              try {
                setUploading(true);
                const result = await dispatch(uploadImageToAPI({
                  file,
                  folder: 'other'
                }));
                if (result?.meta?.requestStatus === 'fulfilled') {
                  const url = result.payload.url;
                  setFieldValue('worker.avatar', url);
                  setAvatarPreview(url);
                } else {}
              } catch (err) {} finally {
                setUploading(false);
              }
            };
            const toggleListing = id => {
              if (w.isOwnerAdmin || w.listingIds?.includes('*')) return;
              const current = Array.isArray(w.listingIds) ? w.listingIds : [];
              const exists = current.includes(id);
              const next = exists ? current.filter(x => x !== id) : [...current, id];
              setFieldValue('worker.listingIds', next);
            };
            const selectAllOnPage = () => {
              if (w.isOwnerAdmin) return;
              const current = Array.isArray(w.listingIds) ? new Set(w.listingIds) : new Set();
              allCurrentListingIds.forEach(id => current.add(id));
              setFieldValue('worker.listingIds', Array.from(current));
            };
            const unselectAllOnPage = () => {
              if (w.isOwnerAdmin) return;
              const next = (Array.isArray(w.listingIds) ? w.listingIds : []).filter(id => !allCurrentListingIds.includes(id));
              setFieldValue('worker.listingIds', next);
            };
            const te = path => Boolean(path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, touched) && path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, errors));
            const he = path => path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, errors) || '';
            const handleGroupsChange = (_, options) => {
              const adminNow = options.some(o => o?._id === ADMIN_OPT._id);
              const wasAdmin = !!w.isOwnerAdmin || isWildcardGrants(w.featureGrants);
              if (adminNow) {
                if (!wasAdmin) {
                  setFieldValue('worker._previousFeatureGrants', w.featureGrants || []);
                }
                setFieldValue('worker.isOwnerAdmin', true);
                setFieldValue('worker.ownerAccess', true);
                setFieldValue('worker.groupIds', []);
                setFieldValue('worker._groupGrants', []);
                setFieldValue('worker.featureGrants', [{
                  feature: '*',
                  actions: ['*']
                }]);
                return;
              }
              setFieldValue('worker.isOwnerAdmin', false);
              setFieldValue('worker.ownerAccess', false);
              let base = w.featureGrants;
              if (wasAdmin) {
                base = w._previousFeatureGrants || [];
                setFieldValue('worker._previousFeatureGrants', []);
              }
              const realOptions = options.filter(o => o?._id !== ADMIN_OPT._id);
              const pickedIds = realOptions.map(o => String(o._id));
              setFieldValue('worker.groupIds', pickedIds);
              const byId = new Map((groups || []).map(g => [String(g._id), g]));
              const selected = pickedIds.map(id => byId.get(id)).filter(Boolean);
              const selectedGroupGrants = selected.map(g => g.featureGrants || []);
              const {
                next,
                overlay
              } = mergeGrants({
                current: base,
                selectedGroups: selectedGroupGrants,
                prevOverlay: w._groupGrants || []
              });
              setFieldValue('worker.featureGrants', next);
              setFieldValue('worker._groupGrants', overlay);
            };
            return <Form id="worker-form-create">
                  {/* BASIC INFO */}
                  <Paper id="basic-info" variant="outlined" sx={{
                p: 3,
                mb: 3
              }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
                  mb: 2
                }}>
                      <Typography variant="h6">{t('Basic info')}</Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: 170,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.default'
                    }}>
                          <Stack spacing={1} sx={{ alignItems: 'center' }}>
                            <Avatar src={avatarPreview || w.avatar || undefined} sx={{
                          width: 90,
                          height: 90
                        }} imgProps={{
                          style: {
                            objectFit: 'cover'
                          }
                        }} />
                            <Button size="small" component="label" disabled={uploading}>
                              {uploading ? t('Uploading...') : t('Browse')}
                              <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
                            </Button>
                          </Stack>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={8}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField label={t('First Name')} name="worker.firstName" value={w.firstName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.firstName')} helperText={he('worker.firstName')} fullWidth />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label={t('Last Name')} name="worker.lastName" value={w.lastName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.lastName')} helperText={he('worker.lastName')} fullWidth />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="Email" name="worker.email" value={w.email || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.email')} helperText={he('worker.email')} fullWidth />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label={t('Phone')} name="worker.phone" value={w.phone || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.phone', normalizePhone(e.target.value))} error={te('worker.phone')} helperText={he('worker.phone')} fullWidth size="small" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label={t('Whatsapp')} name="worker.whatsapp" value={w.whatsapp || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.whatsapp', normalizePhone(e.target.value))} error={te('worker.whatsapp')} helperText={he('worker.whatsapp')} fullWidth size="small" />
                          </Grid>
                          {/* <Grid item xs={12} sm={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={!!w.workerTypeOwner}
                                  onChange={(_, v) => {
                                    setFieldValue('worker.workerTypeOwner', v);
                                    if (!v) {
                                      // If not owner: hide & reset
                                      setFieldValue('worker.contractType', '');
                                      setFieldValue('worker.commission', 0);
                                    }
                                  }}
                                />
                              }
                              label={t('is Owner')}
                            />
                           </Grid> */}
                          {/* Owner contract fields */}
                          {w.workerTypeOwner && <>
                              <Grid item xs={12} sm={6}>
                                <TextField select label={t('Contract type')} name="worker.contractType" value={w.contractType || ''} onChange={e => {
                            const val = e.target.value;
                            setFieldValue('worker.contractType', val);
                            // If fixed fee → commission not required, set to 0
                            if (val === 'FIXED FEE') {
                              setFieldValue('worker.commission', 0);
                            }
                          }} error={te('worker.contractType')} helperText={he('worker.contractType')} fullWidth>
                                  {CONTRACT_TYPES.map(opt => <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>)}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField label={t('Commission (%)')} name="worker.commission" type="number" value={w.commission ?? 0} onChange={e => {
                            const val = e.target.value;
                            setFieldValue('worker.commission', val === '' ? '' : Number(val));
                          }} InputProps={{
                            endAdornment: <InputAdornment position="end">
                                        %
                                      </InputAdornment>
                          }} inputProps={{
                            min: 0,
                            max: 100,
                            step: '5'
                          }} disabled={w.contractType === 'FIXED FEE'} // not required then
                          error={te('worker.commission')} helperText={w.contractType === 'FIXED FEE' ? t('Commission not required for fixed fee') : he('worker.commission')} fullWidth />
                              </Grid>
                            </>}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* ADDRESS */}
                  <Paper id="address" variant="outlined" sx={{
                p: 3,
                mb: 3
              }}>
                    <Typography variant="h6" sx={{
                  mb: 2
                }}>
                      {t('Address')}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label={t('Address')} name="worker.address" value={w.address || ''} onChange={handleChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label={t('Postal Code')} name="worker.postalCode" value={w.postalCode || ''} onChange={handleChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label={t('City')} name="worker.city" value={w.city || ''} onChange={handleChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label={t('Country')} name="worker.country" value={w.country || ''} onChange={handleChange} fullWidth />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* LISTINGS ACCESS */}
                  <Paper id="listings-access" variant="outlined" sx={{
                p: 3,
                mb: 3
              }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
                  mb: 1.5
                }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="h6">
                          {t('Listings access')}
                        </Typography>
                        <Tooltip title={t('Choose which listings this worker can access')}>
                          <InfoOutlinedIcon sx={{
                        fontSize: 18,
                        color: 'text.secondary'
                      }} />
                        </Tooltip>
                        {w.listingIds?.includes('*') || w.isOwnerAdmin || w.ownerAccess ? <Chip size="small" color="success" label={t('All listings (admin)')} /> : null}
                      </Stack>

                      {w.isOwnerAdmin || w.listingIds?.includes('*') ? <Button size="small" disabled>
                          {t('All selected')}
                        </Button> : isAllSelected ? <Button size="small" onClick={unselectAllOnPage} className="!bg-red-500 !text-white !rounded-lg !text-sm !font-medium">
                          {t('Unselect all')}
                        </Button> : <Button size="small" onClick={selectAllOnPage} className="!bg-green-500 !text-white !rounded-lg !text-sm !font-medium">
                          {t('Select all')}
                        </Button>}
                    </Stack>

                    {/* search */}
                    <Box sx={{
                  mb: 2
                }}>
                      <TextField size="small" fullWidth placeholder={t('Type to search listings')} value={listingSearch} onChange={e => {
                    setListingSearch(e.target.value);
                    setListingsPage(0);
                  }} />
                    </Box>

                    {/* grid */}
                    <Box sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr'
                  }
                }}>
                      {listingsLoading ? <Box sx={{
                    p: 4,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}>
                          {t('Loading...')}
                        </Box> : listings.length === 0 ? <Box sx={{
                    p: 3,
                    color: 'text.secondary'
                  }}>
                          {t('No listings found')}
                        </Box> : listings.map(l => {
                    const selected = w.isOwnerAdmin || w.listingIds?.includes('*') || Array.isArray(w.listingIds) && w.listingIds.includes(l._id);
                    const img = l.listingImages?.[0]?.url || 'https://via.placeholder.com/240x160?text=Listing';
                    return <Paper key={l._id} elevation={selected ? 3 : 0} sx={{
                      display: 'grid',
                      gridTemplateColumns: '180px 1fr',
                      alignItems: 'stretch',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: selected ? 'primary.light' : 'divider',
                      borderRadius: 2,
                      cursor: w.isOwnerAdmin || w.listingIds?.includes('*') ? 'not-allowed' : 'pointer'
                    }} onClick={() => toggleListing(l._id)}>
                              <Box sx={{
                        height: 144,
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                              <Box sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                                <Box>
                                  <Typography variant="subtitle1" sx={{
                            fontWeight: 600
                          }}>
                                    {l.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {l?.propertyUnit}
                                  </Typography>
                                </Box>
                                <Box>
                                  {selected ? <CheckBoxIcon color="primary" /> : <CheckBoxOutlineBlankIcon color="disabled" />}
                                </Box>
                              </Box>
                            </Paper>;
                  })}
                    </Box>

                    {/* simple page controls */}
                    {listingsTotal > listingsLimit && <Stack direction="row" spacing={1} sx={{
                  mt: 2
                }} justifyContent="flex-end" alignItems="center">
                        <Button size="small" disabled={listingsPage === 0} onClick={() => setListingsPage(p => p - 1)}>
                          {t('Prev')}
                        </Button>
                        <Typography variant="caption">
                          {t('Page')} {listingsPage + 1}
                        </Typography>
                        <Button size="small" disabled={(listingsPage + 1) * listingsLimit >= listingsTotal} onClick={() => setListingsPage(p => p + 1)}>
                          {t('Next')}
                        </Button>
                      </Stack>}
                  </Paper>

                  {/* ACCESS PERMISSIONS */}
                  <Paper id="access-permissions" variant="outlined" sx={{
                p: 3,
                mb: 8
              }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
                  mb: 2
                }}>
                      <Typography variant="h6">
                        {t('Access permissions')}
                      </Typography>

                      <Autocomplete multiple options={[ADMIN_OPT, ...groups]} getOptionLabel={o => o?.name || ''} isOptionEqualToValue={(opt, val) => String(opt?._id) === String(val?._id)} value={selectedGroupOptions(w)} onChange={handleGroupsChange} disableCloseOnSelect renderTags={(value, getTagProps) => value.map((opt, index) => <Chip {...getTagProps({
                    index
                  })} key={opt._id} label={opt.name} size="small" />)} renderInput={params => <TextField {...params} label={t('Groups & roles')} placeholder={t('Select groups...')} size="small" />} sx={{
                    minWidth: 320
                  }} />
                    </Stack>

                    <Table size="small" sx={{
                  '& th, & td': {
                    whiteSpace: 'nowrap'
                  }
                }}>
                      <TableHead>
                        <TableRow>
                          <TableCell />
                          {ACTIONS.map(a => <TableCell key={a.key} align="center" sx={{
                        fontWeight: 600
                      }}>
                              {a.label}
                            </TableCell>)}
                          <TableCell align="center" sx={{
                        color: 'text.secondary'
                      }}>
                            {t('All')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {featureRows.map((row, idx) => {
                      if (row.kind === 'section') {
                        return <TableRow key={`sec-${row.key}-${idx}`} sx={{
                          bgcolor: 'action.hover'
                        }}>
                                  <TableCell sx={{
                            fontWeight: 700
                          }} colSpan={ACTIONS.length + 2}>
                                    {row.label}
                                  </TableCell>
                                </TableRow>;
                      }
                      const allowed = new Set(row.allowedActions || ACTIONS.map(a => a.key));
                      const supportedKeys = ACTIONS.map(a => a.key).filter(k => allowed.has(k));
                      const allChecked = supportedKeys.length > 0 && supportedKeys.every(k => hasAction(w.featureGrants, row.featureKey, k));
                      const someChecked = supportedKeys.some(k => hasAction(w.featureGrants, row.featureKey, k));
                      return <TableRow key={`feat-${row.featureKey}-${idx}`} hover>
                                <TableCell sx={{
                          fontWeight: 600,
                          pl: row.indent ? 4 : 2
                        }}>
                                  {row.label}
                                </TableCell>

                                {ACTIONS.map(a => {
                          const supported = allowed.has(a.key);
                          return <TableCell key={a.key} align="center">
                                      {supported ? <Checkbox size="small" checked={hasAction(w.featureGrants, row.featureKey, a.key)} disabled={!!w.isOwnerAdmin} onChange={(_, v) => setFieldValue('worker.featureGrants', setAction(w.featureGrants, row.featureKey, a.key, v))} /> : <Box sx={{
                              color: 'text.disabled'
                            }} />}
                                    </TableCell>;
                        })}
                                <TableCell align="center">
                                  <Checkbox size="small" checked={allChecked} indeterminate={!allChecked && someChecked} disabled={!!w.isOwnerAdmin || supportedKeys.length === 0} onChange={(_, v) => setFieldValue('worker.featureGrants', setRowAllLimited(w.featureGrants, row.featureKey, v, supportedKeys))} />
                                </TableCell>
                              </TableRow>;
                    })}
                      </TableBody>
                    </Table>
                  </Paper>

                  {/* NOTIFICATIONS */}
                  <Paper id="notifications" variant="outlined" sx={{
                p: 3,
                mb: 3
              }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
                  mb: 2
                }}>
                      <Typography variant="h6">{t('Notifications')}</Typography>
                    </Stack>

                    <Table size="small" sx={{
                  '& th, & td': {
                    whiteSpace: 'nowrap'
                  }
                }}>
                      <TableHead>
                        <TableRow>
                          <TableCell />
                          {NOTIF_CHANNELS.map(ch => <TableCell key={ch.key} align="center" sx={{
                        fontWeight: 600
                      }}>
                              {ch.label}
                            </TableCell>)}
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {Object.entries((NOTIFICATION_EVENTS || []).reduce((acc, ev) => {
                      const cat = ev.category || 'other';
                      (acc[cat] = acc[cat] || []).push(ev);
                      return acc;
                    }, {})).map(([category, evts]) => <React.Fragment key={category}>
                            <TableRow sx={{
                        bgcolor: 'action.hover'
                      }}>
                              <TableCell sx={{
                          fontWeight: 700
                        }} colSpan={1 + NOTIF_CHANNELS.length}>
                                {t(category.charAt(0).toUpperCase() + category.slice(1))}
                              </TableCell>
                            </TableRow>

                            {evts.map(ev => <TableRow key={ev.id} hover>
                                <TableCell sx={{
                          pl: 4,
                          fontWeight: 400,
                          fontSize: 14
                        }}>
                                  {t(ev.name)}
                                </TableCell>

                                {NOTIF_CHANNELS.map(ch => <TableCell key={ch.key} align="center">
                                    <Checkbox size="small" checked={notifIsOn(w.notificationConfig, ev.key, ch.key, ev.defaultChannels)} onChange={(_, v) => setFieldValue('worker.notificationConfig', notifSet(w.notificationConfig, ev.key, ch.key, v, ev.defaultChannels))} />
                                  </TableCell>)}
                              </TableRow>)}
                          </React.Fragment>)}
                      </TableBody>
                    </Table>
                  </Paper>

                  {/* bottom save/cancel (mobile) */}
                  <Stack direction="row" spacing={1} className="mt-2">
                    <div className="!bg-red-500 !text-white !rounded-lg !text-sm !font-medium" style={{
                  padding: isTabletOrMobile ? '8px 12px' : '12px',
                  marginBottom: isTabletOrMobile ? 2 : 0,
                  width: isTabletOrMobile ? '100%' : 'auto',
                  textAlign: 'center',
                  cursor: 'pointer'
                }} onClick={() => navigate(-1)}>
                      {t('Cancel')}
                    </div>
                    <div className="!bg-green-500 !text-white !rounded-lg !text-sm !font-medium" style={{
                  padding: isTabletOrMobile ? '8px 12px' : '12px',
                  marginBottom: isTabletOrMobile ? 2 : 0,
                  width: isTabletOrMobile ? '100%' : 'auto',
                  textAlign: 'center',
                  cursor: 'pointer'
                }} onClick={() => document.getElementById('worker-form-create')?.requestSubmit()}>
                      {t('Save')}
                    </div>
                  </Stack>
                </Form>;
          }}
          </Formik>
        </Grid>

        {/* right sticky SECTIONS nav */}
        <Grid item xs={12} md={3}>
          <Box sx={{
          position: 'sticky',
          top: 24
        }}>
            <Paper variant="outlined">
              <Box sx={{
              px: 2,
              py: 1.5
            }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('SECTIONS')}
                </Typography>
              </Box>
              <List component="nav">
                {SECTIONS.map(s => <ListItemButton key={s.id} selected={active === s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              })} sx={{
                '&.Mui-selected': {
                  bgcolor: `${BRAND.primary}1a`,
                  borderLeft: `3px solid ${BRAND.primary}`
                }
              }}>
                    <ListItemText primary={t(s.label)} primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: active === s.id ? 700 : 500
                }} />
                  </ListItemButton>)}
              </List>
            </Paper>
          </Box>
        </Grid>
      </Grid>
      <Dialog open={missingPermission} onClose={() => setMissingPermission(false)} aria-labelledby="missing-fields-title" aria-describedby="missing-fields-desc">
        <DialogTitle id="missing-fields-title">
          {t('Missing access')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="missing-fields-desc" className="m-4">
            {missingFlags.listings && missingFlags.grants ? t('This worker has no listing access and no permissions.') : missingFlags.listings ? t('This worker has no listing access.') : t('This worker has no permissions.')}{' '}
            {t('You can add them now, or continue anyway.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddMissing} className="!text-green-600">
            {t('Add missing')}
          </Button>
          <Button onClick={handleCreateAnyway} autoFocus className="!bg-amber-500 !text-white !rounded-md">
            {t('Create anyway')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>;
}
