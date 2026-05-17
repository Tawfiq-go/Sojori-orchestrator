import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, TextField, Chip, CircularProgress, FormControlLabel, Switch, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, Users } from 'lucide-react';
import { updateOwner, getCities, getCurrencies } from '../services/serverApi.task';
import { useTranslation } from 'react-i18next';
import SidePanel from './SidePanel';
import RuFieldBadge from './RuFieldBadge';
import SearchableSelect from './SearchableSelect';
import { useChannelsFillCompanyPickers } from '../hooks/useChannelsFillCompanyPickers';
import { sortCurrenciesByOrderedCodes } from '../utils/currencySort';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575'
  }
};
const StyledButton = styled(Button)(() => ({
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
    transform: 'translateY(-1px)'
  }
}));
const ResetButton = styled(Button)(() => ({
  backgroundColor: 'white',
  color: SOJORI_COLORS.gray[600],
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  textTransform: 'none',
  border: `1px solid ${SOJORI_COLORS.gray[300]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[50],
    borderColor: SOJORI_COLORS.gray[400],
    transform: 'translateY(-1px)'
  }
}));
const buildValidationSchema = (t, owner) => Yup.object().shape({
  firstName: Yup.string().required(t('First name is required')),
  lastName: Yup.string().required(t('Last name is required')),
  phone: Yup.string().required(t('Phone is required')),
  whatsapp: Yup.string(),
  channelManager: Yup.string().required(t('Channel Manager is required')),
  cityId: Yup.string().required(t('City is required')),
  settings: Yup.object().shape({
    language: Yup.string().required(t('Language is required')),
    currency: Yup.string().required(t('Currency is required'))
  }),
  banned: Yup.boolean(),
  deleted: Yup.boolean(),
  ruExtranetPassword: Yup.string().test('ru-extranet-when-needed', function (value) {
    const {
      channelManager
    } = this.parent;
    const hasRuId = !!(owner?.ruOwnerId && String(owner.ruOwnerId).trim());
    const hasStoredRuPwd = !!owner?.hasRuExtranetPassword;
    if (channelManager !== 'RU' || hasRuId) return true;
    if (hasStoredRuPwd) return true;
    const v = (value || '').trim();
    if (v.length < 6) {
      return this.createError({
        message: t('ownerRu_extranetPassword_required_min6')
      });
    }
    return true;
  }),
  // elevatedAuth fields removed for RU: credentials flow via RabbitMQ → srv-channels → internal API (no password in queue)
  elevatedAuthEmail: Yup.string().notRequired(),
  elevatedAuthPassword: Yup.string().notRequired()
});
const UpdateOwnerSidebar = ({
  open,
  onClose,
  owner,
  onOwnerUpdated
}) => {
  const {
    t
  } = useTranslation('common');
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
    const fetchCitiesAndCurrencies = async () => {
      if (open) {
        setLoadingCities(true);
        setLoadingCurrencies(true);
        try {
          const data = await getCities({
            limit: 200,
            paged: false
          });
          setCities(data || []);
        } catch (error) {} finally {
          setLoadingCities(false);
        }
        try {
          const currencyData = await getCurrencies();
          setCurrencies(currencyData.data || []);
        } catch (error) {} finally {
          setLoadingCurrencies(false);
        }
      }
    };
    fetchCitiesAndCurrencies();
  }, [open]);
  const handleSubmit = async (values, {
    setSubmitting,
    setErrors
  }) => {
    try {
      // Find selected city to get rentalCityId
      const selectedCity = cities.find(city => city._id === values.cityId);
      const ruPwd = (values.ruExtranetPassword || '').trim();
      // No elevatedAuth for RU: srv-channels retrieves credentials via internal API
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
        ...(ruPwd.length >= 6 ? {
          ruExtranetPassword: ruPwd
        } : {})
      });
      if (response.data && response.data.account) {
        onOwnerUpdated(response.data.account);
        const sync = response.data.ruOwnerSync;
        if (sync && sync.attempted && sync.ok === false) {
          setErrors({
            submit: sync.message || t('Failed to update owner'),
          });
          return;
        }
        onClose();
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || error.response?.data?.error || error.message || t('Failed to update owner')
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  return <Formik initialValues={{
    firstName: owner?.firstName || '',
    lastName: owner?.lastName || '',
    phone: owner?.phone || '',
    whatsapp: owner?.whatsapp || '',
    channelManager: owner?.channelManager || '',
    cityId: owner?.cityId || '',
    banned: owner?.banned || false,
    deleted: owner?.deleted || false,
    settings: owner?.settings || {
      language: 'en',
      currency: 'USD'
    },
    ruExtranetPassword: '',
    elevatedAuthEmail: '',
    elevatedAuthPassword: ''
  }} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
            {({
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      isSubmitting,
      setFieldValue,
      setErrors,
      submitForm
    }) => <SidePanel open={open} onClose={onClose} title={t('Update Owner')} width={600} headerIcon={<Users size={24} color="white" strokeWidth={2.2} />} footer={<>
                            <ResetButton onClick={onClose} disabled={isSubmitting} sx={{
        flex: 1,
        fontSize: 14
      }}>
                                {t('Cancel')}
                            </ResetButton>
                            <StyledButton type="button" variant="contained" onClick={submitForm} disabled={isSubmitting} sx={{
        flex: 1,
        fontSize: 14
      }}>
                                {isSubmitting ? <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: 'center'
        }}>
                                        <CircularProgress size={16} color="inherit" />
                                        {t('Updating...')}
                                    </Box> : t('Update')}
                            </StyledButton>
                        </>}>
                    <Box sx={{
        p: 3
      }}>
                        <Form id="owner-form" className="space-y-4">
                                    {errors.submit && (
                                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors({})}>
                                        {errors.submit}
                                      </Alert>
                                    )}
                                    {(refPickersFallback || refPickersError) && <Alert severity="info" sx={{ mb: 2 }}>
                                            <Typography variant="body2">
                                                {refPickersError ? `${refPickersError} — ` : ''}
                                                {t('channelsRefPickersHint', {
                      defaultValue: 'Référentiel réduit : Hub Channels → Mapping → Sync pays RU / Sync langues RU pour les listes complètes.',
                    })}
                                            </Typography>
                                        </Alert>}
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            {t('ruFieldBadge.ownerFormLegend')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                                            <RuFieldBadge kind="ruMirror" ruXmlPath="Account → ContactInfo" />
                                            <RuFieldBadge kind="nonRu" />
                                        </Box>
                                    </Alert>
                                    <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px'
          }}>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('First Name')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="ruMirror" ruXmlPath="ContactInfo.FirstName" />
                                            </div>
                                            <Field as={TextField} fullWidth name="firstName" variant="outlined" size="small" InputProps={{
                startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
              }} />
                                            <ErrorMessage name="firstName" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('Last Name')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="ruMirror" ruXmlPath="ContactInfo.LastName" />
                                            </div>
                                            <Field as={TextField} fullWidth name="lastName" variant="outlined" size="small" InputProps={{
                startAdornment: <User className="w-4 h-4 mr-2 text-gray-500" />
              }} />
                                            <ErrorMessage name="lastName" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                    </div>

                                    <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px'
          }}>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('Phone')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="ruMirror" ruXmlPath="ContactInfo.Phone" />
                                            </div>
                                            <Field as={TextField} fullWidth name="phone" variant="outlined" size="small" />
                                            <ErrorMessage name="phone" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('WhatsApp')} :
                                            </label>
                                            <RuFieldBadge kind="nonRu" />
                                            </div>
                                            <Field as={TextField} fullWidth name="whatsapp" variant="outlined" size="small" />
                                            <ErrorMessage name="whatsapp" component={Typography} className="text-red-500 !text-xs" />
                                        </div>
                                    </div>

                                    <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px'
          }}>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('City')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="nonRu" ruXmlPath="Account.cityId (Sojori)" />
                                            </div>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{t('ruFieldBadge.ownerCityHint')}</Typography>
                                            <FormControl fullWidth size="small">
                                                <Select id="city-select" name="cityId" value={values.cityId} onChange={handleChange} onBlur={handleBlur} disabled={loadingCities}>
                                                    {cities.map(city => <MenuItem key={city._id} value={city._id}>
                                                            {city.name}
                                                        </MenuItem>)}
                                                </Select>
                                                <ErrorMessage name="cityId" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                        </div>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('Channel Manager')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="nonRu" ruXmlPath="Sojori routing" />
                                            </div>
                                            <FormControl fullWidth size="small">
                                                <Select id="channel-manager-select" name="channelManager" value={values.channelManager} onChange={handleChange} onBlur={handleBlur}>
                                                    <MenuItem value="Channex">
                                                        <Chip label={t('Channex')} size="small" className="!bg-blue-500 !text-white" />
                                                    </MenuItem>
                                                    <MenuItem value="RU">
                                                        <Chip label={t('RU')} size="small" className="!bg-[#FFA500] !text-white" />
                                                    </MenuItem>
                                                </Select>
                                                <ErrorMessage name="channelManager" component={Typography} className="text-red-500 !text-xs" />
                                            </FormControl>
                                            {values.channelManager === 'RU' && (
                                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                                                {t('ruFieldBadge.ownerChannelRuSaveHint')}
                                              </Typography>
                                            )}
                                            {/* elevatedAuth fields hidden for RU: credentials retrieved via internal API, not from form */}
                                            {values.channelManager === 'RU' && showRuExtranetPasswordField && (
                                              <Box sx={{ mt: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                                  {t('ownerRu_extranet_password_label')}
                                                </Typography>
                                                <Field
                                                  as={TextField}
                                                  name="ruExtranetPassword"
                                                  type="password"
                                                  size="small"
                                                  fullWidth
                                                  autoComplete="new-password"
                                                  placeholder={owner?.hasRuExtranetPassword ? t('ownerRu_extranet_password_optional_placeholder') : t('ownerRu_extranet_password_required_placeholder')}
                                                  error={touched.ruExtranetPassword && Boolean(errors.ruExtranetPassword)}
                                                  helperText={touched.ruExtranetPassword && errors.ruExtranetPassword ? errors.ruExtranetPassword : t('ownerRu_extranet_password_hint')}
                                                />
                                              </Box>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px'
          }}>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('Language')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="nonRu" ruXmlPath="settings.language ≠ ContactInfo.LanguageId" />
                                            </div>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{t('ruFieldBadge.ownerLanguageHint')}</Typography>
                                            <SearchableSelect label={t('Language')} options={interfaceLanguageCodes} optionValueKey="code" getOptionLabel={o => o.label} value={values.settings.language} onChange={v => setFieldValue('settings.language', v)} error={Boolean(touched.settings?.language && errors.settings?.language)} helperText={touched.settings?.language && errors.settings?.language ? t(errors.settings.language) : ''} disabled={loadingRefPickers} />
                                        </div>
                                        <div style={{
              width: '270px'
            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: 0
              }}>
                                                {t('Currency')} <span style={{ color: '#ef4444' }}>*</span> :
                                            </label>
                                            <RuFieldBadge kind="nonRu" />
                                            </div>
                                            <SearchableSelect label={t('Currency')} options={currencyOptions} optionValueKey="code" getOptionLabel={o => o.label} value={values.settings.currency} onChange={v => setFieldValue('settings.currency', v)} error={Boolean(touched.settings?.currency && errors.settings?.currency)} helperText={touched.settings?.currency && errors.settings?.currency ? t(errors.settings.currency) : ''} disabled={loadingCurrencies || loadingRefPickers} />
                                        </div>
                                    </div>

                                    <Box className="flex flex-col space-y-2 mt-4">
                                        <Box sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              p: 2,
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              mt: 1
            }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                                                {t('Account Status')}:
                                            </label>
                                            <RuFieldBadge kind="nonRu" ruXmlPath="banned / deleted" />
                                            </Box>
                                            <FormControlLabel control={<Switch checked={values.banned} onChange={handleChange} name="banned" color="error" sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#ef4444'
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#ef4444'
                }
              }} />} label={<Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                                                        <Typography variant="body2" sx={{
                  fontWeight: 500
                }}>
                                                            {t('Banned')}
                                                        </Typography>
                                                    </Box>} sx={{
                margin: 0,
                '& .MuiFormControlLabel-label': {
                  fontSize: '14px'
                }
              }} />
                                            <Typography variant="body2" sx={{
                color: '#6b7280',
                fontWeight: 500
              }}>
                                                |
                                            </Typography>
                                            <FormControlLabel control={<Switch checked={values.deleted} onChange={handleChange} name="deleted" color="error" sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#ef4444'
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#ef4444'
                }
              }} />} label={<Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                                                        <Typography variant="body2" sx={{
                  fontWeight: 500
                }}>
                                                            {t('Deleted')}
                                                        </Typography>
                                                    </Box>} sx={{
                margin: 0,
                '& .MuiFormControlLabel-label': {
                  fontSize: '14px'
                }
              }} />
                                        </Box>
                                    </Box>
                        </Form>
                    </Box>
                </SidePanel>}
        </Formik>;
};
export default UpdateOwnerSidebar;
