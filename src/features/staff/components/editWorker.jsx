import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Paper, Typography, TextField, Stack, Button, Avatar, Checkbox, FormControlLabel, Chip, useMediaQuery, Switch, FormControl, InputLabel, Select, MenuItem, InputAdornment, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useTheme } from '@mui/material/styles';
import { Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getListings } from '../../listing/services/serverApi.listing';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Formik, Form } from 'formik';
import { getAccounById, getNotificationEvent, updateWorker, getGroups } from '../services/serverApi.task';
import routes, { buildFeatureRows } from '../../../routes';
import { useDispatch } from 'react-redux';
import { uploadImageToAPI } from '../../../redux/slices/UploadSlice';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
const setRowAll = (grants, feature, value) => {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex(g => g.feature === feature);
  if (value) {
    const all = ACTIONS.map(a => a.key);
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
  banned: false,
  featureGrants: [],
  groupIds: [],
  listingIds: [],
  ownerAccess: false,
  notificationConfig: [],
  workerTypeOwner: false,
  contractType: '',
  commission: 0
};
const toWorker = account => {
  if (!account) return EMPTY_WORKER;
  const grants = Array.isArray(account.featureGrants) ? account.featureGrants : [];
  const adminByWildcard = isWildcardGrants(grants);
  return {
    ...EMPTY_WORKER,
    avatar: account.avatar || '',
    firstName: account.firstName || '',
    lastName: account.lastName || '',
    title: account.title || '',
    email: account.email || '',
    phone: account.phone || '',
    whatsapp: account.whatsapp || '',
    address: account.address || '',
    postalCode: account.postalCode || '',
    city: account.city || '',
    country: account.country || '',
    timezone: account.timezone || '',
    noteBeforeContact: account.noteBeforeContact || '',
    isOwnerAdmin: !!account.isOwnerAdmin || adminByWildcard,
    banned: !!account.banned,
    featureGrants: grants,
    groupIds: [],
    listingIds: Array.isArray(account.listingIds) ? account.listingIds : [],
    ownerAccess: !!account.ownerAccess,
    notificationConfig: Array.isArray(account.notificationConfig) ? account.notificationConfig : [],
    workerTypeOwner: !!account.workerTypeOwner,
    contractType: account.contractType || '',
    commission: Number(account.commission ?? 0)
  };
};
function TabPanel({
  children,
  value,
  index
}) {
  return <div hidden={value !== index}>
      {value === index && <Box sx={{
      p: 2
    }}>{children}</Box>}
    </div>;
}
export default function WorkerAccessForm() {
  const {
    userId
  } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    t
  } = useTranslation('common');
  const isTabletOrMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [accountFromApi, setAccountFromApi] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [NOTIFICATION_EVENTS, setNOTIFICATION_EVENTS] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsLimit, setListingsLimit] = useState(4);
  const [listingSearch, setListingSearch] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const staging = JSON.parse(localStorage.getItem('isStaging')) || false;
  const formikRef = React.useRef(null);
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getAccounById(userId).then(({
      data
    }) => setAccountFromApi(data?.account || null)).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);
  useEffect(() => {
    getNotificationEvent().then(({
      data
    }) => setNOTIFICATION_EVENTS(data?.NOTIFICATION_EVENTS || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const ownerId = accountFromApi?.ownerId;
    if (!ownerId) return;
    getGroups(ownerId).then(({
      data
    }) => setGroups(Array.isArray(data?.groups) ? data.groups : [])).catch(() => {});
  }, [accountFromApi?.ownerId]);
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
  const initialWorker = useMemo(() => toWorker(accountFromApi), [accountFromApi]);
  const featureRows = useMemo(() => buildFeatureRows(routes, t, 'Owner'), [routes, t]);
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
  const validate = values => {
    const v = values.worker || {};
    const errors = {
      worker: {}
    };
    if (!v.firstName?.trim()) errors.worker.firstName = 'First name is required';
    if (!v.lastName?.trim()) errors.worker.lastName = 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email || '')) errors.worker.email = 'Valid email is required';
    if (v.workerTypeOwner) {
      if (!v.contractType) {
        errors.worker.contractType = 'Contract type is required';
      }
      if (v.contractType !== 'FIXED FEE') {
        const n = Number(v.commission);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          errors.worker.commission = 'Commission must be 0–100';
        }
      }
    }
    return Object.keys(errors.worker).length ? errors : {};
  };
  const consumeApiError = (error, setFieldError) => {
    const data = error?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length) {
      data.errors.forEach(e => {
        const field = Array.isArray(e.path) && e.path[0] || e.key || '';
        if (field && setFieldError) setFieldError(`worker.${field}`, e.message || 'Invalid');
      });
      const msg = data.errors.map(e => e.message).join('\n');
      toast.error(msg || 'Validation failed');
    } else {
      toast.error(data?.message || data?.error || 'Failed to save');
    }
  };
  const updateWorkerFunction = async values => {
    values.groupIds = [];
    const {
      _previousFeatureGrants,
      ...payload
    } = values || {};
    updateWorker(userId, payload).then(({
      data
    }) => {
      toast.success(t('saved'));
      const isOwner = !!payload.workerTypeOwner;
      navigate(`/admin/User/${isOwner ? 'owners' : 'worker'}`, {
        replace: true
      });
    }).catch(err => {
      consumeApiError(err, formikRef.current?.setFieldError);
    });
  };
  const ADMIN_OPT = {
    _id: '__ADMIN__',
    name: 'Admin-level access'
  };
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
  const handleGroupsChange = (w, setFieldValue, groups = []) => (_, options) => {
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
    if (hasWildcard(prevOverlay)) {
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
  const allCurrentListingIds = useMemo(() => listings.map(l => l._id), [listings]);
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
    if (allOff) {
      next.splice(idx, 1);
    } else {
      next[idx] = updated;
    }
    return next;
  };
  const groupEventsByCategory = events => events.reduce((acc, ev) => {
    const cat = ev.category || 'other';
    (acc[cat] = acc[cat] || []).push(ev);
    return acc;
  }, {});
  const groupFeaturesBySection = rows => {
    const sections = {};
    let currentSection = 'Other';
    rows.forEach(row => {
      if (row.kind === 'section') {
        currentSection = row.label;
        if (!sections[currentSection]) sections[currentSection] = [];
      } else {
        if (!sections[currentSection]) sections[currentSection] = [];
        sections[currentSection].push(row);
      }
    });
    return sections;
  };
  return <Container maxWidth="lg" sx={{
    py: 3
  }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
      mb: 2
    }}>
        <Button variant="text" onClick={() => navigate(-1)} sx={{
        color: SOJORI_COLORS.gray[600],
        '&:hover': {
          bgcolor: SOJORI_COLORS.gray[100]
        },
        px: 2,
        py: 1,
        fontSize: '0.875rem',
        fontWeight: 500,
        textTransform: 'none'
      }}>
          <ArrowLeft style={{
          width: 16,
          height: 16,
          marginRight: 8
        }} />
          {t('Back')}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => navigate(-1)} sx={{
          bgcolor: SOJORI_COLORS.gray[300],
          color: SOJORI_COLORS.gray[700],
          '&:hover': {
            bgcolor: SOJORI_COLORS.gray[400]
          },
          textTransform: 'none',
          fontSize: '0.875rem'
        }}>
            {t('Cancel')}
          </Button>
          <Button variant="contained" onClick={() => document.getElementById('worker-form')?.requestSubmit()} sx={{
          bgcolor: SOJORI_COLORS.primary,
          color: 'white !important',
          '&:hover': {
            bgcolor: SOJORI_COLORS.primaryDark
          },
          textTransform: 'none',
          fontSize: '0.875rem'
        }}>
            {t('Save')}
          </Button>
        </Stack>
      </Stack>

      <Formik innerRef={formikRef} enableReinitialize initialValues={{
      worker: initialWorker
    }} validate={validate} onSubmit={vals => updateWorkerFunction(vals.worker)}>
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
            const result = await dispatch(uploadImageToAPI({
              file,
              folder: 'other'
            }));
            if (result?.meta?.requestStatus == 'fulfilled') {
              const url = result.payload.url;
              setFieldValue('worker.avatar', url);
              setAvatarPreview(url);
            } else {}
          } catch (err) {}
        };
        const toggleListing = id => {
          if (w.ownerAccess || w.isOwnerAdmin || w.listingIds?.includes('*')) return;
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
        const featureSections = groupFeaturesBySection(featureRows);
        return <Form id="worker-form">
              {/* Header avec gradient orange */}
              <Paper sx={{
            background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
            color: '#fff',
            p: 2,
            mb: 2,
            borderRadius: 2
          }}>
                <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={avatarPreview || w.avatar || undefined} sx={{
                  width: 56,
                  height: 56,
                  border: '3px solid #fff'
                }} />
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {w.firstName} {w.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{
                    opacity: 0.9
                  }}>
                        {w.email}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {accountFromApi && !accountFromApi.initPassword && <Chip label={t('Invitation Pending')} size="small" sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white !important',
                  fontWeight: 600
                }} />}
                    {w.workerTypeOwner && <Chip label={t('is Owner')} size="small" sx={{
                  bgcolor: 'rgba(255,255,255,0.3)',
                  color: 'white !important',
                  fontWeight: 600
                }} />}
                    {w.banned && <Chip label={t('Banned')} size="small" sx={{
                  bgcolor: '#d32f2f',
                  color: 'white !important',
                  fontWeight: 600
                }} />}
                  </Stack>
                </Stack>
              </Paper>

              {/* Tabs Navigation */}
              <Paper sx={{
            mb: 2
          }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth" sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem'
              },
              '& .Mui-selected': {
                color: SOJORI_COLORS.primary
              },
              '& .MuiTabs-indicator': {
                bgcolor: SOJORI_COLORS.primary,
                height: 3
              }
            }}>
                  <Tab label={t('Informations')} />
                  <Tab label={t('Annonces')} />
                  <Tab label={t('Permissions')} />
                  <Tab label={t('Notifications')} />
                </Tabs>
              </Paper>

              {/* TAB 0: Informations */}
              <TabPanel value={activeTab} index={0}>
                <Paper variant="outlined" sx={{
              p: 2
            }}>
                  <Grid container spacing={2}>
                    {/* Avatar Upload */}
                    <Grid item xs={12}>
                      <Stack alignItems="center" spacing={1}>
                        <Avatar src={avatarPreview || w.avatar || undefined} sx={{
                      width: 100,
                      height: 100,
                      cursor: 'pointer'
                    }} component="label">
                          <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
                        </Avatar>
                        <Button size="small" component="label">
                          {t('Change Avatar')}
                          <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
                        </Button>
                      </Stack>
                    </Grid>

                    {/* Grid 2 colonnes compact */}
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label={t('First Name')} name="worker.firstName" value={w.firstName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.firstName')} helperText={he('worker.firstName')} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label={t('Last Name')} name="worker.lastName" value={w.lastName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.lastName')} helperText={he('worker.lastName')} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Email" name="worker.email" value={w.email || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.email')} helperText={he('worker.email')} fullWidth disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label={t('phone')} name="worker.phone" value={w.phone || ''} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Whatsapp" name="worker.whatsapp" value={w.whatsapp || ''} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Title" name="worker.title" value={w.title || ''} onChange={handleChange} fullWidth />
                    </Grid>

                    {/* Address fields */}
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Address" name="worker.address" value={w.address || ''} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Postal Code" name="worker.postalCode" value={w.postalCode || ''} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="City" name="worker.city" value={w.city || ''} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField size="small" label="Country" name="worker.country" value={w.country || ''} onChange={handleChange} fullWidth />
                    </Grid>

                    {/* Switches pour isOwner et banned */}
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel control={<Switch checked={!!w.workerTypeOwner} onChange={(_, val) => {
                    setFieldValue('worker.workerTypeOwner', val);
                    if (!val) {
                      setFieldValue('worker.contractType', '');
                      setFieldValue('worker.commission', 0);
                    }
                  }} sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: SOJORI_COLORS.primary
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: SOJORI_COLORS.primary
                    }
                  }} />} label={t('is Owner')} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel control={<Switch checked={!!w.banned} onChange={(_, v) => setFieldValue('worker.banned', v)} sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#d32f2f'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#d32f2f'
                    }
                  }} />} label={t('Banned')} />
                    </Grid>

                    {/* Contract type + Commission (si owner) */}
                    {w.workerTypeOwner && <>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>{t('Contract type')}</InputLabel>
                            <Select label={t('Contract type')} name="worker.contractType" value={w.contractType || ''} onChange={e => {
                        const val = e.target.value;
                        setFieldValue('worker.contractType', val);
                        if (val === 'FIXED FEE') {
                          setFieldValue('worker.commission', 0);
                        }
                      }} error={Boolean(touched.worker?.contractType && errors.worker?.contractType)}>
                              <MenuItem value="GROSS REVENUE">
                                GROSS REVENUE
                              </MenuItem>
                              <MenuItem value="NET REVENUE">NET REVENUE</MenuItem>
                              <MenuItem value="NET-NET">NET-NET</MenuItem>
                              <MenuItem value="FIXED FEE">FIXED FEE</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField size="small" label={t('Commission (%)')} name="worker.commission" type="number" value={w.commission ?? 0} onChange={e => setFieldValue('worker.commission', e.target.value)} fullWidth InputProps={{
                      min: 0,
                      max: 100,
                      step: '5',
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }} disabled={w.contractType === 'FIXED FEE'} error={Boolean(touched.worker?.commission && errors.worker?.commission)} helperText={touched.worker?.commission && errors.worker?.commission ? errors.worker.commission : ''} />
                        </Grid>
                      </>}
                  </Grid>
                </Paper>
              </TabPanel>

              {/* TAB 1: Annonces */}
              <TabPanel value={activeTab} index={1}>
                <Paper variant="outlined" sx={{
              p: 2
            }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
                mb: 2
              }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('Listings access')}
                      </Typography>
                      <Tooltip title={t('Choose which listings this worker can access')}>
                        <InfoOutlinedIcon sx={{
                      fontSize: 18,
                      color: 'text.secondary'
                    }} />
                      </Tooltip>
                      {w.listingIds?.includes('*') || w.isOwnerAdmin || w.ownerAccess ? <Chip size="small" label={t('All listings (admin)')} sx={{
                    bgcolor: SOJORI_COLORS.primary,
                    color: 'white !important'
                  }} /> : null}
                    </Stack>

                    {w.isOwnerAdmin || w.listingIds?.includes('*') ? <Button size="small" disabled>
                        {t('All selected')}
                      </Button> : isAllSelected ? <Button size="small" onClick={unselectAllOnPage} sx={{
                  bgcolor: SOJORI_COLORS.gray[300],
                  color: SOJORI_COLORS.gray[700],
                  '&:hover': {
                    bgcolor: SOJORI_COLORS.gray[400]
                  }
                }}>
                        {t('Unselect all')}
                      </Button> : <Button size="small" onClick={selectAllOnPage} sx={{
                  bgcolor: SOJORI_COLORS.primary,
                  color: 'white !important',
                  '&:hover': {
                    bgcolor: SOJORI_COLORS.primaryDark
                  }
                }}>
                        {t('Select all')}
                      </Button>}
                  </Stack>

                  <Box sx={{
                mb: 2
              }}>
                    <TextField size="small" fullWidth placeholder={t('Type to search listings')} value={listingSearch} onChange={e => {
                  setListingSearch(e.target.value);
                  setListingsPage(0);
                }} />
                  </Box>

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
                    borderColor: selected ? SOJORI_COLORS.primary : 'divider',
                    borderRadius: 2,
                    cursor: w.isOwnerAdmin || w.listingIds?.includes('*') ? 'not-allowed' : 'pointer'
                  }} onClick={() => toggleListing(l._id)}>
                            <Box sx={{
                      height: 120,
                      backgroundImage: `url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} />
                            <Box sx={{
                      p: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                              <Box>
                                <Typography variant="subtitle2" sx={{
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}>
                                  {l.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {l?.propertyUnit}
                                </Typography>
                              </Box>
                              <Box>
                                {selected ? <CheckBoxIcon sx={{
                          color: SOJORI_COLORS.primary
                        }} /> : <CheckBoxOutlineBlankIcon color="disabled" />}
                              </Box>
                            </Box>
                          </Paper>;
                })}
                  </Box>

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
              </TabPanel>

              {/* TAB 2: Permissions (avec Accordions) */}
              <TabPanel value={activeTab} index={2}>
                <Paper variant="outlined" sx={{
              p: 2
            }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
                mb: 2
              }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t('Access permissions')}
                    </Typography>
                    <Autocomplete multiple size="small" options={[ADMIN_OPT, ...groups]} getOptionLabel={o => o?.name || ''} isOptionEqualToValue={(opt, val) => String(opt?._id) === String(val?._id)} value={selectedGroupOptions(w)} onChange={handleGroupsChange(w, setFieldValue, groups)} disableCloseOnSelect renderTags={(value, getTagProps) => value.map((opt, index) => <Chip {...getTagProps({
                  index
                })} key={opt._id} label={opt.name} size="small" />)} renderInput={params => <TextField {...params} label="Groups & roles" placeholder="Select groups..." size="small" />} sx={{
                  minWidth: 320
                }} />
                  </Stack>

                  {/* Switch Admin complet */}
                  <Box sx={{
                mb: 2
              }}>
                    <FormControlLabel control={<Switch checked={!!w.isOwnerAdmin || isWildcardGrants(w.featureGrants)} disabled sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: SOJORI_COLORS.primary
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    bgcolor: SOJORI_COLORS.primary
                  }
                }} />} label={<Typography variant="body2" fontWeight={600}>
                          {t('Admin complet (all permissions)')}
                        </Typography>} />
                  </Box>

                  {/* Accordions par section */}
                  {Object.entries(featureSections).map(([sectionName, features]) => <Accordion key={sectionName} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
                  bgcolor: SOJORI_COLORS.gray[50],
                  '& .MuiAccordionSummary-content': {
                    my: 0.5
                  }
                }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {sectionName}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{
                  p: 1
                }}>
                          {features.map((row, idx) => {
                    const allowed = new Set(row.allowedActions || ACTIONS.map(a => a.key));
                    const supportedKeys = ACTIONS.map(a => a.key).filter(k => allowed.has(k));
                    const allChecked = supportedKeys.length > 0 && supportedKeys.every(k => hasAction(w.featureGrants, row.featureKey, k));
                    const someChecked = supportedKeys.some(k => hasAction(w.featureGrants, row.featureKey, k));
                    return <Box key={`feat-${row.featureKey}-${idx}`} sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      py: 0.5
                    }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" sx={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          pl: row.indent ? 2 : 0
                        }}>
                                    {row.label}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5}>
                                    {ACTIONS.map(a => {
                            const supported = allowed.has(a.key);
                            return <Box key={a.key}>
                                          {supported ? <FormControlLabel control={<Checkbox size="small" checked={hasAction(w.featureGrants, row.featureKey, a.key)} disabled={!!w.isOwnerAdmin} onChange={(_, v) => setFieldValue('worker.featureGrants', setAction(w.featureGrants, row.featureKey, a.key, v))} sx={{
                                '&.Mui-checked': {
                                  color: SOJORI_COLORS.primary
                                }
                              }} />} label={<Typography variant="caption" sx={{
                                fontSize: '0.7rem'
                              }}>
                                                  {a.label}
                                                </Typography>} sx={{
                                mr: 0
                              }} /> : null}
                                        </Box>;
                          })}
                                    <FormControlLabel control={<Checkbox size="small" checked={allChecked} indeterminate={!allChecked && someChecked} disabled={!!w.isOwnerAdmin || supportedKeys.length === 0} onChange={(_, v) => setFieldValue('worker.featureGrants', setRowAllLimited(w.featureGrants, row.featureKey, v, supportedKeys))} sx={{
                            '&.Mui-checked': {
                              color: SOJORI_COLORS.primary
                            }
                          }} />} label={<Typography variant="caption" sx={{
                            fontSize: '0.7rem',
                            color: 'text.secondary'
                          }}>
                                          All
                                        </Typography>} sx={{
                            mr: 0
                          }} />
                                  </Stack>
                                </Stack>
                              </Box>;
                  })}
                        </AccordionDetails>
                      </Accordion>)}
                </Paper>
              </TabPanel>

              {/* TAB 3: Notifications (avec Accordions) */}
              <TabPanel value={activeTab} index={3}>
                <Paper variant="outlined" sx={{
              p: 2
            }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{
                mb: 2
              }}>
                    {t('Notifications')}
                  </Typography>

                  {Object.entries(groupEventsByCategory(NOTIFICATION_EVENTS)).map(([category, evts]) => <Accordion key={category} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
                  bgcolor: SOJORI_COLORS.gray[50],
                  '& .MuiAccordionSummary-content': {
                    my: 0.5
                  }
                }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {t(category.charAt(0).toUpperCase() + category.slice(1))}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{
                  p: 1
                }}>
                          <Grid container spacing={1}>
                            {evts.map(ev => <Grid item xs={12} sm={6} md={4} key={ev.id}>
                                <FormControlLabel control={<Checkbox size="small" checked={notifIsOn(w.notificationConfig, ev.key, 'dashboard', ev.defaultChannels)} onChange={(_, v) => setFieldValue('worker.notificationConfig', notifSet(w.notificationConfig, ev.key, 'dashboard', v, ev.defaultChannels))} sx={{
                        '&.Mui-checked': {
                          color: SOJORI_COLORS.primary
                        }
                      }} />} label={<Typography variant="body2" sx={{
                        fontSize: '0.75rem'
                      }}>
                                      {t(ev.name)}
                                    </Typography>} />
                              </Grid>)}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>)}
                </Paper>
              </TabPanel>

              {/* Footer buttons */}
              <Stack direction="row" spacing={1} sx={{
            mt: 2
          }} justifyContent="flex-end">
                <Button variant="contained" onClick={() => navigate(-1)} sx={{
              bgcolor: SOJORI_COLORS.gray[300],
              color: SOJORI_COLORS.gray[700],
              '&:hover': {
                bgcolor: SOJORI_COLORS.gray[400]
              },
              textTransform: 'none'
            }}>
                  {t('Cancel')}
                </Button>
                <Button variant="contained" onClick={() => document.getElementById('worker-form')?.requestSubmit()} sx={{
              bgcolor: SOJORI_COLORS.primary,
              color: 'white !important',
              '&:hover': {
                bgcolor: SOJORI_COLORS.primaryDark
              },
              textTransform: 'none'
            }}>
                  {t('Save')}
                </Button>
              </Stack>
            </Form>;
      }}
      </Formik>
    </Container>;
}
