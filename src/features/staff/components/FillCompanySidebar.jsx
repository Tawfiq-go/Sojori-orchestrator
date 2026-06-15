import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, MenuItem, FormControl, InputLabel, Select, Checkbox, ListItemText, OutlinedInput, CircularProgress, Card, CardHeader, CardContent, Divider, Avatar, Grid, FormControlLabel, Switch, Chip, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { User, Building, Gavel } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SidePanel from './SidePanel';
import RuFieldBadge, { FieldLabelWithRuBadge } from './RuFieldBadge';
import SearchableSelect from './SearchableSelect';
import CityFreeSoloAutocomplete from './CityFreeSoloAutocomplete';
import { useChannelsFillCompanyPickers } from '../hooks/useChannelsFillCompanyPickers';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
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
const validationSchema = Yup.object({
  ContactInfo: Yup.object({
    FirstName: Yup.string().required('First Name is required'),
    LastName: Yup.string().required('Last Name is required'),
    Email: Yup.string().email('Invalid email format').required('Email is required'),
    Phone: Yup.string().required('Phone is required'),
    City: Yup.string().required('City is required'),
    CountryId: Yup.string().required('Country is required'),
    Address: Yup.string().required('Address is required'),
    ZipCode: Yup.string().required('Zip Code is required'),
    BirthDate: Yup.string().required('Birth Date is required'),
    LanguageId: Yup.string().required('Language is required'),
    Nationality: Yup.string().required('Nationality is required'),
    Region: Yup.string(),
    Area: Yup.string(),
  }),
  CompanyInfo: Yup.object({
    CompanyName: Yup.string().required('Company Name is required'),
    WebsiteAddress: Yup.string().url('Invalid URL format'),
    CompanyCity: Yup.string().required('Company City is required'),
    Address: Yup.string().required('Company Address is required'),
    CountryId: Yup.string().required('Company Country is required'),
    PostCode: Yup.string().required('Post Code is required'),
    PhoneNumber: Yup.string().required('Phone Number is required'),
    VATNumber: Yup.string().required('VAT Number is required'),
    ManagerIdentificationNumber: Yup.string().required('Manager ID Number is required'),
    MerchantName: Yup.string().required('Merchant Name is required'),
    TimeZone: Yup.string().required('Time Zone is required'),
    Region: Yup.string().required('Region is required'),
    Area: Yup.string(),
    NumberOfProperties: Yup.string().required('Number Of Properties is required'),
    NumberOfEmployees: Yup.string().required('Number Of Employees is required'),
    YearsInBusiness: Yup.string().required('Years In Business is required'),
    DescribeYourBusiness: Yup.string().required('Describe Your Business is required'),
    Locations: Yup.object({
      Location: Yup.array().of(Yup.object({
        '@_Id': Yup.string().required('Location is required')
      }))
    })
  }),
  LegalRepresentativeInfo: Yup.object({
    FirstName: Yup.string().required('First Name is required'),
    LastName: Yup.string().required('Last Name is required'),
    Email: Yup.string().email('Invalid email format').required('Email is required'),
    City: Yup.string().required('City is required'),
    CountryOfResidenceId: Yup.string().required('Country of Residence is required'),
    Address: Yup.string().required('Address is required'),
    PostCode: Yup.string().required('Post Code is required'),
    Birthday: Yup.string().required('Birthday is required'),
    NationalityId: Yup.string().required('Nationality is required'),
    Region: Yup.string().required('Region is required'),
    Area: Yup.string(),
  })
});
const FillCompanySidebar = ({
  open,
  onClose,
  owner,
  cities,
  onSubmit
}) => {
  const {
    t
  } = useTranslation('common');
  const {
    countries: ruCountries,
    languagesRu,
    nationalities: ruNationalities,
    loading: loadingRefPickers,
    error: refPickersError,
    usedFallback: refPickersFallback,
  } = useChannelsFillCompanyPickers(open);
  const [selectedCities, setSelectedCities] = useState([]);
  const [locations, setLocations] = useState([{
    '@_Id': ''
  }]);
  const [initialValues, setInitialValues] = useState({
    ContactInfo: {
      FirstName: '',
      LastName: '',
      Email: '',
      Phone: '',
      City: '',
      CountryId: '',
      Address: '',
      ZipCode: '',
      BirthDate: '',
      LanguageId: '',
      Nationality: '',
      Region: '',
      Area: '',
    },
    CompanyInfo: {
      CompanyName: '',
      WebsiteAddress: '',
      CompanyCity: '',
      Address: '',
      CountryId: '',
      PostCode: '',
      PhoneNumber: '',
      VATNumber: '',
      ManagerIdentificationNumber: '',
      MerchantName: '',
      TimeZone: '',
      Region: '',
      Area: '',
      ConfirmationEmail: '',
      NumberOfProperties: '',
      NumberOfEmployees: '',
      YearsInBusiness: '',
      DescribeYourBusiness: '',
      Locations: {
        Location: []
      }
    },
    LegalRepresentativeInfo: {
      FirstName: '',
      LastName: '',
      Email: '',
      City: '',
      CountryOfResidenceId: '',
      Address: '',
      PostCode: '',
      Birthday: '',
      NationalityId: '',
      Region: '',
      Area: '',
    }
  });
  useEffect(() => {
    if (owner && open) {
      if (owner.fillCompany) {
        const companyData = owner.fillCompany;
        const baseContact = {
          FirstName: '',
          LastName: '',
          Email: '',
          Phone: '',
          City: '',
          CountryId: '',
          Address: '',
          ZipCode: '',
          BirthDate: '',
          LanguageId: '',
          Nationality: '',
          Region: '',
          Area: '',
        };
        const baseCompany = {
          CompanyName: '',
          WebsiteAddress: '',
          CompanyCity: '',
          Address: '',
          CountryId: '',
          PostCode: '',
          PhoneNumber: '',
          VATNumber: '',
          ManagerIdentificationNumber: '',
          MerchantName: '',
          TimeZone: '',
          Region: '',
          Area: '',
          ConfirmationEmail: '',
          NumberOfProperties: '',
          NumberOfEmployees: '',
          YearsInBusiness: '',
          DescribeYourBusiness: '',
          Locations: { Location: [] },
        };
        const baseLegal = {
          FirstName: '',
          LastName: '',
          Email: '',
          City: '',
          CountryOfResidenceId: '',
          Address: '',
          PostCode: '',
          Birthday: '',
          NationalityId: '',
          Region: '',
          Area: '',
        };
        setInitialValues({
          ContactInfo: { ...baseContact, ...(companyData.ContactInfo || {}) },
          CompanyInfo: {
            ...baseCompany,
            ...(companyData.CompanyInfo || {}),
            Locations: Array.isArray(companyData.CompanyInfo?.Locations?.Location)
              ? { Location: companyData.CompanyInfo.Locations.Location }
              : { Location: [] },
          },
          LegalRepresentativeInfo: { ...baseLegal, ...(companyData.LegalRepresentativeInfo || {}) },
        });
        if (companyData.CompanyInfo?.Locations?.Location) {
          setSelectedCities(companyData.CompanyInfo.Locations.Location.map(loc => loc['@_Id']));
        } else {
          setSelectedCities([]);
        }
        let locs = [{
          '@_Id': ''
        }];
        if (companyData.CompanyInfo?.Locations?.Location?.length > 0) {
          locs = companyData.CompanyInfo.Locations.Location.map(loc => ({
            '@_Id': loc['@_Id']
          }));
        }
        setLocations(locs);
      } else {
        const ownerCity = cities.find(city => city._id === owner.cityId);
        setSelectedCities([]);
        setInitialValues({
          ContactInfo: {
            FirstName: owner.firstName || '',
            LastName: owner.lastName || '',
            Email: owner.email || '',
            Phone: owner.phone || '',
            City: ownerCity?.name || '',
            CountryId: '',
            Address: '',
            ZipCode: '',
            BirthDate: '',
            LanguageId: '',
            Nationality: '',
            Region: '',
            Area: '',
          },
          CompanyInfo: {
            CompanyName: '',
            WebsiteAddress: '',
            CompanyCity: ownerCity?.name || '',
            Address: '',
            CountryId: '',
            PostCode: '',
            PhoneNumber: owner.phone || '',
            VATNumber: '',
            ManagerIdentificationNumber: '',
            MerchantName: '',
            TimeZone: '',
            Region: '',
            Area: '',
            ConfirmationEmail: '',
            NumberOfProperties: '',
            NumberOfEmployees: '',
            YearsInBusiness: '',
            DescribeYourBusiness: '',
            Locations: {
              Location: []
            }
          },
          LegalRepresentativeInfo: {
            FirstName: '',
            LastName: '',
            Email: '',
            City: '',
            CountryOfResidenceId: '',
            Address: '',
            PostCode: '',
            Birthday: '',
            NationalityId: '',
            Region: '',
            Area: '',
          }
        });
      }
    }
  }, [owner, cities, open]);
  const handleCityChange = event => {
    const value = event.target.value;
    setSelectedCities(typeof value === 'string' ? value.split(',') : value);
  };
  const handleAddLocation = () => setLocations([...locations, {
    '@_Id': ''
  }]);
  const handleRemoveLocation = idx => setLocations(locations.length > 1 ? locations.filter((_, i) => i !== idx) : [{
    '@_Id': ''
  }]);
  const handleLocationChange = (idx, value) => {
    const newLocs = [...locations];
    newLocs[idx]['@_Id'] = value;
    setLocations(newLocs);
  };
  const handleFormSubmit = async (values, {
    setSubmitting
  }) => {
    setSubmitting(true);
    try {
      const dataToSend = {
        ...values,
        CompanyInfo: {
          ...values.CompanyInfo,
          Locations: {
            Location: locations.filter(loc => loc['@_Id']).map(loc => ({
              '@_Id': loc['@_Id']
            }))
          }
        }
      };
      await onSubmit(dataToSend);
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  return <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleFormSubmit} enableReinitialize={true}>
            {({
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      isSubmitting,
      setFieldValue
    }) => <SidePanel open={open} onClose={onClose} title={t('Company Information')} width={800} headerIcon={<Building size={24} color="white" strokeWidth={2.2} />} footer={<>
                            <ResetButton onClick={onClose} disabled={isSubmitting} sx={{
        flex: 1,
        fontSize: 14
      }}>
                                {t('Cancel')}
                            </ResetButton>
                            <StyledButton type="button" variant="contained" onClick={() => document.getElementById('company-form')?.requestSubmit()} disabled={isSubmitting} sx={{
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
                                        {t('Saving...')}
                                    </Box> : t('Save')}
                            </StyledButton>
                        </>}>
                    <Box sx={{
        p: 2
      }}>
                        <Form id="company-form" className="space-y-4">
                                    {(refPickersFallback || refPickersError) && <Alert severity="info" sx={{ mb: 2 }}>
                                            <Typography variant="body2">
                                                {refPickersError ? `${refPickersError} — ` : ''}
                                                {t('channelsRefPickersHint', {
                      defaultValue: 'Référentiel réduit : Hub Channels → Mapping → Sync pays RU / Sync langues RU pour la liste complète (priorités Maroc, France…).',
                    })}
                                            </Typography>
                                        </Alert>}
                                    <Alert severity="info" sx={{ mb: 2, alignItems: 'flex-start' }}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            {t('ruFieldBadge.formLegend')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                                            <RuFieldBadge kind="ru" ruXmlPath="ContactInfo.*" />
                                            <RuFieldBadge kind="nonRu" />
                                            <RuFieldBadge kind="new" ruXmlPath="ContactInfo.Area" />
                                            <RuFieldBadge kind="ruStoredNotPushed" ruXmlPath="CompanyInfo.ConfirmationEmail" />
                                            <RuFieldBadge kind="ruMirror" ruXmlPath="Account → ContactInfo" />
                                        </Box>
                                    </Alert>
                                    {/* Contact Information Card */}
                                    <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                        <CardHeader avatar={<Avatar sx={{
              bgcolor: 'primary.main'
            }}><User /></Avatar>} // Changed Person to User
            title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Contact Information')}</Typography></Box>} />
                                        <Divider />
                                        <CardContent>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.FirstName" required>{t('First Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.FirstName" value={values.ContactInfo.FirstName} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.FirstName && Boolean(errors.ContactInfo?.FirstName)} helperText={touched.ContactInfo?.FirstName && t(errors.ContactInfo?.FirstName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.LastName" required>{t('Last Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.LastName" value={values.ContactInfo.LastName} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.LastName && Boolean(errors.ContactInfo?.LastName)} helperText={touched.ContactInfo?.LastName && t(errors.ContactInfo?.LastName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Email" required>{t('Email')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.Email" value={values.ContactInfo.Email} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Email && Boolean(errors.ContactInfo?.Email)} helperText={touched.ContactInfo?.Email && t(errors.ContactInfo?.Email)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Phone" required>{t('Phone')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.Phone" value={values.ContactInfo.Phone} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Phone && Boolean(errors.ContactInfo?.Phone)} helperText={touched.ContactInfo?.Phone && t(errors.ContactInfo?.Phone)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.City" required>{t('City')}</FieldLabelWithRuBadge>
                                                    <CityFreeSoloAutocomplete label={t('City')} cities={cities} value={values.ContactInfo.City} onChange={v => setFieldValue('ContactInfo.City', v)} error={Boolean(touched.ContactInfo?.City && errors.ContactInfo?.City)} helperText={touched.ContactInfo?.City && errors.ContactInfo?.City ? t(errors.ContactInfo.City) : ''} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.CountryId" required>{t('Country')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Country')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.ContactInfo.CountryId} onChange={v => setFieldValue('ContactInfo.CountryId', v)} error={Boolean(touched.ContactInfo?.CountryId && errors.ContactInfo?.CountryId)} helperText={touched.ContactInfo?.CountryId && errors.ContactInfo?.CountryId ? t(errors.ContactInfo.CountryId) : ''} disabled={loadingRefPickers} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Address" required>{t('Address')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.Address" value={values.ContactInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Address && Boolean(errors.ContactInfo?.Address)} helperText={touched.ContactInfo?.Address && t(errors.ContactInfo?.Address)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.ZipCode" required>{t('Zip Code')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.ZipCode" value={values.ContactInfo.ZipCode} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.ZipCode && Boolean(errors.ContactInfo?.ZipCode)} helperText={touched.ContactInfo?.ZipCode && t(errors.ContactInfo?.ZipCode)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.BirthDate" required>{t('Birth Date')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.BirthDate" type="date" value={values.ContactInfo.BirthDate} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.BirthDate && Boolean(errors.ContactInfo?.BirthDate)} helperText={touched.ContactInfo?.BirthDate && t(errors.ContactInfo?.BirthDate)} fullWidth size="small" InputLabelProps={{
                    shrink: true
                  }} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.LanguageId" required>{t('Language')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Language')} options={languagesRu} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.ContactInfo.LanguageId} onChange={v => setFieldValue('ContactInfo.LanguageId', v)} error={Boolean(touched.ContactInfo?.LanguageId && errors.ContactInfo?.LanguageId)} helperText={touched.ContactInfo?.LanguageId && errors.ContactInfo?.LanguageId ? t(errors.ContactInfo.LanguageId) : ''} disabled={loadingRefPickers} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Nationality → NationalityId" required>{t('Nationality')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Nationality')} options={ruNationalities} optionValueKey="value" getOptionLabel={o => o.label} value={values.ContactInfo.Nationality} onChange={v => setFieldValue('ContactInfo.Nationality', v)} error={Boolean(touched.ContactInfo?.Nationality && errors.ContactInfo?.Nationality)} helperText={touched.ContactInfo?.Nationality && errors.ContactInfo?.Nationality ? t(errors.ContactInfo.Nationality) : ''} disabled={loadingRefPickers} />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.mappingCodesHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Region → RegionId">{t('Region')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.Region" value={values.ContactInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Region && Boolean(errors.ContactInfo?.Region)} helperText={touched.ContactInfo?.Region && t(errors.ContactInfo?.Region)} fullWidth size="small" placeholder="**" />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.mappingCodesHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="new" ruXmlPath="ContactInfo.Area → AreaId">{t('Area')}</FieldLabelWithRuBadge>
                                                    <TextField name="ContactInfo.Area" value={values.ContactInfo.Area} onChange={handleChange} onBlur={handleBlur} fullWidth size="small" placeholder="**" />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.areaHint')}</Typography>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>

                                    {/* Company Information Card */}
                                    <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                        <CardHeader avatar={<Avatar sx={{
              bgcolor: 'secondary.main'
            }}><Building /></Avatar>} title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Company Information')}</Typography></Box>} />
                                        <Divider />
                                        <CardContent>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CompanyName" required>{t('Company Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.CompanyName" value={values.CompanyInfo.CompanyName} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.CompanyName && Boolean(errors.CompanyInfo?.CompanyName)} helperText={touched.CompanyInfo?.CompanyName && t(errors.CompanyInfo?.CompanyName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.WebsiteAddress">{t('Website Address')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.WebsiteAddress" value={values.CompanyInfo.WebsiteAddress} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.WebsiteAddress && Boolean(errors.CompanyInfo?.WebsiteAddress)} helperText={touched.CompanyInfo?.WebsiteAddress && t(errors.CompanyInfo?.WebsiteAddress)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CompanyCity" required>{t('Company City')}</FieldLabelWithRuBadge>
                                                    <CityFreeSoloAutocomplete label={t('Company City')} cities={cities} value={values.CompanyInfo.CompanyCity} onChange={v => setFieldValue('CompanyInfo.CompanyCity', v)} error={Boolean(touched.CompanyInfo?.CompanyCity && errors.CompanyInfo?.CompanyCity)} helperText={touched.CompanyInfo?.CompanyCity && errors.CompanyInfo?.CompanyCity ? t(errors.CompanyInfo.CompanyCity) : ''} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CountryId" required>{t('Company Country')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Company Country')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.CompanyInfo.CountryId} onChange={v => setFieldValue('CompanyInfo.CountryId', v)} error={Boolean(touched.CompanyInfo?.CountryId && errors.CompanyInfo?.CountryId)} helperText={touched.CompanyInfo?.CountryId && errors.CompanyInfo?.CountryId ? t(errors.CompanyInfo.CountryId) : ''} disabled={loadingRefPickers} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.PostCode" required>{t('Post Code')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.PostCode" value={values.CompanyInfo.PostCode} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.PostCode && Boolean(errors.CompanyInfo?.PostCode)} helperText={touched.CompanyInfo?.PostCode && t(errors.CompanyInfo?.PostCode)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Region → RegionId" required>{t('Region')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.CompanyInfo?.Region && Boolean(errors.CompanyInfo?.Region)}>
                                                        <TextField name="CompanyInfo.Region" value={values.CompanyInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.Region && Boolean(errors.CompanyInfo?.Region)} helperText={touched.CompanyInfo?.Region && t(errors.CompanyInfo?.Region)} fullWidth size="small" placeholder="**" />
                                                    </FormControl>
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.mappingCodesHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="new" ruXmlPath="CompanyInfo.Area → AreaId">{t('Area')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.Area" value={values.CompanyInfo.Area} onChange={handleChange} onBlur={handleBlur} fullWidth size="small" placeholder="**" />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.areaHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Address" required>{t('Company Address')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.Address" value={values.CompanyInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.Address && Boolean(errors.CompanyInfo?.Address)} helperText={touched.CompanyInfo?.Address && t(errors.CompanyInfo?.Address)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.TimeZone" required>{t('Time Zone')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.TimeZone" value={values.CompanyInfo.TimeZone} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.TimeZone && Boolean(errors.CompanyInfo?.TimeZone)} helperText={touched.CompanyInfo?.TimeZone && t(errors.CompanyInfo?.TimeZone)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ruStoredNotPushed" ruXmlPath="CompanyInfo.ConfirmationEmail">{t('Confirmation Email')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.ConfirmationEmail" value={values.CompanyInfo.ConfirmationEmail} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.ConfirmationEmail && Boolean(errors.CompanyInfo?.ConfirmationEmail)} helperText={touched.CompanyInfo?.ConfirmationEmail && t(errors.CompanyInfo?.ConfirmationEmail)} fullWidth size="small" />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.confirmationEmailHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.PhoneNumber" required>{t('Company Phone Number')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.PhoneNumber" value={values.CompanyInfo.PhoneNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.PhoneNumber && Boolean(errors.CompanyInfo?.PhoneNumber)} helperText={touched.CompanyInfo?.PhoneNumber && t(errors.CompanyInfo?.PhoneNumber)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.VATNumber" required>{t('VAT Number')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.VATNumber" value={values.CompanyInfo.VATNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.VATNumber && Boolean(errors.CompanyInfo?.VATNumber)} helperText={touched.CompanyInfo?.VATNumber && t(errors.CompanyInfo?.VATNumber)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.ManagerIdentificationNumber" required>{t('Manager Identification Number')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.ManagerIdentificationNumber" value={values.CompanyInfo.ManagerIdentificationNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.ManagerIdentificationNumber && Boolean(errors.CompanyInfo?.ManagerIdentificationNumber)} helperText={touched.CompanyInfo?.ManagerIdentificationNumber && t(errors.CompanyInfo?.ManagerIdentificationNumber)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.MerchantName" required>{t('Merchant Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.MerchantName" value={values.CompanyInfo.MerchantName} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.MerchantName && Boolean(errors.CompanyInfo?.MerchantName)} helperText={touched.CompanyInfo?.MerchantName && t(errors.CompanyInfo?.MerchantName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.NumberOfProperties" required>{t('Number Of Properties')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.CompanyInfo?.NumberOfProperties && Boolean(errors.CompanyInfo?.NumberOfProperties)}>
                                                        <Select name="CompanyInfo.NumberOfProperties" value={values.CompanyInfo.NumberOfProperties} onChange={handleChange} onBlur={handleBlur}>
                                                            <MenuItem value="0">{t('None')}</MenuItem>
                                                            <MenuItem value="1">{t('1 - 4')}</MenuItem>
                                                            <MenuItem value="2">{t('5 - 9')}</MenuItem>
                                                            <MenuItem value="3">{t('10 - 19')}</MenuItem>
                                                            <MenuItem value="4">{t('20 - 29')}</MenuItem>
                                                            <MenuItem value="5">{t('30 - 39')}</MenuItem>
                                                            <MenuItem value="6">{t('40 - 49')}</MenuItem>
                                                            <MenuItem value="7">{t('50 - 99')}</MenuItem>
                                                            <MenuItem value="8">{t('100 - 199')}</MenuItem>
                                                            <MenuItem value="9">{t('200 - 499')}</MenuItem>
                                                            <MenuItem value="10">{t('500 - 1000')}</MenuItem>
                                                            <MenuItem value="11">{t('1000')}</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.NumberOfEmployees" required>{t('Number Of Employees')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.CompanyInfo?.NumberOfEmployees && Boolean(errors.CompanyInfo?.NumberOfEmployees)}>
                                                        <Select name="CompanyInfo.NumberOfEmployees" value={values.CompanyInfo.NumberOfEmployees} onChange={handleChange} onBlur={handleBlur}>
                                                            <MenuItem value="0">{t('None')}</MenuItem>
                                                            <MenuItem value="1">{t('1 - 5')}</MenuItem>
                                                            <MenuItem value="2">{t('6 - 10')}</MenuItem>
                                                            <MenuItem value="3">{t('11 - 20')}</MenuItem>
                                                            <MenuItem value="4">{t('21 - 50')}</MenuItem>
                                                            <MenuItem value="5">{t('51 - 100')}</MenuItem>
                                                            <MenuItem value="6">{t('100')}</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.YearsInBusiness" required>{t('Years In Business')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.CompanyInfo?.YearsInBusiness && Boolean(errors.CompanyInfo?.YearsInBusiness)}>
                                                        <Select name="CompanyInfo.YearsInBusiness" value={values.CompanyInfo.YearsInBusiness} onChange={handleChange} onBlur={handleBlur}>
                                                            <MenuItem value="0">{t('None')}</MenuItem>
                                                            <MenuItem value="1">{t('1 - 2')}</MenuItem>
                                                            <MenuItem value="2">{t('3 - 5')}</MenuItem>
                                                            <MenuItem value="3">{t('6 - 10')}</MenuItem>
                                                            <MenuItem value="4">{t('10')}</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.DescribeYourBusiness" required>{t('Describe Your Business')}</FieldLabelWithRuBadge>
                                                    <TextField name="CompanyInfo.DescribeYourBusiness" value={values.CompanyInfo.DescribeYourBusiness} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.DescribeYourBusiness && Boolean(errors.CompanyInfo?.DescribeYourBusiness)} helperText={touched.CompanyInfo?.DescribeYourBusiness && t(errors.CompanyInfo?.DescribeYourBusiness)} fullWidth size="small" multiline rows={2} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Locations">{t('Locations')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.CompanyInfo?.Locations && Boolean(errors.CompanyInfo?.Locations)}>
                                                        <Select name="CompanyInfo.Locations.Location" value={selectedCities} onChange={handleCityChange} onBlur={handleBlur} multiple renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                                                                    {selected.map(value => <Chip key={value} label={value} />)}
                                                                </Box>}>
                                                            {cities.map(city => <MenuItem key={city.rentalCityId} value={city.rentalCityId}>{city.name}</MenuItem>)}
                                                        </Select>
                                                        {touched.CompanyInfo?.Locations && errors.CompanyInfo?.Locations && <Typography variant="caption" color="error" className="!mt-1 !ml-3">
                                                                {t(errors.CompanyInfo.Locations)}
                                                            </Typography>}
                                                    </FormControl>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>

                                    {/* Legal Representative Information Card */}
                                    <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                        <CardHeader avatar={<Avatar sx={{
              bgcolor: 'info.main'
            }}><Gavel /></Avatar>} title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Legal Representative Information')}</Typography></Box>} />
                                        <Divider />
                                        <CardContent>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.FirstName" required>{t('First Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.FirstName" value={values.LegalRepresentativeInfo.FirstName} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.FirstName && Boolean(errors.LegalRepresentativeInfo?.FirstName)} helperText={touched.LegalRepresentativeInfo?.FirstName && t(errors.LegalRepresentativeInfo?.FirstName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.LastName" required>{t('Last Name')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.LastName" value={values.LegalRepresentativeInfo.LastName} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.LastName && Boolean(errors.LegalRepresentativeInfo?.LastName)} helperText={touched.LegalRepresentativeInfo?.LastName && t(errors.LegalRepresentativeInfo?.LastName)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Email" required>{t('Email')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.Email" value={values.LegalRepresentativeInfo.Email} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Email && Boolean(errors.LegalRepresentativeInfo?.Email)} helperText={touched.LegalRepresentativeInfo?.Email && t(errors.LegalRepresentativeInfo?.Email)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.City" required>{t('City')}</FieldLabelWithRuBadge>
                                                    <CityFreeSoloAutocomplete label={t('City')} cities={cities} value={values.LegalRepresentativeInfo.City} onChange={v => setFieldValue('LegalRepresentativeInfo.City', v)} error={Boolean(touched.LegalRepresentativeInfo?.City && errors.LegalRepresentativeInfo?.City)} helperText={touched.LegalRepresentativeInfo?.City && errors.LegalRepresentativeInfo?.City ? t(errors.LegalRepresentativeInfo.City) : ''} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.CountryOfResidenceId" required>{t('Country of Residence')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Country of Residence')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.LegalRepresentativeInfo.CountryOfResidenceId} onChange={v => setFieldValue('LegalRepresentativeInfo.CountryOfResidenceId', v)} error={Boolean(touched.LegalRepresentativeInfo?.CountryOfResidenceId && errors.LegalRepresentativeInfo?.CountryOfResidenceId)} helperText={touched.LegalRepresentativeInfo?.CountryOfResidenceId && errors.LegalRepresentativeInfo?.CountryOfResidenceId ? t(errors.LegalRepresentativeInfo.CountryOfResidenceId) : ''} disabled={loadingRefPickers} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Address" required>{t('Address')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.Address" value={values.LegalRepresentativeInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Address && Boolean(errors.LegalRepresentativeInfo?.Address)} helperText={touched.LegalRepresentativeInfo?.Address && t(errors.LegalRepresentativeInfo?.Address)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.PostCode" required>{t('Post Code')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.PostCode" value={values.LegalRepresentativeInfo.PostCode} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.PostCode && Boolean(errors.LegalRepresentativeInfo?.PostCode)} helperText={touched.LegalRepresentativeInfo?.PostCode && t(errors.LegalRepresentativeInfo?.PostCode)} fullWidth size="small" />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Birthday" required>{t('Birthday')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.Birthday" type="date" value={values.LegalRepresentativeInfo.Birthday} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Birthday && Boolean(errors.LegalRepresentativeInfo?.Birthday)} helperText={touched.LegalRepresentativeInfo?.Birthday && t(errors.LegalRepresentativeInfo?.Birthday)} fullWidth size="small" InputLabelProps={{
                    shrink: true
                  }} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.NationalityId" required>{t('Nationality')}</FieldLabelWithRuBadge>
                                                    <SearchableSelect label={t('Nationality')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.LegalRepresentativeInfo.NationalityId} onChange={v => setFieldValue('LegalRepresentativeInfo.NationalityId', v)} error={Boolean(touched.LegalRepresentativeInfo?.NationalityId && errors.LegalRepresentativeInfo?.NationalityId)} helperText={touched.LegalRepresentativeInfo?.NationalityId && errors.LegalRepresentativeInfo?.NationalityId ? t(errors.LegalRepresentativeInfo.NationalityId) : ''} disabled={loadingRefPickers} />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.legalNationalityHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Region → RegionId" required>{t('Region')}</FieldLabelWithRuBadge>
                                                    <FormControl fullWidth size="small" error={touched.LegalRepresentativeInfo?.Region && Boolean(errors.LegalRepresentativeInfo?.Region)}>
                                                        <TextField name="LegalRepresentativeInfo.Region" value={values.LegalRepresentativeInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Region && Boolean(errors.LegalRepresentativeInfo?.Region)} helperText={touched.LegalRepresentativeInfo?.Region && t(errors.LegalRepresentativeInfo?.Region)} fullWidth size="small" placeholder="**" />
                                                    </FormControl>
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.mappingCodesHint')}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <FieldLabelWithRuBadge kind="new" ruXmlPath="LegalRepresentativeInfo.Area → AreaId">{t('Area')}</FieldLabelWithRuBadge>
                                                    <TextField name="LegalRepresentativeInfo.Area" value={values.LegalRepresentativeInfo.Area} onChange={handleChange} onBlur={handleBlur} fullWidth size="small" placeholder="**" />
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{t('ruFieldBadge.areaHint')}</Typography>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                        </Form>
                    </Box>
                </SidePanel>}
        </Formik>;
};
export default FillCompanySidebar;
