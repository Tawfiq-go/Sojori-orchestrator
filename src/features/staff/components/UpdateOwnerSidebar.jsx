import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateOwner, updateOwnerWhatsappAiTier, getCities, getCurrencies } from '../services/serverApi.task';
import { uploadImageToAPI, uploadMultipleImagesToAPI } from '../../../redux/slices/UploadSlice';
import {
  extractUrlsFromUploadResult,
  getPmLogoUrl,
  normalizePmImageList,
  normalizePmImageUrl,
} from '../utils/pmProfileMediaUtils';
import OwnerPmLogoImage from './OwnerPmLogoImage';
import * as fullchatbotApi from '../../../services/fullchatbotApi';
import { useTranslation } from 'react-i18next';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { WHATSAPP_AI_TIER_OPTIONS, tierOptionDropdownLabel } from '../../../constants/whatsappAiTier';
import SearchableSelect from './SearchableSelect';
import { useChannelsFillCompanyPickers } from '../hooks/useChannelsFillCompanyPickers';
import { sortCurrenciesByOrderedCodes } from '../utils/currencySort';
import '../../taskHub/staff-design/staffDesign.css';
import './ownerFormDrawer.css';

function ownerInitials(owner) {
  const n = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim();
  if (!n) return '?';
  const p = n.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

const buildValidationSchema = (t, owner) =>
  Yup.object().shape({
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

const OWNER_TABS = [
  { id: 'compte', label: 'Compte' },
  { id: 'rapports-pl', label: 'Rapports P&L' },
  { id: 'sojori-web', label: 'Sojori Web' },
  { id: 'config-ia', label: 'Config IA' },
];

const TabPanel = ({ active, id, children }) =>
  active === id ? <div className="form-section full owner-tab-panel">{children}</div> : null;

const UpdateOwnerSidebar = ({ open, onClose, owner, onOwnerUpdated, inline = true }) => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();
  const authRole = useSelector((state) => state.auth?.user?.role);
  const isPlatformAdmin = hasAdminAccess(authRole);
  const visibleTabs = isPlatformAdmin
    ? OWNER_TABS
    : OWNER_TABS.filter((tab) => tab.id !== 'config-ia');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeTab, setActiveTab] = useState('compte');
  const drawerRef = useRef(null);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const {
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
  const validationSchema = useMemo(() => buildValidationSchema(t, owner), [t, owner]);
  const showRuExtranetPasswordField = useMemo(() => {
    const hasRuId = !!(owner?.ruOwnerId && String(owner.ruOwnerId).trim());
    return !hasRuId;
  }, [owner?.ruOwnerId]);

  const currencyOptions = useMemo(
    () =>
      sortedCurrencies.map((c) => ({
        code: c.currencyCode,
        label: c.currencyCode,
        searchText: String(c.currencyCode || '').toLowerCase(),
      })),
    [sortedCurrencies],
  );

  useEffect(() => {
    if (open) setActiveTab('compte');
  }, [open, owner?._id]);

  useEffect(() => {
    if (!open || !inline || !owner) return;
    const id = window.requestAnimationFrame(() => {
      drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, inline, owner?._id]);

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
    setUploadingImages(true);
    try {
      const result = await dispatch(uploadMultipleImagesToAPI({ files, folder: 'other' })).unwrap();
      const urls = extractUrlsFromUploadResult(result);
      if (urls.length === 0) {
        toast.error('Échec upload (réponse inattendue)');
        return;
      }
      setFieldValue('pmProfile.images', [...normalizePmImageList(currentImages), ...urls]);
      toast.success(`${urls.length} photo(s) ajoutée(s)`);
    } catch (err) {
      toast.error(`Échec upload : ${err?.message || ''}`);
    } finally {
      setUploadingImages(false);
    }
  };

  /** Logo rapport P&L = 1ère image pmProfile */
  const handlePmLogoUpload = async (fileList, currentImages, setFieldValue) => {
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
      const rest = normalizePmImageList(currentImages).filter((u, i) => i > 0 && u !== url);
      setFieldValue('pmProfile.images', [url, ...rest]);
      toast.info('Logo ajouté — cliquez Enregistrer ⚡ pour sauvegarder le profil');
    } catch (err) {
      toast.error(`Échec upload logo : ${err?.message || ''}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const normalizePmSlug = (slug) =>
    (slug || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const selectedCity = cities.find((city) => city._id === values.cityId);
      const ruPwd = (values.ruExtranetPassword || '').trim();
      const response = await updateOwner(owner._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        whatsapp: values.whatsapp,
        channelManager: values.channelManager,
        cityId: values.cityId,
        rentalCityId: selectedCity?.rentalCityId?.toString(),
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
        ...(ruPwd.length >= 6 ? { ruExtranetPassword: ruPwd } : {}),
      });
      if (response.data?.account) {
        let updatedAccount = response.data.account;
        if (isPlatformAdmin && values.whatsappConversationalTier) {
          try {
            const tier = Number(values.whatsappConversationalTier);
            await updateOwnerWhatsappAiTier(owner._id, tier);
            try {
              await fullchatbotApi.syncOwnerModelToWhitelist(owner._id, tier);
            } catch (syncErr) {
              console.warn('[UpdateOwner] whitelist model sync', syncErr);
            }
            updatedAccount = {
              ...updatedAccount,
              whatsappConversationalTier: tier,
            };
          } catch (tierErr) {
            setErrors({
              submit:
                tierErr?.response?.data?.error ||
                tierErr?.message ||
                t('Failed to update owner'),
            });
            return;
          }
        }
        onOwnerUpdated(updatedAccount);
        const sync = response.data.ruOwnerSync;
        if (sync?.attempted && sync.ok === false) {
          setErrors({ submit: sync.message || t('Failed to update owner') });
          return;
        }
        onClose();
      }
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          t('Failed to update owner'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !owner) return null;

  const initialValues = {
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
    address: owner.address || '',
    postalCode: owner.postalCode || '',
    city: owner.city || '',
    country: owner.country || '',
    pmProfile: {
      publicName: owner?.pmProfile?.publicName || '',
      slug: owner?.pmProfile?.slug || '',
      tagline: owner?.pmProfile?.tagline || '',
      description: owner?.pmProfile?.description || '',
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

  const drawerPanel = (
    <div
      ref={drawerRef}
      className={`drawer owner-drawer-panel${inline ? ' owner-drawer-inline' : ''}`}
      role="dialog"
      onClick={(e) => {
        if (!inline) e.stopPropagation();
      }}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          isSubmitting,
          setFieldValue,
          submitForm,
        }) => (
          <>
            <div className="drawer-h">
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--pt)',
                  color: 'var(--pd)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {ownerInitials(owner)}
              </div>
              <h3>
                Modifier · {values.firstName || values.lastName || 'Property manager'}
              </h3>
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

            <div className="form-grid">
              {errors.submit ? (
                <div className="form-section full owner-form-alert">{String(errors.submit)}</div>
              ) : null}

              <TabPanel active={activeTab} id="compte">
                {(refPickersFallback || refPickersError) && (
                  <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                    {refPickersError ? `${refPickersError} — ` : ''}
                    Listes langue/devise réduites. Sync complète via Hub Channels si besoin.
                  </div>
                )}
                <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                  Compte <b>Owner</b> (property manager). Prénom, nom et téléphone sont recopiés vers
                  Rental United si channel = RU.
                </div>
                <div className="owner-tab-grid">
                <div className="form-section">
                  <div className="form-section-h">Identité</div>
                  <div className="field">
                    <div className="field-label">
                      Prénom<span className="req">*</span>
                    </div>
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
                    <div className="field-label">
                      Nom<span className="req">*</span>
                    </div>
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
                    <div className="field-label">
                      Téléphone<span className="req">*</span>
                    </div>
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
                    <div className="field-label">
                      WhatsApp
                      <span className="hint">Sojori uniquement</span>
                    </div>
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
                    <div className="field-label">
                      Ville<span className="req">*</span>
                    </div>
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
                    <div className="field-label">
                      Channel manager<span className="req">*</span>
                    </div>
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
                      <div className="field-label">
                        Mot de passe extranet RU
                        <span className="hint">Min. 6 caractères si pas encore enregistré</span>
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
                    <div className="field-label">
                      Langue<span className="req">*</span>
                    </div>
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
                    <div className="field-label">
                      Devise<span className="req">*</span>
                    </div>
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
                </div>
              </TabPanel>

              <TabPanel active={activeTab} id="rapports-pl">
                <div className="owner-form-hint owner-pl-source-hint">
                  <b>Source des en-têtes PDF/HTML</b> — Finances → Rapports P&L utilisent ces infos via « ↻ Profil ».
                  Le logo est la <b>1ère image</b> ci-dessous. Email = compte (lecture seule).
                </div>

                <div className="owner-pl-preview">
                  <OwnerPmLogoImage
                    images={values.pmProfile.images}
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
                  <div className="form-section-h">Logo rapport</div>
                  <div className="owner-pl-logo-row">
                    <OwnerPmLogoImage
                      images={values.pmProfile.images}
                      className="owner-pl-logo-thumb"
                      emptyLabel="Aucun logo"
                    />
                    <label className="btn btn-ghost owner-photo-btn">
                      {uploadingImages ? 'Envoi…' : '+ Ajouter / remplacer logo'}
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        disabled={uploadingImages}
                        onChange={(e) => {
                          handlePmLogoUpload(e.target.files, values.pmProfile.images, setFieldValue);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {getPmLogoUrl(values.pmProfile.images) ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          setFieldValue('pmProfile.images', normalizePmImageList(values.pmProfile.images).slice(1))
                        }
                      >
                        Retirer logo
                      </button>
                    ) : null}
                  </div>
                  <div className="owner-form-hint" style={{ marginTop: 8 }}>
                    PNG ou JPG recommandé · fond transparent si possible. Photos marketplace dans l&apos;onglet
                    Sojori Web (la 1ère photo sert aussi de logo si vous n&apos;en mettez pas ici).
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
                    <input className="input" name="email" value={values.email} readOnly disabled />
                    <span className="owner-form-hint" style={{ display: 'block', marginTop: 6, padding: '6px 8px' }}>
                      Modifiable côté compte utilisateur / admin comptes.
                    </span>
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
              </TabPanel>

              <TabPanel active={activeTab} id="sojori-web">
                <div className="owner-form-hint" style={{ marginBottom: 12 }}>
                  Profil public sur sojori.com (page partenaires, bloc hôte). Activez « Publié » pour
                  rendre visible sur le site.
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
                  <div className="field-label">Accroche</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: 12, marginTop: 12, alignItems: 'end' }}>
                  <div>
                    <div className="field-label">Logo marketplace</div>
                    <OwnerPmLogoImage
                      images={values.pmProfile.images}
                      className="owner-pm-logo owner-pm-logo-img"
                      emptyLabel={
                        (values.pmProfile.publicName || `${values.firstName} ${values.lastName}`)
                          .trim()
                          .split(' ')
                          .filter(Boolean)
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'SJ'
                      }
                    />
                  </div>
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
                <div className="field" style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="field-label" style={{ margin: 0 }}>
                      Photos du PM
                    </div>
                    <label className="btn btn-ghost owner-photo-btn">
                      {uploadingImages ? 'Envoi…' : '+ Ajouter des photos'}
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingImages}
                        onChange={(e) => {
                          handlePmImageUpload(e.target.files, values.pmProfile.images, setFieldValue);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <div className="owner-form-hint" style={{ marginBottom: 8 }}>
                    La 1re photo est principale (logo rapports P&L — voir onglet <b>Rapports P&L</b>).
                  </div>
                  <div className="owner-pm-photos">
                    {(values.pmProfile.images || []).length === 0 ? (
                      <span className="owner-pm-empty">Aucune photo</span>
                    ) : (
                      (values.pmProfile.images || []).map((url, idx) => (
                        <div key={`${normalizePmImageUrl(url)}-${idx}`} className={`owner-pm-thumb${idx === 0 ? ' main' : ''}`}>
                          <img src={normalizePmImageUrl(url)} alt="" referrerPolicy="no-referrer" />
                          {idx === 0 ? <span className="owner-pm-badge">Principale</span> : null}
                          <div className="owner-pm-actions">
                            {idx !== 0 ? (
                              <button
                                type="button"
                                title="Définir principale"
                                onClick={() => {
                                  const arr = [...values.pmProfile.images];
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
                                  values.pmProfile.images.filter((_, i) => i !== idx),
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
                </div>
              </TabPanel>

              <TabPanel active={activeTab} id="config-ia">
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
              </TabPanel>
            </div>

              <div className="drawer-foot">
                <div className="drawer-foot-start" />
                <button type="button" className="btn btn-ghost" disabled={isSubmitting} onClick={onClose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-prim"
                  disabled={isSubmitting}
                  onClick={() => void submitForm()}
                >
                  {isSubmitting ? 'Enregistrement…' : 'Enregistrer ⚡'}
                </button>
              </div>
            </>
          )}
      </Formik>
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
