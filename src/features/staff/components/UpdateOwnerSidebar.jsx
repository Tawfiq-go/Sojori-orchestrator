import React, { useEffect, useMemo, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { updateOwner, getCities, getCurrencies } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
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

const UpdateOwnerSidebar = ({ open, onClose, owner, onOwnerUpdated }) => {
  const { t } = useTranslation('common');
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
        ...(ruPwd.length >= 6 ? { ruExtranetPassword: ruPwd } : {}),
      });
      if (response.data?.account) {
        onOwnerUpdated(response.data.account);
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
  };

  return (
    <div
      className="so-staff-root owner-drawer-host"
      role="presentation"
      onClick={onClose}
      onKeyDown={() => {}}
    >
      <div className="drawer owner-drawer-panel" role="dialog" onClick={(e) => e.stopPropagation()}>
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

              <div className="form-grid">
                {errors.submit ? (
                  <div className="form-section full owner-form-alert">{String(errors.submit)}</div>
                ) : null}

                {(refPickersFallback || refPickersError) && (
                  <div className="form-section full owner-form-hint">
                    {refPickersError ? `${refPickersError} — ` : ''}
                    Listes langue/devise réduites. Sync complète via Hub Channels si besoin.
                  </div>
                )}

                <div className="form-section full owner-form-hint">
                  Compte <b>Owner</b> (property manager). Prénom, nom et téléphone sont recopiés vers
                  Rental United si channel = RU.
                </div>

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
    </div>
  );
};

export default UpdateOwnerSidebar;
