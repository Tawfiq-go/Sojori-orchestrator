import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  saveOwnerDraft,
  finalizeOwnerCreation,
  updateOwner,
  sendOwnerPasswordLink,
  updateOwnerWhatsappAiTier,
  updateFillCompany,
  updateFillCompanyLocal,
  getCities,
  getCurrencies,
} from '../services/serverApi.task';
import { uploadImageToAPI, uploadMultipleImagesToAPI } from '../../../redux/slices/UploadSlice';
import {
  extractUrlsFromUploadResult,
  normalizePmImageList,
  normalizePmImageUrl,
  PM_VITRINE_MAX_PHOTOS,
  PM_VITRINE_IMAGE_SPECS,
  PM_VITRINE_IMAGE_HINT,
  initialsFromPublicName,
} from '../utils/pmProfileMediaUtils';
import OwnerPmLogoImage from './OwnerPmLogoImage';
import OwnerPmMonogramBadge from './OwnerPmMonogramBadge';
import * as fullchatbotApi from '../../../services/fullchatbotApi';
import { useTranslation } from 'react-i18next';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { WHATSAPP_AI_TIER_OPTIONS, tierOptionDropdownLabel } from '../../../constants/whatsappAiTier';
import SearchableSelect from './SearchableSelect';
import { useChannelsFillCompanyPickers } from '../hooks/useChannelsFillCompanyPickers';
import { sortCurrenciesByOrderedCodes } from '../utils/currencySort';
import OwnerCapabilitiesActivationPanel from '../../orchestrationListingV3/OwnerCapabilitiesActivationPanel';
import FillCompanyFormFields from './FillCompanyFormFields';
import { CompteFieldLabel, RuFieldBadgeLegendNative } from './RuFieldBadge';
import {
  buildFillCompanyInitialValues,
  buildFillCompanyApiPayload,
  getSelectedCitiesFromOwner,
  mergeAccountMirrorIntoFillCompany,
  resolveAccountCityName,
  isLegalSameAsContact,
  buildLegalRepresentativeFromContact,
  resolveEffectiveContactForLegal,
  hasFillCompanyUserInput,
} from '../utils/fillCompanyFormUtils';
import { computeOwnerCreateReadiness } from '../utils/ownerCreateReadiness';
import { buildDefaultRuEmail, resolveRuEmailDisplay } from '../utils/ruEmailUtils';
import OwnerPasswordDialog from './OwnerPasswordDialog';
import OwnerPasswordLinkDialog from './OwnerPasswordLinkDialog';
import { parseOwnerPasswordLinkResponse } from '../utils/ownerPasswordLinkFeedback';
import { logPmMail } from '../../../utils/ownerMailDebug';
import {
  defaultActivationsAllOff,
  initializeOwnerOrchestrationFromActivations,
} from '../../orchestrationListingV3/ownerCapabilityActivation';
import '../../taskHub/staff-design/staffDesign.css';
import './ownerFormDrawer.css';

function ownerInitials(owner) {
  const n = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim();
  if (!n) return '?';
  const p = n.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const buildValidationSchema = (t, owner, isCreate) =>
  Yup.object().shape({
    ...(isCreate
      ? {
          email: Yup.string().email(t('Invalid email')).required(t('Email is required')),
          ruEmail: Yup.string().email(t('Invalid email')).required('Email RU requis'),
        }
      : {
          ruEmail: Yup.string().email(t('Invalid email')).optional(),
        }),
    firstName: Yup.string().required(t('First name is required')),
    lastName: Yup.string().required(t('Last name is required')),
    phone: Yup.string().required(t('Phone is required')),
    whatsapp: Yup.string(),
    channelManager: Yup.string().required(t('Channel Manager is required')),
    cityId: Yup.string().required(t('City is required')),
    settings: Yup.object().shape({
      language: Yup.string().required(t('Language is required')),
      currency: Yup.string().required(t('Currency is required')),
    }),
    banned: Yup.boolean(),
    deleted: Yup.boolean(),
    ruExtranetPassword: Yup.string().test('ru-extranet-when-needed', function (value) {
      if (isCreate) return true;
      const { channelManager } = this.parent;
      const hasRuId = !!(owner?.ruOwnerId && String(owner.ruOwnerId).trim());
      const hasStoredRuPwd = !!owner?.hasRuExtranetPassword;
      if (channelManager !== 'RU' || hasRuId) return true;
      if (hasStoredRuPwd) return true;
      const v = (value || '').trim();
      if (v.length < 6) {
        return this.createError({ message: t('ownerRu_extranetPassword_required_min6') });
      }
      return true;
    }),
    elevatedAuthEmail: Yup.string().notRequired(),
    elevatedAuthPassword: Yup.string().notRequired(),
  });

const CREATE_EMPTY_PM_PROFILE = {
  publicName: '',
  slug: '',
  tagline: '',
  description: '',
  logoText: '',
  logoImage: '',
  images: [],
  brandColor: { from: '', to: '' },
  verified: false,
  published: false,
  responseTime: '',
};

const CREATE_INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  ruEmail: '',
  phone: '',
  whatsapp: '',
  channelManager: 'RU',
  cityId: '',
  banned: false,
  deleted: false,
  settings: { language: 'en', currency: 'USD' },
  ruExtranetPassword: '',
  elevatedAuthEmail: '',
  elevatedAuthPassword: '',
  whatsappConversationalTier: 2,
  address: '',
  postalCode: '',
  city: '',
  country: '',
  pmProfile: { ...CREATE_EMPTY_PM_PROFILE },
  fillCompany: buildFillCompanyInitialValues({}),
  legalSameAsContact: false,
};

const OWNER_TABS = [
  { id: 'compte', label: 'Compte' },
  { id: 'entreprise', label: 'Entreprise RU' },
  { id: 'sojori-web', label: 'Site sojori-vente' },
  { id: 'orchestration', label: 'Orchestration' },
  { id: 'rapports-pl', label: 'Rapports P&L' },
  { id: 'config-ia', label: 'Config IA' },
];

const TabPanel = ({ active, id, render, children }) => {
  const body = typeof render === 'function' ? render() : children;
  return (
    <div
      className="form-section full owner-tab-panel"
      hidden={active !== id}
      style={active !== id ? { display: 'none' } : undefined}
    >
      {body}
    </div>
  );
};

function AccountToFillCompanySync({ values, setFieldValue, cities, owner }) {
  useEffect(() => {
    const cityName = resolveAccountCityName({
      cityId: values.cityId,
      cities,
      fillCompany: values.fillCompany,
      owner,
      account: values,
    });
    const fc = values.fillCompany || {};
    const contact = fc.ContactInfo || {};
    const company = fc.CompanyInfo || {};

    const pairs = [
      ['fillCompany.ContactInfo.FirstName', values.firstName || ''],
      ['fillCompany.ContactInfo.LastName', values.lastName || ''],
      ['fillCompany.ContactInfo.Email', values.email || ''],
      ['fillCompany.ContactInfo.Phone', values.phone || ''],
      ['fillCompany.ContactInfo.City', cityName],
      ['fillCompany.CompanyInfo.CompanyCity', cityName],
      ['fillCompany.CompanyInfo.PhoneNumber', values.phone || ''],
    ];

    for (const [path, next] of pairs) {
      const key = path.split('.').pop();
      const block = path.includes('CompanyInfo') ? company : contact;
      const cur = block[key];
      if (cur !== next) {
        setFieldValue(path, next);
      }
    }
  }, [
    values.firstName,
    values.lastName,
    values.email,
    values.phone,
    values.cityId,
    cities,
    owner,
    setFieldValue,
  ]);
  return null;
}

function RuEmailNameSync({ values, setFieldValue, isCreate, ruEmailTouchedRef }) {
  useEffect(() => {
    if (!isCreate || ruEmailTouchedRef.current) return;
    const next = buildDefaultRuEmail(values.firstName, values.lastName);
    if (next && values.ruEmail !== next) {
      setFieldValue('ruEmail', next);
    }
  }, [values.firstName, values.lastName, isCreate, values.ruEmail, setFieldValue, ruEmailTouchedRef]);
  return null;
}

const UpdateOwnerSidebar = ({
  open,
  onClose,
  owner,
  onOwnerUpdated,
  onOwnerCreated,
  onDraftSaved,
  mode = 'edit',
  inline = true,
}) => {
  const isCreate = mode === 'create';
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const authRole = useSelector((state) => state.auth?.user?.role);
  const isPlatformAdmin = hasAdminAccess(authRole);
  const visibleTabs = useMemo(() => {
    let tabs = OWNER_TABS;
    if (!isCreate) {
      tabs = tabs.filter((tab) => tab.id !== 'orchestration');
    }
    if (!isPlatformAdmin) {
      tabs = tabs.filter((tab) => tab.id !== 'config-ia');
    }
    return tabs;
  }, [isCreate, isPlatformAdmin]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeTab, setActiveTab] = useState('compte');
  const drawerRef = useRef(null);
  const formikRef = useRef(null);
  const [serviceActivations, setServiceActivations] = useState(() => defaultActivationsAllOff());
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const ruEmailTouchedRef = useRef(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordDialogLoading, setPasswordDialogLoading] = useState(false);
  const [sendLinkLoading, setSendLinkLoading] = useState(false);
  const [passwordLinkDialog, setPasswordLinkDialog] = useState(null);
  const [savedOwnerId, setSavedOwnerId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);
  const {
    countries: ruCountries,
    languagesRu,
    nationalities: ruNationalities,
    interfaceLanguageCodes,
    currencySortOrder,
    loading: loadingRefPickers,
    error: refPickersError,
    usedFallback: refPickersFallback,
  } = useChannelsFillCompanyPickers(open);

  const sortedCurrencies = useMemo(
    () => sortCurrenciesByOrderedCodes(currencies, currencySortOrder),
    [currencies, currencySortOrder],
  );
  const validationSchema = useMemo(() => buildValidationSchema(t, owner, isCreate), [t, owner, isCreate]);
  const showRuExtranetPasswordField = useMemo(() => {
    if (isCreate) return false;
    const hasRuId = !!(owner?.ruOwnerId && String(owner.ruOwnerId).trim());
    return !hasRuId;
  }, [owner?.ruOwnerId, isCreate]);

  useEffect(() => {
    if (open && isCreate) setServiceActivations(defaultActivationsAllOff());
  }, [open, isCreate]);

  useEffect(() => {
    if (open && !isCreate && owner) {
      setSelectedCities(getSelectedCitiesFromOwner(owner));
    } else if (open && isCreate) {
      setSelectedCities([]);
    }
  }, [open, isCreate, owner?._id]);

  const currencyOptions = useMemo(
    () =>
      sortedCurrencies.map((c) => ({
        code: c.currencyCode,
        label: c.currencyCode,
        searchText: String(c.currencyCode || '').toLowerCase(),
      })),
    [sortedCurrencies],
  );

  const resetTabOnOpenKey = open ? `${isCreate ? 'create' : 'edit'}-${owner?._id ?? 'new'}` : '';

  useEffect(() => {
    if (open) setActiveTab('compte');
  }, [resetTabOnOpenKey, open]);

  useEffect(() => {
    if (!open || !inline) return;
    if (isCreate) return;
    if (!owner) return;
    const id = window.requestAnimationFrame(() => {
      drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, inline, owner?._id, isCreate]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingCities(true);
      setLoadingCurrencies(true);
      try {
        const data = await getCities({ limit: 200, paged: false });
        setCities(data || []);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
      try {
        const currencyData = await getCurrencies();
        setCurrencies(currencyData.data || []);
      } catch {
        setCurrencies([]);
      } finally {
        setLoadingCurrencies(false);
      }
    };
    void load();
  }, [open]);

  const handlePmImageUpload = async (fileList, currentImages, setFieldValue) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    const current = normalizePmImageList(currentImages);
    const room = PM_VITRINE_MAX_PHOTOS - current.length;
    if (room <= 0) {
      toast.warning(`Maximum ${PM_VITRINE_MAX_PHOTOS} photos vitrine (sojori-vente)`);
      return;
    }
    setUploadingImages(true);
    try {
      const result = await dispatch(uploadMultipleImagesToAPI({ files: files.slice(0, room), folder: 'other' })).unwrap();
      const urls = extractUrlsFromUploadResult(result).slice(0, room);
      if (urls.length === 0) {
        toast.error('Échec upload (réponse inattendue)');
        return;
      }
      setFieldValue('pmProfile.images', [...current, ...urls]);
      toast.success(`${urls.length} photo(s) ajoutée(s)`);
      if (files.length > room) {
        toast.info(`Limite ${PM_VITRINE_MAX_PHOTOS} photos — ${files.length - room} fichier(s) ignoré(s)`);
      }
    } catch (err) {
      toast.error(`Échec upload : ${err?.message || ''}`);
    } finally {
      setUploadingImages(false);
    }
  };

  /** Logo image PDF P&L uniquement (pmProfile.logoImage — pas la galerie vitrine). */
  const handlePmPlLogoUpload = async (fileList, setFieldValue) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploadingImages(true);
    try {
      const result = await dispatch(uploadImageToAPI({ file, folder: 'other' })).unwrap();
      const url = normalizePmImageUrl(result?.url || result);
      if (!url) {
        toast.error('Échec upload logo (URL manquante)');
        return;
      }
      setFieldValue('pmProfile.logoImage', url);
      toast.info('Logo P&L ajouté — cliquez Enregistrer pour sauvegarder');
    } catch (err) {
      toast.error(`Échec upload logo : ${err?.message || ''}`);
    } finally {
      setUploadingImages(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setSavedOwnerId(null);
      setSaveLoading(false);
      setFinalizeLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && owner?._id && owner?.status === 'inactive') {
      setSavedOwnerId(String(owner._id));
    }
  }, [open, owner?._id, owner?.status]);

  const effectiveOwnerId = savedOwnerId || owner?._id;
  const isDraftFlow = isCreate || owner?.status === 'inactive' || Boolean(savedOwnerId);

  const normalizePmSlug = (slug) =>
    (slug || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const persistFillCompany = async (ownerId, values, { localOnly = false } = {}) => {
    if (!ownerId) return null;
    const cityName = resolveAccountCityName({
      cityId: values.cityId,
      cities,
      fillCompany: values.fillCompany,
      owner,
      account: values,
    });
    let merged = mergeAccountMirrorIntoFillCompany(values.fillCompany, values, cityName);
    if (values.legalSameAsContact) {
      const eff = resolveEffectiveContactForLegal(merged.ContactInfo, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        cityName,
      });
      merged = {
        ...merged,
        LegalRepresentativeInfo: buildLegalRepresentativeFromContact(eff),
      };
    }
    const payload = buildFillCompanyApiPayload(merged, selectedCities);
    const companyKeys = Object.entries(payload.CompanyInfo || {}).filter(
      ([k, v]) => k !== 'Locations' && String(v ?? '').trim() !== '',
    ).length;
    const contactKeys = Object.entries(payload.ContactInfo || {}).filter(
      ([, v]) => String(v ?? '').trim() !== '',
    ).length;
    console.info('[PM] persistFillCompany', {
      ownerId,
      localOnly,
      contactKeys,
      companyKeys,
      legalKeys: Object.entries(payload.LegalRepresentativeInfo || {}).filter(
        ([, v]) => String(v ?? '').trim() !== '',
      ).length,
    });
    const apiRes = localOnly
      ? await updateFillCompanyLocal(ownerId, payload)
      : await updateFillCompany(ownerId, payload);
    return { apiRes, fillCompany: merged };
  };

  const buildUpdatePayload = (values, selectedCity) => ({
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    whatsapp: values.whatsapp,
    channelManager: values.channelManager,
    cityId: values.cityId,
    rentalCityId: selectedCity?.rentalCityId?.toString(),
    ...(values.ruEmail?.trim() ? { ruEmail: values.ruEmail.trim().toLowerCase() } : {}),
    settings: values.settings,
    banned: values.banned,
    deleted: values.deleted,
    address: values.address,
    postalCode: values.postalCode,
    city: values.city,
    country: values.country,
    pmProfile: {
      ...values.pmProfile,
      slug: normalizePmSlug(values.pmProfile?.slug),
      images: normalizePmImageList(values.pmProfile?.images),
    },
  });

  const buildDraftPayload = (values, selectedCity) => ({
    ...(effectiveOwnerId ? { ownerId: String(effectiveOwnerId) } : {}),
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    ruEmail: (values.ruEmail || buildDefaultRuEmail(values.firstName, values.lastName)).trim().toLowerCase(),
    phone: values.phone,
    whatsapp: values.whatsapp,
    channelManager: values.channelManager,
    cityId: values.cityId,
    rentalCityId: selectedCity?.rentalCityId?.toString(),
    whatsappConversationalTier: Number(values.whatsappConversationalTier) || 2,
  });

  const applyWhatsappTierIfAdmin = async (ownerId, values, accountBase) => {
    let account = accountBase;
    if (isPlatformAdmin && values.whatsappConversationalTier) {
      try {
        const tier = Number(values.whatsappConversationalTier);
        await updateOwnerWhatsappAiTier(ownerId, tier);
        try {
          await fullchatbotApi.syncOwnerModelToWhitelist(ownerId, tier);
        } catch (syncErr) {
          console.warn('[Owner] whitelist model sync', syncErr);
        }
        account = { ...account, whatsappConversationalTier: tier };
      } catch (tierErr) {
        console.warn('[Owner] whatsapp tier', tierErr);
      }
    }
    return account;
  };

  const handleSaveDraft = async (values, formikBag) => {
    const liveValues = formikRef.current?.values ?? values ?? formikBag?.values;
    const { setErrors, validateForm, setTouched } = formikBag;
    const validationErrors = await validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setTouched(validationErrors, true);
      setErrors(validationErrors);
      return;
    }
    setSaveLoading(true);
    try {
      const selectedCity = cities.find((city) => city._id === liveValues.cityId);
      const draftRes = await saveOwnerDraft(buildDraftPayload(liveValues, selectedCity));
      const accountId = String(draftRes?.data?.accountId ?? effectiveOwnerId ?? '').trim();
      if (!accountId || draftRes?.success === false) {
        setErrors({
          submit: draftRes?.message || draftRes?.error || 'Échec enregistrement brouillon',
        });
        return;
      }
      setSavedOwnerId(accountId);

      const profilePayload = buildUpdatePayload(
        { ...liveValues, banned: false, deleted: false },
        selectedCity,
      );
      try {
        await updateOwner(accountId, profilePayload);
      } catch (updErr) {
        console.warn('[saveOwnerDraft] profile update', updErr);
      }

      let fillPersisted = null;
      try {
        fillPersisted = await persistFillCompany(accountId, liveValues, { localOnly: true });
        if (!hasFillCompanyUserInput(fillPersisted?.fillCompany ?? liveValues.fillCompany)) {
          toast.warning(
            'Compte enregistré — entreprise vide en base. Remplissez Entreprise RU puis Enregistrer à nouveau.',
          );
        }
      } catch (fillErr) {
        const msg =
          fillErr?.response?.data?.message ||
          fillErr?.response?.data?.error ||
          fillErr?.message ||
          'Brouillon compte OK — échec entreprise locale';
        console.error('[PM] persistFillCompany failed', fillErr?.response?.status, msg);
        setErrors({ submit: msg });
        toast.error(msg);
        return;
      }

      const draftAccount = {
        _id: accountId,
        id: accountId,
        ...liveValues,
        status: draftRes?.data?.status || 'inactive',
        fillCompany: fillPersisted?.fillCompany ?? liveValues.fillCompany,
      };
      onDraftSaved?.(draftAccount);
      toast.success('Brouillon enregistré — complétez puis « Créer le PM » (vert) quand tout est prêt');
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Échec enregistrement',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFinalizeCreate = async (values, formikBag) => {
    const { setErrors } = formikBag;
    const readiness = computeOwnerCreateReadiness(values);
    if (!readiness.ready) {
      toast.warning(`Champs manquants : ${readiness.missing.join(', ')}`);
      return;
    }
    if (!effectiveOwnerId) {
      toast.warning('Enregistrez d’abord le brouillon');
      return;
    }
    setFinalizeLoading(true);
    try {
      const selectedCity = cities.find((city) => city._id === values.cityId);
      await saveOwnerDraft(buildDraftPayload(values, selectedCity));

      const profilePayload = buildUpdatePayload(
        { ...values, banned: false, deleted: false },
        selectedCity,
      );
      await updateOwner(effectiveOwnerId, profilePayload);

      const finRes = await finalizeOwnerCreation(effectiveOwnerId);
      const finData = finRes?.data ?? finRes;
      if (finRes?.success === false) {
        setErrors({ submit: finRes?.message || finRes?.error || 'Échec création PM' });
        return;
      }

      if (finData?.emailSent === true) {
        toast.success('PM créé — invitation envoyée (24h)');
      } else if (finData?.inviteUrl) {
        setPasswordLinkDialog({
          ok: true,
          email: values.email,
          url: finData.inviteUrl,
          emailSent: false,
          emailError: finData.emailError || finRes?.message || null,
          linkType: 'invite',
          expiresAt: finData.inviteExpiresAt || '',
        });
        toast.warning('PM créé — email non envoyé, copiez le lien');
      }

      try {
        const fillPersisted = await persistFillCompany(effectiveOwnerId, values, { localOnly: false });
        if (fillPersisted?.apiRes?.message && String(fillPersisted.apiRes.message).toLowerCase().includes('synced')) {
          toast.info('Entreprise synchronisée RU');
        }
      } catch (fillErr) {
        setErrors({
          submit:
            fillErr?.response?.data?.message ||
            fillErr?.response?.data?.error ||
            fillErr?.message ||
            'PM créé mais échec sync entreprise RU',
        });
        return;
      }

      if (isCreate) {
        try {
          await initializeOwnerOrchestrationFromActivations(effectiveOwnerId, serviceActivations);
        } catch (initErr) {
          console.warn('[finalizeOwner] orchestration init', initErr);
        }
      }

      let createdAccount = {
        _id: effectiveOwnerId,
        id: effectiveOwnerId,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        whatsapp: values.whatsapp,
        channelManager: values.channelManager,
        cityId: values.cityId,
        ruOwnerId: finData?.ruOwnerId ?? null,
        status: finData?.status || 'pending',
        whatsappConversationalTier: Number(values.whatsappConversationalTier) || 2,
        settings: values.settings,
        pmProfile: profilePayload.pmProfile,
        fillCompany: values.fillCompany,
      };
      createdAccount = await applyWhatsappTierIfAdmin(effectiveOwnerId, values, createdAccount);

      onOwnerCreated?.(createdAccount);
      toast.success('Property manager créé');
      onClose();
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          'Échec création PM',
      });
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleSaveEdit = async (values, formikBag) => {
    const { setErrors, validateForm, setTouched } = formikBag;
    const validationErrors = await validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setTouched(validationErrors, true);
      setErrors(validationErrors);
      return;
    }
    if (!owner?._id) return;
    setSaveLoading(true);
    try {
      const selectedCity = cities.find((city) => city._id === values.cityId);
      const ruPwd = (values.ruExtranetPassword || '').trim();
      const response = await updateOwner(owner._id, {
        ...buildUpdatePayload(values, selectedCity),
        ...(ruPwd.length >= 6 ? { ruExtranetPassword: ruPwd } : {}),
      });
      if (!response.data?.account) {
        setErrors({ submit: t('Failed to update owner') });
        return;
      }
      let updatedAccount = response.data.account;
      updatedAccount = await applyWhatsappTierIfAdmin(owner._id, values, updatedAccount);

      const sync = response.data.ruOwnerSync;
      if (sync?.attempted && sync.ok === false) {
        setErrors({ submit: sync.message || t('Failed to update owner') });
        return;
      }

      let fillPersisted = null;
      try {
        fillPersisted = await persistFillCompany(owner._id, values, { localOnly: true });
      } catch (fillErr) {
        setErrors({
          submit:
            fillErr?.response?.data?.message ||
            fillErr?.response?.data?.error ||
            fillErr?.message ||
            'Compte mis à jour — échec entreprise locale',
        });
        return;
      }

      onOwnerUpdated?.({
        ...updatedAccount,
        fillCompany: fillPersisted?.fillCompany ?? values.fillCompany,
      });
      toast.success('Enregistré — vous pouvez continuer à modifier');
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          t('Failed to update owner'),
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOwnerPasswordSubmit = async (payload) => {
    if (!owner?._id) return;
    setPasswordDialogLoading(true);
    try {
      const response = await updateOwner(owner._id, payload);
      if (response.data?.account) {
        toast.success('Mot de passe mis à jour');
        onOwnerUpdated?.({ ...owner, ...response.data.account });
        setPasswordDialogOpen(false);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Échec mise à jour mot de passe',
      );
    } finally {
      setPasswordDialogLoading(false);
    }
  };

  const handleSendPasswordLink = async () => {
    if (!owner?._id || sendLinkLoading) return;
    logPmMail('ui:send-password-link:click', { ownerId: String(owner._id), email: owner?.email });
    setSendLinkLoading(true);
    try {
      const res = await sendOwnerPasswordLink(owner._id);
      const parsed = parseOwnerPasswordLinkResponse(res);
      if (!parsed.ok) {
        toast.error(res?.message || res?.error || 'Échec envoi du lien');
        return;
      }
      setPasswordLinkDialog(parsed);
      if (parsed.emailSent) {
        toast.success(`Email envoyé à ${parsed.email}`);
      } else {
        toast.warning('Email non envoyé — copiez le lien dans la fenêtre');
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Échec envoi du lien',
      );
    } finally {
      setSendLinkLoading(false);
    }
  };

  if (!open) return null;
  if (!isCreate && !owner) return null;

  const initialValues = isCreate
    ? {
        ...CREATE_INITIAL_VALUES,
        fillCompany: buildFillCompanyInitialValues({ cities }),
      }
    : (() => {
        const fillCompany = buildFillCompanyInitialValues({ owner, cities });
        const cityName = resolveAccountCityName({
          cityId: owner.cityId,
          cities,
          fillCompany,
          owner,
          account: owner,
        });
        return {
        firstName: owner.firstName || '',
        lastName: owner.lastName || '',
        phone: owner.phone || '',
        whatsapp: owner.whatsapp || '',
        channelManager: owner.channelManager || '',
        cityId: owner.cityId || '',
        banned: owner.banned || false,
        deleted: owner.deleted || false,
        settings: owner.settings || { language: 'en', currency: 'USD' },
        ruExtranetPassword: '',
        elevatedAuthEmail: '',
        elevatedAuthPassword: '',
        whatsappConversationalTier: owner.whatsappConversationalTier || 2,
        email: owner.email || '',
        ruEmail: owner.ruEmail || resolveRuEmailDisplay(owner) || '',
        address: owner.address || '',
        postalCode: owner.postalCode || '',
        city: owner.city || '',
        country: owner.country || '',
        fillCompany,
        legalSameAsContact: isLegalSameAsContact(
          fillCompany.ContactInfo,
          fillCompany.LegalRepresentativeInfo,
          {
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
            phone: owner.phone,
            cityName,
          },
        ),
        pmProfile: {
          publicName: owner?.pmProfile?.publicName || '',
          slug: owner?.pmProfile?.slug || '',
          tagline: owner?.pmProfile?.tagline || '',
          description: owner?.pmProfile?.description || '',
          logoText: owner?.pmProfile?.logoText || '',
          logoImage: owner?.pmProfile?.logoImage || '',
          images: normalizePmImageList(owner?.pmProfile?.images),
          brandColor: {
            from: owner?.pmProfile?.brandColor?.from || '',
            to: owner?.pmProfile?.brandColor?.to || '',
          },
          verified: owner?.pmProfile?.verified || false,
          published: owner?.pmProfile?.published || false,
          responseTime: owner?.pmProfile?.responseTime || '',
        },
      };
      })();

  const formikOwnerKey = isCreate ? 'create' : String(owner?._id || 'edit');

  const drawerTitle = isCreate
    ? savedOwnerId
      ? 'Créer · brouillon enregistré'
      : 'Créer · nouveau property manager'
    : owner?.status === 'inactive'
      ? `Finaliser · ${owner?.firstName || 'PM'}`
      : `Modifier · ${owner?.firstName || owner?.lastName || 'Property manager'}`;

  const drawerPanel = (
    <div
      ref={drawerRef}
      className={`so-staff-root drawer owner-drawer-panel${inline ? ' owner-drawer-inline' : ''}`}
      role="dialog"
      onClick={(e) => {
        if (!inline) e.stopPropagation();
      }}
    >
      <Formik
        innerRef={formikRef}
        key={open ? formikOwnerKey : 'closed'}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={() => {}}
        enableReinitialize={false}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
          validateForm,
          setErrors,
          setTouched,
        }) => {
          const formikBag = { setErrors, validateForm, setTouched, values };
          const createReadiness = computeOwnerCreateReadiness(values);
          const footBusy = saveLoading || finalizeLoading;
          const headerInitials = isCreate
            ? (() => {
                const n = ownerInitials({
                  firstName: values.firstName,
                  lastName: values.lastName,
                });
                return n === '?' ? 'PM' : n;
              })()
            : ownerInitials(owner);

          return (
          <>
            <div className="drawer-h">
              <div
                className="owner-drawer-avatar"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, var(--ps), var(--pd))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {headerInitials}
              </div>
              <h3>{drawerTitle}</h3>
              <button type="button" className="close" onClick={onClose} aria-label="Fermer">
                ✕
              </button>
            </div>

            <div className="owner-drawer-tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`owner-drawer-tab${activeTab === tab.id ? ' on' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              className="owner-drawer-form"
              noValidate
              onSubmit={(e) => e.preventDefault()}
            >
            <RuEmailNameSync
              values={values}
              setFieldValue={setFieldValue}
              isCreate={isCreate}
              ruEmailTouchedRef={ruEmailTouchedRef}
            />
            <AccountToFillCompanySync
              values={values}
              setFieldValue={setFieldValue}
              cities={cities}
              owner={owner}
            />
            <div className="form-grid">
              {errors.submit ? (
                <div className="form-section full owner-form-alert">{String(errors.submit)}</div>
              ) : null}

              <TabPanel
                active={activeTab}
                id="compte"
                render={() => (
                  <>
                {(refPickersFallback || refPickersError) && (
                  <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                    {refPickersError ? `${refPickersError} — ` : ''}
                    Listes langue/devise réduites. Sync complète via Hub Channels si besoin.
                  </div>
                )}
                <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                  <b>Compte PM</b> — seule saisie pour identité, emails, téléphone et ville (envoyés à R.U. à
                  l’enregistrement). L’onglet <b>Entreprise RU</b> = société, représentant légal et compléments
                  d’adresse uniquement — pas de double config.
                  {isCreate ? (
                    <> Invitation dashboard par email (24h).</>
                  ) : null}
                </div>
                <RuFieldBadgeLegendNative />
                {isDraftFlow ? (
                  <div className="owner-form-hint owner-draft-flow-hint">
                    <b>1. Enregistrer</b> — sauvegarde le brouillon (sans invitation, sans pression).
                    <b> 2. Créer le PM</b> — bouton <span className="owner-ready-pill">vert</span> quand tout est
                    complet : invitation dashboard + sync RU.
                    {savedOwnerId ? (
                      <> Brouillon ID : <code>{savedOwnerId}</code></>
                    ) : null}
                    {!createReadiness.ready && createReadiness.missing.length ? (
                      <div style={{ marginTop: 6, color: '#b45309' }}>
                        Manque pour Créer : {createReadiness.missing.join(' · ')}
                      </div>
                    ) : createReadiness.ready ? (
                      <div style={{ marginTop: 6, color: '#15803d', fontWeight: 700 }}>
                        Tout est prêt — vous pouvez créer le PM.
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="owner-tab-grid" style={{ marginBottom: 12 }}>
                  <div className="form-section">
                    <div className="form-section-h">{isCreate ? 'Connexion Sojori' : 'Emails & accès'}</div>
                    {isCreate ? (
                      <div className="field">
                        <CompteFieldLabel
                          kind="sojoriLogin"
                          ruXmlPath="Sojori invite + ContactInfo.Email"
                          required
                        >
                          Email dashboard
                        </CompteFieldLabel>
                        <input
                          className="input"
                          name="email"
                          type="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="username"
                        />
                        {touched.email && errors.email ? (
                          <span className="owner-field-err">{errors.email}</span>
                        ) : null}
                        <div className="owner-form-hint" style={{ marginTop: 6 }}>
                          {t('ruFieldBadge.hintDashboardEmailCreate', {
                            defaultValue:
                              'Création du compte dashboard Sojori : invitation par email (24h). Si channel RU, recopié dans ContactInfo.Email (fiche entreprise).',
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="field">
                        <CompteFieldLabel kind="sojoriLogin" ruXmlPath="Sojori login + ContactInfo.Email">
                          Email dashboard
                        </CompteFieldLabel>
                        <input className="input" value={values.email || owner?.email || ''} readOnly disabled />
                        {owner?.status === 'pending' ? (
                          <div className="owner-form-hint" style={{ marginTop: 6, color: '#b45309' }}>
                            Invitation en attente — le PM n’a pas encore activé son compte.
                          </div>
                        ) : null}
                        <div className="owner-form-hint" style={{ marginTop: 6 }}>
                          {t('ruFieldBadge.hintDashboardEmailEdit', {
                            defaultValue:
                              'Connexion dashboard Sojori. Recopié dans ContactInfo.Email (fiche RU) à l’enregistrement Entreprise.',
                          })}
                        </div>
                        <button
                          type="button"
                          className="owner-btn secondary"
                          style={{ marginTop: 8 }}
                          onClick={() => setPasswordDialogOpen(true)}
                        >
                          Modifier les mots de passe
                        </button>
                        <button
                          type="button"
                          className="owner-btn secondary"
                          style={{ marginTop: 8, marginLeft: 8 }}
                          disabled={sendLinkLoading}
                          onClick={() => void handleSendPasswordLink()}
                        >
                          {sendLinkLoading ? 'Envoi…' : 'Envoyer lien mot de passe (24h)'}
                        </button>
                      </div>
                    )}
                    <div className="field">
                      <CompteFieldLabel
                        kind="ruCreateUser"
                        ruXmlPath="Push_CreateUser.Email"
                        required
                      >
                        Email R.U. (extranet)
                      </CompteFieldLabel>
                      <input
                        className="input"
                        name="ruEmail"
                        type="email"
                        value={values.ruEmail}
                        onChange={(e) => {
                          ruEmailTouchedRef.current = true;
                          handleChange(e);
                        }}
                        onBlur={(e) => {
                          if (!ruEmailTouchedRef.current && (values.firstName || values.lastName)) {
                            setFieldValue(
                              'ruEmail',
                              buildDefaultRuEmail(values.firstName, values.lastName),
                            );
                          }
                          handleBlur(e);
                        }}
                        autoComplete="off"
                      />
                      {touched.ruEmail && errors.ruEmail ? (
                        <span className="owner-field-err">{errors.ruEmail}</span>
                      ) : null}
                      <div className="owner-form-hint" style={{ marginTop: 6 }}>
                        {t('ruFieldBadge.hintRuEmail', {
                          defaultValue:
                            'Login sur extranet Rental United (Push_CreateUser) — distinct de l’email dashboard. Aucun email envoyé par Sojori à cette adresse.',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="owner-tab-grid">
                <div className="form-section">
                  <div className="form-section-h">Identité</div>
                  <div className="field">
                    <CompteFieldLabel kind="ruMirror" ruXmlPath="ContactInfo.FirstName" required>
                      Prénom
                    </CompteFieldLabel>
                    <input
                      className="input"
                      name="firstName"
                      value={values.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {touched.firstName && errors.firstName ? (
                      <span className="owner-field-err">{errors.firstName}</span>
                    ) : null}
                  </div>
                  <div className="field">
                    <CompteFieldLabel kind="ruMirror" ruXmlPath="ContactInfo.LastName" required>
                      Nom
                    </CompteFieldLabel>
                    <input
                      className="input"
                      name="lastName"
                      value={values.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {touched.lastName && errors.lastName ? (
                      <span className="owner-field-err">{errors.lastName}</span>
                    ) : null}
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-h">Contact</div>
                  <div className="field">
                    <CompteFieldLabel kind="ruMirror" ruXmlPath="ContactInfo.Phone" required>
                      Téléphone
                    </CompteFieldLabel>
                    <input
                      className="input"
                      name="phone"
                      value={values.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="+212…"
                    />
                    {touched.phone && errors.phone ? (
                      <span className="owner-field-err">{errors.phone}</span>
                    ) : null}
                  </div>
                  <div className="field">
                    <CompteFieldLabel kind="nonRu">WhatsApp</CompteFieldLabel>
                    <input
                      className="input"
                      name="whatsapp"
                      value={values.whatsapp}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-h">Parc & channel</div>
                  <div className="field">
                    <CompteFieldLabel
                      kind="ruMirror"
                      ruXmlPath="ContactInfo.City + CompanyInfo.CompanyCity"
                      required
                    >
                      Ville
                    </CompteFieldLabel>
                    <select
                      className="input"
                      name="cityId"
                      value={values.cityId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={loadingCities}
                    >
                      <option value="">— Choisir —</option>
                      {cities.map((city) => (
                        <option key={city._id} value={city._id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    {touched.cityId && errors.cityId ? (
                      <span className="owner-field-err">{errors.cityId}</span>
                    ) : null}
                  </div>
                  <div className="field">
                    <CompteFieldLabel kind="nonRu" required>
                      Channel manager
                    </CompteFieldLabel>
                    <div className="seg">
                      {(['RU', 'Channex']).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          className={values.channelManager === ch ? 'on' : ''}
                          onClick={() => setFieldValue('channelManager', ch)}
                        >
                          {ch === 'RU' ? '🟠 RU' : '🔵 Channex'}
                        </button>
                      ))}
                    </div>
                    {touched.channelManager && errors.channelManager ? (
                      <span className="owner-field-err">{errors.channelManager}</span>
                    ) : null}
                  </div>
                </div>

                {values.channelManager === 'RU' && showRuExtranetPasswordField ? (
                  <div className="form-section full">
                    <div className="form-section-h">Rental United</div>
                    <div className="field">
                      <CompteFieldLabel kind="ruCreateUser" ruXmlPath="Push_CreateUser.Password">
                        Mot de passe extranet RU
                      </CompteFieldLabel>
                      <div className="owner-form-hint" style={{ marginBottom: 6 }}>
                        Min. 6 caractères si pas encore enregistré
                      </div>
                      <input
                        className="input"
                        type="password"
                        name="ruExtranetPassword"
                        value={values.ruExtranetPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete="new-password"
                        placeholder={
                          owner?.hasRuExtranetPassword
                            ? 'Laisser vide pour conserver'
                            : 'Obligatoire pour créer le compte RU'
                        }
                      />
                      {touched.ruExtranetPassword && errors.ruExtranetPassword ? (
                        <span className="owner-field-err">{errors.ruExtranetPassword}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="form-section">
                  <div className="form-section-h">Préférences dashboard</div>
                  <div className="field">
                    <CompteFieldLabel kind="nonRu" required>
                      Langue
                    </CompteFieldLabel>
                    <SearchableSelect
                      label=""
                      options={interfaceLanguageCodes}
                      optionValueKey="code"
                      getOptionLabel={(o) => o.label}
                      value={values.settings.language}
                      onChange={(v) => setFieldValue('settings.language', v)}
                      error={Boolean(touched.settings?.language && errors.settings?.language)}
                      helperText=""
                      disabled={loadingRefPickers}
                    />
                  </div>
                  <div className="field">
                    <CompteFieldLabel kind="nonRu" required>
                      Devise
                    </CompteFieldLabel>
                    <SearchableSelect
                      label=""
                      options={currencyOptions}
                      optionValueKey="code"
                      getOptionLabel={(o) => o.label}
                      value={values.settings.currency}
                      onChange={(v) => setFieldValue('settings.currency', v)}
                      error={Boolean(touched.settings?.currency && errors.settings?.currency)}
                      helperText=""
                      disabled={loadingCurrencies || loadingRefPickers}
                    />
                  </div>
                </div>

                {!isCreate ? (
                  <div className="form-section full">
                    <div className="form-section-h">Statut compte</div>
                    <div className="admin-row">
                      <span style={{ fontSize: 18 }}>⛔</span>
                      <div style={{ flex: 1 }}>
                        <div className="nm">Compte banni</div>
                        <div className="ds">Le PM ne peut plus se connecter</div>
                      </div>
                      <div
                        className={`toggle${values.banned ? ' on' : ''}`}
                        onClick={() => setFieldValue('banned', !values.banned)}
                        onKeyDown={() => {}}
                        role="switch"
                        aria-checked={values.banned}
                      />
                    </div>
                    <div className="admin-row" style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 18 }}>🗑</span>
                      <div style={{ flex: 1 }}>
                        <div className="nm">Compte supprimé</div>
                        <div className="ds">Archivé · masqué des listes actives</div>
                      </div>
                      <div
                        className={`toggle${values.deleted ? ' on' : ''}`}
                        onClick={() => setFieldValue('deleted', !values.deleted)}
                        onKeyDown={() => {}}
                        role="switch"
                        aria-checked={values.deleted}
                      />
                    </div>
                  </div>
                ) : null}
                </div>
                  </>
                )}
              />

              <TabPanel
                active={activeTab}
                id="entreprise"
                render={() => (
                  <>
                    <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                      <b>Entreprise RU</b> — données légales et fiche société envoyées à <b>Rental United</b> uniquement.
                      Ce n’est <b>pas</b> la vitrine sojori-vente (photos, slogan → onglet <b>Site sojori-vente</b>).
                      Prénom, nom, emails, téléphone et ville : onglet <b>Compte</b> uniquement.
                      {values.channelManager === 'RU'
                        ? ' Enregistrer ⚡ envoie le tout à Rental United.'
                        : ''}
                    </div>
                    <FillCompanyFormFields
                      namePrefix="fillCompany"
                      values={values}
                      errors={errors}
                      touched={touched}
                      handleChange={handleChange}
                      handleBlur={handleBlur}
                      setFieldValue={setFieldValue}
                      cities={cities}
                      ruCountries={ruCountries}
                      languagesRu={languagesRu}
                      ruNationalities={ruNationalities}
                      loadingRefPickers={loadingRefPickers}
                      refPickersFallback={refPickersFallback}
                      refPickersError={refPickersError}
                      selectedCities={selectedCities}
                      onSelectedCitiesChange={setSelectedCities}
                      mirrorAccountFields
                      hideMirroredContactFields
                      accountValues={{
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        ruEmail: values.ruEmail,
                        phone: values.phone,
                        cityName: resolveAccountCityName({
                          cityId: values.cityId,
                          cities,
                          fillCompany: values.fillCompany,
                          owner,
                          account: values,
                        }),
                      }}
                      legalSameAsContact={values.legalSameAsContact}
                      onLegalSameAsContactChange={(checked) =>
                        setFieldValue('legalSameAsContact', checked)
                      }
                    />
                  </>
                )}
              />

              {isCreate ? (
                <TabPanel
                  active={activeTab}
                  id="orchestration"
                  render={() => (
                    <>
                      <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                        Services visibles dans le menu du PM et orchestration initiale. Par défaut tout
                        est désactivé — activez ce dont le property manager a besoin.
                      </div>
                      <OwnerCapabilitiesActivationPanel
                        ownerKey=""
                        rows={[]}
                        orchestrationDoc={null}
                        compact
                        value={serviceActivations}
                        onChange={setServiceActivations}
                        disabled={isSubmitting}
                      />
                    </>
                  )}
                />
              ) : null}

              <TabPanel
                active={activeTab}
                id="rapports-pl"
                render={() => (
                  <>
                <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                  <b>Source des en-têtes PDF/HTML</b> — Finances → Rapports P&L utilisent ces infos via « ↻ Profil ».
                  Logo image ci-dessous (<code>logoImage</code>) — distinct de la galerie vitrine et du badge initiales.
                </div>

                <div className="owner-pl-preview">
                  <OwnerPmLogoImage
                    images={values.pmProfile.logoImage ? [values.pmProfile.logoImage] : []}
                    className="owner-pl-preview-logo"
                    emptyLabel={
                      (values.pmProfile.publicName || `${values.firstName} ${values.lastName}`)
                        .trim()
                        .charAt(0)
                        .toUpperCase() || '?'
                    }
                  />
                  <div className="owner-pl-preview-text">
                    <div className="owner-pl-preview-name">
                      {values.pmProfile.publicName ||
                        `${values.firstName} ${values.lastName}`.trim() ||
                        'Nom société'}
                    </div>
                    {values.pmProfile.tagline ? (
                      <div className="owner-pl-preview-line">{values.pmProfile.tagline}</div>
                    ) : null}
                    {values.email ? <div className="owner-pl-preview-line">{values.email}</div> : null}
                    {values.phone ? <div className="owner-pl-preview-line">{values.phone}</div> : null}
                    {[values.address, values.postalCode, values.city, values.country]
                      .filter(Boolean)
                      .join(', ') ? (
                      <div className="owner-pl-preview-line">
                        {[values.address, values.postalCode, values.city, values.country]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="form-section full" style={{ marginTop: 14 }}>
                  <div className="form-section-h">Logo image (PDF P&L)</div>
                  <div className="owner-pl-logo-row">
                    <OwnerPmLogoImage
                      images={values.pmProfile.logoImage ? [values.pmProfile.logoImage] : []}
                      className="owner-pl-logo-thumb"
                      emptyLabel="Aucun"
                    />
                    <label className="btn btn-ghost owner-photo-btn">
                      {uploadingImages ? 'Envoi…' : '+ Ajouter / remplacer logo'}
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        disabled={uploadingImages}
                        onChange={(e) => {
                          handlePmPlLogoUpload(e.target.files, setFieldValue);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {values.pmProfile.logoImage ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setFieldValue('pmProfile.logoImage', '')}
                      >
                        Retirer logo
                      </button>
                    ) : null}
                  </div>
                  <div className="owner-form-hint" style={{ marginTop: 8 }}>
                    PNG ou JPG · fond transparent recommandé. Sans image, le PDF utilise les initiales (
                    <code>logoText</code>) ou la 1re lettre du nom.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div className="field">
                    <div className="field-label">Nom société / marque</div>
                    <input
                      className="input"
                      name="pmProfile.publicName"
                      value={values.pmProfile.publicName}
                      onChange={handleChange}
                      placeholder="Raison sociale sur le PDF"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Slogan</div>
                    <input
                      className="input"
                      name="pmProfile.tagline"
                      value={values.pmProfile.tagline}
                      onChange={handleChange}
                      placeholder="Optionnel"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Email</div>
                    {isCreate ? (
                      <input
                        className="input"
                        name="email"
                        type="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    ) : (
                      <>
                        <input className="input" name="email" value={values.email} readOnly disabled />
                        <span className="owner-form-hint" style={{ display: 'block', marginTop: 6, padding: '6px 8px' }}>
                          Modifiable côté compte utilisateur / admin comptes.
                        </span>
                      </>
                    )}
                  </div>
                  <div className="field">
                    <div className="field-label">Téléphone</div>
                    <input
                      className="input"
                      name="phone"
                      value={values.phone}
                      onChange={handleChange}
                      placeholder="+212…"
                    />
                  </div>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <div className="field-label">Adresse</div>
                    <input
                      className="input"
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      placeholder="Rue, numéro"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Code postal</div>
                    <input
                      className="input"
                      name="postalCode"
                      value={values.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Ville</div>
                    <input className="input" name="city" value={values.city} onChange={handleChange} />
                  </div>
                  <div className="field">
                    <div className="field-label">Pays</div>
                    <input className="input" name="country" value={values.country} onChange={handleChange} />
                  </div>
                </div>
                  </>
                )}
              />

              <TabPanel
                active={activeTab}
                id="sojori-web"
                render={() => (
                  <>
                <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                  <b>Vitrine PM sur sojori-vente</b> — ce que voient les voyageurs :{' '}
                  <b>photos</b>, <b>slogan</b> (accroche), description, couleurs de marque, page{' '}
                  <code>/pm/votre-slug</code> et encart hôte sur la page d&apos;accueil.
                  <br />
                  Séparé de Rental United (onglet <b>Entreprise RU</b>) et des PDF finances (
                  <b>Rapports P&L</b>). Activez <b>Publié</b> pour rendre le profil visible.
                  {values.pmProfile?.slug ? (
                    <>
                      {' '}
                      Aperçu :{' '}
                      <a
                        href={`/pm/${encodeURIComponent(String(values.pmProfile.slug).trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        /pm/{values.pmProfile.slug}
                      </a>
                    </>
                  ) : null}
                </div>
                <div className="admin-row" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>🌐</span>
                  <div style={{ flex: 1 }}>
                    <div className="nm">Profil publié</div>
                    <div className="ds">Visible sur sojori.com / marketplace</div>
                  </div>
                  <div
                    className={`toggle${values.pmProfile.published ? ' on' : ''}`}
                    onClick={() => setFieldValue('pmProfile.published', !values.pmProfile.published)}
                    onKeyDown={() => {}}
                    role="switch"
                    aria-checked={values.pmProfile.published}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <div className="field-label">Nom public</div>
                    <input
                      className="input"
                      name="pmProfile.publicName"
                      value={values.pmProfile.publicName}
                      onChange={handleChange}
                      placeholder="Riad Luxe"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Slug (URL)</div>
                    <input
                      className="input"
                      name="pmProfile.slug"
                      value={values.pmProfile.slug}
                      onChange={handleChange}
                      placeholder="riad-luxe"
                    />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <div className="field-label">Slogan (accroche vitrine)</div>
                  <input
                    className="input"
                    name="pmProfile.tagline"
                    value={values.pmProfile.tagline}
                    onChange={handleChange}
                    placeholder="Riads authentiques au cœur des médinas"
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <div className="field-label">Description</div>
                  <textarea
                    className="input owner-textarea"
                    name="pmProfile.description"
                    value={values.pmProfile.description}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="owner-vitrine-section" style={{ marginTop: 16 }}>
                  <div className="form-section-h">Logo vitrine (initiales)</div>
                  <div className="owner-form-hint" style={{ marginBottom: 10 }}>
                    Badge texte sur sojori-vente (encart hôtes + page <code>/pm/slug</code>) —{' '}
                    <b>pas une image</b>. Si vide, calculé depuis le nom public.
                  </div>
                  <div className="owner-vitrine-logo-row">
                    <OwnerPmMonogramBadge
                      logoText={values.pmProfile.logoText}
                      publicName={
                        values.pmProfile.publicName ||
                        `${values.firstName || ''} ${values.lastName || ''}`.trim()
                      }
                      brandFrom={values.pmProfile.brandColor?.from}
                      brandTo={values.pmProfile.brandColor?.to}
                    />
                    <div className="owner-vitrine-logo-fields">
                      <div className="field">
                        <div className="field-label">Initiales (2 lettres max)</div>
                        <input
                          className="input"
                          name="pmProfile.logoText"
                          value={values.pmProfile.logoText}
                          onChange={handleChange}
                          maxLength={4}
                          placeholder="ex. SL"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          setFieldValue(
                            'pmProfile.logoText',
                            initialsFromPublicName(
                              values.pmProfile.publicName ||
                                `${values.firstName || ''} ${values.lastName || ''}`.trim(),
                            ),
                          )
                        }
                      >
                        Depuis nom public
                      </button>
                    </div>
                  </div>
                </div>

                <div className="owner-vitrine-section" style={{ marginTop: 16 }}>
                  <div className="form-section-h">Couleurs & confiance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8, alignItems: 'end' }}>
                  <div className="field">
                    <div className="field-label">Couleur début</div>
                    <input
                      className="input"
                      name="pmProfile.brandColor.from"
                      value={values.pmProfile.brandColor.from}
                      onChange={handleChange}
                      placeholder="#e8c87a"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Couleur fin</div>
                    <input
                      className="input"
                      name="pmProfile.brandColor.to"
                      value={values.pmProfile.brandColor.to}
                      onChange={handleChange}
                      placeholder="#c89b3c"
                    />
                  </div>
                  <div className="field">
                    <div className="field-label">Temps réponse</div>
                    <input
                      className="input"
                      name="pmProfile.responseTime"
                      value={values.pmProfile.responseTime}
                      onChange={handleChange}
                      placeholder="< 1h"
                    />
                  </div>
                </div>
                <div className="admin-row" style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 18 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div className="nm">Partenaire vérifié</div>
                    <div className="ds">Badge « vérifié » sur le profil public</div>
                  </div>
                  <div
                    className={`toggle${values.pmProfile.verified ? ' on' : ''}`}
                    onClick={() => setFieldValue('pmProfile.verified', !values.pmProfile.verified)}
                    onKeyDown={() => {}}
                    role="switch"
                    aria-checked={values.pmProfile.verified}
                  />
                </div>
                </div>

                <div className="owner-vitrine-section" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="form-section-h" style={{ margin: 0 }}>
                      Galerie photos vitrine
                    </div>
                    <label className="btn btn-ghost owner-photo-btn">
                      {uploadingImages ? 'Envoi…' : '+ Ajouter des photos'}
                      <input
                        hidden
                        type="file"
                        accept={PM_VITRINE_IMAGE_SPECS.accept}
                        multiple
                        disabled={
                          uploadingImages ||
                          normalizePmImageList(values.pmProfile.images).length >= PM_VITRINE_MAX_PHOTOS
                        }
                        onChange={(e) => {
                          handlePmImageUpload(e.target.files, values.pmProfile.images, setFieldValue);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <div className="owner-form-hint" style={{ marginBottom: 8 }}>
                    Max <b>{PM_VITRINE_MAX_PHOTOS}</b> photos (comme sur sojori-vente). La{' '}
                    <b>1re photo</b> = bannière / couverture (<code>coverUrl</code>). La galerie
                    s&apos;affiche seulement à partir de <b>2 photos</b>. Logo initiales = section
                    ci-dessus — pas la 1re photo.
                    <br />
                    <span style={{ opacity: 0.9 }}>{PM_VITRINE_IMAGE_HINT}</span>
                  </div>
                  <div className="owner-pm-photos">
                    {normalizePmImageList(values.pmProfile.images).length === 0 ? (
                      <span className="owner-pm-empty">Aucune photo</span>
                    ) : (
                      normalizePmImageList(values.pmProfile.images).map((url, idx) => (
                        <div key={`${url}-${idx}`} className={`owner-pm-thumb${idx === 0 ? ' main' : ''}`}>
                          <img src={url} alt="" referrerPolicy="no-referrer" />
                          {idx === 0 ? <span className="owner-pm-badge">Couverture</span> : null}
                          <div className="owner-pm-actions">
                            {idx !== 0 ? (
                              <button
                                type="button"
                                title="Définir comme couverture"
                                onClick={() => {
                                  const arr = [...normalizePmImageList(values.pmProfile.images)];
                                  const [m] = arr.splice(idx, 1);
                                  arr.unshift(m);
                                  setFieldValue('pmProfile.images', arr);
                                }}
                              >
                                ★
                              </button>
                            ) : null}
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() =>
                                setFieldValue(
                                  'pmProfile.images',
                                  normalizePmImageList(values.pmProfile.images).filter((_, i) => i !== idx),
                                )
                              }
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="owner-form-hint" style={{ marginTop: 6 }}>
                    {normalizePmImageList(values.pmProfile.images).length}/{PM_VITRINE_MAX_PHOTOS}{' '}
                    photos
                  </div>
                </div>
                  </>
                )}
              />

              <TabPanel
                active={activeTab}
                id="config-ia"
                render={() => (
                  <>
                <div className="owner-form-hint" style={{ marginBottom: 10 }}>
                  Modèle Claude pour les réponses automatiques aux voyageurs (du moins cher au plus
                  capable). Met à jour tous les séjours whitelist de ce propriétaire (sauf override par
                  séjour dans Mémoire bot).
                </div>
                <div className="field">
                  <div className="field-label">Modèle Claude</div>
                  <select
                    className="input"
                    name="whatsappConversationalTier"
                    value={Number(values.whatsappConversationalTier) || 2}
                    onChange={(e) =>
                      setFieldValue('whatsappConversationalTier', Number(e.target.value))
                    }
                  >
                    {WHATSAPP_AI_TIER_OPTIONS.map((opt) => (
                      <option key={opt.tier} value={opt.tier}>
                        {tierOptionDropdownLabel(opt)}
                      </option>
                    ))}
                  </select>
                </div>
                  </>
                )}
              />
            </div>

              <div className="drawer-foot">
                <div className="drawer-foot-start" />
                <button type="button" className="btn btn-ghost" disabled={footBusy} onClick={onClose}>
                  Annuler
                </button>
                {isDraftFlow ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-prim"
                      disabled={footBusy}
                      onClick={() => void handleSaveDraft(formikBag.values, formikBag)}
                    >
                      {saveLoading ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      className={`btn ${createReadiness.ready ? 'btn-create-ready' : 'btn-prim'}`}
                      disabled={!createReadiness.ready || footBusy}
                      title={
                        createReadiness.ready
                          ? 'Invitation dashboard + provision RU'
                          : `Manque : ${createReadiness.missing.join(', ')}`
                      }
                      onClick={() => void handleFinalizeCreate(formikBag.values, formikBag)}
                    >
                      {finalizeLoading ? 'Création…' : 'Créer le PM'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-prim"
                    disabled={footBusy}
                    onClick={() => void handleSaveEdit(formikBag.values, formikBag)}
                  >
                    {saveLoading ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                )}
              </div>
            </form>
            </>
          );
        }}
      </Formik>
      {!isCreate && owner ? (
        <OwnerPasswordDialog
          open={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
          ownerLabel={`${owner.firstName || ''} ${owner.lastName || ''}`.trim()}
          sojoriEmail={owner.email}
          ruEmail={resolveRuEmailDisplay(owner)}
          loading={passwordDialogLoading}
          onSubmit={handleOwnerPasswordSubmit}
        />
      ) : null}
      <OwnerPasswordLinkDialog
        open={!!passwordLinkDialog}
        onClose={() => setPasswordLinkDialog(null)}
        email={passwordLinkDialog?.email}
        linkUrl={passwordLinkDialog?.url}
        emailSent={passwordLinkDialog?.emailSent}
        emailError={passwordLinkDialog?.emailError}
        linkType={passwordLinkDialog?.linkType}
        expiresAt={passwordLinkDialog?.expiresAt}
      />
    </div>
  );

  if (inline) return drawerPanel;

  return (
    <div
      className="so-staff-root owner-drawer-host"
      role="presentation"
      onClick={onClose}
      onKeyDown={() => {}}
    >
      {drawerPanel}
    </div>
  );
};

export default UpdateOwnerSidebar;
