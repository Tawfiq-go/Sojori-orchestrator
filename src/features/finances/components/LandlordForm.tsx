import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { Form, Formik, type FormikProps } from 'formik';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getListings, getOneListing } from '../../listing/services/serverApi.listing';
import { resendWorkerCredentials } from '../../staff/services/serverApi.task';
import WorkerCredentialsDialog from '../../staff/components/WorkerCredentialsDialog';
import WorkerPasswordDialog from '../../staff/components/WorkerPasswordDialog';
import {
  WorkerFormActions,
  WorkerFormHeader,
  WorkerFormLayout,
  WorkerFormNav,
  WorkerFormPage,
  WorkerFormSection,
  WorkerListingPicker,
  workerTextFieldSx,
  WF,
} from '../../staff/components/workerFormDesign';
import {
  DEFAULT_LANDLORD_DASHBOARD_GRANTS,
  landlordHasDashboardAccess,
  normalizeLandlordGrants,
  type FeatureGrant,
} from '../../../utils/ownerRoutePermissions';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import {
  getLandlordById,
  inviteLandlord,
  updateLandlordAccount,
} from '../landlordApi';
import {
  buildStoredLandlordContract,
  formContractTypeFromStored,
} from '../utils/contractCommissionBase';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import type { LandlordAccount, LandlordContract, LandlordContractType } from '../types';
import {
  LANDLORD_FORM_SECTIONS,
  LandlordDashboardAccessPanel,
} from './landlordFormDesign';
import { useSectionInView } from '../hooks/useSectionInView';

const fieldSx = workerTextFieldSx();

const defaultContract: LandlordContract = {
  type: 'percent_without_ota',
  commissionPercent: 18,
  revenueBase: 'net_after_ota',
  currency: 'MAD',
};

type LandlordFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp: string;
  banned: boolean;
  listingIds: string[];
  dashboardAccess: boolean;
  featureGrants: FeatureGrant[];
  _previousFeatureGrants: FeatureGrant[];
  contractType: LandlordContractType;
  commissionPercent: string;
  fixedAmount: string;
  fixedPeriod: 'per_month' | 'per_booking' | 'per_year';
  contractNotes: string;
};

const EMPTY: LandlordFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsapp: '',
  banned: false,
  listingIds: [],
  dashboardAccess: true,
  featureGrants: [...DEFAULT_LANDLORD_DASHBOARD_GRANTS],
  _previousFeatureGrants: [],
  contractType: 'percent_without_ota',
  commissionPercent: '18',
  fixedAmount: '',
  fixedPeriod: 'per_month',
  contractNotes: '',
};

function normalizePhone(val = '') {
  return (val || '').replace(/[^\d+]/g, '');
}

function toFormValues(account: LandlordAccount | null): LandlordFormValues {
  if (!account) return { ...EMPTY, featureGrants: [...DEFAULT_LANDLORD_DASHBOARD_GRANTS] };
  const lc = account.landlordContract || defaultContract;
  const grants = Array.isArray(account.featureGrants) ? account.featureGrants : [];
  return {
    firstName: account.firstName || '',
    lastName: account.lastName || '',
    email: account.email || '',
    phone: account.phone || '',
    whatsapp: account.whatsapp || '',
    banned: !!account.banned,
    listingIds: (account.listingIds || []).map(String),
    dashboardAccess: landlordHasDashboardAccess(grants),
    featureGrants: grants.length ? normalizeLandlordGrants(grants) : [...DEFAULT_LANDLORD_DASHBOARD_GRANTS],
    _previousFeatureGrants: [],
    contractType: formContractTypeFromStored(lc),
    commissionPercent: String(lc.commissionPercent ?? 18),
    fixedAmount: lc.fixedAmount != null ? String(lc.fixedAmount) : '',
    fixedPeriod: lc.fixedPeriod || 'per_month',
    contractNotes: lc.notes || '',
  };
}

function buildContract(v: LandlordFormValues): LandlordContract {
  return buildStoredLandlordContract(
    v.contractType,
    Number(v.commissionPercent) || 0,
    Number(v.fixedAmount) || 0,
    v.fixedPeriod,
    'MAD',
    v.contractNotes,
  );
}

export default function LandlordForm() {
  const { landlordId } = useParams();
  const isEdit = Boolean(landlordId && landlordId !== 'new');
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { ownerId, needsOwnerPick, isPlatformAdmin, owners } = useFinancesOwnerScope();
  const [active, setActive] = useState(LANDLORD_FORM_SECTIONS[0].id);
  const [account, setAccount] = useState<LandlordAccount | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [listings, setListings] = useState<Array<{ _id?: string; name?: string }>>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsLimit] = useState(25);
  const [listingSearch, setListingSearch] = useState('');
  const [listingLabels, setListingLabels] = useState<Record<string, string>>({});
  const [credentialsDialog, setCredentialsDialog] = useState<{
    email: string;
    temporaryPassword: string;
    loginUrl?: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>(null);
  const [createdLandlordId, setCreatedLandlordId] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordResult, setPasswordResult] = useState<typeof credentialsDialog>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSendEmailDefault, setPasswordSendEmailDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const formikRef = useRef<FormikProps<LandlordFormValues> | null>(null);
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');
  const listingsSectionVisible = useSectionInView('listings-access');
  const shouldLoadListings = listingsSectionVisible || active === 'listings-access';

  const initialValues = useMemo(() => toFormValues(account), [account]);

  useEffect(() => {
    if (!isEdit || !landlordId) return;
    const controller = new AbortController();
    setLoading(true);
    getLandlordById(landlordId)
      .then((row) => {
        if (controller.signal.aborted) return;
        setAccount(row);
        const ids = (row.listingIds || []).map(String).filter(Boolean);
        if (ids.length === 0) return;
        void Promise.all(
          ids.slice(0, 40).map(async (id) => {
            try {
              const listing = await getOneListing(id, staging);
              const name = listing?.name || listing?.title;
              if (name) {
                setListingLabels((prev) => ({ ...prev, [id]: name }));
              }
            } catch {
              /* ignore */
            }
          }),
        );
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        toast.error(e instanceof Error ? e.message : 'Chargement impossible');
        navigate('/finances/landlords', { replace: true });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isEdit, landlordId, navigate, staging]);

  useEffect(() => {
    if (!shouldLoadListings) return;
    const controller = new AbortController();
    const tmr = setTimeout(() => {
      (async () => {
        setListingsLoading(true);
        try {
          const result = await getListings({
            page: listingsPage,
            limit: listingsLimit,
            name: listingSearch,
            staging,
            useActiveFilter: true,
            active: true,
            compact: true,
          });
          if (controller.signal.aborted) return;
          const rows = Array.isArray(result?.data?.data) ? result.data.data : [];
          setListings(rows);
          setListingsTotal(result?.data?.total ?? 0);
          setListingLabels((prev) => {
            const next = { ...prev };
            rows.forEach((l: { _id?: string; name?: string }) => {
              if (l?._id) next[String(l._id)] = l.name || next[String(l._id)];
            });
            return next;
          });
        } catch {
          if (!controller.signal.aborted) {
            setListings([]);
            setListingsTotal(0);
          }
        } finally {
          if (!controller.signal.aborted) setListingsLoading(false);
        }
      })();
    }, listingSearch ? 300 : 0);
    return () => {
      controller.abort();
      clearTimeout(tmr);
    };
  }, [shouldLoadListings, listingSearch, listingsPage, listingsLimit, staging]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const v = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (v?.target?.id) setActive(v.target.id);
      },
      { root: null, rootMargin: '0px 0px -60% 0px', threshold: [0.1, 0.25, 0.5, 0.75, 1] },
    );
    LANDLORD_FORM_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading, account]);

  const headerSubtitle = account
    ? [account.firstName, account.lastName].filter(Boolean).join(' ') +
      (account.email ? ` · ${account.email}` : '')
    : undefined;

  const selectedPmLabel = useMemo(() => {
    if (!isPlatformAdmin || !ownerId) return '';
    const row = owners.find((o) => String(o._id ?? o.id) === String(ownerId));
    return row ? getOwnerListLabel(row) : ownerId.slice(-6);
  }, [isPlatformAdmin, ownerId, owners]);

  const validate = (v: LandlordFormValues) => {
    const errors: Partial<Record<keyof LandlordFormValues, string>> = {};
    if (!v.firstName?.trim()) errors.firstName = 'Prénom requis';
    if (!v.lastName?.trim()) errors.lastName = 'Nom requis';
    if (!isEdit) {
      const email = v.email?.trim();
      if (!email) errors.email = 'Email requis';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email invalide';
    }
    if (v.contractType === 'fixed' && !(Number(v.fixedAmount) > 0)) {
      errors.fixedAmount = 'Montant fixe requis';
    }
    return errors;
  };

  const triggerSave = async () => {
    const formik = formikRef.current;
    if (!formik) {
      toast.error('Formulaire indisponible — rechargez la page.');
      return;
    }
    if (needsOwnerPick) {
      toast.warn('Choisissez le propriétaire PM en haut de page.');
      return;
    }
    const errors = await formik.validateForm();
    const keys = Object.keys(errors);
    if (keys.length) {
      await formik.setTouched(
        Object.fromEntries(keys.map((k) => [k, true])) as Partial<Record<keyof LandlordFormValues, boolean>>,
        true,
      );
      const first = errors[keys[0] as keyof LandlordFormValues];
      toast.warn(typeof first === 'string' ? first : 'Complétez les champs obligatoires.');
      return;
    }
    await formik.submitForm();
  };

  const handleSubmit = async (v: LandlordFormValues) => {
    if (submitting) return;
    if (needsOwnerPick) {
      toast.warn('Choisissez le propriétaire PM en haut de page.');
      return;
    }
    if (!ownerId && isPlatformAdmin) {
      toast.error('Propriétaire PM manquant — resélectionnez-le en haut de page.');
      return;
    }
    const grants = v.dashboardAccess ? normalizeLandlordGrants(v.featureGrants) : [];
    const body = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: v.phone?.trim() ? normalizePhone(v.phone) : undefined,
      whatsapp: v.whatsapp?.trim() ? normalizePhone(v.whatsapp) : undefined,
      listingIds: v.listingIds,
      listingCityIds: [] as string[],
      landlordContract: buildContract(v),
      featureGrants: grants,
      dashboardAccess: v.dashboardAccess,
      banned: v.banned,
    };

    try {
      setSubmitting(true);
      if (isEdit && landlordId) {
        await updateLandlordAccount(landlordId, body);
        toast.success('Propriétaire mis à jour');
        navigate('/finances/landlords', { replace: true });
        return;
      }

      const res = await inviteLandlord({
        ...body,
        email: v.email.trim(),
        ownerId: ownerId || undefined,
      });

      if (v.dashboardAccess && res?.temporaryPassword) {
        toast.success('Propriétaire créé — consultez les identifiants ci-dessous.');
        setCreatedLandlordId(res.landlordId ? String(res.landlordId) : null);
        setCredentialsDialog({
          email: res.email || v.email,
          temporaryPassword: res.temporaryPassword,
          loginUrl: res.loginUrl,
          emailSent: res.emailSent,
          emailError: res.emailError,
        });
      } else {
        toast.success(v.dashboardAccess ? 'Propriétaire ajouté' : 'Propriétaire enregistré (sans accès dashboard)');
        navigate('/finances/landlords', { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async ({ password, sendEmail = true }: { password?: string; sendEmail?: boolean }) => {
    const targetId = landlordId || createdLandlordId;
    if (!targetId || passwordLoading) return;
    setPasswordLoading(true);
    const trimmed = typeof password === 'string' ? password.trim() : '';
    try {
      const payload: { sendEmail: boolean; password?: string } = { sendEmail };
      if (trimmed) payload.password = trimmed;
      const res = await resendWorkerCredentials(targetId, payload);
      const d = res?.data || {};
      if (d.temporaryPassword) {
        const next = {
          email: d.email,
          temporaryPassword: d.temporaryPassword,
          loginUrl: d.loginUrl,
          emailSent: !!d.emailSent,
          emailError: d.emailError,
        };
        setPasswordResult(next);
        if (credentialsDialog) {
          setCredentialsDialog((prev) => (prev ? { ...prev, ...next } : prev));
        }
        toast.success(d.emailSent ? 'Identifiants renvoyés' : 'Mot de passe enregistré');
      } else {
        toast.error(d.error || 'Échec');
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(ax?.response?.data?.error || ax?.response?.data?.message || 'Échec');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <WorkerFormPage>
        <Typography sx={{ color: WF.text3, textAlign: 'center', py: 6 }}>{t('Loading...')}</Typography>
      </WorkerFormPage>
    );
  }

  return (
    <WorkerFormPage>
      <WorkerFormHeader
        title={isEdit ? 'Modifier le propriétaire' : 'Ajouter un propriétaire'}
        subtitle={headerSubtitle}
        onBack={() => navigate('/finances/landlords')}
        onCancel={() => navigate('/finances/landlords')}
        onSave={() => void triggerSave()}
        saveLabel={submitting ? (isEdit ? 'Enregistrement…' : 'Ajout…') : isEdit ? t('Save') : 'Ajouter'}
        saveDisabled={submitting || (!isEdit && needsOwnerPick)}
        extraActions={
          isEdit && landlordHasDashboardAccess(account?.featureGrants) ? (
            <Button
              variant="contained"
              disabled={passwordLoading}
              onClick={() => {
                setPasswordResult(null);
                setPasswordSendEmailDefault(true);
                setPasswordDialogOpen(true);
              }}
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
          ) : null
        }
      />

      {needsOwnerPick ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
          Choisissez le <strong>propriétaire PM</strong> dans la barre en haut de page avant d&apos;ajouter un
          propriétaire immobilier.
        </Alert>
      ) : null}

      {!isEdit && isPlatformAdmin && ownerId && selectedPmLabel ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          Ce propriétaire immobilier sera rattaché au PM <strong>{selectedPmLabel}</strong>.
        </Alert>
      ) : null}

      {isEdit && landlordHasDashboardAccess(account?.featureGrants) ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          Pour définir ou modifier le mot de passe, cliquez sur <strong>Mot de passe / identifiants</strong> — saisie
          manuelle ou génération automatique.
        </Alert>
      ) : null}

      <Formik
        innerRef={formikRef}
        enableReinitialize
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
      >
        {({ values: v, setFieldValue, handleChange, handleBlur, errors, touched }) => {
          const te = (name: keyof LandlordFormValues) => Boolean(touched[name] && errors[name]);
          const he = (name: keyof LandlordFormValues) => (touched[name] && errors[name] ? String(errors[name]) : '');

          const toggleListing = (id: string) => {
            const sid = String(id);
            const current = v.listingIds.map(String);
            setFieldValue(
              'listingIds',
              current.includes(sid) ? current.filter((x) => x !== sid) : [...current, sid],
            );
            const row = listings.find((l) => String(l._id) === sid);
            if (row?.name) setListingLabels((prev) => ({ ...prev, [sid]: row.name! }));
          };

          return (
            <Form id="landlord-form">
              <WorkerFormLayout
                main={
                  <>
                    <WorkerFormSection id="basic-info" icon="👤" title="Identité" hint="Nom, email et contacts du propriétaire">
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            sx={fieldSx}
                            label={t('First Name')}
                            name="firstName"
                            value={v.firstName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={te('firstName')}
                            helperText={he('firstName')}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            sx={fieldSx}
                            label={t('Last Name')}
                            name="lastName"
                            value={v.lastName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={te('lastName')}
                            helperText={he('lastName')}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            sx={fieldSx}
                            label="Email"
                            name="email"
                            type="email"
                            value={v.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={te('email')}
                            helperText={he('email')}
                            fullWidth
                            disabled={isEdit}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            sx={fieldSx}
                            label={t('Phone')}
                            name="phone"
                            value={v.phone}
                            onChange={handleChange}
                            onBlur={(e) => setFieldValue('phone', normalizePhone(e.target.value))}
                            fullWidth
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            sx={fieldSx}
                            label={t('Whatsapp')}
                            name="whatsapp"
                            value={v.whatsapp}
                            onChange={handleChange}
                            onBlur={(e) => setFieldValue('whatsapp', normalizePhone(e.target.value))}
                            fullWidth
                          />
                        </Grid>
                        {isEdit ? (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={v.banned}
                                  onChange={(_, checked) => setFieldValue('banned', checked)}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: WF.error },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WF.error },
                                  }}
                                />
                              }
                              label={t('Banned')}
                            />
                          </Grid>
                        ) : null}
                      </Grid>
                    </WorkerFormSection>

                    <WorkerFormSection id="contract" icon="📊" title="Contrat PM" hint="Type de rémunération et paramètres de gestion">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        {(
                          [
                            ['fixed', 'Forfait fixe', 'Montant fixe par mois, réservation ou an'],
                            ['percent_without_ota', 'Commission % — net après OTA', '% sur revenu net OTA'],
                            ['percent_with_ota', 'Commission % — brut', '% sur revenu brut'],
                          ] as const
                        ).map(([type, nm, ds]) => (
                          <Box
                            key={type}
                            onClick={() => setFieldValue('contractType', type)}
                            sx={{
                              display: 'flex',
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: '12px',
                              border: `1px solid ${v.contractType === type ? WF.primary : WF.border}`,
                              bgcolor: v.contractType === type ? WF.primaryTint : WF.bg1,
                              cursor: 'pointer',
                            }}
                          >
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                border: `2px solid ${v.contractType === type ? WF.primary : WF.border}`,
                                bgcolor: v.contractType === type ? WF.primary : 'transparent',
                                mt: 0.25,
                                flexShrink: 0,
                              }}
                            />
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{nm}</Typography>
                              <Typography sx={{ fontSize: 11.5, color: WF.text3 }}>{ds}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      {v.contractType === 'fixed' ? (
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              sx={fieldSx}
                              label="Montant"
                              value={v.fixedAmount}
                              onChange={(e) => setFieldValue('fixedAmount', e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              sx={fieldSx}
                              select
                              label="Période"
                              value={v.fixedPeriod}
                              onChange={(e) => setFieldValue('fixedPeriod', e.target.value)}
                              fullWidth
                            >
                              <MenuItem value="per_month">Par mois</MenuItem>
                              <MenuItem value="per_booking">Par réservation</MenuItem>
                              <MenuItem value="per_year">Par an</MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                      ) : (
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              sx={fieldSx}
                              label="Commission %"
                              value={v.commissionPercent}
                              onChange={(e) => setFieldValue('commissionPercent', e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField sx={fieldSx} label="Devise" value="MAD" fullWidth disabled />
                          </Grid>
                        </Grid>
                      )}
                      <TextField
                        sx={{ ...fieldSx, mt: 2 }}
                        label="Notes internes"
                        value={v.contractNotes}
                        onChange={(e) => setFieldValue('contractNotes', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        placeholder="Non visibles par le propriétaire"
                      />
                    </WorkerFormSection>

                    <WorkerFormSection
                      id="listings-access"
                      icon="🏠"
                      title="Accès annonces"
                      hint="Sélection annonce par annonce — pastilles ci-dessous"
                    >
                      <WorkerListingPicker
                        listingsOnly
                        listingsHint="Choisissez les annonces rattachées à ce propriétaire (pas d'accès par ville)."
                        listings={listings}
                        loading={listingsLoading}
                        selectedIds={v.listingIds}
                        listingLabels={listingLabels}
                        search={listingSearch}
                        onSearchChange={(val) => {
                          setListingSearch(val);
                          setListingsPage(0);
                        }}
                        onToggle={toggleListing}
                        onRemoveListing={(id) =>
                          setFieldValue(
                            'listingIds',
                            v.listingIds.filter((x) => String(x) !== String(id)),
                          )
                        }
                        page={listingsPage}
                        total={listingsTotal}
                        limit={listingsLimit}
                        onPrev={() => setListingsPage((p) => Math.max(0, p - 1))}
                        onNext={() => setListingsPage((p) => p + 1)}
                        t={t}
                      />
                    </WorkerFormSection>

                    <WorkerFormSection
                      id="dashboard-access"
                      icon="🔐"
                      title="Accès dashboard"
                      hint="Connexion oui/non — si oui, permissions par section (lecture seule, configurables par le PM)"
                    >
                      <LandlordDashboardAccessPanel
                        hasAccess={v.dashboardAccess}
                        onHasAccessChange={(on) => {
                          setFieldValue('dashboardAccess', on);
                          if (on && !landlordHasDashboardAccess(v.featureGrants)) {
                            setFieldValue('featureGrants', [...DEFAULT_LANDLORD_DASHBOARD_GRANTS]);
                          }
                          if (!on) {
                            setFieldValue('featureGrants', []);
                            setFieldValue('_previousFeatureGrants', []);
                          }
                        }}
                        grants={v.featureGrants}
                        previousGrants={v._previousFeatureGrants}
                        onPreviousGrantsChange={(next) => setFieldValue('_previousFeatureGrants', next)}
                        onGrantsChange={(next) => setFieldValue('featureGrants', normalizeLandlordGrants(next))}
                      />
                    </WorkerFormSection>
                  </>
                }
                nav={<WorkerFormNav sections={LANDLORD_FORM_SECTIONS} activeId={active} onJump={setActive} />}
                actions={
                  <WorkerFormActions
                    onCancel={() => navigate('/finances/landlords')}
                    onSave={() => void triggerSave()}
                    saveLabel={submitting ? (isEdit ? 'Enregistrement…' : 'Ajout…') : isEdit ? t('Save') : 'Ajouter'}
                    saveDisabled={submitting || (!isEdit && needsOwnerPick)}
                  />
                }
              />
            </Form>
          );
        }}
      </Formik>

      <WorkerCredentialsDialog
        open={!!credentialsDialog}
        onClose={() => {
          setCredentialsDialog(null);
          setCreatedLandlordId(null);
          navigate('/finances/landlords', { replace: true });
        }}
        title="Identifiants du propriétaire"
        email={credentialsDialog?.email}
        temporaryPassword={credentialsDialog?.temporaryPassword}
        loginUrl={credentialsDialog?.loginUrl}
        emailSent={credentialsDialog?.emailSent}
        emailError={credentialsDialog?.emailError}
        onDefinePassword={
          createdLandlordId
            ? () => {
                setPasswordSendEmailDefault(!credentialsDialog?.emailSent);
                setPasswordResult(null);
                setPasswordDialogOpen(true);
              }
            : undefined
        }
      />

      <WorkerPasswordDialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordResult(null);
        }}
        workerEmail={credentialsDialog?.email || account?.email}
        loading={passwordLoading}
        onSubmit={handlePasswordSubmit}
        result={passwordResult}
        onEditAgain={() => setPasswordResult(null)}
        dialogTitle="Mot de passe du propriétaire"
        resultTitle="Mot de passe enregistré"
        sendEmailLabel="Envoyer les identifiants par email au propriétaire"
        initialSendEmail={passwordSendEmailDefault}
      />
    </WorkerFormPage>
  );
}
