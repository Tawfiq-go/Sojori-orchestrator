import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, TextField, Stack, Checkbox, FormControlLabel, Chip, Switch, MenuItem, InputAdornment, Button, CircularProgress, Alert } from '@mui/material';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { Trash2 } from 'lucide-react';
import Autocomplete from '@mui/material/Autocomplete';
import { getListings } from '../../listing/services/serverApi.listing';
import { useTranslation } from 'react-i18next';
import { Formik, Form } from 'formik';
import { getAccounById, getNotificationEvent, updateWorker, getGroups, getCities, resendWorkerCredentials, deleteWorker } from '../services/serverApi.task';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  isNotificationsAllMode,
  isWildcardGrants,
  workerTextFieldSx,
  WF,
} from './workerFormDesign';
import WorkerPasswordDialog from './WorkerPasswordDialog';
import DeleteUserDialog from './DeleteUserDialog';

const CONTRACT_TYPES = ['GROSS REVENUE', 'NET REVENUE', 'NET-NET', 'FIXED FEE'];
const fieldSx = workerTextFieldSx();
const ACTIONS = [
  { key: 'get', label: 'Lecture' },
  { key: 'update', label: 'Écriture' },
  { key: 'create', label: 'Création' },
  { key: 'delete', label: 'Suppression' },
];
const ADMIN_OPT = {
  _id: '__ADMIN__',
  name: 'Admin-level access',
};
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
  listingCityIds: [],
  ownerAccess: false,
  notificationsAll: false,
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
    groupIds: Array.isArray(account.groupIds)
      ? account.groupIds.map((id) => String(typeof id === 'object' && id ? id._id || id : id))
      : [],
    listingIds: Array.isArray(account.listingIds)
      ? account.listingIds.map((id) => String(typeof id === 'object' && id ? id._id || id : id))
      : [],
    listingCityIds: Array.isArray(account.listingCityIds)
      ? account.listingCityIds.map((id) => String(typeof id === 'object' && id ? id._id || id : id))
      : [],
    ownerAccess: !!account.ownerAccess,
    notificationsAll: !!account.notificationsAll,
    notificationConfig: Array.isArray(account.notificationConfig) ? account.notificationConfig : [],
    workerTypeOwner: !!account.workerTypeOwner,
    contractType: account.contractType || '',
    commission: Number(account.commission ?? 0)
  };
};
export default function WorkerAccessForm() {
  const {
    userId
  } = useParams();
  const navigate = useNavigate();
  const {
    t
  } = useTranslation('common');
  const [active, setActive] = useState(WORKER_FORM_SECTIONS[0].id);
  const [accountFromApi, setAccountFromApi] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [NOTIFICATION_EVENTS, setNOTIFICATION_EVENTS] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsLimit, setListingsLimit] = useState(25);
  const [listingSearch, setListingSearch] = useState('');
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [listingLabels, setListingLabels] = useState({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    setCitiesLoading(true);
    getCities({ paged: false, limit: 300 })
      .then((rows) => setCities(Array.isArray(rows) ? rows : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);
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
    if (!accountFromApi || !NOTIFICATION_EVENTS.length || !formikRef.current) return;
    const all =
      !!accountFromApi.notificationsAll ||
      isNotificationsAllMode(accountFromApi.notificationConfig, NOTIFICATION_EVENTS, 'dashboard');
    formikRef.current.setFieldValue('worker.notificationsAll', all);
  }, [accountFromApi, NOTIFICATION_EVENTS]);
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

  useEffect(() => {
    if (loading) return;
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
  }, [loading, accountFromApi]);

  const initialWorker = useMemo(() => toWorker(accountFromApi), [accountFromApi]);
  const normalizePhone = (val = '') => (val || '').replace(/[^\d+]/g, '');
  const jumpSection = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const updateWorkerFunction = async (values) => {
    if (accountFromApi?.deleted) {
      toast.error(t('Worker is deleted', 'Ce worker est supprimé'));
      return;
    }
    const {
      _previousFeatureGrants,
      _groupGrants,
      _previousNotificationConfig,
      ...payload
    } = values || {};
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
    if (!payload.workerTypeOwner) {
      payload.contractType = '';
      payload.commission = 0;
    }
    try {
      await updateWorker(userId, payload);
      toast.success(t('saved'));
      navigate('/admin/equipe?tab=worker', { replace: true });
    } catch (err) {
      consumeApiError(err, formikRef.current?.setFieldError);
    }
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
  const handleGroupsChange = (w, setFieldValue) => (_, options) => {
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
  const headerSubtitle = accountFromApi
    ? [accountFromApi.firstName, accountFromApi.lastName].filter(Boolean).join(' ') +
      (accountFromApi.email ? ` · ${accountFromApi.email}` : '')
    : undefined;

  const handleOpenPasswordDialog = () => {
    setPasswordResult(null);
    setPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async ({ password, sendEmail = true }) => {
    if (!userId || passwordLoading) return;
    setPasswordLoading(true);
    const trimmed = typeof password === 'string' ? password.trim() : '';
    console.info('[worker-password] api:request', {
      workerId: String(userId),
      manual: !!trimmed,
      passwordLength: trimmed.length,
      sendEmail,
    });
    try {
      const payload = { sendEmail };
      if (trimmed) payload.password = trimmed;
      const res = await resendWorkerCredentials(userId, payload);
      const d = res?.data || {};
      console.info('[worker-password] api:response', {
        success: d.success,
        emailSent: d.emailSent,
        emailError: d.emailError,
        hasTemporaryPassword: !!d.temporaryPassword,
        message: d.message,
      });
      if (d.temporaryPassword) {
        setPasswordResult({
          email: d.email,
          temporaryPassword: d.temporaryPassword,
          loginUrl: d.loginUrl,
          emailSent: !!d.emailSent,
          emailError: d.emailError,
        });
        toast.success(password ? 'Mot de passe enregistré' : d.emailSent ? 'Identifiants renvoyés par email' : 'Nouveau mot de passe généré');
      } else {
        toast.error(d.error || 'Échec de la mise à jour');
      }
    } catch (err) {
      console.error('[worker-password] api:error', {
        status: err?.response?.status,
        error: err?.response?.data?.error,
        message: err?.response?.data?.message,
        errors: err?.response?.data?.errors,
      });
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordResult(null);
  };

  const handleDeleteWorker = async () => {
    if (!userId || deleteLoading || accountFromApi?.deleted) return;
    setDeleteLoading(true);
    try {
      await deleteWorker(userId);
      toast.success(t('Worker deleted', 'Worker supprimé'));
      setDeleteDialogOpen(false);
      navigate('/admin/equipe?tab=worker', { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          t('Failed to delete worker', 'Échec de la suppression'),
      );
      throw err;
    } finally {
      setDeleteLoading(false);
    }
  };

  const workerDisplayName =
    [accountFromApi?.firstName, accountFromApi?.lastName].filter(Boolean).join(' ') ||
    accountFromApi?.email ||
    'ce worker';

  if (loading && !accountFromApi) {
    return (
      <WorkerFormPage>
        <Typography sx={{ color: WF.text3, textAlign: 'center', py: 6 }}>{t('Loading...')}</Typography>
      </WorkerFormPage>
    );
  }

  return (
    <WorkerFormPage>
      <ToastContainer position="top-right" autoClose={3000} />
      <WorkerFormHeader
        title="Modifier le worker"
        subtitle={headerSubtitle}
        onBack={() => navigate(-1)}
        onCancel={() => navigate(-1)}
        onSave={() => document.getElementById('worker-form')?.requestSubmit()}
        saveLabel={t('Save')}
        extraActions={
          <>
            {!accountFromApi?.deleted ? (
              <Button
                variant="outlined"
                color="error"
                disabled={deleteLoading || passwordLoading}
                onClick={() => setDeleteDialogOpen(true)}
                startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={18} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderColor: 'rgba(244,67,54,0.45)',
                  '&:hover': { borderColor: '#F44336', bgcolor: 'rgba(244,67,54,0.06)' },
                }}
              >
                Supprimer
              </Button>
            ) : null}
            <Button
              variant="contained"
              disabled={passwordLoading || deleteLoading || accountFromApi?.deleted}
              onClick={handleOpenPasswordDialog}
              startIcon={passwordLoading ? <CircularProgress size={16} color="inherit" /> : <VpnKeyOutlinedIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: WF.primaryDeep,
                boxShadow: '0 2px 8px rgba(255,96,52,0.35)',
                '&:hover': { bgcolor: WF.primary },
              }}
            >
              Mot de passe / identifiants
            </Button>
          </>
        }
      />

      <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
        {accountFromApi?.deleted ? (
          <>
            Ce worker est <strong>supprimé</strong> — il ne peut plus se connecter. Retrouvez-le via le filtre
            « Supprimés » dans la liste équipe.
          </>
        ) : (
          <>
            Pour définir ou modifier le mot de passe du worker, cliquez sur{' '}
            <strong>Mot de passe / identifiants</strong> — vous pourrez le saisir manuellement ou le générer
            automatiquement.
          </>
        )}
      </Alert>

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
        const listingAccessDisabled = w.isOwnerAdmin || w.listingIds?.includes('*') || w.ownerAccess;
        const toggleListing = id => {
          if (listingAccessDisabled) return;
          const current = Array.isArray(w.listingIds) ? w.listingIds.map(String) : [];
          const sid = String(id);
          const exists = current.includes(sid);
          const next = exists ? current.filter(x => x !== sid) : [...current, sid];
          setFieldValue('worker.listingIds', next);
          const row = listings.find((l) => String(l._id) === sid);
          if (row?.name) setListingLabels((prev) => ({ ...prev, [sid]: row.name }));
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
            setFieldValue('worker.listingCityIds', current.filter((x) => x !== cid));
            return;
          }
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
            const rows = Array.isArray(result?.data?.data) ? result.data.data : [];
            const idsInCity = new Set(rows.map((l) => String(l._id)));
            setFieldValue('worker.listingCityIds', [...current, cid]);
            setFieldValue(
              'worker.listingIds',
              (Array.isArray(w.listingIds) ? w.listingIds : []).map(String).filter((id) => !idsInCity.has(id)),
            );
            setListingLabels((prev) => {
              const next = { ...prev };
              rows.forEach((l) => {
                if (l?._id) next[String(l._id)] = l.name;
              });
              return next;
            });
          } catch {
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
        return (
          <Form id="worker-form">
            <WorkerFormLayout
              main={
                <>
                  <WorkerFormSection id="basic-info" icon="👤" title="Identité" hint="Nom, email et contacts du collaborateur">
                    {(accountFromApi && !accountFromApi.initPassword) || w.banned ? (
                      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                        {accountFromApi && !accountFromApi.initPassword ? (
                          <Chip label={t('Invitation Pending')} size="small" sx={{ fontWeight: 700 }} />
                        ) : null}
                        {w.banned ? (
                          <Chip label={t('Banned')} size="small" color="error" sx={{ fontWeight: 700 }} />
                        ) : null}
                        {accountFromApi?.deleted ? (
                          <Chip label={t('Deleted', 'Supprimé')} size="small" color="warning" sx={{ fontWeight: 700 }} />
                        ) : null}
                      </Stack>
                    ) : null}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField sx={fieldSx} label={t('First Name')} name="worker.firstName" value={w.firstName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.firstName')} helperText={he('worker.firstName')} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField sx={fieldSx} label={t('Last Name')} name="worker.lastName" value={w.lastName || ''} onChange={handleChange} onBlur={handleBlur} error={te('worker.lastName')} helperText={he('worker.lastName')} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField sx={fieldSx} label="Email" name="worker.email" value={w.email || ''} fullWidth disabled />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField sx={fieldSx} label={t('Phone')} name="worker.phone" value={w.phone || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.phone', normalizePhone(e.target.value))} error={te('worker.phone')} helperText={he('worker.phone')} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField sx={fieldSx} label={t('Whatsapp')} name="worker.whatsapp" value={w.whatsapp || ''} onChange={handleChange} onBlur={e => setFieldValue('worker.whatsapp', normalizePhone(e.target.value))} error={te('worker.whatsapp')} helperText={he('worker.whatsapp')} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!w.banned}
                              onChange={(_, v) => setFieldValue('worker.banned', v)}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: WF.error },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WF.error },
                              }}
                            />
                          }
                          label={t('Banned')}
                        />
                      </Grid>
                      {w.workerTypeOwner ? (
                        <>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} select label={t('Contract type')} name="worker.contractType" value={w.contractType || ''} onChange={e => {
                              const val = e.target.value;
                              setFieldValue('worker.contractType', val);
                              if (val === 'FIXED FEE') setFieldValue('worker.commission', 0);
                            }} error={te('worker.contractType')} helperText={he('worker.contractType')} fullWidth>
                              {CONTRACT_TYPES.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label={t('Commission (%)')} name="worker.commission" type="number" value={w.commission ?? 0} onChange={e => {
                              const val = e.target.value;
                              setFieldValue('worker.commission', val === '' ? '' : Number(val));
                            }} slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                              },
                              htmlInput: { min: 0, max: 100, step: '5' },
                            }} disabled={w.contractType === 'FIXED FEE'} error={te('worker.commission')} helperText={w.contractType === 'FIXED FEE' ? t('Commission not required for fixed fee') : he('worker.commission')} fullWidth />
                          </Grid>
                        </>
                      ) : null}
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
                        setFieldValue('worker.notificationConfig', w._previousNotificationConfig || []);
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
                    onSave={() => document.getElementById('worker-form')?.requestSubmit()}
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

      <WorkerPasswordDialog
        open={passwordDialogOpen}
        onClose={closePasswordDialog}
        workerEmail={accountFromApi?.email}
        loading={passwordLoading}
        onSubmit={handlePasswordSubmit}
        result={passwordResult}
        onEditAgain={() => setPasswordResult(null)}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        title="Supprimer le worker"
        message={`Supprimer ${workerDisplayName} ? Le compte sera désactivé (suppression logique) et ne pourra plus se connecter.`}
        btnTxt={deleteLoading ? 'Suppression…' : 'Supprimer'}
        functionToExecute={handleDeleteWorker}
      />
    </WorkerFormPage>
  );
}
