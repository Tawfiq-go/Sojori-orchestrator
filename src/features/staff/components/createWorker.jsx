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
import { getNotificationEvent, getGroups, inviteWorker, getCities } from '../services/serverApi.task';
import { uploadImageToAPI } from '../../../redux/slices/UploadSlice';
import { btnPrimarySx } from '../../../components/dashboard/DashboardV2.components';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { errorWorkerCreate, logWorkerCreate, warnWorkerCreate } from '../../../utils/workerCreateDebug';
import {
  WORKER_FORM_SECTIONS,
  WorkerFormPage,
  WorkerFormHeader,
  WorkerFormLayout,
  WorkerFormSection,
  WorkerFormNav,
  WorkerFormActions,
  WorkerListingPicker,
  WorkerDashboardAccessPanel,
  WorkerNotificationsPanel,
  buildAllNotificationsConfig,
  isWildcardGrants,
  workerTextFieldSx,
  WF,
} from './workerFormDesign';
import WorkerCredentialsDialog from './WorkerCredentialsDialog';

const CONTRACT_TYPES = ['GROSS REVENUE', 'NET REVENUE', 'NET-NET', 'FIXED FEE'];
const fieldSx = workerTextFieldSx();

const ACTIONS = [
  { key: 'get', label: 'Lecture' },
  { key: 'update', label: 'Écriture' },
  { key: 'create', label: 'Création' },
  { key: 'delete', label: 'Suppression' },
];
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
  isOwnerAdmin: false,
  workerTypeOwner: false,
  featureGrants: [],
  groupIds: [],
  listingIds: [],
  listingCityIds: [],
  ownerAccess: false,
  notificationsAll: false,
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
  const { requestOwnerId: filterOwnerId } = useAdminOwnerFilter();
  const isPlatformAdmin = hasAdminAccess(user?.role);
  const ownerIdFromAuth =
    user?.ownerId ||
    (user?.role === 'Owner' ? user?._id : null) ||
    (isPlatformAdmin && filterOwnerId ? filterOwnerId : null);
  const [active, setActive] = useState(WORKER_FORM_SECTIONS[0].id);
  const [groups, setGroups] = useState([]);
  const [NOTIFICATION_EVENTS, setNOTIFICATION_EVENTS] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsLimit, setListingsLimit] = useState(25);
  const [listingSearch, setListingSearch] = useState('');
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [listingLabels, setListingLabels] = useState({});
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [missingPermission, setMissingPermission] = useState(false);
  const [missingFlags, setMissingFlags] = useState({
    listings: false,
    grants: false
  });
  const [credentialsDialog, setCredentialsDialog] = useState(null);
  const formikRef = React.useRef(null);
  const staging = JSON.parse(localStorage.getItem('isStaging')) || false;

  useEffect(() => {
    logWorkerCreate('mount:auth-context', {
      userRole: user?.role,
      userId: user?._id ? String(user._id) : null,
      userEmail: user?.email,
      ownerIdFromAuth: ownerIdFromAuth ? String(ownerIdFromAuth) : null,
      filterOwnerId: filterOwnerId ? String(filterOwnerId) : null,
      isPlatformAdmin,
    });
  }, [user, ownerIdFromAuth, filterOwnerId, isPlatformAdmin]);

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

  useEffect(() => {
    setCitiesLoading(true);
    getCities({ paged: false, limit: 300 })
      .then((rows) => setCities(Array.isArray(rows) ? rows : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);

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
          setListingLabels((prev) => {
            const next = { ...prev };
            (result?.data?.data || []).forEach((l) => {
              if (l?._id) next[String(l._id)] = l.name || next[String(l._id)];
            });
            return next;
          });
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
    WORKER_FORM_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  const consumeApiError = (error, setFieldError) => {
    const data = error?.response?.data;
    errorWorkerCreate('invite:api-error', {
      status: error?.response?.status,
      error: data?.error,
      message: data?.message,
      forceLogout: data?.forceLogout,
      url: error?.config?.url,
      response: data,
    });
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
      let msg = data?.message || data?.error || error?.message || 'Failed to save';
      if (data?.error === 'Email already in use') {
        if (data?.existingRole === 'Owner') {
          msg =
            'Cet email est déjà un compte Owner (Property manager). Un worker doit avoir un email différent — ex. t.gouach@kaalix.com';
        } else if (data?.existingRole === 'Worker') {
          msg = 'Cet email est déjà utilisé par un worker existant.';
        } else if (data?.existingRole) {
          msg = `Cet email est déjà utilisé (compte ${data.existingRole}).`;
        } else {
          msg =
            'Cet email est déjà enregistré (souvent un compte Owner). Utilisez un email distinct pour le worker.';
        }
      }
      toast.error(msg);
      if (data?.error === 'Email already in use' && setFieldError) {
        setFieldError('worker.email', msg);
      }
      if (data?.error === 'owner is required' && setFieldError) {
        toast.error(t('Select a property manager (owner) in the top bar before inviting'));
      }
    }
  };
  const normalizePhone = (val = '') => (val || '').replace(/[^\d+]/g, '');
  const openCredentialsFromInvite = (inviteRes) => {
    const d = inviteRes?.data || {};
    if (d.temporaryPassword) {
      setCredentialsDialog({
        email: d.email,
        temporaryPassword: d.temporaryPassword,
        loginUrl: d.loginUrl,
        emailSent: !!d.emailSent,
        emailError: d.emailError,
      });
      return;
    }
    navigate('/admin/equipe?tab=worker', { replace: true });
  };
  const closeCredentialsDialog = () => {
    setCredentialsDialog(null);
    navigate('/admin/equipe?tab=worker', { replace: true });
  };
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
        _previousNotificationConfig,
        ...payload
      } = values.worker || {};
      payload.groupIds = Array.isArray(payload.groupIds) ? payload.groupIds : [];
      payload.listingIds = Array.isArray(payload.listingIds) ? payload.listingIds : [];
      payload.listingCityIds = Array.isArray(payload.listingCityIds) ? payload.listingCityIds : [];
      payload.featureGrants = Array.isArray(payload.featureGrants) ? payload.featureGrants : [];
      payload.phone = payload.phone?.trim() ? normalizePhone(payload.phone) : null;
      payload.whatsapp = payload.whatsapp?.trim() ? normalizePhone(payload.whatsapp) : null;
      if (payload.notificationsAll) {
        payload.notificationConfig = buildAllNotificationsConfig(NOTIFICATION_EVENTS, 'dashboard');
      }
      delete payload.address;
      delete payload.postalCode;
      delete payload.city;
      delete payload.country;
      delete payload.timezone;
      delete payload.noteBeforeContact;
      delete payload._previousNotificationConfig;
      const listingsMissing =
        !payload.ownerAccess &&
        payload.listingIds.length === 0 &&
        payload.listingCityIds.length === 0;
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
      payload.workerTypeOwner = !!payload.workerTypeOwner;
      if (isPlatformAdmin) {
        if (!ownerIdFromAuth) {
          warnWorkerCreate('invite:blocked-no-owner', {
            userRole: user?.role,
            filterOwnerId: filterOwnerId ? String(filterOwnerId) : null,
          });
          toast.error(t('Select a property manager (owner) before inviting a worker'));
          return;
        }
        payload.ownerId = String(ownerIdFromAuth);
      }
      logWorkerCreate('invite:request', {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        workerTypeOwner: payload.workerTypeOwner,
        ownerIdInPayload: payload.ownerId ? String(payload.ownerId) : null,
        effectiveOwnerId: ownerIdFromAuth ? String(ownerIdFromAuth) : null,
        ownerAccess: !!payload.ownerAccess,
        listingCityIds: payload.listingCityIds,
        listingIdsCount: payload.listingIds?.length ?? 0,
        featureGrantsCount: payload.featureGrants?.length ?? 0,
        groupIdsCount: payload.groupIds?.length ?? 0,
        notificationsAll: !!payload.notificationsAll,
        callerRole: user?.role,
      });
      const inviteRes = await inviteWorker(payload);
      logWorkerCreate('invite:success', {
        status: inviteRes?.status,
        data: inviteRes?.data,
      });
      toast.success(t('saved'));
      openCredentialsFromInvite(inviteRes);
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
        _previousNotificationConfig,
        ...payload
      } = values.worker || {};
      payload.groupIds = Array.isArray(payload.groupIds) ? payload.groupIds : [];
      payload.listingIds = Array.isArray(payload.listingIds) ? payload.listingIds : [];
      payload.listingCityIds = Array.isArray(payload.listingCityIds) ? payload.listingCityIds : [];
      payload.featureGrants = Array.isArray(payload.featureGrants) ? payload.featureGrants : [];
      payload.phone = payload.phone?.trim() ? normalizePhone(payload.phone) : null;
      payload.whatsapp = payload.whatsapp?.trim() ? normalizePhone(payload.whatsapp) : null;
      if (payload.notificationsAll) {
        payload.notificationConfig = buildAllNotificationsConfig(NOTIFICATION_EVENTS, 'dashboard');
      }
      delete payload.address;
      delete payload.postalCode;
      delete payload.city;
      delete payload.country;
      delete payload.timezone;
      delete payload.noteBeforeContact;
      delete payload._previousNotificationConfig;
      setMissingPermission(false);
      if (!payload.workerTypeOwner) {
        payload.contractType = '';
        payload.commission = 0;
      }
      payload.workerTypeOwner = !!payload.workerTypeOwner;
      if (isPlatformAdmin) {
        if (!ownerIdFromAuth) {
          warnWorkerCreate('invite:blocked-no-owner', {
            userRole: user?.role,
            filterOwnerId: filterOwnerId ? String(filterOwnerId) : null,
          });
          toast.error(t('Select a property manager (owner) before inviting a worker'));
          return;
        }
        payload.ownerId = String(ownerIdFromAuth);
      }
      logWorkerCreate('invite:request', {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        workerTypeOwner: payload.workerTypeOwner,
        ownerIdInPayload: payload.ownerId ? String(payload.ownerId) : null,
        effectiveOwnerId: ownerIdFromAuth ? String(ownerIdFromAuth) : null,
        ownerAccess: !!payload.ownerAccess,
        listingCityIds: payload.listingCityIds,
        listingIdsCount: payload.listingIds?.length ?? 0,
        featureGrantsCount: payload.featureGrants?.length ?? 0,
        groupIdsCount: payload.groupIds?.length ?? 0,
        notificationsAll: !!payload.notificationsAll,
        callerRole: user?.role,
      });
      const inviteRes = await inviteWorker(payload);
      logWorkerCreate('invite:success', {
        status: inviteRes?.status,
        data: inviteRes?.data,
      });
      toast.success(t('saved'));
      setMissingPermission(false);
      openCredentialsFromInvite(inviteRes);
    } catch (err) {
      consumeApiError(err, formikRef.current?.setFieldError);
    }
  };
  const jumpSection = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <WorkerFormPage>
      <ToastContainer position="top-right" autoClose={3000} />
      <WorkerFormHeader
        title="Nouveau worker"
        onBack={() => navigate(-1)}
        onCancel={() => navigate(-1)}
        onSave={() => document.getElementById('worker-form-create')?.requestSubmit()}
        saveLabel={t('Save')}
      />

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
            const listingAccessDisabled = w.isOwnerAdmin || w.listingIds?.includes('*') || w.ownerAccess;
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
              if (listingAccessDisabled) return;
              const current = Array.isArray(w.listingIds) ? w.listingIds.map(String) : [];
              const sid = String(id);
              const exists = current.includes(sid);
              const next = exists ? current.filter(x => x !== sid) : [...current, sid];
              setFieldValue('worker.listingIds', next);
              const row = listings.find((l) => String(l._id) === sid);
              if (row?.name) {
                setListingLabels((prev) => ({ ...prev, [sid]: row.name }));
              }
            };
            const removeListing = (id) => {
              const sid = String(id);
              setFieldValue(
                'worker.listingIds',
                (Array.isArray(w.listingIds) ? w.listingIds : []).map(String).filter((x) => x !== sid),
              );
            };
            const toggleCity = async (cityId) => {
              if (listingAccessDisabled) return;
              const cid = String(cityId);
              const current = Array.isArray(w.listingCityIds) ? w.listingCityIds.map(String) : [];
              if (current.includes(cid)) {
                logWorkerCreate('city:unchecked', { cityId: cid });
                setFieldValue('worker.listingCityIds', current.filter((x) => x !== cid));
                return;
              }
              logWorkerCreate('city:fetch-listings', {
                cityId: cid,
                ownerIdFromAuth: ownerIdFromAuth ? String(ownerIdFromAuth) : null,
                staging,
              });
              try {
                const result = await getListings({
                  page: 0,
                  limit: 500,
                  cityId: [cid],
                  staging,
                  useActiveFilter: true,
                  active: true,
                  compact: true,
                });
                const body = result?.data;
                const rows = Array.isArray(body?.data) ? body.data : [];
                logWorkerCreate('city:fetch-listings:ok', {
                  cityId: cid,
                  total: body?.total ?? rows.length,
                  listingCount: rows.length,
                  sampleIds: rows.slice(0, 5).map((l) => String(l._id)),
                });
                const idsInCity = new Set(rows.map((l) => String(l._id)));
                setFieldValue('worker.listingCityIds', [...current, cid]);
                setFieldValue(
                  'worker.listingIds',
                  (Array.isArray(w.listingIds) ? w.listingIds : [])
                    .map(String)
                    .filter((id) => !idsInCity.has(id)),
                );
                setListingLabels((prev) => {
                  const next = { ...prev };
                  rows.forEach((l) => {
                    if (l?._id) next[String(l._id)] = l.name;
                  });
                  return next;
                });
                if (rows.length === 0) {
                  warnWorkerCreate('city:no-listings-for-owner', {
                    cityId: cid,
                    hint: 'Ville cochée mais 0 annonce pour ce owner (normal si parc vide dans cette ville)',
                  });
                }
              } catch (err) {
                errorWorkerCreate('city:fetch-listings:fail', {
                  cityId: cid,
                  status: err?.response?.status,
                  error: err?.response?.data?.error || err?.response?.data?.message,
                  message: err?.message,
                });
                setFieldValue('worker.listingCityIds', [...current, cid]);
              }
            };
            const removeCity = (cityId) => {
              const cid = String(cityId);
              setFieldValue(
                'worker.listingCityIds',
                (Array.isArray(w.listingCityIds) ? w.listingCityIds : []).map(String).filter((x) => x !== cid),
              );
            };
            const te = path => Boolean(path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, touched) && path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, errors));
            const he = path => path.split('.').reduce((a, k) => a && a[k] !== undefined ? a[k] : undefined, errors) || '';
            const handleGroupsChange = (_, options) => {
              const wasAdmin = !!w.isOwnerAdmin || isWildcardGrants(w.featureGrants);
              const base = wasAdmin ? w._previousFeatureGrants || [] : w.featureGrants || [];
              setFieldValue('worker.isOwnerAdmin', false);
              setFieldValue('worker.ownerAccess', false);
              setFieldValue('worker._previousFeatureGrants', []);
              const pickedIds = options.map((o) => String(o._id));
              setFieldValue('worker.groupIds', pickedIds);
              const byId = new Map((groups || []).map((g) => [String(g._id), g]));
              const selected = pickedIds.map((id) => byId.get(id)).filter(Boolean);
              const selectedGroupGrants = selected.map((g) => g.featureGrants || []);
              const { next, overlay } = mergeGrants({
                current: base,
                selectedGroups: selectedGroupGrants,
                prevOverlay: w._groupGrants || [],
              });
              setFieldValue('worker.featureGrants', next);
              setFieldValue('worker._groupGrants', overlay);
            };
            return (
              <Form id="worker-form-create">
                <WorkerFormLayout
                  main={
                    <>
                  <WorkerFormSection id="basic-info" icon="👤" title="Identité" hint="Nom, email et contacts du collaborateur">
                    <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label={t('First Name')} name="worker.firstName" value={w.firstName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.firstName')} helperText={he('worker.firstName')} fullWidth />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label={t('Last Name')} name="worker.lastName" value={w.lastName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.lastName')} helperText={he('worker.lastName')} fullWidth />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label="Email" name="worker.email" value={w.email || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.email')} helperText={he('worker.email')} fullWidth />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label={t('Phone')} name="worker.phone" value={w.phone || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.phone', normalizePhone(e.target.value))} error={te('worker.phone')} helperText={he('worker.phone')} fullWidth />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label={t('Whatsapp')} name="worker.whatsapp" value={w.whatsapp || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.whatsapp', normalizePhone(e.target.value))} error={te('worker.whatsapp')} helperText={he('worker.whatsapp')} fullWidth />
                          </Grid>
                          {w.workerTypeOwner && <>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField sx={fieldSx} select label={t('Contract type')} name="worker.contractType" value={w.contractType || ''} onChange={e => {
                            const val = e.target.value;
                            setFieldValue('worker.contractType', val);
                            if (val === 'FIXED FEE') {
                              setFieldValue('worker.commission', 0);
                            }
                          }} error={te('worker.contractType')} helperText={he('worker.contractType')} fullWidth>
                                  {CONTRACT_TYPES.map(opt => <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>)}
                                </TextField>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField sx={fieldSx} label={t('Commission (%)')} name="worker.commission" type="number" value={w.commission ?? 0} onChange={e => {
                            const val = e.target.value;
                            setFieldValue('worker.commission', val === '' ? '' : Number(val));
                          }} InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }} inputProps={{ min: 0, max: 100, step: '5' }} disabled={w.contractType === 'FIXED FEE'}
                          error={te('worker.commission')} helperText={w.contractType === 'FIXED FEE' ? t('Commission not required for fixed fee') : he('worker.commission')} fullWidth />
                              </Grid>
                            </>}
                    </Grid>
                  </WorkerFormSection>

                  <WorkerFormSection
                    id="listings-access"
                    icon="🏠"
                    title="Accès annonces"
                    hint="Par ville (toutes les annonces) ou annonce par annonce — sélections affichées en pastilles"
                  >
                    <WorkerListingPicker
                      cities={cities}
                      citiesLoading={citiesLoading}
                      selectedCityIds={w.listingCityIds}
                      onToggleCity={toggleCity}
                      onRemoveCity={removeCity}
                      listings={listings}
                      loading={listingsLoading}
                      selectedIds={w.listingIds}
                      listingLabels={listingLabels}
                      disabled={listingAccessDisabled}
                      search={listingSearch}
                      onSearchChange={(v) => {
                        setListingSearch(v);
                        setListingsPage(0);
                      }}
                      onToggle={toggleListing}
                      onRemoveListing={removeListing}
                      page={listingsPage}
                      total={listingsTotal}
                      limit={listingsLimit}
                      onPrev={() => setListingsPage((p) => p - 1)}
                      onNext={() => setListingsPage((p) => p + 1)}
                      t={t}
                    />
                  </WorkerFormSection>

                  <WorkerFormSection
                    id="access-permissions"
                    icon="🔐"
                    title="Accès dashboard"
                    hint="Admin complet ou toggles par section sidebar (ex. Réservations → Liste, Planning…)"
                  >
                    <WorkerDashboardAccessPanel
                      worker={w}
                      setFieldValue={setFieldValue}
                      grants={w.featureGrants}
                      onGrantsChange={(next) => setFieldValue('worker.featureGrants', next)}
                    />
                  </WorkerFormSection>

                  <WorkerFormSection id="notifications" icon="🔔" title="Notifications" hint="Toutes les alertes ou sélection directe par événement">
                    <WorkerNotificationsPanel
                      events={NOTIFICATION_EVENTS}
                      config={w.notificationConfig}
                      notificationsAll={!!w.notificationsAll}
                      onNotificationsAllChange={(on) => {
                        if (on) {
                          if (!w.notificationsAll) {
                            setFieldValue('worker._previousNotificationConfig', w.notificationConfig || []);
                          }
                          setFieldValue('worker.notificationsAll', true);
                          setFieldValue(
                            'worker.notificationConfig',
                            buildAllNotificationsConfig(NOTIFICATION_EVENTS, 'dashboard'),
                          );
                          return;
                        }
                        setFieldValue('worker.notificationsAll', false);
                        setFieldValue(
                          'worker.notificationConfig',
                          w._previousNotificationConfig || [],
                        );
                        setFieldValue('worker._previousNotificationConfig', []);
                      }}
                      isOn={(key, ch, defaults) => notifIsOn(w.notificationConfig, key, ch, defaults)}
                      onToggle={(key, ch, v, defaults) =>
                        setFieldValue(
                          'worker.notificationConfig',
                          notifSet(w.notificationConfig, key, ch, v, defaults),
                        )
                      }
                      t={t}
                    />
                  </WorkerFormSection>

                  <WorkerFormActions
                    onCancel={() => navigate(-1)}
                    onSave={() => document.getElementById('worker-form-create')?.requestSubmit()}
                    saveLabel={t('Save')}
                  />
                    </>
                  }
                  nav={
                    <WorkerFormNav
                      sections={WORKER_FORM_SECTIONS}
                      activeId={active}
                      onJump={jumpSection}
                    />
                  }
                />
              </Form>
            );
          }}
          </Formik>

      <Dialog
        open={missingPermission}
        onClose={() => setMissingPermission(false)}
        PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${WF.border}` } }}
      >
        <DialogTitle id="missing-fields-title">
          {t('Missing access')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="missing-fields-desc" className="m-4">
            {missingFlags.listings && missingFlags.grants ? t('This worker has no listing access and no permissions.') : missingFlags.listings ? t('This worker has no listing access.') : t('This worker has no permissions.')}{' '}
            {t('You can add them now, or continue anyway.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={handleAddMissing} sx={{ textTransform: 'none', fontWeight: 600, color: WF.primaryDeep }}>
            {t('Add missing')}
          </Button>
          <Button onClick={handleCreateAnyway} variant="contained" sx={{ ...btnPrimarySx, textTransform: 'none' }}>
            {t('Create anyway')}
          </Button>
        </DialogActions>
      </Dialog>

      <WorkerCredentialsDialog
        open={!!credentialsDialog}
        onClose={closeCredentialsDialog}
        {...(credentialsDialog || {})}
      />
    </WorkerFormPage>
  );
}
